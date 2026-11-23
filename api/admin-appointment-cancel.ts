
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE ADMIN APPOINTMENT CANCELLATION

   - Administrator authentication required
   - Same-origin POST protection
   - Require a cancellation reason
   - Cancel awaiting-deposit appointments
   - Cancel confirmed appointments
   - Preserve appointment/payment history
   - Release reserved appointment times
   - Never automatically issue refunds
   - Never automatically email customers
========================================= */

const MAX_REQUEST_BYTES = 10_000;
const MAX_REASON_LENGTH = 1000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CancellationRequest = {
  appointmentId?: unknown;
  reason?: unknown;
};

type CancellationResult = {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  customer_name: string;
  customer_email: string;
  deposit_amount: string | number | null;
  deposit_paid: string | number | null;
  deposit_paid_at: string | null;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  /* =====================================
     ONLY ACCEPT POST REQUESTS
  ===================================== */

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  /* =====================================
     VERIFY ADMIN SESSION

     The existing authentication helper
     also enforces same-origin protection
     for state-changing requests.
  ===================================== */

  if (!requireAdmin(req, res, true)) {
    return;
  }

  try {
    /* =====================================
       VALIDATE REQUEST BODY
    ===================================== */

    const rawBody: unknown = req.body;

    if (!isRecord(rawBody)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cancellation request.',
      });
    }

    const bodySize = Buffer.byteLength(
      JSON.stringify(rawBody),
      'utf8'
    );

    if (bodySize > MAX_REQUEST_BYTES) {
      return res.status(413).json({
        success: false,
        error: 'Cancellation request is too large.',
      });
    }

    const body = rawBody as CancellationRequest;

    const appointmentId = body.appointmentId;

    if (
      typeof appointmentId !== 'string' ||
      !UUID_PATTERN.test(appointmentId)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID.',
      });
    }

    /* =====================================
       REQUIRE A CANCELLATION REASON
    ===================================== */

    if (typeof body.reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a cancellation reason.',
      });
    }

    const reason = body.reason.trim();

    if (
      reason.length < 3 ||
      reason.length > MAX_REASON_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Enter a cancellation reason between 3 and 1000 characters.',
      });
    }

    /* =====================================
       CONNECT TO NEON
    ===================================== */

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured.'
      );
    }

    const sql = neon(databaseUrl);

    /* =====================================
       CANCEL ELIGIBLE APPOINTMENTS

       Only these statuses may transition
       to cancelled:

       - awaiting_deposit
       - confirmed

       Pending requests use the existing
       Decline action.

       The cancellation reason is appended
       to the existing notes field to
       preserve the original customer notes.

       Do not erase payment information.

       The existing availability queries
       only reserve awaiting_deposit and
       confirmed appointments, so changing
       the status to cancelled releases
       the appointment time.
    ===================================== */

    const cancellationEntry =
      `[ADMIN CANCELLATION]\n` +
      `Reason: ${reason}\n` +
      `Cancelled at: recorded in UTC by database`;

    const result = await sql`
      UPDATE appointment_requests

      SET
        status = 'cancelled',

        notes = CONCAT_WS(
          E'\n\n',
          NULLIF(notes, ''),
          ${cancellationEntry} ||
          E'\nTimestamp (UTC): ' ||
          TO_CHAR(
            NOW() AT TIME ZONE 'UTC',
            'YYYY-MM-DD HH24:MI:SS'
          )
        ),

        updated_at = NOW(),

        review_token_hash = NULL,

        review_token_expires_at = NULL

      WHERE id = ${appointmentId}::uuid

        AND status IN (
          'awaiting_deposit',
          'confirmed'
        )

      RETURNING
        id,
        status,
        appointment_date::text
          AS appointment_date,
        appointment_time,
        customer_name,
        customer_email,
        deposit_amount,
        deposit_paid,
        deposit_paid_at
    `;

    /* =====================================
       HANDLE INELIGIBLE APPOINTMENTS
    ===================================== */

    if (result.length === 0) {
      return res.status(409).json({
        success: false,
        error:
          'This appointment cannot be cancelled. It may already be cancelled, completed, declined, pending, or no longer available. Refresh the appointment list.',
      });
    }

    const appointment =
      result[0] as CancellationResult;

    const depositPaid = Number(
      appointment.deposit_paid ?? 0
    );

    const hasPaidDeposit =
      appointment.deposit_paid_at !== null &&
      depositPaid > 0;

    /* =====================================
       SUCCESS RESPONSE

       No Stripe refund is initiated.
       No customer email is sent.
    ===================================== */

    return res.status(200).json({
      success: true,

      message: hasPaidDeposit
        ? 'Appointment cancelled and its time released. A deposit was previously paid. Review the payment and handle any refund separately.'
        : 'Appointment cancelled successfully. Its reserved time is now available again.',

      appointment: {
        id: appointment.id,
        status: appointment.status,
        appointmentDate:
          appointment.appointment_date,
        appointmentTime:
          appointment.appointment_time,
        customerName:
          appointment.customer_name,
        customerEmail:
          appointment.customer_email,
        depositAmount:
          appointment.deposit_amount === null
            ? null
            : Number(appointment.deposit_amount),
        depositPaid,
        hasPaidDeposit,
        cancellationReason: reason,
      },

      refundRequiredReview: hasPaidDeposit,

      refundAutomaticallyIssued: false,

      customerAutomaticallyNotified: false,
    });

  } catch (error: unknown) {
    console.error(
      'Admin appointment cancellation error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to cancel the appointment. Please try again.',
    });
  }
}
