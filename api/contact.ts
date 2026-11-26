import { escapeHtml } from './_email.js';

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const validEmail = (value: string) => value.length <= 254 && emailPattern.test(value) && !/[\x00-\x1f\x7f]/.test(value);

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || ''))) {
    return res.status(415).json({ error: 'JSON required' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 40000) {
    return res.status(400).json({ error: 'Invalid message details' });
  }
  if (Object.keys(body).some(key => !['name', 'email', 'phone', 'message', 'website'].includes(key))) {
    return res.status(400).json({ error: 'Invalid message details' });
  }
  const { name, email, phone = '', message, website = '' } = body;
  if ([name, email, phone, message, website].some(value => typeof value !== 'string')) {
    return res.status(400).json({ error: 'Invalid message details' });
  }
  if (website.trim()) return res.status(400).json({ error: 'Invalid message details' });
  const n = name.trim(), e = email.trim(), p = phone.trim(), m = message.trim();
  if (!n || n.length > 120 || !validEmail(e) || p.length > 40 || !m || m.length > 5000 || /[\x00-\x1f\x7f]/.test(n + p) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(m)) {
    return res.status(400).json({ error: 'Invalid message details' });
  }
  const to = process.env.BUSINESS_EMAIL?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  if (!to || !validEmail(to) || !from || !key) {
    console.error('Contact email configuration unavailable');
    return res.status(503).json({ error: 'Contact form temporarily unavailable' });
  }
  const html = `<div style="background:#FFF7F8;padding:24px;font-family:Arial,sans-serif;color:#29252B"><div style="max-width:600px;margin:auto;background:white;border:1px solid #F7DDE4;border-radius:16px;overflow:hidden"><h1 style="background:#963F60;color:white;padding:24px;margin:0;text-align:center;font-size:26px">New Contact Message</h1><div style="padding:24px"><h2 style="color:#963F60">Contact Details</h2><p><strong>Name:</strong> ${escapeHtml(n)}</p><p><strong>Email:</strong> ${escapeHtml(e)}</p>${p ? `<p><strong>Phone:</strong> ${escapeHtml(p)}</p>` : ''}<h3 style="color:#963F60">Message</h3><div style="background:#FFF7F8;padding:20px;overflow-wrap:anywhere">${escapeHtml(m).replace(/\r\n|\r|\n/g, '<br>')}</div><p>Reply directly to this email to contact the sender.</p></div><div style="background:#F7DDE4;padding:20px;text-align:center">Sent from the InLoveNailz contact form</div></div></div>`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: e, subject: 'InLoveNailz | New Contact Message', html, text: `Name: ${n}\nEmail: ${e}\nPhone: ${p || 'Not provided'}\n\n${m}` }),
    });
    if (response.status === 429) return res.status(429).json({ error: 'Please wait before sending another message' });
    const result = await response.json();
    if (!response.ok || typeof result?.id !== 'string' || !result.id.trim()) {
      console.error('Contact email acceptance unconfirmed', response.status);
      return res.status(502).json({ error: 'Unable to confirm message submission' });
    }
    return res.status(200).json({ sent: true });
  } catch {
    console.error('Contact email submission interrupted');
    return res.status(502).json({ error: 'Unable to confirm message submission' });
  }
}
