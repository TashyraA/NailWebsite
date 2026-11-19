
import {
  normalizeBooking,
  signBooking,
} from './_booking.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   STRIPE DEPOSIT CHECKOUT

   $20 PER APPOINTMENT
========================================= */

const DEPOSIT_AMOUNT_CENTS = 2000;
const DEPOSIT_AMOUNT_DOLLARS = 20;

const getAppUrl = () => {
  const configuredUrl = process.env.APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:5173';
};

export default async function handler(
  req: any,
  res: any
) {
  /* =====================================
     ALLOW POST REQUESTS ONLY
  ===================================== */

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    /* =====================================
       STRIPE CONFIGURATION
    ===================================== */

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.error(
        'Missing STRIPE_SECRET_KEY'
      );

      return res.status(500).json({
        error:
          'Payment processing is temporarily unavailable.',
      });
    }

    /* =====================================
       NORMALIZE BOOKING
    ===================================== */

    const booking = normalizeBooking(req.body);

    /* =====================================
       VALIDATE CUSTOMER INFORMATION
    ===================================== */

    if (
      !booking.customerName ||
      !booking.customerEmail ||
      !booking.customerPhone
    ) {
      return res.status(400).json({
        error:
          'Please provide your name, email, and phone number.',
      });
    }

    /* =====================================
       VALIDATE APPOINTMENT
    ===================================== */

    if (
      !booking.appointmentDate ||
      !booking.appointmentTime
    ) {
      return res.status(400).json({
        error:
          'Please select an appointment date and time.',
      });
    }

    /* =====================================
       VALIDATE SERVICES
    ===================================== */

    if (
      !Array.isArray(booking.services) ||
      booking.services.length === 0
    ) {
      return res.status(400).json({
        error:
          'Please select at least one nail service.',
      });
    }

    /* =====================================
       VALIDATE DEPOSIT

       One $20 deposit per appointment.
    ===================================== */

    if (
      booking.depositPaid !==
      DEPOSIT_AMOUNT_DOLLARS
    ) {
      return res.status(400).json({
        error:
          'The booking deposit must be $20 per appointment.',
      });
    }

    /* =====================================
       PREPARE BOOKING TOKEN
    ===================================== */

    const bookingToken = signBooking(booking);

    /* =====================================
       PREPARE SERVICE DESCRIPTION
    ===================================== */

    const serviceDescription = booking.services
      .map(item => {
        const title =
          item.service?.title ||
          item.title ||
          'Nail service';

        const quantity = item.quantity || 1;

        return `${title} x${quantity}`;
      })
      .join(', ')
      .slice(0, 500);

    /* =====================================
       CHECKOUT URLS
    ===================================== */

    const appUrl = getAppUrl();

    const successUrl =
      `${appUrl}/booking-confirmation?deposit=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${appUrl}/book`;

    /* =====================================
       CREATE STRIPE SESSION
    ===================================== */

    const params = new URLSearchParams({
      mode: 'payment',

      success_url: successUrl,
      cancel_url: cancelUrl,

      customer_email:
        booking.customerEmail,

      'line_items[0][price_data][currency]':
        'usd',

      'line_items[0][price_data][product_data][name]':
        'InLoveNailz Appointment Deposit',

      'line_items[0][price_data][product_data][description]':
        serviceDescription,

      'line_items[0][price_data][unit_amount]':
        String(DEPOSIT_AMOUNT_CENTS),

      'line_items[0][quantity]':
        '1',

      'metadata[payment_type]':
        'deposit',

      'metadata[booking_token]':
        bookingToken,
    });

    /* =====================================
       REQUEST STRIPE CHECKOUT
    ===================================== */

    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${stripeSecretKey}`,

          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body: params.toString(),
      }
    );

    const session = await response.json();

    /* =====================================
       HANDLE STRIPE ERRORS
    ===================================== */

    if (!response.ok) {
      console.error(
        'Stripe checkout error:',
        session.error?.message
      );

      return res.status(502).json({
        error:
          'Unable to start secure checkout. Please try again.',
      });
    }

    if (!session.url) {
      return res.status(502).json({
        error:
          'Stripe did not return a checkout URL.',
      });
    }

    /* =====================================
       RETURN CHECKOUT URL
    ===================================== */

    return res.status(200).json({
      url: session.url,
    });
  } catch (error: unknown) {
    console.error(
      'Deposit checkout error:',
      error
    );

    return res.status(500).json({
      error:
        'Unable to create deposit checkout. Please try again.',
    });
  }
}
