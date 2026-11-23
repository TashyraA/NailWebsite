
import { createHash, randomBytes } from 'crypto';
import { neon } from '@neondatabase/serverless';

import { normalizeBooking } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE APPOINTMENT REQUEST API

   - Verify services and prices against Neon
   - Verify service duration against Neon
   - Validate the dynamic salon schedule
   - Respect added and removed time slots
   - Respect full-day and partial blocks
   - Prevent requests for reserved times
   - Enforce a 15-minute booking buffer
   - Enforce 24-hour advance notice
   - Save pending requests
   - Generate private review links
   - Notify Briana and the customer
   - No payment required at request time
========================================= */

const REVIEW_LINK_HOURS = 48;
const WEBSITE_URL = 'https://www.inlovenailz.com';

const MAX_SERVICES = 20;
const MAX_QUANTITY = 10;
const MAX_TOTAL_QUANTITY = 30;
const MAX_REQUEST_BYTES = 100_000;

const MAX_APPOINTMENT_DURATION = 120;
const BUFFER_MINUTES = 15;
const MINIMUM_NOTICE_HOURS = 24;

type RequestedService = {
  id: string;
  quantity: number;
};

type ServiceDatabaseRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  duration_minutes: number;
  category: string;
  images: unknown;
  is_active: boolean;
};

type CatalogService = {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  images: string[];
  isActive: boolean;
  deposit: number;
};

type VerifiedCartItem = {
  service: CatalogService;
  quantity: number;
};

type ScheduleCheckRow = {
  has_valid_local_time: boolean;
  has_enough_notice: boolean;
  is_scheduled: boolean;
  is_removed: boolean;
  is_blocked: boolean;
  has_reservation_conflict: boolean;
};

class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

/* =====================================
   PRIVATE REVIEW TOKEN
===================================== */

function createReviewToken() {
  const token = randomBytes(32).toString('hex');

  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex');

  return { token, tokenHash };
}

/* =====================================
   REQUEST BODY VALIDATION
===================================== */

function parseRequestedServices(
  value: unknown
): RequestedService[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SERVICES
  ) {
    throw new RequestValidationError(
      'Please select between 1 and 20 services.'
    );
  }

  const requested: RequestedService[] = [];
  const seen = new Set<string>();

  let totalQuantity = 0;

  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      throw new RequestValidationError(
        'Invalid selected service.'
      );
    }

    const serviceId =
      typeof item.service?.id === 'string'
        ? item.service.id
        : typeof item.id === 'string'
          ? item.id
          : '';

    const quantity =
      item.quantity === undefined
        ? 1
        : item.quantity;

    if (
      !serviceId ||
      serviceId.length > 150 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY ||
      seen.has(serviceId)
    ) {
      throw new RequestValidationError(
        'Invalid service selection or quantity.'
      );
    }

    seen.add(serviceId);
    totalQuantity += quantity;

    requested.push({
      id: serviceId,
      quantity,
    });
  }

  if (totalQuantity > MAX_TOTAL_QUANTITY) {
    throw new RequestValidationError(
      'Too many services selected.'
    );
  }

  return requested;
}

/* =====================================
   DATE AND TIME VALIDATION
===================================== */

function validateAppointmentDate(
  date: string,
  time: string
) {
  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  const timeMatch =
    /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new RequestValidationError(
      'Please select a valid appointment date and time.'
    );
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new RequestValidationError(
      'Please select a valid appointment date.'
    );
  }
}

/* =====================================
   CUSTOMER DETAILS VALIDATION
===================================== */

function validateCustomerDetails(booking: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  inspirationUrl?: string;
}) {
  if (
    booking.customerName.length < 2 ||
    booking.customerName.length > 150
  ) {
    throw new RequestValidationError(
      'Please enter a valid customer name.'
    );
  }

  if (
    booking.customerEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      booking.customerEmail
    )
  ) {
    throw new RequestValidationError(
      'Please enter a valid email address.'
    );
  }

  if (
    booking.customerPhone.length < 7 ||
    booking.customerPhone.length > 30 ||
    !/^[+\d().\s-]+$/.test(
      booking.customerPhone
    )
  ) {
    throw new RequestValidationError(
      'Please enter a valid phone number.'
    );
  }

  if ((booking.notes || '').length > 3000) {
    throw new RequestValidationError(
      'Appointment notes are too long.'
    );
  }

  if (booking.inspirationUrl) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(booking.inspirationUrl);
    } catch {
      throw new RequestValidationError(
        'Invalid inspiration image URL.'
      );
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== 'res.cloudinary.com' ||
      booking.inspirationUrl.length > 2000
    ) {
      throw new RequestValidationError(
        'Invalid inspiration image URL.'
      );
    }
  }

  validateAppointmentDate(
    booking.appointmentDate,
    booking.appointmentTime
  );
}

/* =====================================
   VERIFY SERVICES AGAINST NEON
===================================== */

async function verifyServices(
  sql: ReturnType<typeof neon>,
  requested: RequestedService[]
): Promise<{
  items: VerifiedCartItem[];
  totalPrice: number;
  durationMinutes: number;
}> {
  const ids = requested.map(item => item.id);

  const queryResult = await sql`
    SELECT
      id,
      title,
      description,
      price,
      duration_minutes,
      category,
      images,
      is_active
    FROM salon_services
    WHERE id = ANY(${ids}::text[])
  `;

  if (!Array.isArray(queryResult)) {
    throw new Error(
      'Unexpected response from the service database.'
    );
  }

  const rows = queryResult as ServiceDatabaseRow[];

  const catalog = new Map<string, CatalogService>();

  for (const row of rows) {
    const price = Number(row.price);
    const duration = Number(row.duration_minutes);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      throw new Error(
        'Invalid service data in Neon.'
      );
    }

    const images = Array.isArray(row.images)
      ? row.images.filter(
          (image): image is string =>
            typeof image === 'string'
        )
      : [];

    catalog.set(String(row.id), {
      id: String(row.id),
      title: String(row.title),
      description: String(row.description || ''),
      price,
      duration,
      category: String(row.category),
      images,
      isActive: row.is_active === true,
      deposit: 0,
    });
  }

  const verifiedItems: VerifiedCartItem[] = [];

  let totalCents = 0;
  let durationMinutes = 0;

  for (const requestedItem of requested) {
    const service = catalog.get(requestedItem.id);

    if (!service || !service.isActive) {
      throw new RequestValidationError(
        'One or more selected services are no longer available. Please refresh your cart.'
      );
    }

    const serviceCents = Math.round(
      service.price * 100
    );

    totalCents +=
      serviceCents * requestedItem.quantity;

    durationMinutes +=
      service.duration * requestedItem.quantity;

    verifiedItems.push({
      service,
      quantity: requestedItem.quantity,
    });
  }

  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < 0 ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > MAX_APPOINTMENT_DURATION
  ) {
    throw new RequestValidationError(
      'Please select services totaling no more than 120 minutes.'
    );
  }

  return {
    items: verifiedItems,
    totalPrice: totalCents / 100,
    durationMinutes,
  };
}

/* =====================================
   VERIFY LIVE SCHEDULE AGAINST NEON

   This is independent of the customer's
   browser and uses the official duration
   calculated from salon_services.

   Pending requests do not reserve time.
===================================== */

async function verifyAppointmentAvailability(
  sql: ReturnType<typeof neon>,
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number
): Promise<void> {
  const result = await sql`
    WITH candidate AS (
      SELECT
        ${appointmentDate}::date AS appointment_date,
        ${appointmentTime}::time AS appointment_time,

        (
          (
            ${appointmentDate}::date +
            ${appointmentTime}::time
          )
          AT TIME ZONE 'America/New_York'
        ) AS starts_at,

        (
          ${appointmentDate}::date +
          ${appointmentTime}::time
        ) AS local_start
    ),

    appointment_window AS (
      SELECT
        appointment_date,
        appointment_time,
        local_start,
        starts_at,

        starts_at +
          (
            ${durationMinutes}::integer *
            INTERVAL '1 minute'
          ) AS ends_at

      FROM candidate
    )

    SELECT
      (
        starts_at AT TIME ZONE
          'America/New_York'
      ) = local_start
        AS has_valid_local_time,

      starts_at >=
        NOW() +
        (
          ${MINIMUM_NOTICE_HOURS}::integer *
          INTERVAL '1 hour'
        )
        AS has_enough_notice,

      (
        EXISTS (
          SELECT 1

          FROM salon_weekly_schedule weekly

          WHERE weekly.day_of_week =
            EXTRACT(
              DOW FROM appointment_window.appointment_date
            )::integer

            AND weekly.appointment_time =
              appointment_window.appointment_time

            AND weekly.is_active = TRUE
        )

        OR EXISTS (
          SELECT 1

          FROM salon_schedule_overrides added

          WHERE added.override_date =
            appointment_window.appointment_date

            AND added.appointment_time =
              appointment_window.appointment_time

            AND added.action = 'add'
        )
      ) AS is_scheduled,

      EXISTS (
        SELECT 1

        FROM salon_schedule_overrides removed

        WHERE removed.override_date =
          appointment_window.appointment_date

          AND removed.appointment_time =
            appointment_window.appointment_time

          AND removed.action = 'remove'
      ) AS is_removed,

      EXISTS (
        SELECT 1

        FROM salon_schedule_blocks block

        WHERE block.block_date =
          appointment_window.appointment_date

          AND (
            (
              block.start_time IS NULL
              AND block.end_time IS NULL
            )

            OR (
              block.start_time IS NOT NULL
              AND block.end_time IS NOT NULL

              AND appointment_window.starts_at <
                (
                  (
                    block.block_date +
                    block.end_time
                  )
                  AT TIME ZONE 'America/New_York'
                )

              AND appointment_window.ends_at +
                (
                  ${BUFFER_MINUTES}::integer *
                  INTERVAL '1 minute'
                ) >
                (
                  (
                    block.block_date +
                    block.start_time
                  )
                  AT TIME ZONE 'America/New_York'
                )
            )
          )
      ) AS is_blocked,

      EXISTS (
        SELECT 1

        FROM appointment_requests reserved

        WHERE reserved.status IN (
          'awaiting_deposit',
          'confirmed'
        )

          AND reserved.starts_at IS NOT NULL
          AND reserved.ends_at IS NOT NULL

          AND reserved.starts_at <
            appointment_window.ends_at +
            (
              ${BUFFER_MINUTES}::integer *
              INTERVAL '1 minute'
            )

          AND reserved.ends_at +
            (
              ${BUFFER_MINUTES}::integer *
              INTERVAL '1 minute'
            ) > appointment_window.starts_at
      ) AS has_reservation_conflict

    FROM appointment_window
  `;

  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error(
      'Could not verify the appointment schedule.'
    );
  }

  const check = result[0] as ScheduleCheckRow;

  if (!check.has_valid_local_time) {
    throw new RequestValidationError(
      'This appointment time is not valid. Please select another time.'
    );
  }

  if (!check.has_enough_notice) {
    throw new RequestValidationError(
      'Appointments must be requested at least 24 hours in advance.'
    );
  }

  if (!check.is_scheduled || check.is_removed) {
    throw new RequestValidationError(
      'This appointment time is not available on the salon schedule. Please choose another time.'
    );
  }

  if (check.is_blocked) {
    throw new RequestValidationError(
      'The salon is unavailable during this appointment time. Please choose another time.'
    );
  }

  if (check.has_reservation_conflict) {
    throw new RequestValidationError(
      'This appointment time is already reserved. Please choose another available time.'
    );
  }
}

/* =====================================
   EMAIL HTML HELPERS
===================================== */

function buildServicesHtml(
  items: VerifiedCartItem[]
): string {
  return items
    .map(item => {
      const title = escapeHtml(
        item.service.title
      );

      const quantity = item.quantity;

      const lineTotal = (
        item.service.price * quantity
      ).toFixed(2);

      return `
        <li style="margin-bottom:8px;">
          ${title} × ${quantity}
          — $${lineTotal}
        </li>
      `;
    })
    .join('');
}

function buildEmailLayout(
  content: string
): string {
  return `
    <div style="
      font-family:Arial,sans-serif;
      color:#29252B;
      line-height:1.6;
      max-width:600px;
      margin:0 auto;
    ">
      ${content}
    </div>
  `;
}

/* =====================================
   MAIN REQUEST HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const rawBody = req.body;

    if (
      !rawBody ||
      typeof rawBody !== 'object' ||
      Array.isArray(rawBody)
    ) {
      return res.status(400).json({
        error: 'Invalid appointment request.',
      });
    }

    const bodySize = Buffer.byteLength(
      JSON.stringify(rawBody),
      'utf8'
    );

    if (bodySize > MAX_REQUEST_BYTES) {
      return res.status(413).json({
        error: 'Appointment request is too large.',
      });
    }

    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured'
      );
    }

    const ownerEmail =
      process.env.BOOKING_NOTIFICATION_EMAIL ||
      process.env.BUSINESS_EMAIL;

    if (!ownerEmail) {
      throw new Error(
        'Booking notification email is not configured'
      );
    }

    const booking = normalizeBooking(rawBody);

    validateCustomerDetails(booking);

    const requestedServices =
      parseRequestedServices(rawBody.services);

    const sql = neon(databaseUrl);

    /* =====================================
       VERIFY SERVICES AND PRICING

       Never trust customer-submitted
       service prices or durations.
    ===================================== */

    const verified = await verifyServices(
      sql,
      requestedServices
    );

    booking.services = verified.items;
    booking.totalPrice = verified.totalPrice;

    /* =====================================
       VERIFY LIVE APPOINTMENT AVAILABILITY

       This happens before creating a
       pending appointment or sending emails.
    ===================================== */

    await verifyAppointmentAvailability(
      sql,
      booking.appointmentDate,
      booking.appointmentTime,
      verified.durationMinutes
    );

    /* =====================================
       GENERATE PRIVATE REVIEW LINK
    ===================================== */

    const { token, tokenHash } =
      createReviewToken();

    const reviewTokenExpiresAt = new Date(
      Date.now() +
        REVIEW_LINK_HOURS *
          60 *
          60 *
          1000
    );

    /* =====================================
       SAVE VERIFIED REQUEST TO NEON

       Pending requests do not reserve
       the selected appointment time.
    ===================================== */

    const insertResult = await sql`
      INSERT INTO appointment_requests (
        customer_name,
        customer_email,
        customer_phone,
        appointment_date,
        appointment_time,
        services,
        total_price,
        duration_minutes,
        notes,
        inspiration_url,
        status,
        review_token_hash,
        review_token_expires_at
      )

      VALUES (
        ${booking.customerName},
        ${booking.customerEmail},
        ${booking.customerPhone},
        ${booking.appointmentDate},
        ${booking.appointmentTime},
        ${JSON.stringify(verified.items)}::jsonb,
        ${verified.totalPrice},
        ${verified.durationMinutes},
        ${booking.notes || null},
        ${booking.inspirationUrl || null},
        'pending',
        ${tokenHash},
        ${reviewTokenExpiresAt.toISOString()}
      )

      RETURNING id
    `;

    if (
      !Array.isArray(insertResult) ||
      !insertResult.length
    ) {
      throw new Error(
        'Appointment insert returned no rows.'
      );
    }

    const insertedRows = insertResult as {
      id: string | number;
    }[];

    if (!insertedRows[0]?.id) {
      throw new Error(
        'Appointment insert returned no ID.'
      );
    }

    const appointmentId = String(
      insertedRows[0].id
    );

    console.log(
      'Appointment request saved:',
      appointmentId
    );

    /* =====================================
       BUILD PRIVATE REVIEW URL
    ===================================== */

    const configuredUrl =
      process.env.APP_URL?.trim() ||
      WEBSITE_URL;

    const baseUrl = configuredUrl.replace(
      /\/+$/,
      ''
    );

    const reviewUrl = new URL(
      '/api/review-appointment',
      baseUrl
    );

    reviewUrl.searchParams.set(
      'id',
      appointmentId
    );

    reviewUrl.searchParams.set(
      'token',
      token
    );

    const privateReviewLink =
      reviewUrl.toString();

    /* =====================================
       ESCAPE CUSTOMER INFORMATION
    ===================================== */

    const customerName = escapeHtml(
      booking.customerName
    );

    const customerEmail = escapeHtml(
      booking.customerEmail
    );

    const customerPhone = escapeHtml(
      booking.customerPhone
    );

    const appointmentDate = escapeHtml(
      booking.appointmentDate
    );

    const appointmentTime = escapeHtml(
      booking.appointmentTime
    );

    const safeAppointmentId = escapeHtml(
      appointmentId
    );

    const notes = escapeHtml(
      booking.notes ||
        'No additional notes provided'
    );

    const serviceTotal =
      verified.totalPrice.toFixed(2);

    const servicesHtml = buildServicesHtml(
      verified.items
    );

    const safeReviewLink = escapeHtml(
      privateReviewLink
    );

    const inspirationUrl =
      booking.inspirationUrl || '';

    const safeInspirationUrl = inspirationUrl
      ? escapeHtml(inspirationUrl)
      : '';

    const inspirationHtml = safeInspirationUrl
      ? `
          <p>
            <a
              href="${safeInspirationUrl}"
              style="color:#963F60;"
            >
              View Inspiration Photo
            </a>
          </p>
        `
      : '';

    /* =====================================
       OWNER EMAIL NOTIFICATION
    ===================================== */

    const ownerEmailHtml = buildEmailLayout(`
      <h1 style="color:#963F60;">
        New Appointment Request
      </h1>

      <p>
        A client has submitted a new
        appointment request through
        InLoveNailz.
      </p>

      <p>
        <strong>Request ID:</strong>
        ${safeAppointmentId}
      </p>

      <h2 style="color:#963F60;">
        Customer Information
      </h2>

      <p>
        <strong>Name:</strong>
        ${customerName}
      </p>

      <p>
        <strong>Email:</strong>
        ${customerEmail}
      </p>

      <p>
        <strong>Phone:</strong>
        ${customerPhone}
      </p>

      <h2 style="color:#963F60;">
        Requested Appointment
      </h2>

      <p>
        <strong>Date:</strong>
        ${appointmentDate}
      </p>

      <p>
        <strong>Time:</strong>
        ${appointmentTime}
      </p>

      <h2 style="color:#963F60;">
        Selected Services
      </h2>

      <ul>${servicesHtml}</ul>

      <p>
        <strong>Service Total:</strong>
        $${serviceTotal}
      </p>

      <p>
        <strong>Estimated Duration:</strong>
        ${verified.durationMinutes}
        minutes
      </p>

      <h2 style="color:#963F60;">
        Appointment Notes
      </h2>

      <p>${notes}</p>

      ${inspirationHtml}

      <hr style="
        border:1px solid #EAC5D0;
        margin:24px 0;
      ">

      <h2 style="color:#963F60;">
        Review Appointment
      </h2>

      <p>
        <strong>Status:</strong>
        Pending Review
      </p>

      <p>
        This request has been saved
        to the InLoveNailz database.
      </p>

      <p>
        Use the private review link
        to review this appointment request.
      </p>

      <p style="margin:24px 0;">
        <a
          href="${safeReviewLink}"
          style="
            display:inline-block;
            background:#963F60;
            color:#FFFFFF;
            padding:14px 24px;
            border-radius:30px;
            text-decoration:none;
            font-weight:bold;
          "
        >
          Review Appointment Request
        </a>
      </p>

      <p style="
        font-size:13px;
        color:#806B75;
      ">
        This private review link
        expires after
        ${REVIEW_LINK_HOURS} hours.
        Do not share it with customers.
      </p>
    `);

    /* =====================================
       CUSTOMER EMAIL NOTIFICATION
    ===================================== */

    const customerEmailHtml = buildEmailLayout(`
      <h1 style="color:#963F60;">
        Appointment Request Received!
      </h1>

      <p>Hi ${customerName},</p>

      <p>
        Thank you for choosing
        InLoveNailz by Briana!
      </p>

      <p>
        We have received your
        appointment request.
      </p>

      <p>
        <strong>Request ID:</strong>
        ${safeAppointmentId}
      </p>

      <h2 style="color:#963F60;">
        Your Requested Appointment
      </h2>

      <p>
        <strong>Date:</strong>
        ${appointmentDate}
      </p>

      <p>
        <strong>Time:</strong>
        ${appointmentTime}
      </p>

      <h3>Your Services</h3>

      <ul>${servicesHtml}</ul>

      <p>
        <strong>Service Total:</strong>
        $${serviceTotal}
      </p>

      <p>
        Briana will review your request
        and email you with the required
        deposit amount and next steps
        if approved.
      </p>

      <p style="
        background:#FFF7F8;
        border:1px solid #EAC5D0;
        border-radius:12px;
        padding:16px;
      ">
        <strong>
          Your appointment is not yet
          confirmed.
        </strong>

        <br>

        No payment is required to submit
        your appointment request.

        Your appointment will only be
        confirmed after approval and
        successful payment of the
        required deposit.
      </p>

      <p>
        Thank you for supporting
        InLoveNailz!
      </p>
    `);

    /* =====================================
       SEND EMAIL NOTIFICATIONS

       Request is already saved.
       Email failures do not undo it.
    ===================================== */

    try {
      await sendEmail(
        ownerEmail,
        'InLoveNailz | New Appointment Request',
        ownerEmailHtml
      );
    } catch (error) {
      console.error(
        'Owner notification failed:',
        error
      );
    }

    try {
      await sendEmail(
        booking.customerEmail,
        'InLoveNailz | Appointment Request Received',
        customerEmailHtml
      );
    } catch (error) {
      console.error(
        'Customer notification failed:',
        error
      );
    }

    /* =====================================
       SUCCESS RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,
      appointmentId,
      status: 'pending',
      message:
        'Your appointment request has been received and is pending review.',
    });
  } catch (error: unknown) {
    if (error instanceof RequestValidationError) {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error(
      'Request appointment error:',
      error
    );

    return res.status(500).json({
      error:
        'Unable to save your appointment request. Please try again.',
    });
  }
}
