import { useState } from 'react';
import { db, type Photo } from '@/src/db/schema';
import { useAppStore } from '@/src/stores/appStore';

interface UsePhotoCaptureReturn {
  capturePhoto: (inspectionItemId: number) => Promise<void>;
  getPhotosForItem: (inspectionItemId: number) => Promise<Photo[]>;
  deletePhoto: (photoId: number) => Promise<void>;
  isCapturing: boolean;
  error: string | null;
}

export const usePhotoCapture = (): UsePhotoCaptureReturn => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tenantId = useAppStore((state) => state.tenantId);

  const compressImage = async (file: File): Promise<{ blob: Blob; thumbnailBlob: Blob }> => {
    const MAX_SIZE = 500 * 1024; // 500KB
    const THUMBNAIL_SIZE = 100;

    const createImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

    const getBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
      new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    const objectUrl = URL.createObjectURL(file);
    const img = await createImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    let width = img.width;
    let height = img.height;
    let quality = 0.8;
    let scale = 1.0;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Create thumbnail first
    const thumbCanvas = document.createElement('canvas');
    const thumbCtx = thumbCanvas.getContext('2d')!;
    const thumbScale = Math.min(THUMBNAIL_SIZE / width, THUMBNAIL_SIZE / height);
    thumbCanvas.width = width * thumbScale;
    thumbCanvas.height = height * thumbScale;
    thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbnailBlob = (await getBlob(thumbCanvas, 0.7))!;

    // Compress main image
    let finalBlob: Blob | null = null;
    for (let i = 0; i < 5; i++) {
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      finalBlob = await getBlob(canvas, quality);
      
      if (finalBlob && finalBlob.size <= MAX_SIZE) {
        break;
      }
      scale *= 0.8;
    }

    if (!finalBlob) throw new Error('Failed to compress image');
    return { blob: finalBlob, thumbnailBlob };
  };

  const capturePhoto = async (inspectionItemId: number) => {
    setIsCapturing(true);
    setError(null);

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      const file = await new Promise<File | null>((resolve) => {
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          resolve(files?.[0] || null);
        };
        input.click();
      });

      if (!file) {
        setIsCapturing(false);
        return;
      }

      const { blob, thumbnailBlob } = await compressImage(file);

      const photo: Photo = {
        tenantId,
        inspectionItemId,
        blob,
        thumbnailBlob,
        capturedAt: new Date().toISOString(),
        synced: false,
      };

      await db.photos.add(photo);
    } catch (err) {
      console.error('Photo capture failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during photo capture');
    } finally {
      setIsCapturing(false);
    }
  };

  const getPhotosForItem = async (inspectionItemId: number) => {
    return db.photos.where('inspectionItemId').equals(inspectionItemId).toArray();
  };

  const deletePhoto = async (photoId: number) => {
    await db.photos.delete(photoId);
  };

  return {
    capturePhoto,
    getPhotosForItem,
    deletePhoto,
    isCapturing,
    error,
  };
};
