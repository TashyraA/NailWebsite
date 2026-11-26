/* INLOVENAILZ BY BRIANA — Shared email utilities */

type EmailAttachment = {
  filename: string;
  content: string;
};

const EMAIL_TIMEOUT_MS = 10000;

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error('Email service is not configured');
  }

  const recipient = typeof to === 'string' ? to.trim() : '';
  if (recipient.length > 254 || !/^[^\s@<> ,;]+@[^\s@<> ,;]+\.[^\s@<> ,;]+$/.test(recipient)) {
    throw new Error('A valid recipient email address is required');
  }
  if (typeof subject !== 'string' || !subject.trim() || /[\r\n\x00]/.test(subject)) {
    throw new Error('A valid email subject is required');
  }
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('Email content cannot be empty');
  }
  if (attachments !== undefined && (!Array.isArray(attachments) || attachments.some(
    item => !item || typeof item.filename !== 'string' || !item.filename.trim() ||
      /[\r\n\x00]/.test(item.filename) || typeof item.content !== 'string' || !item.content.trim()
  ))) {
    throw new Error('Invalid email attachment');
  }

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        html,
        ...(attachments?.length ? { attachments } : {}),
      }),
    });
  } catch {
    console.error('Resend request outcome could not be verified');
    throw new Error('Email acceptance could not be confirmed. Check Resend before retrying.');
  }

  if (!response.ok) {
    console.error('Resend email request rejected or unsuccessful:', response.status);
    throw new Error(`Email acceptance could not be confirmed (HTTP ${response.status}). Check Resend before retrying.`);
  }

  let result: { id?: unknown } | null;
  try {
    result = await response.json();
  } catch {
    console.error('Resend acceptance response could not be read');
    throw new Error('Email acceptance could not be confirmed. Check Resend before retrying.');
  }
  if (!result || typeof result.id !== 'string' || !result.id.trim()) {
    console.error('Resend acceptance response missing email ID');
    throw new Error('Email acceptance could not be confirmed. Check Resend before retrying.');
  }
};

export const escapeHtml = (value: string): string =>
  String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character));
