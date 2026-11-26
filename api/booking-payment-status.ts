
import { neon } from '@neondatabase/serverless';

import {
  BALANCE_PAYMENT_TYPE,
  calculateBalancePaymentAmounts,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
  retrieveBalanceSession,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   BOOKING PAYMENT STATUS

   - Read-only customer-facing endpoint
   - Verifies deposit Checkout Session
   - Confirms session belongs to Neon booking
   - Uses Neon as the source of truth
   - Recognizes remaining balance payments
   - Verifies recorded balance sessions
   - Supports partially paid appointments
   - Supports fully paid appointments
   - Preserves existing frontend compatibility
   - Protects cancelled appointments
   - Detects unresolved payment exceptions
   - Returns limited, non-sensitive data
   - Never marks an appointment paid
   - Never creates a Checkout Session
   - Never sends payment emails
========================================= */

const SESSION_ID_PATTERN =
  /^cs_live_[A-Za-z0-9]+$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STRIPE_TIMEOUT_MS = 8000;

type StripeSession = {
  livemode?: boolean;
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
};

type AppointmentRow = {
  id: string;
  status: string;

  total_price: string | number;

  deposit_amount: string | number | null;
  deposit_paid_at: string | null;

  stripe_checkout_session_id:
    string | null;

  stripe_payment_intent_id:
    string | null;

  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;

  balance_paid_amount:
    string | number;

  balance_paid_at:
    string | null;

  balance_stripe_checkout_session_id:
    string | null;

  balance_stripe_payment_intent_id:
    string | null;

  balance_checkout_claim_id:
    string | null;

  balance_checkout_claim_expires_at:
    string | null;

  has_payment_exception:
    boolean;
};

type PaymentState =
  | 'pending'
  | 'partially_paid'
  | 'paid_in_full'
  | 'cancelled';

/* =====================================
   RETRIEVE ORIGINAL DEPOSIT SESSION
===================================== */

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

      redirect: 'error',

      signal: AbortSignal.timeout(
        STRIPE_TIMEOUT_MS
      ),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'SESSION_NOT_FOUND'
      );
    }

    throw new Error(
      `Stripe status lookup failed: HTTP ${response.status}`
    );
  }

  return (
    await response.json()
  ) as StripeSession;
}

/* =====================================
   PAYMENT REVIEW RESPONSE

   Never present uncertain payment
   records as verified payments.
===================================== */

function paymentReviewResponse(
  res: any
) {
  return res.status(409).json({
    success: false,

    paymentStatus: 'needs_review',

    error:
      'Payment details require review. Please contact the salon.',
  });
}

/* =====================================
   VERIFY RECORDED BALANCE SESSION

   Neon records the payment only after
   the verified Stripe webhook completes.

   This additional read-only check
   confirms that the recorded balance
   belongs to the correct Stripe session.
===================================== */

async function verifyRecordedBalanceSession(
  appointment: AppointmentRow,
  expectedAmountCents: number
): Promise<boolean> {
  const sessionId =
    appointment.balance_stripe_checkout_session_id;

  const paymentIntentId =
    appointment.balance_stripe_payment_intent_id;

  if (
    !isValidBalanceSessionId(
      sessionId
    ) ||

    !SESSION_ID_PATTERN.test(sessionId) ||

    !isValidBalancePaymentIntentId(
      paymentIntentId
    ) ||

    sessionId ===
      appointment.stripe_checkout_session_id ||

    paymentIntentId ===
      appointment.stripe_payment_intent_id ||

    !Number.isSafeInteger(
      expectedAmountCents
    ) ||

    expectedAmountCents < 50
  ) {
    return false;
  }

  const session =
    await retrieveBalanceSession(
      sessionId
    );

  return (
    session.livemode === true &&

    session.id === sessionId &&

    session.mode === 'payment' &&

    session.status === 'complete' &&

    session.payment_status === 'paid' &&

    session.currency === 'usd' &&

    session.amount_total ===
      expectedAmountCents &&

    session.payment_intent ===
      paymentIntentId &&

    session.metadata?.payment_type ===
      BALANCE_PAYMENT_TYPE &&

    session.metadata?.appointment_id ===
      appointment.id
  );
}

/* =====================================
   CUSTOMER PAYMENT STATUS HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader(
    'Cache-Control',
    'no-store, private'
  );

  res.setHeader(
    'Referrer-Policy',
    'no-referrer'
  );

  res.setHeader(
    'X-Robots-Tag',
    'noindex, nofollow, noarchive'
  );

  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );

  /* =====================================
     ONLY ACCEPT GET REQUESTS
  ===================================== */

  if (req.method !== 'GET') {
    res.setHeader(
      'Allow',
      'GET'
    );

    return res.status(405).json({
      success: false,

      error:
        'Method not allowed.',
    });
  }

  /* =====================================
     VALIDATE CHECKOUT SESSION ID
  ===================================== */

  const sessionId =
    req.query?.session_id;

  if (
    typeof sessionId !== 'string' ||

    !SESSION_ID_PATTERN.test(
      sessionId
    )
  ) {
    return res.status(400).json({
      success: false,

      error:
        'Valid checkout session required.',
    });
  }

  /* =====================================
     VERIFY SERVER CONFIGURATION
  ===================================== */

  const databaseUrl =
    process.env.DATABASE_URL;

  const stripeKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (
    !databaseUrl ||
    !stripeKey ||
    !/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)
  ) {
    return res.status(503).json({
      success: false,

      error:
        'Payment verification is unavailable.',
    });
  }

  try {
    /* =====================================
       RETRIEVE ORIGINAL DEPOSIT SESSION
    ===================================== */

    const session =
      await retrieveStripeSession(
        sessionId,
        stripeKey
      );

    const appointmentId =
      session.metadata?.appointment_id;

    /* =====================================
       VERIFY SESSION OWNERSHIP
    ===================================== */

    if (
      session.livemode !== true ||

      session.id !== sessionId ||

      session.mode !== 'payment' ||

      session.currency !== 'usd' ||

      session.metadata?.payment_type !==
        'neon_appointment_deposit' ||

      typeof appointmentId !== 'string' ||

      !UUID_PATTERN.test(
        appointmentId
      )
    ) {
      return res.status(404).json({
        success: false,

        error:
          'Booking payment not found.',
      });
    }

    /* =====================================
       READ CURRENT NEON PAYMENT RECORD
    ===================================== */

    const sql =
      neon(databaseUrl);

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

            AND e.processing_status =
              'needs_review'

        ) AS has_payment_exception

      FROM public.appointment_requests AS a

      WHERE a.id =
        ${appointmentId}::uuid

        AND a.stripe_checkout_session_id =
          ${sessionId}

      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({
        success: false,

        error:
          'Booking payment not found.',
      });
    }

    const appointment =
      rows[0] as AppointmentRow;

    /* =====================================
       VALIDATE PAYMENT AMOUNTS
    ===================================== */

    let amounts: ReturnType<
      typeof calculateBalancePaymentAmounts
    >;

    try {
      amounts =
        calculateBalancePaymentAmounts(
          appointment.total_price,

          appointment.deposit_amount,

          appointment.balance_paid_amount
        );
    } catch {
      return paymentReviewResponse(
        res
      );
    }

    const {
      totalCents,
      depositCents,
      balancePaidCents,
      balanceDueCents,
    } = amounts;

    if (
      session.amount_total !==
        depositCents
    ) {
      return paymentReviewResponse(
        res
      );
    }

    /* =====================================
       PROTECT UNRESOLVED PAYMENT EVENTS
    ===================================== */

    if (
      appointment.has_payment_exception !== false ||
      appointment.deposit_checkout_claim_id !== null ||
      appointment.deposit_checkout_claim_expires_at !== null ||
      (appointment.balance_stripe_checkout_session_id !== null &&
        (!SESSION_ID_PATTERN.test(appointment.balance_stripe_checkout_session_id) ||
          appointment.balance_stripe_checkout_session_id === sessionId))
    ) {
      return paymentReviewResponse(
        res
      );
    }

    /* =====================================
       VERIFY ORIGINAL DEPOSIT PAYMENT
    ===================================== */

    const hasRecordedDeposit =
      appointment.deposit_paid_at !==
      null;

    const hasDepositPaymentIntent =
      appointment.stripe_payment_intent_id !==
      null;

    const stripeDepositPaid =
      session.status === 'complete' &&

      session.payment_status === 'paid';

    /*
       The Stripe session alone does not
       confirm an appointment.

       Neon must contain the verified
       deposit payment record.
    */

    if (
      hasRecordedDeposit !==
        hasDepositPaymentIntent
    ) {
      return paymentReviewResponse(
        res
      );
    }

    if (hasRecordedDeposit) {
      if (
        !stripeDepositPaid ||

        !isValidBalancePaymentIntentId(
          appointment.stripe_payment_intent_id
        ) ||

        session.payment_intent !==
          appointment.stripe_payment_intent_id
      ) {
        return paymentReviewResponse(
          res
        );
      }
    }

    const depositVerified =
      hasRecordedDeposit &&

      stripeDepositPaid;

    /* =====================================
       VERIFY BALANCE PAYMENT RECORDS
    ===================================== */

    const hasBalancePaymentEvidence =
      balancePaidCents > 0 ||

      appointment.balance_paid_at !==
        null ||

      appointment.balance_stripe_payment_intent_id !==
        null;

    let verifiedBalancePaidCents = 0;

    if (hasBalancePaymentEvidence) {
      /*
         A remaining balance payment
         must never exist without a
         verified original deposit.
      */

      if (
        !depositVerified ||

        balancePaidCents <= 0 ||

        balanceDueCents !== 0 ||

        !appointment.balance_paid_at ||

        !isValidBalanceSessionId(
          appointment.balance_stripe_checkout_session_id
        ) ||

        !isValidBalancePaymentIntentId(
          appointment.balance_stripe_payment_intent_id
        ) ||

        appointment.balance_checkout_claim_id !==
          null ||

        appointment.balance_checkout_claim_expires_at !==
          null
      ) {
        return paymentReviewResponse(
          res
        );
      }

      const expectedBalanceCents =
        totalCents - depositCents;

      if (
        balancePaidCents !==
          expectedBalanceCents
      ) {
        return paymentReviewResponse(
          res
        );
      }

      const balanceVerified =
        await verifyRecordedBalanceSession(
          appointment,

          expectedBalanceCents
        );

      if (!balanceVerified) {
        return paymentReviewResponse(
          res
        );
      }

      verifiedBalancePaidCents =
        balancePaidCents;
    }

    /* =====================================
       CALCULATE VERIFIED PAYMENT TOTALS
    ===================================== */

    const verifiedDepositPaidCents =
      depositVerified
        ? depositCents
        : 0;

    const totalPaidCents =
      verifiedDepositPaidCents +
      verifiedBalancePaidCents;

    const remainingBalanceCents =
      totalCents - totalPaidCents;

    if (
      !Number.isSafeInteger(
        totalPaidCents
      ) ||

      !Number.isSafeInteger(
        remainingBalanceCents
      ) ||

      remainingBalanceCents < 0
    ) {
      return paymentReviewResponse(
        res
      );
    }

    /* =====================================
       DETERMINE APPOINTMENT STATUS
    ===================================== */

    const cancelled =
      appointment.status ===
      'cancelled';

    const confirmed =
      appointment.status ===
        'confirmed' &&

      depositVerified;

    /*
       A confirmed appointment must
       contain a verified deposit.
    */

    if (
      appointment.status ===
        'confirmed' &&

      !depositVerified
    ) {
      return paymentReviewResponse(
        res
      );
    }

    /*
       A recorded payment on an
       awaiting-deposit appointment
       requires reconciliation.
    */

    if (
      !confirmed &&

      !cancelled &&

      totalPaidCents > 0
    ) {
      return paymentReviewResponse(
        res
      );
    }

    /* =====================================
       DETERMINE PAYMENT STATE
    ===================================== */

    const isPaidInFull =
      confirmed &&

      remainingBalanceCents === 0;

    let paymentState: PaymentState =
      'pending';

    if (cancelled) {
      paymentState =
        'cancelled';

    } else if (isPaidInFull) {
      paymentState =
        'paid_in_full';

    } else if (confirmed) {
      paymentState =
        'partially_paid';
    }

    /* =====================================
       CHECK BALANCE CHECKOUT ACTIVITY

       A checkout claim or stored session
       does not prove that payment occurred.

       Never count it as money received.
    ===================================== */

    const balanceCheckoutInProgress =
      confirmed &&

      !isPaidInFull &&

      (
        appointment.balance_checkout_claim_id !==
          null ||

        appointment.balance_checkout_claim_expires_at !==
          null
      );

    const hasBalanceCheckoutSession =
      confirmed &&

      !isPaidInFull &&

      isValidBalanceSessionId(
        appointment.balance_stripe_checkout_session_id
      ) &&
      SESSION_ID_PATTERN.test(appointment.balance_stripe_checkout_session_id);

    /* =====================================
       RETURN CUSTOMER PAYMENT STATUS

       Preserve existing response fields:

       - paymentStatus
       - appointmentStatus
       - totalAmount
       - depositAmount
       - depositPaid
       - balanceDue

       Add detailed payment information
       without exposing customer details
       or Stripe payment identifiers.
    ===================================== */

    return res.status(200).json({
      success: true,

      paymentStatus:
        confirmed
          ? 'confirmed'
          : 'pending',

      appointmentStatus:
        appointment.status,

      paymentState,

      isAppointmentConfirmed:
        confirmed,

      isCancelled:
        cancelled,

      isPaidInFull,

      totalAmount:
        totalCents / 100,

      depositAmount:
        depositCents / 100,

      depositPaid:
        verifiedDepositPaidCents / 100,

      balancePaid:
        verifiedBalancePaidCents / 100,

      totalPaid:
        totalPaidCents / 100,

      balanceDue:
        remainingBalanceCents / 100,

      depositPaymentVerified:
        depositVerified,

      balancePaymentVerified:
        verifiedBalancePaidCents > 0,

      balanceCheckoutInProgress,

      hasBalanceCheckoutSession,

      refundRequiredReview:
        cancelled &&
        totalPaidCents > 0,
    });

  } catch (error: unknown) {
    if (
      error instanceof Error &&

      error.message ===
        'SESSION_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,

        error:
          'Booking payment not found.',
      });
    }

    /*
       Avoid logging payment identifiers,
       customer information or signed
       payment links.
    */

    console.error(
      'Booking payment status verification failed.',

      error instanceof Error
        ? error.name
        : 'UnknownError'
    );

    return res.status(503).json({
      success: false,

      error:
        'Unable to verify payment right now. Please try again shortly.',
    });
  }
}
