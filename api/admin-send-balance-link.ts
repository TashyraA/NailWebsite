
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

import { requireAdmin } from './_admin-auth.js';
import { escapeHtml } from './_email.js';

import {
  isValidBalanceAppointmentId,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
  calculateBalancePaymentAmounts,
  isPayableBalanceAmount,
  formatBalanceMoney,
  createNeonBalancePaymentLink,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA

   ADMIN SEND REMAINING BALANCE LINK

   - Admin-only endpoint
   - Email-only communication through Resend
   - Authoritative Neon payment records
   - Confirmed appointment required
   - Recorded deposit payment required
   - Live Stripe session identifiers required
   - Outstanding balance verification
   - Unresolved payment protection
   - Durable signed appointment payment link
   - Resend idempotency protection
   - No Stripe Checkout Session creation
   - No appointment payment mutations
   - No automatic charges
   - No sensitive payment link logging
========================================= */

type Appointment = {
  id: string;
  status: string;
  customer_name: string;
  customer_email: string;
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

type ResendResponse = {
  id?: string;
  name?: string;
};

type ProcessingStage =
  | 'configuration'
  | 'appointment_lookup'
  | 'appointment_validation'
  | 'email_preparation'
  | 'final_appointment_verification'
  | 'resend_request'
  | 'resend_response'
  | 'complete';

class EligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EligibilityError';
  }
}

/* =====================================
   VALIDATE CUSTOMER EMAIL
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
   VALIDATE LIVE STRIPE SESSION ID
===================================== */

function validLiveSessionId(
  value: unknown
): value is string {
  return (
    isValidBalanceSessionId(value) &&
    value.startsWith('cs_live_')
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
   VERIFY APPOINTMENT ELIGIBILITY

   Match the customer-facing balance
   payment page's existing safeguards.

   Never trust browser-supplied amounts
   or customer email addresses.
===================================== */

function verifyEligibility(
  appointment: Appointment
) {
  if (appointment.status !== 'confirmed') {
    throw new EligibilityError(
      'Only confirmed appointments are eligible for remaining balance payment emails.'
    );
  }

  if (
    !appointment.deposit_paid_at ||
    !validLiveSessionId(
      appointment.stripe_checkout_session_id
    ) ||
    !isValidBalancePaymentIntentId(
      appointment.stripe_payment_intent_id
    )
  ) {
    throw new EligibilityError(
      'A valid recorded live deposit payment is required before sending a remaining balance link.'
    );
  }

  if (
    appointment.has_payment_exception !== false ||
    appointment.deposit_checkout_claim_id !== null ||
    appointment.deposit_checkout_claim_expires_at !== null ||
    appointment.balance_checkout_claim_id !== null ||
    appointment.balance_checkout_claim_expires_at !== null
  ) {
    throw new EligibilityError(
      'Unresolved payment activity requires review before sending a remaining balance link.'
    );
  }

  let amounts: ReturnType<
    typeof calculateBalancePaymentAmounts
  >;

  try {
    amounts = calculateBalancePaymentAmounts(
      appointment.total_price,
      appointment.deposit_amount,
      appointment.balance_paid_amount
    );
  } catch {
    throw new EligibilityError(
      'Appointment payment amounts require review.'
    );
  }

  if (
    appointment.balance_stripe_checkout_session_id !== null &&
    (
      !validLiveSessionId(
        appointment.balance_stripe_checkout_session_id
      ) ||
      appointment.balance_stripe_checkout_session_id ===
        appointment.stripe_checkout_session_id
    )
  ) {
    throw new EligibilityError(
      'The recorded balance checkout requires review.'
    );
  }

  const hasBalancePaymentEvidence =
    appointment.balance_paid_at !== null ||
    appointment.balance_stripe_payment_intent_id !== null ||
    amounts.balancePaidCents > 0;

  const verifiedBalancePayment =
    Boolean(appointment.balance_paid_at) &&
    validLiveSessionId(
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
    throw new EligibilityError(
      'Existing balance payment records require reconciliation.'
    );
  }

  if (
    amounts.totalCents === amounts.depositCents &&
    appointment.balance_stripe_checkout_session_id !== null
  ) {
    throw new EligibilityError(
      'Unexpected balance checkout activity requires review.'
    );
  }

  if (amounts.balanceDueCents === 0) {
    throw new EligibilityError(
      'This appointment has already been paid in full.'
    );
  }

  if (
    !isPayableBalanceAmount(
      amounts.balanceDueCents
    )
  ) {
    throw new EligibilityError(
      'The remaining balance is not eligible for online Stripe payment.'
    );
  }

  if (!validEmail(appointment.customer_email)) {
    throw new EligibilityError(
      'A valid customer email address is required.'
    );
  }

  return amounts;
}

/* =====================================
   ADMIN BALANCE EMAIL HANDLER
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
    'X-Content-Type-Options',
    'nosniff'
  );

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

  let stage: ProcessingStage =
    'configuration';

  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  const stripeKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  const resendKey =
    process.env.RESEND_API_KEY?.trim();

  const emailFrom =
    process.env.EMAIL_FROM?.trim();

  const missingConfiguration: string[] = [];

  if (!databaseUrl) {
    missingConfiguration.push('DATABASE_URL');
  }

  if (!stripeKey) {
    missingConfiguration.push('STRIPE_SECRET_KEY');
  }

  if (!resendKey) {
    missingConfiguration.push('RESEND_API_KEY');
  }

  if (!emailFrom) {
    missingConfiguration.push('EMAIL_FROM');
  }

  if (!process.env.BALANCE_LINK_SECRET?.trim()) {
    missingConfiguration.push('BALANCE_LINK_SECRET');
  }

  if (!process.env.APP_URL?.trim()) {
    missingConfiguration.push('APP_URL');
  }

  if (missingConfiguration.length > 0) {
    console.error(
      '[Admin Balance Email] Missing configuration:',
      missingConfiguration
    );

    return res.status(500).json({
      success: false,
      error:
        'Remaining balance email configuration is incomplete.',
    });
  }

  /* =====================================
     REQUIRE LIVE STRIPE CONFIGURATION
  ===================================== */

  if (
    !stripeKey!.startsWith('sk_live_') &&
    !stripeKey!.startsWith('rk_live_')
  ) {
    console.error(
      '[Admin Balance Email] Live Stripe configuration required.'
    );

    return res.status(500).json({
      success: false,
      error:
        'Live payment configuration is unavailable.',
    });
  }

  const suppliedAppointmentId =
    req.body?.appointmentId;

  if (
    !isValidBalanceAppointmentId(
      suppliedAppointmentId
    )
  ) {
    return res.status(400).json({
      success: false,
      error: 'Valid appointment ID required.',
    });
  }

  const appointmentId =
    suppliedAppointmentId.toLowerCase();

  const logStage = (
    nextStage: ProcessingStage
  ) => {
    stage = nextStage;

    console.info(
      '[Admin Balance Email]',
      {
        appointmentId,
        stage,
      }
    );
  };

  try {
    const sql = neon(databaseUrl!);

    /* =====================================
       RETRIEVE AUTHORITATIVE APPOINTMENT
    ===================================== */

    const loadAppointment =
      async (): Promise<Appointment | null> => {
        const rows = await sql`
          SELECT
            appointment.id,
            appointment.status,
            appointment.customer_name,
            appointment.customer_email,
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

        return rows.length
          ? (rows[0] as Appointment)
          : null;
      };

    logStage('appointment_lookup');

    const appointment =
      await loadAppointment();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found.',
      });
    }

    /* =====================================
       VERIFY PAYMENT ELIGIBILITY
    ===================================== */

    logStage('appointment_validation');

    const amounts =
      verifyEligibility(appointment);

    /* =====================================
       CREATE DURABLE SIGNED WEBSITE LINK

       This does not create a Stripe
       Checkout Session or charge a card.
    ===================================== */

    logStage('email_preparation');

    const paymentLink =
      createNeonBalancePaymentLink(
        appointmentId
      );

    const safePaymentLink =
      escapeHtml(paymentLink);

    const customerName =
      escapeHtml(
        String(
          appointment.customer_name ||
          'Customer'
        )
      );

    const appointmentDate =
      escapeHtml(
        formatAppointmentDate(
          String(
            appointment.appointment_date || ''
          )
        )
      );

    const appointmentTime =
      escapeHtml(
        formatAppointmentTime(
          String(
            appointment.appointment_time || ''
          )
        )
      );

    const serviceTotal =
      formatBalanceMoney(
        amounts.totalCents
      );

    const depositPaid =
      formatBalanceMoney(
        amounts.depositCents
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
       CUSTOMER EMAIL TEMPLATE
    ===================================== */

    const html = `
      <div style="
        font-family: Arial, Helvetica, sans-serif;
        color: #30252b;
        line-height: 1.7;
        max-width: 600px;
        margin: 0 auto;
      ">

        <div style="
          background: #963F60;
          color: #ffffff;
          padding: 28px 24px;
          text-align: center;
          border-radius: 14px 14px 0 0;
        ">
          <h1 style="
            margin: 0;
            font-size: 28px;
          ">
            InLoveNailz
          </h1>

          <p style="
            margin: 4px 0 0;
            font-size: 15px;
          ">
            by Briana
          </p>
        </div>

        <div style="
          padding: 26px 24px;
          border: 1px solid #EBCBD6;
          border-top: none;
          border-radius: 0 0 14px 14px;
          background: #ffffff;
        ">

          <h2 style="
            color: #963F60;
            margin-top: 0;
            font-size: 24px;
          ">
            Your Remaining Appointment Balance
          </h2>

          <p>Hi ${customerName},</p>

          <p>
            Thank you for choosing
            <strong>InLoveNailz by Briana!</strong>
          </p>

          <p>
            Your appointment is confirmed and
            your deposit payment has been received.
            Your remaining appointment balance
            is available to pay online.
          </p>

          <div style="
            background: #FFF7F8;
            border: 1px solid #EBCBD6;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
          ">

            <p style="margin: 0 0 8px;">
              <strong>Appointment Date:</strong>
              ${appointmentDate}
            </p>

            <p style="margin: 0 0 16px;">
              <strong>Appointment Time:</strong>
              ${appointmentTime}
            </p>

            <table style="
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            ">

              <tr>
                <td style="padding: 8px 0;">
                  Service Total
                </td>

                <td style="
                  padding: 8px 0;
                  text-align: right;
                  font-weight: bold;
                ">
                  ${serviceTotal}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 0;">
                  Deposit Paid
                </td>

                <td style="
                  padding: 8px 0;
                  text-align: right;
                  color: #397A53;
                  font-weight: bold;
                ">
                  ${depositPaid}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 0;">
                  Total Collected
                </td>

                <td style="
                  padding: 8px 0;
                  text-align: right;
                  color: #397A53;
                  font-weight: bold;
                ">
                  ${totalPaid}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 16px 0 4px;
                  border-top: 1px solid #EBCBD6;
                  font-weight: bold;
                ">
                  Remaining Balance
                </td>

                <td style="
                  padding: 16px 0 4px;
                  border-top: 1px solid #EBCBD6;
                  text-align: right;
                  color: #963F60;
                  font-size: 24px;
                  font-weight: bold;
                ">
                  ${balanceDue}
                </td>
              </tr>

            </table>

          </div>

          <p>
            Please use the secure payment link
            below to review and pay your
            remaining appointment balance.
          </p>

          <p style="
            margin: 30px 0;
            text-align: center;
          ">

            <a
              href="${safePaymentLink}"
              style="
                display: inline-block;
                background: #963F60;
                color: #ffffff;
                text-decoration: none;
                padding: 15px 26px;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              Pay Remaining Balance
            </a>

          </p>

          <p style="
            font-size: 13px;
            color: #786A72;
          ">
            Your current balance and payment
            eligibility will be verified before
            checkout. Opening this link will
            not automatically charge your card.
          </p>

          <p style="
            font-size: 13px;
            color: #786A72;
          ">
            If you have already completed your
            remaining balance payment, please
            do not submit another payment.
            Your payment status can be reviewed
            using the same secure link.
          </p>

          <p style="
            font-size: 13px;
            color: #786A72;
          ">
            If the button does not work, copy
            and paste this secure link into
            your browser:
          </p>

          <p style="
            overflow-wrap: anywhere;
            word-break: break-all;
            font-size: 12px;
          ">
            <a
              href="${safePaymentLink}"
              style="color: #963F60;"
            >
              ${safePaymentLink}
            </a>
          </p>

          <p>
            For your security, please do not
            share this appointment-specific
            payment link with anyone else.
          </p>

          <p>
            With love,<br />
            <strong>InLoveNailz by Briana</strong>
          </p>

        </div>

      </div>
    `;

    const text = [
      'InLoveNailz by Briana',
      '',
      'Your Remaining Appointment Balance',
      '',
      `Hi ${appointment.customer_name || 'Customer'},`,
      '',
      'Your appointment is confirmed and your deposit has been received.',
      '',
      `Appointment Date: ${formatAppointmentDate(
        String(appointment.appointment_date || '')
      )}`,
      `Appointment Time: ${formatAppointmentTime(
        String(appointment.appointment_time || '')
      )}`,
      `Service Total: ${serviceTotal}`,
      `Deposit Paid: ${depositPaid}`,
      `Total Collected: ${totalPaid}`,
      `Remaining Balance: ${balanceDue}`,
      '',
      'Review and pay your remaining balance:',
      paymentLink,
      '',
      'Your current balance will be verified before checkout.',
      'Opening this link does not automatically charge your card.',
      'If you have already paid, please do not submit another payment.',
      '',
      'Please do not share your secure payment link.',
      '',
      'With love,',
      'InLoveNailz by Briana',
    ].join('\n');

    /* =====================================
       PREPARE RESEND REQUEST

       Use a deterministic idempotency key
       for the same exact email payload.

       Never log the email payload or
       signed payment token.
    ===================================== */

    const emailPayload = {
      from: emailFrom!,
      to: [
        appointment.customer_email.trim(),
      ],
      subject:
        'InLoveNailz | Pay Your Remaining Balance',
      html,
      text,
    };

    const emailBody =
      JSON.stringify(emailPayload);

    const emailFingerprint =
      createHash('sha256')
        .update(emailBody)
        .digest('hex');

    const idempotencyKey =
      `inl-balance-link-${appointmentId}-${emailFingerprint}`;

    /* =====================================
       FINAL APPOINTMENT VERIFICATION

       Recheck the appointment immediately
       before requesting email delivery.

       Reject changed payment records or
       customer information.
    ===================================== */

    logStage(
      'final_appointment_verification'
    );

    const latestAppointment =
      await loadAppointment();

    if (!latestAppointment) {
      throw new EligibilityError(
        'The appointment is no longer available.'
      );
    }

    verifyEligibility(latestAppointment);

    if (
      JSON.stringify(latestAppointment) !==
      JSON.stringify(appointment)
    ) {
      throw new EligibilityError(
        'Appointment information changed before the email could be sent. Refresh the appointment and try again.'
      );
    }

    /* =====================================
       SEND EMAIL THROUGH RESEND

       No automatic retries.
       No Stripe checkout creation.
       No appointment payment mutations.
    ===================================== */

    logStage('resend_request');

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${resendKey!}`,

          'Content-Type':
            'application/json',

          'Idempotency-Key':
            idempotencyKey,
        },

        body: emailBody,

        redirect: 'error',

        signal:
          AbortSignal.timeout(10000),
      }
    );

    logStage('resend_response');

    let emailResult: ResendResponse = {};

    try {
      emailResult =
        (await resendResponse.json()) as ResendResponse;
    } catch {
      console.error(
        '[Admin Balance Email] Invalid Resend response',
        {
          appointmentId,
          status: resendResponse.status,
        }
      );

      throw new Error(
        'Unable to verify the remaining balance email response.'
      );
    }

    if (
      !resendResponse.ok ||
      typeof emailResult.id !== 'string' ||
      !emailResult.id.trim()
    ) {
      console.error(
        '[Admin Balance Email] Resend acceptance failed',
        {
          appointmentId,
          status: resendResponse.status,

          errorName:
            typeof emailResult.name === 'string' &&
            /^[a-zA-Z0-9_-]{1,80}$/.test(
              emailResult.name
            )
              ? emailResult.name
              : 'unknown_error',
        }
      );

      throw new Error(
        'Resend email acceptance could not be verified.'
      );
    }

    logStage('complete');

    console.info(
      '[Admin Balance Email] Email accepted by Resend',
      {
        appointmentId,
      }
    );

    /* =====================================
       SUCCESS RESPONSE

       Email acceptance does not prove
       delivery or payment completion.

       Never return the signed payment
       link to the admin browser.
    ===================================== */

    return res.status(200).json({
      success: true,
      appointmentId,
      emailAccepted: true,
      message:
        'Resend accepted the remaining balance payment email. Delivery is not yet confirmed.',
    });

  } catch (error: unknown) {
    if (error instanceof EligibilityError) {
      console.info(
        '[Admin Balance Email] Eligibility rejected',
        {
          appointmentId,
          stage,
        }
      );

      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    console.error(
      '[Admin Balance Email] Workflow failed',
      {
        appointmentId,
        stage,

        errorType:
          error instanceof Error
            ? error.name
            : 'UnknownError',

        databaseErrorCode:
          error &&
          typeof error === 'object' &&
          'code' in error &&
          typeof error.code === 'string' &&
          /^[a-zA-Z0-9_-]{1,40}$/.test(
            error.code
          )
            ? error.code
            : undefined,
      }
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to verify or send the remaining balance email. Review the appointment and Resend before retrying.',
    });
  }
}
