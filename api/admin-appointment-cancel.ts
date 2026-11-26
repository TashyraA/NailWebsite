import { escapeHtml } from './_email.js';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';
import {
  BALANCE_PAYMENT_TYPE,
  calculateBalancePaymentAmounts,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
  balanceStripeRequest,
  retrieveBalanceSession,
  retrieveBalancePaymentIntent,
  type BalanceStripeSession,
} from './_neon-balance-payment.js';
/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE ADMIN APPOINTMENT CANCELLATION
   - Administrator authentication required
   - Same-origin POST protection
   - Require a cancellation reason
   - Cancel awaiting-deposit appointments
   - Cancel confirmed appointments
   - Preserve original deposit history
   - Preserve remaining balance history
   - Protect deposit checkout claims
   - Protect balance checkout claims
   - Expire known unpaid Stripe sessions
   - Verify recorded balance payments
   - Refuse uncertain payment states
   - Protect concurrent payment activity
   - Use conditional database cancellation
   - Never automatically issue refunds
   - Send cancellation emails after successful cancellation
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
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;
  balance_paid_amount: string | number;
  balance_paid_at: string | null;
  balance_stripe_checkout_session_id:
    string | null;
  balance_stripe_payment_intent_id:
    string | null;
  balance_checkout_claim_id:
    string | null;
  balance_checkout_claim_expires_at:
    string | null;
  has_payment_exception: boolean;
};
type CancellationResult = {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_email: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  balance_paid_amount: string | number;
  balance_paid_at: string | null;
};
type StripeSession = {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
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
  if (
    value === null ||
    (
      typeof value === 'string' &&
      !/^\d+(?:\.\d+)?$/.test(value)
    )
  ) {
    return NaN;
  }
  const amount = Number(value);
  const result = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(result) ||
    Math.abs(result / 100 - amount) > 0.000001
  ) {
    return NaN;
  }
  return result;
}
/* =====================================
   STRIPE API REQUEST
   Preserve the existing deposit
   cancellation integration.
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
      redirect: 'error',
      signal: AbortSignal.timeout(
        STRIPE_REQUEST_TIMEOUT_MS
      ),
      ...(method === 'POST'
        ? { body: '' }
        : {}),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Stripe request failed (${response.status}).`
    );
  }
  return (
    await response.json()
  ) as StripeSession;
}
/* =====================================
   VALIDATE STORED DEPOSIT SESSION
===================================== */
function validStripeSession(
  session: StripeSession,
  appointment: Appointment
): boolean {
  const expectedAmount = cents(
    appointment.deposit_amount
  );
  return (
    isValidBalanceSessionId(
      appointment.stripe_checkout_session_id
    ) &&
    session.id ===
      appointment.stripe_checkout_session_id &&
    session.mode === 'payment' &&
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
   VERIFY DEPOSIT SESSION CANNOT
   ACCEPT ANOTHER PAYMENT
===================================== */
async function verifySessionSafeToCancel(
  stripeKey: string,
  appointment: Appointment
): Promise<boolean> {
  const sessionId =
    appointment.stripe_checkout_session_id;
  if (sessionId === null) {
    return true;
  }
  if (!isValidBalanceSessionId(sessionId)) {
    return false;
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
  if (
    !validStripeSession(
      session,
      appointment
    )
  ) {
    return false;
  }
  /*
     A completed session requires payment
     review, even if payment_status is
     not currently "paid".
  */
  if (session.status === 'complete') {
    return false;
  }
  /*
     Expire an open unpaid session before
     releasing the appointment time.
  */
  if (session.status === 'open') {
    if (
      session.payment_status !== 'unpaid' ||
      session.payment_intent !== null
    ) {
      return false;
    }
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
    if (
      !validStripeSession(
        session,
        appointment
      )
    ) {
      return false;
    }
  }
  return (
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    session.payment_intent === null
  );
}
/* =====================================
   VALIDATE STORED BALANCE SESSION
===================================== */
function validBalanceSession(
  session: BalanceStripeSession,
  appointment: Appointment,
  expectedAmountCents: number
): boolean {
  return (
    isValidBalanceSessionId(
      appointment.balance_stripe_checkout_session_id
    ) &&
    session.id ===
      appointment.balance_stripe_checkout_session_id &&
    session.id !==
      appointment.stripe_checkout_session_id &&
    session.mode === 'payment' &&
    Number.isSafeInteger(
      expectedAmountCents
    ) &&
    expectedAmountCents >= 50 &&
    session.amount_total ===
      expectedAmountCents &&
    session.currency === 'usd' &&
    session.metadata?.payment_type ===
      BALANCE_PAYMENT_TYPE &&
    session.metadata?.appointment_id ===
      appointment.id &&
    (
      appointment.balance_stripe_payment_intent_id ===
        null ||
      session.payment_intent ===
        appointment.balance_stripe_payment_intent_id
    )
  );
}
/* =====================================
   VERIFY RECORDED BALANCE PAYMENT
   A fully paid appointment may still
   be cancelled.
   The payment must be preserved and
   reviewed separately for any refund.
===================================== */
async function verifyRecordedBalancePayment(
  session: BalanceStripeSession,
  appointment: Appointment,
  expectedAmountCents: number
): Promise<boolean> {
  const paymentIntentId =
    appointment.balance_stripe_payment_intent_id;
  if (
    !appointment.balance_paid_at ||
    !isValidBalancePaymentIntentId(
      paymentIntentId
    ) ||
    paymentIntentId ===
      appointment.stripe_payment_intent_id ||
    session.status !== 'complete' ||
    session.payment_status !== 'paid' ||
    session.payment_intent !== paymentIntentId
  ) {
    return false;
  }
  const paymentIntent =
    await retrieveBalancePaymentIntent(
      paymentIntentId
    );
  if (
    paymentIntent.id !== paymentIntentId ||
    paymentIntent.status !== 'succeeded' ||
    paymentIntent.currency !== 'usd' ||
    paymentIntent.amount !==
      expectedAmountCents ||
    paymentIntent.amount_received !==
      expectedAmountCents ||
    (
      paymentIntent.capture_method !==
        'automatic' &&
      paymentIntent.capture_method !==
        'automatic_async'
    )
  ) {
    return false;
  }
  const charge =
    paymentIntent.latest_charge;
  if (
    !charge ||
    typeof charge !== 'object'
  ) {
    return false;
  }
  return (
    typeof charge.id === 'string' &&
    charge.id.startsWith('ch_') &&
    charge.payment_intent ===
      paymentIntentId &&
    charge.status === 'succeeded' &&
    charge.paid === true &&
    charge.captured === true &&
    charge.currency === 'usd' &&
    charge.amount ===
      expectedAmountCents &&
    charge.amount_captured ===
      expectedAmountCents &&
    charge.amount_refunded === 0 &&
    charge.refunded === false
  );
}
/* =====================================
   VERIFY BALANCE SESSION SAFETY
   - No checkout: allow cancellation.
   - Open unpaid checkout: expire it.
   - Expired unpaid checkout: allow.
   - Unrecorded payment: refuse.
   - Verified recorded payment: allow
     with manual refund review.
===================================== */
async function verifyBalanceSafeToCancel(
  appointment: Appointment
): Promise<boolean> {
  const amounts =
    calculateBalancePaymentAmounts(
      appointment.total_price,
      appointment.deposit_amount,
      appointment.balance_paid_amount
    );
  const sessionId =
    appointment.balance_stripe_checkout_session_id;
  /*
     Never clear an uncertain checkout
     claim automatically.
  */
  if (
    appointment.balance_checkout_claim_id !==
      null ||
    appointment.balance_checkout_claim_expires_at !==
      null
  ) {
    return false;
  }
  const hasRecordedBalancePayment =
    amounts.balancePaidCents > 0;
  /*
     Check consistency of the database
     before contacting Stripe.
  */
  if (hasRecordedBalancePayment) {
    if (
      amounts.balanceDueCents !== 0 ||
      !appointment.balance_paid_at ||
      !isValidBalanceSessionId(sessionId) ||
      !isValidBalancePaymentIntentId(
        appointment.balance_stripe_payment_intent_id
      )
    ) {
      return false;
    }
  } else {
    if (
      appointment.balance_paid_at !== null ||
      appointment.balance_stripe_payment_intent_id !==
        null
    ) {
      return false;
    }
  }
  if (sessionId === null) {
    return !hasRecordedBalancePayment;
  }
  if (
    !isValidBalanceSessionId(sessionId) ||
    sessionId ===
      appointment.stripe_checkout_session_id
  ) {
    return false;
  }
  const expectedAmountCents =
    amounts.totalCents -
    amounts.depositCents;
  let session =
    await retrieveBalanceSession(
      sessionId
    );
  if (
    !validBalanceSession(
      session,
      appointment,
      expectedAmountCents
    )
  ) {
    return false;
  }
  /*
     A verified, recorded payment cannot
     be collected again through its
     completed Checkout Session.
  */
  if (hasRecordedBalancePayment) {
    return verifyRecordedBalancePayment(
      session,
      appointment,
      expectedAmountCents
    );
  }
  /*
     Never cancel an appointment with
     a completed but unrecorded balance
     payment.
  */
  if (session.status === 'complete') {
    return false;
  }
  if (session.status === 'open') {
    if (
      session.payment_status !== 'unpaid' ||
      session.payment_intent !== null
    ) {
      return false;
    }
    await balanceStripeRequest<BalanceStripeSession>(
      `/checkout/sessions/${encodeURIComponent(
        sessionId
      )}/expire`,
      {
        method: 'POST',
      }
    );
    /*
       Retrieve the session again rather
       than relying only on the expiration
       request's response.
    */
    session =
      await retrieveBalanceSession(
        sessionId
      );
    if (
      !validBalanceSession(
        session,
        appointment,
        expectedAmountCents
      )
    ) {
      return false;
    }
  }
  return (
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    session.payment_intent === null
  );
}
/* =====================================
   ADMIN CANCELLATION HANDLER
===================================== */

async function sendCancellationEmail(
  recipient: string, subject: string, html: string, key: string
): Promise<boolean> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      return false;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ from, to: [recipient.trim()], subject, html }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return typeof result?.id === 'string' && result.id.length > 0;
  } catch {
    return false;
  }
}

async function notifyCancellation(appointment: CancellationResult, reason: string, refundReview: boolean, totalPaid: number | null) {
  const safe = (value: unknown) => escapeHtml(String(value ?? ''));
  const details = `<p><strong>Customer:</strong> ${safe(appointment.customer_name)}</p>
    <p><strong>Date:</strong> ${safe(appointment.appointment_date)}</p>
    <p><strong>Time:</strong> ${safe(appointment.appointment_time)}</p>`;
  const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#29252B"><h2 style="color:#963F60">InLoveNailz by Briana</h2>${body}<p>With love,<br>InLoveNailz by Briana</p></div>`;
  const customer = wrap(`<p>Hi ${safe(appointment.customer_name)},</p><p>Your nail appointment has been cancelled.</p>${details}${refundReview ? '<p>If you have made a payment, please contact us regarding any applicable refund. No automatic refund has been issued.</p>' : ''}<p>We apologize for any inconvenience.</p>`);
  const business = wrap(`<p>An appointment has been cancelled through your admin dashboard.</p>${details}<p><strong>Reason:</strong> ${safe(reason)}</p><p><strong>Recorded payments:</strong> ${totalPaid === null ? 'Review required' : '$' + totalPaid.toFixed(2)}</p><p>Refund review: ${refundReview ? 'Required' : 'Not required based on recorded payments'}. No automatic refund has been issued.</p>`);
  return Promise.all([
    sendCancellationEmail(appointment.customer_email || '', 'InLoveNailz | Appointment Cancelled', customer, `inl-cancel-customer-${appointment.id}`),
    sendCancellationEmail(process.env.BUSINESS_EMAIL || '', 'InLoveNailz | Appointment Cancellation Confirmation', business, `inl-cancel-business-${appointment.id}`),
  ]);
}

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader(
    'Cache-Control',
    'no-store'
  );
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
    const rawBody: unknown =
      req.body;
    if (!isRecord(rawBody)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid cancellation request.',
      });
    }
    const bodySize = Buffer.byteLength(
      JSON.stringify(rawBody),
      'utf8'
    );
    if (bodySize > MAX_REQUEST_BYTES) {
      return res.status(413).json({
        success: false,
        error:
          'Cancellation request is too large.',
      });
    }
    const body =
      rawBody as CancellationRequest;
    const appointmentId =
      body.appointmentId;
    if (
      typeof appointmentId !== 'string' ||
      !UUID_PATTERN.test(
        appointmentId
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid appointment ID.',
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
    const reason =
      body.reason.trim();
    if (
      reason.length < 3 ||
      reason.length >
        MAX_REASON_LENGTH
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
    const databaseUrl =
      process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured.'
      );
    }
    const sql =
      neon(databaseUrl);
    /* =====================================
       READ CURRENT APPOINTMENT STATE
    ===================================== */
    const rows = await sql`
      SELECT
        a.id,
        a.status,
        a.total_price,
        a.deposit_amount,
        a.deposit_paid_at::text
          AS deposit_paid_at,
        a.stripe_checkout_session_id,
        a.stripe_payment_intent_id,
        a.deposit_checkout_claim_id,
        a.deposit_checkout_claim_expires_at::text
          AS deposit_checkout_claim_expires_at,
        a.balance_paid_amount,
        a.balance_paid_at::text
          AS balance_paid_at,
        a.balance_stripe_checkout_session_id,
        a.balance_stripe_payment_intent_id,
        a.balance_checkout_claim_id,
        a.balance_checkout_claim_expires_at::text
          AS balance_checkout_claim_expires_at,
        EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events AS e
          WHERE e.appointment_id = a.id
            AND e.processing_status = 'needs_review'
        ) AS has_payment_exception
      FROM public.appointment_requests AS a
      WHERE a.id =
        ${appointmentId}::uuid
      LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error:
          'Appointment not found.',
      });
    }
    const appointment =
      rows[0] as Appointment;
    if (
      appointment.status !==
        'awaiting_deposit' &&
      appointment.status !==
        'confirmed'
    ) {
      return res.status(409).json({
        success: false,
        error:
          'This appointment cannot be cancelled. Refresh the appointment list.',
      });
    }
    /* =====================================
       PROTECT UNRESOLVED PAYMENT EVENTS
    ===================================== */
    if (appointment.has_payment_exception) {
      return res.status(409).json({
        success: false,
        error:
          'Unresolved payment activity requires review before cancellation. The appointment remains reserved.',
      });
    }
    /* =====================================
       PROTECT ALL CHECKOUT CLAIMS
       Even expired claims can represent
       uncertain Stripe API requests.
    ===================================== */
    if (
      appointment.deposit_checkout_claim_id !==
        null ||
      appointment.deposit_checkout_claim_expires_at !==
        null ||
      appointment.balance_checkout_claim_id !==
        null ||
      appointment.balance_checkout_claim_expires_at !==
        null
    ) {
      return res.status(409).json({
        success: false,
        error:
          'Checkout creation requires review before cancellation. The appointment time remains reserved.',
      });
    }
    /* =====================================
       PROTECT AWAITING-DEPOSIT PAYMENTS
    ===================================== */
    if (
      appointment.status ===
      'awaiting_deposit'
    ) {
      if (
        appointment.deposit_paid_at !==
          null ||
        appointment.stripe_payment_intent_id !==
          null ||
        cents(
          appointment.balance_paid_amount
        ) !== 0 ||
        appointment.balance_paid_at !==
          null ||
        appointment.balance_stripe_checkout_session_id !==
          null ||
        appointment.balance_stripe_payment_intent_id !==
          null
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Payment activity requires review before cancelling this awaiting-deposit appointment.',
        });
      }
      /*
         Verify and expire a known
         unpaid deposit checkout.
      */
      if (
        appointment.stripe_checkout_session_id !==
        null
      ) {
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
        } catch {
          console.error(
            'Stripe deposit cancellation verification failed.',
            {
              appointmentId:
                appointment.id,
            }
          );
          return res.status(503).json({
            success: false,
            error:
              'Stripe deposit payment status could not be verified. The appointment remains reserved for review.',
          });
        }
        if (!safeToCancel) {
          return res.status(409).json({
            success: false,
            error:
              'Stripe deposit payment or checkout status requires review. The appointment has not been cancelled.',
          });
        }
      }
    }
    /* =====================================
       PROTECT CONFIRMED APPOINTMENTS
       Preserve the deposit and safely
       resolve remaining balance checkout
       activity before cancellation.
    ===================================== */
    if (
      appointment.status ===
      'confirmed'
    ) {
      if (
        !appointment.deposit_paid_at ||
        !isValidBalanceSessionId(
          appointment.stripe_checkout_session_id
        ) ||
        !isValidBalancePaymentIntentId(
          appointment.stripe_payment_intent_id
        )
      ) {
        return res.status(409).json({
          success: false,
          error:
            'The confirmed appointment has incomplete deposit payment records. Review its payment history before cancellation.',
        });
      }
      /*
         Reject inconsistent amounts
         before contacting Stripe.
      */
      try {
        calculateBalancePaymentAmounts(
          appointment.total_price,
          appointment.deposit_amount,
          appointment.balance_paid_amount
        );
      } catch {
        return res.status(409).json({
          success: false,
          error:
            'Appointment payment amounts require review before cancellation.',
        });
      }
      if (
        appointment.balance_stripe_checkout_session_id !==
          null &&
        !process.env.STRIPE_SECRET_KEY
      ) {
        return res.status(503).json({
          success: false,
          error:
            'Stripe configuration is unavailable. The appointment has not been cancelled.',
        });
      }
      let safeToCancel = false;
      try {
        safeToCancel =
          await verifyBalanceSafeToCancel(
            appointment
          );
      } catch {
        console.error(
          'Stripe balance cancellation verification failed.',
          {
            appointmentId:
              appointment.id,
          }
        );
        return res.status(503).json({
          success: false,
          error:
            'Remaining balance payment status could not be verified. The appointment remains reserved for review.',
        });
      }
      if (!safeToCancel) {
        return res.status(409).json({
          success: false,
          error:
            'Remaining balance payment or checkout activity requires review. The appointment has not been cancelled.',
        });
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
       Compare all payment-related fields
       against the verified snapshot.
       A new checkout claim, changed
       session, recorded payment, or
       unresolved payment event prevents
       cancellation.
       Never delete payment history.
    ===================================== */
    const result = await sql`
      UPDATE public.appointment_requests AS a
      SET
        status = 'cancelled',
        notes = CONCAT_WS(
          E'\n\n',
          NULLIF(a.notes, ''),
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
      WHERE a.id =
        ${appointmentId}::uuid
        AND a.status =
          ${appointment.status}
        AND a.status IN (
          'awaiting_deposit',
          'confirmed'
        )
        AND a.total_price
          IS NOT DISTINCT FROM
          ${appointment.total_price}::numeric
        AND a.deposit_amount
          IS NOT DISTINCT FROM
          ${appointment.deposit_amount}::numeric
        AND a.deposit_paid_at
          IS NOT DISTINCT FROM
          ${appointment.deposit_paid_at}::timestamptz
        AND a.stripe_checkout_session_id
          IS NOT DISTINCT FROM
          ${appointment.stripe_checkout_session_id}::text
        AND a.stripe_payment_intent_id
          IS NOT DISTINCT FROM
          ${appointment.stripe_payment_intent_id}::text
        AND a.deposit_checkout_claim_id IS NULL
        AND a.deposit_checkout_claim_expires_at IS NULL
        AND a.balance_paid_amount
          IS NOT DISTINCT FROM
          ${appointment.balance_paid_amount}::numeric
        AND a.balance_paid_at
          IS NOT DISTINCT FROM
          ${appointment.balance_paid_at}::timestamptz
        AND a.balance_stripe_checkout_session_id
          IS NOT DISTINCT FROM
          ${appointment.balance_stripe_checkout_session_id}::text
        AND a.balance_stripe_payment_intent_id
          IS NOT DISTINCT FROM
          ${appointment.balance_stripe_payment_intent_id}::text
        AND a.balance_checkout_claim_id IS NULL
        AND a.balance_checkout_claim_expires_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events AS e
          WHERE e.appointment_id = a.id
            AND e.processing_status = 'needs_review'
        )
      RETURNING
        a.id,
        a.status,
        a.appointment_date::text
          AS appointment_date,
        a.appointment_time,
        a.customer_name,
        a.customer_email,
        a.total_price,
        a.deposit_amount,
        a.deposit_paid_at,
        a.balance_paid_amount,
        a.balance_paid_at
    `;
    /* =====================================
       HANDLE CONCURRENT STATE CHANGES
    ===================================== */
    if (result.length === 0) {
      return res.status(409).json({
        success: false,
        error:
          'The appointment or payment state changed during cancellation. The appointment was not cancelled by this request. Refresh and review before retrying.',
      });
    }
    const cancelledAppointment =
      result[0] as CancellationResult;
    /* =====================================
       CALCULATE PRESERVED PAYMENT TOTALS
    ===================================== */
    const hasPaidDeposit =
      cancelledAppointment.deposit_paid_at !==
      null;
    const hasPaidBalance =
      cancelledAppointment.balance_paid_at !==
        null &&
      Number(
        cancelledAppointment.balance_paid_amount
      ) > 0;
    const depositPaidCents =
      hasPaidDeposit
        ? cents(
            cancelledAppointment.deposit_amount
          )
        : 0;
    const balancePaidCents =
      hasPaidBalance
        ? cents(
            cancelledAppointment.balance_paid_amount
          )
        : 0;
    const totalPaidCents =
      depositPaidCents +
      balancePaidCents;
    const totalPriceCents =
      cents(
        cancelledAppointment.total_price
      );
    const totalPaid =
      Number.isSafeInteger(
        totalPaidCents
      )
        ? totalPaidCents / 100
        : null;
    const refundRequiredReview =
      hasPaidDeposit ||
      hasPaidBalance;
    const wasPaidInFull =
      Number.isSafeInteger(
        totalPriceCents
      ) &&
      totalPriceCents > 0 &&
      totalPaidCents ===
        totalPriceCents;
    /* =====================================
       SUCCESS RESPONSE
       No Stripe refund is initiated.
       Email acceptance is reported separately from cancellation.
       Payment totals represent recorded
       payments, not a refund calculation.
    ===================================== */
    let message =
      'Appointment cancelled successfully. Its reserved time is now available again.';
    if (hasPaidBalance) {
      message =
        'Appointment cancelled and its time released. Both deposit and remaining balance payments have been preserved. Review Stripe and handle any refund separately.';
    } else if (hasPaidDeposit) {
      message =
        'Appointment cancelled and its time released. A deposit payment was recorded. Review Stripe and handle any refund separately.';
    }
    let customerEmailAccepted = false;
    let businessEmailAccepted = false;
    try {
      [customerEmailAccepted, businessEmailAccepted] = await notifyCancellation(cancelledAppointment, reason, refundRequiredReview, totalPaid);
    } catch {
      // Cancellation has already committed. Never report it as failed because of email.
    }
    if (!customerEmailAccepted || !businessEmailAccepted) {
      console.error('Cancellation email acceptance incomplete.', { appointmentId, customerEmailAccepted, businessEmailAccepted });
    }
    message += ` Customer email: ${customerEmailAccepted ? 'accepted by Resend' : 'acceptance not confirmed'}. Business email: ${businessEmailAccepted ? 'accepted by Resend' : 'acceptance not confirmed'}. Delivery is not confirmed.`;
    return res.status(200).json({
      success: true,
      message,
      appointment: {
        id:
          cancelledAppointment.id,
        status:
          cancelledAppointment.status,
        appointmentDate:
          cancelledAppointment.appointment_date,
        appointmentTime:
          cancelledAppointment.appointment_time,
        customerName:
          cancelledAppointment.customer_name,
        customerEmail:
          cancelledAppointment.customer_email,
        totalPrice:
          Number(
            cancelledAppointment.total_price
          ),
        depositAmount:
          cancelledAppointment.deposit_amount === null
            ? null
            : Number(
                cancelledAppointment.deposit_amount
              ),
        depositPaidAt:
          cancelledAppointment.deposit_paid_at,
        hasPaidDeposit,
        balancePaidAmount:
          Number(
            cancelledAppointment.balance_paid_amount
          ),
        balancePaidAt:
          cancelledAppointment.balance_paid_at,
        hasPaidBalance,
        totalPaid,
        wasPaidInFull,
        cancellationReason:
          reason,
      },
      refundRequiredReview,
      refundAutomaticallyIssued:
        false,
      customerAutomaticallyNotified: customerEmailAccepted,
      customerEmailAccepted,
      businessEmailAccepted,
    });
  } catch {
    console.error(
      'Admin appointment cancellation failed.'
    );
    return res.status(500).json({
      success: false,
      error:
        'Unable to complete the cancellation request. Refresh the appointment list and review its payment status before retrying.',
    });
  }
}
