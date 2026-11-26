import { isAdminRequest } from './_admin-auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    console.error('Admin session configuration is invalid');
    return res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Authentication is not configured',
    });
  }

  return res.status(200).json({
    success: true,
    authenticated: isAdminRequest(req),
  });
}
