
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';
import { escapeHtml } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   ADMIN SEND DEPOSIT LINK

   - Admin-only endpoint
   - Never creates a Stripe Checkout Session
   - Verifies appointment details in Neon
   - Verifies the stored session with Stripe
   - Sends the verified link through Resend
   - Uses a stable Resend idempotency key
   - Never marks an appointment paid
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Appointment = {
  id: string;
  customer_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  deposit_expires_at: string | Date | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_checkout_claim_id: string | null;
};

type StripeSession = {
  id?: string;
  url?: string | null;
  mode?: string;
  status?: string;
  payment_status?: string;
  payment_intent?: string | null;
  amount_total?: number;
  currency?: string;
  expires_at?: number;
  metadata?: Record<string, string>;
};

type ResendResponse = {
  id?: string;
  message?: string;
};

function toCents(value: string | number | null): number {
  if (value === null) return NaN;

  const amount = Number(value);
  const result = Math.round(amount * 100);

  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(result) ||
    Math.abs(result / 100 - amount) > 0.000001
  ) {
    return NaN;
  }

  return result;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  if (!requireAdmin(req, res, true)) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!databaseUrl || !stripeKey || !resendKey || !emailFrom) {
    return res.status(500).json({
      success: false,
      error: 'Payment email configuration is incomplete.',
    });
  }

  const appointmentId = req.body?.appointmentId;

  if (
    typeof appointmentId !== 'string' ||
    !UUID_PATTERN.test(appointmentId)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Valid appointment ID required.',
    });
  }

  try {
    const sql = neon(databaseUrl);

    const rows = await sql`
      SELECT
        id,
        customer_name,
        customer_email,
        appointment_date::text AS appointment_date,
        appointment_time,
        status,
        total_price,
        deposit_amount,
        deposit_paid_at,
        deposit_expires_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        deposit_checkout_claim_id
      FROM public.appointment_requests
      WHERE id = ${appointmentId}::uuid
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found.',
      });
    }

    const appointment = rows[0] as Appointment;

    if (
      appointment.status !== 'awaiting_deposit' ||
      appointment.deposit_paid_at !== null ||
      appointment.stripe_payment_intent_id !== null
    ) {
      return res.status(409).json({
        success: false,
        error: 'Appointment is not awaiting deposit payment.',
      });
    }

    if (appointment.deposit_checkout_claim_id !== null) {
      return res.status(409).json({
        success: false,
        error: 'Checkout creation requires reconciliation before emailing.',
      });
    }

    if (
      !appointment.stripe_checkout_session_id ||
      !appointment.stripe_checkout_session_id.startsWith('cs_')
    ) {
      return res.status(409).json({
        success: false,
        error: 'Create the deposit checkout before sending its link.',
      });
    }

    const depositCents = toCents(appointment.deposit_amount);
    const totalCents = toCents(appointment.total_price);

    if (
      !Number.isSafeInteger(depositCents) ||
      !Number.isSafeInteger(totalCents) ||
      depositCents < 50 ||
      depositCents > totalCents
    ) {
      return res.status(409).json({
        success: false,
        error: 'Approved deposit amount is invalid.',
      });
    }

    if (!validEmail(appointment.customer_email)) {
      return res.status(409).json({
        success: false,
        error: 'Customer email address is invalid.',
      });
    }

    const deadlineMs =
      appointment.deposit_expires_at instanceof Date
        ? appointment.deposit_expires_at.getTime()
        : Date.parse(String(appointment.deposit_expires_at ?? ''));

    if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now()) {
      return res.status(409).json({
        success: false,
        error: 'The deposit payment deadline has expired.',
      });
    }

    const reviewRows = await sql`
      SELECT id
      FROM public.salon_stripe_payment_events
      WHERE appointment_id = ${appointmentId}::uuid
        AND processing_status = 'needs_review'
      LIMIT 1
    `;

    if (reviewRows.length) {
      return res.status(409).json({
        success: false,
        error: 'A payment exception requires review before emailing.',
      });
    }

    const sessionId = appointment.stripe_checkout_session_id;

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
        sessionId
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!stripeResponse.ok) {
      throw new Error(
        `Stripe session verification failed (${stripeResponse.status}).`
      );
    }

    const session =
      (await stripeResponse.json()) as StripeSession;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const deadlineSeconds = Math.floor(deadlineMs / 1000);

    if (
      session.id !== sessionId ||
      session.mode !== 'payment' ||
      session.status !== 'open' ||
      session.payment_status !== 'unpaid' ||
      session.payment_intent ||
      session.currency !== 'usd' ||
      session.amount_total !== depositCents ||
      session.metadata?.payment_type !==
        'neon_appointment_deposit' ||
      session.metadata?.appointment_id !== appointmentId ||
      typeof session.expires_at !== 'number' ||
      !Number.isSafeInteger(session.expires_at) ||
      session.expires_at <= nowSeconds ||
      session.expires_at > deadlineSeconds ||
      typeof session.url !== 'string' ||
      !session.url.startsWith('https://checkout.stripe.com/')
    ) {
      return res.status(409).json({
        success: false,
        error:
          'The Stripe checkout is unavailable or does not match this approved appointment.',
      });
    }

    const customerName = escapeHtml(appointment.customer_name);
    const appointmentDate = escapeHtml(appointment.appointment_date);
    const appointmentTime = escapeHtml(appointment.appointment_time);
    const checkoutUrl = escapeHtml(session.url);

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        color: #333333;
        line-height: 1.7;
        max-width: 600px;
        margin: 0 auto;
      ">
        <h2 style="color: #963F60;">
          Your Appointment Has Been Approved!
        </h2>

        <p>Hi ${customerName},</p>

        <p>
          Great news! Your appointment request with
          <strong>InLoveNailz by Briana</strong>
          has been approved.
        </p>

        <p>
          <strong>Date:</strong> ${appointmentDate}<br />
          <strong>Time:</strong> ${appointmentTime}<br />
          <strong>Service Total:</strong> ${money(totalCents)}<br />
          <strong>Deposit Required:</strong> ${money(depositCents)}
        </p>

        <p>
          To secure your appointment, please pay your
          approved deposit using the secure Stripe
          checkout link below.
        </p>

        <p style="margin: 30px 0; text-align: center;">
          <a
            href="${checkoutUrl}"
            style="
              display: inline-block;
              background: #963F60;
              color: #ffffff;
              text-decoration: none;
              padding: 14px 26px;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            Pay ${money(depositCents)} Deposit
          </a>
        </p>

        <p>
          <strong>Important:</strong>
          Your appointment is not confirmed until
          your deposit payment has been verified.
          This payment link expires at the approved
          deposit deadline.
        </p>

        <p>
          If the button does not work, copy and paste
          this secure link into your browser:
        </p>

        <p style="overflow-wrap: anywhere;">
          <a href="${checkoutUrl}">${checkoutUrl}</a>
        </p>

        <p>
          With love,<br />
          <strong>InLoveNailz by Briana</strong>
        </p>
      </div>
    `;

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key':
            `inl-deposit-link-${sessionId}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [appointment.customer_email.trim()],
          subject: 'InLoveNailz | Pay Your Appointment Deposit',
          html,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    let emailResult: ResendResponse = {};

    try {
      emailResult =
        (await resendResponse.json()) as ResendResponse;
    } catch {
      throw new Error(
        'Unable to verify the payment email response. Check Resend before retrying.'
      );
    }

    if (!resendResponse.ok || !emailResult.id) {
      throw new Error(
        emailResult.message ||
          `Resend did not accept the email (${resendResponse.status}).`
      );
    }

    return res.status(200).json({
      success: true,
      appointmentId,
      emailAccepted: true,
      message:
        'Resend accepted the deposit payment email. Delivery is not yet confirmed.',
    });
  } catch (error: unknown) {
    console.error(
      'Admin send deposit link error:',
      error instanceof Error ? error.message : error
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to verify or send the deposit email. Check Stripe and Resend before retrying.',
    });
  }
}
