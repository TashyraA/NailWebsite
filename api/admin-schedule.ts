
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

const MAX_BODY_BYTES = 10_000;
const MAX_REASON_LENGTH = 250;
const MAX_DATE_RANGE_DAYS = 62;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type ScheduleBody = Record<string, unknown>;

function isRecord(
  value: unknown
): value is ScheduleBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !DATE_PATTERN.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    TIME_PATTERN.test(value)
  );
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidDay(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function isValidId(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function getDateRangeDays(
  startDate: string,
  endDate: string
): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  return Math.round(
    (end - start) / (24 * 60 * 60 * 1000)
  );
}

function errorResponse(
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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const method = req.method;

  if (method !== 'GET' && method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');

    return errorResponse(
      res,
      405,
      'Method not allowed.'
    );
  }

  if (!requireAdmin(req, res, method === 'POST')) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not configured.');

    return errorResponse(
      res,
      500,
      'Scheduling database is unavailable.'
    );
  }

  const sql = neon(databaseUrl);

  try {
    // ==========================================
    // READ SCHEDULE
    // ==========================================

    if (method === 'GET') {
      const startDate = req.query?.startDate;
      const endDate = req.query?.endDate;

      if (
        !isValidDate(startDate) ||
        !isValidDate(endDate)
      ) {
        return errorResponse(
          res,
          400,
          'Valid startDate and endDate are required.'
        );
      }

      const rangeDays = getDateRangeDays(
        startDate,
        endDate
      );

      if (
        rangeDays < 0 ||
        rangeDays > MAX_DATE_RANGE_DAYS
      ) {
        return errorResponse(
          res,
          400,
          'Choose a date range of no more than 62 days.'
        );
      }

      const [weekly, overrides, blocks, reservations] =
        await Promise.all([
          sql`
            SELECT
              id,
              day_of_week AS "dayOfWeek",
              TO_CHAR(
                appointment_time,
                'HH24:MI'
              ) AS "appointmentTime",
              is_active AS "isActive"
            FROM salon_weekly_schedule
            ORDER BY
              day_of_week,
              appointment_time
          `,

          sql`
            SELECT
              id,
              override_date::text AS "overrideDate",
              TO_CHAR(
                appointment_time,
                'HH24:MI'
              ) AS "appointmentTime",
              action
            FROM salon_schedule_overrides
            WHERE override_date BETWEEN
              ${startDate}::date AND ${endDate}::date
            ORDER BY
              override_date,
              appointment_time
          `,

          sql`
            SELECT
              id,
              block_date::text AS "blockDate",
              CASE
                WHEN start_time IS NULL THEN NULL
                ELSE TO_CHAR(start_time, 'HH24:MI')
              END AS "startTime",
              CASE
                WHEN end_time IS NULL THEN NULL
                ELSE TO_CHAR(end_time, 'HH24:MI')
              END AS "endTime",
              reason
            FROM salon_schedule_blocks
            WHERE block_date BETWEEN
              ${startDate}::date AND ${endDate}::date
            ORDER BY
              block_date,
              start_time NULLS FIRST
          `,

          sql`
            SELECT
              id,
              appointment_date::text AS "appointmentDate",
              appointment_time AS "appointmentTime",
              status,
              starts_at AS "startsAt",
              ends_at AS "endsAt"
            FROM appointment_requests
            WHERE status IN (
              'awaiting_deposit',
              'confirmed'
            )
              AND appointment_date BETWEEN
                ${startDate}::date AND ${endDate}::date
              AND starts_at IS NOT NULL
              AND ends_at IS NOT NULL
            ORDER BY starts_at
          `,
        ]);

      return res.status(200).json({
        success: true,
        timezone: 'America/New_York',
        weekly,
        overrides,
        blocks,
        reservations,
      });
    }

    // ==========================================
    // VALIDATE POST BODY
    // ==========================================

    if (!isRecord(req.body)) {
      return errorResponse(
        res,
        400,
        'Invalid request body.'
      );
    }

    const body = req.body;

    if (
      Buffer.byteLength(
        JSON.stringify(body),
        'utf8'
      ) > MAX_BODY_BYTES
    ) {
      return errorResponse(
        res,
        413,
        'Request body is too large.'
      );
    }

    const action = body.action;

    // ==========================================
    // WEEKLY SCHEDULE
    //
    // Activate or deactivate an existing
    // weekly time, or add a new one.
    // ==========================================

    if (action === 'weekly-set') {
      const dayOfWeek = body.dayOfWeek;
      const appointmentTime = body.appointmentTime;
      const isActive = body.isActive;

      if (
        !isValidDay(dayOfWeek) ||
        !isValidTime(appointmentTime) ||
        typeof isActive !== 'boolean'
      ) {
        return errorResponse(
          res,
          400,
          'Invalid weekly schedule details.'
        );
      }

      const result = await sql`
        INSERT INTO salon_weekly_schedule (
          day_of_week,
          appointment_time,
          is_active
        )
        VALUES (
          ${dayOfWeek},
          ${appointmentTime}::time,
          ${isActive}
        )
        ON CONFLICT (
          day_of_week,
          appointment_time
        )
        DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING
          id,
          day_of_week AS "dayOfWeek",
          TO_CHAR(
            appointment_time,
            'HH24:MI'
          ) AS "appointmentTime",
          is_active AS "isActive"
      `;

      return res.status(200).json({
        success: true,
        message: 'Weekly schedule updated.',
        schedule: result[0],
      });
    }

    // ==========================================
    // DATE OVERRIDE
    //
    // add: makes a specific time available
    // remove: makes a specific time unavailable
    //
    // Existing reservations remain protected.
    // ==========================================

    if (action === 'override-set') {
      const overrideDate = body.overrideDate;
      const appointmentTime = body.appointmentTime;
      const overrideAction = body.overrideAction;

      if (
        !isValidDate(overrideDate) ||
        !isValidTime(appointmentTime) ||
        (
          overrideAction !== 'add' &&
          overrideAction !== 'remove'
        )
      ) {
        return errorResponse(
          res,
          400,
          'Invalid schedule override.'
        );
      }

      if (overrideAction === 'remove') {
        const conflicts = await sql`
          SELECT id
          FROM appointment_requests
          WHERE appointment_date = ${overrideDate}::date
            AND appointment_time = ${appointmentTime}
            AND status IN (
              'awaiting_deposit',
              'confirmed'
            )
          LIMIT 1
        `;

        if (conflicts.length > 0) {
          return errorResponse(
            res,
            409,
            'This time has an existing reservation and cannot be removed.'
          );
        }
      }

      const result = await sql`
        INSERT INTO salon_schedule_overrides (
          override_date,
          appointment_time,
          action
        )
        VALUES (
          ${overrideDate}::date,
          ${appointmentTime}::time,
          ${overrideAction}
        )
        ON CONFLICT (
          override_date,
          appointment_time
        )
        DO UPDATE SET
          action = EXCLUDED.action,
          updated_at = NOW()
        RETURNING
          id,
          override_date::text AS "overrideDate",
          TO_CHAR(
            appointment_time,
            'HH24:MI'
          ) AS "appointmentTime",
          action
      `;

      return res.status(200).json({
        success: true,
        message: 'Date-specific schedule updated.',
        override: result[0],
      });
    }

    // ==========================================
    // DELETE DATE OVERRIDE
    //
    // Returns that date/time to the normal
    // weekly schedule.
    // ==========================================

    if (action === 'override-delete') {
      const id = body.id;

      if (!isValidId(id)) {
        return errorResponse(
          res,
          400,
          'Invalid schedule override ID.'
        );
      }

      const result = await sql`
        DELETE FROM salon_schedule_overrides
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return errorResponse(
          res,
          404,
          'Schedule override not found.'
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Schedule override removed.',
      });
    }

    // ==========================================
    // BLOCK TIME OR ENTIRE DAY
    //
    // For a full-day block:
    // startTime = null
    // endTime = null
    //
    // For a partial block:
    // provide both times.
    // ==========================================

    if (action === 'block-add') {
      const blockDate = body.blockDate;
      const startTime = body.startTime ?? null;
      const endTime = body.endTime ?? null;
      const reason = body.reason ?? null;

      if (!isValidDate(blockDate)) {
        return errorResponse(
          res,
          400,
          'Invalid block date.'
        );
      }

      const fullDay =
        startTime === null &&
        endTime === null;

      if (
        !fullDay &&
        (
          !isValidTime(startTime) ||
          !isValidTime(endTime)
        )
      ) {
        return errorResponse(
          res,
          400,
          'Provide both a valid start and end time.'
        );
      }

      if (
        !fullDay &&
        minutesFromTime(startTime as string) >=
          minutesFromTime(endTime as string)
      ) {
        return errorResponse(
          res,
          400,
          'Block end time must be after start time.'
        );
      }

      if (
        reason !== null &&
        (
          typeof reason !== 'string' ||
          reason.length > MAX_REASON_LENGTH
        )
      ) {
        return errorResponse(
          res,
          400,
          'Block reason must be 250 characters or fewer.'
        );
      }

      // Check whether the requested block overlaps
      // an active reservation. Include the existing
      // appointment's required 15-minute buffer.
      //
      // The database stores reservation timestamps
      // in UTC; block times are interpreted in Ohio.

      const conflicts = await sql`
        SELECT id
        FROM appointment_requests
        WHERE appointment_date = ${blockDate}::date
          AND status IN (
            'awaiting_deposit',
            'confirmed'
          )
          AND starts_at IS NOT NULL
          AND ends_at IS NOT NULL
          AND (
            ${fullDay}::boolean
            OR (
              starts_at <
                (
                  (
                    ${blockDate}::date +
                    ${endTime ?? '00:00'}::time
                  ) AT TIME ZONE 'America/New_York'
                )
              AND
              ends_at + INTERVAL '15 minutes' >
                (
                  (
                    ${blockDate}::date +
                    ${startTime ?? '00:00'}::time
                  ) AT TIME ZONE 'America/New_York'
                )
            )
          )
        LIMIT 1
      `;

      if (conflicts.length > 0) {
        return errorResponse(
          res,
          409,
          'This block conflicts with an existing reservation. Cancel or reschedule the appointment first.'
        );
      }

      const result = await sql`
        INSERT INTO salon_schedule_blocks (
          block_date,
          start_time,
          end_time,
          reason
        )
        VALUES (
          ${blockDate}::date,
          ${startTime}::time,
          ${endTime}::time,
          ${reason}
        )
        RETURNING
          id,
          block_date::text AS "blockDate",
          CASE
            WHEN start_time IS NULL THEN NULL
            ELSE TO_CHAR(start_time, 'HH24:MI')
          END AS "startTime",
          CASE
            WHEN end_time IS NULL THEN NULL
            ELSE TO_CHAR(end_time, 'HH24:MI')
          END AS "endTime",
          reason
      `;

      return res.status(200).json({
        success: true,
        message: fullDay
          ? 'Entire day blocked.'
          : 'Time period blocked.',
        block: result[0],
      });
    }

    // ==========================================
    // REMOVE BLOCK
    // ==========================================

    if (action === 'block-delete') {
      const id = body.id;

      if (!isValidId(id)) {
        return errorResponse(
          res,
          400,
          'Invalid schedule block ID.'
        );
      }

      const result = await sql`
        DELETE FROM salon_schedule_blocks
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return errorResponse(
          res,
          404,
          'Schedule block not found.'
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Schedule block removed.',
      });
    }

    return errorResponse(
      res,
      400,
      'Unknown scheduling action.'
    );
  } catch (error: unknown) {
    console.error('Admin scheduling error:', error);

    return errorResponse(
      res,
      500,
      'Unable to process the scheduling request.'
    );
  }
}
