import { useState } from "react";
import { Image, Type, Palette, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageBackground } from "@/types/editor";
import { LAYOUT_PRESETS, COLORS } from "@/types/editor";

interface EditorSidebarProps {
  photos: Array<{ id: string; url: string; name: string }>;
  onDropPhoto: (src: string) => void;
  onAddText: (variant: "heading" | "body") => void;
  currentPageIndex: number;
  onSetBackground: (bg: PageBackground) => void;
}

type Tab = "photos" | "text" | "layouts" | "backgrounds";

const TABS: { id: Tab; icon: typeof Image; label: string }[] = [
  { id: "photos", icon: Image, label: "Photos" },
  { id: "text", icon: Type, label: "Text" },
  { id: "layouts", icon: LayoutGrid, label: "Layouts" },
  { id: "backgrounds", icon: Palette, label: "Colors" },
];

export default function EditorSidebar({
  photos,
  onDropPhoto,
  onAddText,
  currentPageIndex,
  onSetBackground,
}: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("photos");

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-shrink-0">
      {/* Tab Icons */}
      <div className="w-14 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              activeTab === tab.id
                ? "bg-white shadow-sm text-primary"
                : "text-gray-400 hover:text-gray-600"
            )}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "photos" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Your Photos
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
                  className="aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/50 transition-all"
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
              <p className="text-sm text-muted-foreground text-center py-8">
                No photos available
              </p>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Add Text
            </p>
            <button
              onClick={() => onAddText("heading")}
              className="w-full p-4 border border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
            >
              <p className="font-semibold text-lg">Heading</p>
              <p className="text-xs text-muted-foreground mt-1">
                Large title text
              </p>
            </button>
            <button
              onClick={() => onAddText("body")}
              className="w-full p-4 border border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
            >
              <p className="text-sm">Body text</p>
              <p className="text-xs text-muted-foreground mt-1">
                Regular paragraph text
              </p>
            </button>
          </div>
        )}

        {activeTab === "layouts" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Page Layouts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_PRESETS.map((layout) => (
                <button
                  key={layout.id}
                  className="aspect-square border border-gray-200 rounded-lg p-2 hover:border-gray-300 transition-colors flex items-center justify-center"
                  title={layout.name}
                >
                  <div className="w-full h-full relative bg-gray-50 rounded">
                    {layout.slots.map((slot, i) => (
                      <div
                        key={i}
                        className="absolute bg-gray-300 rounded-sm"
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
          </div>
        )}

        {activeTab === "backgrounds" && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Background Color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    onSetBackground({ type: "solid", value: color })
                  }
                  className="w-full aspect-square rounded-lg border border-gray-200 hover:scale-105 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
