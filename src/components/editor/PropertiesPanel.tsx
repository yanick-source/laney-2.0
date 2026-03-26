import { useEditorStore } from "@/stores/editorStore";
import type { PageElement, PhotoElement, TextElement } from "@/types/editor";
import { Slider } from "@/components/ui/slider";
import { Lock, Unlock, Trash2 } from "lucide-react";

export default function PropertiesPanel() {
  const { pages, currentPageIndex, selectedElementIds, updateElement, deleteElement } = useEditorStore();
  const currentPage = pages[currentPageIndex];

  if (!currentPage || selectedElementIds.length === 0) {
    return (
      <div className="w-64 border-l border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground text-center">
          Selecteer een element om eigenschappen te bewerken
        </p>
      </div>
    );
  }

  const selectedElements = currentPage.elements.filter((el) =>
    selectedElementIds.includes(el.id)
  );

  if (selectedElements.length === 0) return null;

  const isSingleSelection = selectedElements.length === 1;
  const element = selectedElements[0];

  const handleOpacityChange = (value: number[]) => {
    selectedElements.forEach((el) => {
      updateElement(el.id, { opacity: value[0] });
    });
  };

  const handleDelete = () => {
    selectedElements.forEach((el) => {
      deleteElement(el.id);
    });
  };

  return (
    <div className="w-64 border-l border-border/60 bg-card p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {isSingleSelection
              ? element.type === "photo"
                ? "Foto eigenschappen"
                : "Tekst eigenschappen"
              : `${selectedElements.length} elementen geselecteerd`}
          </h3>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
            title="Verwijderen"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Transparantie</label>
            <span className="text-xs text-muted-foreground">
              {Math.round((isSingleSelection ? element.opacity : 1) * 100)}%
            </span>
          </div>
          <Slider
            value={[isSingleSelection ? element.opacity : 1]}
            onValueChange={handleOpacityChange}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Position & Size (single selection only) */}
        {isSingleSelection && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Positie</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">X</label>
                  <input
                    type="number"
                    value={Math.round(element.x)}
                    onChange={(e) =>
                      updateElement(element.id, { x: parseFloat(e.target.value) })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Y</label>
                  <input
                    type="number"
                    value={Math.round(element.y)}
                    onChange={(e) =>
                      updateElement(element.id, { y: parseFloat(e.target.value) })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Grootte</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Breedte</label>
                  <input
                    type="number"
                    value={Math.round(element.width)}
                    onChange={(e) =>
                      updateElement(element.id, { width: parseFloat(e.target.value) })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Hoogte</label>
                  <input
                    type="number"
                    value={Math.round(element.height)}
                    onChange={(e) =>
                      updateElement(element.id, { height: parseFloat(e.target.value) })
                    }
                    className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Rotatie</label>
              <input
                type="number"
                value={Math.round(element.rotation)}
                onChange={(e) =>
                  updateElement(element.id, { rotation: parseFloat(e.target.value) })
                }
                className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
              />
            </div>
          </>
        )}

        {/* Photo-specific properties */}
        {isSingleSelection && element.type === "photo" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Filters</label>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Helderheid</label>
                  <span className="text-xs text-muted-foreground">
                    {(element as PhotoElement).filter?.brightness ?? 100}%
                  </span>
                </div>
                <Slider
                  value={[(element as PhotoElement).filter?.brightness ?? 100]}
                  onValueChange={(value: number[]) =>
                    updateElement(element.id, {
                      filter: {
                        ...(element as PhotoElement).filter,
                        brightness: value[0],
                        contrast: (element as PhotoElement).filter?.contrast ?? 100,
                        saturation: (element as PhotoElement).filter?.saturation ?? 100,
                      },
                    })
                  }
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Contrast</label>
                  <span className="text-xs text-muted-foreground">
                    {(element as PhotoElement).filter?.contrast ?? 100}%
                  </span>
                </div>
                <Slider
                  value={[(element as PhotoElement).filter?.contrast ?? 100]}
                  onValueChange={(value: number[]) =>
                    updateElement(element.id, {
                      filter: {
                        brightness: (element as PhotoElement).filter?.brightness ?? 100,
                        contrast: value[0],
                        saturation: (element as PhotoElement).filter?.saturation ?? 100,
                      },
                    })
                  }
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Verzadiging</label>
                  <span className="text-xs text-muted-foreground">
                    {(element as PhotoElement).filter?.saturation ?? 100}%
                  </span>
                </div>
                <Slider
                  value={[(element as PhotoElement).filter?.saturation ?? 100]}
                  onValueChange={(value: number[]) =>
                    updateElement(element.id, {
                      filter: {
                        brightness: (element as PhotoElement).filter?.brightness ?? 100,
                        contrast: (element as PhotoElement).filter?.contrast ?? 100,
                        saturation: value[0],
                      },
                    })
                  }
                  min={0}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Text-specific properties */}
        {isSingleSelection && element.type === "text" && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Lettergrootte</label>
              <input
                type="number"
                value={(element as TextElement).fontSize}
                onChange={(e) =>
                  updateElement(element.id, { fontSize: parseFloat(e.target.value) })
                }
                className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Kleur</label>
              <input
                type="color"
                value={(element as TextElement).color}
                onChange={(e) => updateElement(element.id, { color: e.target.value })}
                className="w-full h-8 rounded border border-border/60 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Uitlijning</label>
              <div className="flex gap-2">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => updateElement(element.id, { textAlign: align })}
                    className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                      (element as TextElement).textAlign === align
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted"
                    }`}
                  >
                    {align === "left" ? "Links" : align === "center" ? "Midden" : "Rechts"}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
