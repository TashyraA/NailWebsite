// Image upload utility for handling multiple images
// In production, this would upload to a cloud storage service like Cloudinary or AWS S3

export const uploadImage = async (file: File): Promise<string> => {
  console.log('Uploading image:', file.name, 'Size:', file.size);
  
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Convert file to base64 data URL for demo purposes
  // In production, this would upload to cloud storage and return the URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      console.log('Image converted to data URL');
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
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
