import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotobookPage, PhotoElement } from "@/types/editor";

interface ThumbnailSidebarProps {
  pages: PhotobookPage[];
  currentPageIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
}

export default function ThumbnailSidebar({
  pages,
  currentPageIndex,
  isOpen,
  onToggle,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
}: ThumbnailSidebarProps) {
  return (
    <div
      className={cn(
        "border-l border-border/60 bg-card flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
        isOpen ? "w-[240px]" : "w-16"
      )}
    >
      {/* Toggle Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/60 shrink-0">
        {isOpen && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pagina's
          </span>
        )}
        <button
          onClick={onToggle}
          className="icon-btn ml-auto"
          title={isOpen ? "Inklappen" : "Uitklappen"}
        >
          {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((page, index) => {
          const isActive = index === currentPageIndex;
          const firstPhoto = page.elements.find((el) => el.type === "photo") as
            | PhotoElement
            | undefined;

          return (
            <div key={page.id} className="relative group">
              <button
                onClick={() => onSelectPage(index)}
                className={cn(
                  "w-full rounded-xl border-2 overflow-hidden transition-all",
                  isActive
                    ? "border-primary shadow-lg"
                    : "border-transparent hover:border-primary/30"
                )}
              >
                {isOpen ? (
                  /* Expanded thumbnail */
                  <div className="aspect-[4/3] w-full relative" style={{ backgroundColor: page.background.value }}>
                    {firstPhoto ? (
                      <img
                        src={firstPhoto.src}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layout size={24} className="text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Element count badge */}
                    {page.elements.length > 0 && (
                      <span
                        className="absolute top-1 right-1 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                        style={{
                          backgroundColor: "hsl(var(--primary))",
                          color: "white",
                        }}
                      >
                        {page.elements.length}
                      </span>
                    )}
                  </div>
                ) : (
                  /* Collapsed thumbnail */
                  <div
                    className="w-12 h-9 mx-auto relative"
                    style={{ backgroundColor: page.background.value }}
                  >
                    {firstPhoto ? (
                      <img
                        src={firstPhoto.src}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layout size={14} className="text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                )}
              </button>

              {/* Label */}
              {isOpen && (
                <p className={cn("text-xs text-center mt-1", isActive ? "text-primary" : "text-muted-foreground")}>
                  {index === 0 ? "Cover" : `Pagina ${index}`}
                </p>
              )}

              {/* Hover actions (expanded only) */}
              {isOpen && (
                <div className="absolute top-1 left-1 hidden group-hover:flex items-center gap-0.5 rounded-lg p-0.5 bg-card shadow-md">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(index);
                    }}
                    className="icon-btn w-6 h-6"
                    title="Dupliceren"
                  >
                    <Copy size={12} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(index);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-destructive"
                      title="Verwijderen"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add page button */}
        <button
          onClick={onAddPage}
          className={cn(
            "w-full border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center transition-colors hover:border-primary/40",
            isOpen ? "aspect-[4/3]" : "h-9"
          )}
          title="Pagina toevoegen"
        >
          <Plus size={isOpen ? 20 : 14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
