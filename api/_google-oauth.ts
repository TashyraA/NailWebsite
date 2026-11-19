import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const origin = 'https://www.inlovenailz.com';
export const callbackUrl = `${origin}/api/google-calendar-callback`;
const cookieName = 'inl_google_oauth_state';

export function settings() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  const setupKey = process.env.GOOGLE_OAUTH_SETUP_KEY;
  const allowedEmail = process.env.GOOGLE_ADMIN_EMAIL;
  if (!clientId || !clientSecret || !calendarId || !stateSecret || !setupKey || !allowedEmail) {
    throw new Error('Google OAuth setup is missing required environment variables');
  }
  if (stateSecret.length < 32 || setupKey.length < 32) throw new Error('Google OAuth setup secrets must be at least 32 characters');
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI !== callbackUrl) {
    throw new Error('GOOGLE_REDIRECT_URI must match the registered production callback URL');
  }
  return { clientId, clientSecret, calendarId, stateSecret, setupKey, allowedEmail: allowedEmail.toLowerCase().trim() };
}

export function constantTimeMatch(a: string, b: string) {
  const x = createHmac('sha256', 'inlovenailz-compare').update(a).digest();
  const y = createHmac('sha256', 'inlovenailz-compare').update(b).digest();
  return timingSafeEqual(x, y);
}

export function signState(nonce: string, issuedAt: number, secret: string) {
  const value = `${nonce}.${issuedAt}`;
  const mac = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${mac}`;
}

export function newState(secret: string) {
  return signState(randomBytes(24).toString('base64url'), Date.now(), secret);
}

export function validState(state: string, secret: string) {
  const pieces = state.split('.');
  if (pieces.length !== 3) return false;
  const issuedAt = Number(pieces[1]);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > Date.now() + 60_000 || Date.now() - issuedAt > 10 * 60_000) return false;
  return constantTimeMatch(state, signState(pieces[0], issuedAt, secret));
}

export function setStateCookie(res: ServerResponse, value: string) {
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/api/google-calendar-callback; Max-Age=600`);
}

export function clearStateCookie(res: ServerResponse) {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/api/google-calendar-callback; Max-Age=0`);
}

export function getStateCookie(req: IncomingMessage) {
  const cookies = String(req.headers.cookie || '').split(';').map(s => s.trim());
  const found = cookies.find(s => s.startsWith(`${cookieName}=`));
  if (!found) return '';
  try { return decodeURIComponent(found.slice(cookieName.length + 1)); } catch { return ''; }
}

export function protect(res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
}

export function htmlEscape(value: unknown) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
