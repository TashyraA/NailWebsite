import { normalizeBooking, signBooking } from './_booking';

export const config = { runtime: 'nodejs20.x' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    const booking = normalizeBooking(req.body);
    if (!booking.customerName || !booking.customerEmail || !booking.customerPhone || !booking.appointmentDate || !booking.appointmentTime || !booking.services.length) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }
    if (booking.depositPaid !== 20) return res.status(400).json({ error: 'The booking deposit must be $20' });

    const bookingToken = signBooking(booking);
    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${process.env.APP_URL || `https://${process.env.VERCEL_URL || 'localhost:5173'}`}/booking-confirmation?deposit=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/checkout`,
      customer_email: booking.customerEmail,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'Nail appointment deposit',
      'line_items[0][price_data][product_data][description]': booking.services.map(item => `${item.service?.title || item.title} x${item.quantity || 1}`).join(', '),
      'line_items[0][price_data][unit_amount]': '2000',
      'line_items[0][quantity]': '1',
      'metadata[payment_type]': 'deposit',
      'metadata[booking_token]': bookingToken
    });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params
    });
    const session = await response.json();
    if (!response.ok) throw new Error(session.error?.message || 'Stripe could not create checkout');
    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to create deposit checkout' });
  }
}