import { neon } from '@neondatabase/serverless';

import { requireAdmin } from './_admin-auth.js';
import { escapeHtml } from './_email.js';
import { isPayableBalanceAmount, isValidBalanceCheckoutUrl } from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA

   ADMIN SEND DEPOSIT LINK

   - Admin-only endpoint
   - Never creates a Stripe Checkout Session
   - Verifies appointment details in Neon
   - Verifies the stored session with Stripe
   - Sends the verified link through Resend
   - Uses a stable Resend idempotency key
   - Never marks an appointment paid
   - Includes safe diagnostic logging
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Appointment = {
  id: string;
  customer_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_price: string | number;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  deposit_expires_at: string | Date | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_checkout_claim_id: string | null;
  deposit_checkout_claim_expires_at: string | null;
};

type StripeSession = {
  id?: string;
  livemode?: boolean;
  url?: string | null;
  mode?: string;
  status?: string;
  payment_status?: string;
  payment_intent?: string | null;
  amount_total?: number;
  currency?: string;
  expires_at?: number;
  metadata?: Record<string, string>;
};

type ResendResponse = {
  id?: string;
  name?: string;
  message?: string;
  statusCode?: number;
};

type ProcessingStage =
  | 'configuration'
  | 'database_connection'
  | 'appointment_lookup'
  | 'appointment_validation'
  | 'payment_exception_lookup'
  | 'stripe_session_lookup'
  | 'stripe_session_validation'
  | 'email_preparation'
  | 'final_appointment_verification'
  | 'resend_request'
  | 'resend_response'
  | 'complete';

function toCents(
  value: string | number | null
): number {
  if (value === null) return NaN;

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

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function validEmail(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    )
  );
}

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

  let stage: ProcessingStage = 'configuration';

  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  const missingConfiguration: string[] = [];

  if (!databaseUrl?.trim()) {
    missingConfiguration.push('DATABASE_URL');
  }

  if (!stripeKey?.trim()) {
    missingConfiguration.push('STRIPE_SECRET_KEY');
  }

  if (!resendKey?.trim()) {
    missingConfiguration.push('RESEND_API_KEY');
  }

  if (!emailFrom?.trim()) {
    missingConfiguration.push('EMAIL_FROM');
  }

  if (missingConfiguration.length > 0) {
    console.error(
      '[Admin Deposit Email] Missing configuration:',
      missingConfiguration
    );

    return res.status(500).json({
      success: false,
      error: 'Payment email configuration is incomplete.',
    });
  }

  if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey!.trim())) {
    return res.status(500).json({
      success: false,
      error: 'LIVE Stripe configuration is required.',
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

  const logStage = (
    nextStage: ProcessingStage
  ) => {
    stage = nextStage;

    console.info('[Admin Deposit Email]', {
      appointmentId,
      stage,
    });
  };

  try {
    logStage('database_connection');

    const sql = neon(databaseUrl!);

    logStage('appointment_lookup');

    const rows = await sql`
      SELECT
        id,
        customer_name,
        customer_email,
        appointment_date::text AS appointment_date,
        appointment_time::text AS appointment_time,
        status,
        total_price,
        deposit_amount,
        deposit_paid_at,
        deposit_expires_at::text AS deposit_expires_at,
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

    logStage('appointment_validation');

    if (
      appointment.status !== 'awaiting_deposit' ||
      appointment.deposit_paid_at !== null ||
      appointment.stripe_payment_intent_id !== null
    ) {
      return res.status(409).json({
        success: false,
        error: 'Appointment is not awaiting deposit payment.',
      });
    }

    if (
      appointment.deposit_checkout_claim_id !== null ||
      appointment.deposit_checkout_claim_expires_at !== null
    ) {
      return res.status(409).json({
        success: false,
        error:
          'Checkout creation requires reconciliation before emailing.',
      });
    }

    if (
      !appointment.stripe_checkout_session_id ||
      !/^cs_live_[A-Za-z0-9]+$/.test(appointment.stripe_checkout_session_id)
    ) {
      return res.status(409).json({
        success: false,
        error:
          'Create the deposit checkout before sending its link.',
      });
    }

    const depositCents = toCents(
      appointment.deposit_amount
    );

    const totalCents = toCents(
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
        error: 'Approved deposit amount is invalid.',
      });
    }

    if (!validEmail(appointment.customer_email)) {
      return res.status(409).json({
        success: false,
        error: 'Customer email address is invalid.',
      });
    }

    const deadlineMs =
      appointment.deposit_expires_at instanceof Date
        ? appointment.deposit_expires_at.getTime()
        : Date.parse(
            String(
              appointment.deposit_expires_at ?? ''
            )
          );

    if (
      !Number.isFinite(deadlineMs) ||
      deadlineMs <= Date.now()
    ) {
      return res.status(409).json({
        success: false,
        error: 'The deposit payment deadline has expired.',
      });
    }

    /* =========================================
       PAYMENT EXCEPTION CHECK

       Neon uses stripe_event_id, not id.
       Preserve the payment exception safeguard.
    ========================================= */

    logStage('payment_exception_lookup');

    const reviewRows = await sql`
      SELECT stripe_event_id
      FROM public.salon_stripe_payment_events
      WHERE appointment_id = ${appointmentId}::uuid
        AND processing_status = 'needs_review'
      LIMIT 1
    `;

    if (reviewRows.length) {
      return res.status(409).json({
        success: false,
        error:
          'A payment exception requires review before emailing.',
      });
    }

    const sessionId =
      appointment.stripe_checkout_session_id;

    logStage('stripe_session_lookup');

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
        sessionId
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${stripeKey!.trim()}`,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!stripeResponse.ok) {
      console.error(
        '[Admin Deposit Email] Stripe request rejected',
        {
          appointmentId,
          status: stripeResponse.status,
          requestId:
            stripeResponse.headers.get('request-id'),
        }
      );

      throw new Error(
        `Stripe session verification failed (${stripeResponse.status}).`
      );
    }

    const session =
      (await stripeResponse.json()) as StripeSession;

    logStage('stripe_session_validation');

    const nowSeconds = Math.floor(Date.now() / 1000);

    const deadlineSeconds = Math.floor(
      deadlineMs / 1000
    );

    const validationFailures: string[] = [];

    if (session.livemode !== true) {
      validationFailures.push('session_not_live');
    }

    if (session.id !== sessionId) {
      validationFailures.push('session_id_mismatch');
    }

    if (session.mode !== 'payment') {
      validationFailures.push('invalid_session_mode');
    }

    if (session.status !== 'open') {
      validationFailures.push('session_not_open');
    }

    if (session.payment_status !== 'unpaid') {
      validationFailures.push('session_not_unpaid');
    }

    if (session.payment_intent) {
      validationFailures.push(
        'payment_intent_already_exists'
      );
    }

    if (session.currency !== 'usd') {
      validationFailures.push('currency_mismatch');
    }

    if (session.amount_total !== depositCents) {
      validationFailures.push('deposit_amount_mismatch');
    }

    if (
      session.metadata?.payment_type !==
      'neon_appointment_deposit'
    ) {
      validationFailures.push('payment_type_mismatch');
    }

    if (
      session.metadata?.appointment_id !== appointmentId
    ) {
      validationFailures.push('appointment_id_mismatch');
    }

    if (
      typeof session.expires_at !== 'number' ||
      !Number.isSafeInteger(session.expires_at)
    ) {
      validationFailures.push('invalid_session_expiration');
    } else {
      if (session.expires_at <= nowSeconds) {
        validationFailures.push('session_expired');
      }

      if (session.expires_at > deadlineSeconds) {
        validationFailures.push(
          'session_exceeds_deposit_deadline'
        );
      }
    }

    if (!isValidBalanceCheckoutUrl(session.url)) {
      validationFailures.push('invalid_checkout_url');
    }

    if (validationFailures.length > 0) {
      console.error(
        '[Admin Deposit Email] Stripe validation failed',
        {
          appointmentId,
          failures: validationFailures,
        }
      );

      return res.status(409).json({
        success: false,
        error:
          'The Stripe checkout is unavailable or does not match this approved appointment.',
      });
    }

    if (!isValidBalanceCheckoutUrl(session.url)) {
      return res.status(409).json({
        success: false,
        error: 'The Stripe checkout URL is invalid.',
      });
    }

    logStage('email_preparation');

    const customerName = escapeHtml(
      String(appointment.customer_name ?? 'Customer')
    );

    const date = new Date(`${appointment.appointment_date}T12:00:00Z`);
    const appointmentDate = escapeHtml(Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
      : String(appointment.appointment_date ?? ''));
    const time = /^(\d{2}):(\d{2})/.exec(String(appointment.appointment_time));
    const hour = time ? Number(time[1]) : 0;
    const appointmentTime = escapeHtml(time
      ? `${hour % 12 || 12}:${time[2]} ${hour >= 12 ? 'PM' : 'AM'} ET`
      : String(appointment.appointment_time ?? ''));
    const paymentDeadline = escapeHtml(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short',
    }).format(new Date(Math.min(deadlineMs, session.expires_at! * 1000))) + ' ET');

    const checkoutUrl = escapeHtml(session.url);

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        color: #333333;
        line-height: 1.7;
        max-width: 600px;
        margin: 0 auto;
      ">

        <h2 style="color: #963F60;">
          Your Appointment Has Been Approved!
        </h2>

        <p>Hi ${customerName},</p>

        <p>
          Great news! Your appointment request with
          <strong>InLoveNailz by Briana</strong>
          has been approved.
        </p>

        <p>
          <strong>Date:</strong> ${appointmentDate}<br />
          <strong>Time:</strong> ${appointmentTime}<br />
          <strong>Service Total:</strong> ${money(totalCents)}<br />
          <strong>Deposit Required:</strong> ${money(depositCents)}<br />
          <strong>Pay by:</strong> ${paymentDeadline}
        </p>

        <p>
          To secure your appointment, please pay your
          approved deposit using the secure Stripe
          checkout link below.
        </p>

        <p style="margin: 30px 0; text-align: center;">
          <a
            href="${checkoutUrl}"
            style="
              display: inline-block;
              background: #963F60;
              color: #ffffff;
              text-decoration: none;
              padding: 14px 26px;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            Pay ${money(depositCents)} Deposit
          </a>
        </p>

        <p>
          <strong>Important:</strong>
          Your appointment is not confirmed until
          your deposit payment has been verified.

          This payment link is subject to the approved
          deposit deadline and Stripe checkout expiration.
        </p>

        <p>
          If the button does not work, copy and paste
          this secure link into your browser:
        </p>

        <p style="overflow-wrap: anywhere;">
          <a href="${checkoutUrl}">${checkoutUrl}</a>
        </p>

        <p>
          With love,<br />
          <strong>InLoveNailz by Briana</strong>
        </p>

      </div>
    `;

    logStage('final_appointment_verification');
    const currentRows = await sql`
      SELECT a.id
      FROM public.appointment_requests a
      WHERE a.id = ${appointmentId}::uuid
        AND a.status = 'awaiting_deposit'
        AND a.deposit_paid_at IS NULL
        AND a.stripe_payment_intent_id IS NULL
        AND a.deposit_checkout_claim_id IS NULL
        AND a.deposit_checkout_claim_expires_at IS NULL
        AND a.stripe_checkout_session_id = ${sessionId}
        AND a.total_price = ${totalCents / 100}::numeric
        AND a.deposit_amount = ${depositCents / 100}::numeric
        AND a.deposit_expires_at = ${String(appointment.deposit_expires_at)}::timestamptz
        AND a.deposit_expires_at > now()
        AND to_timestamp(${session.expires_at!}::double precision) > now()
        AND a.customer_email IS NOT DISTINCT FROM ${appointment.customer_email}
        AND a.customer_name IS NOT DISTINCT FROM ${appointment.customer_name}
        AND a.appointment_date::text = ${appointment.appointment_date}
        AND a.appointment_time::text = ${String(appointment.appointment_time)}
        AND NOT EXISTS (
          SELECT 1 FROM public.salon_stripe_payment_events e
          WHERE e.appointment_id = a.id
            AND e.processing_status = 'needs_review'
        )
      LIMIT 1
    `;

    if (!currentRows.length || session.expires_at! * 1000 <= Date.now()) {
      return res.status(409).json({
        success: false,
        error: 'Appointment or checkout changed before emailing. Review before retrying.',
      });
    }

    logStage('resend_request');

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey!.trim()}`,
          'Content-Type': 'application/json',
          'Idempotency-Key':
            `inl-deposit-link-${sessionId}`,
        },
        body: JSON.stringify({
          from: emailFrom!.trim(),
          to: [appointment.customer_email.trim()],
          subject:
            'InLoveNailz | Pay Your Appointment Deposit',
          html,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      }
    );

    logStage('resend_response');

    let emailResult: ResendResponse = {};

    try {
      emailResult =
        (await resendResponse.json()) as ResendResponse;
    } catch {
      console.error(
        '[Admin Deposit Email] Invalid Resend response',
        {
          appointmentId,
          status: resendResponse.status,
        }
      );

      throw new Error(
        'Unable to verify the payment email response.'
      );
    }

    if (
      !resendResponse.ok ||
      typeof emailResult.id !== 'string' ||
      !emailResult.id
    ) {
      console.error(
        '[Admin Deposit Email] Resend acceptance failed',
        {
          appointmentId,
          status: resendResponse.status,
          errorName:
            typeof emailResult.name === 'string' &&
            /^[a-zA-Z0-9_-]{1,80}$/.test(emailResult.name)
              ? emailResult.name
              : 'unknown_error',
        }
      );

      throw new Error(
        `Resend email acceptance could not be verified (${resendResponse.status}).`
      );
    }

    logStage('complete');

    console.info(
      '[Admin Deposit Email] Email accepted by Resend',
      {
        appointmentId,
        emailId: emailResult.id,
      }
    );

    return res.status(200).json({
      success: true,
      appointmentId,
      emailAccepted: true,
      message:
        'Resend accepted the deposit payment email. Delivery is not yet confirmed.',
    });

  } catch (error: unknown) {
    console.error(
      '[Admin Deposit Email] Workflow failed',
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
          /^[a-zA-Z0-9_-]{1,40}$/.test(error.code)
            ? error.code
            : undefined,
      }
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to verify or send the deposit email. Check Stripe and Resend before retrying.',
    });
  }
}