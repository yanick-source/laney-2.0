import { create } from "zustand";
import type {
  EditorState,
  EditorTool,
  PageElement,
  PhotobookPage,
  PageBackground,
  PhotoElement,
  TextElement,
} from "@/types/editor";
import type { LayoutDefinition } from "@/lib/layouts";
import { generateId } from "@/lib/utils";
import { useHistoryStore } from "./historyStore";

interface EditorStore extends EditorState {
  setPages: (pages: PhotobookPage[]) => void;
  setCurrentPage: (index: number) => void;
  selectElement: (id: string | null) => void;
  toggleElementSelection: (id: string) => void;
  selectMultipleElements: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: EditorTool) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (time: string) => void;

  addPage: () => void;
  deletePage: (index: number) => void;
  duplicatePage: (index: number) => void;

  updateElement: (id: string, changes: Partial<PageElement>) => void;
  deleteElement: (id: string) => void;
  addPhoto: (src: string, x: number, y: number) => string | null;
  addText: (variant?: "heading" | "body") => void;
  setPageBackground: (index: number, bg: PageBackground) => void;

  // Copy/paste
  clipboard: PageElement | null;
  copyElement: (id: string) => void;
  pasteElement: () => void;

  // Layer order
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Layout templates
  applyLayout: (layoutId: string, photos?: string[]) => void;

  // Snap-to-grid layout system
  activeLayout: LayoutDefinition | null;
  slotAssignments: Record<string, string | null>;
  unplacedPhotos: PhotoElement[];
  setActiveLayout: (layout: LayoutDefinition | null) => void;
  setSlotAssignments: (assignments: Record<string, string | null>) => void;
  setUnplacedPhotos: (photos: PhotoElement[]) => void;

  reset: () => void;
}

const DEFAULT_STATE: EditorState = {
  bookId: "",
  pages: [],
  currentPageIndex: 0,
  selectedElementId: null,
  selectedElementIds: [],
  zoomLevel: 1,
  activeTool: "select",
  isDirty: false,
  lastSavedAt: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...DEFAULT_STATE,
  clipboard: null,
  activeLayout: null,
  slotAssignments: {},
  unplacedPhotos: [],

  setPages: (pages) => {
    useHistoryStore.getState().pushState(pages);
    set({ pages, isDirty: true });
  },
  setCurrentPage: (index) =>
    set({ currentPageIndex: index, selectedElementId: null, selectedElementIds: [] }),
  selectElement: (id) => set({ selectedElementId: id, selectedElementIds: id ? [id] : [] }),
  toggleElementSelection: (id) => {
    const { selectedElementIds } = get();
    const isSelected = selectedElementIds.includes(id);
    const newSelection = isSelected
      ? selectedElementIds.filter((eid) => eid !== id)
      : [...selectedElementIds, id];
    set({
      selectedElementIds: newSelection,
      selectedElementId: newSelection.length === 1 ? newSelection[0] : null,
    });
  },
  selectMultipleElements: (ids) => set({
    selectedElementIds: ids,
    selectedElementId: ids.length === 1 ? ids[0] : null,
  }),
  clearSelection: () => set({ selectedElementId: null, selectedElementIds: [] }),
  setZoom: (zoom) => set({ zoomLevel: Math.max(0.25, Math.min(3, zoom)) }),
  setTool: (tool) => set({ activeTool: tool }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastSaved: (time) => set({ lastSavedAt: time, isDirty: false }),

  addPage: () => {
    const { pages } = get();
    const newPage: PhotobookPage = {
      id: generateId(),
      elements: [],
      background: { type: "solid", value: "#FFFFFF" },
    };
    const newPages = [...pages, newPage];
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, currentPageIndex: pages.length, isDirty: true });
  },

  deletePage: (index) => {
    const { pages, currentPageIndex } = get();
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    useHistoryStore.getState().pushState(newPages);
    set({
      pages: newPages,
      currentPageIndex: Math.min(currentPageIndex, newPages.length - 1),
      selectedElementId: null,
      isDirty: true,
    });
  },

  duplicatePage: (index) => {
    const { pages } = get();
    const source = pages[index];
    if (!source) return;
    const dup: PhotobookPage = {
      ...source,
      id: generateId(),
      elements: source.elements.map((el) => ({ ...el, id: generateId() })),
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, dup);
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, currentPageIndex: index + 1, isDirty: true });
  },

  updateElement: (id, changes) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;
    const newElements = page.elements.map((el) =>
      el.id === id ? { ...el, ...changes } : el
    ) as typeof page.elements;
    const newPages = [...pages];
    newPages[currentPageIndex] = { ...page, elements: newElements };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, isDirty: true });
  },

  deleteElement: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: page.elements.filter((el) => el.id !== id),
    };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, selectedElementId: null, isDirty: true });
  },

  addPhoto: (src, x, y) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return null;
    
    // Use reasonable default size that fits well on canvas (20% of page width)
    const defaultWidth = 20;
    const defaultHeight = 15;
    
    const photo: PhotoElement = {
      id: generateId(),
      type: "photo",
      src,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      zIndex: page.elements.length + 1,
      opacity: 1,
      cropX: 50,
      cropY: 50,
      cropZoom: 1,
    };
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: [...page.elements, photo],
    };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, selectedElementId: photo.id, isDirty: true });
    return photo.id;
  },

  addText: (variant = "body") => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;
    const isHeading = variant === "heading";
    const text: TextElement = {
      id: generateId(),
      type: "text",
      content: isHeading ? "Your Title" : "Add your text here",
      x: 50,
      y: 50,
      width: isHeading ? 400 : 300,
      height: isHeading ? 60 : 40,
      rotation: 0,
      zIndex: page.elements.length + 1,
      opacity: 1,
      fontFamily: isHeading ? "Playfair Display, serif" : "Inter, sans-serif",
      fontSize: isHeading ? 32 : 16,
      fontWeight: isHeading ? "600" : "400",
      color: "#000000",
      textAlign: "center",
      lineHeight: 1.4,
    };
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: [...page.elements, text],
    };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, selectedElementId: text.id, isDirty: true });
  },

  setPageBackground: (index, bg) => {
    const { pages } = get();
    const newPages = [...pages];
    if (newPages[index]) {
      newPages[index] = { ...newPages[index], background: bg };
      useHistoryStore.getState().pushState(newPages);
      set({ pages: newPages, isDirty: true });
    }
  },

  // --- Copy/Paste ---

  copyElement: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;
    const element = page.elements.find((el) => el.id === id);
    if (element) {
      set({ clipboard: element });
    }
  },

  pasteElement: () => {
    const { clipboard, pages, currentPageIndex } = get();
    if (!clipboard) return;
    const page = pages[currentPageIndex];
    if (!page) return;

    // Create duplicate with new ID and offset position
    const duplicate = {
      ...clipboard,
      id: generateId(),
      x: clipboard.x + 2,
      y: clipboard.y + 2,
      zIndex: page.elements.length + 1,
    };

    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: [...page.elements, duplicate],
    };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, selectedElementId: duplicate.id, isDirty: true });
  },

  // --- Layer Order ---

  bringForward: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;

    const elements = [...page.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const currentZ = elements[index].zIndex;
    const higherElements = elements.filter((el) => el.zIndex > currentZ);
    if (higherElements.length === 0) return;

    const nextZ = Math.min(...higherElements.map((el) => el.zIndex));
    const swapElement = elements.find((el) => el.zIndex === nextZ);

    elements[index] = { ...elements[index], zIndex: nextZ };
    if (swapElement) {
      const swapIndex = elements.findIndex((el) => el.id === swapElement.id);
      elements[swapIndex] = { ...elements[swapIndex], zIndex: currentZ };
    }

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...page, elements };
    set({ pages: newPages, isDirty: true });
  },

  sendBackward: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;

    const elements = [...page.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const currentZ = elements[index].zIndex;
    const lowerElements = elements.filter((el) => el.zIndex < currentZ);
    if (lowerElements.length === 0) return;

    const prevZ = Math.max(...lowerElements.map((el) => el.zIndex));
    const swapElement = elements.find((el) => el.zIndex === prevZ);

    elements[index] = { ...elements[index], zIndex: prevZ };
    if (swapElement) {
      const swapIndex = elements.findIndex((el) => el.id === swapElement.id);
      elements[swapIndex] = { ...elements[swapIndex], zIndex: currentZ };
    }

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...page, elements };
    set({ pages: newPages, isDirty: true });
  },

  bringToFront: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;

    const elements = [...page.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const maxZ = Math.max(...elements.map((el) => el.zIndex));
    elements[index] = { ...elements[index], zIndex: maxZ + 1 };

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...page, elements };
    set({ pages: newPages, isDirty: true });
  },

  sendToBack: (id) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;

    const elements = [...page.elements];
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const minZ = Math.min(...elements.map((el) => el.zIndex));
    elements[index] = { ...elements[index], zIndex: minZ - 1 };

    const newPages = [...pages];
    newPages[currentPageIndex] = { ...page, elements };
    set({ pages: newPages, isDirty: true });
  },

  // --- Snap-to-grid Layout System ---

  setActiveLayout: (layout) => set({ activeLayout: layout }),
  setSlotAssignments: (assignments) => set({ slotAssignments: assignments }),
  setUnplacedPhotos: (photos) => set({ unplacedPhotos: photos }),

  // --- Layout Templates ---

  applyLayout: (layoutId, photos = []) => {
    const { pages, currentPageIndex } = get();
    const page = pages[currentPageIndex];
    if (!page) return;

    // Import LAYOUT_PRESETS dynamically
    const { LAYOUT_PRESETS } = require("@/types/editor");
    const layout = LAYOUT_PRESETS.find((l: { id: string }) => l.id === layoutId);
    if (!layout) return;

    // Get existing photos from page or use provided photos
    const existingPhotos = page.elements
      .filter((el) => el.type === "photo")
      .map((el) => (el as PhotoElement).src);
    const availablePhotos = photos.length > 0 ? photos : existingPhotos;

    // Create photo elements for each slot
    const newElements: PageElement[] = layout.slots.map((slot: { x: number; y: number; width: number; height: number }, i: number) => {
      const photoSrc = availablePhotos[i % availablePhotos.length] || "";
      return {
        id: generateId(),
        type: "photo",
        src: photoSrc,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        rotation: 0,
        zIndex: i + 1,
        opacity: 1,
        cropX: 50,
        cropY: 50,
        cropZoom: 1,
      } as PhotoElement;
    });

    // Keep non-photo elements (text, etc.)
    const nonPhotoElements = page.elements.filter((el) => el.type !== "photo");

    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...page,
      elements: [...newElements, ...nonPhotoElements],
      layoutId,
    };
    useHistoryStore.getState().pushState(newPages);
    set({ pages: newPages, selectedElementId: null, isDirty: true });
  },

  reset: () => set(DEFAULT_STATE),
}));
