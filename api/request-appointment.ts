
import { neon } from '@neondatabase/serverless';

import { normalizeBooking } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   APPOINTMENT REQUEST API

   - Save appointment requests to Neon
   - No automatic deposit payments
   - No Stripe Checkout at request time
   - Email Briana appointment details
   - Email customer acknowledgment
   - Appointments require manual approval
========================================= */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    /* =====================================
       DATABASE CONNECTION
    ===================================== */

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(databaseUrl);

    /* =====================================
       VALIDATE APPOINTMENT
    ===================================== */

    const booking = normalizeBooking(req.body || {});

    if (
      !booking.customerName ||
      !booking.customerEmail ||
      !booking.customerPhone ||
      !booking.appointmentDate ||
      !booking.appointmentTime ||
      !booking.services.length ||
      !Number.isFinite(booking.totalPrice) ||
      booking.totalPrice < 0
    ) {
      return res.status(400).json({
        error: 'Invalid or incomplete appointment details',
      });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        booking.customerEmail
      )
    ) {
      return res.status(400).json({
        error: 'Please enter a valid email address',
      });
    }

    const ownerEmail =
      process.env.BOOKING_NOTIFICATION_EMAIL ||
      process.env.BUSINESS_EMAIL;

    if (!ownerEmail) {
      throw new Error(
        'BOOKING_NOTIFICATION_EMAIL or BUSINESS_EMAIL is not configured'
      );
    }

    /* =====================================
       SAVE APPOINTMENT TO NEON
    ===================================== */

    const savedRows = await sql`
      INSERT INTO appointment_requests (
        customer_name,
        customer_email,
        customer_phone,
        appointment_date,
        appointment_time,
        services,
        total_price,
        notes,
        inspiration_url,
        status
      )
      VALUES (
        ${booking.customerName},
        ${booking.customerEmail},
        ${booking.customerPhone},
        ${booking.appointmentDate},
        ${booking.appointmentTime},
        ${JSON.stringify(booking.services)}::jsonb,
        ${booking.totalPrice},
        ${booking.notes || null},
        ${booking.inspirationUrl || null},
        'pending'
      )
      RETURNING id
    `;

    const appointmentId = String(savedRows[0].id);

    console.log(
      'Appointment request saved successfully:',
      appointmentId
    );

    /* =====================================
       PREPARE EMAIL DETAILS
    ===================================== */

    const servicesHtml = booking.services
      .map(item => {
        const service = item.service || item;
        const quantity = Number(item.quantity) || 1;

        const title = escapeHtml(
          String(service.title || 'Nail service')
        );

        const price = Number(service.price);

        const priceText = Number.isFinite(price)
          ? `$${(price * quantity).toFixed(2)}`
          : 'Price unavailable';

        return `
          <li style="margin-bottom:8px;">
            ${title} × ${quantity} — ${priceText}
          </li>
        `;
      })
      .join('');

    const customerName = escapeHtml(booking.customerName);
    const customerEmail = escapeHtml(booking.customerEmail);
    const customerPhone = escapeHtml(booking.customerPhone);
    const appointmentDate = escapeHtml(booking.appointmentDate);
    const appointmentTime = escapeHtml(booking.appointmentTime);
    const safeAppointmentId = escapeHtml(appointmentId);

    const notes = escapeHtml(
      String(
        booking.notes || 'No additional notes provided'
      )
    );

    const inspirationUrl = String(
      booking.inspirationUrl || ''
    );

    const safeInspirationUrl =
      /^https:\/\/[^\s"'<>]+$/i.test(inspirationUrl)
        ? escapeHtml(inspirationUrl)
        : '';

    /* =====================================
       EMAIL BRIANA
    ===================================== */

    const ownerEmailHtml = `
      <div style="
        font-family:Arial,sans-serif;
        color:#29252B;
        line-height:1.6;
        max-width:600px;
        margin:0 auto;
      ">
        <h1 style="color:#963F60;">
          New Appointment Request
        </h1>

        <p>
          A client has submitted a new appointment
          request through the InLoveNailz website.
        </p>

        <p>
          <strong>Request ID:</strong>
          ${safeAppointmentId}
        </p>

        <h2 style="color:#963F60;">
          Customer Information
        </h2>

        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>

        <h2 style="color:#963F60;">
          Requested Appointment
        </h2>

        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>

        <h2 style="color:#963F60;">
          Selected Services
        </h2>

        <ul>
          ${servicesHtml}
        </ul>

        <p style="font-size:18px;">
          <strong>Service Total:</strong>
          $${booking.totalPrice.toFixed(2)}
        </p>

        <h2 style="color:#963F60;">
          Appointment Notes
        </h2>

        <p>${notes}</p>

        ${
          safeInspirationUrl
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
            : ''
        }

        <hr style="border:1px solid #EAC5D0;">

        <p>
          <strong>Status:</strong>
          Pending Review
        </p>

        <p>
          This appointment request has been saved
          to the InLoveNailz database.
        </p>

        <p>
          Please review the appointment request
          before requesting a deposit.
        </p>
      </div>
    `;

    /* =====================================
       EMAIL CUSTOMER
    ===================================== */

    const customerEmailHtml = `
      <div style="
        font-family:Arial,sans-serif;
        color:#29252B;
        line-height:1.6;
        max-width:600px;
        margin:0 auto;
      ">
        <h1 style="color:#963F60;">
          Appointment Request Received!
        </h1>

        <p>Hi ${customerName},</p>

        <p>
          Thank you for choosing InLoveNailz by Briana!
          We have received your appointment request.
        </p>

        <p>
          <strong>Request ID:</strong>
          ${safeAppointmentId}
        </p>

        <h2 style="color:#963F60;">
          Your Requested Appointment
        </h2>

        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>

        <h3>Your Services</h3>

        <ul>
          ${servicesHtml}
        </ul>

        <p>
          <strong>Service Total:</strong>
          $${booking.totalPrice.toFixed(2)}
        </p>

        <p>
          Briana will review your request and
          email you with the required deposit
          amount and next steps if approved.
        </p>

        <p style="
          background:#FFF7F8;
          border:1px solid #EAC5D0;
          border-radius:12px;
          padding:16px;
        ">
          <strong>
            Your appointment is not yet confirmed.
          </strong>

          No payment is required to submit
          your appointment request.

          Your appointment will only be confirmed
          after approval and successful payment
          of the required deposit.
        </p>

        <p>
          Thank you for supporting InLoveNailz!
        </p>
      </div>
    `;

    /* =====================================
       SEND EMAIL NOTIFICATIONS
    ===================================== */

    // The request has already been saved.
    // Email failures must not cause the customer
    // to resubmit and create duplicate requests.

    try {
      await sendEmail(
        ownerEmail,
        'InLoveNailz | New Appointment Request',
        ownerEmailHtml
      );
    } catch (ownerEmailError) {
      console.error(
        'Briana notification email failed:',
        ownerEmailError
      );
    }

    try {
      await sendEmail(
        booking.customerEmail,
        'InLoveNailz | Appointment Request Received',
        customerEmailHtml
      );
    } catch (customerEmailError) {
      console.error(
        'Customer acknowledgment email failed:',
        customerEmailError
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
