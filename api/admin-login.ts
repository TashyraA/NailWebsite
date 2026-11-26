
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import { isIP } from 'node:net';
import { neon } from '@neondatabase/serverless';
import { isSameOriginRequest } from './_admin-auth.js';

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

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!isSameOriginRequest(req)) {
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
    !sessionSecret.trim() ||
    Buffer.byteLength(sessionSecret, 'utf8') < 32 ||
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

    const ipHeader = process.env.NODE_ENV === 'production'
      ? req.headers?.['x-vercel-forwarded-for']
      : req.socket?.remoteAddress;

    const ip = typeof ipHeader === 'string'
      ? ipHeader.trim()
      : '';

    if (!isIP(ip) || ip.includes('%')) {
      return res.status(503).json({
        success: false,
        error: 'Unable to process login',
      });
    }

    // Normalize IPv6 representations before hashing.
    const normalizedIp = isIP(ip) === 6
      ? new URL(`http://[${ip}]/`).hostname.slice(1, -1)
      : ip;

    const ipHash = createHmac('sha256', sessionSecret)
      .update(normalizedIp)
      .digest('hex');

    const attempts = await sql`
      SELECT public.reserve_admin_login_attempt(${ipHash}) AS allowed
    `;

    if (attempts[0]?.allowed === false) {
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Try again later.',
      });
    }

    if (attempts[0]?.allowed !== true) {
      throw new Error('Invalid login reservation response');
    }

    const emailMatches =
      email === adminEmail.trim().toLowerCase();

    const passwordMatches = verifyPassword(
      password,
      passwordHash
    );

    if (!emailMatches || !passwordMatches) {
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
    console.error('Admin login failed:', error instanceof Error ? error.name : 'UnknownError');

    return res.status(500).json({
      success: false,
      error: 'Unable to process login',
    });
  }
}
