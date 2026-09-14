import { createHmac, timingSafeEqual } from 'node:crypto';
import { appUrl, verifyBooking } from './_booking';
import { createBalancePaymentLink } from './_balance-payment';
import { escapeHtml, sendEmail } from './_email';

export const config = { runtime: 'nodejs20.x', api: { bodyParser: false } };

const readRawBody = async (req: any): Promise<string> => {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const verifyStripeSignature = (payload: string, signature: string, secret: string) => {
  const parts = Object.fromEntries(signature.split(',').map((part: string) => part.split('=')));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rawBody = await readRawBody(req);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];
    if (!webhookSecret || !signature || !verifyStripeSignature(rawBody, String(signature), webhookSecret)) return res.status(400).json({ error: 'Invalid Stripe signature' });

    const event = JSON.parse(rawBody);
    if (event.type !== 'checkout.session.completed') return res.status(200).json({ received: true });
    const session = event.data.object;
    const metadata = session.metadata || {};
    const booking = verifyBooking(String(metadata.booking_token || ''));
    const services = booking.services.map(item => `${item.service?.title || item.title || 'Nail service'} x${item.quantity || 1}`).join(', ');
    const businessEmail = process.env.BUSINESS_EMAIL || 'brianalehota@gmail.com';

    if (metadata.payment_type === 'deposit') {
      const approveUrl = `${appUrl()}/api/approve-appointment?action=approve&token=${encodeURIComponent(metadata.booking_token)}`;
      const declineUrl = `${appUrl()}/api/approve-appointment?action=decline&token=${encodeURIComponent(metadata.booking_token)}`;
      await sendEmail(booking.customerEmail, 'Your InLoveNailz booking request is pending', `<h2>Deposit received</h2><p>Hi ${escapeHtml(booking.customerName)}, your $20 deposit was received. Your appointment is pending approval.</p><p>${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}</p><p>Services: ${escapeHtml(services)}</p>`);
      await sendEmail(businessEmail, `Deposit paid: ${escapeHtml(booking.customerName)}`, `<h2>New booking waiting for approval</h2><p>${escapeHtml(booking.customerName)} requested ${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}.</p><p>Services: ${escapeHtml(services)}</p><p>Total: $${booking.totalPrice.toFixed(2)} | Deposit: $${booking.depositPaid.toFixed(2)} | Balance: $${booking.balanceDue.toFixed(2)}</p><p><a href="${approveUrl}">Approve appointment</a> | <a href="${declineUrl}">Decline appointment</a></p>`);
    }

    if (metadata.payment_type === 'balance') {
      await sendEmail(businessEmail, `Remaining balance paid: ${escapeHtml(booking.customerName)}`, `<h2>Remaining balance paid</h2><p>${escapeHtml(booking.customerName)} paid the remaining balance for ${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}.</p><p>Services: ${escapeHtml(services)}</p><p>Amount paid: $${((session.amount_total || 0) / 100).toFixed(2)}</p>`);
      await sendEmail(booking.customerEmail, 'Thank you for completing payment', `<h2>Payment complete</h2><p>Thank you, ${escapeHtml(booking.customerName)}. Your appointment is paid in full.</p><p>${escapeHtml(booking.appointmentDate)} at ${escapeHtml(booking.appointmentTime)}</p><p>Services: ${escapeHtml(services)}</p>`);
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
}