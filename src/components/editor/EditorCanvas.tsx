import { useCallback, useRef, useState } from "react";
import type {
  PhotobookPage,
  PageElement,
  PhotoElement as PhotoElementType,
  EditorTool,
} from "@/types/editor";
import CanvasElement from "./canvas/CanvasElement";
import PhotoSlot from "./canvas/PhotoSlot";
import { useLayoutManager } from "@/hooks/useLayoutManager";
import { useAlignmentGuides } from "@/hooks/useAlignmentGuides";
import { useEditorStore } from "@/stores/editorStore";

interface EditorCanvasProps {
  page: PhotobookPage;
  zoomLevel: number;
  selectedElementId: string | null;
  selectedElementIds: string[];
  activeTool: EditorTool;
  onSelectElement: (id: string | null) => void;
  onToggleElementSelection: (id: string) => void;
  onUpdateElement: (id: string, changes: Partial<PageElement>) => void;
  onDeleteElement: (id: string) => void;
  onDropPhoto: (src: string, x: number, y: number) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function EditorCanvas({
  page,
  zoomLevel,
  selectedElementId,
  selectedElementIds,
  activeTool,
  onSelectElement,
  onToggleElementSelection,
  onUpdateElement,
  onDeleteElement,
  onDropPhoto,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const { activeLayout, slotAssignments, findNearestSlot, assignPhotoToSlot } = useLayoutManager();
  const { guides, updateGuides, clearGuides } = useAlignmentGuides(CANVAS_WIDTH, CANVAS_HEIGHT);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current || activeTool !== "select") return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newX = moveEvent.clientX - rect.left;
        const newY = moveEvent.clientY - rect.top;
        setSelectionBox((prev) => prev ? { ...prev, currentX: newX, currentY: newY } : null);
      };

      const handleMouseUp = () => {
        if (selectionBox) {
          // Calculate selection box bounds
          const minX = Math.min(selectionBox.startX, selectionBox.currentX);
          const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
          const minY = Math.min(selectionBox.startY, selectionBox.currentY);
          const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

          // Find elements within selection box
          const selectedIds = page.elements
            .filter((el) => {
              const elLeft = (el.x / 100) * CANVAS_WIDTH;
              const elTop = (el.y / 100) * CANVAS_HEIGHT;
              const elRight = elLeft + (el.width / 100) * CANVAS_WIDTH;
              const elBottom = elTop + (el.height / 100) * CANVAS_HEIGHT;

              return (
                elLeft < maxX &&
                elRight > minX &&
                elTop < maxY &&
                elBottom > minY
              );
            })
            .map((el) => el.id);

          if (selectedIds.length > 0) {
            const store = useEditorStore.getState();
            store.selectMultipleElements(selectedIds);
          } else {
            onSelectElement(null);
          }
        }

        setSelectionBox(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [activeTool, page.elements, onSelectElement]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, element: PageElement) => {
      e.stopPropagation();
      if (activeTool !== "select") return;

      // Shift+click for multi-select
      if (e.shiftKey) {
        onToggleElementSelection(element.id);
        return;
      }

      onSelectElement(element.id);

      dragRef.current = {
        elementId: element.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: element.x,
        origY: element.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current || !canvasRef.current) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;

        // Convert pixel delta to percentage
        const pctX = (dx / CANVAS_WIDTH) * 100;
        const pctY = (dy / CANVAS_HEIGHT) * 100;

        const newX = dragRef.current.origX + pctX;
        const newY = dragRef.current.origY + pctY;

        // Find the dragging element
        const draggingElement = page.elements.find((el) => el.id === dragRef.current!.elementId);
        
        if (draggingElement) {
          // Check for alignment guides and snap
          const { snapX, snapY } = updateGuides(draggingElement, page.elements, newX, newY);
          
          onUpdateElement(dragRef.current.elementId, {
            x: snapX,
            y: snapY,
          });
        } else {
          onUpdateElement(dragRef.current.elementId, {
            x: newX,
            y: newY,
          });
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        // Clear alignment guides
        clearGuides();

        // Only snap-to-slot if Alt key is held (optional snap behavior)
        if (dragRef.current && activeLayout && canvasRef.current && upEvent.altKey) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = upEvent.clientX - rect.left;
          const y = upEvent.clientY - rect.top;
          const nearestSlot = findNearestSlot(x, y, 50);
          
          if (nearestSlot) {
            assignPhotoToSlot(dragRef.current.elementId, nearestSlot);
          }
        }

        dragRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [activeTool, zoomLevel, onSelectElement, onUpdateElement, page.elements, updateGuides, clearGuides, activeLayout, findNearestSlot, assignPhotoToSlot]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const src = e.dataTransfer.getData("text/photo-url");
      if (!src || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onDropPhoto(src, x, y);
    },
    [onDropPhoto]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const bgStyle = (() => {
    const bg = page.background;
    if (bg.type === "gradient" && bg.secondaryValue) {
      return {
        background: `linear-gradient(${bg.gradientAngle || 180}deg, ${bg.value}, ${bg.secondaryValue})`,
      };
    }
    return { backgroundColor: bg.value };
  })();

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-8 bg-muted">
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative rounded-2xl"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${zoomLevel})`,
          transformOrigin: "center center",
          boxShadow: "0 16px 48px hsl(9 97% 45% / 0.16)",
          ...bgStyle,
        }}
      >
        {/* Render layout slot placeholders if active layout is set (as visual guides) */}
        {activeLayout && activeLayout.slots.map((slot) => {
          const assignedPhotoId = slotAssignments[slot.id];
          // Only render placeholder if slot is empty
          if (!assignedPhotoId) {
            return (
              <div
                key={`placeholder-${slot.id}`}
                className="absolute border-2 border-dashed border-muted-foreground/30 rounded-lg pointer-events-none"
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.width}%`,
                  height: `${slot.height}%`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                  Slot
                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Always render all elements in free-form mode */}
        {page.elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={selectedElementIds.includes(element.id)}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
            onResize={onUpdateElement}
          />
        ))}

        {/* Alignment Guides */}
        {guides.map((guide, idx) => (
          <div
            key={`${guide.type}-${guide.position}-${idx}`}
            className="absolute pointer-events-none"
            style={{
              ...(guide.type === "vertical"
                ? {
                    left: guide.position,
                    top: 0,
                    width: 1,
                    height: "100%",
                    borderLeft: "1px dashed #f97316",
                  }
                : {
                    left: 0,
                    top: guide.position,
                    width: "100%",
                    height: 1,
                    borderTop: "1px dashed #f97316",
                  }),
            }}
          />
        ))}

        {/* Selection Box */}
        {selectionBox && (
          <div
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY),
            }}
          />
        )}
      </div>
    </div>
  );
}
