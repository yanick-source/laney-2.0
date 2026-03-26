// --- Workflow State (ported from Relivr's PageState + BackgroundState) ---

export interface WorkflowImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
  size?: number;
  // Populated during preprocessing (Call 1 — Vision)
  description?: string;
  quality?: number;
  text?: string; // Full text representation for similarity
  // Enriched fields from enhanced vision analysis (used for local reordering)
  semantic_tags?: string[];  // e.g. ["beach", "sunset", "family"]
  suggested_order?: number; // 1-N narrative position suggested by vision model
  time_context?: string;    // e.g. "morning", "vacation", "celebration"
  mood?: string;            // e.g. "joyful", "serene", "dramatic"
}

export interface WorkflowPage {
  page_caption: string;
  images: string[]; // image IDs
  layout_id?: string;
}

export interface PageState {
  // Input
  theme: string; // Preserved for future use — currently unused
  page_size: string;
  layout_width: number;
  layout_height: number;
  images: WorkflowImage[];

  // Populated during processing
  preprocessed_images?: WorkflowImage[];
  photo_book_title?: string;
  closing_title?: string;
  pages?: WorkflowPage[];

  // Background
  bg_image?: string;
  bg_color?: string;
  is_color_generation?: boolean;
  bg_title?: string;
}

// --- Processing Pipeline Steps ---

export type PipelineStep =
  | "preprocess"
  | "title"
  | "reorder"
  | "organize"
  | "captions"
  | "even_pages"
  | "layout_match"
  | "background"
  | "closing"
  | "assemble";

export interface PipelineProgress {
  step: PipelineStep;
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// --- Processing Result ---

export interface ProcessingResult {
  bookId: string;
  title: string;
  closingTitle: string;
  pages: WorkflowPage[];
  background: {
    type: "solid" | "gradient" | "image";
    value: string;
    secondaryValue?: string;
  };
  costSummary: {
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
  };
}

// --- Layout matching ---

export interface LayoutCandidate {
  id: string;
  slots: Array<{ width: number; height: number; x: number; y: number }>;
}

// --- Batch processing config ---

export const BATCH_CONFIG = {
  PREPROCESS_BATCH_SIZE: 8,
  ORGANIZE_BATCH_SIZE: 6,
  MAX_RETRIES: 3,
  MAX_IMAGES_PER_PAGE: 3,
} as const;
