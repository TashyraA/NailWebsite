
import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE NEON BALANCE PAYMENT UTILITIES

   - Dedicated balance payment signing secret
   - Appointment-specific signed payment links
   - No customer personal information in tokens
   - Timing-safe signature verification
   - Production HTTPS website URL validation
   - Exact integer-cent payment calculations
   - Stripe minimum payment validation
   - Secure Stripe API requests
   - Stripe Checkout URL validation
   - Independent from legacy booking payments
   - No automatic charges
========================================= */

export const BALANCE_PAYMENT_TYPE =
  'neon_appointment_balance';

export const MINIMUM_BALANCE_CENTS = 50;

export const MAXIMUM_BALANCE_CENTS = 99_999_999;

export const STRIPE_REQUEST_TIMEOUT_MS = 10_000;

const TOKEN_VERSION = 'v1';

const TOKEN_PURPOSE =
  'inlovenailz:appointment-balance';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIGNATURE_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const SESSION_ID_PATTERN =
  /^cs_(test_|live_)[A-Za-z0-9]+$/;

const PAYMENT_INTENT_PATTERN =
  /^pi_[A-Za-z0-9]+$/;

/* =====================================
   TYPES
===================================== */

export type BalancePaymentAmounts = {
  totalCents: number;
  depositCents: number;
  balancePaidCents: number;
  balanceDueCents: number;
};

export type BalanceStripeSession = {
  id?: string;
  livemode?: boolean;
  url?: string | null;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  payment_intent?: string | null;
  expires_at?: number;
  metadata?: Record<string, string>;
};

export type BalanceStripePaymentIntent = {
  id?: string;
  livemode?: boolean;
  status?: string;
  currency?: string;
  amount?: number;
  amount_received?: number;
  capture_method?: string;

  latest_charge?:
    | string
    | {
        id?: string;
        payment_intent?: string;
        status?: string;
        paid?: boolean;
        captured?: boolean;
        amount?: number;
        amount_captured?: number;
        amount_refunded?: number;
        refunded?: boolean;
        disputed?: boolean;
        livemode?: boolean;
        currency?: string;
        created?: number;
      }
    | null;
};

type StripeRequestOptions = {
  method?: 'GET' | 'POST';
  body?: URLSearchParams;
  idempotencyKey?: string;
};

/* =====================================
   VALIDATE APPOINTMENT ID
===================================== */

export function isValidBalanceAppointmentId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    UUID_PATTERN.test(value)
  );
}

/* =====================================
   VALIDATE STRIPE IDENTIFIERS
===================================== */

export function isValidBalanceSessionId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    SESSION_ID_PATTERN.test(value)
  );
}

export function isValidBalancePaymentIntentId(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    PAYMENT_INTENT_PATTERN.test(value)
  );
}

/* =====================================
   DEDICATED SIGNING SECRET

   Never fall back to STRIPE_SECRET_KEY
   or BOOKING_LINK_SECRET.
===================================== */

function balanceSigningSecret(): Buffer {
  const secret =
    process.env.BALANCE_LINK_SECRET;

  if (
    typeof secret !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(secret)
  ) {
    throw new Error(
      'Balance payment signing secret is not configured correctly.'
    );
  }

  return Buffer.from(secret, 'hex');
}

/* =====================================
   VALIDATE PRODUCTION WEBSITE URL
===================================== */

export function balanceAppUrl(): string {
  const configuredUrl =
    process.env.APP_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      'APP_URL is not configured.'
    );
  }

  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error(
      'APP_URL is invalid.'
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]'
  ) {
    throw new Error(
      'APP_URL must be a valid HTTPS website origin.'
    );
  }

  return url.origin;
}

/* =====================================
   SIGN APPOINTMENT PAYMENT TOKEN

   The token contains only:

   - Token version
   - Appointment UUID
   - HMAC-SHA256 signature

   Customer details and payment amounts
   are never embedded in the token.
===================================== */

function signBalanceAppointment(
  appointmentId: string
): string {
  return createHmac(
    'sha256',
    balanceSigningSecret()
  )
    .update(
      `${TOKEN_PURPOSE}:${TOKEN_VERSION}:${appointmentId}`
    )
    .digest('base64url');
}

/* =====================================
   CREATE BALANCE PAYMENT TOKEN
===================================== */

export function createBalancePaymentToken(
  appointmentId: string
): string {
  if (
    !isValidBalanceAppointmentId(
      appointmentId
    )
  ) {
    throw new Error(
      'Invalid balance payment appointment ID.'
    );
  }

  const normalizedId =
    appointmentId.toLowerCase();

  const signature =
    signBalanceAppointment(normalizedId);

  return (
    `${TOKEN_VERSION}.` +
    `${normalizedId}.` +
    signature
  );
}

/* =====================================
   VERIFY BALANCE PAYMENT TOKEN

   Return the authenticated appointment ID.

   The calling endpoint must independently
   verify the current appointment status
   and payment eligibility in Neon.
===================================== */

export function verifyBalancePaymentToken(
  token: unknown
): string | null {
  if (
    typeof token !== 'string' ||
    token.length !== 83
  ) {
    return null;
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [
    version,
    appointmentId,
    signature,
  ] = parts;

  if (
    version !== TOKEN_VERSION ||
    !isValidBalanceAppointmentId(
      appointmentId
    ) ||
    appointmentId !==
      appointmentId.toLowerCase() ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    return null;
  }

  const expected =
    signBalanceAppointment(appointmentId);

  const suppliedBuffer =
    Buffer.from(signature, 'utf8');

  const expectedBuffer =
    Buffer.from(expected, 'utf8');

  if (
    suppliedBuffer.length !==
      expectedBuffer.length ||
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    )
  ) {
    return null;
  }

  return appointmentId;
}

/* =====================================
   GENERATE DURABLE PAYMENT LINK

   This is an InLoveNailz website link,
   not an expiring Stripe Checkout URL.

   Opening this link must not create a
   Stripe Checkout Session automatically.
===================================== */

export function createNeonBalancePaymentLink(
  appointmentId: string
): string {
  const token =
    createBalancePaymentToken(
      appointmentId
    );

  const url = new URL(
    '/api/balance-payment',
    balanceAppUrl()
  );

  url.searchParams.set(
    'token',
    token
  );

  return url.toString();
}

/* =====================================
   CONVERT PAYMENT AMOUNTS TO CENTS

   Reject invalid values and amounts
   containing fractional cents.
===================================== */

export function balanceAmountToCents(
  value: unknown
): number {
  if (
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    throw new Error(
      'Invalid payment amount.'
    );
  }

  if (
    typeof value === 'string' &&
    !/^\d+(?:\.\d+)?$/.test(value)
  ) {
    throw new Error(
      'Invalid payment amount format.'
    );
  }

  const amount = Number(value);

  const cents = Math.round(
    amount * 100
  );

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - amount) >
      0.000001
  ) {
    throw new Error(
      'Invalid payment amount precision.'
    );
  }

  return cents;
}

/* =====================================
   CALCULATE CURRENT PAYMENT AMOUNTS

   All supplied values must come from
   the authoritative Neon appointment.

   Never trust amounts submitted by
   a customer's browser.
===================================== */

export function calculateBalancePaymentAmounts(
  totalPrice: unknown,
  depositAmount: unknown,
  balancePaidAmount: unknown
): BalancePaymentAmounts {
  const totalCents =
    balanceAmountToCents(totalPrice);

  const depositCents =
    balanceAmountToCents(depositAmount);

  const balancePaidCents =
    balanceAmountToCents(
      balancePaidAmount
    );

  if (
    totalCents <= 0 ||
    depositCents <= 0 ||
    depositCents > totalCents ||
    balancePaidCents >
      totalCents - depositCents
  ) {
    throw new Error(
      'Appointment payment amounts are inconsistent.'
    );
  }

  const balanceDueCents =
    totalCents -
    depositCents -
    balancePaidCents;

  return {
    totalCents,
    depositCents,
    balancePaidCents,
    balanceDueCents,
  };
}

/* =====================================
   VALIDATE STRIPE PAYMENT AMOUNT
===================================== */

export function isPayableBalanceAmount(
  amountCents: unknown
): amountCents is number {
  return (
    typeof amountCents === 'number' &&
    Number.isSafeInteger(amountCents) &&
    amountCents >= MINIMUM_BALANCE_CENTS &&
    amountCents <= MAXIMUM_BALANCE_CENTS
  );
}

/* =====================================
   FORMAT PAYMENT AMOUNT
===================================== */

export function formatBalanceMoney(
  amountCents: number
): string {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 0
  ) {
    throw new Error(
      'Invalid amount for currency formatting.'
    );
  }

  return new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: 'USD',
    }
  ).format(amountCents / 100);
}

/* =====================================
   VALIDATE STRIPE CHECKOUT URL
===================================== */

export function isValidBalanceCheckoutUrl(
  value: unknown
): value is string {
  if (typeof value !== 'string' || !value) {
    console.error('Stripe checkout URL rejected:', {
      checks: [typeof value !== 'string' ? 'not_string' : 'empty'],
    });
    return false;
  }

  try {
    const url = new URL(value);
    const checks: string[] = [];

    if (url.protocol !== 'https:') checks.push('protocol');
    if (url.hostname !== 'checkout.stripe.com') checks.push('hostname');
    if (url.username) checks.push('username');
    if (url.password) checks.push('password');
    if (url.port) checks.push('port');

    if (checks.length) {
      console.error('Stripe checkout URL rejected:', { checks });
    }
    return checks.length === 0;
  } catch {
    console.error('Stripe checkout URL rejected:', {
      checks: ['invalid_url'],
    });
    return false;
  }
}

/* =====================================
   STRIPE API ERROR
===================================== */

export class BalanceStripeApiError
  extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(
      `Stripe balance payment request failed (${statusCode}).`
    );

    this.name =
      'BalanceStripeApiError';

    this.statusCode = statusCode;
  }
}

/* =====================================
   SECURE STRIPE API REQUEST

   - Server-side secret key only
   - Restricted Stripe API origin
   - Request timeout
   - Optional idempotency key
   - No automatic retries
   - No raw Stripe response logging
===================================== */

export async function balanceStripeRequest<T>(
  path: string,
  options: StripeRequestOptions = {}
): Promise<T> {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey || !/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(secretKey)) {
    throw new Error(
      'A LIVE STRIPE_SECRET_KEY is required for balance payment requests.'
    );
  }

  if (
    !path.startsWith('/checkout/sessions') &&
    !path.startsWith('/payment_intents/')
  ) {
    throw new Error(
      'Unsupported Stripe balance payment resource.'
    );
  }

  const url = new URL(
    `https://api.stripe.com/v1${path}`
  );

  if (
    url.origin !==
      'https://api.stripe.com' ||
    !url.pathname.startsWith('/v1/') ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(
      'Invalid Stripe API URL.'
    );
  }

  const method =
    options.method ?? 'GET';

  const headers: Record<string, string> = {
    Authorization:
      `Bearer ${secretKey}`,
    Accept: 'application/json',
  };

  if (method === 'POST') {
    headers['Content-Type'] =
      'application/x-www-form-urlencoded';
  }

  if (options.idempotencyKey) {
    if (
      method !== 'POST' ||
      options.idempotencyKey.length > 255 ||
      !/^[A-Za-z0-9_-]+$/.test(
        options.idempotencyKey
      )
    ) {
      throw new Error(
        'Invalid Stripe idempotency key.'
      );
    }

    headers['Idempotency-Key'] =
      options.idempotencyKey;
  }

  const response = await fetch(
    url.toString(),
    {
      method,
      headers,
      redirect: 'error',

      signal: AbortSignal.timeout(
        STRIPE_REQUEST_TIMEOUT_MS
      ),

      ...(method === 'POST'
        ? {
            body:
              options.body ??
              new URLSearchParams(),
          }
        : {}),
    }
  );

  if (!response.ok) {
    throw new BalanceStripeApiError(
      response.status
    );
  }

  return (
    await response.json()
  ) as T;
}

/* =====================================
   RETRIEVE STRIPE CHECKOUT SESSION
===================================== */

export async function retrieveBalanceSession(
  sessionId: string
): Promise<BalanceStripeSession> {
  if (
    !isValidBalanceSessionId(sessionId)
  ) {
    throw new Error(
      'Invalid Stripe Checkout Session ID.'
    );
  }

  return balanceStripeRequest<
    BalanceStripeSession
  >(
    `/checkout/sessions/${encodeURIComponent(
      sessionId
    )}`
  );
}

/* =====================================
   RETRIEVE STRIPE PAYMENT INTENT

   Expand the latest charge so that the
   webhook can verify actual payment
   and capture information.
===================================== */

export async function retrieveBalancePaymentIntent(
  paymentIntentId: string
): Promise<BalanceStripePaymentIntent> {
  if (
    !isValidBalancePaymentIntentId(
      paymentIntentId
    )
  ) {
    throw new Error(
      'Invalid Stripe PaymentIntent ID.'
    );
  }

  return balanceStripeRequest<
    BalanceStripePaymentIntent
  >(
    `/payment_intents/${encodeURIComponent(
      paymentIntentId
    )}?expand%5B%5D=latest_charge`
  );
}
