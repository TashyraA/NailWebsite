
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyBooking, appUrl } from './_booking.js';
import { createBalancePaymentLink } from './_balance-payment.js';
import { escapeHtml, sendEmail } from './_email.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   LEGACY APPOINTMENT REVIEW

   - Preserves review of existing paid bookings
   - Supports variable paid deposit amounts
   - Verifies Stripe payment before approval
   - Preserves balance-payment functionality

   New unpaid requests will use a separate
   approval workflow once booking storage
   and calendar integration are implemented.
========================================= */

const stripe = async (
  path: string,
  init: RequestInit = {}
) => {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error('Stripe is not configured');
  }

  const response = await fetch(
    `https://api.stripe.com/v1/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(init.headers || {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || 'Stripe request failed'
    );
  }

  return data;
};

const signatureFor = (sessionId: string) =>
  createHmac(
    'sha256',
    process.env.BOOKING_LINK_SECRET || ''
  )
    .update(`review:${sessionId}`)
    .digest('hex');

const authorized = (id: string, sig: string) => {
  if (
    !process.env.BOOKING_LINK_SECRET ||
    !/^[0-9a-f]{64}$/i.test(sig)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(sig.toLowerCase(), 'hex'),
    Buffer.from(signatureFor(id), 'hex')
  );
};

const bookingToken = (
  metadata: Record<string, string>
) => {
  if (metadata.booking_token) {
    return metadata.booking_token;
  }

  const chunks: string[] = [];

  for (let i = 0; i < 20; i++) {
    const chunk = metadata[`booking_token_${i}`];

    if (!chunk) break;

    chunks.push(chunk);
  }

  if (!chunks.length) {
    throw new Error('Booking details not found');
  }

  return chunks.join('');
};

const page = (
  title: string,
  body: string
) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      >
      <title>${escapeHtml(title)}</title>
    </head>

    <body style="
      font-family:Arial,sans-serif;
      background:#fff7f8;
      color:#29252b;
      padding:48px 20px;
    ">
      <main style="
        max-width:550px;
        margin:auto;
        background:white;
        padding:32px;
        border-radius:18px;
      ">
        <h1 style="color:#963f60;">
          ${escapeHtml(title)}
        </h1>
        ${body}
      </main>
    </body>
  </html>
`;

const respond = (
  res: any,
  status: number,
  title: string,
  body: string
) =>
  res
    .status(status)
    .setHeader(
      'Content-Type',
      'text/html; charset=utf-8'
    )
    .send(page(title, body));

const money = (n: number) =>
  `$${n.toFixed(2)}`;

export default async function handler(
  req: any,
  res: any
) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    const id = String(
      req.query?.session_id || ''
    );

    const sig = String(
      req.query?.sig || ''
    );

    if (
      !/^cs_(test_|live_)[A-Za-z0-9]+$/.test(id) ||
      !authorized(id, sig)
    ) {
      return respond(
        res,
        403,
        'Invalid review link',
        '<p>This link is not valid.</p>'
      );
    }

    const session = await stripe(
      `checkout/sessions/${encodeURIComponent(id)}`
    );

    const amountCents = Number(
      session.amount_total
    );

    if (
      session.mode !== 'payment' ||
      session.payment_status !== 'paid' ||
      session.currency !== 'usd' ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      session.metadata?.payment_type !== 'deposit'
    ) {
      return respond(
        res,
        400,
        'Payment not verified',
        '<p>This legacy appointment request does not have a verified payment.</p>'
      );
    }

    const token = bookingToken(
      session.metadata || {}
    );

    const booking = verifyBooking(token);

    const expectedCents =
      typeof booking.depositPaid === 'number'
        ? Math.round(booking.depositPaid * 100)
        : 0;

    if (
      expectedCents <= 0 ||
      expectedCents !== amountCents
    ) {
      return respond(
        res,
        400,
        'Payment amount mismatch',
        '<p>The payment amount does not match the booking details.</p>'
      );
    }

    const paidAmount = amountCents / 100;

    const remainingBalance = Math.max(
      0,
      booking.totalPrice - paidAmount
    );

    const status =
      session.metadata?.appointment_status ||
      'pending';

    if (status !== 'pending') {
      return respond(
        res,
        200,
        'Already processed',
        `<p>This appointment is currently <strong>${escapeHtml(status)}</strong>.</p>`
      );
    }

    const services = booking.services
      .map(
        s =>
          `${
            s.title ||
            s.service?.title ||
            'Nail service'
          } x${s.quantity || 1}`
      )
      .join(', ');

    const details = `
      <p>
        <strong>
          ${escapeHtml(booking.customerName)}
        </strong>
      </p>

      <p>
        ${escapeHtml(booking.appointmentDate)}
        at
        ${escapeHtml(booking.appointmentTime)}
      </p>

      <p>
        ${escapeHtml(services)}
      </p>

      <p>
        Service total:
        ${money(booking.totalPrice)}
      </p>

      <p>
        Payment received:
        ${money(paidAmount)}
      </p>

      <p>
        Remaining balance:
        ${money(remainingBalance)}
      </p>
    `;

    /* =====================================
       REVIEW PAGE
    ===================================== */

    if (req.method === 'GET') {
      const actionUrl =
        `/api/approve-appointment` +
        `?session_id=${encodeURIComponent(id)}` +
        `&sig=${encodeURIComponent(sig)}`;

      return respond(
        res,
        200,
        'Review appointment',
        `
          ${details}

          <p>
            Choose an action below.
            No change is made until you
            press a button.
          </p>

          <form method="POST" action="${actionUrl}">
            <button
              name="action"
              value="approve"
              style="
                padding:14px 24px;
                background:#963f60;
                color:white;
                border:0;
                border-radius:9px;
                margin-right:12px;
                cursor:pointer;
              "
            >
              Approve
            </button>

            <button
              name="action"
              value="decline"
              style="
                padding:14px 24px;
                background:#eee;
                border:0;
                border-radius:9px;
                cursor:pointer;
              "
              onclick="return confirm('Decline this appointment and refund the payment?')"
            >
              Decline &amp; Refund
            </button>
          </form>
        `
      );
    }

    /* =====================================
       PROCESS REVIEW ACTION
    ===================================== */

    const action = String(
      req.body?.action || ''
    );

    if (
      action !== 'approve' &&
      action !== 'decline'
    ) {
      return respond(
        res,
        400,
        'Invalid action',
        '<p>Choose Approve or Decline.</p>'
      );
    }

    /* =====================================
       APPROVE
    ===================================== */

    if (action === 'approve') {
      const location =
        process.env.APPOINTMENT_ADDRESS;

      if (!location) {
        return respond(
          res,
          503,
          'Location not configured',
          '<p>Set APPOINTMENT_ADDRESS in Vercel before approving appointments.</p>'
        );
      }

      await stripe(
        `checkout/sessions/${encodeURIComponent(id)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'metadata[appointment_status]':
              'approved',
          }),
        }
      );

      const paymentUrl =
        remainingBalance > 0
          ? await createBalancePaymentLink(
              {
                id: booking.id,
                customerName: booking.customerName,
                customerEmail: booking.customerEmail,
                appointmentDate: booking.appointmentDate,
                appointmentTime: booking.appointmentTime,
                services,
                totalPrice: booking.totalPrice,
                depositPaid: paidAmount,
                balanceDue: remainingBalance,
              },
              token
            )
          : null;

      await sendEmail(
        booking.customerEmail,
        'InLoveNailz | Your appointment is confirmed',
        `
          <h2>Appointment confirmed!</h2>

          <p>
            Hi ${escapeHtml(booking.customerName)},
            Briana approved your appointment.
          </p>

          <p>
            <strong>
              ${escapeHtml(booking.appointmentDate)}
              at
              ${escapeHtml(booking.appointmentTime)}
            </strong>
          </p>

          <p>
            Location:
            ${escapeHtml(location)}
          </p>

          <p>
            Services:
            ${escapeHtml(services)}
          </p>

          <p>
            Total:
            ${money(booking.totalPrice)}
          </p>

          <p>
            Payment received:
            ${money(paidAmount)}
          </p>

          <p>
            Remaining balance:
            ${money(remainingBalance)}
          </p>

          ${
            paymentUrl
              ? `
                <p>
                  <a href="${escapeHtml(paymentUrl)}">
                    Pay remaining balance online
                  </a>
                </p>
              `
              : ''
          }
        `
      );

      return respond(
        res,
        200,
        'Appointment approved',
        '<p>The appointment was marked approved and a confirmation email was sent.</p>'
      );
    }

    /* =====================================
       DECLINE & REFUND
    ===================================== */

    if (!session.payment_intent) {
      throw new Error(
        'Original Stripe payment not found'
      );
    }

    const refund = await stripe('refunds', {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
        'Idempotency-Key':
          `inlovenailz-decline-${id}`,
      },
      body: new URLSearchParams({
        payment_intent: String(
          session.payment_intent
        ),
        amount: String(amountCents),
        reason: 'requested_by_customer',
        'metadata[booking_id]': booking.id,
      }),
    });

    await stripe(
      `checkout/sessions/${encodeURIComponent(id)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'metadata[appointment_status]':
            'declined',
          'metadata[refund_id]':
            refund.id,
        }),
      }
    );

    await sendEmail(
      booking.customerEmail,
      'InLoveNailz | Appointment request declined',
      `
        <h2>Appointment request update</h2>

        <p>
          Hi ${escapeHtml(booking.customerName)},
          Briana cannot accept your appointment
          request for
          ${escapeHtml(booking.appointmentDate)}
          at
          ${escapeHtml(booking.appointmentTime)}.
        </p>

        <p>
          Your payment refund of
          ${money(paidAmount)}
          has been initiated to your
          original payment method.
        </p>

        <p>
          Your bank may take several
          business days to show the refund.
        </p>
      `
    );

    return respond(
      res,
      200,
      'Appointment declined',
      `<p>A refund of ${money(paidAmount)} was initiated and the customer was notified.</p>`
    );
  } catch (error: unknown) {
    console.error(
      'Appointment review failed:',
      error
    );

    return respond(
      res,
      500,
      'Unable to process appointment',
      '<p>Please check Stripe and the appointment status before retrying. Do not issue an additional manual refund without verifying the original payment.</p>'
    );
  }
}
