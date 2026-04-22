// Image upload utility for handling multiple images
// Uploads to Supabase Storage for reliable cloud storage

import { supabase } from '@/lib/supabase';

export const uploadImage = async (file: File): Promise<string> => {
  try {
    console.log('Uploading image to Supabase Storage:', file.name, 'Size:', file.size);
    
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${random}-${file.name}`;
    const filePath = `services/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.publicUrl;
    console.log('Image uploaded successfully:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
};

export const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  try {
    console.log('Uploading multiple images:', files.length);
    
    const uploadPromises = files.map(file => uploadImage(file));
    const urls = await Promise.all(uploadPromises);
    
    console.log('All images uploaded successfully');
    return urls;
  } catch (error) {
    console.error('Failed to upload multiple images:', error);
    throw error;
  }
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
