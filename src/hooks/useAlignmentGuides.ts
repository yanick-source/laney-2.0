import { useState, useCallback } from "react";
import type { PageElement } from "@/types/editor";

interface AlignmentGuide {
  type: "vertical" | "horizontal";
  position: number;
  label?: string;
}

const SNAP_THRESHOLD = 5; // pixels

export function useAlignmentGuides(canvasWidth: number, canvasHeight: number) {
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);

  const findAlignmentGuides = useCallback(
    (
      draggingElement: PageElement,
      allElements: PageElement[],
      dragX: number,
      dragY: number
    ): { guides: AlignmentGuide[]; snapX: number; snapY: number } => {
      const foundGuides: AlignmentGuide[] = [];
      let snapX = dragX;
      let snapY = dragY;

      // Convert dragging element to pixel coordinates
      const dragLeft = (dragX / 100) * canvasWidth;
      const dragRight = dragLeft + (draggingElement.width / 100) * canvasWidth;
      const dragTop = (dragY / 100) * canvasHeight;
      const dragBottom = dragTop + (draggingElement.height / 100) * canvasHeight;
      const dragCenterX = dragLeft + (draggingElement.width / 100) * canvasWidth / 2;
      const dragCenterY = dragTop + (draggingElement.height / 100) * canvasHeight / 2;

      // Check against other elements
      for (const el of allElements) {
        if (el.id === draggingElement.id) continue;

        const elLeft = (el.x / 100) * canvasWidth;
        const elRight = elLeft + (el.width / 100) * canvasWidth;
        const elTop = (el.y / 100) * canvasHeight;
        const elBottom = elTop + (el.height / 100) * canvasHeight;
        const elCenterX = elLeft + (el.width / 100) * canvasWidth / 2;
        const elCenterY = elTop + (el.height / 100) * canvasHeight / 2;

        // Vertical alignment checks
        if (Math.abs(dragLeft - elLeft) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "vertical", position: elLeft });
          snapX = el.x;
        } else if (Math.abs(dragRight - elRight) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "vertical", position: elRight });
          snapX = el.x + el.width - draggingElement.width;
        } else if (Math.abs(dragLeft - elRight) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "vertical", position: elRight });
          snapX = (elRight / canvasWidth) * 100;
        } else if (Math.abs(dragRight - elLeft) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "vertical", position: elLeft });
          snapX = ((elLeft - (draggingElement.width / 100) * canvasWidth) / canvasWidth) * 100;
        } else if (Math.abs(dragCenterX - elCenterX) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "vertical", position: elCenterX });
          snapX = el.x + el.width / 2 - draggingElement.width / 2;
        }

        // Horizontal alignment checks
        if (Math.abs(dragTop - elTop) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "horizontal", position: elTop });
          snapY = el.y;
        } else if (Math.abs(dragBottom - elBottom) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "horizontal", position: elBottom });
          snapY = el.y + el.height - draggingElement.height;
        } else if (Math.abs(dragTop - elBottom) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "horizontal", position: elBottom });
          snapY = (elBottom / canvasHeight) * 100;
        } else if (Math.abs(dragBottom - elTop) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "horizontal", position: elTop });
          snapY = ((elTop - (draggingElement.height / 100) * canvasHeight) / canvasHeight) * 100;
        } else if (Math.abs(dragCenterY - elCenterY) < SNAP_THRESHOLD) {
          foundGuides.push({ type: "horizontal", position: elCenterY });
          snapY = el.y + el.height / 2 - draggingElement.height / 2;
        }
      }

      // Check canvas edges
      if (Math.abs(dragLeft) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "vertical", position: 0 });
        snapX = 0;
      } else if (Math.abs(dragRight - canvasWidth) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "vertical", position: canvasWidth });
        snapX = 100 - draggingElement.width;
      } else if (Math.abs(dragCenterX - canvasWidth / 2) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "vertical", position: canvasWidth / 2 });
        snapX = 50 - draggingElement.width / 2;
      }

      if (Math.abs(dragTop) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "horizontal", position: 0 });
        snapY = 0;
      } else if (Math.abs(dragBottom - canvasHeight) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "horizontal", position: canvasHeight });
        snapY = 100 - draggingElement.height;
      } else if (Math.abs(dragCenterY - canvasHeight / 2) < SNAP_THRESHOLD) {
        foundGuides.push({ type: "horizontal", position: canvasHeight / 2 });
        snapY = 50 - draggingElement.height / 2;
      }

      return { guides: foundGuides, snapX, snapY };
    },
    [canvasWidth, canvasHeight]
  );

  const updateGuides = useCallback(
    (
      draggingElement: PageElement | null,
      allElements: PageElement[],
      dragX: number,
      dragY: number
    ) => {
      if (!draggingElement) {
        setGuides([]);
        return { snapX: dragX, snapY: dragY };
      }

      const result = findAlignmentGuides(draggingElement, allElements, dragX, dragY);
      setGuides(result.guides);
      return { snapX: result.snapX, snapY: result.snapY };
    },
    [findAlignmentGuides]
  );

  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  return { guides, updateGuides, clearGuides };
}
