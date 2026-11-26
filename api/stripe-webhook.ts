
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyBooking, appUrl } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

import {
  handleNeonDepositWebhook,
} from './_neon-deposit-webhook.js';

import {
  handleNeonBalanceWebhook,
} from './_neon-balance-webhook.js';

import {
  BALANCE_PAYMENT_TYPE,
} from './_neon-balance-payment.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   STRIPE PAYMENT WEBHOOK

   - Verifies Stripe webhook signatures
   - Supports variable appointment deposits
   - Supports Neon remaining balance payments
   - Separates deposit and balance processing
   - Preserves legacy payment sessions
   - Sends payment notifications
   - Preserves appointment review links
   - Preserves existing deposit functionality
========================================= */

export const config = {
  api: {
    bodyParser: false,
  },
};

const TOLERANCE_SECONDS = 300;

/* =====================================
   READ RAW WEBHOOK BODY
===================================== */

const MAX_WEBHOOK_BYTES = 1024 * 1024;

class WebhookBodyTooLarge extends Error {}

const readRawBody = async (req: any): Promise<Buffer> => {
  const supplied = req.rawBody ?? req.body;
  if (Buffer.isBuffer(supplied) || typeof supplied === 'string') {
    const body = Buffer.isBuffer(supplied) ? supplied : Buffer.from(supplied, 'utf8');
    if (body.length > MAX_WEBHOOK_BYTES) throw new WebhookBodyTooLarge();
    return body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_WEBHOOK_BYTES) throw new WebhookBodyTooLarge();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
};

/* =====================================
   VERIFY STRIPE SIGNATURE
===================================== */

const verifyStripeSignature = (
  payload: Buffer,
  header: string,
  secret: string
): boolean => {
  const pairs = header
    .split(',')
    .map(part => part.trim().split('='));

  const timestamp = pairs.find(
    ([key]) => key === 't'
  )?.[1];

  const signatures = pairs
    .filter(([key]) => key === 'v1')
    .map(([, value]) => value);

  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !signatures.length
  ) {
    return false;
  }

  if (
    Math.abs(
      Date.now() / 1000 - Number(timestamp)
    ) > TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = Buffer.from(
    createHmac('sha256', secret)
      .update(`${timestamp}.`, 'utf8')
      .update(payload)
      .digest('hex'),
    'hex'
  );

  return signatures.some(value => {
    if (!/^[0-9a-f]{64}$/i.test(value)) {
      return false;
    }

    const actual = Buffer.from(value, 'hex');

    return (
      actual.length === expected.length &&
      timingSafeEqual(actual, expected)
    );
  });
};

/* =====================================
   READ SIGNED BOOKING TOKEN

   Legacy Stripe payment sessions only.

   Neon deposit and balance payments
   use their own database-backed handlers.
===================================== */

const readBookingToken = (
  metadata: Record<string, string>
): string => {
  // Preserve compatibility with older sessions.
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
    throw new Error('Missing booking token');
  }

  return chunks.join('');
};

/* =====================================
   FORMAT CURRENCY
===================================== */

const money = (value: number) =>
  `$${value.toFixed(2)}`;

/* =====================================
   WEBHOOK HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    /* =====================================
       VERIFY WEBHOOK CONFIGURATION
    ===================================== */

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    const signature =
      req.headers['stripe-signature'];

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!webhookSecret || !stripeKey || !/^(sk|rk)_live_[A-Za-z0-9]+$/.test(stripeKey)) {
      return res.status(500).json({ error: 'Webhook configuration unavailable' });
    }
    if (typeof signature !== 'string' || signature.length > 8192) {
      return res.status(400).json({ error: 'Missing or invalid Stripe signature' });
    }

    /* =====================================
       VERIFY STRIPE WEBHOOK SIGNATURE
    ===================================== */

    const raw = await readRawBody(req);

    if (
      !verifyStripeSignature(
        raw,
        signature,
        webhookSecret
      )
    ) {
      return res.status(400).json({
        error: 'Invalid Stripe signature',
      });
    }

    /* =====================================
       READ VERIFIED STRIPE EVENT
    ===================================== */

    let event: any;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid webhook JSON' });
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      return res.status(400).json({ error: 'Invalid Stripe event' });
    }
    if (event.livemode === false) {
      return res.status(200).json({ received: true, ignored: 'Test-mode event' });
    }
    if (event.livemode !== true) {
      return res.status(400).json({ error: 'Missing Stripe event mode' });
    }

    if (
      event.type !==
        'checkout.session.completed'
    ) {
      return res.status(200).json({
        received: true,
      });
    }

    const session = event.data?.object;
    if (!session || typeof session.id !== 'string' ||
        !/^cs_live_[A-Za-z0-9]+$/.test(session.id) || session.livemode !== true) {
      return res.status(400).json({ error: 'Invalid LIVE Checkout Session' });
    }

    const metadata = (
      session?.metadata || {}
    ) as Record<string, string>;

    const paymentType =
      metadata.payment_type;

    /* =====================================
       NEON APPOINTMENT BALANCE PAYMENTS

       Route directly to the dedicated
       balance payment handler.

       The handler independently verifies
       payment status, currency, amount,
       Stripe resources, and appointment
       eligibility.

       It records payment exceptions and
       confirms valid balance payments
       atomically in Neon.

       Never process these payments using
       the legacy signed booking token.
    ===================================== */

    if (
      paymentType === BALANCE_PAYMENT_TYPE
    ) {
      const result =
        await handleNeonBalanceWebhook(
          event
        );

      return res.status(200).json(result);
    }

    /* =====================================
       NEON APPOINTMENT DEPOSITS

       Preserve the existing verified
       Neon deposit payment workflow.
    ===================================== */

    if (
      paymentType ===
        'neon_appointment_deposit'
    ) {
      const result =
        await handleNeonDepositWebhook(
          event
        );

      return res.status(200).json(result);
    }

    /* =====================================
       VERIFY EXISTING PAYMENT TYPES

       Preserve the existing eligibility
       checks for deposit and legacy
       payment sessions.
    ===================================== */

    if (
      session?.mode !== 'payment' ||
      session?.payment_status !== 'paid' ||
      session?.currency !== 'usd'
    ) {
      return res.status(200).json({
        received: true,
        ignored: 'Unpaid or unsupported session',
      });
    }

    /* =====================================
       LEGACY PAYMENT TYPES
    ===================================== */

    if (
      paymentType !== 'deposit' &&
      paymentType !== 'balance'
    ) {
      return res.status(200).json({
        received: true,
        ignored: 'Other payment type',
      });
    }

    /* =====================================
       VERIFY PAYMENT AMOUNT
    ===================================== */

    const amountCents = Number(
      session.amount_total
    );

    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid payment amount',
      });
    }

    const token = readBookingToken(metadata);
    const booking = verifyBooking(token);

    const paidAmount = amountCents / 100;

    if (paymentType === 'deposit') {
      // For legacy sessions, the signed booking
      // contains the expected deposit amount.
      //
      // Future custom-deposit sessions should also
      // sign the selected deposit amount.

      const expectedDeposit =
        booking.depositPaid;

      if (
        typeof expectedDeposit !== 'number' ||
        !Number.isFinite(expectedDeposit) ||
        expectedDeposit <= 0 ||
        Math.round(expectedDeposit * 100) !==
          amountCents
      ) {
        console.error(
          'Deposit amount mismatch:',
          session.id
        );

        return res.status(400).json({
          error: 'Unexpected deposit amount',
        });
      }
    }

    /* =====================================
       PREPARE BOOKING DETAILS
    ===================================== */

    const services = booking.services
      .map(item =>
        `${
          item.service?.title ||
          item.title ||
          'Nail service'
        } x${item.quantity || 1}`
      )
      .join(', ');

    const businessEmail =
      process.env.BUSINESS_EMAIL;

    if (!businessEmail) {
      throw new Error(
        'BUSINESS_EMAIL is not configured'
      );
    }

    /* =====================================
       LEGACY DEPOSIT PAYMENT

       Preserve the original appointment
       review and email workflow.
    ===================================== */

    if (paymentType === 'deposit') {
      const signingKey =
        process.env.BOOKING_LINK_SECRET;

      if (!signingKey) {
        throw new Error(
          'BOOKING_LINK_SECRET is not configured'
        );
      }

      const reviewSignature = createHmac(
        'sha256',
        signingKey
      )
        .update(`review:${session.id}`)
        .digest('hex');

      const reviewUrl =
        `${appUrl()}/api/approve-appointment` +
        `?session_id=${encodeURIComponent(session.id)}` +
        `&sig=${reviewSignature}`;

      const remainingBalance =
        Math.max(
          0,
          booking.totalPrice - paidAmount
        );

      await sendEmail(
        booking.customerEmail,
        'InLoveNailz | Appointment payment received',
        `
          <h2>Payment Received</h2>

          <p>
            Hi ${escapeHtml(booking.customerName)},
          </p>

          <p>
            We received your appointment payment
            of <strong>${money(paidAmount)}</strong>.
          </p>

          <p>
            Your appointment request for
            ${escapeHtml(booking.appointmentDate)}
            at
            ${escapeHtml(booking.appointmentTime)}
            is pending final confirmation.
          </p>

          <p>
            Services: ${escapeHtml(services)}
          </p>
        `
      );

      await sendEmail(
        businessEmail,
        `InLoveNailz | Payment received: ${booking.customerName}`,
        `
          <h2>Appointment Payment Received</h2>

          <p>
            ${escapeHtml(booking.customerName)}
          </p>

          <p>
            ${escapeHtml(booking.customerEmail)}
          </p>

          <p>
            ${escapeHtml(booking.customerPhone)}
          </p>

          <p>
            ${escapeHtml(booking.appointmentDate)}
            at
            ${escapeHtml(booking.appointmentTime)}
          </p>

          <p>
            Services: ${escapeHtml(services)}
          </p>

          <p>
            Service Total:
            ${money(booking.totalPrice)}
          </p>

          <p>
            Payment Received:
            ${money(paidAmount)}
          </p>

          <p>
            Remaining Balance:
            ${money(remainingBalance)}
          </p>

          ${
            booking.notes
              ? `
                <p>
                  Notes:
                  ${escapeHtml(booking.notes)}
                </p>
              `
              : ''
          }

          <p>
            <a href="${escapeHtml(reviewUrl)}">
              Review Appointment
            </a>
          </p>

          <p>
            Stripe Session:
            ${escapeHtml(String(session.id))}
          </p>
        `
      );
    } else {
      /* =====================================
         LEGACY REMAINING BALANCE PAYMENT

         Preserve compatibility with
         previously issued payment links.
      ===================================== */

      await sendEmail(
        businessEmail,
        `InLoveNailz | Balance paid: ${booking.customerName}`,
        `
          <h2>Remaining Balance Paid</h2>

          <p>
            ${escapeHtml(booking.customerName)}
            paid ${money(paidAmount)}.
          </p>

          <p>
            Appointment:
            ${escapeHtml(booking.appointmentDate)}
            at
            ${escapeHtml(booking.appointmentTime)}
          </p>
        `
      );

      await sendEmail(
        booking.customerEmail,
        'InLoveNailz | Balance payment received',
        `
          <h2>Payment Received</h2>

          <p>
            Thank you,
            ${escapeHtml(booking.customerName)}.
          </p>

          <p>
            Your remaining balance payment of
            ${money(paidAmount)}
            was received.
          </p>
        `
      );
    }

    /* =====================================
       SUCCESSFUL WEBHOOK RESPONSE
    ===================================== */

    return res.status(200).json({
      received: true,
    });

  } catch (error: unknown) {
    if (error instanceof WebhookBodyTooLarge) {
      return res.status(413).json({ error: 'Webhook body too large' });
    }
    console.error('Stripe webhook processing failed', {
      errorType: error instanceof Error ? error.name : 'Unknown error',
    });

    return res.status(500).json({
      error: 'Webhook processing failed',
    });
  }
}
