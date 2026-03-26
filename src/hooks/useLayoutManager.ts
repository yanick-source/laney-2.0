import { useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { LayoutDefinition } from "@/lib/layouts";
import type { PhotoElement } from "@/types/editor";

export function useLayoutManager() {
  const {
    pages,
    currentPageIndex,
    activeLayout,
    slotAssignments,
    unplacedPhotos,
    setActiveLayout,
    setSlotAssignments,
    setUnplacedPhotos,
    updateElement,
    deleteElement,
  } = useEditorStore();

  const currentPage = pages[currentPageIndex];

  const applyLayout = useCallback(
    (layout: LayoutDefinition) => {
      if (!currentPage) return;

      // Get all photo elements from current page
      const photoElements = currentPage.elements.filter(
        (el) => el.type === "photo"
      ) as PhotoElement[];

      // Create slot assignments (fill left-to-right, top-to-bottom)
      const newAssignments: Record<string, string | null> = {};
      const assignedPhotoIds = new Set<string>();

      layout.slots.forEach((slot, index) => {
        if (photoElements[index]) {
          newAssignments[slot.id] = photoElements[index].id;
          assignedPhotoIds.add(photoElements[index].id);

          // Update photo element to snap to slot position
          updateElement(photoElements[index].id, {
            x: slot.x,
            y: slot.y,
            width: slot.width,
            height: slot.height,
          });
        } else {
          newAssignments[slot.id] = null;
        }
      });

      // Remaining photos go to unplaced tray
      const remaining = photoElements.filter(
        (photo) => !assignedPhotoIds.has(photo.id)
      );

      setActiveLayout(layout);
      setSlotAssignments(newAssignments);
      setUnplacedPhotos(remaining);
    },
    [currentPage, updateElement, setActiveLayout, setSlotAssignments, setUnplacedPhotos]
  );

  const assignPhotoToSlot = useCallback(
    (photoId: string, slotId: string) => {
      if (!activeLayout || !currentPage) return;

      const slot = activeLayout.slots.find((s: { id: string }) => s.id === slotId);
      if (!slot) return;

      // Get currently assigned photo in this slot (if any)
      const displacedPhotoId = slotAssignments[slotId];

      // Update assignments
      const newAssignments = { ...slotAssignments };
      newAssignments[slotId] = photoId;

      // If a photo was displaced, move it to unplaced tray
      if (displacedPhotoId) {
        const displacedPhoto = currentPage.elements.find(
          (el) => el.id === displacedPhotoId
        ) as PhotoElement | undefined;
        if (displacedPhoto) {
          setUnplacedPhotos([...unplacedPhotos, displacedPhoto]);
        }
      }

      // Remove photo from unplaced tray if it was there
      const newUnplaced = unplacedPhotos.filter((p: PhotoElement) => p.id !== photoId);
      setUnplacedPhotos(newUnplaced);

      // Update photo position to snap to slot
      updateElement(photoId, {
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      });

      setSlotAssignments(newAssignments);
    },
    [
      activeLayout,
      currentPage,
      slotAssignments,
      unplacedPhotos,
      updateElement,
      setSlotAssignments,
      setUnplacedPhotos,
    ]
  );

  const removePhotoFromSlot = useCallback(
    (slotId: string) => {
      if (!slotAssignments[slotId]) return;

      const photoId = slotAssignments[slotId];
      if (!photoId || !currentPage) return;

      const photo = currentPage.elements.find((el) => el.id === photoId) as
        | PhotoElement
        | undefined;

      if (photo) {
        setUnplacedPhotos([...unplacedPhotos, photo]);
      }

      const newAssignments = { ...slotAssignments };
      newAssignments[slotId] = null;
      setSlotAssignments(newAssignments);
    },
    [slotAssignments, currentPage, unplacedPhotos, setSlotAssignments, setUnplacedPhotos]
  );

  const findNearestSlot = useCallback(
    (x: number, y: number, threshold: number = 20): string | null => {
      if (!activeLayout) return null;

      // Convert percentage to pixels (assuming 800x600 canvas)
      const canvasWidth = 800;
      const canvasHeight = 600;

      for (const slot of activeLayout.slots) {
        const slotCenterX = (slot.x + slot.width / 2) * (canvasWidth / 100);
        const slotCenterY = (slot.y + slot.height / 2) * (canvasHeight / 100);

        const distance = Math.sqrt(
          Math.pow(x - slotCenterX, 2) + Math.pow(y - slotCenterY, 2)
        );

        if (distance < threshold) {
          return slot.id;
        }
      }

      return null;
    },
    [activeLayout]
  );

  const clearLayout = useCallback(() => {
    if (!currentPage) return;

    const photoElements = currentPage.elements.filter(
      (el) => el.type === "photo"
    ) as PhotoElement[];

    setActiveLayout(null);
    setSlotAssignments({});
    setUnplacedPhotos(photoElements);
  }, [currentPage, setActiveLayout, setSlotAssignments, setUnplacedPhotos]);

  return {
    activeLayout,
    slotAssignments,
    unplacedPhotos,
    applyLayout,
    assignPhotoToSlot,
    removePhotoFromSlot,
    findNearestSlot,
    clearLayout,
  };
}
