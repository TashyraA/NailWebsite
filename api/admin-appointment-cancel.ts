
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE ADMIN APPOINTMENT CANCELLATION

   - Administrator authentication required
   - Same-origin POST protection
   - Require a cancellation reason
   - Cancel awaiting-deposit appointments
   - Cancel confirmed appointments
   - Preserve appointment/payment history
   - Protect active checkout claims
   - Expire known open Stripe sessions
   - Refuse uncertain payment states
   - Use conditional database cancellation
   - Never automatically issue refunds
   - Never automatically email customers
========================================= */

const MAX_REQUEST_BYTES = 10_000;
const MAX_REASON_LENGTH = 1000;
const STRIPE_REQUEST_TIMEOUT_MS = 20_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CancellationRequest = {
  appointmentId?: unknown;
  reason?: unknown;
};

type Appointment = {
  id: string;
  status: string;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;
};

type CancellationResult = {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_email: string;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
};

type StripeSession = {
  id?: string;
  status?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
  error?: {
    message?: string;
  };
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function cents(
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

/* =====================================
   STRIPE API REQUEST
===================================== */

async function stripeRequest(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST'
): Promise<StripeSession> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };

  if (method === 'POST') {
    headers['Content-Type'] =
      'application/x-www-form-urlencoded';
  }

  const response = await fetch(
    `https://api.stripe.com/v1${path}`,
    {
      method,
      headers,
      signal: AbortSignal.timeout(
        STRIPE_REQUEST_TIMEOUT_MS
      ),
      ...(method === 'POST'
        ? { body: '' }
        : {}),
    }
  );

  const data =
    (await response.json()) as StripeSession;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `Stripe request failed (${response.status})`
    );
  }

  return data;
}

/* =====================================
   VALIDATE STORED STRIPE SESSION
===================================== */

function validStripeSession(
  session: StripeSession,
  appointment: Appointment
): boolean {
  const expectedAmount = cents(
    appointment.deposit_amount
  );

  return (
    typeof appointment.stripe_checkout_session_id ===
      'string' &&
    session.id ===
      appointment.stripe_checkout_session_id &&
    Number.isSafeInteger(expectedAmount) &&
    expectedAmount >= 50 &&
    session.amount_total === expectedAmount &&
    session.currency === 'usd' &&
    session.metadata?.payment_type ===
      'neon_appointment_deposit' &&
    session.metadata?.appointment_id ===
      appointment.id &&
    (
      appointment.stripe_payment_intent_id === null ||
      session.payment_intent ===
        appointment.stripe_payment_intent_id
    )
  );
}

/* =====================================
   VERIFY SESSION CANNOT ACCEPT PAYMENT
===================================== */

async function verifySessionSafeToCancel(
  stripeKey: string,
  appointment: Appointment
): Promise<boolean> {
  const sessionId =
    appointment.stripe_checkout_session_id;

  if (!sessionId) {
    return true;
  }

  const sessionPath =
    `/checkout/sessions/${encodeURIComponent(
      sessionId
    )}`;

  let session = await stripeRequest(
    stripeKey,
    sessionPath,
    'GET'
  );

  if (!validStripeSession(session, appointment)) {
    return false;
  }

  /*
     A completed session requires payment review,
     even if its payment_status is not "paid".
  */

  if (session.status === 'complete') {
    return false;
  }

  /*
     Expire an open session through Stripe before
     releasing the appointment's reserved time.

     If payment wins the race, Stripe may reject
     expiration. In that case, do not cancel.
  */

  if (session.status === 'open') {
    await stripeRequest(
      stripeKey,
      `${sessionPath}/expire`,
      'POST'
    );

    session = await stripeRequest(
      stripeKey,
      sessionPath,
      'GET'
    );

    if (!validStripeSession(session, appointment)) {
      return false;
    }
  }

  /*
     Only an expired, unpaid session is acceptable.

     Missing or unexpected statuses must never
     be treated as proof that payment is absent.
  */

  return (
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    !session.payment_intent
  );
}

/* =====================================
   ADMIN CANCELLATION HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );
  res.setHeader(
    'Referrer-Policy',
    'no-referrer'
  );

  /* =====================================
     ONLY ACCEPT POST REQUESTS
  ===================================== */

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  /* =====================================
     VERIFY ADMIN SESSION
  ===================================== */

  if (!requireAdmin(req, res, true)) {
    return;
  }

  try {
    /* =====================================
       VALIDATE REQUEST BODY
    ===================================== */

    const rawBody: unknown = req.body;

    if (!isRecord(rawBody)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cancellation request.',
      });
    }

    const bodySize = Buffer.byteLength(
      JSON.stringify(rawBody),
      'utf8'
    );

    if (bodySize > MAX_REQUEST_BYTES) {
      return res.status(413).json({
        success: false,
        error: 'Cancellation request is too large.',
      });
    }

    const body = rawBody as CancellationRequest;
    const appointmentId = body.appointmentId;

    if (
      typeof appointmentId !== 'string' ||
      !UUID_PATTERN.test(appointmentId)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID.',
      });
    }

    /* =====================================
       REQUIRE A CANCELLATION REASON
    ===================================== */

    if (typeof body.reason !== 'string') {
      return res.status(400).json({
        success: false,
        error:
          'Please provide a cancellation reason.',
      });
    }

    const reason = body.reason.trim();

    if (
      reason.length < 3 ||
      reason.length > MAX_REASON_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Enter a cancellation reason between 3 and 1000 characters.',
      });
    }

    /* =====================================
       CONNECT TO NEON
    ===================================== */

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured.'
      );
    }

    const sql = neon(databaseUrl);

    /* =====================================
       READ CURRENT APPOINTMENT STATE
    ===================================== */

    const rows = await sql`
      SELECT
        id,
        status,
        deposit_amount,
        deposit_paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        deposit_checkout_claim_id,
        deposit_checkout_claim_expires_at
      FROM appointment_requests
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
      appointment.status !== 'awaiting_deposit' &&
      appointment.status !== 'confirmed'
    ) {
      return res.status(409).json({
        success: false,
        error:
          'This appointment cannot be cancelled. Refresh the appointment list.',
      });
    }

    /* =====================================
       PROTECT AWAITING-DEPOSIT PAYMENTS
    ===================================== */

    if (appointment.status === 'awaiting_deposit') {
      /*
         Never cancel while a checkout claim
         remains recorded.

         Even an expired claim might represent
         a Stripe request whose outcome is
         unknown to the application.
      */

      if (
        appointment.deposit_checkout_claim_id !== null
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Checkout creation requires review before cancellation. The appointment time remains reserved.',
        });
      }

      /*
         Payment evidence requires review.

         A recorded payment must not be
         discarded or silently treated
         as an unpaid appointment.
      */

      if (
        appointment.deposit_paid_at !== null ||
        appointment.stripe_payment_intent_id !== null
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Payment activity requires review before cancelling this awaiting-deposit appointment.',
        });
      }

      /*
         A known Stripe Session must be
         verified and safely expired.
      */

      if (appointment.stripe_checkout_session_id) {
        const stripeKey =
          process.env.STRIPE_SECRET_KEY;

        if (!stripeKey) {
          return res.status(503).json({
            success: false,
            error:
              'Stripe configuration is unavailable. The appointment has not been cancelled.',
          });
        }

        let safeToCancel = false;

        try {
          safeToCancel =
            await verifySessionSafeToCancel(
              stripeKey,
              appointment
            );
        } catch (stripeError) {
          console.error(
            'Stripe cancellation verification error:',
            stripeError
          );

          return res.status(503).json({
            success: false,
            error:
              'Stripe payment status could not be verified. The appointment remains reserved for review.',
          });
        }

        if (!safeToCancel) {
          return res.status(409).json({
            success: false,
            error:
              'Stripe payment or checkout status requires review. The appointment has not been cancelled.',
          });
        }
      }
    }

    /* =====================================
       RECORD CANCELLATION REASON
    ===================================== */

    const cancellationEntry =
      `[ADMIN CANCELLATION]\n` +
      `Reason: ${reason}`;

    /* =====================================
       ATOMICALLY CANCEL APPOINTMENT

       For awaiting-deposit appointments:

       - The checkout claim must remain NULL.
       - The stored session must be unchanged.
       - No payment may have been recorded.
       - No PaymentIntent may be attached.

       This prevents cancellation from winning
       a race against a new checkout claim
       or a database payment confirmation.

       Confirmed appointments retain the
       existing administrator cancellation
       behavior and refund-review response.
    ===================================== */

    const result = await sql`
      UPDATE appointment_requests

      SET
        status = 'cancelled',

        notes = CONCAT_WS(
          E'\n\n',
          NULLIF(notes, ''),
          ${cancellationEntry} ||
          E'\nTimestamp (UTC): ' ||
          TO_CHAR(
            NOW() AT TIME ZONE 'UTC',
            'YYYY-MM-DD HH24:MI:SS'
          )
        ),

        updated_at = NOW(),

        review_token_hash = NULL,

        review_token_expires_at = NULL

      WHERE id = ${appointmentId}::uuid

        AND (
          (
            status = 'awaiting_deposit'

            AND ${appointment.status} =
              'awaiting_deposit'

            AND deposit_paid_at IS NULL

            AND stripe_payment_intent_id IS NULL

            AND deposit_checkout_claim_id IS NULL

            AND stripe_checkout_session_id
              IS NOT DISTINCT FROM
              ${appointment.stripe_checkout_session_id}
          )

          OR

          (
            status = 'confirmed'

            AND ${appointment.status} =
              'confirmed'
          )
        )

      RETURNING
        id,
        status,
        appointment_date::text
          AS appointment_date,
        appointment_time,
        customer_name,
        customer_email,
        deposit_amount,
        deposit_paid_at
    `;

    /* =====================================
       HANDLE CONCURRENT STATE CHANGES
    ===================================== */

    if (result.length === 0) {
      return res.status(409).json({
        success: false,
        error:
          'The appointment or payment state changed during cancellation. Nothing was cancelled. Refresh and review before retrying.',
      });
    }

    const cancelledAppointment =
      result[0] as CancellationResult;

    const hasPaidDeposit =
      cancelledAppointment.deposit_paid_at !== null;

    /* =====================================
       SUCCESS RESPONSE

       No Stripe refund is initiated.
       No customer email is sent.
    ===================================== */

    return res.status(200).json({
      success: true,

      message: hasPaidDeposit
        ? 'Appointment cancelled and its time released. A deposit payment was recorded. Review Stripe and handle any refund separately.'
        : 'Appointment cancelled successfully. Its reserved time is now available again.',

      appointment: {
        id: cancelledAppointment.id,
        status: cancelledAppointment.status,
        appointmentDate:
          cancelledAppointment.appointment_date,
        appointmentTime:
          cancelledAppointment.appointment_time,
        customerName:
          cancelledAppointment.customer_name,
        customerEmail:
          cancelledAppointment.customer_email,
        depositAmount:
          cancelledAppointment.deposit_amount === null
            ? null
            : Number(
                cancelledAppointment.deposit_amount
              ),
        depositPaidAt:
          cancelledAppointment.deposit_paid_at,
        hasPaidDeposit,
        cancellationReason: reason,
      },

      refundRequiredReview: hasPaidDeposit,

      refundAutomaticallyIssued: false,

      customerAutomaticallyNotified: false,
    });
  } catch (error: unknown) {
    console.error(
      'Admin appointment cancellation error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to cancel the appointment. Please try again.',
    });
  }
}
