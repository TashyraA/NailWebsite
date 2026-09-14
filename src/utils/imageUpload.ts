export const uploadImage = async (file: File): Promise<string> => {
  console.log('Uploading image:', file.name, 'Size:', file.size);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, fileName: file.name })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Image upload failed');
  return result.url;
};

export const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  console.log('Uploading multiple images:', files.length);
  
  const uploadPromises = files.map(file => uploadImage(file));
  return Promise.all(uploadPromises);
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit.'
    };
  }
  
  return { valid: true };
};
