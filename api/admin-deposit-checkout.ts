
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';
import { balanceAppUrl, isValidBalanceCheckoutUrl, isPayableBalanceAmount } from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   ADMIN DEPOSIT CHECKOUT

   - Admin-only endpoint
   - Approved pricing comes from Neon
   - Requires an active deposit deadline
   - Atomically reserves Checkout creation
   - Reuses verified safe open sessions
   - Restricts new payments to cards
   - Enforces Stripe Checkout expiration
   - Preserves uncertain Stripe claims
   - Never assumes a timed-out request failed
   - Never marks an appointment paid
   - Never sends payment emails

   IMPORTANT:
   An expired database claim is NOT proof
   that a Stripe Checkout Session is safe.

   Unresolved claims require reconciliation
   before creating another payment link or
   releasing the appointment slot.
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLAIM_SECONDS = 120;
const STRIPE_REQUEST_TIMEOUT_MS = 20_000;

const MIN_CHECKOUT_SECONDS = 31 * 60;
const MAX_CHECKOUT_SECONDS = 23 * 60 * 60;

type Appointment = {
  id: string;
  customer_email: string;
  status: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  deposit_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;
};

type StripeSession = {
  livemode?: boolean;
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
  error?: {
    message?: string;
  };
};

type ClaimedAppointment = {
  id: string;
  customer_email: string;
  deposit_amount: string | number | null;
  total_price: string | number;
  deposit_expires_at: string | null;
};

/* =====================================
   STRIPE API REQUEST
===================================== */

async function stripeRequest(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST',
  params?: URLSearchParams,
  idempotencyKey?: string
): Promise<StripeSession> {
  if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) {
    throw new Error('LIVE Stripe credentials required.');
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };

  if (method === 'POST') {
    headers['Content-Type'] =
      'application/x-www-form-urlencoded';
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
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
        ? { body: params?.toString() ?? '' }
        : {}),
    }
  );

  const data =
    (await response.json()) as StripeSession;

  if (!response.ok) {
    throw new Error(
      `Stripe request failed (${response.status})`
    );
  }

  return data;
}

/* =====================================
   CONVERT AMOUNT TO CENTS
===================================== */

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
   READ DEPOSIT DEADLINE
===================================== */

function deadlineSeconds(
  value: string | null
): number | null {
  if (value === null) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return NaN;
  }

  return Math.floor(timestamp / 1000);
}

/* =====================================
   CALCULATE STRIPE EXPIRATION

   Stripe requires Checkout expiration
   between 30 minutes and 24 hours.

   A 31-minute minimum gives a small
   buffer for request latency.
===================================== */

function checkoutExpiration(
  deadline: number | null
): number | null {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const minimumExpiration =
    nowSeconds + MIN_CHECKOUT_SECONDS;

  const maximumExpiration =
    nowSeconds + MAX_CHECKOUT_SECONDS;

  if (
    deadline === null ||
    !Number.isSafeInteger(deadline) ||
    deadline < minimumExpiration
  ) {
    return null;
  }

  return Math.min(
    deadline,
    maximumExpiration
  );
}

/* =====================================
   VALIDATE STORED STRIPE SESSION
===================================== */

function validSession(
  session: StripeSession,
  appointment: Appointment,
  depositCents: number
): boolean {
  return (
    session.livemode === true &&
    session.id ===
      appointment.stripe_checkout_session_id &&
    session.mode === 'payment' &&
    session.amount_total === depositCents &&
    session.currency === 'usd' &&
    session.metadata?.payment_type ===
      'neon_appointment_deposit' &&
    session.metadata?.appointment_id ===
      appointment.id
  );
}

/* =====================================
   CHECK EXISTING SESSION EXPIRATION
===================================== */

function safeExistingExpiration(
  session: StripeSession,
  deadline: number | null
): boolean {
  const expiration = session.expires_at;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    deadline === null ||
    !Number.isSafeInteger(deadline) ||
    deadline <= nowSeconds ||
    typeof expiration !== 'number' ||
    !Number.isSafeInteger(expiration) ||
    expiration <= nowSeconds
  ) {
    return false;
  }

  return expiration <= deadline;
}

/* =====================================
   VERIFY SESSION IS DEFINITIVELY
   EXPIRED AND UNPAID

   A completed-but-unpaid session is
   NOT enough to release the claim.

   A PaymentIntent, even if apparently
   unpaid, requires further review.
===================================== */

function safelyExpiredUnpaid(
  session: StripeSession
): boolean {
  return (
    session.livemode === true &&
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    !session.payment_intent
  );
}

/* =====================================
   ADMIN DEPOSIT CHECKOUT HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
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
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!databaseUrl || !stripeKey || !/^(sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)) {
    return res.status(500).json({
      success: false,
      error: 'Payment configuration is unavailable.',
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

  const sql = neon(databaseUrl);

  try {
    /* =====================================
       LOAD APPROVED APPOINTMENT
    ===================================== */

    const rows = await sql`
      SELECT
        id,
        customer_email,
        status,
        total_price,
        deposit_amount,
        deposit_paid_at,
        deposit_expires_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        deposit_checkout_claim_id,
        deposit_checkout_claim_expires_at
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
        error: 'Appointment is not awaiting payment.',
      });
    }

    /* =====================================
       REQUIRE APPROVED DEPOSIT DEADLINE
    ===================================== */

    const deadline = deadlineSeconds(
      appointment.deposit_expires_at
    );

    if (
      deadline === null ||
      !Number.isSafeInteger(deadline) ||
      deadline <= Math.floor(Date.now() / 1000)
    ) {
      return res.status(409).json({
        success: false,
        error:
          'Deposit deadline is missing, expired, or invalid. Review the appointment before creating a payment link.',
      });
    }

    /* =====================================
       VALIDATE APPROVED AMOUNTS
    ===================================== */

    const depositCents = cents(
      appointment.deposit_amount
    );

    const totalCents = cents(
      appointment.total_price
    );

    if (
      !Number.isSafeInteger(depositCents) ||
      !Number.isSafeInteger(totalCents) ||
      !isPayableBalanceAmount(depositCents) ||
      depositCents > totalCents
    ) {
      return res.status(409).json({
        success: false,
        error: 'Invalid approved deposit amount.',
      });
    }

    /* =====================================
       UNRESOLVED CHECKOUT CLAIM

       Never reuse an expired claim merely
       because its lease time passed.

       The Stripe POST may have succeeded
       while the server lost its response.
    ===================================== */

    if (appointment.deposit_checkout_claim_id !== null || appointment.deposit_checkout_claim_expires_at !== null) {
      return res.status(409).json({
        success: false,
        error:
          'A previous checkout attempt requires reconciliation. Do not create another payment link or release this appointment until Stripe has been checked.',
      });
    }

    /* =====================================
       CHECK EXISTING STRIPE SESSION
    ===================================== */

    const exceptions = await sql`
      SELECT 1 FROM public.salon_stripe_payment_events
      WHERE appointment_id = ${appointmentId}::uuid
        AND processing_status = 'needs_review'
      LIMIT 1
    `;
    if (exceptions.length) {
      return res.status(409).json({ success: false, error: 'Payment review required.' });
    }

    if (appointment.stripe_checkout_session_id) {
      if (!/^cs_live_[A-Za-z0-9]+$/.test(appointment.stripe_checkout_session_id)) {
        return res.status(409).json({ success: false, error: 'Stored checkout requires LIVE payment reconciliation.' });
      }
      const existing = await stripeRequest(
        stripeKey,
        `/checkout/sessions/${encodeURIComponent(
          appointment.stripe_checkout_session_id
        )}`,
        'GET'
      );

      if (
        !validSession(
          existing,
          appointment,
          depositCents
        )
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Stored Stripe session does not match the approved appointment. Payment review required.',
        });
      }

      if (existing.status === 'open') {
        if (
          existing.payment_status === 'unpaid' &&
          !existing.payment_intent &&
          isValidBalanceCheckoutUrl(existing.url) &&
          safeExistingExpiration(
            existing,
            deadline
          )
        ) {
          return res.status(200).json({
            success: true,
            reused: true,
            appointmentId,
            depositAmount: depositCents / 100,
            checkoutUrl: existing.url,
          });
        }

        return res.status(409).json({
          success: false,
          error:
            'Existing checkout expiration or payment state requires review. Do not send this payment link.',
        });
      }

      /* =====================================
         CLEAR ONLY VERIFIED EXPIRED,
         UNPAID SESSIONS

         Do not clear completed sessions
         without payment reconciliation.
      ===================================== */

      if (!safelyExpiredUnpaid(existing)) {
        return res.status(409).json({
          success: false,
          error:
            'Existing Stripe checkout requires payment review.',
        });
      }

      const cleared = await sql`
        UPDATE public.appointment_requests
        SET
          stripe_checkout_session_id = NULL,
          updated_at = NOW()
        WHERE id = ${appointmentId}::uuid
          AND status = 'awaiting_deposit'
          AND deposit_paid_at IS NULL
          AND stripe_payment_intent_id IS NULL
          AND stripe_checkout_session_id =
            ${appointment.stripe_checkout_session_id}
          AND deposit_checkout_claim_id IS NULL
          AND deposit_checkout_claim_expires_at IS NULL
          AND deposit_expires_at IS NOT NULL
          AND deposit_expires_at > NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM public.salon_stripe_payment_events e
            WHERE e.appointment_id =
              ${appointmentId}::uuid
              AND e.processing_status =
                'needs_review'
          )
        RETURNING id
      `;

      if (!cleared.length) {
        return res.status(409).json({
          success: false,
          error:
            'Checkout state changed or payment review is required.',
        });
      }
    }

    /* =====================================
       CHECK TIME REMAINING
    ===================================== */

    if (checkoutExpiration(deadline) === null) {
      return res.status(409).json({
        success: false,
        error:
          'The deposit deadline is too close to create a new Stripe Checkout Session.',
      });
    }

    /* =====================================
       ATOMICALLY RESERVE CHECKOUT

       Only a NULL claim is available.

       An expired non-NULL claim remains
       a reconciliation hold.
    ===================================== */

    const claimId = randomUUID();

    const claimed = await sql`
      UPDATE public.appointment_requests
      SET
        deposit_checkout_claim_id =
          ${claimId}::uuid,
        deposit_checkout_claim_expires_at =
          NOW() + (
            ${CLAIM_SECONDS} *
            INTERVAL '1 second'
          ),
        updated_at = NOW()
      WHERE id = ${appointmentId}::uuid
        AND status = 'awaiting_deposit'
        AND deposit_paid_at IS NULL
        AND stripe_payment_intent_id IS NULL
        AND stripe_checkout_session_id IS NULL
        AND deposit_checkout_claim_id IS NULL
          AND deposit_checkout_claim_expires_at IS NULL
        AND deposit_expires_at IS NOT NULL
        AND deposit_expires_at >
          NOW() + (
            ${MIN_CHECKOUT_SECONDS} *
            INTERVAL '1 second'
          )
        AND deposit_amount =
          ${depositCents / 100}
        AND total_price =
          ${totalCents / 100}
        AND NOT EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events e
          WHERE e.appointment_id =
            ${appointmentId}::uuid
            AND e.processing_status =
              'needs_review'
        )
      RETURNING
        id,
        customer_email,
        deposit_amount,
        total_price,
        deposit_expires_at
    `;

    if (!claimed.length) {
      return res.status(409).json({
        success: false,
        error:
          'Checkout is already reserved, payment review is required, or the deadline is too close.',
      });
    }

    /* =====================================
       CREATE STRIPE CHECKOUT

       Once the Stripe POST is attempted,
       a failure or timeout is ambiguous.

       Retain the claim unless a known
       session is verified expired/unpaid.
    ===================================== */

    let createdSession: StripeSession | null = null;
    let stripeCreationAttempted = false;

    try {
      const claimedAppointment =
        claimed[0] as ClaimedAppointment;

      if (
        cents(claimedAppointment.deposit_amount) !==
          depositCents ||
        cents(claimedAppointment.total_price) !==
          totalCents
      ) {
        throw new Error(
          'Approved amounts changed during checkout.'
        );
      }

      const claimedDeadline = deadlineSeconds(
        claimedAppointment.deposit_expires_at
      );

      const expiresAt = checkoutExpiration(
        claimedDeadline
      );

      if (expiresAt === null) {
        throw new Error(
          'Deposit deadline is too close for Stripe Checkout.'
        );
      }

      const siteUrl =
        balanceAppUrl();

      const params = new URLSearchParams({
        mode: 'payment',

        'payment_method_types[0]': 'card',

        success_url:
          `${siteUrl}/booking-confirmation` +
          '?deposit=success&session_id={CHECKOUT_SESSION_ID}',

        cancel_url: `${siteUrl}/book`,

        customer_email:
          String(claimedAppointment.customer_email),

        'line_items[0][price_data][currency]':
          'usd',

        'line_items[0][price_data][product_data][name]':
          'InLoveNailz Appointment Deposit',

        'line_items[0][price_data][unit_amount]':
          String(depositCents),

        'line_items[0][quantity]': '1',

        'metadata[payment_type]':
          'neon_appointment_deposit',

        'metadata[appointment_id]':
          appointmentId,

        expires_at: String(expiresAt),
      });

      stripeCreationAttempted = true;

      createdSession = await stripeRequest(
        stripeKey,
        '/checkout/sessions',
        'POST',
        params,
        `inl-deposit-${claimId}`
      );

      if (
        !createdSession.id ||
        !/^cs_live_[A-Za-z0-9]+$/.test(createdSession.id) ||
        createdSession.livemode !== true ||
        !isValidBalanceCheckoutUrl(createdSession.url) ||
        createdSession.mode !== 'payment' ||
        createdSession.status !== 'open' ||
        createdSession.payment_status !== 'unpaid' ||
        createdSession.payment_intent ||
        createdSession.amount_total !==
          depositCents ||
        createdSession.currency !== 'usd' ||
        createdSession.expires_at !== expiresAt ||
        createdSession.metadata?.appointment_id !==
          appointmentId ||
        createdSession.metadata?.payment_type !==
          'neon_appointment_deposit'
      ) {
        throw new Error(
          'Stripe returned an unexpected Checkout Session.'
        );
      }

      /* =====================================
         ATTACH SESSION ATOMICALLY

         The claim must still belong to
         this request and be unexpired.

         Never attach after the deposit
         deadline or after a payment
         exception has been recorded.
      ===================================== */

      const attached = await sql`
        UPDATE public.appointment_requests
        SET
          stripe_checkout_session_id =
            ${createdSession.id},
          deposit_checkout_claim_id = NULL,
          deposit_checkout_claim_expires_at = NULL,
          updated_at = NOW()
        WHERE id = ${appointmentId}::uuid
          AND status = 'awaiting_deposit'
          AND deposit_paid_at IS NULL
          AND stripe_payment_intent_id IS NULL
          AND stripe_checkout_session_id IS NULL
          AND deposit_checkout_claim_id =
            ${claimId}::uuid
          AND deposit_checkout_claim_expires_at >
            NOW()
          AND deposit_amount =
            ${depositCents / 100}
          AND total_price =
            ${totalCents / 100}
          AND deposit_expires_at IS NOT NULL
          AND deposit_expires_at > NOW()
          AND deposit_expires_at >=
            to_timestamp(${expiresAt})
          AND NOT EXISTS (
            SELECT 1
            FROM public.salon_stripe_payment_events e
            WHERE e.appointment_id =
              ${appointmentId}::uuid
              AND e.processing_status =
                'needs_review'
          )
        RETURNING id
      `;

      if (!attached.length) {
        throw new Error(
          'Appointment changed during Checkout creation.'
        );
      }

      return res.status(200).json({
        success: true,
        reused: false,
        appointmentId,
        depositAmount: depositCents / 100,
        checkoutUrl: createdSession.url,
        message:
          'Deposit checkout created. Payment is collected only when the customer completes Stripe Checkout.',
      });
    } catch (error) {
      /* =====================================
         SAFE CLAIM CLEANUP

         Before Stripe creation:
           No Checkout was requested.
           Our claim can be released.

         After Stripe creation:
           Retain the claim by default.

         If a known Stripe Session exists:
           Attempt expiration, retrieve it,
           and clear the claim ONLY after
           verified expired/unpaid state.

         A timeout, API error, or unknown
         session ID is NOT safe cleanup.
      ===================================== */

      let safeToReleaseClaim =
        !stripeCreationAttempted;

      if (
        stripeCreationAttempted &&
        createdSession?.id &&
        /^cs_live_[A-Za-z0-9]+$/.test(createdSession.id)
      ) {
        try {
          const sessionPath =
            `/checkout/sessions/${encodeURIComponent(
              createdSession.id
            )}`;

          let latest = await stripeRequest(
            stripeKey,
            sessionPath,
            'GET'
          );

          if (
            latest.id === createdSession.id &&
            latest.livemode === true &&
            latest.mode === 'payment' &&
            latest.metadata?.appointment_id === appointmentId &&
            latest.metadata?.payment_type === 'neon_appointment_deposit' &&
            latest.amount_total === depositCents &&
            latest.currency === 'usd' &&
            latest.status === 'open' &&
            latest.payment_status === 'unpaid' &&
            !latest.payment_intent
          ) {
            await stripeRequest(
              stripeKey,
              `${sessionPath}/expire`,
              'POST'
            );

            latest = await stripeRequest(
              stripeKey,
              sessionPath,
              'GET'
            );
          }

          if (
            latest.id === createdSession.id &&
            latest.mode === 'payment' &&
            latest.metadata?.appointment_id ===
              appointmentId &&
            latest.metadata?.payment_type ===
              'neon_appointment_deposit' &&
            latest.amount_total === depositCents &&
            latest.currency === 'usd' &&
            safelyExpiredUnpaid(latest)
          ) {
            safeToReleaseClaim = true;
          }
        } catch (expireError) {
          console.error(
            'Stripe Checkout requires reconciliation:',
            createdSession.id,
            expireError instanceof Error ? expireError.name : 'Unknown error'
          );
        }
      }

      if (safeToReleaseClaim) {
        try {
          await sql`
            UPDATE public.appointment_requests
            SET
              deposit_checkout_claim_id = NULL,
              deposit_checkout_claim_expires_at = NULL,
              updated_at = NOW()
            WHERE id = ${appointmentId}::uuid
              AND deposit_checkout_claim_id =
                ${claimId}::uuid
              AND stripe_checkout_session_id IS NULL
              AND status = 'awaiting_deposit'
              AND deposit_paid_at IS NULL
              AND stripe_payment_intent_id IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM public.salon_stripe_payment_events e
                WHERE e.appointment_id =
                  ${appointmentId}::uuid
                  AND e.processing_status =
                    'needs_review'
              )
          `;
        } catch (cleanupError) {
          console.error(
            'Safe Checkout claim cleanup failed:',
            appointmentId,
            cleanupError instanceof Error ? cleanupError.name : 'Unknown error'
          );
        }
      } else {
        console.error(
          'Checkout claim retained for payment reconciliation:',
          {
            appointmentId,
            claimId,
            stripeSessionId:
              createdSession?.id || null,
          }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      'Admin deposit checkout error:',
      error instanceof Error ? error.name : 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to create checkout. Review the appointment before retrying.',
    });
  }
}
