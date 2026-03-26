/**
 * Content Generator Service
 * Ported from Relivr's prompt_template.py — Nodes 2, 3, 4
 * 
 * Call 2 of 2 (Text Model): generateAllContent() replaces three
 * separate API calls (title + organize + closing) with one unified call.
 * makeEvenPages uses local string logic — no API calls.
 */

import { generateText, isGeminiConfigured } from "@/integrations/gemini/client";
import type { WorkflowImage, WorkflowPage } from "@/types/workflow";
import { BATCH_CONFIG } from "@/types/workflow";

// --- Combined output type for Call 2 (Text Model) ---

interface AllContentOutput {
  photo_book_title: string;
  pages: Array<{ page_caption: string; images: string[] }>;
  closing_title: string;
}

// --- Call 2: Title + Page Organization + Closing in ONE text call ---

export async function generateAllContent(
  images: WorkflowImage[],
  layoutWidth: number = 3508,
  layoutHeight: number = 2480,
  theme: string = "",
  maxRetries: number = BATCH_CONFIG.MAX_RETRIES
): Promise<{ title: string; pages: WorkflowPage[]; closingTitle: string }> {
  if (!isGeminiConfigured) {
    return {
      title: "Beautiful Memories",
      pages: createDemoPages(images),
      closingTitle: "Until We Meet Again: A Journey of Beautiful Memories",
    };
  }

  // Build a rich context from vision analysis (semantic_tags, mood, time_context)
  const imageList = images.map((img) => {
    const tags = img.semantic_tags?.join(", ") ?? "";
    const mood = img.mood ? ` [${img.mood}]` : "";
    const context = img.time_context ? ` (${img.time_context})` : "";
    return `ID: ${img.id}${mood}${context}\n  Description: ${img.description || img.name}\n  Tags: ${tags}\n  Size: ${img.width}x${img.height}`;
  }).join("\n\n");

  const themeClause = theme ? `theme: ${theme}` : "the visual content and emotions";

  const systemInstruction = `You are a photo book creative director. Given pre-analyzed photo data, produce three things in one response:

1. **Book Title** (4-8 words): Capture the essence of the collection.

2. **Page Organization**: Group images into pages (1-3 images per page, size ${layoutWidth}x${layoutHeight}).
   - Consider portrait/landscape orientations for layout.
   - Each page gets a caption of 12-16 words reflecting ${themeClause}.
   - All image IDs must appear exactly once.

3. **Closing Title** (10-15 words): A reflective, concluding statement for the last page.

Output Requirements:
- All image IDs from the input must be included exactly once in pages.images.
- Do not duplicate or omit any ID.`;

  const response = await generateText<AllContentOutput>({
    prompt: `Create a photo book from these analyzed images:\n\n${imageList}`,
    systemInstruction,
    temperature: 0.85,
    maxOutputTokens: 8192,
    responseSchema: {
      type: "object",
      properties: {
        photo_book_title: {
          type: "string",
          description: "Engaging photo book title, 4-8 words.",
        },
        pages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page_caption: { type: "string", description: "Page caption, 12-16 words." },
              images: { type: "array", items: { type: "string" }, description: "Image IDs on this page." },
            },
            required: ["page_caption", "images"],
          },
        },
        closing_title: {
          type: "string",
          description: "Reflective closing title, 10-15 words.",
        },
      },
      required: ["photo_book_title", "pages", "closing_title"],
    },
  });

  const data = response.data;
  const pages: WorkflowPage[] = data.pages || [];

  // Verify all IDs present — retry if mismatch
  const originalIds = images.map((img) => img.id).sort();
  const returnedIds = pages.flatMap((p) => p.images).sort();
  if (JSON.stringify(originalIds) !== JSON.stringify(returnedIds) && maxRetries > 0) {
    console.warn(`generateAllContent: ID mismatch. Retrying... (${maxRetries} left)`);
    return generateAllContent(images, layoutWidth, layoutHeight, theme, maxRetries - 1);
  }

  return {
    title: data.photo_book_title || "Beautiful Memories",
    pages,
    closingTitle: data.closing_title || "Until We Meet Again: A Journey of Beautiful Memories",
  };
}

// --- Even page enforcement (local only — no API calls) ---
// Captions are derived by trimming/combining existing ones, preserving quality.

export async function makeEvenPages(
  pages: WorkflowPage[],
): Promise<WorkflowPage[]> {
  if (pages.length % 2 === 0) return pages;

  const lastPage = pages[pages.length - 1];
  const secondLastPage = pages.length > 1 ? pages[pages.length - 2] : null;

  // Case 1: Last page has only one image — merge with second-to-last
  if (lastPage.images.length === 1) {
    if (secondLastPage && secondLastPage.images.length === 1) {
      secondLastPage.images.push(...lastPage.images);
      // Combine captions locally: take first sentence of each
      const c1 = secondLastPage.page_caption.split(".")[0].trim();
      const c2 = lastPage.page_caption.split(".")[0].trim();
      secondLastPage.page_caption = `${c1}; ${c2}.`;
      pages.pop();
    } else if (secondLastPage && secondLastPage.images.length > 1) {
      // Split second-to-last page, derive caption from the original
      const newImage = secondLastPage.images.pop()!;
      const words = secondLastPage.page_caption.split(" ");
      const newCaption = words.slice(Math.floor(words.length / 2)).join(" ");
      secondLastPage.page_caption = words.slice(0, Math.floor(words.length / 2)).join(" ");
      pages.splice(pages.length - 1, 0, { page_caption: newCaption || lastPage.page_caption, images: [newImage] });
    }
  } else {
    // Case 2: Last page has multiple images — split off last image
    const newImage = lastPage.images.pop()!;
    const words = lastPage.page_caption.split(" ");
    const newCaption = words.slice(Math.floor(words.length / 2)).join(" ");
    lastPage.page_caption = words.slice(0, Math.floor(words.length / 2)).join(" ");
    pages.push({ page_caption: newCaption || "A final beautiful moment.", images: [newImage] });
  }

  return pages;
}


// --- Demo mode helper ---

function createDemoPages(images: WorkflowImage[]): WorkflowPage[] {
  const pages: WorkflowPage[] = [];
  let i = 0;

  while (i < images.length) {
    const remaining = images.length - i;
    let pageSize: number;

    if (remaining >= 4) {
      // Vary page sizes: 1, 2, or 3 images
      const options = [1, 2, 3];
      pageSize = options[pages.length % options.length];
    } else if (remaining === 3) {
      pageSize = 3;
    } else if (remaining === 2) {
      pageSize = 2;
    } else {
      pageSize = 1;
    }

    const pageImages = images.slice(i, i + pageSize);
    pages.push({
      page_caption: `A beautiful moment captured in time — page ${pages.length + 1}.`,
      images: pageImages.map((img) => img.id),
    });

    i += pageSize;
  }

  return pages;
}
