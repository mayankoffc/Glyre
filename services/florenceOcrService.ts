export function initializeFlorenceOCR(_apiKey?: string) {
}

export function isFlorenceApiInitialized(): boolean {
  return true;
}

async function compressImage(dataUrl: string, maxSizeKB: number = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      const maxDimension = 2000;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.9;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      
      if (result.length > maxSizeKB * 1024 * 1.37) {
        const scale = 0.7;
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        result = canvas.toDataURL('image/jpeg', 0.8);
      }
      
      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function extractTextWithFlorence(
  imageDataUrl: string,
  onProgress?: (status: string) => void
): Promise<string> {
  onProgress?.('Preparing image for OCR...');

  try {
    onProgress?.('Compressing image...');
    const compressedImage = await compressImage(imageDataUrl);
    
    const base64Match = compressedImage.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image data URL format');
    }
    const base64Data = base64Match[1];

    onProgress?.('Sending to OCR Space...');

    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Data
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `OCR failed: ${response.status}`);
    }

    onProgress?.('OCR complete');
    return result.text || '';

  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
}

export async function extractTextFromPdfWithFlorence(
  pdfPages: string[],
  onProgress?: (status: string) => void
): Promise<string[]> {
  onProgress?.('Using Florence-2 AI for PDF OCR...');
  
  const results: string[] = [];
  
  for (let i = 0; i < pdfPages.length; i++) {
    onProgress?.(`Processing page ${i + 1} of ${pdfPages.length}...`);
    
    try {
      const pageText = await extractTextWithFlorence(pdfPages[i], onProgress);
      results.push(pageText);
    } catch (error) {
      console.error(`Florence-2 failed for page ${i + 1}:`, error);
      results.push(`[Page ${i + 1} - OCR failed]`);
    }
    
    if (i < pdfPages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  onProgress?.('Florence-2 PDF OCR complete');
  return results;
}
