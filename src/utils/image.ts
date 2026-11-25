export interface CompressedImageResult {
  analysisBase64: string;
  thumbnailDataUrl: string;
  mimeType: string;
}

const IMAGE_EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
};

function inferMimeType(file: File): string {
  if (file.type && file.type.startsWith('image/')) {
    return file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXT_MIME[ext] ?? '';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Nu am putut citi fișierul imagine.'));
      }
    };
    reader.onerror = () => reject(new Error('Nu am putut citi fișierul imagine.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nu am putut decoda imaginea în browser.'));
    img.src = src;
  });
}

function renderScaledJpeg(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): string {
  const natW = img.naturalWidth || img.width || 800;
  const natH = img.naturalHeight || img.height || 600;
  const ratio = Math.min(1, maxDimension / Math.max(natW, natH));
  const width = Math.max(1, Math.round(natW * ratio));
  const height = Math.max(1, Math.round(natH * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browserul nu suportă procesarea imaginii.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function processImageFile(file: File): Promise<CompressedImageResult> {
  const inferredMime = inferMimeType(file);
  if (!inferredMime) {
    throw new Error('Te rugăm să alegi un fișier imagine valid (JPG, PNG, WebP sau HEIC).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const analysisDataUrl = renderScaledJpeg(img, 896, 0.82);
    const thumbnailDataUrl = renderScaledJpeg(img, 480, 0.78);
    return {
      analysisBase64: analysisDataUrl.split(',')[1] ?? '',
      thumbnailDataUrl,
      mimeType: 'image/jpeg',
    };
  } catch {
    // Fallback for formats like HEIC/HEIF where <img> decoding fails in Chrome/Windows,
    // but Gemini Vision supports the original image bytes directly.
    if (file.size > 12 * 1024 * 1024) {
      throw new Error('Fotografia depășește 12 MB și nu poate fi procesată în acest browser.');
    }
    const rawDataUrl = await readFileAsDataUrl(file);
    const base64Part = rawDataUrl.split(',')[1] ?? '';
    return {
      analysisBase64: base64Part,
      thumbnailDataUrl: inferredMime === 'image/heic' || inferredMime === 'image/heif' ? '' : rawDataUrl,
      mimeType: inferredMime,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processImageFromUrl(url: string): Promise<CompressedImageResult> {
  const img = await loadImageElement(url);
  const analysisDataUrl = renderScaledJpeg(img, 896, 0.82);
  const thumbnailDataUrl = renderScaledJpeg(img, 480, 0.78);
  return {
    analysisBase64: analysisDataUrl.split(',')[1] ?? '',
    thumbnailDataUrl,
    mimeType: 'image/jpeg',
  };
}
