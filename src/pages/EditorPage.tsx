import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Settings,
  Share2,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEditorStore } from "@/stores/editorStore";
import { useHistoryStore } from "@/stores/historyStore";
import { demoBooks } from "@/lib/processingService";
import EditorCanvas from "@/components/editor/EditorCanvas";
import ToolSidebar from "@/components/editor/ToolSidebar";
import ThumbnailSidebar from "@/components/editor/ThumbnailSidebar";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import type { PageBackground } from "@/types/editor";

export default function EditorPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bookTitle, setBookTitle] = useState("Mijn Fotoboek");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);

  const {
    pages,
    currentPageIndex,
    selectedElementId,
    selectedElementIds,
    zoomLevel,
    activeTool,
    setPages,
    setCurrentPage,
    selectElement,
    toggleElementSelection,
    setZoom,
    updateElement,
    deleteElement,
    addPhoto,
    addText,
    addPage,
    deletePage,
    duplicatePage,
    setPageBackground,
    copyElement,
    pasteElement,
    bringForward,
    sendBackward,
    applyLayout,
  } = useEditorStore();

  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  // Load book data
  useEffect(() => {
    if (!bookId) {
      setIsLoading(false);
      return;
    }

    const demoBook = demoBooks.get(bookId);
    if (demoBook) {
      setBookTitle(demoBook.title);
      setPages(demoBook.pages);
    }
    setIsLoading(false);
  }, [bookId, setPages]);

  // Sync zoom percent → store zoom level (store uses decimal 0.5–2.0)
  useEffect(() => {
    setZoom(zoomPercent / 100);
  }, [zoomPercent, setZoom]);

  // Collect unique photos across all pages for the tool sidebar
  const allPhotos = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; url: string; name: string }> = [];
    for (const page of pages) {
      for (const el of page.elements) {
        if (el.type === "photo") {
          const src = (el as any).src as string;
          if (src && !seen.has(src)) {
            seen.add(src);
            result.push({
              id: el.id,
              url: src,
              name: `Foto ${result.length + 1}`,
            });
          }
        }
      }
    }
    return result;
  }, [pages]);

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;

  // --- Zoom handlers ---
  const handleZoomIn = () => setZoomPercent(Math.min(200, zoomPercent + 10));
  const handleZoomOut = () => setZoomPercent(Math.max(50, zoomPercent - 10));

  // --- Page navigation ---
  const handlePrevPage = () => setCurrentPage(Math.max(0, currentPageIndex - 1));
  const handleNextPage = () => setCurrentPage(Math.min(totalPages - 1, currentPageIndex + 1));

  // --- Route handlers ---
  const handleClose = () => navigate("/upload");
  const handleCheckout = () => navigate(`/checkout/${bookId}`);

  // --- Keyboard shortcuts ---
  useKeyboardShortcuts({
    enabled: !isLoading && !!currentPage,
    handlers: {
      onDelete: () => {
        if (selectedElementId) {
          deleteElement(selectedElementId);
        }
      },
      onUndo: () => {
        const previousPages = undo();
        if (previousPages) {
          setPages(previousPages);
        }
      },
      onRedo: () => {
        const nextPages = redo();
        if (nextPages) {
          setPages(nextPages);
        }
      },
      onCopy: () => {
        if (selectedElementId) {
          copyElement(selectedElementId);
        }
      },
      onPaste: () => {
        pasteElement();
      },
      onNudge: (direction) => {
        if (!selectedElementId) return;
        const element = currentPage?.elements.find((el) => el.id === selectedElementId);
        if (!element) return;

        // Nudge by 0.125% (1px at 800px canvas width)
        const nudgeAmount = 0.125;
        const updates: { x?: number; y?: number } = {};

        switch (direction) {
          case "up":
            updates.y = element.y - nudgeAmount;
            break;
          case "down":
            updates.y = element.y + nudgeAmount;
            break;
          case "left":
            updates.x = element.x - nudgeAmount;
            break;
          case "right":
            updates.x = element.x + nudgeAmount;
            break;
        }

        updateElement(selectedElementId, updates);
      },
    },
  });

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Fotoboek laden...</p>
      </div>
    );
  }

  // --- Empty state ---
  if (!currentPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-16 h-16 rounded-2xl icon-gradient-bg flex items-center justify-center">
          <BookOpen size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Geen fotoboek gevonden</h2>
        <p className="text-sm text-muted-foreground">Upload eerst foto's om een fotoboek te maken</p>
        <button
          onClick={() => navigate("/upload")}
          className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold"
        >
          Naar upload
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="sticky top-0 z-30 h-16 bg-background/90 backdrop-blur-sm border-b border-border/60 flex items-center justify-between px-4 shrink-0 shadow-sm">
        {/* Left: Close + Title + Page Counter */}
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="icon-btn" title="Sluiten">
            <X size={18} />
          </button>
          <div>
            <input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-0.5 py-0 transition-colors block text-foreground"
            />
            <p className="text-xs mt-0.5 text-muted-foreground">
              Pagina {currentPageIndex + 1} van {totalPages}
            </p>
          </div>
        </div>

        {/* Right: Zoom + Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-xl border border-border/70">
            <button
              onClick={handleZoomOut}
              disabled={zoomPercent <= 50}
              className="icon-btn rounded-l-xl disabled:opacity-30"
              title="Uitzoomen"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-medium w-12 text-center select-none text-muted-foreground">
              {zoomPercent}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomPercent >= 200}
              className="icon-btn rounded-r-xl disabled:opacity-30"
              title="Inzoomen"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border/70" />

          {/* Undo / Redo */}
          <button
            onClick={() => {
              const previousPages = undo();
              if (previousPages) setPages(previousPages);
            }}
            disabled={!canUndo()}
            className="icon-btn disabled:opacity-30"
            title="Ongedaan maken (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => {
              const nextPages = redo();
              if (nextPages) setPages(nextPages);
            }}
            disabled={!canRedo()}
            className="icon-btn disabled:opacity-30"
            title="Opnieuw (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>

          {/* Layer Order Controls (shown when element selected) */}
          {selectedElementId && (
            <>
              <div className="w-px h-5 bg-border/70" />
              <button
                onClick={() => bringForward(selectedElementId)}
                className="icon-btn"
                title="Naar voren (Ctrl+])"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => sendBackward(selectedElementId)}
                className="icon-btn"
                title="Naar achteren (Ctrl+[)"
              >
                <ArrowDown size={16} />
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-border/70" />

          {/* Settings / Share */}
          <button className="icon-btn" title="Instellingen"><Settings size={16} /></button>
          <button className="icon-btn" title="Delen"><Share2 size={16} /></button>

          {/* Order Button */}
          <button
            onClick={handleCheckout}
            className="btn-gradient rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 ml-1"
          >
            <ShoppingCart size={15} />
            Bestellen
          </button>
        </div>
      </header>

      {/* ═══════════ MAIN AREA: Tool Sidebar | Canvas + Nav | Thumbnail Sidebar ═══════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Tool Sidebar */}
        <ToolSidebar
          photos={allPhotos}
          onDropPhoto={(src) => addPhoto(src, 10, 10)}
          onAddText={(variant) => addText(variant)}
          onSetBackground={(bg: PageBackground) => setPageBackground(currentPageIndex, bg)}
          onApplyLayout={(layoutId) => applyLayout(layoutId)}
        />

        {/* CENTER — Canvas + Page Navigation */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <EditorCanvas
            page={currentPage}
            zoomLevel={zoomLevel}
            selectedElementId={selectedElementId}
            selectedElementIds={selectedElementIds}
            activeTool={activeTool}
            onSelectElement={selectElement}
            onToggleElementSelection={toggleElementSelection}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onDropPhoto={(src, x, y) => addPhoto(src, x, y)}
          />

          {/* Page Navigation Pill */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-3 rounded-full px-4 py-2 bg-card border border-border/70 shadow-lg">
              <button
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0}
                className="icon-btn w-7 h-7 disabled:opacity-30"
                title="Vorige pagina"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium min-w-[80px] text-center select-none text-foreground">
                {currentPageIndex + 1} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPageIndex === totalPages - 1}
                className="icon-btn w-7 h-7 disabled:opacity-30"
                title="Volgende pagina"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Properties Panel */}
        <PropertiesPanel />

        {/* RIGHT — Thumbnail Sidebar */}
        <ThumbnailSidebar
          pages={pages}
          currentPageIndex={currentPageIndex}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectPage={setCurrentPage}
          onAddPage={addPage}
          onDeletePage={deletePage}
          onDuplicatePage={duplicatePage}
        />
      </div>
    </div>
  );
}
