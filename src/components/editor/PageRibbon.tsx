import { Plus, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotobookPage } from "@/types/editor";

interface PageRibbonProps {
  pages: PhotobookPage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDeletePage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
}

export default function PageRibbon({
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
}: PageRibbonProps) {
  return (
    <div className="h-24 bg-white border-t border-gray-200 flex items-center px-4 gap-3 overflow-x-auto flex-shrink-0">
      {pages.map((page, index) => (
        <div key={page.id} className="relative group flex-shrink-0">
          <button
            onClick={() => onSelectPage(index)}
            className={cn(
              "w-16 h-12 rounded-md border-2 transition-all overflow-hidden",
              index === currentPageIndex
                ? "border-primary shadow-md"
                : "border-gray-200 hover:border-gray-300"
            )}
            style={{
              backgroundColor:
                page.background.type === "solid"
                  ? page.background.value
                  : "#fff",
            }}
          >
            {/* Mini preview of elements */}
            <div className="w-full h-full relative">
              {page.elements.slice(0, 3).map((el) => (
                <div
                  key={el.id}
                  className="absolute bg-gray-300/60 rounded-[1px]"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${Math.min(el.width, 50)}%`,
                    height: `${Math.min(el.height, 50)}%`,
                  }}
                />
              ))}
            </div>
          </button>

          {/* Page number */}
          <span className="block text-[10px] text-center text-muted-foreground mt-1">
            {index + 1}
          </span>

          {/* Hover actions */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-0.5 bg-white shadow-lg rounded-md border border-gray-200 p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicatePage(index);
              }}
              className="p-1 rounded hover:bg-gray-100"
              title="Duplicate page"
            >
              <Copy className="w-3 h-3" />
            </button>
            {pages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePage(index);
                }}
                className="p-1 rounded hover:bg-red-50 text-red-500"
                title="Delete page"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add page button */}
      <button
        onClick={onAddPage}
        className="w-16 h-12 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors flex-shrink-0"
        title="Add page"
      >
        <Plus className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
