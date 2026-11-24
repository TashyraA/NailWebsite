
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { escapeHtml } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   PAYMENT NOTIFICATION SENDER

   - Claims queued notifications atomically
   - Verifies paid appointment status
   - Rechecks status immediately before email
   - Uses Resend idempotency keys
   - Records accepted email IDs
   - Flags uncertain outcomes for review
   - Never changes appointment payments
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  message?: string;
};

const money = (value: number): string =>
  `$${value.toFixed(2)}`;

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Unknown notification error';

const validEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );

/* =====================================
   BUILD EMAIL CONTENT
===================================== */

function buildNotificationEmail(
  notification: NotificationRow
): EmailContent {
  const deposit = Number(
    notification.deposit_amount
  );

  const total = Number(
    notification.total_price
  );

  if (
    !Number.isFinite(deposit) ||
    !Number.isFinite(total) ||
    deposit <= 0 ||
    total < deposit
  ) {
    throw new Error(
      'Appointment payment amounts are invalid.'
    );
  }

  const balance = Math.max(
    0,
    total - deposit
  );

  const name = escapeHtml(
    notification.customer_name
  );

  const email = escapeHtml(
    notification.customer_email
  );

  const date = escapeHtml(
    notification.appointment_date
  );

  const time = escapeHtml(
    notification.appointment_time
  );

  if (
    notification.notification_type ===
    'customer_deposit_confirmation'
  ) {
    return {
      to: notification.customer_email,
      subject:
        'InLoveNailz | Appointment Confirmed',
      html: `
        <div style="
          font-family: Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
        ">
          <h2 style="color: #d63384;">
            Your Appointment Is Confirmed!
          </h2>

          <p>Hi ${name},</p>

          <p>
            Thank you for booking with
            <strong>InLoveNailz by Briana!</strong>
          </p>

          <p>
            Your deposit of
            <strong>${money(deposit)}</strong>
            has been received.
          </p>

          <p>
            Your appointment is confirmed for
            <strong>${date}</strong>
            at <strong>${time}</strong>.
          </p>

          <p>
            Service total:
            <strong>${money(total)}</strong>
          </p>

          <p>
            Deposit paid:
            <strong>${money(deposit)}</strong>
          </p>

          <p>
            Remaining balance:
            <strong>${money(balance)}</strong>
          </p>

          <p>We look forward to seeing you!</p>

          <p>
            With love,<br />
            <strong>InLoveNailz by Briana</strong>
          </p>
        </div>
      `,
    };
  }

  if (
    notification.notification_type ===
    'business_deposit_confirmation'
  ) {
    const businessEmail =
      process.env.BUSINESS_EMAIL;

    if (!businessEmail) {
      throw new Error(
        'BUSINESS_EMAIL is missing.'
      );
    }

    return {
      to: businessEmail,
      subject:
        `InLoveNailz | Deposit Paid: ` +
        notification.customer_name,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
        ">
          <h2 style="color: #d63384;">
            Appointment Deposit Received
          </h2>

          <p><strong>Customer:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>

          <p>
            <strong>Appointment:</strong>
            ${date} at ${time}
          </p>

          <p>
            <strong>Service total:</strong>
            ${money(total)}
          </p>

          <p>
            <strong>Deposit paid:</strong>
            ${money(deposit)}
          </p>

          <p>
            <strong>Remaining balance:</strong>
            ${money(balance)}
          </p>

          <p>
            <strong>Appointment ID:</strong>
            ${escapeHtml(notification.appointment_id)}
          </p>

          <p>
            The customer's deposit has been
            recorded in Neon and their
            appointment is confirmed.
          </p>
        </div>
      `,
    };
  }

  throw new Error(
    'Unsupported notification type.'
  );
}

/* =====================================
   SEND THROUGH RESEND
===================================== */

async function sendResendEmail(
  email: EmailContent,
  notificationId: string
): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      'Resend configuration is incomplete.'
    );
  }

  if (!validEmail(email.to)) {
    throw new Error(
      'Notification recipient is invalid.'
    );
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key':
          `inl-payment-${notificationId}`,
      },
      body: JSON.stringify({
        from,
        to: [email.to.trim()],
        subject: email.subject,
        html: email.html,
      }),
    }
  );

  let data: ResendResponse = {};

  try {
    data = (
      await response.json()
    ) as ResendResponse;
  } catch {
    throw new Error(
      'Unable to verify Resend response.'
    );
  }

  if (!response.ok || !data.id) {
    throw new Error(
      data.message ||
      `Resend request failed (${response.status}).`
    );
  }

  return String(data.id);
}

/* =====================================
   PROCESS QUEUED NOTIFICATION
===================================== */

export async function processPaymentNotification(
  notificationId: string
): Promise<NotificationResult> {
  if (!UUID_PATTERN.test(notificationId)) {
    throw new Error(
      'Invalid notification ID.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing.'
    );
  }

  const sql = neon(databaseUrl);
  const claimId = randomUUID();

  /* =====================================
     CLAIM PENDING JOB
  ===================================== */

  const claimed = await sql`
    UPDATE public.salon_payment_notifications AS n
    SET
      status = 'processing',
      claim_id = ${claimId}::uuid,
      claim_expires_at =
        NOW() + INTERVAL '2 minutes',
      attempts = n.attempts + 1
    FROM public.appointment_requests AS a
    WHERE n.id = ${notificationId}::uuid
      AND n.appointment_id = a.id
      AND n.status = 'pending'
      AND n.claim_id IS NULL
    RETURNING
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
      a.status AS appointment_status,
      a.deposit_paid_at
  `;

  if (!claimed.length) {
    return {
      success: false,
      status: 'not_pending',
    };
  }

  const notification =
    claimed[0] as NotificationRow;

  /* =====================================
     MARK JOB FOR MANUAL REVIEW

     Only updates the notification
     owned by this worker.
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
        last_error = ${reason.slice(0, 500)}
      WHERE id = ${notificationId}::uuid
        AND claim_id = ${claimId}::uuid
        AND status = 'processing'
      RETURNING id
    `;

    if (!updated.length) {
      throw new Error(
        'Unable to update notification review status.'
      );
    }

    return {
      success: false,
      status: 'needs_review',
    };
  }

  /* =====================================
     INITIAL PAYMENT VERIFICATION
  ===================================== */

  if (
    notification.appointment_status !==
      'confirmed' ||
    !notification.deposit_paid_at
  ) {
    return markNeedsReview(
      'Appointment is not confirmed or deposit payment is missing.'
    );
  }

  /* =====================================
     PREPARE EMAIL
  ===================================== */

  let email: EmailContent;

  try {
    email = buildNotificationEmail(
      notification
    );

    if (
      !process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM
    ) {
      throw new Error(
        'Resend configuration is incomplete.'
      );
    }

    if (!validEmail(email.to)) {
      throw new Error(
        'Notification recipient is invalid.'
      );
    }
  } catch (error) {
    const message = errorMessage(error);

    console.error(
      'Notification preparation failed:',
      notificationId,
      message
    );

    return markNeedsReview(message);
  }

  /* =====================================
     RECHECK APPOINTMENT BEFORE SENDING
  ===================================== */

  const verification = await sql`
    SELECT
      a.status,
      a.deposit_paid_at,
      n.status AS notification_status,
      n.claim_id,
      n.claim_expires_at
    FROM public.salon_payment_notifications AS n
    JOIN public.appointment_requests AS a
      ON a.id = n.appointment_id
    WHERE n.id = ${notificationId}::uuid
  `;

  const current = verification[0];

  if (
    !current ||
    current.status !== 'confirmed' ||
    !current.deposit_paid_at ||
    current.notification_status !== 'processing' ||
    current.claim_id !== claimId ||
    !current.claim_expires_at ||
    new Date(
      String(current.claim_expires_at)
    ).getTime() <= Date.now()
  ) {
    return markNeedsReview(
      'Appointment or notification changed before email submission.'
    );
  }

  /* =====================================
     SEND EMAIL

     Uncertain outcomes require review.
     Do not automatically resend.
  ===================================== */

  let resendEmailId: string;

  try {
    resendEmailId = await sendResendEmail(
      email,
      notification.id
    );
  } catch (error) {
    const message = errorMessage(error);

    console.error(
      'Resend submission needs review:',
      notificationId,
      message
    );

    return markNeedsReview(message);
  }

  /* =====================================
     RECORD RESEND ACCEPTANCE
  ===================================== */

  try {
    const updated = await sql`
      UPDATE public.salon_payment_notifications
      SET
        status = 'sent',
        sent_at = NOW(),
        resend_email_id = ${resendEmailId},
        claim_id = NULL,
        claim_expires_at = NULL,
        last_error = NULL
      WHERE id = ${notificationId}::uuid
        AND claim_id = ${claimId}::uuid
        AND status = 'processing'
      RETURNING id
    `;

    if (!updated.length) {
      console.error(
        'Resend accepted email but notification update did not match:',
        notificationId,
        resendEmailId
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
  } catch (error) {
    console.error(
      'Resend accepted email but Neon update failed:',
      notificationId,
      resendEmailId,
      errorMessage(error)
    );

    return {
      success: false,
      status: 'needs_review',
    };
  }
}
