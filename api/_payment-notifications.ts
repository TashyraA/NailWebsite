import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { escapeHtml } from './_email.js';

import {
  calculateBalancePaymentAmounts,
  createNeonBalancePaymentLink,
  formatBalanceMoney,
  isPayableBalanceAmount,
  isValidBalancePaymentIntentId,
  isValidBalanceSessionId,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   PAYMENT NOTIFICATION SENDER

   - Atomic notification claims
   - Current appointment verification
   - Automatic remaining balance links
   - Customer deposit confirmations
   - Business deposit confirmations
   - Customer final payment confirmations
   - Business final payment confirmations
   - Unresolved payment protection
   - Resend idempotency protection
   - Sensitive information protection
   - Manual review of uncertain outcomes
   - No appointment payment mutations
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESEND_REQUEST_TIMEOUT_MS = 10000;

type NotificationRow = {
  id: string;
  appointment_id: string;
  notification_type: string;
  customer_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  total_price: string | number;
  deposit_amount: string | number;
  appointment_status: string;
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
  deposit_expired: boolean;
  expiration_marked: boolean;
};

type NotificationResult = {
  success: boolean;
  status: string;
};

type EmailContent = {
  to: string;
  subject: string;
  html: string;
};

type ResendResponse = {
  id?: string;
};

const money = formatBalanceMoney;

const SUPPORTED_NOTIFICATION_TYPES = new Set([
  'customer_deposit_confirmation',
  'business_deposit_confirmation',
  'customer_balance_confirmation',
  'business_balance_confirmation',
  'customer_deposit_expiration',
  'business_deposit_expiration',
]);

/* =====================================
   SAFE NOTIFICATION ERRORS
===================================== */

class NotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

function safeErrorMessage(
  error: unknown
): string {
  if (error instanceof NotificationError) {
    return error.message;
  }

  return 'Notification processing requires manual verification.';
}

/* =====================================
   VALIDATE EMAIL ADDRESS
===================================== */

function validEmail(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    )
  );
}

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

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
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
  const match =
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
      value.trim()
    );

  if (!match) {
    return value;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  const period =
    hours >= 12 ? 'PM' : 'AM';

  return (
    `${hours % 12 || 12}:` +
    `${String(minutes).padStart(2, '0')} ` +
    period
  );
}

/* =====================================
   CHECK UNRESOLVED PAYMENT ACTIVITY
===================================== */

function hasUnresolvedPaymentActivity(
  notification: NotificationRow
): boolean {
  return (
    notification.has_payment_exception !== false ||

    notification.deposit_checkout_claim_id !== null ||

    notification.deposit_checkout_claim_expires_at !== null ||

    notification.balance_checkout_claim_id !== null ||

    notification.balance_checkout_claim_expires_at !== null
  );
}

/* =====================================
   VERIFY APPOINTMENT PAYMENT RECORDS
===================================== */

function verifyNotificationPayment(
  notification: NotificationRow
) {
  if (
    !SUPPORTED_NOTIFICATION_TYPES.has(
      notification.notification_type
    )
  ) {
    throw new NotificationError(
      'Unsupported notification type.'
    );
  }

  if (
    notification.appointment_status !== 'confirmed' ||

    !notification.deposit_paid_at ||

    !isValidBalancePaymentIntentId(
      notification.stripe_payment_intent_id
    ) ||

    !isValidBalanceSessionId(
      notification.stripe_checkout_session_id
    )
  ) {
    throw new NotificationError(
      'Appointment is not confirmed or its recorded deposit requires verification.'
    );
  }

  /*
    Deposit checkout claims must be
    resolved before confirming payment.
  */

  if (
    notification.deposit_checkout_claim_id !== null ||

    notification.deposit_checkout_claim_expires_at !== null
  ) {
    throw new NotificationError(
      'Unresolved deposit checkout activity requires verification.'
    );
  }

  let amounts: ReturnType<
    typeof calculateBalancePaymentAmounts
  >;

  try {
    amounts = calculateBalancePaymentAmounts(
      notification.total_price,
      notification.deposit_amount,
      notification.balance_paid_amount
    );
  } catch {
    throw new NotificationError(
      'Appointment payment amounts require verification.'
    );
  }

  /* =====================================
     VALIDATE STORED BALANCE SESSION
  ===================================== */

  if (
    notification.balance_stripe_checkout_session_id !== null &&

    (
      !isValidBalanceSessionId(
        notification.balance_stripe_checkout_session_id
      ) ||

      notification.balance_stripe_checkout_session_id ===
        notification.stripe_checkout_session_id
    )
  ) {
    throw new NotificationError(
      'Stored balance checkout session requires verification.'
    );
  }

  /* =====================================
     VERIFY RECORDED BALANCE PAYMENT
  ===================================== */

  if (amounts.balancePaidCents > 0) {
    if (
      !notification.balance_paid_at ||

      !isValidBalancePaymentIntentId(
        notification.balance_stripe_payment_intent_id
      ) ||

      !isValidBalanceSessionId(
        notification.balance_stripe_checkout_session_id
      ) ||

      notification.balance_stripe_payment_intent_id ===
        notification.stripe_payment_intent_id ||

      notification.balance_stripe_checkout_session_id ===
        notification.stripe_checkout_session_id ||

      notification.balance_checkout_claim_id !== null ||

      notification.balance_checkout_claim_expires_at !== null ||

      amounts.balanceDueCents !== 0
    ) {
      throw new NotificationError(
        'Recorded balance payment requires verification.'
      );
    }
  } else {
    if (
      notification.balance_paid_at !== null ||

      notification.balance_stripe_payment_intent_id !== null
    ) {
      throw new NotificationError(
        'Appointment balance payment records are inconsistent.'
      );
    }
  }

  /*
    A deposit covering the entire service
    total must not have a separate balance
    checkout session.
  */

  if (
    amounts.totalCents === amounts.depositCents &&

    notification.balance_stripe_checkout_session_id !== null
  ) {
    throw new NotificationError(
      'Unexpected balance checkout for a fully paid appointment.'
    );
  }

  /* =====================================
     VERIFY FINAL PAYMENT NOTIFICATIONS
  ===================================== */

  const isBalanceConfirmation =
    notification.notification_type ===
      'customer_balance_confirmation' ||

    notification.notification_type ===
      'business_balance_confirmation';

  if (isBalanceConfirmation) {
    if (
      amounts.balancePaidCents <= 0 ||

      amounts.balanceDueCents !== 0 ||

      !notification.balance_paid_at ||

      hasUnresolvedPaymentActivity(notification)
    ) {
      throw new NotificationError(
        'Final balance payment requires verification before notification.'
      );
    }
  }

  return amounts;
}

/* =====================================
   SHARED EMAIL DESIGN
===================================== */

function emailLayout(
  heading: string,
  content: string
): string {
  return `
    <div style="
      font-family: Arial, sans-serif;
      color: #333333;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    ">
      <h2 style="color: #d63384;">
        ${escapeHtml(heading)}
      </h2>

      ${content}
    </div>
  `;
}

function detailBox(
  content: string
): string {
  return `
    <div style="
      background-color: #fff5f8;
      border: 1px solid #f3dce7;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    ">
      ${content}
    </div>
  `;
}

function reviewNotice(
  message: string
): string {
  return `
    <div style="
      background-color: #fff8e8;
      border: 1px solid #ead8ab;
      border-radius: 10px;
      padding: 18px;
      margin: 24px 0;
      color: #805500;
    ">
      <strong>
        Payment verification required
      </strong>

      <p style="margin-bottom: 0;">
        ${escapeHtml(message)}
      </p>
    </div>
  `;
}

function paidInFullSection(): string {
  return `
    <div style="
      background-color: #f0faf3;
      border: 1px solid #cde8d5;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      color: #18794e;
      margin: 24px 0;
    ">
      <h3 style="margin-top: 0;">
        Paid in Full
      </h3>

      <p style="margin-bottom: 0;">
        No additional payment is required
        for your currently booked services.
      </p>
    </div>
  `;
}

function customerSignature(): string {
  return `
    <p>
      We look forward to seeing you!
    </p>

    <p>
      With love,<br />
      <strong>
        InLoveNailz by Briana
      </strong>
    </p>
  `;
}

/* =====================================
   BUILD REMAINING BALANCE PAYMENT BUTTON

   The customer receives a durable signed
   appointment link instead of an expiring
   Stripe Checkout Session URL.

   Opening the link does not create
   a checkout or charge the customer.
===================================== */

function buildBalancePaymentSection(
  notification: NotificationRow,
  balanceDueCents: number
): string {
  /*
    Unresolved activity must take priority
    over paid-in-full messages and links.
  */

  if (
    hasUnresolvedPaymentActivity(notification)
  ) {
    return reviewNotice(
      'Please contact Briana to verify your payment status before making another payment.'
    );
  }

  if (balanceDueCents === 0) {
    return paidInFullSection();
  }

  if (
    !isPayableBalanceAmount(
      balanceDueCents
    )
  ) {
    return `
      <p>
        Please contact Briana to arrange
        payment of your remaining balance
        of <strong>${money(balanceDueCents)}</strong>.
      </p>
    `;
  }

  let paymentUrl: string;

  try {
    paymentUrl =
      createNeonBalancePaymentLink(
        notification.appointment_id
      );
  } catch {
    /*
      Preserve the appointment confirmation
      even if link configuration is missing.

      Never log signed payment tokens.
    */

    console.error(
      'Unable to generate appointment balance link.',
      {
        appointmentId:
          notification.appointment_id,
      }
    );

    return `
      <p>
        Please contact Briana for assistance
        paying your remaining balance.
      </p>
    `;
  }

  return `
    <div style="
      background-color: #fff5f8;
      border: 1px solid #f3dce7;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    ">

      <p style="
        margin-top: 0;
        margin-bottom: 8px;
        color: #555555;
        font-size: 14px;
      ">
        Remaining Balance
      </p>

      <p style="
        margin-top: 0;
        margin-bottom: 18px;
        color: #d63384;
        font-size: 30px;
        font-weight: bold;
      ">
        ${money(balanceDueCents)}
      </p>

      <p>
        You can securely pay your remaining
        balance before your appointment
        using the button below.
      </p>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
        align="center"
        style="margin: 20px auto;"
      >
        <tr>
          <td
            bgcolor="#d63384"
            style="border-radius: 8px;"
          >
            <a
              href="${escapeHtml(paymentUrl)}"
              style="
                display: inline-block;
                padding: 16px 24px;
                color: #ffffff;
                background-color: #d63384;
                border-radius: 8px;
                text-decoration: none;
                font-size: 16px;
                font-weight: bold;
              "
            >
              Pay Remaining Balance —
              ${money(balanceDueCents)}
            </a>
          </td>
        </tr>
      </table>

      <p style="
        color: #777777;
        font-size: 12px;
        margin-bottom: 0;
      ">
        Secure payment powered by Stripe.
        Your current balance will be verified
        before checkout.
      </p>

      <p style="
        color: #777777;
        font-size: 12px;
        margin-bottom: 0;
      ">
        This payment link is intended for
        you. Please do not share it.
      </p>

    </div>
  `;
}

/* =====================================
   BUILD NOTIFICATION EMAIL
===================================== */

function isExpirationNotification(type: string): boolean {
  return type === 'customer_deposit_expiration' ||
    type === 'business_deposit_expiration';
}

function buildExpirationEmail(notification: NotificationRow): EmailContent {
  if (notification.appointment_status !== 'cancelled' ||
      notification.deposit_expired !== true ||
      notification.expiration_marked !== true ||
      notification.deposit_paid_at !== null ||
      notification.stripe_payment_intent_id !== null ||
      notification.balance_paid_at !== null ||
      notification.balance_stripe_payment_intent_id !== null ||
      notification.balance_stripe_checkout_session_id !== null ||
      hasUnresolvedPaymentActivity(notification)) {
    throw new NotificationError('Expired appointment requires verification.');
  }
  const amounts = calculateBalancePaymentAmounts(
    notification.total_price, notification.deposit_amount,
    notification.balance_paid_amount
  );
  if (amounts.balancePaidCents !== 0 ||
      (notification.stripe_checkout_session_id !== null &&
       !isValidBalanceSessionId(notification.stripe_checkout_session_id))) {
    throw new NotificationError('Expired appointment payment records require verification.');
  }
  const name = escapeHtml(notification.customer_name);
  const date = escapeHtml(formatAppointmentDate(notification.appointment_date));
  const time = escapeHtml(formatAppointmentTime(notification.appointment_time));
  const details = detailBox(`<p><strong>Appointment date:</strong> ${date}</p>
    <p><strong>Appointment time:</strong> ${time}</p>
    <p><strong>Required deposit:</strong> ${money(amounts.depositCents)}</p>
    <p><strong>Status:</strong> Cancelled — deposit deadline expired</p>`);
  if (notification.notification_type === 'customer_deposit_expiration') {
    return {
      to: notification.customer_email,
      subject: 'InLoveNailz | Appointment Deposit Deadline Expired',
      html: emailLayout('Your Appointment Has Been Cancelled', `
        <p>Hi ${name},</p>
        <p>Your deposit deadline passed without a recorded payment, so your appointment has been cancelled and the reservation released.</p>
        ${details}
        <p>Please do not use your previous payment link. You are welcome to submit a new appointment request through our website.</p>
        <p><a href="https://www.inlovenailz.com/" style="background:#d63384;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;display:inline-block;">Visit Our Website</a></p>
        <p>With love,<br /><strong>InLoveNailz by Briana</strong></p>`),
    };
  }
  const businessEmail = process.env.BUSINESS_EMAIL;
  if (!validEmail(businessEmail)) {
    throw new NotificationError('BUSINESS_EMAIL is missing or invalid.');
  }
  return {
    to: businessEmail,
    subject: 'InLoveNailz | Deposit Deadline Expired: ' +
      notification.customer_name.replace(/[\r\n]+/g, ' ').slice(0, 150),
    html: emailLayout('Appointment Automatically Cancelled', `
      <p><strong>Customer:</strong> ${name}</p>
      <p><strong>Email:</strong> ${escapeHtml(notification.customer_email)}</p>
      ${details}
      <p><strong>Appointment ID:</strong> ${escapeHtml(notification.appointment_id)}</p>
      <p>The unpaid reservation was released after its deposit deadline expired. No refund was initiated.</p>
      <p><a href="https://www.inlovenailz.com/admin/appointments">Open Appointments Dashboard</a></p>`),
  };
}

function buildNotificationEmail(
  notification: NotificationRow
): EmailContent {
  if (isExpirationNotification(notification.notification_type)) {
    return buildExpirationEmail(notification);
  }
  const amounts =
    verifyNotificationPayment(notification);

  const {
    totalCents,
    depositCents,
    balancePaidCents,
    balanceDueCents,
  } = amounts;

  const totalPaidCents =
    depositCents + balancePaidCents;

  const requiresReview =
    hasUnresolvedPaymentActivity(notification);

  const name = escapeHtml(
    notification.customer_name
  );

  const email = escapeHtml(
    notification.customer_email
  );

  const date = escapeHtml(
    formatAppointmentDate(
      notification.appointment_date
    )
  );

  const time = escapeHtml(
    formatAppointmentTime(
      notification.appointment_time
    )
  );

  const appointmentId = escapeHtml(
    notification.appointment_id
  );

  const safeSubjectName =
    notification.customer_name
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 150);

  /* =====================================
     SHARED APPOINTMENT PAYMENT SUMMARY

     Do not present unresolved amounts
     as an authoritative collectible
     balance or paid-in-full status.
  ===================================== */

  const paymentSummary = detailBox(`
    <p style="margin-top: 0;">
      <strong>Appointment date:</strong>
      ${date}
    </p>

    <p>
      <strong>Appointment time:</strong>
      ${time}
    </p>

    <hr style="
      border: 0;
      border-top: 1px solid #f3dce7;
    ">

    <p>
      Service total:
      <strong>${money(totalCents)}</strong>
    </p>

    <p>
      Deposit recorded:
      <strong style="color: #18794e;">
        ${money(depositCents)}
      </strong>
    </p>

    ${
      balancePaidCents > 0
        ? `
          <p>
            Balance payment recorded:
            <strong style="color: #18794e;">
              ${money(balancePaidCents)}
            </strong>
          </p>
        `
        : ''
    }

    <p>
      Total recorded paid:
      <strong>
        ${money(totalPaidCents)}
      </strong>
    </p>

    <p style="margin-bottom: 0;">
      Remaining balance:

      <strong style="
        color: ${
          requiresReview
            ? '#805500'
            : balanceDueCents === 0
              ? '#18794e'
              : '#d63384'
        };
      ">
        ${
          requiresReview
            ? 'Pending verification'
            : money(balanceDueCents)
        }
      </strong>
    </p>
  `);

  /* =====================================
     CUSTOMER DEPOSIT CONFIRMATION
  ===================================== */

  if (
    notification.notification_type ===
      'customer_deposit_confirmation'
  ) {
    const balanceSection =
      buildBalancePaymentSection(
        notification,
        balanceDueCents
      );

    return {
      to: notification.customer_email,

      subject:
        'InLoveNailz | Appointment Confirmed',

      html: emailLayout(
        'Your Appointment Is Confirmed!',
        `
          <p>Hi ${name},</p>

          <p>
            Thank you for booking with
            <strong>
              InLoveNailz by Briana!
            </strong>
          </p>

          ${
            requiresReview
              ? `
                <p>
                  Your deposit payment of
                  <strong>${money(depositCents)}</strong>
                  is recorded. Additional payment
                  activity requires verification.
                </p>
              `
              : `
                <p>
                  Your deposit of
                  <strong>${money(depositCents)}</strong>
                  has been received.
                </p>
              `
          }

          <p>
            Your appointment is confirmed for
            <strong>${date}</strong>
            at <strong>${time}</strong>.
          </p>

          ${paymentSummary}

          ${balanceSection}

          ${customerSignature()}
        `
      ),
    };
  }

  /* =====================================
     BUSINESS DEPOSIT CONFIRMATION
  ===================================== */

  if (
    notification.notification_type ===
      'business_deposit_confirmation'
  ) {
    const businessEmail =
      process.env.BUSINESS_EMAIL;

    if (!validEmail(businessEmail)) {
      throw new NotificationError(
        'BUSINESS_EMAIL is missing or invalid.'
      );
    }

    const paymentStatus =
      requiresReview
        ? 'Requires verification'
        : balanceDueCents === 0
          ? 'Paid in full'
          : 'Partially paid';

    return {
      to: businessEmail,

      subject:
        'InLoveNailz | Deposit Paid: ' +
        safeSubjectName,

      html: emailLayout(
        'Appointment Deposit Received',
        `
          <p>
            <strong>Customer:</strong>
            ${name}
          </p>

          <p>
            <strong>Email:</strong>
            ${email}
          </p>

          ${paymentSummary}

          <p>
            <strong>Payment status:</strong>
            ${paymentStatus}
          </p>

          <p>
            <strong>Appointment ID:</strong>
            ${appointmentId}
          </p>

          <p>
            The customer's deposit has been
            recorded in Neon and their
            appointment is confirmed.
          </p>

          ${
            requiresReview
              ? reviewNotice(
                  'Additional payment activity requires manual verification. Do not request another payment until the payment records have been reconciled.'
                )
              : ''
          }
        `
      ),
    };
  }

  /* =====================================
     CUSTOMER BALANCE CONFIRMATION
  ===================================== */

  if (
    notification.notification_type ===
      'customer_balance_confirmation'
  ) {
    return {
      to: notification.customer_email,

      subject:
        'InLoveNailz | Appointment Paid in Full',

      html: emailLayout(
        'Your Appointment Is Paid in Full!',
        `
          <p>Hi ${name},</p>

          <p>
            Thank you for your remaining
            balance payment of
            <strong>
              ${money(balancePaidCents)}
            </strong>.
          </p>

          <p>
            Your payment has been received
            and verified successfully.
          </p>

          ${paymentSummary}

          ${paidInFullSection()}

          <p>
            Your appointment remains confirmed.
          </p>

          ${customerSignature()}
        `
      ),
    };
  }

  /* =====================================
     BUSINESS BALANCE CONFIRMATION
  ===================================== */

  if (
    notification.notification_type ===
      'business_balance_confirmation'
  ) {
    const businessEmail =
      process.env.BUSINESS_EMAIL;

    if (!validEmail(businessEmail)) {
      throw new NotificationError(
        'BUSINESS_EMAIL is missing or invalid.'
      );
    }

    return {
      to: businessEmail,

      subject:
        'InLoveNailz | Balance Paid: ' +
        safeSubjectName,

      html: emailLayout(
        'Remaining Balance Received',
        `
          <p>
            <strong>Customer:</strong>
            ${name}
          </p>

          <p>
            <strong>Email:</strong>
            ${email}
          </p>

          ${paymentSummary}

          <div style="
            background-color: #f0faf3;
            border: 1px solid #cde8d5;
            border-radius: 10px;
            padding: 18px;
            color: #18794e;
          ">
            <strong>
              Payment status: Paid in Full
            </strong>
          </div>

          <p>
            <strong>Appointment ID:</strong>
            ${appointmentId}
          </p>

          <p>
            The customer's remaining balance
            payment has been verified and
            recorded in Neon.
          </p>

          <p>
            Their original deposit payment
            record has been preserved.
          </p>
        `
      ),
    };
  }

  throw new NotificationError(
    'Unsupported notification type.'
  );
}

/* =====================================
   SEND EMAIL THROUGH RESEND
===================================== */

async function sendResendEmail(
  email: EmailContent,
  notificationId: string
): Promise<string> {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new NotificationError(
      'Resend configuration is incomplete.'
    );
  }

  if (!validEmail(email.to)) {
    throw new NotificationError(
      'Notification recipient is invalid.'
    );
  }

  let response: Response;

  try {
    response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          'Content-Type':
            'application/json',

          'Idempotency-Key':
            `inl-payment-${notificationId}`,
        },

        body: JSON.stringify({
          from,

          to: [
            email.to.trim(),
          ],

          subject: email.subject,

          html: email.html,
        }),

        redirect: 'error',

        signal: AbortSignal.timeout(
          RESEND_REQUEST_TIMEOUT_MS
        ),
      }
    );
  } catch {
    /*
      The provider may have accepted the
      email even if the request timed out.
    */

    throw new NotificationError(
      'Resend submission outcome is uncertain. Manual verification is required.'
    );
  }

  let data: ResendResponse;

  try {
    data = (
      await response.json()
    ) as ResendResponse;
  } catch {
    throw new NotificationError(
      'Unable to verify Resend response.'
    );
  }

  if (
    !response.ok ||

    !data ||

    typeof data.id !== 'string' ||

    !data.id.trim()
  ) {
    /*
      Never log raw provider responses,
      email content, or payment links.
    */

    throw new NotificationError(
      `Resend request requires review (${response.status}).`
    );
  }

  return data.id;
}

/* =====================================
   PROCESS QUEUED NOTIFICATION
===================================== */

export async function processPaymentNotification(
  notificationId: string
): Promise<NotificationResult> {
  if (!UUID_PATTERN.test(notificationId)) {
    throw new NotificationError(
      'Invalid notification ID.'
    );
  }

  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new NotificationError(
      'DATABASE_URL is missing.'
    );
  }

  const sql = neon(databaseUrl);
  const claimId = randomUUID();

  /* =====================================
     ATOMICALLY CLAIM PENDING JOB

     A pending notification with an
     unresolved claim is not retried.
  ===================================== */

  const claimed = await sql`
    UPDATE public.salon_payment_notifications AS n

    SET
      status = 'processing',

      claim_id =
        ${claimId}::uuid,

      claim_expires_at =
        NOW() + INTERVAL '2 minutes',

      attempts =
        n.attempts + 1

    FROM public.appointment_requests AS a

    WHERE n.id =
      ${notificationId}::uuid

      AND n.appointment_id = a.id

      AND n.status = 'pending'

      AND n.claim_id IS NULL

      AND n.claim_expires_at IS NULL

    RETURNING
      n.id,
      n.appointment_id,
      n.notification_type
  `;

  if (!claimed.length) {
    return {
      success: false,
      status: 'not_pending',
    };
  }

  const claimedNotification = claimed[0];

  /* =====================================
     MARK JOB FOR MANUAL REVIEW

     Only updates the notification
     owned by the current worker.
  ===================================== */

  async function markNeedsReview(
    reason: string
  ): Promise<NotificationResult> {
    const updated = await sql`
      UPDATE public.salon_payment_notifications

      SET
        status = 'needs_review',

        claim_id = NULL,

        claim_expires_at = NULL,

        last_error =
          ${reason.slice(0, 500)}

      WHERE id =
        ${notificationId}::uuid

        AND claim_id =
          ${claimId}::uuid

        AND status = 'processing'

      RETURNING id
    `;

    if (!updated.length) {
      console.error(
        'Unable to update notification review status.',
        {
          notificationId,
        }
      );
    }

    return {
      success: false,
      status: 'needs_review',
    };
  }

  /* =====================================
     VERIFY EMAIL CONFIGURATION
  ===================================== */

  if (
    !process.env.RESEND_API_KEY ||

    !process.env.EMAIL_FROM
  ) {
    return markNeedsReview(
      'Resend configuration is incomplete.'
    );
  }

  /* =====================================
     RETRIEVE LATEST APPOINTMENT STATE

     The notification is prepared from
     current payment information rather
     than a stale webhook snapshot.
  ===================================== */

  let current: NotificationRow;

  try {
    const verification = await sql`
      SELECT
        n.id,

        n.appointment_id,

        n.notification_type,

        a.customer_name,

        a.customer_email,

        a.appointment_date::text
          AS appointment_date,

        a.appointment_time,

        a.total_price,

        a.deposit_amount,

        a.status
          AS appointment_status,
        COALESCE(a.deposit_expires_at <= NOW(), false) AS deposit_expired,
        (POSITION('[DEPOSIT DEADLINE EXPIRED]' IN COALESCE(a.notes, '')) > 0) AS expiration_marked,

        a.deposit_paid_at::text
          AS deposit_paid_at,

        a.stripe_payment_intent_id,

        a.stripe_checkout_session_id,

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
        ) AS has_payment_exception,

        n.status
          AS notification_status,

        n.claim_id,

        n.claim_expires_at::text
          AS claim_expires_at

      FROM public.salon_payment_notifications AS n

      JOIN public.appointment_requests AS a
        ON a.id = n.appointment_id

      WHERE n.id =
        ${notificationId}::uuid

        AND n.status = 'processing'

        AND n.claim_id =
          ${claimId}::uuid

        AND n.claim_expires_at >
          NOW() + INTERVAL '15 seconds'

      LIMIT 1
    `;

    const row = verification[0];

    if (
      !row ||

      (!isExpirationNotification(row.notification_type) &&
        (row.appointment_status !== 'confirmed' || !row.deposit_paid_at)) ||

      row.notification_status !== 'processing' ||

      row.claim_id !== claimId ||

      row.appointment_id !==
        claimedNotification.appointment_id ||

      row.notification_type !==
        claimedNotification.notification_type
    ) {
      return markNeedsReview(
        'Appointment or notification changed before email submission.'
      );
    }

    current = row as NotificationRow;

  } catch {
    console.error(
      'Unable to retrieve notification payment state.',
      {
        notificationId,
      }
    );

    return markNeedsReview(
      'Unable to verify current appointment payment information.'
    );
  }

  /* =====================================
     PREPARE EMAIL USING CURRENT DATA
  ===================================== */

  let email: EmailContent;

  try {
    email = buildNotificationEmail(current);

    if (!validEmail(email.to)) {
      throw new NotificationError(
        'Notification recipient is invalid.'
      );
    }

  } catch (error: unknown) {
    const message =
      safeErrorMessage(error);

    console.error(
      'Notification preparation failed.',
      {
        notificationId,
        reason: message,
      }
    );

    return markNeedsReview(message);
  }

  /* =====================================
     RECHECK NOTIFICATION CLAIM

     Prevent sending if another worker
     or maintenance process has changed
     the notification state.
  ===================================== */

  try {
    const activeClaim = await sql`
      SELECT n.id

      FROM public.salon_payment_notifications AS n

      JOIN public.appointment_requests AS a
        ON a.id = n.appointment_id

      WHERE n.id =
        ${notificationId}::uuid

        AND n.status = 'processing'

        AND n.claim_id =
          ${claimId}::uuid

        AND n.claim_expires_at >
          NOW() + INTERVAL '15 seconds'

        AND n.appointment_id =
          ${current.appointment_id}::uuid

        AND n.notification_type =
          ${current.notification_type}

        AND a.status = ${current.appointment_status}
        AND (NOT ${isExpirationNotification(current.notification_type)}::boolean OR (
          a.status = 'cancelled'
          AND a.deposit_expires_at <= NOW()
          AND POSITION('[DEPOSIT DEADLINE EXPIRED]' IN COALESCE(a.notes, '')) > 0
        ))

        AND a.customer_name =
          ${current.customer_name}

        AND a.customer_email =
          ${current.customer_email}

        AND a.appointment_date =
          ${current.appointment_date}::date

        AND a.appointment_time =
          ${current.appointment_time}

        AND a.total_price =
          ${current.total_price}::numeric

        AND a.deposit_amount =
          ${current.deposit_amount}::numeric

        AND a.deposit_paid_at IS NOT DISTINCT FROM
          ${current.deposit_paid_at}::timestamptz

        AND a.stripe_payment_intent_id IS NOT DISTINCT FROM
          ${current.stripe_payment_intent_id}

        AND a.stripe_checkout_session_id IS NOT DISTINCT FROM
          ${current.stripe_checkout_session_id}

        AND a.deposit_checkout_claim_id IS NULL

        AND a.deposit_checkout_claim_expires_at IS NULL

        AND a.balance_paid_amount =
          ${current.balance_paid_amount}::numeric

        AND a.balance_paid_at
          IS NOT DISTINCT FROM
          ${current.balance_paid_at}::timestamptz

        AND a.balance_stripe_checkout_session_id
          IS NOT DISTINCT FROM
          ${current.balance_stripe_checkout_session_id}

        AND a.balance_stripe_payment_intent_id
          IS NOT DISTINCT FROM
          ${current.balance_stripe_payment_intent_id}

        AND a.balance_checkout_claim_id
          IS NOT DISTINCT FROM
          ${current.balance_checkout_claim_id}::uuid

        AND a.balance_checkout_claim_expires_at
          IS NOT DISTINCT FROM
          ${current.balance_checkout_claim_expires_at}::timestamptz

        AND (
          EXISTS (
            SELECT 1
            FROM public.salon_stripe_payment_events AS e

            WHERE e.appointment_id = a.id

              AND e.processing_status = 'needs_review'
          )
        ) = ${current.has_payment_exception}::boolean

      LIMIT 1
    `;

    if (!activeClaim.length) {
      return markNeedsReview(
        'Payment or notification state changed before email submission.'
      );
    }

  } catch {
    return markNeedsReview(
      'Unable to recheck notification authorization.'
    );
  }

  /* =====================================
     SEND EMAIL

     Uncertain outcomes require review.
     Do not automatically resend.
  ===================================== */

  let resendEmailId: string;

  try {
    resendEmailId =
      await sendResendEmail(
        email,
        notificationId
      );

  } catch (error: unknown) {
    const message =
      safeErrorMessage(error);

    console.error(
      'Resend submission needs review.',
      {
        notificationId,
        reason: message,
      }
    );

    return markNeedsReview(message);
  }

  /* =====================================
     RECORD RESEND ACCEPTANCE

     Acceptance does not guarantee
     delivery to the recipient's inbox.
  ===================================== */

  try {
    const updated = await sql`
      UPDATE public.salon_payment_notifications

      SET
        status = 'sent',

        sent_at = NOW(),

        resend_email_id =
          ${resendEmailId},

        claim_id = NULL,

        claim_expires_at = NULL,

        last_error = NULL

      WHERE id =
        ${notificationId}::uuid

        AND claim_id =
          ${claimId}::uuid

        AND status = 'processing'

      RETURNING id
    `;

    if (!updated.length) {
      console.error(
        'Resend accepted email but notification update did not match.',
        {
          notificationId,
          resendEmailId,
        }
      );

      return {
        success: false,
        status: 'needs_review',
      };
    }

    return {
      success: true,
      status: 'sent',
    };

  } catch {
    console.error(
      'Resend accepted email but Neon update failed.',
      {
        notificationId,
        resendEmailId,
      }
    );

    /*
      Do not resend an accepted email.

      The stalled notification recovery
      process must flag the unresolved
      job for manual reconciliation.
    */

    return {
      success: false,
      status: 'needs_review',
    };
  }
}