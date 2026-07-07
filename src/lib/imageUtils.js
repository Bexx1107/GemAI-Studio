// ─── GemAI Studio — Image Utilities ────────────────────────────
// Pure client-side. No Node APIs. No external dependencies.

/**
 * Resize an image file to fit within maxSize while preserving aspect ratio.
 * Returns { base64, mimeType, width, height }.
 */
export function resizeImage(file, maxSize = 2048) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Only resize if the image exceeds maxSize
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Output as JPEG for photos, PNG for transparency
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Strip the data URL prefix to get raw base64
        const base64 = dataUrl.split(',')[1];

        resolve({ base64, mimeType, width, height });
      };

      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Read an image file at full resolution without re-encoding.
 * Returns { base64, mimeType, width, height }.
 */
export function readImageFullRes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/png';

      // Load into an Image to get dimensions
      const img = new Image();

      img.onload = () => {
        resolve({ base64, mimeType, width: img.width, height: img.height });
      };

      img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Download a base64-encoded image as a file.
 */
export function downloadImage(base64, mimeType, filename = 'gemai-studio-image') {
  const ext = mimeType === 'image/png' ? '.png' : '.jpg';
  const fullFilename = filename.includes('.') ? filename : `${filename}${ext}`;

  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = fullFilename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert base64 + mimeType to a data URL string.
 */
export function imageToDataUrl(base64, mimeType) {
  return `data:${mimeType};base64,${base64}`;
}
