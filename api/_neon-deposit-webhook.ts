
import { neon } from '@neondatabase/serverless';
import { processPaymentNotification } from './_payment-notifications.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   NEON STRIPE DEPOSIT WEBHOOK

   - Called after Stripe signature verification
   - Retrieves Checkout Session from Stripe
   - Verifies PaymentIntent and successful Charge
   - Distinguishes mismatches from API failures
   - Checks payment timestamps conservatively
   - Flags uncertain deadline cases for review
   - Confirms eligible deposits atomically in Neon
   - Records payment events requiring review
   - Processes queued confirmation notifications
   - Does not change legacy payment handlers

   IMPORTANT:
   Stripe event.created is not an exact
   payment completion timestamp.

   Deadline-boundary cases require review
   rather than automatic rejection.
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StripeDepositEvent = {
  id?: string;
  type?: string;
  created?: number;
  livemode?: boolean;
  data?: {
    object?: {
      id?: string;
      mode?: string;
      payment_status?: string;
      currency?: string;
      amount_total?: number;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
    };
  };
};

type StripeCheckoutSession = {
  id?: string;
  livemode?: boolean;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
};

type StripeCharge = {
  id?: string;
  livemode?: boolean;
  payment_intent?: string | null;
  status?: string;
  paid?: boolean;
  captured?: boolean;
  amount?: number;
  amount_captured?: number;
  amount_refunded?: number;
  refunded?: boolean;
  disputed?: boolean;
  currency?: string;
  created?: number;
};

type StripePaymentIntent = {
  id?: string;
  livemode?: boolean;
  status?: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  capture_method?: string;
  latest_charge?: string | StripeCharge | null;
};

type NotificationJob = {
  id: string;
};

type NeonWebhookResult = {
  received: boolean;
  result: string;
};

type AppointmentDeadline = {
  deposit_expires_at: string | Date | null;
};

/* =====================================
   PAYMENT VERIFICATION ERRORS
===================================== */

class PaymentMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentMismatchError';
  }
}

/* =====================================
   VALIDATE STRIPE TIMESTAMPS
===================================== */

function validUnixSeconds(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value * 1000 <= Date.now() + 300000
  );
}

/* =====================================
   FETCH STRIPE API RESOURCE

   Network, timeout, API, and malformed
   response failures remain retryable.
===================================== */

async function fetchStripeResource<T>(
  path: string
): Promise<T> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripeKey || !/^(sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)) {
    throw new Error(
      'A LIVE Stripe secret key is required'
    );
  }

  const response = await fetch(
    `https://api.stripe.com/v1${path}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Stripe verification API returned HTTP ${response.status}`
    );
  }

  return (await response.json()) as T;
}

/* =====================================
   VERIFY CHECKOUT SESSION

   Independently retrieves the session
   rather than relying only on webhook
   payload details.
===================================== */

async function verifyCheckoutSession(
  sessionId: string,
  appointmentId: string,
  paymentIntentId: string,
  expectedAmount: number
): Promise<void> {
  const session =
    await fetchStripeResource<StripeCheckoutSession>(
      `/checkout/sessions/${encodeURIComponent(
        sessionId
      )}`
    );

  if (
    session.id !== sessionId ||
    session.livemode !== true ||
    session.mode !== 'payment' ||
    session.status !== 'complete' ||
    session.payment_status !== 'paid' ||
    session.currency !== 'usd' ||
    session.amount_total !== expectedAmount ||
    session.payment_intent !== paymentIntentId ||
    session.metadata?.payment_type !==
      'neon_appointment_deposit' ||
    session.metadata?.appointment_id !== appointmentId
  ) {
    throw new PaymentMismatchError(
      'Checkout Session does not match the expected paid appointment deposit'
    );
  }
}

/* =====================================
   VERIFY PAYMENT INTENT AND CHARGE

   Return the verified Charge creation
   timestamp for consistency checks.

   Charge creation is NOT treated as
   the exact successful payment time.
===================================== */

async function verifyPaymentIntent(
  paymentIntentId: string,
  expectedAmount: number
): Promise<number> {
  const intent =
    await fetchStripeResource<StripePaymentIntent>(
      `/payment_intents/${encodeURIComponent(
        paymentIntentId
      )}?expand[]=latest_charge`
    );

  const charge =
    intent.latest_charge &&
    typeof intent.latest_charge === 'object'
      ? intent.latest_charge
      : null;

  if (
    intent.id !== paymentIntentId ||
    intent.livemode !== true ||
    intent.status !== 'succeeded' ||
    intent.currency !== 'usd' ||
    intent.amount !== expectedAmount ||
    intent.amount_received !== expectedAmount ||
    !(
      intent.capture_method === 'automatic' ||
      intent.capture_method === 'automatic_async'
    ) ||
    !charge ||
    typeof charge.id !== 'string' ||
    !/^ch_[A-Za-z0-9]+$/.test(charge.id) ||
    charge.livemode !== true ||
    charge.amount_refunded !== 0 ||
    charge.refunded !== false ||
    charge.disputed !== false ||
    charge.payment_intent !== paymentIntentId ||
    charge.status !== 'succeeded' ||
    charge.paid !== true ||
    charge.captured !== true ||
    charge.amount !== expectedAmount ||
    charge.amount_captured !== expectedAmount ||
    charge.currency !== 'usd' ||
    !validUnixSeconds(charge.created)
  ) {
    throw new PaymentMismatchError(
      'PaymentIntent or Charge does not match the expected successful payment'
    );
  }

  return charge.created;
}

/* =====================================
   PROCESS CONFIRMATION NOTIFICATIONS
===================================== */

async function processDepositNotifications(
  eventId: string,
  appointmentId: string
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      'Notification processing skipped: DATABASE_URL missing'
    );
    return;
  }

  try {
    const sql = neon(databaseUrl);

    const jobs = (await sql`
      SELECT id
      FROM public.salon_payment_notifications
      WHERE stripe_event_id = ${eventId}
        AND appointment_id = ${appointmentId}::uuid
        AND notification_type IN (
          'customer_deposit_confirmation',
          'business_deposit_confirmation'
        )
        AND status = 'pending'
        AND claim_id IS NULL
      ORDER BY
        CASE notification_type
          WHEN 'customer_deposit_confirmation'
            THEN 1
          ELSE 2
        END
      LIMIT 2
    `) as NotificationJob[];

    for (const job of jobs) {
      try {
        const result =
          await processPaymentNotification(job.id);

        if (!result.success) {
          console.error(
            'Deposit notification not sent:',
            job.id,
            result.status
          );
        }
      } catch (error) {
        console.error(
          'Deposit notification processing failed:',
          job.id,
          error instanceof Error
            ? error.name
            : 'Unknown error'
        );
      }
    }
  } catch (error) {
    console.error(
      'Unable to load deposit notifications:',
      eventId,
      error instanceof Error
        ? error.name
        : 'Unknown error'
    );
  }
}

/* =====================================
   HANDLE NEON DEPOSIT WEBHOOK
===================================== */

export async function handleNeonDepositWebhook(
  event: StripeDepositEvent
): Promise<NeonWebhookResult> {
  // Never let test events alter production appointment records.
  if (event.livemode === false) {
    return { received: true, result: 'ignored_test_mode' };
  }
  if (event.livemode !== true) {
    throw new Error('Stripe event mode is unavailable');
  }
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured'
    );
  }

  const sql = neon(databaseUrl);

  const session = event.data?.object;
  const metadata = session?.metadata || {};

  const eventId = event.id;
  const sessionId = session?.id;
  const appointmentId = metadata.appointment_id;
  const paymentIntentId = session?.payment_intent;
  const amountCents = session?.amount_total;

  if (
    typeof eventId !== 'string' ||
    !/^evt_[A-Za-z0-9]+$/.test(eventId) ||
    typeof sessionId !== 'string' ||
    !/^cs_live_[A-Za-z0-9]+$/.test(sessionId)
  ) {
    throw new Error(
      'Invalid Stripe event or session identifier'
    );
  }

  const validAppointmentId =
    typeof appointmentId === 'string' &&
    UUID_PATTERN.test(appointmentId);

  const validPaymentIntent =
    typeof paymentIntentId === 'string' &&
    /^pi_[A-Za-z0-9]+$/.test(paymentIntentId);

  const validAmount =
    typeof amountCents === 'number' &&
    Number.isSafeInteger(amountCents) &&
    amountCents >= 50 &&
    amountCents <= 99_999_999;

  const validEventTime =
    validUnixSeconds(event.created);

  /* =====================================
     RECORD A PAYMENT EXCEPTION
  ===================================== */

  async function recordException(
    reason: string
  ): Promise<NeonWebhookResult> {
    await sql`
      INSERT INTO public.salon_stripe_payment_events (
        stripe_event_id,
        stripe_checkout_session_id,
        appointment_id,
        event_type,
        processing_status,
        payment_amount_cents,
        processed_at,
        error_message
      )
      VALUES (
        ${eventId},
        ${sessionId},
        ${
          validAppointmentId
            ? appointmentId
            : null
        }::uuid,
        ${event.type || 'unknown'},
        'needs_review',
        ${validAmount ? amountCents : null},
        NOW(),
        ${reason.slice(0, 500)}
      )
      ON CONFLICT (stripe_event_id)
      DO UPDATE SET
        processing_status =
          CASE
            WHEN public.salon_stripe_payment_events.processing_status
              = 'processed'
            THEN 'processed'
            ELSE 'needs_review'
          END,
        processed_at = NOW(),
        error_message =
          CASE
            WHEN public.salon_stripe_payment_events.processing_status
              = 'processed'
            THEN NULL
            ELSE EXCLUDED.error_message
          END
    `;

    console.error(
      'Neon deposit payment needs review:',
      eventId,
      sessionId,
      reason
    );

    return {
      received: true,
      result: 'needs_review',
    };
  }

  /* =====================================
     VALIDATE SIGNED EVENT DETAILS
  ===================================== */

  if (
    event.type !== 'checkout.session.completed' ||
    session?.mode !== 'payment' ||
    session.payment_status !== 'paid' ||
    session.currency !== 'usd' ||
    metadata.payment_type !== 'neon_appointment_deposit' ||
    !validAppointmentId ||
    !validPaymentIntent ||
    !validAmount ||
    !validEventTime
  ) {
    return recordException(
      'Invalid or incomplete Stripe payment details'
    );
  }

  /* =====================================
     VERIFY DIRECTLY WITH STRIPE

     Permanent mismatches -> needs_review
     API/network failures -> throw for retry
  ===================================== */

  const previousEvents = await sql`
    SELECT processing_status, stripe_checkout_session_id,
           appointment_id, payment_amount_cents
    FROM public.salon_stripe_payment_events
    WHERE stripe_event_id = ${eventId}
    LIMIT 1
  `;
  const previous = previousEvents[0];
  if (previous) {
    if (previous.stripe_checkout_session_id !== sessionId ||
        previous.appointment_id !== appointmentId ||
        Number(previous.payment_amount_cents) !== amountCents) {
      console.error('Deposit event identity conflict:', eventId);
      return { received: true, result: 'needs_review' };
    }
    if (previous.processing_status === 'processed') {
      await processDepositNotifications(eventId, appointmentId);
      return { received: true, result: 'already_confirmed' };
    }
    if (previous.processing_status === 'needs_review') {
      return { received: true, result: 'needs_review' };
    }
  }

  let chargeCreated: number;

  try {
    await verifyCheckoutSession(
      sessionId,
      appointmentId,
      paymentIntentId,
      amountCents
    );

    chargeCreated = await verifyPaymentIntent(
      paymentIntentId,
      amountCents
    );
  } catch (error) {
    if (error instanceof PaymentMismatchError) {
      return recordException(error.message);
    }

    // Let the main webhook return HTTP 500.
    // Stripe can retry temporary failures.
    throw error;
  }

  /* =====================================
     CHECK STRIPE TIMESTAMP CONSISTENCY

     The Charge should not have been
     created after the completed-session
     event.

     Unexpected ordering requires review.
  ===================================== */

  if (chargeCreated > event.created) {
    return recordException(
      'Stripe Charge creation time is later than the completed Checkout event; payment timing requires review'
    );
  }

  /* =====================================
     READ THE STORED DEPOSIT DEADLINE

     This is a read-only database query.

     The Neon confirmation function remains
     responsible for the final atomic
     appointment state transition.
  ===================================== */

  const deadlineRows = await sql`
    SELECT
      deposit_expires_at
    FROM public.appointment_requests
    WHERE id = ${appointmentId}::uuid
    LIMIT 1
  `;

  if (!deadlineRows.length) {
    return recordException(
      'Verified Stripe payment references an appointment that was not found'
    );
  }

  const appointmentDeadline =
    deadlineRows[0] as AppointmentDeadline;

  const deadlineValue =
    appointmentDeadline.deposit_expires_at;

  if (deadlineValue === null) {
    return recordException(
      'Verified Stripe payment has no recorded deposit deadline; manual payment review required'
    );
  }

  const deadlineMilliseconds =
    deadlineValue instanceof Date
      ? deadlineValue.getTime()
      : Date.parse(String(deadlineValue));

  if (!Number.isFinite(deadlineMilliseconds)) {
    return recordException(
      'Verified Stripe payment has an invalid deposit deadline; manual payment review required'
    );
  }

  /* =====================================
     CONSERVATIVE DEADLINE HANDLING

     Stripe event.created identifies when
     Stripe created the webhook event.

     It is not the exact time the customer
     completed payment.

     If the event was created at or after
     the deadline, payment may still have
     completed before the deadline.

     Do not automatically confirm or reject
     that payment. Record it for review.

     The appointment must not be released
     until the separate expiration process
     reconciles this payment exception.
  ===================================== */

  const eventCreatedMilliseconds =
    event.created * 1000;

  if (
    eventCreatedMilliseconds >=
    deadlineMilliseconds
  ) {
    return recordException(
      'Verified Stripe payment requires deadline review: Checkout completion event was created at or after the deposit deadline'
    );
  }

  /* =====================================
     ATOMIC NEON CONFIRMATION

     Only an event timestamp strictly
     before the stored deadline reaches
     the existing six-argument function.

     Neon must still verify the current
     appointment state, Stripe identifiers,
     payment amount, and deadline.

     The event timestamp remains a
     conservative proxy, not an exact
     payment completion timestamp.

     If the appointment changed after
     our deadline read, Neon decides
     whether confirmation is allowed.
  ===================================== */

  const eventCreatedAt =
    new Date(eventCreatedMilliseconds).toISOString();

  const confirmationRows = await sql`
    SELECT public.confirm_salon_deposit(
      ${eventId}::text,
      ${sessionId}::text,
      ${appointmentId}::uuid,
      ${paymentIntentId}::text,
      ${amountCents}::integer,
      ${eventCreatedAt}::timestamptz
    ) AS result
  `;

  const result = confirmationRows[0]?.result;
  if (typeof result !== 'string') {
    throw new Error('Deposit confirmation result unavailable');
  }

  const accepted =
    result === 'confirmed' ||
    result === 'already_confirmed';

  /* =====================================
     RECORD PAYMENT EVENT RESULT
  ===================================== */

  await sql`
    INSERT INTO public.salon_stripe_payment_events (
      stripe_event_id,
      stripe_checkout_session_id,
      appointment_id,
      event_type,
      processing_status,
      payment_amount_cents,
      processed_at,
      error_message
    )
    VALUES (
      ${eventId},
      ${sessionId},
      ${appointmentId}::uuid,
      ${event.type || 'unknown'},
      ${accepted ? 'processed' : 'needs_review'},
      ${amountCents},
      NOW(),
      ${accepted ? null : result}
    )
    ON CONFLICT (stripe_event_id)
    DO UPDATE SET
      processing_status =
        EXCLUDED.processing_status,
      processed_at =
        EXCLUDED.processed_at,
      error_message =
        EXCLUDED.error_message
    WHERE public.salon_stripe_payment_events.stripe_checkout_session_id
          = EXCLUDED.stripe_checkout_session_id
      AND public.salon_stripe_payment_events.appointment_id
          IS NOT DISTINCT FROM EXCLUDED.appointment_id
      AND (public.salon_stripe_payment_events.processing_status <> 'processed'
           OR EXCLUDED.processing_status = 'processed')
  `;

  if (!accepted) {
    console.error(
      'Neon deposit payment requires review:',
      {
        eventId,
        sessionId,
        appointmentId,
        result,
      }
    );

    return {
      received: true,
      result,
    };
  }

  /* =====================================
     BEST-EFFORT CONFIRMATION EMAILS
  ===================================== */

  await processDepositNotifications(
    eventId,
    appointmentId
  );

  return {
    received: true,
    result,
  };
}
