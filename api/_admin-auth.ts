
import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

const COOKIE_NAME = 'inlovenailz_admin_session';

function readCookie(
  cookieHeader: string,
  cookieName: string
): string | null {
  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');

    if (separator === -1) continue;

    const name = cookie.slice(0, separator).trim();

    if (name !== cookieName) continue;

    const value = cookie.slice(separator + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

function verifySessionToken(
  token: string,
  secret: string
): boolean {
  const parts = token.split('.');

  if (parts.length !== 4) {
    return false;
  }

  const [
    version,
    expiresAtText,
    nonce,
    signature,
  ] = parts;

  if (version !== 'v1') {
    return false;
  }

  if (!/^\d+$/.test(expiresAtText)) {
    return false;
  }

  if (!/^[a-f0-9]{48}$/i.test(nonce)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expiresAt = Number(expiresAtText);

  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const payload = [
    version,
    expiresAtText,
    nonce,
  ].join('.');

  const expectedSignature = createHmac(
    'sha256',
    secret
  )
    .update(payload)
    .digest();

  const receivedSignature = Buffer.from(
    signature,
    'hex'
  );

  if (
    receivedSignature.length !==
    expectedSignature.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedSignature,
    expectedSignature
  );
}

/**
 * Verifies an administrator session using the
 * HttpOnly cookie issued by /api/admin-login.
 */
export function isAdminRequest(
  req: any
): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const cookieHeader =
    typeof req.headers?.cookie === 'string'
      ? req.headers.cookie
      : '';

  const token = readCookie(
    cookieHeader,
    COOKIE_NAME
  );

  if (!token) {
    return false;
  }

  return verifySessionToken(token, secret);
}

/**
 * Checks that a browser request originated
 * from the same website handling the request.
 *
 * Use this for POST, PATCH, PUT and DELETE APIs.
 */
export function isSameOriginRequest(
  req: any
): boolean {
  const origin = req.headers?.origin;
  const host = req.headers?.host;

  if (
    typeof origin !== 'string' ||
    typeof host !== 'string'
  ) {
    return false;
  }

  try {
    const originUrl = new URL(origin);

    if (originUrl.host !== host) {
      return false;
    }

    return (
      originUrl.protocol === 'https:' ||
      (
        process.env.NODE_ENV !== 'production' &&
        originUrl.protocol === 'http:'
      )
    );
  } catch {
    return false;
  }
}

/**
 * Call this at the beginning of protected APIs.
 * Returns true when the request is authorized.
 * Otherwise, sends an error response.
 */
export function requireAdmin(
  req: any,
  res: any,
  requireSameOrigin = false
): boolean {
  res.setHeader('Cache-Control', 'no-store');

  if (
    requireSameOrigin &&
    !isSameOriginRequest(req)
  ) {
    res.status(403).json({
      success: false,
      error: 'Invalid request origin',
    });

    return false;
  }

  if (!isAdminRequest(req)) {
    res.status(401).json({
      success: false,
      error: 'Administrator authentication required',
    });

    return false;
  }

  return true;
}
