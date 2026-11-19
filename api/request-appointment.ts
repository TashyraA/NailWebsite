import { normalizeBooking, signBooking } from './_booking.js';
import { escapeHtml, sendEmail } from './_email.js';

const DEPOSIT_CENTS = 2000;

// Stripe limits each metadata value to 500 characters. Split the signed
// booking token so bookings with multiple services still fit.
const bookingMetadata = (token: string) => {
  const chunks = token.match(/.{1,450}/g) || [];
  if (!chunks.length || chunks.length > 20) throw new Error('Booking details are too long');
  return Object.fromEntries(chunks.map((chunk, index) => [
    `metadata[booking_token_${index}]`, chunk,
  ]));
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error('Stripe is not configured');
    if (!process.env.BOOKING_LINK_SECRET) throw new Error('Booking signing secret is not configured');

    const booking = normalizeBooking(req.body || {});
    if (!booking.customerName || !booking.customerEmail || !booking.customerPhone ||
        !booking.appointmentDate || !booking.appointmentTime || !booking.services.length ||
        !Number.isFinite(booking.totalPrice) || booking.totalPrice < 20 ||
        !Number.isFinite(booking.balanceDue) || booking.depositPaid !== 20 ||
        Math.abs(booking.balanceDue - (booking.totalPrice - 20)) > 0.01) {
      return res.status(400).json({ error: 'Invalid or incomplete appointment details' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.customerEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // IMPORTANT: Before launch, calculate prices/durations from a trusted server-side
    // service catalog and check calendar availability here. Client totals are untrusted.
    const bookingToken = signBooking(booking);
    const origin = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${origin}/booking-confirmation?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book`,
      customer_email: booking.customerEmail,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'InLoveNailz appointment deposit',
      'line_items[0][price_data][unit_amount]': String(DEPOSIT_CENTS),
      'line_items[0][quantity]': '1',
      'metadata[payment_type]': 'deposit',
      ...bookingMetadata(bookingToken),
      // Checkout Session expires in 24 hours if unpaid.
      expires_at: String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const session = await response.json();
    if (!response.ok || !session.url) throw new Error(session.error?.message || 'Unable to create deposit payment link');

    const services = booking.services.map(item =>
      `${item.service?.title || item.title || 'Nail service'} x${item.quantity || 1}`
    ).join(', ');
    try {
      await sendEmail(
      booking.customerEmail,
      'InLoveNailz | Pay your $20 appointment deposit',
      `<h2>Thank you for requesting an appointment!</h2>
       <p>Hi ${escapeHtml(booking.customerName)},</p>
       <p>We received your request for <strong>${escapeHtml(booking.appointmentDate)}</strong> at <strong>${escapeHtml(booking.appointmentTime)}</strong>.</p>
       <p>Services: ${escapeHtml(services)}</p>
       <p>Total: $${booking.totalPrice.toFixed(2)} | Deposit: $20.00 | Remaining balance: $${booking.balanceDue.toFixed(2)}</p>
       <p><a href="${escapeHtml(session.url)}" style="display:inline-block;padding:14px 22px;background:#963F60;color:white;border-radius:30px;text-decoration:none;font-weight:bold">Pay $20 Deposit Securely</a></p>
       <p>This payment link expires in 24 hours. Your requested time is <strong>not yet reserved or confirmed</strong>. After payment, Briana will review your request and email you an approval or decline decision.</p>`
    );
    } catch (emailError) {
      // Don't leave a payable Checkout Session behind if the email failed.
      try {
        await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}/expire`, {
          method: 'POST', headers: { Authorization: `Bearer ${stripeKey}` },
        });
      } catch (expireError) { console.error('Could not expire unused session', expireError); }
      throw emailError;
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Request appointment error:', error);
    return res.status(500).json({ error: 'Unable to send deposit email. Please try again.' });
  }
}
