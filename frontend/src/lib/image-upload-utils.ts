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
    ...options
  };

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

/**
 * Uploads a file directly to S3 using a presigned URL.
 */
export async function uploadToS3(file: File, uploadUrl: string): Promise<boolean> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      console.error(`S3 upload failed with status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Direct S3 upload failed:', error);
    return false;
  }
}

/**
 * Uploads a file to the backend, which then handles S3 upload or local storage.
 * This avoids CORS issues with direct S3 uploads.
 */
export async function uploadToBackend(file: File, folder: string = "packages"): Promise<string | null> {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/api/v1/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Backend upload failed:', error);
    return null;
  }
}

/**
 * Robust image upload utility that handles compression, direct S3 upload, 
 * and backend fallback.
 */
export async function uploadImage(
  file: File,
  folder: string = "packages",
  options: CompressionOptions = {}
): Promise<string> {
  // 1. Compress image
  const compressedFile = await compressImage(file, options);

  const token = localStorage.getItem('token');
  let finalUrl = '';

  try {
    // 2. Get presigned URL from backend
    const presignedRes = await fetch(`${API_URL}/api/v1/presigned-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_name: compressedFile.name,
        content_type: compressedFile.type,
        folder: folder
      })
    });

    if (presignedRes.ok) {
      const { upload_url, file_url } = await presignedRes.json();

      // 3. Try Direct upload to S3
      console.log('Attempting direct S3 upload...');
      const success = await uploadToS3(compressedFile, upload_url);
      if (success) {
        finalUrl = file_url;
        console.log('Direct S3 upload successful');
      } else {
        console.warn('Direct S3 upload failed, falling back to backend...');
      }
    } else {
      console.warn('Failed to get presigned URL, falling back to backend...');
    }
  } catch (err) {
    console.warn('Direct S3 upload flow encountered an error, falling back to backend...', err);
  }

  // 4. Fallback to backend upload if direct failed
  if (!finalUrl) {
    console.log('Using backend proxy for upload...');
    const backendUrl = await uploadToBackend(compressedFile, folder);
    if (backendUrl) {
      finalUrl = backendUrl;
    } else {
      throw new Error('All upload methods failed. Please check your connection and try again.');
    }
  }

  return finalUrl;
}
