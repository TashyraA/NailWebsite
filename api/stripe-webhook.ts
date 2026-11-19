import { createHmac, timingSafeEqual } from 'crypto';
import { verifyBooking } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

export const config = { api: { bodyParser: false } };
const DEPOSIT_CENTS = 2000;
const TOLERANCE_SECONDS = 300;

const readRawBody = async (req: any): Promise<string> => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const verifyStripeSignature = (payload: string, header: string, secret: string): boolean => {
  const pairs = header.split(',').map(part => part.trim().split('='));
  const timestamp = pairs.find(([key]) => key === 't')?.[1];
  const signatures = pairs.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`).digest('hex'), 'hex');
  return signatures.some(value => {
    if (!/^[0-9a-f]{64}$/i.test(value)) return false;
    const actual = Buffer.from(value, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
};

const readBookingToken = (metadata: Record<string, string>): string => {
  // Supports previously created Checkout Sessions, too.
  if (metadata.booking_token) return metadata.booking_token;
  const chunks: string[] = [];
  for (let i = 0; i < 20; i++) {
    const chunk = metadata[`booking_token_${i}`];
    if (!chunk) break;
    chunks.push(chunk);
  }
  if (!chunks.length) throw new Error('Missing booking token');
  return chunks.join('');
};

const money = (value: number) => `$${value.toFixed(2)}`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];
    if (!secret || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing webhook configuration or signature' });
    }
    const raw = await readRawBody(req);
    if (!verifyStripeSignature(raw, signature, secret)) {
      return res.status(400).json({ error: 'Invalid Stripe signature' });
    }

    const event = JSON.parse(raw);
    if (event.type !== 'checkout.session.completed') {
      return res.status(200).json({ received: true });
    }
    const session = event.data?.object;
    const metadata = (session?.metadata || {}) as Record<string, string>;
    if (session?.mode !== 'payment' || session?.payment_status !== 'paid' ||
        session?.currency !== 'usd') {
      return res.status(200).json({ received: true, ignored: 'Unpaid or unsupported session' });
    }
    if (metadata.payment_type !== 'deposit' && metadata.payment_type !== 'balance') {
      return res.status(200).json({ received: true, ignored: 'Other payment type' });
    }
    if (metadata.payment_type === 'deposit' && session.amount_total !== DEPOSIT_CENTS) {
      console.error('Deposit amount mismatch', session.id, session.amount_total);
      return res.status(400).json({ error: 'Unexpected deposit amount' });
    }

    const token = readBookingToken(metadata);
    const booking = verifyBooking(token);
    const services = booking.services.map(item =>
      `${item.service?.title || item.title || 'Nail service'} x${item.quantity || 1}`
    ).join(', ');
    const businessEmail = process.env.BUSINESS_EMAIL;
    if (!businessEmail) throw new Error('BUSINESS_EMAIL is not configured');

    if (metadata.payment_type === 'deposit') {
      const signingKey = process.env.BOOKING_LINK_SECRET;
      if (!signingKey) throw new Error('BOOKING_LINK_SECRET is not configured');
      const reviewSignature = createHmac('sha256', signingKey).update(`review:${session.id}`).digest('hex');
      const origin = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
      const reviewUrl = `${origin}/api/approve-appointment?session_id=${encodeURIComponent(session.id)}&sig=${reviewSignature}`;
      await sendEmail(booking.customerEmail,
        'InLoveNailz | Your $20 deposit was received',
        `<h2>Deposit received</h2><p>Hi ${escapeHtml(booking.customerName)}, we received your $20 deposit.</p>` +
        `<p>Your appointment request for ${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)} is <strong>pending Briana's approval</strong>.</p>` +
        `<p>Services: ${escapeHtml(services)}</p>`);
      await sendEmail(businessEmail,
        `InLoveNailz | Deposit paid: ${booking.customerName}`,
        `<h2>Appointment waiting for approval</h2>` +
        `<p>${escapeHtml(booking.customerName)} (${escapeHtml(booking.customerEmail)}, ${escapeHtml(booking.customerPhone)})</p>` +
        `<p>${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}</p>` +
        `<p>Services: ${escapeHtml(services)}</p>` +
        `<p>Total: ${money(booking.totalPrice)} | Deposit: $20.00 | Balance: ${money(booking.balanceDue)}</p>` +
        (booking.notes ? `<p>Notes: ${escapeHtml(booking.notes)}</p>` : '') +
        `<p><a href="${escapeHtml(reviewUrl)}">Review appointment — approve or decline</a></p>` +
        `<p>Stripe session: ${escapeHtml(String(session.id))}</p>`);
    } else {
      await sendEmail(businessEmail,
        `InLoveNailz | Remaining balance paid: ${booking.customerName}`,
        `<h2>Remaining balance paid</h2><p>${escapeHtml(booking.customerName)} paid ${money(session.amount_total / 100)} for ${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}.</p>`);
      await sendEmail(booking.customerEmail, 'InLoveNailz | Balance payment received',
        `<h2>Payment received</h2><p>Thank you, ${escapeHtml(booking.customerName)}. Your remaining balance payment was received.</p>`);
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
