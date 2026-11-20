
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import { neon } from '@neondatabase/serverless';

const COOKIE_NAME = 'inlovenailz_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getCookieHeader(
  token: string,
  maxAge: number
): string {
  const secure =
    process.env.NODE_ENV === 'production'
      ? '; Secure'
      : '';

  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ') + secure;
}

function createSessionToken(secret: string): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SESSION_DURATION_SECONDS;

  const payload = [
    'v1',
    String(expiresAt),
    randomBytes(24).toString('hex'),
  ].join('.');

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  const parts = storedHash.split(':');

  if (parts.length !== 2) return false;

  const [saltHex, expectedHex] = parts;

  if (
    !/^[a-f0-9]{32}$/i.test(saltHex) ||
    !/^[a-f0-9]{128}$/i.test(expectedHex)
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');

  const actual = scryptSync(
    password,
    Buffer.from(saltHex, 'hex'),
    expected.length
  );

  return timingSafeEqual(actual, expected);
}

function isAllowedOrigin(req: any): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (
    typeof origin !== 'string' ||
    typeof host !== 'string'
  ) {
    return false;
  }

  try {
    const originUrl = new URL(origin);

    return (
      originUrl.host === host &&
      (
        originUrl.protocol === 'https:' ||
        (
          process.env.NODE_ENV !== 'production' &&
          originUrl.protocol === 'http:'
        )
      )
    );
  } catch {
    return false;
  }
}

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid request origin',
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const databaseUrl = process.env.DATABASE_URL;

  if (
    !adminEmail ||
    !passwordHash ||
    !sessionSecret ||
    !databaseUrl
  ) {
    console.error(
      'Admin authentication configuration missing'
    );

    return res.status(500).json({
      success: false,
      error: 'Authentication is not configured',
    });
  }

  try {
    const body = req.body || {};

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    if (
      !email ||
      !password ||
      email.length > 254 ||
      password.length > 1024
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid login request',
      });
    }

    const sql = neon(databaseUrl);

    const ipHeader = req.headers['x-forwarded-for'];

    const ip =
      typeof ipHeader === 'string'
        ? ipHeader.split(',')[0].trim()
        : 'unknown';

    const ipHash = createHmac('sha256', sessionSecret)
      .update(ip)
      .digest('hex');

    const attempts = await sql`
      SELECT COUNT(*)::integer AS count
      FROM admin_login_attempts
      WHERE ip_hash = ${ipHash}
        AND attempted_at > NOW() - INTERVAL '15 minutes'
    `;

    if (Number(attempts[0]?.count || 0) >= 10) {
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Try again later.',
      });
    }

    const emailMatches =
      email === adminEmail.trim().toLowerCase();

    const passwordMatches = verifyPassword(
      password,
      passwordHash
    );

    if (!emailMatches || !passwordMatches) {
      await sql`
        INSERT INTO admin_login_attempts (ip_hash)
        VALUES (${ipHash})
      `;

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = createSessionToken(sessionSecret);

    res.setHeader(
      'Set-Cookie',
      getCookieHeader(
        token,
        SESSION_DURATION_SECONDS
      )
    );

    return res.status(200).json({
      success: true,
      authenticated: true,
    });
  } catch (error) {
    console.error('Admin login failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to process login',
    });
  }
}
