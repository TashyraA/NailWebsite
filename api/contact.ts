import { sendEmail } from './_email';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { subject, html } = req.body || {};
    if (!subject || !html) return res.status(400).json({ error: 'Missing message details' });
    await sendEmail(process.env.BUSINESS_EMAIL || 'brianalehota@gmail.com', subject, html);
    return res.status(200).json({ sent: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to send message' });
  }
}