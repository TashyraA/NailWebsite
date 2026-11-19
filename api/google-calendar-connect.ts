import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callbackUrl, constantTimeMatch, newState, protect, setStateCookie, settings } from './_google-oauth.js';

// Temporary one-time setup endpoint. Remove after obtaining the refresh token.
// Requires a server-side secret supplied in the Authorization header, never a URL query.
export default function handler(req: VercelRequest, res: VercelResponse) {
  protect(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }
  try {
    const cfg = settings();
    const supplied = String(req.headers.authorization || '');
    if (!supplied.startsWith('Bearer ') || !constantTimeMatch(supplied.slice(7), cfg.setupKey)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const state = newState(cfg.stateSecret);
    setStateCookie(res, state);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    url.searchParams.set('login_hint', cfg.allowedEmail);
    return res.status(200).json({ authorizationUrl: url.toString(), instruction: 'Open this URL in the SAME browser session that made this request.' });
  } catch {
    return res.status(500).json({ error: 'OAuth setup is not configured' });
  }
}
