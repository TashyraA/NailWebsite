import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

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
};

const secret = () => process.env.BOOKING_LINK_SECRET || process.env.STRIPE_SECRET_KEY || '';

export const signBooking = (booking: Booking) => {
  const payload = Buffer.from(JSON.stringify({ booking, expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000 })).toString('base64url');
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
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { booking: Booking; expiresAt: number };
  if (decoded.expiresAt < Date.now()) throw new Error('This booking link has expired');
  return decoded.booking;
};

export const normalizeBooking = (body: any): Booking => ({
  id: randomUUID(),
  customerName: String(body.customerName || '').trim(),
  customerEmail: String(body.customerEmail || '').trim(),
  customerPhone: String(body.customerPhone || '').trim(),
  appointmentDate: String(body.appointmentDate || ''),
  appointmentTime: String(body.appointmentTime || ''),
  services: Array.isArray(body.services) ? body.services : [],
  totalPrice: Number(body.totalPrice),
  depositPaid: Number(body.depositPaid),
  balanceDue: Number(body.balanceDue),
  notes: body.notes ? String(body.notes) : undefined
});

export const appUrl = () => process.env.APP_URL || `https://${process.env.VERCEL_URL || 'localhost:5173'}`;