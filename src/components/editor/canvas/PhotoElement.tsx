import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PhotoElement as PhotoElementType, PageElement } from "@/types/editor";
import ResizeHandles from "./ResizeHandles";
import ImageCropModal from "./ImageCropModal";

interface PhotoElementProps {
  photo: PhotoElementType;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  style: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (id: string, changes: Partial<PageElement>) => void;
}

export default function PhotoElement({
  photo,
  isSelected,
  canvasWidth,
  canvasHeight,
  style,
  onMouseDown,
  onResize,
}: PhotoElementProps) {
  const [isCropping, setIsCropping] = useState(false);

  const filterStyle = photo.filter
    ? `brightness(${photo.filter.brightness}%) contrast(${photo.filter.contrast}%) saturate(${photo.filter.saturation}%)`
    : undefined;

  const photoStyle = isSelected
    ? { ...style, '--tw-ring-color': 'hsl(9 97% 45%)' } as React.CSSProperties
    : style;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCropping(true);
  };

  const handleCropSave = (cropX: number, cropY: number, cropZoom: number) => {
    onResize(photo.id, { cropX, cropY, cropZoom });
    setIsCropping(false);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
  };

  if (isCropping) {
    return (
      <ImageCropModal
        photo={photo}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        style={photoStyle}
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />
    );
  }

  return (
    <div
      style={photoStyle}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "overflow-hidden relative",
        isSelected && "ring-2 ring-offset-1"
      )}
    >
      <img
        src={photo.src}
        alt=""
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
        style={{
          filter: filterStyle,
          objectPosition: `${photo.cropX ?? 50}% ${photo.cropY ?? 50}%`,
          transform: photo.cropZoom ? `scale(${photo.cropZoom})` : undefined,
        }}
      />
      {isSelected && (
        <ResizeHandles
          elementId={photo.id}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onResize={onResize}
          element={photo}
        />
      )}
    </div>
  );
}
