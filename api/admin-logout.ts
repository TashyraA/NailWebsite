import { isSameOriginRequest } from './_admin-auth.js';

const COOKIE_NAME = 'inlovenailz_admin_session';

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Use the same origin validation as other admin endpoints.
  if (!isSameOriginRequest(req)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid request origin',
    });
  }

  // Match the cookie attributes used by admin-login.
  const secure =
    process.env.NODE_ENV === 'production'
      ? '; Secure'
      : '';

  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE_NAME}=`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ].join('; ') + secure
  );

  return res.status(200).json({
    success: true,
    authenticated: false,
  });
}
