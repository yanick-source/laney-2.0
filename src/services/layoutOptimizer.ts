/**
 * Layout Optimizer Service
 * Ported from Relivr's image_organizer.py — ImageOrganizer class
 * 
 * Finds the best layout for each page based on image aspect ratios.
 * Uses the same deviation-minimization algorithm as Relivr.
 */

import type { WorkflowImage, WorkflowPage, LayoutCandidate } from "@/types/workflow";
import { LAYOUT_PRESETS, type LayoutSlot } from "@/types/editor";

// --- Aspect ratio calculation (same as Relivr) ---

function aspectRatio(width: number, height: number): number {
  return height ? width / height : 0;
}

// --- Convert our layout presets to layout candidates ---

function getLayoutCandidates(slotCount: number): LayoutCandidate[] {
  return LAYOUT_PRESETS.filter((layout) => layout.slots.length === slotCount).map(
    (layout) => ({
      id: layout.id,
      slots: layout.slots.map((slot) => ({
        x: slot.x,
        y: slot.y,
        // Convert percentage-based to pixel-equivalent ratios
        width: slot.width,
        height: slot.height,
      })),
    })
  );
}

// --- Find best layout for a set of images (same algorithm as Relivr) ---

export function findBestLayout(
  imageSizes: Array<{ width: number; height: number }>,
  _pageSize: string = "A4",
  _primaryFront: boolean = false,
  _primaryBack: boolean = false
): string | null {
  const slotCount = imageSizes.length;
  const layouts = getLayoutCandidates(slotCount);

  if (layouts.length === 0) {
    // Fallback: find layouts with more slots and use first N
    const fallbackLayouts = LAYOUT_PRESETS.filter(
      (l) => l.slots.length >= slotCount
    );
    if (fallbackLayouts.length > 0) {
      return fallbackLayouts[0].id;
    }
    return "full";
  }

  // Calculate aspect ratios of the images
  const imageAspectRatios = imageSizes.map((s) => aspectRatio(s.width, s.height));

  let bestLayoutId: string | null = null;
  let minDeviation = Infinity;

  for (const layout of layouts) {
    // Calculate aspect ratios of the layout slots
    const layoutAspectRatios = layout.slots.map((slot) =>
      aspectRatio(slot.width, slot.height)
    );

    // Calculate the total deviation between image and layout aspect ratios
    // Same logic as Relivr: different handling for landscape vs portrait
    let deviation = 0;
    for (let i = 0; i < imageAspectRatios.length; i++) {
      if (i < layoutAspectRatios.length) {
        if (imageAspectRatios[i] >= 1) {
          deviation += imageAspectRatios[i] - layoutAspectRatios[i];
        } else {
          deviation += Math.abs(imageAspectRatios[i] - layoutAspectRatios[i]);
        }
      }
    }

    // Normalize the deviation by dividing by the number of images
    deviation /= imageSizes.length;

    // Update the best layout if this layout has a smaller deviation
    if (deviation < minDeviation) {
      minDeviation = deviation;
      bestLayoutId = layout.id;

      // Break early if a perfect match is found
      if (deviation === 0) break;
    }
  }

  return bestLayoutId;
}

// --- Assign layouts to all pages ---

export function assignLayoutsToPages(
  pages: WorkflowPage[],
  images: WorkflowImage[],
  pageSize: string = "A4"
): WorkflowPage[] {
  const imageMap = new Map(images.map((img) => [img.id, img]));
  const totalPages = pages.length;

  return pages.map((page, index) => {
    // Extract image sizes for the current page
    const imageSizes = page.images
      .map((id) => {
        const img = imageMap.get(id);
        return img ? { width: img.width, height: img.height } : null;
      })
      .filter((s): s is { width: number; height: number } => s !== null);

    // Determine if current page is first or last (same as Relivr)
    const primaryFront = index === 0;
    const primaryBack = index === totalPages - 1;

    // Find the best layout for the current page
    const layoutId = findBestLayout(
      imageSizes,
      pageSize,
      primaryFront,
      primaryBack
    );

    return {
      ...page,
      layout_id: layoutId || "full",
    };
  });
}
