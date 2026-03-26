export interface UploadSession {
  id: string;
  userId: string | null;
  status: "uploading" | "processing" | "ready" | "failed";
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  preview: string;
  status: "pending" | "uploading" | "uploaded" | "failed";
  progress: number;
  storagePath?: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
}

export const PROCESSING_STEPS: Omit<ProcessingStep, "status" | "progress" | "message">[] = [
  { id: "upload", name: "Uploading photos" },
  { id: "analyze", name: "Analyzing memories" },
  { id: "layout", name: "Creating layouts" },
  { id: "generate", name: "Generating book" },
];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_PHOTOS = 200;
export const MIN_PHOTOS = 5;
