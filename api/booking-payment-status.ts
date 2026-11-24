
import { neon } from '@neondatabase/serverless';

/* =========================================
   INLOVENAILZ BY BRIANA
   BOOKING PAYMENT STATUS

   - Read-only customer-facing endpoint
   - Verifies Checkout Session with Stripe
   - Confirms session belongs to Neon booking
   - Uses Neon as the source of truth
   - Returns limited, non-sensitive data
   - Never marks an appointment paid
   - Never sends payment emails
========================================= */

const SESSION_ID_PATTERN =
  /^cs_(test_|live_)[A-Za-z0-9]+$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STRIPE_TIMEOUT_MS = 8000;

type StripeSession = {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  metadata?: Record<string, string>;
};

type AppointmentRow = {
  id: string;
  status: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  stripe_checkout_session_id: string | null;
};

function toCents(
  value: string | number | null
): number {
  if (value === null) {
    return NaN;
  }

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

async function retrieveStripeSession(
  sessionId: string,
  secretKey: string
): Promise<StripeSession> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
      sessionId
    )}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(
        STRIPE_TIMEOUT_MS
      ),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('SESSION_NOT_FOUND');
    }

    throw new Error(
      `Stripe status lookup failed: HTTP ${response.status}`
    );
  }

  return (await response.json()) as StripeSession;
}

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  const sessionId = req.query?.session_id;

  if (
    typeof sessionId !== 'string' ||
    !SESSION_ID_PATTERN.test(sessionId)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Valid checkout session required.',
    });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!databaseUrl || !stripeKey) {
    return res.status(503).json({
      success: false,
      error: 'Payment verification is unavailable.',
    });
  }

  try {
    const session = await retrieveStripeSession(
      sessionId,
      stripeKey
    );

    const appointmentId =
      session.metadata?.appointment_id;

    if (
      session.id !== sessionId ||
      session.mode !== 'payment' ||
      session.currency !== 'usd' ||
      session.metadata?.payment_type !==
        'neon_appointment_deposit' ||
      typeof appointmentId !== 'string' ||
      !UUID_PATTERN.test(appointmentId)
    ) {
      return res.status(404).json({
        success: false,
        error: 'Booking payment not found.',
      });
    }

    const sql = neon(databaseUrl);

    const rows = await sql`
      SELECT
        id,
        status,
        total_price,
        deposit_amount,
        deposit_paid_at,
        stripe_checkout_session_id
      FROM public.appointment_requests
      WHERE id = ${appointmentId}::uuid
        AND stripe_checkout_session_id = ${sessionId}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Booking payment not found.',
      });
    }

    const appointment = rows[0] as AppointmentRow;

    const totalCents = toCents(
      appointment.total_price
    );

    const depositCents = toCents(
      appointment.deposit_amount
    );

    if (
      !Number.isSafeInteger(totalCents) ||
      !Number.isSafeInteger(depositCents) ||
      depositCents <= 0 ||
      depositCents > totalCents ||
      session.amount_total !== depositCents
    ) {
      return res.status(409).json({
        success: false,
        error:
          'Payment details require review. Please contact the salon.',
      });
    }

    const confirmed =
      appointment.status === 'confirmed' &&
      appointment.deposit_paid_at !== null &&
      session.status === 'complete' &&
      session.payment_status === 'paid';

    return res.status(200).json({
      success: true,
      paymentStatus: confirmed
        ? 'confirmed'
        : 'pending',
      appointmentStatus: appointment.status,
      totalAmount: totalCents / 100,
      depositAmount: depositCents / 100,
      depositPaid: confirmed
        ? depositCents / 100
        : 0,
      balanceDue: confirmed
        ? (totalCents - depositCents) / 100
        : totalCents / 100,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'SESSION_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        error: 'Booking payment not found.',
      });
    }

    console.error(
      'Booking payment status error:',
      error
    );

    return res.status(503).json({
      success: false,
      error:
        'Unable to verify payment right now. Please try again shortly.',
    });
  }
}
