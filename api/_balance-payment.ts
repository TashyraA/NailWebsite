import { appUrl } from './_booking';

export type ConfirmedBooking = {
  id: string;
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  services: string;
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
};

export const createBalancePaymentLink = async (booking: ConfirmedBooking, bookingToken = '') => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (booking.balanceDue <= 0) return '';

  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${appUrl()}/payment-success?type=balance&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: appUrl(),
    customer_email: booking.customerEmail,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': `Remaining balance - ${booking.customerName}`,
    'line_items[0][price_data][product_data][description]': booking.services || 'Nail appointment balance',
    'line_items[0][price_data][unit_amount]': String(Math.round(booking.balanceDue * 100)),
    'line_items[0][quantity]': '1',
    'metadata[booking_id]': booking.id,
    'metadata[payment_type]': 'balance',
    'metadata[booking_token]': bookingToken,
    'metadata[customer_email]': booking.customerEmail
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `balance-${booking.id}`
    },
    body: params
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error?.message || 'Unable to create balance payment link');
  return session.url as string;
};