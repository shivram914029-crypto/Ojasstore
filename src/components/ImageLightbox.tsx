import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { SafeImage } from './BrandMark';

interface GalleryItem {
  src: string;
  caption?: string;
}

interface ImageLightboxProps {
  items: GalleryItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  items,
  initialIndex,
  isOpen,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setIndex(initialIndex);
    setZoomed(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setZoomed(false);
        setIndex((i) => (i + 1) % items.length);
      }
      if (e.key === 'ArrowLeft') {
        setZoomed(false);
        setIndex((i) => (i - 1 + items.length) % items.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, items.length, onClose]);

  if (!isOpen || items.length === 0) return null;
  const activeItem = items[index] || items[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E1F17]/95 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom preview"
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between text-[#FAF8F3] max-w-6xl w-full mx-auto">
        <div className="text-sm text-[#D6DDD8]">
          <span className="tabular-nums font-medium text-[#D4AF63]">
            {index + 1} / {items.length}
          </span>
          {activeItem.caption && (
            <>
              <span className="mx-2 text-[#525E56]">·</span>
              <span>{activeItem.caption}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors min-h-[40px]"
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            <span>{zoomed ? 'Reset Zoom' : 'Zoom 2.2×'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center max-w-6xl w-full mx-auto my-4 overflow-hidden">
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setIndex((i) => (i - 1 + items.length) % items.length);
            }}
            className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-[#163024]/80 hover:bg-[#163024] text-[#FAF8F3] border border-white/15 flex items-center justify-center transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={() => setZoomed((z) => !z)}
          onMouseMove={handleMouseMove}
          className={`relative max-h-[72vh] max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#163024] ${
            zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
        >
          <SafeImage
            src={activeItem.src}
            alt={activeItem.caption || 'OJAS product gallery image'}
            className="max-h-[72vh] w-auto object-contain transition-transform duration-200 ease-out select-none"
            style={{
              transform: zoomed ? 'scale(2.2)' : 'scale(1)',
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setIndex((i) => (i + 1) % items.length);
            }}
            className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-[#163024]/80 hover:bg-[#163024] text-[#FAF8F3] border border-white/15 flex items-center justify-center transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail Strip */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-1 max-w-4xl mx-auto">
          {items.map((item, idx) => (
            <button
              key={`${item.src}-${idx}`}
              type="button"
              onClick={() => {
                setZoomed(false);
                setIndex(idx);
              }}
              className={`w-16 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0 ${
                idx === index
                  ? 'border-[#D4AF63] opacity-100'
                  : 'border-transparent opacity-55 hover:opacity-85'
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <SafeImage
                src={item.src}
                alt={item.caption || `Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
