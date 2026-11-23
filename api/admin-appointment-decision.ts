
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

/* =========================================
   INLOVENAILZ BY BRIANA

   SECURE APPOINTMENT DECISION API

   - Administrator access required
   - Same-origin protection
   - Approve with custom deposit
   - Decline pending requests
   - Read dynamic weekly schedule
   - Respect date-specific overrides
   - Respect blocked days and hours
   - Validate appointment duration
   - Enforce 24-hour advance notice
   - Maintain 15-minute appointment buffer
   - Prevent overlapping reservations
   - No Stripe payment in this step
========================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 10_000;
const MINIMUM_NOTICE_HOURS = 24;
const SLOT_DURATION_MINUTES = 120;
const BUFFER_MINUTES = 15;

type DecisionBody = {
  appointmentId?: unknown;
  action?: unknown;
  depositAmount?: unknown;
};

type DecisionRow = {
  id: string;
  status: string;
  deposit_amount: string | number | null;
  appointment_date: string;
  appointment_time: string;
  starts_at: string | null;
  ends_at: string | null;
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

function parseDepositCents(
  value: unknown
): number | null {
  if (
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    return null;
  }

  if (
    typeof value === 'string' &&
    !/^\d+(\.\d{1,2})?$/.test(value)
  ) {
    return null;
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  const cents = Math.round(amount * 100);

  if (
    !Number.isSafeInteger(cents) ||
    Math.abs(amount * 100 - cents) > 0.000001
  ) {
    return null;
  }

  return cents;
}

function respondWithDecision(
  res: any,
  appointment: DecisionRow,
  message: string
) {
  return res.status(200).json({
    success: true,
    message,
    appointment: {
      id: appointment.id,
      status: appointment.status,
      depositAmount:
        appointment.deposit_amount === null
          ? null
          : Number(appointment.deposit_amount),
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
    },
  });
}

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );
  res.setHeader(
    'Referrer-Policy',
    'no-referrer'
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

  const rawBody: unknown = req.body;

  if (!isRecord(rawBody)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body.',
    });
  }

  if (
    Buffer.byteLength(
      JSON.stringify(rawBody),
      'utf8'
    ) > MAX_BODY_BYTES
  ) {
    return res.status(413).json({
      success: false,
      error: 'Request body is too large.',
    });
  }

  const body = rawBody as DecisionBody;

  const appointmentId = body.appointmentId;
  const action = body.action;

  if (
    typeof appointmentId !== 'string' ||
    !UUID_PATTERN.test(appointmentId)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid appointment ID.',
    });
  }

  if (
    action !== 'approve' &&
    action !== 'decline'
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid appointment decision.',
    });
  }

  let depositCents: number | null = null;

  if (action === 'approve') {
    depositCents = parseDepositCents(
      body.depositAmount
    );

    if (depositCents === null) {
      return res.status(400).json({
        success: false,
        error:
          'Enter a valid deposit greater than $0 with no more than two decimal places.',
      });
    }
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured.'
      );
    }

    const sql = neon(databaseUrl);

    /* =====================================
       DECLINE A PENDING REQUEST

       Preserve the existing decline logic.
    ===================================== */

    if (action === 'decline') {
      const result = await sql`
        UPDATE appointment_requests
        SET
          status = 'declined',
          reviewed_at = NOW(),
          updated_at = NOW(),
          review_token_hash = NULL,
          review_token_expires_at = NULL
        WHERE id = ${appointmentId}::uuid
          AND status = 'pending'
        RETURNING
          id,
          status,
          deposit_amount,
          appointment_date::text AS appointment_date,
          appointment_time,
          starts_at,
          ends_at
      `;

      if (result.length === 0) {
        return res.status(409).json({
          success: false,
          error:
            'This request is no longer pending or could not be found. Refresh the appointment list.',
        });
      }

      return respondWithDecision(
        res,
        result[0] as DecisionRow,
        'Appointment request declined.'
      );
    }

    /* =====================================
       APPROVE A PENDING REQUEST

       PostgreSQL calculates appointment
       timestamps in America/New_York.

       Approval must follow the same dynamic
       schedule as customer availability.

       The conditional UPDATE and database
       exclusion constraint protect against
       overlapping active reservations.
    ===================================== */

    const depositAmount = depositCents! / 100;

    const result = await sql`
      WITH candidate AS (
        SELECT
          id,
          total_price,
          duration_minutes,
          appointment_date,
          appointment_time,

          (
            (
              appointment_date::text
              || ' '
              || appointment_time
            )::timestamp
            AT TIME ZONE 'America/New_York'
          ) AS requested_start,

          (
            appointment_date::text
            || ' '
            || appointment_time
          )::timestamp AS local_start

        FROM appointment_requests

        WHERE id = ${appointmentId}::uuid
          AND status = 'pending'
      ),

      eligible AS (
        SELECT
          candidate.id,
          candidate.requested_start,

          candidate.requested_start +
            (
              candidate.duration_minutes
              * INTERVAL '1 minute'
            ) AS requested_end

        FROM candidate

        WHERE
          candidate.duration_minutes IS NOT NULL

          AND candidate.duration_minutes > 0

          AND candidate.duration_minutes <=
            ${SLOT_DURATION_MINUTES}

          AND candidate.total_price > 0

          AND ${depositAmount}::numeric <=
            candidate.total_price

          /* =================================
             VALID WEEKLY OR ADDED TIME

             A scheduled start time is not
             an operating-hours cutoff.
          ================================= */

          AND (
            EXISTS (
              SELECT 1

              FROM salon_weekly_schedule weekly

              WHERE weekly.is_active = TRUE

                AND weekly.day_of_week =
                  EXTRACT(
                    DOW FROM candidate.appointment_date
                  )::integer

                AND weekly.appointment_time =
                  candidate.appointment_time::time
            )

            OR EXISTS (
              SELECT 1

              FROM salon_schedule_overrides added

              WHERE added.override_date =
                candidate.appointment_date

                AND added.appointment_time =
                  candidate.appointment_time::time

                AND added.action = 'add'
            )
          )

          /* =================================
             DATE-SPECIFIC REMOVED TIMES
          ================================= */

          AND NOT EXISTS (
            SELECT 1

            FROM salon_schedule_overrides removed

            WHERE removed.override_date =
              candidate.appointment_date

              AND removed.appointment_time =
                candidate.appointment_time::time

              AND removed.action = 'remove'
          )

          /* =================================
             24-HOUR ADVANCE NOTICE
          ================================= */

          AND candidate.requested_start >=
            NOW() +
            (
              ${MINIMUM_NOTICE_HOURS}
              * INTERVAL '1 hour'
            )

          /* =================================
             REJECT NONEXISTENT DST TIMES
          ================================= */

          AND (
            candidate.requested_start
            AT TIME ZONE 'America/New_York'
          ) = candidate.local_start

          /* =================================
             EXISTING RESERVATION CONFLICTS

             Only awaiting_deposit and
             confirmed appointments reserve
             an appointment time.

             Apply 15-minute buffer before
             and after existing reservations.
          ================================= */

          AND NOT EXISTS (
            SELECT 1

            FROM appointment_requests existing

            WHERE existing.id <> candidate.id

              AND existing.status IN (
                'awaiting_deposit',
                'confirmed'
              )

              AND existing.starts_at IS NOT NULL

              AND existing.ends_at IS NOT NULL

              AND existing.starts_at <
                candidate.requested_start +
                (
                  (
                    candidate.duration_minutes +
                    ${BUFFER_MINUTES}
                  ) * INTERVAL '1 minute'
                )

              AND existing.ends_at +
                (
                  ${BUFFER_MINUTES}
                  * INTERVAL '1 minute'
                ) > candidate.requested_start
          )

          /* =================================
             BLOCKED DAYS AND HOURS

             A full-day block rejects every
             appointment on that date.

             A partial block rejects an
             appointment when its duration
             plus the 15-minute buffer
             overlaps the blocked period.
          ================================= */

          AND NOT EXISTS (
            SELECT 1

            FROM salon_schedule_blocks block

            WHERE block.block_date =
              candidate.appointment_date

              AND (
                (
                  block.start_time IS NULL
                  AND block.end_time IS NULL
                )

                OR

                (
                  block.start_time IS NOT NULL
                  AND block.end_time IS NOT NULL

                  AND candidate.requested_start <
                    (
                      (
                        block.block_date +
                        block.end_time
                      )
                      AT TIME ZONE
                        'America/New_York'
                    )

                  AND candidate.requested_start +
                    (
                      (
                        candidate.duration_minutes +
                        ${BUFFER_MINUTES}
                      ) * INTERVAL '1 minute'
                    ) >
                    (
                      (
                        block.block_date +
                        block.start_time
                      )
                      AT TIME ZONE
                        'America/New_York'
                    )
                )
              )
          )
      )

      UPDATE appointment_requests AS appointment

      SET
        status = 'awaiting_deposit',

        deposit_amount = ${depositAmount},

        reviewed_at = NOW(),

        updated_at = NOW(),

        starts_at = eligible.requested_start,

        ends_at = eligible.requested_end,

        review_token_hash = NULL,

        review_token_expires_at = NULL

      FROM eligible

      WHERE appointment.id = eligible.id

        AND appointment.status = 'pending'

      RETURNING
        appointment.id,
        appointment.status,
        appointment.deposit_amount,

        appointment.appointment_date::text
          AS appointment_date,

        appointment.appointment_time,
        appointment.starts_at,
        appointment.ends_at
    `;

    if (result.length === 0) {
      return res.status(409).json({
        success: false,
        error:
          'Unable to approve this request. It may have changed, conflict with another appointment, exceed the maximum duration, fall outside the current schedule, overlap a blocked period, or have an invalid deposit. Refresh and review the details.',
      });
    }

    return respondWithDecision(
      res,
      result[0] as DecisionRow,
      'Appointment approved and awaiting deposit. No payment link has been sent yet.'
    );

  } catch (error: unknown) {
    const databaseError = error as {
      code?: string;
      constraint?: string;
    };

    if (databaseError?.code === '23P01') {
      return res.status(409).json({
        success: false,
        error:
          'This appointment conflicts with an existing reservation.',
      });
    }

    console.error(
      'Admin appointment decision error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to process the appointment decision.',
    });
  }
}
