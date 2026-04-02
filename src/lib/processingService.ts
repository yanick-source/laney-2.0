/**
 * Processing Service — Main Pipeline Orchestrator
 * 
 * Implements the full Relivr workflow using Gemini:
 * 1. Preprocess — Analyze images (descriptions + quality scores)
 * 2. Title — Generate photo book title
 * 3. Reorder — Semantic similarity reordering
 * 4. Organize — Group images into pages with captions
 * 5. Even Pages — Ensure even page count
 * 6. Layout Match — Find best layout per page (aspect ratio)
 * 7. Background — AI background generation (color/image)
 * 8. Closing — Generate closing title
 * 9. Assemble — Build final PhotobookPage[] for the editor
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getSessionPhotos } from "@/lib/uploadService";
import { generateId } from "@/lib/utils";
import { costTracker } from "@/integrations/gemini/cost-tracker";
import { preprocessImages } from "@/services/imageAnalysis";
import { reorderImages } from "@/services/semanticSimilarity";
import { assignLayoutsToPages } from "@/services/layoutOptimizer";
import {
  generateAllContent,
  makeEvenPages,
} from "@/services/contentGenerator";
import {
  generateBackground,
  selectBackground,
} from "@/services/backgroundGenerator";
import type { PhotobookPage, PageBackground } from "@/types/editor";
import { LAYOUT_PRESETS } from "@/types/editor";
import type { WorkflowImage, WorkflowPage } from "@/types/workflow";

export type ProgressCallback = (
  step: string,
  progress: number,
  message: string
) => void;

export interface ProcessingResult {
  bookId: string;
  title: string;
  closingTitle: string;
  pages: PhotobookPage[];
  background: PageBackground;
  costSummary: { totalRequests: number; totalCost: number; totalTokens: number };
}

// In-memory store for demo mode
export const demoBooks: Map<
  string,
  {
    title: string;
    closingTitle: string;
    pages: PhotobookPage[];
    sessionId: string;
    background: PageBackground;
  }
> = new Map();

// Theme parameter — preserved for future use (dead code)
const THEME = ""; // TODO: Future — allow user theme selection

export async function processSession(
  sessionId: string,
  onProgress?: ProgressCallback
): Promise<ProcessingResult> {
  costTracker.reset();

  // --- Step 1: Fetch uploaded photos ---
  onProgress?.("analyze", 5, "Loading your photos...");
  const rawPhotos = await getSessionPhotos(sessionId);

  if (rawPhotos.length === 0) {
    throw new Error("No photos found for this session");
  }

  const images: WorkflowImage[] = rawPhotos.map((p) => ({
    id: p.id,
    url: p.url,
    name: p.name,
    width: p.width,
    height: p.height,
  }));

  onProgress?.("analyze", 10, `Found ${images.length} photos`);

  // --- Step 2: Preprocess — AI image analysis ---
  onProgress?.("analyze", 20, "Analyzing your memories...");
  let preprocessed: WorkflowImage[];
  try {
    preprocessed = await preprocessImages(images);
    onProgress?.("analyze", 50, "Photos analyzed successfully");
  } catch (err) {
    console.warn("Preprocessing failed, using defaults:", err);
    preprocessed = images.map((img) => ({
      ...img,
      description: `Photo: ${img.name}`,
      quality: 70,
      text: `ID: ${img.id}, Text: ${img.name}, Size: ${img.width}x${img.height}`,
    }));
    onProgress?.("analyze", 50, "Using default analysis");
  }

  // --- Step 3: Semantic reordering ---
  onProgress?.("analyze", 60, "Organizing photo sequence...");
  let reordered: WorkflowImage[];
  try {
    reordered = await reorderImages(preprocessed);
  } catch {
    reordered = preprocessed;
  }
  onProgress?.("analyze", 70, "Photo sequence organized");

  // --- Step 4: Generate title, pages, and closing title in one call ---
  onProgress?.("layout", 10, "Creating your book content...");
  let title: string;
  let workflowPages: WorkflowPage[];
  let closingTitle: string;
  try {
    const contentResult = await generateAllContent(reordered, 3508, 2480, THEME);
    title = contentResult.title;
    workflowPages = contentResult.pages;
    closingTitle = contentResult.closingTitle;
  } catch (err) {
    console.warn("Content generation failed, using fallback:", err);
    title = "Beautiful Memories";
    workflowPages = simpleGrouping(reordered);
    closingTitle = "Until We Meet Again: A Journey of Beautiful Memories";
  }
  onProgress?.("layout", 30, `Title: "${title}"`);
  onProgress?.("layout", 40, `Created ${workflowPages.length} pages`);

  // --- Step 6: Even page enforcement ---
  onProgress?.("layout", 50, "Optimizing page count...");
  try {
    workflowPages = await makeEvenPages(workflowPages);
  } catch {
    // Keep as-is if even page logic fails
  }
  onProgress?.("layout", 60, `${workflowPages.length} pages (optimized)`);

  // --- Step 7: Layout matching (aspect ratio optimization) ---
  onProgress?.("layout", 70, "Matching optimal layouts...");
  workflowPages = assignLayoutsToPages(workflowPages, reordered);
  onProgress?.("layout", 100, "Layouts assigned");

  // --- Step 8: Background generation ---
  onProgress?.("generate", 10, "Generating background...");
  let background: PageBackground;
  try {
    const photoDescriptions = preprocessed
      .slice(0, 5)
      .map((img) => img.description || img.name)
      .join(". ");
    const bgResults = await generateBackground(photoDescriptions, THEME);
    background = selectBackground(bgResults);
  } catch {
    background = { type: "solid", value: "#F5F0EB" };
  }
  onProgress?.("generate", 40, "Background ready");

  // --- Step 9: Closing title already generated in Step 4 ---
  onProgress?.("generate", 50, "Closing title ready");

  // --- Step 10: Assemble final PhotobookPage[] ---
  onProgress?.("generate", 70, "Assembling your book...");
  const imageMap = new Map(reordered.map((img) => [img.id, img]));
  const finalPages = assemblePages(workflowPages, imageMap, background);

  // --- Step 11: Save to Supabase or demo store ---
  onProgress?.("generate", 90, "Saving your book...");
  const bookId = generateId();
  const costSummary = costTracker.getSummary();

  if (isSupabaseConfigured) {
    try {
      const { data: book, error: bookError } = await supabase
        .from("photobooks")
        .insert({
          session_id: sessionId,
          title,
          status: "draft",
          book_format: { size: "medium", orientation: "horizontal" },
          pages: finalPages as unknown as Record<string, unknown>[],
          analysis: {
            closingTitle,
            background,
            costSummary,
            photoCount: images.length,
            pageCount: finalPages.length,
          } as unknown as Record<string, unknown>,
        })
        .select()
        .single();

      if (!bookError && book) {
        onProgress?.("generate", 100, "Your book is ready!");
        return {
          bookId: book.id,
          title,
          closingTitle,
          pages: finalPages,
          background,
          costSummary,
        };
      }
    } catch {
      // Fall through to demo mode
    }
  }

  // Demo mode: store in memory
  demoBooks.set(bookId, {
    title,
    closingTitle,
    pages: finalPages,
    sessionId,
    background,
  });
  onProgress?.("generate", 100, "Your book is ready!");

  return { bookId, title, closingTitle, pages: finalPages, background, costSummary };
}

// --- Assemble WorkflowPages into PhotobookPages for the editor ---

function assemblePages(
  workflowPages: WorkflowPage[],
  imageMap: Map<string, WorkflowImage>,
  background: PageBackground
): PhotobookPage[] {
  return workflowPages.map((wp) => {
    const layoutId = wp.layout_id || "full";
    const layout = LAYOUT_PRESETS.find((l) => l.id === layoutId) || LAYOUT_PRESETS[0];

    // Create photo elements positioned in layout slots
    const photoElements = wp.images.map((imgId, slotIdx) => {
      const img = imageMap.get(imgId);
      const slot = layout.slots[slotIdx] || layout.slots[0];

      return {
        id: generateId(),
        type: "photo" as const,
        src: img?.url || "",
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        rotation: 0,
        zIndex: slotIdx + 1,
        opacity: 1,
        cropX: 50,
        cropY: 50,
        cropZoom: 1,
      };
    });

    // Add caption as text element if present
    const elements = [...photoElements];
    if (wp.page_caption) {
      elements.push({
        id: generateId(),
        type: "text" as const,
        content: wp.page_caption,
        fontFamily: "Playfair Display, serif",
        fontSize: 14,
        fontWeight: "400",
        color: "#333333",
        textAlign: "center" as const,
        lineHeight: 1.5,
        x: 10,
        y: 88,
        width: 80,
        height: 8,
        rotation: 0,
        zIndex: 100,
        opacity: 0.85,
      } as unknown as typeof photoElements[0]);
    }

    return {
      id: generateId(),
      elements,
      background,
      layoutId,
    } as PhotobookPage;
  });
}

// --- Fallback simple grouping ---

function simpleGrouping(images: WorkflowImage[]): WorkflowPage[] {
  const pages: WorkflowPage[] = [];
  let i = 0;
  const pattern = [1, 2, 3, 2, 1, 3];

  while (i < images.length) {
    const count = Math.min(pattern[pages.length % pattern.length], images.length - i);
    pages.push({
      page_caption: `Page ${pages.length + 1}`,
      images: images.slice(i, i + count).map((img) => img.id),
    });
    i += count;
  }

  return pages;
}
