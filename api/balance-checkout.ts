import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

import {
  BALANCE_PAYMENT_TYPE,
  balanceAppUrl,
  verifyBalancePaymentToken,
  calculateBalancePaymentAmounts,
  isPayableBalanceAmount,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
  isValidBalanceCheckoutUrl,
  retrieveBalanceSession,
  balanceStripeRequest,
  type BalanceStripeSession,
} from './_neon-balance-payment.js';

import { escapeHtml } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE REMAINING BALANCE CHECKOUT

   - Signed appointment authorization
   - Same-origin POST requests
   - Server-calculated payment amounts
   - Confirmed appointment required
   - Valid recorded deposit required
   - Deposit and balance claim protection
   - Existing checkout session reuse
   - Verified expired session replacement
   - Atomic checkout creation claims
   - Stripe idempotency protection
   - Payment snapshot consistency
   - Unresolved payment protection
   - No automatic charges
   - No payment confirmation by redirect
========================================= */

const MAX_REQUEST_BYTES = 4096;
const CHECKOUT_DURATION_SECONDS = 60 * 60;

type Appointment = {
  id: string;
  status: string;
  customer_email: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;
  balance_paid_amount: string | number;
  balance_paid_at: string | null;
  balance_stripe_checkout_session_id: string | null;
  balance_stripe_payment_intent_id: string | null;
  balance_checkout_claim_id: string | null;
  balance_checkout_claim_expires_at: string | null;
  has_payment_exception: boolean;
};

/* =====================================
   SAFE HTML RESPONSE
===================================== */

function respond(
  res: any,
  status: number,
  title: string,
  message: string,
  returnUrl?: string
) {
  res.status(status);

  res.setHeader(
    'Content-Type',
    'text/html; charset=utf-8'
  );

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <meta
    name="robots"
    content="noindex,nofollow,noarchive"
  >

  <meta
    name="referrer"
    content="no-referrer"
  >

  <title>${escapeHtml(title)} | InLoveNailz</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      background: #fff5f8;
      color: #30252b;
      font-family: Arial, Helvetica, sans-serif;
      padding: 24px 16px;
      margin: 0;
      line-height: 1.6;
    }

    main {
      max-width: 540px;
      margin: 32px auto;
      background: #ffffff;
      border: 1px solid #f3dce7;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(80, 20, 50, 0.08);
    }

    header {
      background: #d63384;
      color: #ffffff;
      text-align: center;
      padding: 28px;
      font-size: 24px;
      font-weight: 700;
    }

    section {
      padding: 28px;
    }

    h1 {
      font-size: 24px;
      margin-top: 0;
    }

    a {
      display: block;
      background: #d63384;
      color: #ffffff;
      text-decoration: none;
      text-align: center;
      padding: 14px;
      border-radius: 10px;
      font-weight: 700;
      margin-top: 24px;
    }

    a:hover {
      background: #b82a70;
    }

    a:focus-visible {
      outline: 3px solid #30252b;
      outline-offset: 3px;
    }

    footer {
      text-align: center;
      font-size: 12px;
      color: #75636c;
      padding: 18px;
      border-top: 1px solid #f3dce7;
    }

    @media (max-width: 480px) {
      main {
        margin: 0 auto;
      }

      section {
        padding: 24px 18px;
      }
    }
  </style>
</head>

<body>
  <main>
    <header>
      InLoveNailz by Briana
    </header>

    <section>
      <h1>${escapeHtml(title)}</h1>

      <p role="status">
        ${escapeHtml(message)}
      </p>

      ${
        returnUrl
          ? `
            <a
              href="${escapeHtml(returnUrl)}"
              rel="noreferrer"
            >
              Return to Payment Page
            </a>
          `
          : ''
      }
    </section>

    <footer>
      InLoveNailz by Briana
      &bull;
      Secure Appointment Payments
    </footer>
  </main>
</body>
</html>`);
}

/* =====================================
   VALIDATE CUSTOMER EMAIL
===================================== */

function validEmail(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

/* =====================================
   READ FORM PAYMENT TOKEN

   Supports Vercel-parsed form bodies
   and URL-encoded request bodies.

   Only the signed token is accepted.
   Customer-supplied payment amounts
   are never used.
===================================== */

function readPaymentToken(
  body: unknown
): string | null {
  if (Buffer.isBuffer(body)) {
    if (body.length > MAX_REQUEST_BYTES) {
      return null;
    }

    body = body.toString('utf8');
  }

  if (typeof body === 'string') {
    if (
      Buffer.byteLength(body, 'utf8') >
      MAX_REQUEST_BYTES
    ) {
      return null;
    }

    const params = new URLSearchParams(body);
    const tokens = params.getAll('token');

    let unexpectedField = false;

    params.forEach((_value, key) => {
      if (key !== 'token') {
        unexpectedField = true;
      }
    });

    if (
      tokens.length !== 1 ||
      unexpectedField
    ) {
      return null;
    }

    return tokens[0];
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body)
  ) {
    const record = body as Record<string, unknown>;

    if (
      Object.keys(record).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(
        record,
        'token'
      )
    ) {
      return null;
    }

    if (
      typeof record.token !== 'string' ||
      Buffer.byteLength(record.token, 'utf8') >
        MAX_REQUEST_BYTES
    ) {
      return null;
    }

    return record.token;
  }

  return null;
}

/* =====================================
   VERIFY STRIPE SESSION OWNERSHIP
===================================== */

function isLiveSessionId(value: unknown): value is string {
  return isValidBalanceSessionId(value) && value.startsWith('cs_live_');
}

function validSession(
  session: BalanceStripeSession,
  appointmentId: string,
  sessionId: string,
  amountCents: number
): boolean {
  return (
    session.id === sessionId &&
    isLiveSessionId(sessionId) &&
    session.livemode === true &&
    session.mode === 'payment' &&
    session.currency === 'usd' &&
    session.amount_total === amountCents &&
    session.metadata?.payment_type ===
      BALANCE_PAYMENT_TYPE &&
    session.metadata?.appointment_id ===
      appointmentId
  );
}

/* =====================================
   VERIFY REUSABLE OPEN SESSION

   Sessions with an existing PaymentIntent
   require additional reconciliation.
===================================== */

function reusableSession(
  session: BalanceStripeSession
): boolean {
  return (
    session.livemode === true &&
    isLiveSessionId(session.id) &&
    session.status === 'open' &&
    session.payment_status === 'unpaid' &&
    session.payment_intent === null &&
    typeof session.expires_at === 'number' &&
    Number.isSafeInteger(session.expires_at) &&
    session.expires_at >
      Math.floor(Date.now() / 1000) + 60 &&
    isValidBalanceCheckoutUrl(session.url)
  );
}

/* =====================================
   VERIFY EXPIRED UNPAID SESSION

   Only a confirmed expired, unpaid
   session without a PaymentIntent
   can be automatically replaced.
===================================== */

function safelyExpiredSession(
  session: BalanceStripeSession
): boolean {
  return (
    session.livemode === true &&
    isLiveSessionId(session.id) &&
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    session.payment_intent === null
  );
}

/* =====================================
   REDIRECT TO VERIFIED STRIPE CHECKOUT
===================================== */

function redirectToCheckout(
  res: any,
  checkoutUrl: string
) {
  if (!isValidBalanceCheckoutUrl(checkoutUrl)) {
    throw new Error(
      'Invalid Stripe Checkout URL.'
    );
  }

  res.statusCode = 303;

  res.setHeader(
    'Location',
    checkoutUrl
  );

  return res.end();
}

/* =====================================
   BALANCE CHECKOUT HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader(
    'Cache-Control',
    'no-store, private, max-age=0'
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

  res.setHeader(
    'X-Frame-Options',
    'DENY'
  );

  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; " +
    "style-src 'unsafe-inline'; " +
    "form-action 'none'; " +
    "base-uri 'none'; " +
    "frame-ancestors 'none';"
  );

  let returnUrl: string | undefined;
  let verificationUrl: string | undefined;
  let activeClaimId: string | null = null;

  /* =====================================
     REQUIRE EXPLICIT POST REQUEST
  ===================================== */

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return respond(
      res,
      405,
      'Method not allowed',
      'Please open your original appointment payment link.'
    );
  }

  try {
    /* =====================================
       VERIFY SAME-ORIGIN REQUEST
    ===================================== */

    const websiteUrl = balanceAppUrl();

    if (req.headers?.origin !== websiteUrl) {
      return respond(
        res,
        403,
        'Payment request denied',
        'Please return to your original appointment payment link.'
      );
    }

    const fetchSite =
      req.headers?.['sec-fetch-site'];

    if (
      fetchSite !== undefined &&
      fetchSite !== 'same-origin'
    ) {
      return respond(
        res,
        403,
        'Payment request denied',
        'Please use the payment button on your original appointment payment page.'
      );
    }

    /* =====================================
       VERIFY FORM CONTENT TYPE
    ===================================== */

    const contentType =
      req.headers?.['content-type'];

    if (
      typeof contentType !== 'string' ||
      contentType
        .split(';')[0]
        .trim()
        .toLowerCase() !==
          'application/x-www-form-urlencoded'
    ) {
      return respond(
        res,
        415,
        'Invalid payment request',
        'Please use the payment button on your appointment payment page.'
      );
    }

    /* =====================================
       VERIFY REQUEST SIZE
    ===================================== */

    const contentLength =
      req.headers?.['content-length'];

    if (contentLength !== undefined) {
      if (
        typeof contentLength !== 'string' ||
        !/^\d+$/.test(contentLength) ||
        !Number.isSafeInteger(Number(contentLength)) ||
        Number(contentLength) > MAX_REQUEST_BYTES
      ) {
        return respond(
          res,
          413,
          'Invalid payment request',
          'Please return to your original appointment payment link.'
        );
      }
    }

    /* =====================================
       VERIFY SIGNED PAYMENT TOKEN
    ===================================== */

    const token = readPaymentToken(req.body);

    const appointmentId =
      verifyBalancePaymentToken(token);

    if (!appointmentId || !token) {
      return respond(
        res,
        403,
        'Invalid payment link',
        'This payment link could not be verified. Please contact Briana.'
      );
    }

    const paymentPageUrl = new URL(
      '/api/balance-payment',
      websiteUrl
    );

    paymentPageUrl.searchParams.set(
      'token',
      token
    );

    returnUrl = paymentPageUrl.toString();

    const statusPageUrl = new URL(returnUrl);

    statusPageUrl.searchParams.set(
      'returned',
      '1'
    );

    verificationUrl = statusPageUrl.toString();

    /* =====================================
       VERIFY SERVER CONFIGURATION
    ===================================== */

    const databaseUrl = process.env.DATABASE_URL;
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (
      !databaseUrl ||
      !stripeKey ||
      !/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)
    ) {
      throw new Error(
        'Payment configuration unavailable.'
      );
    }

    const sql = neon(databaseUrl);

    /* =====================================
       READ CURRENT APPOINTMENT

       Retrieve payment information
       and unresolved events together.
    ===================================== */

    const rows = await sql`
      SELECT
        appointment.id,
        appointment.status,
        appointment.customer_email,
        appointment.total_price,
        appointment.deposit_amount,
        appointment.deposit_paid_at::text
          AS deposit_paid_at,
        appointment.stripe_payment_intent_id,
        appointment.stripe_checkout_session_id,
        appointment.deposit_checkout_claim_id,
        appointment.deposit_checkout_claim_expires_at::text
          AS deposit_checkout_claim_expires_at,
        appointment.balance_paid_amount,
        appointment.balance_paid_at::text
          AS balance_paid_at,
        appointment.balance_stripe_checkout_session_id,
        appointment.balance_stripe_payment_intent_id,
        appointment.balance_checkout_claim_id,
        appointment.balance_checkout_claim_expires_at::text
          AS balance_checkout_claim_expires_at,
        EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events
            AS payment_event
          WHERE payment_event.appointment_id =
            appointment.id
            AND payment_event.processing_status =
              'needs_review'
        ) AS has_payment_exception
      FROM public.appointment_requests
        AS appointment
      WHERE appointment.id = ${appointmentId}::uuid
      LIMIT 1
    `;

    if (!rows.length) {
      return respond(
        res,
        404,
        'Appointment unavailable',
        'This appointment could not be located.'
      );
    }

    const appointment = rows[0] as Appointment;

    /* =====================================
       PROTECT CANCELLED APPOINTMENTS
    ===================================== */

    if (appointment.status === 'cancelled') {
      return respond(
        res,
        410,
        'Appointment cancelled',
        'This appointment has been cancelled. No additional payment can be made.',
        returnUrl
      );
    }

    /* =====================================
       VERIFY APPOINTMENT ELIGIBILITY
    ===================================== */

    if (appointment.status !== 'confirmed') {
      return respond(
        res,
        409,
        'Payment unavailable',
        'This appointment is not currently eligible for a remaining balance payment.',
        returnUrl
      );
    }

    /* =====================================
       VALIDATE RECORDED DEPOSIT PAYMENT
    ===================================== */

    if (
      !appointment.deposit_paid_at ||
      !isLiveSessionId(
        appointment.stripe_checkout_session_id
      ) ||
      !isValidBalancePaymentIntentId(
        appointment.stripe_payment_intent_id
      )
    ) {
      return respond(
        res,
        409,
        'Payment under review',
        'Your recorded deposit requires verification. Please contact Briana before making another payment.',
        returnUrl
      );
    }

    /* =====================================
       PROTECT UNRESOLVED PAYMENT ACTIVITY

       Never automatically clear expired
       claims because an earlier Stripe
       request may have succeeded.
    ===================================== */

    const hasDepositCheckoutClaim =
      appointment.deposit_checkout_claim_id !== null ||
      appointment.deposit_checkout_claim_expires_at !== null;

    const hasBalanceCheckoutClaim =
      appointment.balance_checkout_claim_id !== null ||
      appointment.balance_checkout_claim_expires_at !== null;

    if (
      appointment.has_payment_exception !== false ||
      hasDepositCheckoutClaim ||
      hasBalanceCheckoutClaim
    ) {
      return respond(
        res,
        409,
        'Payment under review',
        'Your appointment has payment activity that requires verification. Please contact Briana if this message persists. Do not submit another payment until the payment state has been verified.',
        returnUrl
      );
    }

    /* =====================================
       CALCULATE AUTHORITATIVE BALANCE
    ===================================== */

    const amounts =
      calculateBalancePaymentAmounts(
        appointment.total_price,
        appointment.deposit_amount,
        appointment.balance_paid_amount
      );

    /* =====================================
       PROTECT RECORDED BALANCE PAYMENTS
    ===================================== */

    if (
      appointment.balance_paid_at !== null ||
      appointment.balance_stripe_payment_intent_id !== null ||
      amounts.balancePaidCents !== 0 ||
      amounts.balanceDueCents === 0
    ) {
      return respond(
        res,
        409,
        'Additional payment unavailable',
        'Your appointment already has recorded payment activity or has been paid in full. Return to your payment page to review the current payment status.',
        verificationUrl
      );
    }

    /* =====================================
       VERIFY STRIPE AMOUNT LIMITS
    ===================================== */

    if (
      !isPayableBalanceAmount(
        amounts.balanceDueCents
      )
    ) {
      return respond(
        res,
        409,
        'Online payment unavailable',
        'Please contact Briana to arrange payment of your remaining balance.',
        returnUrl
      );
    }

    /* =====================================
       VERIFY CUSTOMER EMAIL
    ===================================== */

    if (!validEmail(appointment.customer_email)) {
      return respond(
        res,
        409,
        'Payment unavailable',
        'Please contact Briana to verify your appointment information.'
      );
    }

    /* =====================================
       CHECK EXISTING STRIPE SESSION
    ===================================== */

    const existingSessionId =
      appointment.balance_stripe_checkout_session_id;

    if (existingSessionId !== null) {
      if (
        !isLiveSessionId(existingSessionId) ||
        existingSessionId ===
          appointment.stripe_checkout_session_id
      ) {
        return respond(
          res,
          409,
          'Payment under review',
          'The existing payment session requires verification. Please contact Briana.',
          verificationUrl
        );
      }

      const existingSession =
        await retrieveBalanceSession(
          existingSessionId
        );

      if (
        !validSession(
          existingSession,
          appointmentId,
          existingSessionId,
          amounts.balanceDueCents
        )
      ) {
        return respond(
          res,
          409,
          'Payment under review',
          'The existing payment session could not be verified. Please contact Briana.',
          verificationUrl
        );
      }

      /* =====================================
         PROTECT COMPLETED CHECKOUTS

         A completed Stripe session must
         never be replaced just because
         the webhook has not updated Neon.
      ===================================== */

      if (
        existingSession.status === 'complete' ||
        existingSession.payment_status === 'paid'
      ) {
        return respond(
          res,
          409,
          'Payment awaiting verification',
          'Your existing payment session may have completed. Please check your payment status and do not submit another payment.',
          verificationUrl
        );
      }

      /* =====================================
         REUSE EXISTING OPEN CHECKOUT

         Recheck the complete payment
         snapshot before redirecting.
      ===================================== */

      if (reusableSession(existingSession)) {
        const currentRows = await sql`
          SELECT id
          FROM public.appointment_requests
          WHERE id = ${appointmentId}::uuid

            AND status = 'confirmed'

            AND deposit_paid_at =
              ${appointment.deposit_paid_at}::timestamptz

            AND stripe_payment_intent_id =
              ${appointment.stripe_payment_intent_id}

            AND stripe_checkout_session_id =
              ${appointment.stripe_checkout_session_id}

            AND deposit_checkout_claim_id IS NULL

            AND deposit_checkout_claim_expires_at IS NULL

            AND balance_paid_at IS NULL

            AND balance_paid_amount = 0

            AND balance_stripe_payment_intent_id IS NULL

            AND balance_checkout_claim_id IS NULL

            AND balance_checkout_claim_expires_at IS NULL

            AND balance_stripe_checkout_session_id =
              ${existingSessionId}

            AND total_price =
              ${appointment.total_price}::numeric

            AND deposit_amount =
              ${appointment.deposit_amount}::numeric

            AND customer_email =
              ${appointment.customer_email}

            AND NOT EXISTS (
              SELECT 1
              FROM public.salon_stripe_payment_events
              WHERE appointment_id =
                ${appointmentId}::uuid
                AND processing_status =
                  'needs_review'
            )

          LIMIT 1
        `;

        if (!currentRows.length) {
          return respond(
            res,
            409,
            'Payment state changed',
            'Please return to your payment page and review the current appointment balance.',
            returnUrl
          );
        }

        if (!reusableSession(existingSession)) {
          return respond(
            res,
            409,
            'Checkout expiring',
            'Your existing checkout is approaching expiration. Please return to your payment page shortly.',
            returnUrl
          );
        }

        return redirectToCheckout(
          res,
          existingSession.url as string
        );
      }

      /* =====================================
         REPLACE ONLY VERIFIED EXPIRED
         AND UNPAID SESSIONS
      ===================================== */

      if (!safelyExpiredSession(existingSession)) {
        return respond(
          res,
          409,
          'Payment session unavailable',
          'Your existing checkout may be completing, expiring, or awaiting verification. Please contact Briana if this message persists.',
          returnUrl
        );
      }
    }

    /* =====================================
       PREPARE NEW STRIPE CHECKOUT

       Card payments only.
       All amounts originate from Neon.
    ===================================== */

    const claimId = randomUUID();

    const expiresAt =
      Math.floor(Date.now() / 1000) +
      CHECKOUT_DURATION_SECONDS;

    const params = new URLSearchParams({
      mode: 'payment',

      'payment_method_types[0]': 'card',

      customer_email:
        appointment.customer_email,

      success_url:
        verificationUrl,

      cancel_url:
        returnUrl,

      expires_at:
        String(expiresAt),

      client_reference_id:
        appointmentId,

      'line_items[0][price_data][currency]':
        'usd',

      'line_items[0][price_data][product_data][name]':
        'InLoveNailz - Remaining Appointment Balance',

      'line_items[0][price_data][unit_amount]':
        String(amounts.balanceDueCents),

      'line_items[0][quantity]':
        '1',

      'metadata[payment_type]':
        BALANCE_PAYMENT_TYPE,

      'metadata[appointment_id]':
        appointmentId,

      'payment_intent_data[metadata][payment_type]':
        BALANCE_PAYMENT_TYPE,

      'payment_intent_data[metadata][appointment_id]':
        appointmentId,
    });

    /* =====================================
       ATOMICALLY CLAIM CHECKOUT CREATION

       Concurrent requests cannot both
       acquire the same appointment claim.

       Verify the complete payment snapshot
       before allowing Stripe creation.
    ===================================== */

    const claimRows = await sql`
      UPDATE public.appointment_requests

      SET
        balance_checkout_claim_id =
          ${claimId}::uuid,

        balance_checkout_claim_expires_at =
          NOW() + INTERVAL '2 minutes',

        updated_at = NOW()

      WHERE id = ${appointmentId}::uuid

        AND status = 'confirmed'

        AND deposit_paid_at =
          ${appointment.deposit_paid_at}::timestamptz

        AND stripe_payment_intent_id =
          ${appointment.stripe_payment_intent_id}

        AND stripe_checkout_session_id =
          ${appointment.stripe_checkout_session_id}

        AND deposit_checkout_claim_id IS NULL

        AND deposit_checkout_claim_expires_at IS NULL

        AND balance_paid_at IS NULL

        AND balance_paid_amount = 0

        AND balance_stripe_payment_intent_id IS NULL

        AND balance_checkout_claim_id IS NULL

        AND balance_checkout_claim_expires_at IS NULL

        AND balance_stripe_checkout_session_id
          IS NOT DISTINCT FROM
          ${existingSessionId}

        AND total_price =
          ${appointment.total_price}::numeric

        AND deposit_amount =
          ${appointment.deposit_amount}::numeric

        AND customer_email =
          ${appointment.customer_email}

        AND NOT EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events
          WHERE appointment_id =
            ${appointmentId}::uuid
            AND processing_status =
              'needs_review'
        )

      RETURNING id
    `;

    if (!claimRows.length) {
      return respond(
        res,
        409,
        'Checkout state changed',
        'Another payment request may be in progress or your appointment information may have changed. Please return to your payment page shortly.',
        returnUrl
      );
    }

    activeClaimId = claimId;

    /* =====================================
       CREATE STRIPE CHECKOUT SESSION

       A failed or uncertain request must
       not release the claim automatically.
    ===================================== */

    const session =
      await balanceStripeRequest<BalanceStripeSession>(
        '/checkout/sessions',
        {
          method: 'POST',
          body: params,
          idempotencyKey:
            `inl-balance-${claimId}`,
        }
      );

    /* =====================================
       VERIFY NEW STRIPE SESSION
    ===================================== */

    if (
      !isLiveSessionId(session.id) ||

      session.id ===
        appointment.stripe_checkout_session_id ||

      session.id === existingSessionId ||

      !validSession(
        session,
        appointmentId,
        session.id,
        amounts.balanceDueCents
      ) ||

      !reusableSession(session) ||

      session.expires_at !== expiresAt
    ) {
      throw new Error(
        'Created balance checkout requires verification.'
      );
    }

    const checkoutUrl = session.url;

    if (!isValidBalanceCheckoutUrl(checkoutUrl)) {
      throw new Error(
        'Created balance checkout URL is invalid.'
      );
    }

    /* =====================================
       ATTACH VERIFIED STRIPE SESSION

       Never expose the Checkout URL until
       Neon successfully records the session.

       Only the owner of the active claim
       may attach the session.

       The deposit record, payment amounts,
       customer email and appointment status
       must still match the original snapshot.
    ===================================== */

    const attachedRows = await sql`
      UPDATE public.appointment_requests

      SET
        balance_stripe_checkout_session_id =
          ${session.id},

        balance_checkout_claim_id = NULL,

        balance_checkout_claim_expires_at = NULL,

        updated_at = NOW()

      WHERE id = ${appointmentId}::uuid

        AND status = 'confirmed'

        AND deposit_paid_at =
          ${appointment.deposit_paid_at}::timestamptz

        AND stripe_payment_intent_id =
          ${appointment.stripe_payment_intent_id}

        AND stripe_checkout_session_id =
          ${appointment.stripe_checkout_session_id}

        AND deposit_checkout_claim_id IS NULL

        AND deposit_checkout_claim_expires_at IS NULL

        AND balance_paid_at IS NULL

        AND balance_paid_amount = 0

        AND balance_stripe_payment_intent_id IS NULL

        AND balance_checkout_claim_id =
          ${claimId}::uuid

        AND balance_checkout_claim_expires_at > NOW()

        AND balance_stripe_checkout_session_id
          IS NOT DISTINCT FROM
          ${existingSessionId}

        AND total_price =
          ${appointment.total_price}::numeric

        AND deposit_amount =
          ${appointment.deposit_amount}::numeric

        AND customer_email =
          ${appointment.customer_email}

        AND NOT EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events
          WHERE appointment_id =
            ${appointmentId}::uuid
            AND processing_status =
              'needs_review'
        )

      RETURNING id
    `;

    if (!attachedRows.length) {
      /*
        Do not expose the Checkout URL.

        Preserve the claim for manual
        Stripe reconciliation.

        Never log signed payment tokens
        or customer checkout URLs.
      */

      console.error(
        'Balance checkout attachment requires review.',
        {
          appointmentId,
          claimId,
          sessionId: session.id,
        }
      );

      return respond(
        res,
        409,
        'Checkout requires verification',
        'Your payment checkout could not be safely completed. Please contact Briana before attempting another payment.',
        verificationUrl
      );
    }

    activeClaimId = null;

    /* =====================================
       REDIRECT TO STRIPE

       Creating a checkout does not record
       a successful payment.

       Only the verified Stripe webhook
       may confirm the balance payment.
    ===================================== */

    return redirectToCheckout(
      res,
      checkoutUrl
    );

  } catch (error: unknown) {
    console.error(
      'Balance checkout request failed.',
      {
        errorType:
          error instanceof Error
            ? error.name
            : 'Unknown error',

        claimId:
          activeClaimId,
      }
    );

    /*
      Do not automatically clear uncertain
      checkout claims.

      Stripe may have created a session
      even if the request timed out.
    */

    return respond(
      res,
      503,
      'Checkout temporarily unavailable',
      activeClaimId
        ? 'Your checkout requires verification. Please contact Briana before attempting another payment.'
        : 'We could not prepare your payment checkout at this time. If you have already submitted a payment, please do not pay again until its status has been verified.',
      activeClaimId
        ? verificationUrl
        : returnUrl
    );
  }
}