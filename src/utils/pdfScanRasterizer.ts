import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PreparedAuditDocument {
  fileName: string;
  mimeType: string;
  isPdf: boolean;
  isScannedPdf: boolean;
  pageCount: number;
  extractedText: string;
  pageImagesBase64: string[];
  previewDataUrls: string[];
  base64Data?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    parts.push(
      String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength)))
    );
  }
  return btoa(parts.join(''));
}

async function rasterizeImageFile(file: File): Promise<PreparedAuditDocument> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Nie udało się wczytać obrazu skanu.'));
      el.src = objectUrl;
    });

    const maxWidth = 1600;
    const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Brak kontekstu graficznego canvas dla OCR.');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1] ?? '';

    return {
      fileName: file.name,
      mimeType: 'image/jpeg',
      isPdf: false,
      isScannedPdf: true,
      pageCount: 1,
      extractedText: '',
      pageImagesBase64: [base64],
      previewDataUrls: [dataUrl],
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareAuditDocument(
  file: File
): Promise<PreparedAuditDocument> {
  const lowerName = file.name.toLowerCase();
  const isImage =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(lowerName);

  if (isImage) {
    return rasterizeImageFile(file);
  }

  const buffer = await file.arrayBuffer();
  const includeRawPdf = file.size <= 8 * 1024 * 1024;
  const base64Data = includeRawPdf ? arrayBufferToBase64(buffer) : undefined;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer.slice(0)),
    });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const maxPagesToRender = Math.min(pageCount, 4);

    const textParts: string[] = [];
    const pageImagesBase64: string[] = [];
    const previewDataUrls: string[] = [];

    for (let pageNum = 1; pageNum <= maxPagesToRender; pageNum++) {
      const page = await pdf.getPage(pageNum);

      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .trim();
        if (pageText) {
          textParts.push(`--- Strona ${pageNum} ---\n${pageText}`);
        }
      } catch {
        // Ignore broken text streams on scanned PDFs
      }

      const unscaledViewport = page.getViewport({ scale: 1 });
      const targetScale = Math.min(2.2, Math.max(1.4, 1500 / Math.max(1, unscaledViewport.width)));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const imgBase64 = dataUrl.split(',')[1] ?? '';
        if (imgBase64) {
          pageImagesBase64.push(imgBase64);
          previewDataUrls.push(dataUrl);
        }
      }
    }

    const extractedText = textParts.join('\n\n').trim();
    const compactChars = extractedText.replace(/\s+/g, '').length;
    const isScannedPdf = compactChars < 40;

    return {
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      isPdf: true,
      isScannedPdf,
      pageCount,
      extractedText,
      pageImagesBase64,
      previewDataUrls,
      base64Data,
    };
  } catch {
    return {
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      isPdf: true,
      isScannedPdf: true,
      pageCount: 1,
      extractedText: '',
      pageImagesBase64: [],
      previewDataUrls: [],
      base64Data: arrayBufferToBase64(buffer),
    };
  }
}
