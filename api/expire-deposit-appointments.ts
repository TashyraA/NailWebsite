
import { neon } from '@neondatabase/serverless';

/* =========================================
   INLOVENAILZ BY BRIANA
   AUTOMATIC DEPOSIT EXPIRATION

   STEP 65H.86P

   - Authorized scheduled endpoint
   - Finds expired, unpaid appointments
   - Skips unresolved Checkout claims
   - Skips recorded PaymentIntents
   - Skips payment-review events
   - Verifies Stripe Checkout sessions
   - Expires open unpaid sessions
   - Rechecks Stripe after expiration
   - Uses Neon row-locking cancellation
   - Never issues refunds
   - Never sends payment emails
   - Never marks an appointment paid

   Database cancellation is performed by:
   public.cancel_expired_salon_deposit(
     p_appointment_id,
     p_expected_session_id
   )
========================================= */

const BATCH_SIZE = 25;
const STRIPE_TIMEOUT_MS = 20_000;

type Appointment = {
  id: string;
  stripe_checkout_session_id: string | null;
  deposit_checkout_claim_id: string | null;
  stripe_payment_intent_id: string | null;
};

type StripeSession = {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
  error?: {
    message?: string;
  };
};

type Outcome = 'cancelled' | 'held' | 'failed';

type ProcessingResult = {
  appointmentId: string;
  outcome: Outcome;
  reason: string;
};

/* =====================================
   STRIPE API REQUEST
===================================== */

async function stripeRequest(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST'
): Promise<StripeSession> {
  const response = await fetch(
    `https://api.stripe.com/v1${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        ...(method === 'POST'
          ? {
              'Content-Type':
                'application/x-www-form-urlencoded',
            }
          : {}),
      },
      signal: AbortSignal.timeout(
        STRIPE_TIMEOUT_MS
      ),
      ...(method === 'POST'
        ? { body: '' }
        : {}),
    }
  );

  const data =
    (await response.json()) as StripeSession;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `Stripe request failed (${response.status})`
    );
  }

  return data;
}

/* =====================================
   VERIFY EXPIRED AND UNPAID
===================================== */

function safelyExpiredUnpaid(
  session: StripeSession,
  appointmentId: string,
  sessionId: string
): boolean {
  return (
    session.id === sessionId &&
    session.mode === 'payment' &&
    session.status === 'expired' &&
    session.payment_status === 'unpaid' &&
    !session.payment_intent &&
    session.metadata?.payment_type ===
      'neon_appointment_deposit' &&
    session.metadata?.appointment_id ===
      appointmentId
  );
}

/* =====================================
   PROCESS ONE EXPIRED APPOINTMENT
===================================== */

async function processAppointment(
  sql: ReturnType<typeof neon>,
  stripeKey: string,
  appointment: Appointment
): Promise<ProcessingResult> {
  const appointmentId = appointment.id;

  const held = (reason: string): ProcessingResult => ({
    appointmentId,
    outcome: 'held',
    reason,
  });

  /* =====================================
     RECHECK LOCAL PAYMENT HOLDS
  ===================================== */

  if (appointment.deposit_checkout_claim_id) {
    return held(
      'Unresolved Stripe Checkout claim'
    );
  }

  if (appointment.stripe_payment_intent_id) {
    return held(
      'Recorded PaymentIntent requires review'
    );
  }

  const reviewRows = await sql`
    SELECT 1
    FROM public.salon_stripe_payment_events
    WHERE appointment_id = ${appointmentId}::uuid
      AND processing_status = 'needs_review'
    LIMIT 1
  `;

  if (!Array.isArray(reviewRows)) {
    throw new Error(
      'Unexpected payment review query result.'
    );
  }

  if (reviewRows.length > 0) {
    return held(
      'Payment event requires review'
    );
  }

  const sessionId =
    appointment.stripe_checkout_session_id;

  /* =====================================
     STRIPE SESSION VERIFICATION
  ===================================== */

  if (sessionId) {
    const sessionPath =
      `/checkout/sessions/${encodeURIComponent(
        sessionId
      )}`;

    let session = await stripeRequest(
      stripeKey,
      sessionPath,
      'GET'
    );

    if (
      session.id !== sessionId ||
      session.mode !== 'payment' ||
      session.metadata?.payment_type !==
        'neon_appointment_deposit' ||
      session.metadata?.appointment_id !==
        appointmentId
    ) {
      return held(
        'Stripe Checkout identity mismatch'
      );
    }

    /* =====================================
       NEVER EXPIRE A SESSION WITH
       EVIDENCE OF PAYMENT ACTIVITY
    ===================================== */

    if (
      session.status === 'complete' ||
      session.payment_status !== 'unpaid' ||
      session.payment_intent
    ) {
      return held(
        'Stripe Checkout has possible payment activity'
      );
    }

    /* =====================================
       EXPIRE OPEN SESSION
    ===================================== */

    if (session.status === 'open') {
      try {
        await stripeRequest(
          stripeKey,
          `${sessionPath}/expire`,
          'POST'
        );
      } catch (error) {
        console.error(
          'Stripe expiration needs review:',
          sessionId,
          error
        );

        return held(
          'Stripe expiration could not be verified'
        );
      }

      session = await stripeRequest(
        stripeKey,
        sessionPath,
        'GET'
      );
    }

    /* =====================================
       REQUIRE FINAL STRIPE PROOF
    ===================================== */

    if (
      !safelyExpiredUnpaid(
        session,
        appointmentId,
        sessionId
      )
    ) {
      return held(
        'Stripe Checkout is not verified expired and unpaid'
      );
    }
  }

  /* =====================================
     DATABASE-LEVEL CANCELLATION

     The Neon function:
     - Locks the appointment row
     - Rechecks status and payment
     - Rechecks unresolved claims
     - Rechecks the deposit deadline
     - Rechecks the expected session ID
     - Rechecks payment-review records
     - Adds the expiration notes marker
     - Returns a result string

     Do not directly UPDATE status here.
  ===================================== */

  const cancellationRows = await sql`
    SELECT public.cancel_expired_salon_deposit(
      ${appointmentId}::uuid,
      ${sessionId}::text
    ) AS result
  `;

  if (
    !Array.isArray(cancellationRows) ||
    cancellationRows.length !== 1
  ) {
    throw new Error(
      'Unexpected Neon cancellation result.'
    );
  }

  /* =====================================
     EXPLICITLY VALIDATE RESULT SHAPE

     Neon can infer a union of row arrays
     and object arrays. Narrow the row
     before accessing its result field.
  ===================================== */

  const cancellationRow: unknown =
    cancellationRows[0];

  if (
    cancellationRow === null ||
    typeof cancellationRow !== 'object' ||
    Array.isArray(cancellationRow) ||
    !('result' in cancellationRow)
  ) {
    throw new Error(
      'Neon cancellation returned an invalid row.'
    );
  }

  const result = cancellationRow.result;

  if (result === 'cancelled') {
    return {
      appointmentId,
      outcome: 'cancelled',
      reason: sessionId
        ? 'Stripe Checkout verified expired and unpaid'
        : 'No Checkout session or payment claim recorded',
    };
  }

  if (typeof result === 'string') {
    return held(
      `Database cancellation guard: ${result}`
    );
  }

  throw new Error(
    'Neon cancellation returned an invalid result.'
  );
}

/* =====================================
   SCHEDULED ENDPOINT
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  /* =====================================
     CRON AUTHENTICATION
  ===================================== */

  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    req.headers.authorization !==
      `Bearer ${cronSecret}`
  ) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized.',
    });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!databaseUrl || !stripeKey) {
    return res.status(500).json({
      success: false,
      error: 'Payment configuration unavailable.',
    });
  }

  const sql = neon(databaseUrl);

  try {
    /* =====================================
       SELECT ELIGIBLE APPOINTMENTS

       Skip known unresolved holds before
       applying the batch limit.

       This prevents held appointments
       from monopolizing every cron run.

       The database cancellation function
       independently rechecks safeguards.
    ===================================== */

    const rows = await sql`
      SELECT
        a.id,
        a.stripe_checkout_session_id,
        a.deposit_checkout_claim_id,
        a.stripe_payment_intent_id
      FROM public.appointment_requests a
      WHERE a.status = 'awaiting_deposit'
        AND a.deposit_paid_at IS NULL
        AND a.deposit_expires_at IS NOT NULL
        AND a.deposit_expires_at <= NOW()
        AND a.deposit_checkout_claim_id IS NULL
        AND a.stripe_payment_intent_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.salon_stripe_payment_events e
          WHERE e.appointment_id = a.id
            AND e.processing_status =
              'needs_review'
        )
      ORDER BY
        a.deposit_expires_at ASC,
        a.id ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (!Array.isArray(rows)) {
      throw new Error(
        'Unexpected Neon appointment query result.'
      );
    }

    const results: ProcessingResult[] = [];

    for (const row of rows) {
      const appointment = row as Appointment;

      try {
        const result = await processAppointment(
          sql,
          stripeKey,
          appointment
        );

        results.push(result);
      } catch (error) {
        console.error(
          'Deposit expiration processing failed:',
          appointment.id,
          error
        );

        results.push({
          appointmentId: appointment.id,
          outcome: 'failed',
          reason:
            'Stripe or database reconciliation failed',
        });
      }
    }

    const cancelled = results.filter(
      (result) => result.outcome === 'cancelled'
    ).length;

    const held = results.filter(
      (result) => result.outcome === 'held'
    ).length;

    const failed = results.filter(
      (result) => result.outcome === 'failed'
    ).length;

    return res.status(200).json({
      success: true,
      checked: results.length,
      cancelled,
      held,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      'Automatic deposit expiration failed:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to process expired deposit appointments.',
    });
  }
}
