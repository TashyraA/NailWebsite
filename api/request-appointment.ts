
import { normalizeBooking } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   APPOINTMENT REQUEST API

   - No automatic payment requests
   - No Stripe Checkout sessions
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
    const booking = normalizeBooking(req.body || {});

    // Validate the appointment request.
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

    // Validate customer email.
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        booking.customerEmail
      )
    ) {
      return res.status(400).json({
        error: 'Please enter a valid email address',
      });
    }

    // Configure Briana's notification address in
    // the hosting environment.
    const ownerEmail = process.env.BOOKING_NOTIFICATION_EMAIL;

    if (!ownerEmail) {
      throw new Error(
        'BOOKING_NOTIFICATION_EMAIL is not configured'
      );
    }

    // Prepare service details for the emails.
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

    const notes = escapeHtml(
      String(booking.notes || 'No additional notes provided')
    );

    const inspirationUrl = String(
      booking.inspirationUrl || ''
    );

    const safeInspirationUrl =
      /^https:\/\/[^\s"'<>]+$/i.test(inspirationUrl)
        ? inspirationUrl.replace(/&/g, '&amp;')
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
                <a href="${safeInspirationUrl}"
                   style="color:#963F60;">
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
          Please review the requested appointment
          and contact the client with the next steps.
        </p>
      </div>
    `;

    // Briana's email is required for a successful request.
    await sendEmail(
      ownerEmail,
      'InLoveNailz | New Appointment Request',
      ownerEmailHtml
    );

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
          contact you with the next steps.
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
          You will receive an official confirmation
          once your appointment has been approved.
        </p>

        <p>
          Thank you for supporting InLoveNailz!
        </p>
      </div>
    `;

    // Customer email is helpful, but a failure here
    // should not cause a duplicate appointment request.
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

    return res.status(200).json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('Request appointment error:', error);

    return res.status(500).json({
      error:
        'Unable to submit your appointment request. Please try again.',
    });
  }
}
