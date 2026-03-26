import {
  ArrowLeft,
  MousePointer2,
  Type,
  Hand,
  ZoomIn,
  ZoomOut,
  ShoppingCart,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorTool } from "@/types/editor";

interface EditorToolbarProps {
  title: string;
  activeTool: EditorTool;
  zoomLevel: number;
  isDirty: boolean;
  onToolChange: (tool: EditorTool) => void;
  onZoomChange: (zoom: number) => void;
  onAddText: () => void;
  onCheckout: () => void;
  onBack: () => void;
}

const TOOLS: { id: EditorTool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "text", icon: Type, label: "Text" },
  { id: "hand", icon: Hand, label: "Pan" },
];

export default function EditorToolbar({
  title,
  activeTool,
  zoomLevel,
  isDirty,
  onToolChange,
  onZoomChange,
  onAddText,
  onCheckout,
  onBack,
}: EditorToolbarProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left — Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate max-w-[200px]">
            {title}
          </span>
          {isDirty && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Save className="w-3 h-3" />
              Unsaved
            </span>
          )}
        </div>
      </div>

      {/* Center — Tools */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              onToolChange(tool.id);
              if (tool.id === "text") onAddText();
            }}
            className={cn(
              "p-2 rounded-md transition-colors",
              activeTool === tool.id
                ? "bg-white shadow-sm text-primary"
                : "text-gray-500 hover:text-gray-700"
            )}
            title={tool.label}
          >
            <tool.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Right — Zoom + Checkout */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onZoomChange(zoomLevel - 0.1)}
            className="p-1.5 rounded-md hover:bg-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(zoomLevel + 0.1)}
            className="p-1.5 rounded-md hover:bg-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onCheckout}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          Order
        </button>
      </div>
    </div>
  );
}
