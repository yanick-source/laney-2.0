import type { PageElement, PhotoElement as PhotoElementType, TextElement as TextElementType } from "@/types/editor";
import PhotoElement from "./PhotoElement";
import TextElement from "./TextElement";

interface CanvasElementProps {
  element: PageElement;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (id: string, changes: Partial<PageElement>) => void;
}

export default function CanvasElement({
  element,
  isSelected,
  canvasWidth,
  canvasHeight,
  onMouseDown,
  onResize,
}: CanvasElementProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    zIndex: element.zIndex,
    opacity: element.opacity,
    cursor: "move",
  };

  if (element.type === "photo") {
    return (
      <PhotoElement
        photo={element as PhotoElementType}
        isSelected={isSelected}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        style={style}
        onMouseDown={onMouseDown}
        onResize={onResize}
      />
    );
  }

  if (element.type === "text") {
    return (
      <TextElement
        text={element as TextElementType}
        isSelected={isSelected}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        style={style}
        onMouseDown={onMouseDown}
        onResize={onResize}
      />
    );
  }

  return null;
}
