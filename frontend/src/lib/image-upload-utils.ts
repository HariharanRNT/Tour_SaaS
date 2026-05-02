import imageCompression from 'browser-image-compression';
import { API_URL } from './api';

export interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

/**
 * Compresses an image file with specified options.
 * Default: Max 1920px width/height, 80% quality.
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const defaultOptions = {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1, // Aim for < 1MB
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: 'image/webp', // Default to WebP for better compression
    ...options };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Ensure the filename is preserved (though type might change)
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + (defaultOptions.fileType === 'image/webp' ? '.webp' : '.jpg');
    return new File([compressedFile], newFileName, { type: compressedFile.type });
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original if compression fails
  }
}
