import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callbackUrl, clearStateCookie, constantTimeMatch, getStateCookie, htmlEscape, protect, settings, validState } from './_google-oauth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  protect(res);
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  clearStateCookie(res);
  try {
    const cfg = settings();
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const cookieState = getStateCookie(req);
    if (!code || !state || !cookieState || !validState(state, cfg.stateSecret) || !constantTimeMatch(state, cookieState)) {
      return res.status(403).send('Authorization state invalid or expired. Start again.');
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: callbackUrl, grant_type: 'authorization_code' })
    });
    if (!tokenResponse.ok) return res.status(400).send('Google token exchange failed. Start again.');
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string };
    if (!tokens.access_token || !tokens.refresh_token) return res.status(400).send('No refresh token returned. Revoke prior access in Google Account permissions, then retry.');

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!userResponse.ok) return res.status(403).send('Could not verify Google account.');
    const user = await userResponse.json() as { email?: string; verified_email?: boolean };
    if (!user.verified_email || !user.email || !constantTimeMatch(user.email.toLowerCase(), cfg.allowedEmail)) {
      return res.status(403).send('This Google account is not authorized to manage the InLoveNailz calendar.');
    }

    // Verify access to the exact target calendar before presenting the token.
    const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
if (!calendarResponse.ok) {
  const status = calendarResponse.status;

  console.error('Google Calendar access check failed', {
    status,
    calendarConfigured: Boolean(cfg.calendarId),
  });

  return res.status(403).send(
    `Google Calendar access check failed (Google HTTP ${status}). Check Vercel Function Logs.`
  );
}
    // Display token only in the setup browser. Never log, email, redirect, or include it in a URL.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>InLoveNailz Calendar Connected</title></head><body style="font:16px system-ui;max-width:700px;margin:50px auto;padding:20px"><h1>Google Calendar authorized</h1><p>Verified account: ${htmlEscape(user.email)}</p><p>Copy the refresh token below into Vercel as <strong>GOOGLE_REFRESH_TOKEN</strong>. Treat it as a password. Do not share screenshots of this page.</p><textarea readonly rows="6" style="width:100%">${htmlEscape(tokens.refresh_token)}</textarea><p>After saving the environment variable and redeploying, delete the temporary setup endpoints and the GOOGLE_OAUTH_SETUP_KEY environment variable. This page is not an admin dashboard.</p><p><strong>Note:</strong> OAuth Testing mode can cause this refresh token to expire after 7 days for Calendar access. Resolve that before production use.</p></body></html>`);
  } catch {
    return res.status(500).send('Google Calendar authorization failed. Check server configuration.');
  }
}
