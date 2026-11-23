
import { neon } from '@neondatabase/serverless';

/*
=========================================
 INLOVENAILZ BY BRIANA

 PUBLIC APPOINTMENT AVAILABILITY API

 - Reads weekly schedule from Neon
 - Applies date-specific overrides
 - Respects blocked days and time periods
 - Excludes existing reservations
 - Uses actual selected service duration
 - Enforces 24-hour booking notice
 - Includes a 15-minute appointment buffer
 - Handles Ohio / Eastern time
 - Does not expose customer information
 - Does not modify any database records
=========================================
*/

const TIMEZONE = 'America/New_York';

const MINIMUM_NOTICE_HOURS = 24;
const MAX_DURATION_MINUTES = 120;
const BUFFER_MINUTES = 15;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type AvailabilityRow = {
  appointmentTime: string;
};

function isValidDate(
  value: unknown
): value is string {
  if (
    typeof value !== 'string' ||
    !DATE_PATTERN.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseDuration(
  value: unknown
): number | null {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  if (
    typeof value === 'string' &&
    !/^\d+$/.test(value)
  ) {
    return null;
  }

  const duration = Number(value);

  if (
    !Number.isSafeInteger(duration) ||
    duration < 1 ||
    duration > MAX_DURATION_MINUTES
  ) {
    return null;
  }

  return duration;
}

function sendError(
  res: any,
  status: number,
  message: string
) {
  return res.status(status).json({
    success: false,
    error: message,
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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return sendError(
      res,
      405,
      'Method not allowed.'
    );
  }

  const date = req.query?.date;
  const durationMinutes = parseDuration(
    req.query?.durationMinutes
  );

  if (!isValidDate(date)) {
    return sendError(
      res,
      400,
      'Please provide a valid appointment date.'
    );
  }

  if (durationMinutes === null) {
    return sendError(
      res,
      400,
      'Please provide a valid appointment duration between 1 and 120 minutes.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      'Appointment availability: DATABASE_URL is missing.'
    );

    return sendError(
      res,
      500,
      'Appointment availability is temporarily unavailable.'
    );
  }

  try {
    const sql = neon(databaseUrl);

    /*
    =========================================
     AVAILABILITY CALCULATION

     1. Start with active weekly times.
     2. Include date-specific added times.
     3. Exclude date-specific removed times.
     4. Convert local Ohio times to UTC.
     5. Reject invalid DST-local times.
     6. Enforce 24-hour notice.
     7. Reject overlapping reservations.
     8. Reject overlapping blocked periods.

     Existing active reservations:
       awaiting_deposit
       confirmed

     Pending requests do not reserve time.
    =========================================
    */

    const rows = await sql`
      WITH requested_day AS (
        SELECT
          ${date}::date AS local_date,
          ${durationMinutes}::integer
            AS duration_minutes
      ),

      weekly_times AS (
        SELECT
          TO_CHAR(
            weekly.appointment_time,
            'HH24:MI'
          ) AS appointment_time
        FROM salon_weekly_schedule weekly
        CROSS JOIN requested_day requested
        WHERE weekly.is_active = TRUE
          AND weekly.day_of_week =
            EXTRACT(
              DOW FROM requested.local_date
            )::integer
      ),

      added_times AS (
        SELECT
          TO_CHAR(
            override.appointment_time,
            'HH24:MI'
          ) AS appointment_time
        FROM salon_schedule_overrides override
        CROSS JOIN requested_day requested
        WHERE override.override_date =
          requested.local_date
          AND override.action = 'add'
      ),

      removed_times AS (
        SELECT
          TO_CHAR(
            override.appointment_time,
            'HH24:MI'
          ) AS appointment_time
        FROM salon_schedule_overrides override
        CROSS JOIN requested_day requested
        WHERE override.override_date =
          requested.local_date
          AND override.action = 'remove'
      ),

      combined_times AS (
        SELECT appointment_time
        FROM weekly_times

        UNION

        SELECT appointment_time
        FROM added_times
      ),

      effective_times AS (
        SELECT
          combined.appointment_time
        FROM combined_times combined
        WHERE NOT EXISTS (
          SELECT 1
          FROM removed_times removed
          WHERE removed.appointment_time =
            combined.appointment_time
        )
      ),

      candidate_times AS (
        SELECT
          effective.appointment_time,

          (
            (
              requested.local_date::text
              || ' '
              || effective.appointment_time
            )::timestamp
            AT TIME ZONE 'America/New_York'
          ) AS starts_at,

          (
            (
              (
                requested.local_date::text
                || ' '
                || effective.appointment_time
              )::timestamp
              AT TIME ZONE 'America/New_York'
            )
            +
            (
              requested.duration_minutes
              * INTERVAL '1 minute'
            )
          ) AS ends_at,

          (
            requested.local_date::text
            || ' '
            || effective.appointment_time
          )::timestamp AS local_start

        FROM effective_times effective
        CROSS JOIN requested_day requested
      ),

      valid_candidates AS (
        SELECT
          candidate.appointment_time,
          candidate.starts_at,
          candidate.ends_at

        FROM candidate_times candidate

        WHERE
          candidate.starts_at >=
            NOW() +
            (
              ${MINIMUM_NOTICE_HOURS}
              * INTERVAL '1 hour'
            )

          AND (
            candidate.starts_at
            AT TIME ZONE 'America/New_York'
          ) = candidate.local_start

          AND NOT EXISTS (
            SELECT 1
            FROM appointment_requests existing
            WHERE existing.status IN (
              'awaiting_deposit',
              'confirmed'
            )
              AND existing.starts_at
                IS NOT NULL
              AND existing.ends_at
                IS NOT NULL

              AND existing.starts_at <
                candidate.ends_at +
                (
                  ${BUFFER_MINUTES}
                  * INTERVAL '1 minute'
                )

              AND existing.ends_at +
                (
                  ${BUFFER_MINUTES}
                  * INTERVAL '1 minute'
                ) > candidate.starts_at
          )

          AND NOT EXISTS (
            SELECT 1
            FROM salon_schedule_blocks block
            CROSS JOIN requested_day requested

            WHERE block.block_date =
              requested.local_date

              AND (
                (
                  block.start_time IS NULL
                  AND block.end_time IS NULL
                )

                OR

                (
                  block.start_time IS NOT NULL
                  AND block.end_time IS NOT NULL

                  AND candidate.starts_at <
                    (
                      (
                        block.block_date
                        + block.end_time
                      )
                      AT TIME ZONE
                        'America/New_York'
                    )

                  AND candidate.ends_at +
                    (
                      ${BUFFER_MINUTES}
                      * INTERVAL '1 minute'
                    ) >
                    (
                      (
                        block.block_date
                        + block.start_time
                      )
                      AT TIME ZONE
                        'America/New_York'
                    )
                )
              )
          )
      )

      SELECT
        appointment_time AS "appointmentTime"

      FROM valid_candidates

      ORDER BY appointment_time
    `;

    const availableTimes = (
      rows as AvailabilityRow[]
    ).map(row => row.appointmentTime);

    return res.status(200).json({
      success: true,
      date,
      timezone: TIMEZONE,
      durationMinutes,
      bufferMinutes: BUFFER_MINUTES,
      minimumNoticeHours: MINIMUM_NOTICE_HOURS,
      availableTimes,
    });

  } catch (error: unknown) {
    console.error(
      'Appointment availability error:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to load appointment availability. Please try again.'
    );
  }
}
