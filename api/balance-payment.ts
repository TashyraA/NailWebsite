import { neon } from '@neondatabase/serverless';
import { escapeHtml } from './_email.js';

import {
  balanceAppUrl,
  verifyBalancePaymentToken,
  calculateBalancePaymentAmounts,
  formatBalanceMoney,
  isPayableBalanceAmount,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE CUSTOMER BALANCE PAYMENT PAGE

   - Signed appointment payment links
   - Current Neon payment verification
   - No customer-supplied payment amounts
   - Cancelled appointment protection
   - Fully paid appointment protection
   - Unresolved payment protection
   - Stripe return verification protection
   - Same-origin checkout submission
   - Explicit customer payment action
   - No automatic checkout creation
   - No automatic charges
========================================= */

type Appointment = {
  id: string;
  status: string;
  customer_name: string;
  appointment_date: string;
  appointment_time: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
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
   FORMAT APPOINTMENT DATE
===================================== */

function formatAppointmentDate(
  value: string
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(
    `${value}T12:00:00Z`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date);
}

/* =====================================
   FORMAT APPOINTMENT TIME
===================================== */

function formatAppointmentTime(
  value: string
): string {
  const match = value.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/
  );

  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return value;
  }

  const period =
    hour >= 12 ? 'PM' : 'AM';

  return (
    `${hour % 12 || 12}:` +
    `${String(minute).padStart(2, '0')} ` +
    period
  );
}

/* =====================================
   HTML PAGE TEMPLATE
===================================== */

function page(
  title: string,
  content: string
): string {
  return `<!DOCTYPE html>
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
    content="same-origin"
  >

  <title>${escapeHtml(title)} | InLoveNailz</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px 16px;
      background: #fff5f8;
      color: #30252b;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      width: 100%;
      max-width: 560px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(80, 20, 50, 0.08);
      border: 1px solid #f3dce7;
    }

    .header {
      background: #d63384;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }

    .brand {
      font-size: 26px;
      font-weight: 700;
      margin: 0;
    }

    .brand-subtitle {
      font-size: 15px;
      margin: 4px 0 0;
    }

    .content {
      padding: 30px 24px;
    }

    h1 {
      font-size: 25px;
      line-height: 1.3;
      margin: 0 0 16px;
      color: #30252b;
    }

    p {
      margin: 0 0 16px;
    }

    .details {
      background: #fff5f8;
      border: 1px solid #f3dce7;
      border-radius: 14px;
      padding: 20px;
      margin: 24px 0;
    }

    .detail-label {
      color: #75636c;
      font-size: 13px;
      margin-bottom: 2px;
    }

    .detail-value {
      font-weight: 600;
      margin-bottom: 14px;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
    }

    .payment-total {
      border-top: 1px solid #ead2df;
      margin-top: 8px;
      padding-top: 16px;
      font-weight: 700;
    }

    .balance {
      font-size: 25px;
      color: #d63384;
    }

    .paid {
      color: #18794e;
    }

    .button {
      display: block;
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 16px 20px;
      background: #d63384;
      color: #ffffff;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    .button:hover {
      background: #b82a70;
    }

    .button:focus-visible {
      outline: 3px solid #30252b;
      outline-offset: 3px;
    }

    .secondary-button {
      display: block;
      width: 100%;
      border: 1px solid #d63384;
      border-radius: 10px;
      padding: 14px 20px;
      background: #ffffff;
      color: #d63384;
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      margin-top: 12px;
    }

    .secondary-button:hover {
      background: #fff5f8;
    }

    .secondary-button:focus-visible {
      outline: 3px solid #30252b;
      outline-offset: 3px;
    }

    .security {
      text-align: center;
      font-size: 12px;
      color: #75636c;
      margin-top: 14px;
    }

    .notice {
      background: #fff8e8;
      border: 1px solid #ead8ab;
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
    }

    .success {
      background: #edf9f2;
      border: 1px solid #cce8d6;
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
      color: #18794e;
    }

    .footer {
      text-align: center;
      color: #75636c;
      font-size: 12px;
      padding: 18px 24px;
      border-top: 1px solid #f3dce7;
    }

    @media (max-width: 480px) {
      body {
        padding: 16px 12px;
      }

      .container {
        margin: 0 auto;
      }

      .content {
        padding: 24px 18px;
      }

      .details {
        padding: 16px;
      }
    }
  </style>
</head>

<body>
  <main class="container">

    <header class="header">
      <p class="brand">InLoveNailz</p>
      <p class="brand-subtitle">by Briana</p>
    </header>

    <section class="content">
      ${content}
    </section>

    <footer class="footer">
      InLoveNailz by Briana
      &bull;
      Secure Appointment Payments
    </footer>

  </main>
</body>
</html>`;
}

/* =====================================
   SEND HTML RESPONSE
===================================== */

function respond(
  res: any,
  status: number,
  title: string,
  content: string
) {
  res.status(status);

  res.setHeader(
    'Content-Type',
    'text/html; charset=utf-8'
  );

  return res.send(
    page(title, content)
  );
}

/* =====================================
   PAYMENT REVIEW RESPONSE
===================================== */

function paymentUnderReview(
  res: any
) {
  return respond(
    res,
    409,
    'Payment Under Review',
    `
      <h1>Payment under review</h1>

      <div class="notice" role="status">
        Your appointment has payment
        activity that requires verification.
      </div>

      <p>
        Please do not submit another
        payment at this time.
      </p>

      <p>
        Contact Briana for assistance
        if this message continues to appear.
      </p>
    `
  );
}

/* =====================================
   CUSTOMER BALANCE PAYMENT HANDLER
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
    'same-origin'
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
    "form-action 'self'; " +
    "base-uri 'none'; " +
    "frame-ancestors 'none';"
  );

  /* =====================================
     READ-ONLY GET REQUESTS
  ===================================== */

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return respond(
      res,
      405,
      'Method Not Allowed',
      `
        <h1>Method not allowed</h1>

        <p>
          Please open the payment link
          from your appointment email.
        </p>
      `
    );
  }

  try {
    /* =====================================
       VERIFY SIGNED PAYMENT TOKEN
    ===================================== */

    const token = req.query?.token;

    const appointmentId =
      typeof token === 'string'
        ? verifyBalancePaymentToken(token)
        : null;

    if (!appointmentId) {
      return respond(
        res,
        403,
        'Invalid Payment Link',
        `
          <h1>Invalid payment link</h1>

          <p>
            This payment link could not
            be verified.
          </p>

          <p>
            Please contact Briana for
            assistance.
          </p>
        `
      );
    }

    /* =====================================
       STRIPE RETURN INDICATOR

       This parameter is NOT proof
       of a completed payment.

       Only verified payment records
       determine whether a balance
       has been paid.
    ===================================== */

    const returnedFromCheckout =
      req.query?.returned === '1';

    /* =====================================
       VERIFY SERVER CONFIGURATION
    ===================================== */

    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured.'
      );
    }

    const websiteUrl =
      balanceAppUrl();

    const statusUrl =
      `${websiteUrl}/api/balance-payment` +
      `?token=${encodeURIComponent(token as string)}` +
      '&returned=1';

    const sql = neon(databaseUrl);

    /* =====================================
       RETRIEVE CURRENT APPOINTMENT

       Payment records and unresolved
       events are retrieved together.
    ===================================== */

    const rows = await sql`
      SELECT
        appointment.id,
        appointment.status,
        appointment.customer_name,
        appointment.appointment_date::text
          AS appointment_date,
        appointment.appointment_time,
        appointment.total_price,
        appointment.deposit_amount,
        appointment.deposit_paid_at::text
          AS deposit_paid_at,
        appointment.stripe_checkout_session_id,
        appointment.stripe_payment_intent_id,
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
        'Appointment Not Found',
        `
          <h1>Appointment unavailable</h1>

          <p>
            This appointment could not
            be located.
          </p>

          <p>
            Please contact Briana
            for assistance.
          </p>
        `
      );
    }

    const appointment =
      rows[0] as Appointment;

    /* =====================================
       PROTECT CANCELLED APPOINTMENTS
    ===================================== */

    if (appointment.status === 'cancelled') {
      return respond(
        res,
        410,
        'Appointment Cancelled',
        `
          <h1>Appointment cancelled</h1>

          <p>
            This appointment has been
            cancelled.
          </p>

          <p>
            No additional payment can
            be made through this link.
          </p>

          <a
            class="button"
            href="${escapeHtml(websiteUrl)}"
            rel="noreferrer"
          >
            Return to InLoveNailz
          </a>
        `
      );
    }

    /* =====================================
       REQUIRE CONFIRMED APPOINTMENT
    ===================================== */

    if (appointment.status !== 'confirmed') {
      return respond(
        res,
        409,
        'Payment Unavailable',
        `
          <h1>Payment unavailable</h1>

          <p>
            This appointment is not
            currently eligible for a
            remaining balance payment.
          </p>

          <p>
            Please contact Briana
            for assistance.
          </p>
        `
      );
    }

    /* =====================================
       VALIDATE RECORDED DEPOSIT PAYMENT
    ===================================== */

    const hasValidDepositPayment =
      Boolean(appointment.deposit_paid_at) &&
      isValidBalanceSessionId(
        appointment.stripe_checkout_session_id
      ) &&
      isValidBalancePaymentIntentId(
        appointment.stripe_payment_intent_id
      );

    if (!hasValidDepositPayment) {
      return paymentUnderReview(res);
    }

    /* =====================================
       CHECK UNRESOLVED PAYMENT ACTIVITY

       Even expired checkout claims
       require reconciliation before
       another payment can be accepted.
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
      return paymentUnderReview(res);
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
       VALIDATE STORED BALANCE SESSION
    ===================================== */

    if (
      appointment.balance_stripe_checkout_session_id !== null &&
      (
        !isValidBalanceSessionId(
          appointment.balance_stripe_checkout_session_id
        ) ||
        appointment.balance_stripe_checkout_session_id ===
          appointment.stripe_checkout_session_id
      )
    ) {
      return paymentUnderReview(res);
    }

    /* =====================================
       VERIFY BALANCE PAYMENT CONSISTENCY
    ===================================== */

    const hasBalancePaymentEvidence =
      appointment.balance_paid_at !== null ||
      appointment.balance_stripe_payment_intent_id !== null ||
      amounts.balancePaidCents > 0;

    const verifiedBalancePayment =
      Boolean(appointment.balance_paid_at) &&
      isValidBalanceSessionId(
        appointment.balance_stripe_checkout_session_id
      ) &&
      isValidBalancePaymentIntentId(
        appointment.balance_stripe_payment_intent_id
      ) &&
      appointment.balance_stripe_checkout_session_id !==
        appointment.stripe_checkout_session_id &&
      appointment.balance_stripe_payment_intent_id !==
        appointment.stripe_payment_intent_id &&
      amounts.balancePaidCents > 0 &&
      amounts.balanceDueCents === 0;

    if (
      hasBalancePaymentEvidence &&
      !verifiedBalancePayment
    ) {
      return paymentUnderReview(res);
    }

    if (
      amounts.totalCents === amounts.depositCents &&
      appointment.balance_stripe_checkout_session_id !== null
    ) {
      return paymentUnderReview(res);
    }

    /* =====================================
       FORMAT CUSTOMER DETAILS
    ===================================== */

    const customerName =
      escapeHtml(
        appointment.customer_name
      );

    const appointmentDate =
      escapeHtml(
        formatAppointmentDate(
          appointment.appointment_date
        )
      );

    const appointmentTime =
      escapeHtml(
        formatAppointmentTime(
          appointment.appointment_time
        )
      );

    const total =
      formatBalanceMoney(
        amounts.totalCents
      );

    const deposit =
      formatBalanceMoney(
        amounts.depositCents
      );

    const balancePaid =
      formatBalanceMoney(
        amounts.balancePaidCents
      );

    const totalPaid =
      formatBalanceMoney(
        amounts.depositCents +
        amounts.balancePaidCents
      );

    const balanceDue =
      formatBalanceMoney(
        amounts.balanceDueCents
      );

    /* =====================================
       APPOINTMENT PAYMENT SUMMARY
    ===================================== */

    const paymentSummary = `
      <div class="details">

        <div class="detail-label">
          Appointment date
        </div>

        <div class="detail-value">
          ${appointmentDate}
        </div>

        <div class="detail-label">
          Appointment time
        </div>

        <div class="detail-value">
          ${appointmentTime}
        </div>

        <div class="payment-row">
          <span>Service total</span>
          <strong>${total}</strong>
        </div>

        <div class="payment-row">
          <span>Deposit paid</span>
          <strong class="paid">
            ${deposit}
          </strong>
        </div>

        ${
          amounts.balancePaidCents > 0
            ? `
              <div class="payment-row">
                <span>Balance payment</span>
                <strong class="paid">
                  ${balancePaid}
                </strong>
              </div>
            `
            : ''
        }

        <div class="payment-row">
          <span>Total recorded paid</span>

          <strong class="paid">
            ${totalPaid}
          </strong>
        </div>

        <div class="payment-row payment-total">
          <span>Remaining balance</span>

          <span class="balance">
            ${balanceDue}
          </span>
        </div>

      </div>
    `;

    /* =====================================
       FULLY PAID APPOINTMENTS

       Checked before Stripe return
       handling so verified payments
       immediately display success.
    ===================================== */

    if (amounts.balanceDueCents === 0) {
      return respond(
        res,
        200,
        'Appointment Fully Paid',
        `
          <h1>You're fully paid!</h1>

          <p>Hi ${customerName},</p>

          <div class="success" role="status">
            Your appointment has been
            paid in full. No additional
            payment is required.
          </div>

          ${paymentSummary}

          <p>
            Thank you for choosing
            InLoveNailz by Briana!
          </p>

          <a
            class="button"
            href="${escapeHtml(websiteUrl)}"
            rel="noreferrer"
          >
            Return to InLoveNailz
          </a>
        `
      );
    }

    /* =====================================
       STRIPE RETURN VERIFICATION

       A customer returning from
       checkout must not be presented
       with another payment button
       while verification is pending.

       Checking payment status remains
       a read-only GET operation.
    ===================================== */

    if (returnedFromCheckout) {
      return respond(
        res,
        200,
        'Verifying Your Payment',
        `
          <h1>Verifying your payment</h1>

          <p>Hi ${customerName},</p>

          <div class="notice" role="status">
            We are waiting for confirmation
            of your remaining balance payment.
          </div>

          <p>
            If you completed your payment
            through Stripe, please do not
            submit another payment.
          </p>

          <p>
            Payment verification may take
            a moment. Select the button
            below to check your current
            payment status.
          </p>

          <div class="details">

            <div class="detail-label">
              Appointment date
            </div>

            <div class="detail-value">
              ${appointmentDate}
            </div>

            <div class="detail-label">
              Appointment time
            </div>

            <div class="detail-value">
              ${appointmentTime}
            </div>

            <div class="payment-row">
              <span>Payment status</span>
              <strong>
                Awaiting verification
              </strong>
            </div>

          </div>

          <a
            class="button"
            href="${escapeHtml(statusUrl)}"
          >
            Check Payment Status
          </a>

          <p class="security">
            Checking your payment status
            will not create another checkout
            or charge your card.
          </p>

          <p>
            Once your payment has been
            verified, this page will
            display your updated balance.
          </p>

          <p>
            If verification remains pending,
            please contact Briana before
            attempting another payment.
          </p>

          <a
            class="secondary-button"
            href="${escapeHtml(websiteUrl)}"
            rel="noreferrer"
          >
            Return to InLoveNailz
          </a>
        `
      );
    }

    /* =====================================
       STRIPE PAYMENT AMOUNT LIMITS
    ===================================== */

    if (
      !isPayableBalanceAmount(
        amounts.balanceDueCents
      )
    ) {
      return respond(
        res,
        200,
        'Remaining Balance',
        `
          <h1>Remaining balance</h1>

          <p>Hi ${customerName},</p>

          ${paymentSummary}

          <div class="notice">
            Your remaining balance cannot
            currently be processed online.
            Please contact Briana to
            arrange payment.
          </div>

          <a
            class="button"
            href="${escapeHtml(websiteUrl)}"
            rel="noreferrer"
          >
            Return to InLoveNailz
          </a>
        `
      );
    }

    /* =====================================
       SECURE CHECKOUT FORM

       GET requests never create
       Stripe Checkout Sessions.

       Checkout creation requires
       an explicit POST request.

       The checkout endpoint must
       independently repeat all
       eligibility and payment checks.
    ===================================== */

    return respond(
      res,
      200,
      'Pay Remaining Balance',
      `
        <h1>Pay remaining balance</h1>

        <p>Hi ${customerName},</p>

        <p>
          Your appointment is confirmed
          and your deposit has been received.
          You can securely pay your remaining
          balance below.
        </p>

        ${paymentSummary}

        ${
          appointment.balance_stripe_checkout_session_id !== null
            ? `
              <div class="notice">
                A payment checkout already exists
                for this appointment.

                The server will verify its status
                before allowing another checkout.

                If you have already completed
                payment, check your payment status
                instead of attempting to pay again.
              </div>

              <a
                class="secondary-button"
                href="${escapeHtml(statusUrl)}"
              >
                Check Payment Status
              </a>
            `
            : ''
        }

        <form
          method="POST"
          action="/api/balance-checkout"
          enctype="application/x-www-form-urlencoded"
        >
          <input
            type="hidden"
            name="token"
            value="${escapeHtml(token as string)}"
          >

          <button
            type="submit"
            class="button"
          >
            Pay ${balanceDue} Securely
          </button>
        </form>

        <p class="security">
          Secure payment powered by Stripe.
          Your card details are never stored
          by InLoveNailz.
        </p>

        <p>
          Thank you for choosing
          InLoveNailz by Briana!
        </p>
      `
    );

  } catch (error: unknown) {
    console.error(
      'Balance payment page failed:',
      error instanceof Error
        ? error.name
        : 'Unknown error'
    );

    return respond(
      res,
      503,
      'Payment Temporarily Unavailable',
      `
        <h1>Payment temporarily unavailable</h1>

        <p>
          We could not verify your
          appointment payment information
          at this time.
        </p>

        <p>
          If you have already submitted
          a payment, please do not pay again
          until its status has been verified.
        </p>

        <p>
          Please try again later or
          contact Briana for assistance.
        </p>
      `
    );
  }
}