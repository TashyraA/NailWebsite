
import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

const COOKIE_NAME = 'inlovenailz_admin_session';

function getCookieValue(
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

  if (parts.length !== 4) return false;

  const [version, expiresAtText, nonce, signature] = parts;

  if (version !== 'v1') return false;

  if (!/^\d+$/.test(expiresAtText)) return false;

  if (!/^[a-f0-9]{48}$/i.test(nonce)) return false;

  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

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

  const expectedSignature = createHmac('sha256', secret)
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

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    console.error('ADMIN_SESSION_SECRET is missing');

    return res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Authentication is not configured',
    });
  }

  const cookieHeader =
    typeof req.headers.cookie === 'string'
      ? req.headers.cookie
      : '';

  const token = getCookieValue(
    cookieHeader,
    COOKIE_NAME
  );

  const authenticated = token
    ? verifySessionToken(token, secret)
    : false;

  return res.status(200).json({
    success: true,
    authenticated,
  });
}
