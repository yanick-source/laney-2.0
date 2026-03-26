import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TextElement as TextElementType, PageElement } from "@/types/editor";
import ResizeHandles from "./ResizeHandles";
import TextEditMode from "./TextEditMode";

interface TextElementProps {
  text: TextElementType;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  style: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (id: string, changes: Partial<PageElement>) => void;
}

export default function TextElement({
  text,
  isSelected,
  canvasWidth,
  canvasHeight,
  style,
  onMouseDown,
  onResize,
}: TextElementProps) {
  const [isEditing, setIsEditing] = useState(false);

  const textStyle: React.CSSProperties = {
    ...style,
    fontFamily: text.fontFamily,
    fontSize: text.fontSize,
    fontWeight: text.fontWeight,
    color: text.color,
    textAlign: text.textAlign,
    lineHeight: text.lineHeight,
    display: "flex",
    alignItems: "center",
    justifyContent:
      text.textAlign === "center"
        ? "center"
        : text.textAlign === "right"
          ? "flex-end"
          : "flex-start",
    ...(isSelected ? { '--tw-ring-color': 'hsl(9 97% 45%)' } as any : {}),
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = (content: string) => {
    onResize(text.id, { content } as Partial<PageElement>);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div
      style={textStyle}
      onMouseDown={isEditing ? undefined : onMouseDown}
      onDoubleClick={isEditing ? undefined : handleDoubleClick}
      className={cn(
        "whitespace-pre-wrap relative",
        !isEditing && "select-none",
        isSelected && "ring-2 ring-offset-1"
      )}
    >
      {isEditing ? (
        <TextEditMode
          text={text}
          style={textStyle}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        text.content
      )}
      {!isEditing && isSelected && (
        <ResizeHandles
          elementId={text.id}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onResize={onResize}
          element={text}
        />
      )}
    </div>
  );
}
