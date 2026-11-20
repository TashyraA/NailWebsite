
/* =========================================
   INLOVENAILZ BY BRIANA
   EMAIL UTILITIES

   - Sends emails through Resend
   - Supports optional attachments
   - Preserves existing API compatibility
   - Provides clearer delivery errors
========================================= */

type EmailAttachment = {
  filename: string;
  content: string;
};

/* =====================================
   SEND EMAIL
===================================== */

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;

  const from =
    process.env.EMAIL_FROM ||
    'InLoveNailz <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured'
    );
  }

  if (
    !to ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())
  ) {
    throw new Error(
      'A valid recipient email address is required'
    );
  }

  if (!subject.trim()) {
    throw new Error(
      'Email subject cannot be empty'
    );
  }

  if (!html.trim()) {
    throw new Error(
      'Email content cannot be empty'
    );
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        from,
        to: [to.trim()],
        subject,
        html,

        ...(attachments?.length
          ? { attachments }
          : {}),
      }),
    }
  );

  if (!response.ok) {
    const errorDetails = await response.text();

    console.error(
      'Resend email error:',
      response.status,
      errorDetails
    );

    throw new Error(
      `Unable to send email (HTTP ${response.status})`
    );
  }
};

/* =====================================
   ESCAPE HTML
===================================== */

export const escapeHtml = (
  value: string
): string =>
  String(value).replace(
    /[&<>'"]/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }[character] || character)
  );
