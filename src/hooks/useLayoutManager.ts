import { useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useUploadStore } from "@/stores/uploadStore";
import { getLayoutById, SNAP_LAYOUTS } from "@/lib/layouts";
import { getTemplateById, TEMPLATES } from "@/lib/templates";
import { generateId } from "@/lib/utils";
import type { PhotoElement, TextElement, PageElement } from "@/types/editor";
import type { PhotoFile } from "@/types/upload";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Default spacing for plain snap-to-grid layouts (no template).
// gap   = % gap between adjacent photos (half-inset per side)
// padding = % inset from page edges (applied on top of gap/2)
const LAYOUT_SPACING = { gap: 1.5, padding: 2 };

export function useLayoutManager() {
  // Read reactive values for UI rendering
  const { pages, currentPageIndex } = useEditorStore();
  const currentPage = pages[currentPageIndex];

  const activeLayoutId = currentPage?.activeLayoutId ?? null;
  const activeLayout = activeLayoutId ? (getLayoutById(activeLayoutId) ?? null) : null;
  const slotAssignments: Record<string, string | null> = currentPage?.slotAssignments ?? {};
  const isFreeForm = currentPage?.isFreeForm ?? false;

  /**
   * Apply a layout to the current page.
   *
   * AUTO-HYDRATION BRIDGE: If the page has no photos yet, pull from
   * uploadStore and create PhotoElements on-the-fly so the page
   * instantly populates when a layout is selected.
   *
   * All state reads use .getState() to avoid stale closure bugs,
   * since addPhoto() mutates the store between iterations.
   */
  const applyLayout = useCallback((layoutId: string) => {
    const layout = getLayoutById(layoutId);
    if (!layout) return;

    const store = useEditorStore.getState();
    const page = store.pages[store.currentPageIndex];
    if (!page) return;

    const uploadedPhotos = useUploadStore.getState().photos;
    const pagePhotoEls = page.elements.filter((el) => el.type === "photo");
    const newAssignments: Record<string, string | null> = {};

    // Canva-style spacing: gap/2 inset per side so adjacent photos have
    // a full `gap` between them; `padding` adds extra breathing room.
    const { gap, padding } = LAYOUT_SPACING;
    const halfGap = gap / 2;
    const inset = (s: typeof layout.slots[0]) => ({
      x:      s.x      + halfGap + padding,
      y:      s.y      + halfGap + padding,
      width:  s.width  - gap     - padding * 2,
      height: s.height - gap     - padding * 2,
    });

    for (const [index, slot] of layout.slots.entries()) {
      const { x, y, width, height } = inset(slot);

      if (pagePhotoEls[index]) {
        // Snap existing page photo to spaced slot
        store.updateElement(pagePhotoEls[index].id, {
          x, y, width, height,
          cropX: 50,
          cropY: 50,
          cropZoom: 1,
        });
        newAssignments[slot.id] = pagePhotoEls[index].id;
      } else if (uploadedPhotos[index]) {
        // Auto-Hydration: create PhotoElement from uploadStore
        const photoUrl = uploadedPhotos[index].url || uploadedPhotos[index].preview;
        if (photoUrl) {
          const photoId = store.addPhoto(photoUrl, x, y);
          if (photoId !== null) {
            // Re-read store after addPhoto to avoid stale state
            useEditorStore.getState().updateElement(photoId, {
              x, y, width, height,
              cropX: 50,
              cropY: 50,
              cropZoom: 1,
            });
            newAssignments[slot.id] = photoId;
          } else {
            newAssignments[slot.id] = null;
          }
        } else {
          newAssignments[slot.id] = null;
        }
      } else {
        newAssignments[slot.id] = null; // Empty slot — shows placeholder
      }
    }

    // Re-read fresh state after all addPhoto calls have mutated it
    const fresh = useEditorStore.getState();
    const freshPage = fresh.pages[fresh.currentPageIndex];
    if (!freshPage) return;

    const newPages = [...fresh.pages];
    newPages[fresh.currentPageIndex] = {
      ...freshPage,
      activeLayoutId: layout.id,
      slotAssignments: newAssignments,
      isFreeForm: false,
    };
    fresh.setPages(newPages);
  }, []); // intentionally empty — reads live state via getState()

  /**
   * Assign an existing PhotoElement (by ID) to a slot.
   * Snaps its position and dimensions to match the slot exactly.
   * Called after drag-drop or photo picker selection.
   */
  const assignPhotoToSlot = useCallback((photoId: string, slotId: string) => {
    const store = useEditorStore.getState();
    const page = store.pages[store.currentPageIndex];
    if (!page?.activeLayoutId) return;

    const layout = getLayoutById(page.activeLayoutId);
    if (!layout) return;

    const slot = layout.slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Snap photo to slot
    store.updateElement(photoId, {
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      cropX: 50,
      cropY: 50,
      cropZoom: 1,
    });

    // Patch assignments — re-read after updateElement
    const fresh = useEditorStore.getState();
    const freshPage = fresh.pages[fresh.currentPageIndex];
    if (!freshPage) return;

    const newPages = [...fresh.pages];
    newPages[fresh.currentPageIndex] = {
      ...freshPage,
      slotAssignments: { ...(freshPage.slotAssignments ?? {}), [slotId]: photoId },
    };
    fresh.setPages(newPages);
  }, []); // intentionally empty — reads live state via getState()

  /**
   * Find the nearest layout slot center within a pixel threshold.
   * Used on drag-drop mouse-up for magnetic snap-to-grid.
   */
  const findNearestSlot = useCallback((x: number, y: number, threshold = 80): string | null => {
    const page = useEditorStore.getState().pages[useEditorStore.getState().currentPageIndex];
    if (!page?.activeLayoutId || page.isFreeForm) return null;

    const layout = getLayoutById(page.activeLayoutId);
    if (!layout) return null;

    let nearestId: string | null = null;
    let minDist = threshold;

    for (const slot of layout.slots) {
      const cx = ((slot.x + slot.width / 2) / 100) * CANVAS_WIDTH;
      const cy = ((slot.y + slot.height / 2) / 100) * CANVAS_HEIGHT;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < minDist) {
        minDist = dist;
        nearestId = slot.id;
      }
    }

    return nearestId;
  }, []); // intentionally empty — reads live state via getState()

  /**
   * Clear the active layout from the current page and enter free-form mode.
   */
  const clearLayout = useCallback(() => {
    const store = useEditorStore.getState();
    const page = store.pages[store.currentPageIndex];
    if (!page) return;

    const newPages = [...store.pages];
    newPages[store.currentPageIndex] = {
      ...page,
      activeLayoutId: null,
      slotAssignments: {},
      isFreeForm: true,
    };
    store.setPages(newPages);
  }, []); // intentionally empty — reads live state via getState()

  /**
   * Apply a full Template to the current page in ONE setPages call (= single undo step).
   *
   * Steps:
   *   1. Orientation-aware photo sort — tall slots get portrait photos first.
   *   2. Build photo elements from page OR uploadStore (Auto-Hydration).
   *   3. Safety guard: slots with no photo get a placeholder TextElement.
   *   4. Inject decor elements (ornaments, text overlays) above photos.
   *   5. Set background color from template theme.
   *   6. Single setPages → single undo entry.
   */
  const applyTemplate = useCallback((templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    const layout = getLayoutById(template.baseLayoutId);
    if (!layout) return;

    const store = useEditorStore.getState();
    const { pages, currentPageIndex } = store;
    const page = pages[currentPageIndex];
    if (!page) return;

    const uploadedPhotos = useUploadStore.getState().photos;

    // ── 1. Orientation-aware photo sort ──────────────────────────────────
    const heroSlot = layout.slots[0];
    const heroIsPortrait = heroSlot.height / heroSlot.width > 1.2;
    const heroIsLandscape = heroSlot.width / heroSlot.height > 1.2;

    const portraitFirst = (a: PhotoFile, b: PhotoFile) => {
      const aP = a.height && a.width && a.height > a.width ? 0 : 1;
      const bP = b.height && b.width && b.height > b.width ? 0 : 1;
      return aP - bP;
    };
    const landscapeFirst = (a: PhotoFile, b: PhotoFile) => {
      const aL = a.width && a.height && a.width > a.height ? 0 : 1;
      const bL = b.width && b.height && b.width > b.height ? 0 : 1;
      return aL - bL;
    };

    const sortedUploads = [...uploadedPhotos].sort(
      heroIsPortrait ? portraitFirst : heroIsLandscape ? landscapeFirst : () => 0
    );

    const existingPhotoEls = page.elements.filter(
      (el) => el.type === "photo"
    ) as PhotoElement[];

    // ── Spacing helper (Canva-style) ──────────────────────────────────────
    // gap/2 is inset on every side of each slot so adjacent photos have a
    // full `gap` between them and edge photos have `gap/2 + padding` from
    // the page border.
    const { gap, padding } = template.theme.spacing;
    const halfGap = gap / 2;
    const insetSlot = (s: typeof layout.slots[0]) => ({
      x:      s.x      + halfGap + padding,
      y:      s.y      + halfGap + padding,
      width:  s.width  - gap     - padding * 2,
      height: s.height - gap     - padding * 2,
    });

    // ── 2 & 3. Build photo / placeholder elements per slot ────────────────
    const newElements: PageElement[] = [];
    const newAssignments: Record<string, string | null> = {};
    let zCounter = 1;

    for (const [i, slot] of layout.slots.entries()) {
      const { x, y, width, height } = insetSlot(slot);

      if (existingPhotoEls[i]) {
        // Snap existing page photo to spaced slot
        const el: PhotoElement = {
          ...existingPhotoEls[i],
          x, y, width, height,
          zIndex: zCounter++,
          cropX: 50,
          cropY: 50,
          cropZoom: 1,
        };
        newElements.push(el);
        newAssignments[slot.id] = el.id;
      } else if (sortedUploads[i]) {
        // Auto-Hydration: create from uploadStore
        const photoUrl = sortedUploads[i].url || sortedUploads[i].preview;
        if (photoUrl) {
          const el: PhotoElement = {
            id: generateId(),
            type: "photo",
            src: photoUrl,
            x, y, width, height,
            rotation: 0,
            zIndex: zCounter++,
            opacity: 1,
            cropX: 50,
            cropY: 50,
            cropZoom: 1,
          };
          newElements.push(el);
          newAssignments[slot.id] = el.id;
        } else {
          newAssignments[slot.id] = null;
        }
      } else {
        // ── Safety guard: too few photos → inject placeholder text box ──
        const placeholder: TextElement = {
          id: generateId(),
          type: "text",
          content: `📷 Foto ${i + 1}`,
          x, y, width, height,
          rotation: 0,
          zIndex: zCounter++,
          opacity: 0.5,
          fontFamily: template.theme.fontFamily,
          fontSize: 16,
          fontWeight: "400",
          color: template.theme.textColor,
          textAlign: "center",
          lineHeight: 1.4,
        };
        newElements.push(placeholder);
        newAssignments[slot.id] = null;
      }
    }

    // ── 4. Inject decor elements above photos ─────────────────────────────
    const decorZBase = zCounter + 10;
    for (const [di, decor] of template.theme.decorElements.entries()) {
      const decorEl: TextElement = {
        id: generateId(),
        type: "text",
        content: decor.content,
        x: decor.x,
        y: decor.y,
        width: decor.width,
        height: decor.height,
        rotation: 0,
        zIndex: decorZBase + di,
        opacity: 1,
        fontFamily: decor.fontFamily,
        fontSize: decor.fontSize,
        fontWeight: "400",
        color: decor.color,
        textAlign: decor.textAlign,
        lineHeight: 1.4,
      };
      newElements.push(decorEl);
    }

    // ── 5 & 6. Single setPages call = single undo entry ──────────────────
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: newElements,
      background: { type: "solid", value: template.theme.backgroundColor },
      activeLayoutId: layout.id,
      slotAssignments: newAssignments,
      isFreeForm: false,
    };
    store.setPages(newPages);
  }, []); // intentionally empty — reads live state via getState()

  return {
    // Reactive state for rendering
    activeLayout,
    slotAssignments,
    isFreeForm,
    availableLayouts: SNAP_LAYOUTS,
    availableTemplates: TEMPLATES,

    // Actions
    applyLayout,
    applyTemplate,
    assignPhotoToSlot,
    findNearestSlot,
    clearLayout,
  };
}
