import { useCallback } from "react";

interface ResizeHandlesProps {
  elementId: string;
  canvasWidth: number;
  canvasHeight: number;
  onResize: (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => void;
  element: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function ResizeHandles({
  elementId,
  canvasWidth,
  canvasHeight,
  onResize,
  element,
}: ResizeHandlesProps) {
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = element.width;
      const startHeight = element.height;
      const startLeft = element.x;
      const startTop = element.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        // Convert pixel delta to percentage
        const pctDx = (dx / canvasWidth) * 100;
        const pctDy = (dy / canvasHeight) * 100;

        const updates: { x?: number; y?: number; width?: number; height?: number } = {};

        // Calculate new dimensions based on handle
        if (handle.includes("e")) {
          updates.width = Math.max(5, startWidth + pctDx);
        }
        if (handle.includes("w")) {
          const newWidth = Math.max(5, startWidth - pctDx);
          updates.width = newWidth;
          updates.x = startLeft + (startWidth - newWidth);
        }
        if (handle.includes("s")) {
          updates.height = Math.max(5, startHeight + pctDy);
        }
        if (handle.includes("n")) {
          const newHeight = Math.max(5, startHeight - pctDy);
          updates.height = newHeight;
          updates.y = startTop + (startHeight - newHeight);
        }

        onResize(elementId, updates);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [elementId, element, canvasWidth, canvasHeight, onResize]
  );

  const handles = [
    { pos: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
    { pos: "n", cursor: "ns-resize", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
    { pos: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
    { pos: "e", cursor: "ew-resize", style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
    { pos: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
    { pos: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
    { pos: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
    { pos: "w", cursor: "ew-resize", style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
  ];

  return (
    <>
      {handles.map((handle) => (
        <div
          key={handle.pos}
          onMouseDown={(e) => handleResizeMouseDown(e, handle.pos)}
          className="absolute w-2 h-2 bg-white border border-primary rounded-sm hover:bg-primary/20 transition-colors"
          style={{ ...handle.style, cursor: handle.cursor, zIndex: 1000 }}
        />
      ))}
    </>
  );
}
