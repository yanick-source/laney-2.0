import { useState, useRef } from "react";
import type { PhotoElement } from "@/types/editor";

interface ImageCropModalProps {
  photo: PhotoElement;
  canvasWidth: number;
  canvasHeight: number;
  style: React.CSSProperties;
  onSave: (cropX: number, cropY: number, cropZoom: number) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  photo,
  canvasWidth,
  canvasHeight,
  style,
  onSave,
  onCancel,
}: ImageCropModalProps) {
  const [cropState, setCropState] = useState({
    x: photo.cropX ?? 50,
    y: photo.cropY ?? 50,
    zoom: photo.cropZoom ?? 1,
  });
  const cropDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const filterStyle = photo.filter
    ? `brightness(${photo.filter.brightness}%) contrast(${photo.filter.contrast}%) saturate(${photo.filter.saturation}%)`
    : undefined;

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    cropDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: cropState.x,
      origY: cropState.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!cropDragRef.current) return;
      const dx = moveEvent.clientX - cropDragRef.current.startX;
      const dy = moveEvent.clientY - cropDragRef.current.startY;

      // Convert to percentage movement (inverted for natural feel)
      const pctDx = -(dx / canvasWidth) * 100 / cropState.zoom;
      const pctDy = -(dy / canvasHeight) * 100 / cropState.zoom;

      setCropState(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, cropDragRef.current!.origX + pctDx)),
        y: Math.max(0, Math.min(100, cropDragRef.current!.origY + pctDy)),
      }));
    };

    const handleMouseUp = () => {
      cropDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={style} className="overflow-hidden relative ring-2 ring-primary">
      <div
        onMouseDown={handleCropMouseDown}
        className="w-full h-full cursor-move relative"
      >
        <img
          src={photo.src}
          alt=""
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            filter: filterStyle,
            objectPosition: `${cropState.x}% ${cropState.y}%`,
            transform: `scale(${cropState.zoom})`,
          }}
        />
      </div>
      {/* Crop controls */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-3 shadow-lg border border-border/60">
        <label className="text-xs text-muted-foreground">Zoom:</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={cropState.zoom}
          onChange={(e) => setCropState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
          className="w-24"
        />
        <span className="text-xs font-medium text-foreground">{Math.round(cropState.zoom * 100)}%</span>
        <div className="w-px h-4 bg-border/60" />
        <button
          onClick={() => onSave(cropState.x, cropState.y, cropState.zoom)}
          className="text-xs font-semibold px-3 py-1 rounded-md bg-primary text-white hover:bg-primary/90"
        >
          Opslaan
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-semibold px-3 py-1 rounded-md hover:bg-muted"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
