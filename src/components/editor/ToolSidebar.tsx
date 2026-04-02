import { useState } from "react";
import {
  MousePointer2,
  Image,
  Type,
  LayoutGrid,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageBackground } from "@/types/editor";
import { COLORS } from "@/types/editor";
import { SNAP_LAYOUTS } from "@/lib/layouts";
import { TEMPLATES } from "@/lib/templates";

type ToolId = "select" | "photos" | "text" | "layouts" | "backgrounds" | "templates";

interface ToolDef {
  id: ToolId;
  icon: typeof MousePointer2;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: "select", icon: MousePointer2, label: "Selecteer" },
  { id: "photos", icon: Image, label: "Foto's" },
  { id: "text", icon: Type, label: "Tekst" },
  { id: "layouts", icon: LayoutGrid, label: "Layout" },
  { id: "templates", icon: Sparkles, label: "Templates" },
  { id: "backgrounds", icon: Palette, label: "Kleuren" },
];

interface ToolSidebarProps {
  photos: Array<{ id: string; url: string; name: string }>;
  onDropPhoto: (src: string) => void;
  onAddText: (variant: "heading" | "body") => void;
  onSetBackground: (bg: PageBackground) => void;
  onApplyLayout?: (layoutId: string) => void;
  onClearLayout?: () => void;
  onApplyTemplate?: (templateId: string) => void;
}

export default function ToolSidebar({
  photos,
  onDropPhoto,
  onAddText,
  onSetBackground,
  onApplyLayout,
  onClearLayout,
  onApplyTemplate,
}: ToolSidebarProps) {
  const [activeTool, setActiveTool] = useState<ToolId | null>("select");
  const [panelOpen, setPanelOpen] = useState(false);

  const handleToolClick = (toolId: ToolId) => {
    if (toolId === "select") {
      setActiveTool("select");
      setPanelOpen(false);
      return;
    }
    if (activeTool === toolId && panelOpen) {
      setPanelOpen(false);
    } else {
      setActiveTool(toolId);
      setPanelOpen(true);
    }
  };

  return (
    <div className="flex h-full shrink-0">
      {/* Icon Rail */}
      <div className="w-[60px] flex flex-col items-center py-3 gap-1 shrink-0 border-r border-border/60 bg-card">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              "w-12 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all",
              activeTool === tool.id
                ? "btn-gradient text-white"
                : "hover:bg-secondary text-muted-foreground"
            )}
            title={tool.label}
          >
            <tool.icon size={16} />
            <span className="text-[10px] leading-none">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Expandable Content Panel */}
      <div
        className={cn(
          "border-r border-border/60 bg-card overflow-hidden transition-all duration-200 ease-in-out",
          panelOpen ? "w-[220px]" : "w-0"
        )}
      >
        <div className="w-[220px] h-full overflow-y-auto p-3">
          {/* Photos Panel */}
          {activeTool === "photos" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Jouw foto's
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/photo-url", photo.url);
                    }}
                    onClick={() => onDropPhoto(photo.url)}
                    className="aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:ring-2 hover:ring-primary"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {photos.length === 0 && (
                <p className="text-sm text-center py-8 text-muted-foreground">
                  Geen foto's beschikbaar
                </p>
              )}
            </div>
          )}

          {/* Text Panel */}
          {activeTool === "text" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tekst toevoegen
              </p>
              <button
                onClick={() => onAddText("heading")}
                className="w-full p-4 border border-border/60 rounded-xl text-left transition-colors hover:border-primary/40"
              >
                <p className="font-semibold text-lg text-foreground">Heading</p>
                <p className="text-xs mt-1 text-muted-foreground">Grote titeltekst</p>
              </button>
              <button
                onClick={() => onAddText("body")}
                className="w-full p-4 border border-border/60 rounded-xl text-left transition-colors hover:border-primary/40"
              >
                <p className="text-sm text-foreground">Body text</p>
                <p className="text-xs mt-1 text-muted-foreground">Normale paragraaftekst</p>
              </button>
            </div>
          )}

          {/* Layouts Panel */}
          {activeTool === "layouts" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Snap-to-Grid Layouts
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SNAP_LAYOUTS.map((layout: typeof SNAP_LAYOUTS[0]) => (
                  <button
                    key={layout.id}
                    onClick={() => onApplyLayout?.(layout.id)}
                    className="aspect-square border border-border/60 rounded-xl p-2 transition-colors hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center"
                    title={layout.name}
                  >
                    <div className="w-full h-full relative rounded bg-muted">
                      {layout.slots.map((slot: typeof layout.slots[0], i: number) => (
                        <div
                          key={i}
                          className="absolute rounded-sm bg-muted-foreground/30"
                          style={{
                            left: `${slot.x}%`,
                            top: `${slot.y}%`,
                            width: `${slot.width}%`,
                            height: `${slot.height}%`,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  onClearLayout?.();
                }}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                ✕ Clear Layout (Free-form Mode)
              </button>
            </div>
          )}

          {/* Templates Panel */}
          {activeTool === "templates" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Templates
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Klik om een volledige look te laden inclusief kleuren, lettertype en decoraties.
              </p>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => onApplyTemplate?.(tpl.id)}
                    className="w-full text-left border border-border/60 rounded-xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm group"
                  >
                    {/* Color swatch preview */}
                    <div
                      className="h-10 w-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: tpl.theme.backgroundColor }}
                    >
                      <span>{tpl.emoji}</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tpl.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Backgrounds Panel */}
          {activeTool === "backgrounds" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Achtergrondkleur
              </p>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onSetBackground({ type: "solid", value: color })}
                    className="w-full aspect-square rounded-xl border-2 border-border/60 hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
