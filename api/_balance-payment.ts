
import { appUrl } from './_booking.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   REMAINING BALANCE PAYMENT HELPER

   - Supports custom deposit amounts
   - Creates payment links for remaining balances
   - Preserves Stripe webhook compatibility
   - No automatic payment on appointment request
========================================= */

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

/* =====================================
   BOOKING TOKEN METADATA
===================================== */

const bookingMetadata = (
  token: string
): Record<string, string> => {
  if (!token) {
    throw new Error(
      'A signed booking token is required'
    );
  }

  const chunks = token.match(/.{1,450}/g) || [];

  if (
    chunks.length === 0 ||
    chunks.length > 20
  ) {
    throw new Error(
      'Booking details are too long'
    );
  }

  return Object.fromEntries(
    chunks.map((chunk, index) => [
      `metadata[booking_token_${index}]`,
      chunk,
    ])
  );
};

/* =====================================
   CREATE BALANCE PAYMENT LINK
===================================== */

export const createBalancePaymentLink = async (
  booking: ConfirmedBooking,
  bookingToken = ''
): Promise<string> => {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured'
    );
  }

  if (
    !Number.isFinite(booking.totalPrice) ||
    !Number.isFinite(booking.depositPaid) ||
    !Number.isFinite(booking.balanceDue) ||
    booking.totalPrice < 0 ||
    booking.depositPaid < 0 ||
    booking.balanceDue < 0
  ) {
    throw new Error(
      'Invalid booking payment amounts'
    );
  }

  const expectedBalance =
    booking.totalPrice - booking.depositPaid;

  if (
    Math.abs(
      expectedBalance - booking.balanceDue
    ) > 0.01
  ) {
    throw new Error(
      'Remaining balance does not match booking total'
    );
  }

  // No balance payment is necessary if the
  // appointment has already been paid in full.
  if (booking.balanceDue === 0) {
    return '';
  }

  const amountCents = Math.round(
    booking.balanceDue * 100
  );

  if (amountCents < 50) {
    throw new Error(
      'Remaining balance is below the minimum payment amount'
    );
  }

  const params = new URLSearchParams({
    mode: 'payment',

    success_url:
      `${appUrl()}/payment-success` +
      `?type=balance&session_id={CHECKOUT_SESSION_ID}`,

    cancel_url: appUrl(),

    customer_email: booking.customerEmail,

    'line_items[0][price_data][currency]':
      'usd',

    'line_items[0][price_data][product_data][name]':
      `Remaining balance - ${booking.customerName}`,

    'line_items[0][price_data][product_data][description]':
      booking.services ||
      'Nail appointment balance',

    'line_items[0][price_data][unit_amount]':
      String(amountCents),

    'line_items[0][quantity]': '1',

    'metadata[booking_id]': booking.id,

    'metadata[payment_type]': 'balance',

    'metadata[customer_email]':
      booking.customerEmail,

    ...bookingMetadata(bookingToken),
  });

  const response = await fetch(
    'https://api.stripe.com/v1/checkout/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,

        'Content-Type':
          'application/x-www-form-urlencoded',

        'Idempotency-Key':
          `balance-${booking.id}`,
      },

      body: params,
    }
  );

  const session = await response.json();

  if (!response.ok || !session.url) {
    throw new Error(
      session.error?.message ||
        'Unable to create balance payment link'
    );
  }

  return session.url as string;
};
