import type { PhotoElement as PhotoElementType, PageElement } from "@/types/editor";
import PhotoElementComponent from "./PhotoElement";
import Placeholder from "./Placeholder";

interface PhotoSlotProps {
  slotId: string;
  slot: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  photo: PhotoElementType | null;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (id: string, changes: Partial<PageElement>) => void;
  onPlaceholderClick: () => void;
}

export default function PhotoSlot({
  slotId,
  slot,
  photo,
  isSelected,
  canvasWidth,
  canvasHeight,
  onMouseDown,
  onResize,
  onPlaceholderClick,
}: PhotoSlotProps) {
  if (!photo) {
    return (
      <Placeholder
        slotId={slotId}
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        onClick={onPlaceholderClick}
      />
    );
  }

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    width: `${slot.width}%`,
    height: `${slot.height}%`,
    transform: photo.rotation ? `rotate(${photo.rotation}deg)` : undefined,
    zIndex: photo.zIndex,
    opacity: photo.opacity,
    cursor: "move",
  };

  return (
    <PhotoElementComponent
      photo={photo}
      isSelected={isSelected}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      style={style}
      onMouseDown={onMouseDown}
      onResize={onResize}
    />
  );
}
