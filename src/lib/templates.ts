// A TemplateDecorElement is a decorative overlay (text/ornament) injected
// at fixed percentage coordinates on the canvas.
export interface TemplateDecorElement {
  content: string;
  x: number;         // % from left
  y: number;         // % from top
  width: number;     // % of canvas width
  height: number;    // % of canvas height
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  zIndexOffset: number; // added on top of max photo z-index
}

export interface TemplateSpacing {
  gap: number;     // % gap between adjacent photos (like CSS gap)
  padding: number; // % inset from page edges
}

export interface TemplateTheme {
  backgroundColor: string;
  fontFamily: string;
  textColor: string;
  accentColor?: string;
  decorElements: TemplateDecorElement[];
  spacing: TemplateSpacing;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  baseLayoutId: string; // references a SNAP_LAYOUTS id
  theme: TemplateTheme;
}

export const TEMPLATES: TemplateDefinition[] = [
  // ── 1. The Minimalist ────────────────────────────────────────────────────
  {
    id: "minimalist",
    name: "The Minimalist",
    description: "Clean white, large margins, centered caption",
    emoji: "🤍",
    baseLayoutId: "layout-1",
    theme: {
      backgroundColor: "#FFFFFF",
      fontFamily: "Inter, sans-serif",
      textColor: "#111111",
      spacing: { gap: 1.5, padding: 4 }, // airy white-space
      decorElements: [
        {
          content: "Your Story",
          x: 10,
          y: 88,
          width: 80,
          height: 8,
          fontSize: 14,
          color: "#555555",
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
          zIndexOffset: 5,
        },
      ],
    },
  },

  // ── 2. Vintage Heritage ──────────────────────────────────────────────────
  {
    id: "vintage-heritage",
    name: "Vintage Heritage",
    description: "Warm cream, Playfair Display, corner ornaments",
    emoji: "🌿",
    baseLayoutId: "layout-2h",
    theme: {
      backgroundColor: "#F4EBD0",
      fontFamily: "Playfair Display, serif",
      textColor: "#3B2A1A",
      accentColor: "#8B6914",
      spacing: { gap: 2.0, padding: 5 }, // generous vintage margins
      decorElements: [
        { content: "❧", x: 0.5, y: 0.5,  width: 5, height: 5, fontSize: 22, color: "#8B6914", fontFamily: "serif", textAlign: "center", zIndexOffset: 10 },
        { content: "❧", x: 94.5, y: 0.5, width: 5, height: 5, fontSize: 22, color: "#8B6914", fontFamily: "serif", textAlign: "center", zIndexOffset: 10 },
        { content: "❧", x: 0.5, y: 94.5, width: 5, height: 5, fontSize: 22, color: "#8B6914", fontFamily: "serif", textAlign: "center", zIndexOffset: 10 },
        { content: "❧", x: 94.5, y: 94.5, width: 5, height: 5, fontSize: 22, color: "#8B6914", fontFamily: "serif", textAlign: "center", zIndexOffset: 10 },
      ],
    },
  },

  // ── 3. Modern Bold ───────────────────────────────────────────────────────
  {
    id: "modern-bold",
    name: "Modern Bold",
    description: "Black canvas, Montserrat, high-contrast overlay",
    emoji: "⚡",
    baseLayoutId: "layout-4-grid",
    theme: {
      backgroundColor: "#000000",
      fontFamily: "Montserrat, sans-serif",
      textColor: "#FFFFFF",
      accentColor: "#FF3B30",
      spacing: { gap: 1.0, padding: 2 }, // tight modern grid
      decorElements: [
        {
          content: "MOMENTS",
          x: 5,
          y: 90,
          width: 90,
          height: 8,
          fontSize: 20,
          color: "#FFFFFF",
          fontFamily: "Montserrat, sans-serif",
          textAlign: "center",
          zIndexOffset: 10,
        },
      ],
    },
  },
];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
