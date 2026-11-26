
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

import {
  balanceAmountToCents,
  isPayableBalanceAmount,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   ADMIN APPOINTMENTS API

   - Administrator access only
   - Reads appointments from Neon
   - Returns customer and booking details
   - Preserves existing appointment fields
   - Returns original deposit payments
   - Returns remaining balance payments
   - Calculates total collected
   - Calculates outstanding balance
   - Separates booking and payment status
   - Detects inconsistent payment records
   - Detects unresolved payment exceptions
   - Identifies balance checkout activity
   - Identifies refund review requirements
   - No appointment modifications
   - No payment processing
   - No automatic refunds
========================================= */

type AppointmentRow = {
  id: string;

  customer_name: string;
  customer_email: string;
  customer_phone: string;

  appointment_date: string;
  appointment_time: string;

  services: unknown;

  total_price: string | number;
  duration_minutes: number | null;

  notes: string | null;
  inspiration_url: string | null;

  status: string;

  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  deposit_expires_at: string | null;

  stripe_checkout_session_id:
    string | null;

  stripe_payment_intent_id:
    string | null;

  deposit_checkout_claim_id:
    string | null;

  deposit_checkout_claim_expires_at:
    string | null;

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

  confirmed_at: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;

  starts_at: string | null;
  ends_at: string | null;
};

type PaymentState =
  | 'unpaid'
  | 'partially_paid'
  | 'paid_in_full'
  | 'needs_review';

type PaymentSummary = {
  totalPrice: number;

  depositAmount: number | null;
  depositPaid: number;

  balancePaid: number;
  balancePaidAmount: number;

  totalPaid: number;
  balanceDue: number;

  hasPaidDeposit: boolean;
  hasPaidBalance: boolean;

  isPaidInFull: boolean;

  paymentStatus: PaymentState;
  paymentState: PaymentState;

  paymentNeedsReview: boolean;
  paymentReviewReason: string | null;

  hasDepositCheckoutSession: boolean;
  hasBalanceCheckoutSession: boolean;

  depositCheckoutInProgress: boolean;
  balanceCheckoutInProgress: boolean;

  canPayBalanceOnline: boolean;

  refundRequiredReview: boolean;
};

/* =====================================
   SAFE CURRENCY CONVERSION

   Use integer cents for calculations.

   Invalid amounts are not silently
   accepted as verified payments.
===================================== */

function safeAmountToCents(
  value: unknown
): number | null {
  try {
    return balanceAmountToCents(
      value
    );
  } catch {
    return null;
  }
}

/* =====================================
   BUILD APPOINTMENT PAYMENT SUMMARY

   Neon remains the source of truth
   for recorded appointment payments.

   A stored Checkout Session does not
   prove that a payment was completed.
===================================== */

function buildPaymentSummary(
  row: AppointmentRow
): PaymentSummary {
  const totalCents =
    safeAmountToCents(
      row.total_price
    );

  const depositCents =
    row.deposit_amount === null
      ? null
      : safeAmountToCents(
          row.deposit_amount
        );

  const balancePaidCents =
    safeAmountToCents(
      row.balance_paid_amount
    );

  const reviewReasons: string[] = [];

  /* =====================================
     VALIDATE APPOINTMENT AMOUNTS
  ===================================== */

  if (
    totalCents === null ||
    totalCents <= 0
  ) {
    reviewReasons.push(
      'Invalid appointment service total.'
    );
  }

  if (
    row.deposit_amount !== null &&
    (
      depositCents === null ||
      depositCents <= 0
    )
  ) {
    reviewReasons.push(
      'Invalid deposit amount.'
    );
  }

  if (
    totalCents !== null &&
    depositCents !== null &&
    depositCents > totalCents
  ) {
    reviewReasons.push(
      'Deposit exceeds the appointment total.'
    );
  }

  if (balancePaidCents === null) {
    reviewReasons.push(
      'Invalid recorded balance payment amount.'
    );
  }

  /* =====================================
     CHECK ORIGINAL DEPOSIT RECORDS
  ===================================== */

  const hasDepositPaidAt =
    row.deposit_paid_at !== null;

  const hasDepositPaymentIntent =
    row.stripe_payment_intent_id !==
    null;

  const hasDepositPaymentEvidence =
    hasDepositPaidAt ||
    hasDepositPaymentIntent;

  const hasDepositCheckoutSession =
    isValidBalanceSessionId(
      row.stripe_checkout_session_id
    );

  const validDepositPaymentIntent =
    isValidBalancePaymentIntentId(
      row.stripe_payment_intent_id
    );

  const hasPaidDeposit =
    hasDepositPaidAt &&

    hasDepositCheckoutSession &&

    validDepositPaymentIntent &&

    depositCents !== null &&

    depositCents > 0 &&

    totalCents !== null &&

    depositCents <= totalCents;

  if (
    hasDepositPaymentEvidence &&
    !hasPaidDeposit
  ) {
    reviewReasons.push(
      'Deposit payment records are incomplete or inconsistent.'
    );
  }

  if (
    row.status === 'confirmed' &&
    !hasPaidDeposit
  ) {
    reviewReasons.push(
      'Confirmed appointment is missing a valid deposit payment record.'
    );
  }

  if (
    row.status === 'awaiting_deposit' &&
    hasDepositPaymentEvidence
  ) {
    reviewReasons.push(
      'Payment activity exists on an awaiting-deposit appointment.'
    );
  }

  if (
    row.stripe_checkout_session_id !==
      null &&

    !hasDepositCheckoutSession
  ) {
    reviewReasons.push(
      'Invalid stored deposit Checkout Session.'
    );
  }

  /* =====================================
     CHECK REMAINING BALANCE RECORDS
  ===================================== */

  const hasBalancePaidAt =
    row.balance_paid_at !== null;

  const hasBalancePaymentIntent =
    row.balance_stripe_payment_intent_id !==
    null;

  const hasBalancePaymentEvidence =
    hasBalancePaidAt ||

    hasBalancePaymentIntent ||

    (
      balancePaidCents !== null &&
      balancePaidCents > 0
    );

  const hasBalanceCheckoutSession =
    isValidBalanceSessionId(
      row.balance_stripe_checkout_session_id
    );

  const validBalancePaymentIntent =
    isValidBalancePaymentIntentId(
      row.balance_stripe_payment_intent_id
    );

  const expectedBalanceCents =
    totalCents !== null &&
    depositCents !== null
      ? totalCents - depositCents
      : null;

  const hasPaidBalance =
    hasPaidDeposit &&

    hasBalancePaidAt &&

    hasBalanceCheckoutSession &&

    validBalancePaymentIntent &&

    balancePaidCents !== null &&

    balancePaidCents > 0 &&

    expectedBalanceCents !== null &&

    balancePaidCents ===
      expectedBalanceCents &&

    row.balance_stripe_checkout_session_id !==
      row.stripe_checkout_session_id &&

    row.balance_stripe_payment_intent_id !==
      row.stripe_payment_intent_id;

  if (
    hasBalancePaymentEvidence &&
    !hasPaidBalance
  ) {
    reviewReasons.push(
      'Remaining balance payment records are incomplete or inconsistent.'
    );
  }

  if (
    row.balance_stripe_checkout_session_id !==
      null &&

    !hasBalanceCheckoutSession
  ) {
    reviewReasons.push(
      'Invalid stored balance Checkout Session.'
    );
  }

  if (
    row.balance_stripe_checkout_session_id !==
      null &&

    row.balance_stripe_checkout_session_id ===
      row.stripe_checkout_session_id
  ) {
    reviewReasons.push(
      'Deposit and balance Checkout Sessions must be different.'
    );
  }

  if (
    row.balance_stripe_payment_intent_id !==
      null &&

    row.balance_stripe_payment_intent_id ===
      row.stripe_payment_intent_id
  ) {
    reviewReasons.push(
      'Deposit and balance PaymentIntents must be different.'
    );
  }

  if (
    row.balance_stripe_checkout_session_id !==
      null &&

    !hasPaidDeposit
  ) {
    reviewReasons.push(
      'Balance checkout exists without a valid deposit payment record.'
    );
  }

  /* =====================================
     CHECK CHECKOUT CLAIMS

     An expired claim is not automatically
     considered safe.

     Stripe may have received a request
     before the application was interrupted.
  ===================================== */

  const depositCheckoutInProgress =
    row.deposit_checkout_claim_id !==
      null ||

    row.deposit_checkout_claim_expires_at !==
      null;

  const balanceCheckoutInProgress =
    row.balance_checkout_claim_id !==
      null ||

    row.balance_checkout_claim_expires_at !==
      null;

  if (depositCheckoutInProgress) {
    const claimExpiresAt =
      row.deposit_checkout_claim_expires_at;

    const expirationTime =
      claimExpiresAt
        ? new Date(
            claimExpiresAt
          ).getTime()
        : NaN;

    if (
      !row.deposit_checkout_claim_id ||

      !Number.isFinite(
        expirationTime
      ) ||

      expirationTime <= Date.now()
    ) {
      reviewReasons.push(
        'Deposit checkout creation requires review.'
      );
    }

    if (hasDepositPaymentEvidence) {
      reviewReasons.push(
        'Deposit payment exists with an unresolved checkout claim.'
      );
    }
  }

  if (balanceCheckoutInProgress) {
    const claimExpiresAt =
      row.balance_checkout_claim_expires_at;

    const expirationTime =
      claimExpiresAt
        ? new Date(
            claimExpiresAt
          ).getTime()
        : NaN;

    if (
      !row.balance_checkout_claim_id ||

      !Number.isFinite(
        expirationTime
      ) ||

      expirationTime <= Date.now()
    ) {
      reviewReasons.push(
        'Balance checkout creation requires review.'
      );
    }

    if (hasBalancePaymentEvidence) {
      reviewReasons.push(
        'Balance payment exists with an unresolved checkout claim.'
      );
    }
  }

  /* =====================================
     CHECK UNRESOLVED WEBHOOK EVENTS
  ===================================== */

  if (row.has_payment_exception) {
    reviewReasons.push(
      'An unresolved Stripe payment event requires manual review.'
    );
  }

  /* =====================================
     CALCULATE RECORDED PAYMENT TOTALS

     Only consistent payment records
     contribute to collected totals.
  ===================================== */

  const recordedDepositCents =
    hasPaidDeposit &&
    depositCents !== null
      ? depositCents
      : 0;

  const recordedBalanceCents =
    hasPaidBalance &&
    balancePaidCents !== null
      ? balancePaidCents
      : 0;

  const totalPaidCents =
    recordedDepositCents +
    recordedBalanceCents;

  const safeTotalCents =
    totalCents ?? 0;

  if (
    !Number.isSafeInteger(
      totalPaidCents
    ) ||

    totalPaidCents >
      safeTotalCents
  ) {
    reviewReasons.push(
      'Recorded payments exceed the appointment total or are invalid.'
    );
  }

  const balanceDueCents =
    Math.max(
      0,
      safeTotalCents -
        totalPaidCents
    );

  /* =====================================
     CHECK APPOINTMENT PAYMENT STATE
  ===================================== */

  if (
    row.status !== 'confirmed' &&

    row.status !== 'cancelled' &&

    totalPaidCents > 0
  ) {
    reviewReasons.push(
      'Recorded payments require reconciliation with the appointment status.'
    );
  }

  if (
    row.status === 'cancelled' &&
    (
      depositCheckoutInProgress ||
      balanceCheckoutInProgress
    )
  ) {
    reviewReasons.push(
      'Cancelled appointment contains an unresolved checkout claim.'
    );
  }

  const paymentNeedsReview =
    reviewReasons.length > 0;

  const isPaidInFull =
    !paymentNeedsReview &&

    hasPaidDeposit &&

    safeTotalCents > 0 &&

    totalPaidCents ===
      safeTotalCents;

  let paymentState: PaymentState =
    'unpaid';

  if (paymentNeedsReview) {
    paymentState =
      'needs_review';

  } else if (isPaidInFull) {
    paymentState =
      'paid_in_full';

  } else if (totalPaidCents > 0) {
    paymentState =
      'partially_paid';
  }

  /* =====================================
     DETERMINE ONLINE BALANCE ELIGIBILITY

     This is an informational flag only.

     The secure balance checkout endpoint
     must independently verify eligibility
     before creating or reusing a session.
  ===================================== */

  const canPayBalanceOnline =
    row.status === 'confirmed' &&

    hasPaidDeposit &&

    !isPaidInFull &&

    !paymentNeedsReview &&

    !depositCheckoutInProgress &&

    !balanceCheckoutInProgress &&

    isPayableBalanceAmount(
      balanceDueCents
    );

  /* =====================================
     REFUND REVIEW

     Preserve historical payments on
     cancelled appointments.

     Never calculate or issue an
     automatic refund.
  ===================================== */

  const refundRequiredReview =
    row.status === 'cancelled' &&

    (
      hasDepositPaymentEvidence ||

      hasBalancePaymentEvidence ||

      row.has_payment_exception
    );

  /* =====================================
     RETURN PAYMENT SUMMARY
  ===================================== */

  return {
    totalPrice:
      safeTotalCents / 100,

    depositAmount:
      depositCents === null
        ? null
        : depositCents / 100,

    depositPaid:
      recordedDepositCents / 100,

    balancePaid:
      recordedBalanceCents / 100,

    balancePaidAmount:
      recordedBalanceCents / 100,

    totalPaid:
      totalPaidCents / 100,

    balanceDue:
      balanceDueCents / 100,

    hasPaidDeposit,

    hasPaidBalance,

    isPaidInFull,

    paymentStatus:
      paymentState,

    paymentState,

    paymentNeedsReview,

    paymentReviewReason:
      paymentNeedsReview
        ? reviewReasons.join(' ')
        : null,

    hasDepositCheckoutSession,

    hasBalanceCheckoutSession,

    depositCheckoutInProgress,

    balanceCheckoutInProgress,

    canPayBalanceOnline,

    refundRequiredReview,
  };
}

/* =====================================
   MAIN API HANDLER
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
    'X-Content-Type-Options',
    'nosniff'
  );

  res.setHeader(
    'Referrer-Policy',
    'no-referrer'
  );

  res.setHeader(
    'X-Robots-Tag',
    'noindex, nofollow, noarchive'
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
        'Method not allowed',
    });
  }

  /* =====================================
     VERIFY ADMIN SESSION
  ===================================== */

  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    /* =====================================
       CONNECT TO NEON
    ===================================== */

    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured'
      );
    }

    const sql =
      neon(databaseUrl);

    /* =====================================
       READ APPOINTMENTS AND PAYMENT RECORDS

       Preserve the original ordering
       and 100-appointment limit.
    ===================================== */

    const result = await sql`
      SELECT
        a.id,

        a.customer_name,
        a.customer_email,
        a.customer_phone,

        a.appointment_date::text
          AS appointment_date,

        a.appointment_time,

        a.services,

        a.total_price,
        a.duration_minutes,

        a.notes,
        a.inspiration_url,

        a.status,

        a.deposit_amount,

        a.deposit_paid_at::text
          AS deposit_paid_at,

        a.deposit_expires_at::text
          AS deposit_expires_at,

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

        ) AS has_payment_exception,

        a.confirmed_at,
        a.reviewed_at,

        a.created_at,
        a.updated_at,

        a.starts_at,
        a.ends_at

      FROM public.appointment_requests AS a

      ORDER BY a.created_at DESC

      LIMIT 100
    `;

    if (!Array.isArray(result)) {
      throw new Error(
        'Unexpected appointment database response'
      );
    }

    const rows =
      result as AppointmentRow[];

    /* =====================================
       FORMAT ADMIN APPOINTMENT RESPONSE

       Preserve existing fields and
       add detailed payment information.

       Do not expose Stripe identifiers,
       checkout claim IDs or signed
       payment links.
    ===================================== */

    const appointments =
      rows.map(row => {
        const payment =
          buildPaymentSummary(
            row
          );

        return {
          id:
            row.id,

          customerName:
            row.customer_name,

          customerEmail:
            row.customer_email,

          customerPhone:
            row.customer_phone,

          appointmentDate:
            row.appointment_date,

          appointmentTime:
            row.appointment_time,

          services:
            row.services,

          totalPrice:
            payment.totalPrice,

          durationMinutes:
            row.duration_minutes,

          notes:
            row.notes,

          inspirationUrl:
            row.inspiration_url,

          status:
            row.status,

          /* ORIGINAL PAYMENT FIELDS */

          depositAmount:
            payment.depositAmount,

          depositPaid:
            payment.depositPaid,

          balanceDue:
            payment.balanceDue,

          depositPaidAt:
            row.deposit_paid_at,

          depositExpiresAt:
            row.deposit_expires_at,

          /* REMAINING BALANCE FIELDS */

          balancePaid:
            payment.balancePaid,

          balancePaidAmount:
            payment.balancePaidAmount,

          balancePaidAt:
            row.balance_paid_at,

          totalPaid:
            payment.totalPaid,

          hasPaidDeposit:
            payment.hasPaidDeposit,

          hasPaidBalance:
            payment.hasPaidBalance,

          isPaidInFull:
            payment.isPaidInFull,

          paymentStatus:
            payment.paymentStatus,

          paymentState:
            payment.paymentState,

          /* PAYMENT REVIEW FIELDS */

          paymentNeedsReview:
            payment.paymentNeedsReview,

          paymentReviewReason:
            payment.paymentReviewReason,

          hasPaymentException:
            row.has_payment_exception,

          /* CHECKOUT ACTIVITY */

          hasDepositCheckoutSession:
            payment.hasDepositCheckoutSession,

          hasBalanceCheckoutSession:
            payment.hasBalanceCheckoutSession,

          depositCheckoutInProgress:
            payment.depositCheckoutInProgress,

          balanceCheckoutInProgress:
            payment.balanceCheckoutInProgress,

          canPayBalanceOnline:
            payment.canPayBalanceOnline,

          refundRequiredReview:
            payment.refundRequiredReview,

          /* ORIGINAL APPOINTMENT FIELDS */

          confirmedAt:
            row.confirmed_at,

          reviewedAt:
            row.reviewed_at,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,

          startsAt:
            row.starts_at,

          endsAt:
            row.ends_at,
        };
      });

    /* =====================================
       RETURN ADMIN APPOINTMENTS
    ===================================== */

    return res.status(200).json({
      success: true,

      appointments,

      count:
        appointments.length,
    });

  } catch (error: unknown) {
    /*
       Avoid logging customer information,
       Stripe payment identifiers or
       sensitive payment links.
    */

    console.error(
      'Admin appointments lookup failed.',

      error instanceof Error
        ? error.name
        : 'UnknownError'
    );

    return res.status(500).json({
      success: false,

      error:
        'Unable to load appointments.',
    });
  }
}
