
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'crypto';

import {
  deflateRawSync,
  inflateRawSync,
} from 'zlib';

/* =========================================
   INLOVENAILZ BY BRIANA
   BOOKING UTILITIES

   - Supports appointment requests
   - Payment information is optional
   - Preserves signed booking links
   - Preserves existing booking details
========================================= */

export type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalPrice: number;

  // Optional for compatibility with payment workflows.
  depositPaid?: number;
  balanceDue?: number;

  notes?: string;
  inspirationUrl?: string;
};

/* =====================================
   SIGNING SECRET
===================================== */

const secret = () =>
  process.env.BOOKING_LINK_SECRET ||
  process.env.STRIPE_SECRET_KEY ||
  '';

/* =====================================
   SIGN BOOKING
===================================== */

export const signBooking = (booking: Booking) => {
  if (!secret()) {
    throw new Error(
      'Booking signing secret is not configured'
    );
  }

  const compact = {
    i: booking.id,
    n: booking.customerName,
    e: booking.customerEmail,
    p: booking.customerPhone,
    d: booking.appointmentDate,
    t: booking.appointmentTime,

    s: booking.services.map(item => [
      item.service?.title ||
        item.title ||
        'Nail service',
      item.quantity || 1,
    ]),

    a: booking.totalPrice,

    // Keep these fields for compatibility with
    // existing and future payment workflows.
    x: booking.depositPaid,
    b: booking.balanceDue,

    o: booking.notes,
    u: booking.inspirationUrl,

    z: Date.now() + 90 * 24 * 60 * 60 * 1000,
  };

  const payload = deflateRawSync(
    Buffer.from(JSON.stringify(compact))
  ).toString('base64url');

  const signature = createHmac(
    'sha256',
    secret()
  )
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

/* =====================================
   VERIFY SIGNED BOOKING
===================================== */

export const verifyBooking = (
  token: string
): Booking => {
  const [payload, signature] = token.split('.');

  if (!payload || !signature || !secret()) {
    throw new Error('Invalid booking link');
  }

  const expected = createHmac(
    'sha256',
    secret()
  )
    .update(payload)
    .digest('base64url');

  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    )
  ) {
    throw new Error('Invalid booking link');
  }

  const compact = JSON.parse(
    inflateRawSync(
      Buffer.from(payload, 'base64url')
    ).toString()
  ) as any;

  if (
    typeof compact.z !== 'number' ||
    compact.z < Date.now()
  ) {
    throw new Error(
      'This booking link has expired'
    );
  }

  return {
    id: compact.i,
    customerName: compact.n,
    customerEmail: compact.e,
    customerPhone: compact.p,
    appointmentDate: compact.d,
    appointmentTime: compact.t,

    services: (compact.s || []).map(
      (item: any[]) => ({
        title: item[0],
        quantity: item[1],
      })
    ),

    totalPrice: compact.a,

    depositPaid:
      typeof compact.x === 'number'
        ? compact.x
        : undefined,

    balanceDue:
      typeof compact.b === 'number'
        ? compact.b
        : undefined,

    notes: compact.o,
    inspirationUrl: compact.u,
  };
};

/* =====================================
   NORMALIZE BOOKING REQUEST
===================================== */

export const normalizeBooking = (
  body: any
): Booking => ({
  id: randomUUID(),

  customerName: String(
    body.customerName || body.name || ''
  ).trim(),

  customerEmail: String(
    body.customerEmail || body.email || ''
  ).trim(),

  customerPhone: String(
    body.customerPhone || body.phone || ''
  ).trim(),

  appointmentDate: String(
    body.appointmentDate || ''
  ),

  appointmentTime: String(
    body.appointmentTime || ''
  ),

  services: Array.isArray(body.services)
    ? body.services
    : [],

  totalPrice: Number(body.totalPrice),

  // Only include payment information if supplied.
  depositPaid:
    body.depositPaid === undefined ||
    body.depositPaid === null ||
    body.depositPaid === ''
      ? undefined
      : Number(body.depositPaid),

  balanceDue:
    body.balanceDue === undefined ||
    body.balanceDue === null ||
    body.balanceDue === ''
      ? undefined
      : Number(body.balanceDue),

  notes: body.notes
    ? String(body.notes)
    : undefined,

  inspirationUrl: body.inspirationUrl
    ? String(body.inspirationUrl)
    : undefined,
});

/* =====================================
   WEBSITE URL
===================================== */

export const appUrl = () => {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:5173';
};
