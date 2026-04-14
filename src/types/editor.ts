// --- ELEMENTS ---

export type ElementType = "photo" | "text";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
}

export interface PhotoElement extends BaseElement {
  type: "photo";
  src: string;
  cropX?: number;
  cropY?: number;
  cropZoom?: number;
  filter?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
}

export type PageElement = PhotoElement | TextElement;

// --- BOOK FORMAT ---

export type BookSize = "small" | "medium" | "large";
export type BookOrientation = "vertical" | "horizontal";

export interface BookFormat {
  size: BookSize;
  orientation: BookOrientation;
}

// --- LAYOUTS & PAGES ---

export interface LayoutSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  id: string;
  name: string;
  icon: string;
  slots: LayoutSlot[];
}

export interface PageBackground {
  type: "solid" | "gradient" | "image";
  value: string;
  secondaryValue?: string;
  gradientAngle?: number;
}

export interface PhotobookPage {
  id: string;
  elements: PageElement[];
  background: PageBackground;
  layoutId?: string;
  activeLayoutId?: string | null;
  slotAssignments?: Record<string, string | null>;
  isFreeForm?: boolean;
}

// --- EDITOR STATE ---

export type EditorTool = "select" | "text" | "hand";

export interface EditorState {
  bookId: string;
  pages: PhotobookPage[];
  currentPageIndex: number;
  selectedElementId: string | null; // Legacy - will migrate to selectedElementIds
  selectedElementIds: string[]; // Multi-select support
  zoomLevel: number;
  activeTool: EditorTool;
  isDirty: boolean;
  lastSavedAt: string | null;
}

// --- LAYOUT PRESETS ---

export const LAYOUT_PRESETS: PageLayout[] = [
  {
    id: "full",
    name: "Full Page",
    icon: "square",
    slots: [{ x: 0, y: 0, width: 100, height: 100 }],
  },
  {
    id: "classic-top",
    name: "Top Picture",
    icon: "layout",
    slots: [{ x: 5, y: 5, width: 90, height: 65 }],
  },
  {
    id: "split-v",
    name: "2 Vertical",
    icon: "columns",
    slots: [
      { x: 0, y: 0, width: 49.5, height: 100 },
      { x: 50.5, y: 0, width: 49.5, height: 100 },
    ],
  },
  {
    id: "split-h",
    name: "2 Horizontal",
    icon: "rows",
    slots: [
      { x: 0, y: 0, width: 100, height: 49.5 },
      { x: 0, y: 50.5, width: 100, height: 49.5 },
    ],
  },
  {
    id: "focus-left",
    name: "Focus Left",
    icon: "sidebar",
    slots: [
      { x: 0, y: 0, width: 66, height: 100 },
      { x: 67, y: 0, width: 33, height: 49.5 },
      { x: 67, y: 50.5, width: 33, height: 49.5 },
    ],
  },
  {
    id: "focus-right",
    name: "Focus Right",
    icon: "sidebar-right",
    slots: [
      { x: 0, y: 0, width: 33, height: 49.5 },
      { x: 0, y: 50.5, width: 33, height: 49.5 },
      { x: 34, y: 0, width: 66, height: 100 },
    ],
  },
  {
    id: "three-col",
    name: "3 Columns",
    icon: "columns-3",
    slots: [
      { x: 0, y: 0, width: 32.5, height: 100 },
      { x: 33.5, y: 0, width: 33, height: 100 },
      { x: 67.5, y: 0, width: 32.5, height: 100 },
    ],
  },
  {
    id: "grid-2x2",
    name: "Grid 2x2",
    icon: "grid",
    slots: [
      { x: 0, y: 0, width: 49.5, height: 49.5 },
      { x: 50.5, y: 0, width: 49.5, height: 49.5 },
      { x: 0, y: 50.5, width: 49.5, height: 49.5 },
      { x: 50.5, y: 50.5, width: 49.5, height: 49.5 },
    ],
  },
  {
    id: "mosaic-4",
    name: "Mosaic",
    icon: "layout-grid",
    slots: [
      { x: 0, y: 0, width: 66, height: 100 },
      { x: 67, y: 0, width: 33, height: 32.5 },
      { x: 67, y: 33.5, width: 33, height: 33 },
      { x: 67, y: 67.5, width: 33, height: 32.5 },
    ],
  },
  {
    id: "diagonal",
    name: "Diagonal",
    icon: "move-diagonal",
    slots: [
      { x: 0, y: 0, width: 65, height: 65 },
      { x: 67, y: 67, width: 33, height: 33 },
    ],
  },
];

export const FONT_FAMILIES = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Playfair", value: "Playfair Display, serif" },
  { name: "Caveat", value: "Caveat, cursive" },
  { name: "System", value: "system-ui, sans-serif" },
];

export const COLORS = [
  "#000000", "#FFFFFF", "#333333", "#666666",
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#10B981", "#06B6D4", "#3B82F6", "#6366F1",
  "#8B5CF6", "#D946EF", "#F43F5E",
];

// --- BOOK FORMATS ---

export const BOOK_FORMATS = [
  { id: "small" as const, name: "Small Square", price: 29.99, size: "20x20cm" },
  { id: "medium" as const, name: "Medium Landscape", price: 39.99, size: "30x21cm" },
  { id: "large" as const, name: "Large Portrait", price: 49.99, size: "21x30cm" },
];
