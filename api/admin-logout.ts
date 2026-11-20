
const COOKIE_NAME = 'inlovenailz_admin_session';

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

  // Reject cross-origin browser requests.
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (
    typeof origin !== 'string' ||
    typeof host !== 'string'
  ) {
    return res.status(403).json({
      success: false,
      error: 'Invalid request origin',
    });
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    return res.status(403).json({
      success: false,
      error: 'Invalid request origin',
    });
  }

  if (originHost !== host) {
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
