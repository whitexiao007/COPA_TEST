import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, X } from 'lucide-react';
import { db } from '@/src/db/schema';
import { Button } from '@/components/ui/button';

interface PhotoThumbnailsProps {
  inspectionItemId: number | null;
  onCapture: () => void;
}

export const PhotoThumbnails = ({ inspectionItemId, onCapture }: PhotoThumbnailsProps) => {
  const photos = useLiveQuery(
    () => (inspectionItemId ? db.photos.where('inspectionItemId').equals(inspectionItemId).toArray() : []),
    [inspectionItemId]
  ) ?? [];

  const [objectUrls, setObjectUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const urls: Record<number, string> = {};
    photos.forEach((photo) => {
      if (photo.id && !objectUrls[photo.id]) {
        urls[photo.id] = URL.createObjectURL(photo.thumbnailBlob);
      }
    });

    if (Object.keys(urls).length > 0) {
      setObjectUrls((prev) => ({ ...prev, ...urls }));
    }

    // Cleanup URLs for photos that were deleted
    const photoIds = new Set(photos.map((p) => p.id));
    Object.keys(objectUrls).forEach((idStr) => {
      const id = parseInt(idStr);
      if (!photoIds.has(id)) {
        URL.revokeObjectURL(objectUrls[id]!);
        setObjectUrls((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
  }, [photos]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDelete = async (photoId: number) => {
    await db.photos.delete(photoId);
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-hide">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300"
        onClick={onCapture}
      >
        <Camera className="w-5 h-5" />
      </Button>

      {photos.map((photo) => (
        <div key={photo.id} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
          <img
            src={objectUrls[photo.id!] || ''}
            alt="Captured photo"
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => photo.id && handleDelete(photo.id)}
            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
