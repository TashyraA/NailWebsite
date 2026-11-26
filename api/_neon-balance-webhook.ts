
import { neon } from '@neondatabase/serverless';

import {
  BALANCE_PAYMENT_TYPE,
  isValidBalanceAppointmentId,
  isValidBalanceSessionId,
  isValidBalancePaymentIntentId,
  isPayableBalanceAmount,
  retrieveBalanceSession,
  retrieveBalancePaymentIntent,
} from './_neon-balance-payment.js';

import {
  processPaymentNotification,
} from './_payment-notifications.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   VERIFIED NEON BALANCE PAYMENT WEBHOOK

   - Independent Stripe payment verification
   - Checkout Session verification
   - PaymentIntent verification
   - Captured charge verification
   - Exact payment amount validation
   - Appointment ownership verification
   - Atomic Neon payment confirmation
   - Duplicate webhook protection
   - Payment exception tracking
   - Customer and business notifications
   - Preserves original deposit payments
   - Never automatically issues refunds
========================================= */

type StripeBalanceEvent = {
  id?: string;
  type?: string;
  created?: number;
  livemode?: boolean;

  data?: {
    object?: {
      id?: string;
      livemode?: boolean;
      mode?: string;
      payment_status?: string;
      currency?: string;
      amount_total?: number;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
    };
  };
};

type BalanceWebhookResult = {
  received: boolean;
  result: string;
};

type NotificationJob = {
  id: string;
};

type ConfirmationResult = {
  result: string;
};

type Database = ReturnType<typeof neon>;

const EVENT_ID_PATTERN =
  /^evt_[A-Za-z0-9]+$/;

const CHARGE_ID_PATTERN =
  /^ch_[A-Za-z0-9]+$/;

/* =====================================
   PAYMENT VERIFICATION ERROR

   Definitive payment mismatches require
   manual review.

   Temporary API and database failures
   must propagate to the main webhook
   so Stripe can retry delivery.
===================================== */

class BalancePaymentMismatchError
  extends Error {
  constructor(message: string) {
    super(message);

    this.name =
      'BalancePaymentMismatchError';
  }
}

/* =====================================
   VALIDATE STRIPE TIMESTAMP
===================================== */

function validUnixSeconds(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <=
      Math.floor(Date.now() / 1000) + 300
  );
}

/* =====================================
   RECORD PAYMENT EXCEPTION

   Preserve previously processed events.

   Never silently discard a verified
   Stripe event that requires review.
===================================== */

async function recordPaymentException(
  sql: Database,
  eventId: string,
  sessionId: string,
  appointmentId: string | null,
  eventType: string,
  amountCents: number | null,
  reason: string
): Promise<void> {
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
      ${eventType},
      'needs_review',
      ${amountCents},
      NOW(),
      ${reason.slice(0, 500)}
    )

    ON CONFLICT (stripe_event_id)

    DO UPDATE SET

      processing_status =
        'needs_review',

      processed_at =
        NOW(),

      error_message =
        EXCLUDED.error_message

    WHERE
      public.salon_stripe_payment_events.processing_status
        <> 'processed'
  `;
}

/* =====================================
   RECORD SUCCESSFULLY PROCESSED EVENT
===================================== */

async function recordProcessedEvent(
  sql: Database,
  eventId: string,
  sessionId: string,
  appointmentId: string,
  eventType: string,
  amountCents: number
): Promise<void> {
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
      ${eventType},
      'processed',
      ${amountCents},
      NOW(),
      NULL
    )

    ON CONFLICT (stripe_event_id)

    DO UPDATE SET

      processing_status =
        'processed',

      processed_at =
        NOW(),

      error_message =
        NULL

    WHERE
      public.salon_stripe_payment_events.stripe_checkout_session_id
        = EXCLUDED.stripe_checkout_session_id

      AND
      public.salon_stripe_payment_events.appointment_id
        IS NOT DISTINCT FROM
        EXCLUDED.appointment_id
  `;
}

/* =====================================
   VERIFY STRIPE CHECKOUT SESSION

   Never rely exclusively on the
   original webhook payload.
===================================== */

async function verifyCheckoutSession(
  sessionId: string,
  appointmentId: string,
  paymentIntentId: string,
  amountCents: number
): Promise<void> {
  const session =
    await retrieveBalanceSession(
      sessionId
    );

  if (
    session.id !== sessionId ||

    session.livemode !== true ||

    session.mode !== 'payment' ||

    session.status !== 'complete' ||

    session.payment_status !== 'paid' ||

    session.currency !== 'usd' ||

    session.amount_total !== amountCents ||

    session.payment_intent !==
      paymentIntentId ||

    session.metadata?.payment_type !==
      BALANCE_PAYMENT_TYPE ||

    session.metadata?.appointment_id !==
      appointmentId
  ) {
    throw new BalancePaymentMismatchError(
      'Stripe balance Checkout Session verification failed.'
    );
  }
}

/* =====================================
   VERIFY STRIPE PAYMENT INTENT

   Require an actual successful,
   captured USD payment for the
   exact outstanding balance.
===================================== */

async function verifyPaymentIntent(
  paymentIntentId: string,
  amountCents: number
): Promise<number> {
  const intent =
    await retrieveBalancePaymentIntent(
      paymentIntentId
    );

  if (
    intent.id !== paymentIntentId ||

    intent.livemode !== true ||

    intent.status !== 'succeeded' ||

    intent.currency !== 'usd' ||

    intent.amount !== amountCents ||

    intent.amount_received !==
      amountCents ||

    (
      intent.capture_method !==
        'automatic' &&

      intent.capture_method !==
        'automatic_async'
    )
  ) {
    throw new BalancePaymentMismatchError(
      'Stripe balance PaymentIntent verification failed.'
    );
  }

  /* =====================================
     VERIFY EXPANDED STRIPE CHARGE
  ===================================== */

  const charge =
    intent.latest_charge;

  if (
    !charge ||
    typeof charge !== 'object'
  ) {
    throw new BalancePaymentMismatchError(
      'Verified balance payment charge is unavailable.'
    );
  }

  if (
    typeof charge.id !== 'string' ||

    !CHARGE_ID_PATTERN.test(
      charge.id
    ) ||

    charge.payment_intent !==
      paymentIntentId ||

    charge.status !== 'succeeded' ||

    charge.paid !== true ||

    charge.captured !== true ||

    charge.currency !== 'usd' ||

    charge.amount !== amountCents ||

    charge.amount_captured !==
      amountCents ||

    charge.amount_refunded !== 0 ||

    charge.refunded !== false ||

    charge.livemode !== true ||

    charge.disputed !== false ||

    !validUnixSeconds(
      charge.created
    )
  ) {
    throw new BalancePaymentMismatchError(
      'Stripe balance charge verification failed.'
    );
  }

  return charge.created;
}

/* =====================================
   PROCESS BALANCE NOTIFICATIONS

   Payment confirmation remains valid
   even if an email cannot be sent.

   Pending notification jobs remain
   available to the scheduled processor.
===================================== */

async function processBalanceNotifications(
  sql: Database,
  eventId: string,
  appointmentId: string
): Promise<void> {
  try {
    const jobs = (await sql`
      SELECT id

      FROM public.salon_payment_notifications

      WHERE stripe_event_id =
        ${eventId}

        AND appointment_id =
          ${appointmentId}::uuid

        AND notification_type IN (
          'customer_balance_confirmation',
          'business_balance_confirmation'
        )

        AND status = 'pending'

        AND claim_id IS NULL

      ORDER BY
        CASE
          WHEN notification_type =
            'customer_balance_confirmation'
          THEN 0
          ELSE 1
        END

      LIMIT 2
    `) as NotificationJob[];

    for (const job of jobs) {
      try {
        await processPaymentNotification(
          job.id
        );
      } catch (error: unknown) {
        console.error(
          'Balance notification processing failed.',
          {
            notificationId: job.id,

            errorType:
              error instanceof Error
                ? error.name
                : 'Unknown error',
          }
        );
      }
    }
  } catch (error: unknown) {
    console.error(
      'Balance notification lookup failed.',
      {
        eventId,

        errorType:
          error instanceof Error
            ? error.name
            : 'Unknown error',
      }
    );
  }
}

/* =====================================
   HANDLE VERIFIED STRIPE BALANCE EVENT

   IMPORTANT:

   This function must only be called
   after the main Stripe webhook has
   verified the Stripe signature.
===================================== */

export async function handleNeonBalanceWebhook(
  event: StripeBalanceEvent
): Promise<BalanceWebhookResult> {
  // Never write test-mode events to the production database.
  if (event.livemode === false) {
    return { received: true, result: 'ignored_test_mode' };
  }

  if (event.livemode !== true) {
    throw new Error('Stripe balance event mode is unavailable.');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey || !/^(sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)) {
    throw new Error('LIVE Stripe credentials are required.');
  }

  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured.'
    );
  }

  const sql = neon(databaseUrl);

  const eventId =
    event.id;

  const eventType =
    event.type;

  const eventCreated =
    event.created;

  const session =
    event.data?.object;

  const sessionId =
    session?.id;

  const appointmentId =
    session?.metadata?.appointment_id;

  const paymentIntentId =
    session?.payment_intent;

  const amountCents =
    session?.amount_total;

  /* =====================================
     VERIFY EVENT IDENTIFIERS

     Invalid identifiers cannot safely
     be recorded as a normal payment event.
  ===================================== */

  if (
    typeof eventId !== 'string' ||

    !EVENT_ID_PATTERN.test(eventId) ||

    eventType !==
      'checkout.session.completed' ||

    !isValidBalanceSessionId(
      sessionId
    )
  ) {
    throw new Error(
      'Invalid Stripe balance event identifiers.'
    );
  }

  /* =====================================
     VALIDATE WEBHOOK PAYMENT DETAILS
  ===================================== */

  if (
    !session ||

    session.mode !== 'payment' ||

    session.payment_status !== 'paid' ||

    session.currency !== 'usd' ||

    session.metadata?.payment_type !==
      BALANCE_PAYMENT_TYPE ||

    !isValidBalanceAppointmentId(
      appointmentId
    ) ||

    !isValidBalancePaymentIntentId(
      paymentIntentId
    ) ||

    !isPayableBalanceAmount(
      amountCents
    ) ||

    !validUnixSeconds(
      eventCreated
    ) ||

    session.livemode !== true ||

    !sessionId.startsWith('cs_live_')
  ) {
    await recordPaymentException(
      sql,
      eventId,
      sessionId,

      isValidBalanceAppointmentId(
        appointmentId
      )
        ? appointmentId
        : null,

      eventType,

      isPayableBalanceAmount(
        amountCents
      )
        ? amountCents
        : null,

      'Invalid balance payment webhook details.'
    );

    return {
      received: true,
      result: 'needs_review',
    };
  }

  /* =====================================
     CHECK PREVIOUS EVENT PROCESSING

     Stripe may deliver the same event
     more than once.

     Previously verified events must
     not record another payment.
  ===================================== */

  const previousEvents = await sql`
    SELECT
      processing_status,
      stripe_checkout_session_id,
      appointment_id,
      payment_amount_cents

    FROM public.salon_stripe_payment_events

    WHERE stripe_event_id =
      ${eventId}

    LIMIT 1
  `;

  if (
    previousEvents.length > 0
  ) {
    const previous =
      previousEvents[0];

    if (
      previous.stripe_checkout_session_id
        !== sessionId ||

      previous.appointment_id
        !== appointmentId ||

      Number(
        previous.payment_amount_cents
      ) !== amountCents
    ) {
      console.error(
        'Stripe balance event identity conflict.',
        { eventId }
      );

      return {
        received: true,
        result: 'needs_review',
      };
    }

    if (
      previous.processing_status ===
        'processed'
    ) {
      await processBalanceNotifications(
        sql,
        eventId,
        appointmentId
      );

      return {
        received: true,
        result: 'already_confirmed',
      };
    }

    if (
      previous.processing_status ===
        'needs_review'
    ) {
      return {
        received: true,
        result: 'needs_review',
      };
    }
  }

  /* =====================================
     INDEPENDENT STRIPE VERIFICATION
  ===================================== */

  try {
    await verifyCheckoutSession(
      sessionId,
      appointmentId,
      paymentIntentId,
      amountCents
    );

    const chargeCreated =
      await verifyPaymentIntent(
        paymentIntentId,
        amountCents
      );

    if (
      chargeCreated > eventCreated
    ) {
      throw new BalancePaymentMismatchError(
        'Balance payment timing requires verification.'
      );
    }
  } catch (error: unknown) {
    if (
      error instanceof
        BalancePaymentMismatchError
    ) {
      await recordPaymentException(
        sql,
        eventId,
        sessionId,
        appointmentId,
        eventType,
        amountCents,
        error.message
      );

      return {
        received: true,
        result: 'needs_review',
      };
    }

    /*
       Network failures, Stripe API
       failures, and other uncertain
       errors must propagate.

       The main webhook will return
       a failure response so Stripe
       can retry delivery.
    */

    throw error;
  }

  /* =====================================
     PREPARE VERIFIED PAYMENT TIMESTAMP

     Use the Stripe event creation time
     as the confirmation timestamp.

     This is not necessarily the exact
     instant the customer's card was
     charged.
  ===================================== */

  const paidAt = new Date(
    eventCreated * 1000
  ).toISOString();

  /* =====================================
     ATOMIC DATABASE CONFIRMATION

     The Neon function verifies:

     - Confirmed appointment
     - Previously verified deposit
     - Exact remaining balance
     - Matching Stripe session
     - No existing balance payment
     - No unresolved checkout claim
     - No cancelled appointment
     - Duplicate payment protection

     It records the balance payment
     and queues both email jobs in
     the same database transaction.
  ===================================== */

  const confirmationRows = (
    await sql`
      SELECT public.confirm_salon_balance(
        ${eventId}::text,

        ${sessionId}::text,

        ${appointmentId}::uuid,

        ${paymentIntentId}::text,

        ${amountCents}::integer,

        ${paidAt}::timestamptz
      ) AS result
    `
  ) as ConfirmationResult[];

  const confirmationResult =
    confirmationRows[0]?.result;

  if (
    typeof confirmationResult !==
      'string'
  ) {
    throw new Error(
      'Balance confirmation result is unavailable.'
    );
  }

  /* =====================================
     HANDLE PAYMENT EXCEPTIONS
  ===================================== */

  if (
    confirmationResult !==
      'confirmed' &&

    confirmationResult !==
      'already_confirmed'
  ) {
    await recordPaymentException(
      sql,
      eventId,
      sessionId,
      appointmentId,
      eventType,
      amountCents,

      `Balance confirmation requires review: ${confirmationResult}`
    );

    console.error(
      'Balance payment requires review.',
      {
        eventId,
        appointmentId,
        result: confirmationResult,
      }
    );

    return {
      received: true,
      result: 'needs_review',
    };
  }

  /* =====================================
     RECORD SUCCESSFUL EVENT PROCESSING
  ===================================== */

  await recordProcessedEvent(
    sql,
    eventId,
    sessionId,
    appointmentId,
    eventType,
    amountCents
  );

  /* =====================================
     PROCESS CUSTOMER AND BUSINESS
     PAYMENT CONFIRMATION EMAILS
  ===================================== */

  await processBalanceNotifications(
    sql,
    eventId,
    appointmentId
  );

  /* =====================================
     SUCCESS RESPONSE
  ===================================== */

  return {
    received: true,
    result: confirmationResult,
  };
}
