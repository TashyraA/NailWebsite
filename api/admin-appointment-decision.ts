import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';
import { escapeHtml } from './_email.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 10_000;
const MINIMUM_NOTICE_HOURS = 24;
const SLOT_DURATION_MINUTES = 120;
const BUFFER_MINUTES = 15;
const DEPOSIT_PAYMENT_HOURS = 24;
const DEPOSIT_CUTOFF_BEFORE_APPOINTMENT_HOURS = 1;

type DecisionRow = {
  id: string;
  status: string;
  deposit_amount: string | number | null;
  appointment_date: string;
  appointment_time: string;
  starts_at: string | null;
  ends_at: string | null;
  deposit_expires_at: string | null;
};
type DeclinedRow = DecisionRow & { customer_name: string; customer_email: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseDepositCents(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents < 50 || cents > 99_999_999 || Math.abs(amount * 100 - cents) > 0.000001) return null;
  return cents;
}
function respondWithDecision(res: any, appointment: DecisionRow, message: string, customerEmailAccepted?: boolean) {
  return res.status(200).json({
    success: true, message,
    ...(customerEmailAccepted === undefined ? {} : { customerEmailAccepted, emailAccepted: customerEmailAccepted }),
    appointment: {
      id: appointment.id, status: appointment.status,
      depositAmount: appointment.deposit_amount === null ? null : Number(appointment.deposit_amount),
      appointmentDate: appointment.appointment_date, appointmentTime: appointment.appointment_time,
      startsAt: appointment.starts_at, endsAt: appointment.ends_at, depositExpiresAt: appointment.deposit_expires_at,
    },
  });
}

// Called only after the conditional decline update succeeds. No payment or refund.
async function notifyDeclined(appointment: DeclinedRow): Promise<boolean> {
  try {
    const key = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const to = appointment.customer_email?.trim();
    if (!key || !from || !to || to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      console.error('Decline notification configuration or recipient invalid', appointment.id);
      return false;
    }
    const date = new Date(`${appointment.appointment_date}T12:00:00Z`);
    const dateLabel = Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }) : appointment.appointment_date;
    const match = /^(\d{2}):(\d{2})/.exec(appointment.appointment_time);
    const hour = match ? Number(match[1]) : 0;
    const timeLabel = match ? `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'} ET` : appointment.appointment_time;
    const name = appointment.customer_name || 'there';
    const website = 'https://www.inlovenailz.com';
    const html = `<div style="font-family:Arial,sans-serif;color:#29252B;line-height:1.6;max-width:600px;margin:auto">
      <h1 style="color:#963F60">Appointment Request Update</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thank you for choosing InLoveNailz by Briana! Unfortunately, we are unable to accommodate your requested appointment at this time.</p>
      <div style="background:#FFF7F8;border:1px solid #EAC5D0;border-radius:12px;padding:16px">
      <strong>Requested appointment</strong><p>Date: ${escapeHtml(dateLabel)}<br>Time: ${escapeHtml(timeLabel)}</p></div>
      <p>We apologize for any inconvenience and welcome you to visit our website to request another available appointment.</p>
      <p><a href="${website}" style="display:inline-block;background:#963F60;color:white;padding:14px 24px;border-radius:30px;text-decoration:none">Request Another Appointment</a></p>
      <p>With love,<br><strong>InLoveNailz by Briana</strong></p></div>`;
    const text = `Hi ${name},\n\nThank you for choosing InLoveNailz by Briana! Unfortunately, we are unable to accommodate your requested appointment on ${dateLabel} at ${timeLabel}. You are welcome to request another appointment at ${website}.\n\nWith love,\nInLoveNailz by Briana`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `inl-decline-${appointment.id}` },
      body: JSON.stringify({ from, to: [to], subject: 'InLoveNailz | Appointment Request Update', html, text }),
    });
    const result = await response.json() as { id?: string };
    if (!response.ok || typeof result.id !== 'string' || !result.id.trim()) {
      console.error('Decline notification acceptance not verified', appointment.id, response.status);
      return false;
    }
    return true;
  } catch {
    console.error('Decline notification acceptance unknown', appointment.id);
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res, true)) return;
  const rawBody: unknown = req.body;
  if (!isRecord(rawBody)) return res.status(400).json({ success: false, error: 'Invalid request body.' });
  if (Buffer.byteLength(JSON.stringify(rawBody), 'utf8') > MAX_BODY_BYTES) return res.status(413).json({ success: false, error: 'Request body is too large.' });
  const { appointmentId, action } = rawBody;
  if (typeof appointmentId !== 'string' || !UUID_PATTERN.test(appointmentId)) return res.status(400).json({ success: false, error: 'Invalid appointment ID.' });
  if (action !== 'approve' && action !== 'decline') return res.status(400).json({ success: false, error: 'Invalid appointment decision.' });
  let depositCents: number | null = null;
  if (action === 'approve') {
    depositCents = parseDepositCents(rawBody.depositAmount);
    if (depositCents === null) return res.status(400).json({ success: false, error: 'Enter a valid deposit of at least $0.50 and no more than $999,999.99 with no more than two decimal places.' });
  }
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
    const sql = neon(databaseUrl);
    if (action === 'decline') {
      const result = await sql`
        UPDATE appointment_requests
        SET status = 'declined', reviewed_at = NOW(), updated_at = NOW(),
            review_token_hash = NULL, review_token_expires_at = NULL
        WHERE id = ${appointmentId}::uuid AND status = 'pending'
        RETURNING id, status, deposit_amount, appointment_date::text AS appointment_date,
          appointment_time, starts_at, ends_at, deposit_expires_at, customer_name, customer_email
      `;
      if (result.length === 0) return res.status(409).json({ success: false, error: 'This request is no longer pending or could not be found. Refresh the appointment list.' });
      const appointment = result[0] as DeclinedRow;
      const accepted = await notifyDeclined(appointment);
      return respondWithDecision(res, appointment, accepted
        ? 'Appointment request declined. Resend accepted the customer notification; delivery is not yet confirmed.'
        : 'Appointment request declined. Customer email acceptance could not be verified. Check Resend before contacting the customer manually. Do not repeat the decline.', accepted);
    }
    const depositAmount = depositCents! / 100;
    const result = await sql`
      WITH candidate AS (
        SELECT id, total_price, duration_minutes, appointment_date, appointment_time,
          ((appointment_date::text || ' ' || appointment_time)::timestamp AT TIME ZONE 'America/New_York') AS requested_start,
          (appointment_date::text || ' ' || appointment_time)::timestamp AS local_start
        FROM appointment_requests
        WHERE id = ${appointmentId}::uuid AND status = 'pending'
      ), eligible AS (
        SELECT candidate.id, candidate.requested_start,
          candidate.requested_start + (candidate.duration_minutes * INTERVAL '1 minute') AS requested_end
        FROM candidate
        WHERE candidate.duration_minutes IS NOT NULL
          AND candidate.duration_minutes > 0
          AND candidate.duration_minutes <= ${SLOT_DURATION_MINUTES}
          AND candidate.total_price > 0
          AND ${depositAmount}::numeric <= candidate.total_price
          AND (
            EXISTS (SELECT 1 FROM salon_weekly_schedule weekly
              WHERE weekly.is_active = TRUE
                AND weekly.day_of_week = EXTRACT(DOW FROM candidate.appointment_date)::integer
                AND weekly.appointment_time = candidate.appointment_time::time)
            OR EXISTS (SELECT 1 FROM salon_schedule_overrides added
              WHERE added.override_date = candidate.appointment_date
                AND added.appointment_time = candidate.appointment_time::time AND added.action = 'add')
          )
          AND NOT EXISTS (SELECT 1 FROM salon_schedule_overrides removed
            WHERE removed.override_date = candidate.appointment_date
              AND removed.appointment_time = candidate.appointment_time::time AND removed.action = 'remove')
          AND candidate.requested_start >= NOW() + (${MINIMUM_NOTICE_HOURS} * INTERVAL '1 hour')
          AND (candidate.requested_start AT TIME ZONE 'America/New_York') = candidate.local_start
          AND NOT EXISTS (SELECT 1 FROM appointment_requests existing
            WHERE existing.id <> candidate.id AND existing.status IN ('awaiting_deposit', 'confirmed')
              AND existing.starts_at IS NOT NULL AND existing.ends_at IS NOT NULL
              AND existing.starts_at < candidate.requested_start + ((candidate.duration_minutes + ${BUFFER_MINUTES}) * INTERVAL '1 minute')
              AND existing.ends_at + (${BUFFER_MINUTES} * INTERVAL '1 minute') > candidate.requested_start)
          AND NOT EXISTS (SELECT 1 FROM salon_schedule_blocks block
            WHERE block.block_date = candidate.appointment_date AND (
              (block.start_time IS NULL AND block.end_time IS NULL)
              OR (block.start_time IS NOT NULL AND block.end_time IS NOT NULL
                AND candidate.requested_start < ((block.block_date + block.end_time) AT TIME ZONE 'America/New_York')
                AND candidate.requested_start + ((candidate.duration_minutes + ${BUFFER_MINUTES}) * INTERVAL '1 minute') > ((block.block_date + block.start_time) AT TIME ZONE 'America/New_York'))
            ))
      )
      UPDATE appointment_requests AS appointment
      SET status = 'awaiting_deposit', deposit_amount = ${depositAmount}, reviewed_at = NOW(), updated_at = NOW(),
        starts_at = eligible.requested_start, ends_at = eligible.requested_end,
        deposit_expires_at = LEAST(NOW() + (${DEPOSIT_PAYMENT_HOURS} * INTERVAL '1 hour'), eligible.requested_start - (${DEPOSIT_CUTOFF_BEFORE_APPOINTMENT_HOURS} * INTERVAL '1 hour')),
        review_token_hash = NULL, review_token_expires_at = NULL
      FROM eligible
      WHERE appointment.id = eligible.id AND appointment.status = 'pending'
      RETURNING appointment.id, appointment.status, appointment.deposit_amount,
        appointment.appointment_date::text AS appointment_date, appointment.appointment_time,
        appointment.starts_at, appointment.ends_at, appointment.deposit_expires_at
    `;
    if (result.length === 0) return res.status(409).json({ success: false, error: 'Unable to approve this request. It may have changed, conflict with another appointment, exceed the maximum duration, fall outside the current schedule, overlap a blocked period, or have an invalid deposit. Refresh and review the details.' });
    return respondWithDecision(res, result[0] as DecisionRow, 'Appointment approved and awaiting deposit. No payment link has been sent yet.');
  } catch (error: unknown) {
    const databaseError = error as { code?: string };
    if (databaseError?.code === '23P01') return res.status(409).json({ success: false, error: 'This appointment conflicts with an existing reservation.' });
    console.error('Admin appointment decision error:', error);
    return res.status(500).json({ success: false, error: 'Unable to process the appointment decision.' });
  }
}
