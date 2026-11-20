
import {
  isAdminRequest,
  isSameOriginRequest,
} from './_admin-auth.js';

const MAX_REQUEST_SIZE = 4.5 * 1024 * 1024;

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!isSameOriginRequest(req)) {
    return res.status(403).json({
      error: 'Invalid request origin',
    });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return res.status(500).json({
      error: 'Cloudinary upload settings are not configured',
    });
  }

  const body = req.body || {};
  const dataUrl = body.dataUrl;
  const requestedFolder = body.folder;

  if (
    typeof dataUrl !== 'string' ||
    !/^data:image\/(jpeg|png|gif|webp);base64,/i.test(dataUrl)
  ) {
    return res.status(400).json({
      error: 'Invalid image data',
    });
  }

  if (dataUrl.length > MAX_REQUEST_SIZE) {
    return res.status(413).json({
      error: 'Image is too large. Please upload a smaller image.',
    });
  }

  const isInspiration =
    requestedFolder === 'inlovenailz/inspiration';

  const uploadFolder = isInspiration
    ? 'inlovenailz/inspiration'
    : 'inlovenailz/services';

  // Service photos require administrator authentication.
  // Customer inspiration uploads remain available.
  if (!isInspiration && !isAdminRequest(req)) {
    return res.status(401).json({
      error: 'Administrator authentication required',
    });
  }

  try {
    const form = new URLSearchParams({
      file: dataUrl,
      upload_preset: uploadPreset,
      folder: uploadFolder,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: form,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        error:
          result.error?.message ||
          'Cloudinary upload failed',
      });
    }

    if (
      typeof result.secure_url !== 'string' ||
      !result.secure_url.startsWith(
        'https://res.cloudinary.com/'
      )
    ) {
      return res.status(502).json({
        error: 'Invalid image URL returned',
      });
    }

    return res.status(200).json({
      url: result.secure_url,
    });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);

    return res.status(500).json({
      error: 'Unable to upload image',
    });
  }
}
