import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { deflateRawSync, inflateRawSync } from 'zlib';

export type Booking = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
  notes?: string;
  inspirationUrl?: string;
};

const secret = () => process.env.BOOKING_LINK_SECRET || process.env.STRIPE_SECRET_KEY || '';

export const signBooking = (booking: Booking) => {
  const compact = {
    i: booking.id,
    n: booking.customerName,
    e: booking.customerEmail,
    p: booking.customerPhone,
    d: booking.appointmentDate,
    t: booking.appointmentTime,
    s: booking.services.map(item => [item.service?.title || item.title || 'Nail service', item.quantity || 1]),
    a: booking.totalPrice,
    x: booking.depositPaid,
    b: booking.balanceDue,
    o: booking.notes,
    u: booking.inspirationUrl,
    z: Date.now() + 90 * 24 * 60 * 60 * 1000
  };
  const payload = deflateRawSync(Buffer.from(JSON.stringify(compact))).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

export const verifyBooking = (token: string): Booking => {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !secret()) throw new Error('Invalid booking link');
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid booking link');
  }
  const compact = JSON.parse(inflateRawSync(Buffer.from(payload, 'base64url')).toString()) as any;
  if (compact.z < Date.now()) throw new Error('This booking link has expired');
  return {
    id: compact.i,
    customerName: compact.n,
    customerEmail: compact.e,
    customerPhone: compact.p,
    appointmentDate: compact.d,
    appointmentTime: compact.t,
    services: (compact.s || []).map((item: any[]) => ({ title: item[0], quantity: item[1] })),
    totalPrice: compact.a,
    depositPaid: compact.x,
    balanceDue: compact.b,
    notes: compact.o,
    inspirationUrl: compact.u
  };
};

export const normalizeBooking = (body: any): Booking => ({
  id: randomUUID(),
  customerName: String(body.customerName || body.name || '').trim(),
  customerEmail: String(body.customerEmail || body.email || '').trim(),
  customerPhone: String(body.customerPhone || body.phone || '').trim(),
  appointmentDate: String(body.appointmentDate || ''),
  appointmentTime: String(body.appointmentTime || ''),
  services: Array.isArray(body.services) ? body.services : [],
  totalPrice: Number(body.totalPrice),
  depositPaid: Number(body.depositPaid),
  balanceDue: Number(body.balanceDue),
  notes: body.notes ? String(body.notes) : undefined,
  inspirationUrl: body.inspirationUrl ? String(body.inspirationUrl) : undefined
});

export const appUrl = () => process.env.APP_URL || `https://${process.env.VERCEL_URL || 'localhost:5173'}`;