// --- Gemini API Types ---

export interface GeminiConfig {
  apiKey: string;
  model: string;
  visionModel: string;
  imageModel: string;
}

export interface GeminiTextRequest {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface GeminiVisionRequest {
  prompt: string;
  systemInstruction?: string;
  images: Array<{ base64: string; mimeType: string }>;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface GeminiImageRequest {
  prompt: string;
  size?: "1024x1024" | "1536x1536" | "512x512";
  numberOfImages?: number;
}

export interface GeminiResponse<T = unknown> {
  data: T;
  usage: GeminiUsage;
}

export interface GeminiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// --- Workflow Types (ported from Relivr Pydantic models) ---

export interface ImageDescription {
  id: string;
  image_text: string;
  image_quality: number;
}

export interface PreprocessOutput {
  images: ImageDescription[];
}

export interface FirstPageOutput {
  photo_book_title: string;
}

export interface PageOutput {
  page_caption: string;
  images: string[]; // image IDs
}

export interface PhotoBookProcessOutput {
  pages: PageOutput[];
}

export interface LastPageOutput {
  closing_title: string;
}

export interface BackgroundDetails {
  is_color_generation: boolean;
  title: string;
}

export interface BackgroundColor {
  bg_color: string;
}

export interface BackgroundState {
  theme: string;
  title: string;
  user_input: string;
  bg_image: string;
  bg_color: string;
  is_color_generation: boolean;
}

// --- Cost Tracking ---

export interface CostEntry {
  operation: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: number;
}
