export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const { dataUrl } = req.body || {};
  if (!cloudName || !uploadPreset) return res.status(500).json({ error: 'Cloudinary upload settings are not configured' });
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'Invalid image data' });

  const form = new URLSearchParams({ file: dataUrl, upload_preset: uploadPreset, folder: 'inlovenailz/services' });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
  });
  const result = await response.json();
  if (!response.ok) return res.status(400).json({ error: result.error?.message || 'Cloudinary upload failed' });
  return res.status(200).json({ url: result.secure_url });
}