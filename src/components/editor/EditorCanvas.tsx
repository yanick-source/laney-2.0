import { useCallback, useRef, useState } from "react";
import type {
  PhotobookPage,
  PageElement,
  PhotoElement as PhotoElementType,
  EditorTool,
} from "@/types/editor";
import CanvasElement from "./canvas/CanvasElement";
import PhotoSlot from "./canvas/PhotoSlot";
import ContextMenu from "./ContextMenu";
import PhotoPickerModal from "./PhotoPickerModal";
import { useAlignmentGuides } from "@/hooks/useAlignmentGuides";
import { useEditorStore } from "@/stores/editorStore";
import type { LayoutDefinition } from "@/lib/layouts";

interface EditorCanvasProps {
  page: PhotobookPage;
  zoomLevel: number;
  selectedElementId: string | null;
  selectedElementIds: string[];
  activeTool: EditorTool;
  photos: Array<{ id: string; url: string; name: string }>;
  activeLayout: LayoutDefinition | null;
  slotAssignments: Record<string, string | null>;
  onSelectElement: (id: string | null) => void;
  onToggleElementSelection: (id: string) => void;
  onUpdateElement: (id: string, changes: Partial<PageElement>) => void;
  onDeleteElement: (id: string) => void;
  onDropPhoto: (src: string, x: number, y: number) => void;
  onAssignPhotoToSlot: (photoId: string, slotId: string) => void;
  onFindNearestSlot: (x: number, y: number) => string | null;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function EditorCanvas({
  page,
  zoomLevel,
  selectedElementId,
  selectedElementIds,
  activeTool,
  photos,
  activeLayout,
  slotAssignments,
  onSelectElement,
  onToggleElementSelection,
  onUpdateElement,
  onDeleteElement,
  onDropPhoto,
  onAssignPhotoToSlot,
  onFindNearestSlot,
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

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string;
  } | null>(null);

  const [photoPickerSlot, setPhotoPickerSlot] = useState<string | null>(null);

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

  const handleElementContextMenu = useCallback(
    (e: React.MouseEvent, element: PageElement) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        elementId: element.id
      });
    },
    []
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
          const nearestSlot = onFindNearestSlot(x, y);
          
          if (nearestSlot) {
            onAssignPhotoToSlot(dragRef.current.elementId, nearestSlot);
          }
        }

        dragRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [activeTool, zoomLevel, onSelectElement, onUpdateElement, page.elements, updateGuides, clearGuides, activeLayout, onFindNearestSlot, onAssignPhotoToSlot]
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
        {/* Render layout slots if active layout is set */}
        {activeLayout ? (
          activeLayout.slots.map((slot) => {
            const slotId = slot.id;
            const assignedPhotoId = slotAssignments[slotId];
            const photo = assignedPhotoId
              ? (page.elements.find((el) => el.id === assignedPhotoId) as PhotoElementType | undefined)
              : null;

            return (
              <PhotoSlot
                key={slotId}
                slotId={slotId}
                slot={slot}
                photo={photo || null}
                isSelected={assignedPhotoId ? selectedElementIds.includes(assignedPhotoId) : false}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                onMouseDown={(e) => {
                  if (photo) {
                    handleElementMouseDown(e, photo);
                  }
                }}
                onResize={onUpdateElement}
                onPlaceholderClick={() => {
                  setPhotoPickerSlot(slotId);
                }}
              />
            );
          })
        ) : (
          // Render free-form elements when no layout is active
          page.elements.map((element) => (
            <div
              key={element.id}
              onContextMenu={(e) => handleElementContextMenu(e, element)}
            >
              <CanvasElement
                element={element}
                isSelected={selectedElementIds.includes(element.id)}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                onMouseDown={(e) => handleElementMouseDown(e, element)}
                onResize={onUpdateElement}
              />
            </div>
          ))
        )}

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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={() => {
            const element = page.elements.find(el => el.id === contextMenu.elementId);
            if (element) {
              navigator.clipboard.writeText(JSON.stringify(element));
            }
          }}
          onDelete={() => onDeleteElement(contextMenu.elementId)}
          onDuplicate={() => {
            const element = page.elements.find(el => el.id === contextMenu.elementId);
            if (element && element.type === 'photo') {
              useEditorStore.getState().addPhoto(element.src, element.x + 2, element.y + 2);
            } else if (element && element.type === 'text') {
              useEditorStore.getState().addText();
            }
          }}
          onBringForward={() => {
            const element = page.elements.find(el => el.id === contextMenu.elementId);
            if (element) {
              onUpdateElement(contextMenu.elementId, { zIndex: element.zIndex + 1 });
            }
          }}
          onSendBackward={() => {
            const element = page.elements.find(el => el.id === contextMenu.elementId);
            if (element) {
              onUpdateElement(contextMenu.elementId, { zIndex: Math.max(1, element.zIndex - 1) });
            }
          }}
          onBringToFront={() => {
            const maxZ = Math.max(...page.elements.map(el => el.zIndex));
            onUpdateElement(contextMenu.elementId, { zIndex: maxZ + 1 });
          }}
          onSendToBack={() => {
            onUpdateElement(contextMenu.elementId, { zIndex: 1 });
          }}
        />
      )}

      {/* Photo Picker Modal */}
      {photoPickerSlot && activeLayout && (
        <PhotoPickerModal
          photos={photos}
          onSelectPhoto={(photoUrl) => {
            const slot = activeLayout.slots.find((s) => s.id === photoPickerSlot);
            if (!slot) { setPhotoPickerSlot(null); return; }

            // Check if this photo URL already exists as an element on the page
            const existing = page.elements.find(
              (el) => el.type === 'photo' && (el as PhotoElementType).src === photoUrl
            ) as PhotoElementType | undefined;

            if (existing) {
              onAssignPhotoToSlot(existing.id, photoPickerSlot);
            } else {
              // Create a new PhotoElement from the uploaded URL, then assign
              const photoId = useEditorStore.getState().addPhoto(photoUrl, slot.x, slot.y);
              if (photoId) onAssignPhotoToSlot(photoId, photoPickerSlot);
            }
            setPhotoPickerSlot(null);
          }}
          onClose={() => setPhotoPickerSlot(null)}
        />
      )}
    </div>
  );
}
