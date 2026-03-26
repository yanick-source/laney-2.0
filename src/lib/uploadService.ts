import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { PhotoFile } from "@/types/upload";
import { generateId } from "@/lib/utils";
import imageCompression from "browser-image-compression";

const STORAGE_BUCKET = "photos";

export async function createSession(): Promise<string> {
  const sessionId = generateId();

  if (!isSupabaseConfigured) {
    return sessionId;
  }

  const { error } = await supabase.from("upload_sessions").insert({
    id: sessionId,
    status: "uploading",
    photo_count: 0,
  });

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return sessionId;
}

export async function compressImage(file: File): Promise<File> {
  if (file.size <= 2 * 1024 * 1024) return file;

  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 3000,
    useWebWorker: true,
    preserveExif: true,
  });
}

export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      // Fallback dimensions for unsupported formats (e.g. HEIC)
      resolve({ width: 1920, height: 1080 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// In-memory store for demo mode
const demoPhotos: Map<string, Array<{ id: string; url: string; name: string; width: number; height: number }>> = new Map();

export async function uploadPhoto(
  sessionId: string,
  photo: PhotoFile,
  onProgress?: (progress: number) => void
): Promise<{ storagePath: string; url: string }> {
  const ext = photo.name.split(".").pop() || "jpg";
  const storagePath = `${sessionId}/${photo.id}.${ext}`;

  if (!isSupabaseConfigured) {
    // Demo mode: store in browser memory only
    onProgress?.(30);
    const dimensions = await getImageDimensions(photo.file);
    onProgress?.(70);

    // Create a persistent blob URL from the raw file
    const url = URL.createObjectURL(photo.file);

    // Store in memory for later retrieval
    const existing = demoPhotos.get(sessionId) || [];
    existing.push({ id: photo.id, url, name: photo.name, width: dimensions.width, height: dimensions.height });
    demoPhotos.set(sessionId, existing);

    onProgress?.(100);
    return { storagePath, url };
  }

  const compressed = await compressImage(photo.file);

  onProgress?.(30);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, compressed, {
      contentType: photo.file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  onProgress?.(70);

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  const dimensions = await getImageDimensions(photo.file);

  const { error: dbError } = await supabase.from("photos").insert({
    id: photo.id,
    session_id: sessionId,
    name: photo.name,
    storage_path: storagePath,
    url: publicUrl,
    size: photo.size,
    width: dimensions.width,
    height: dimensions.height,
  });

  if (dbError) throw new Error(`Failed to save photo record: ${dbError.message}`);

  onProgress?.(100);

  return { storagePath, url: publicUrl };
}

export async function uploadAllPhotos(
  sessionId: string,
  photos: PhotoFile[],
  onPhotoProgress: (photoId: string, progress: number) => void,
  onPhotoComplete: (
    photoId: string,
    result: { storagePath: string; url: string }
  ) => void,
  onPhotoError: (photoId: string, error: string) => void
): Promise<void> {
  const CONCURRENT = 3;
  let index = 0;

  async function processNext(): Promise<void> {
    if (index >= photos.length) return;
    const photo = photos[index++];

    try {
      const result = await uploadPhoto(sessionId, photo, (progress) => {
        onPhotoProgress(photo.id, progress);
      });
      onPhotoComplete(photo.id, result);
    } catch (error) {
      onPhotoError(
        photo.id,
        error instanceof Error ? error.message : "Upload failed"
      );
    }

    await processNext();
  }

  const workers = Array.from({ length: Math.min(CONCURRENT, photos.length) }, () =>
    processNext()
  );
  await Promise.all(workers);

  if (isSupabaseConfigured) {
    await supabase
      .from("upload_sessions")
      .update({ photo_count: photos.length, status: "processing" })
      .eq("id", sessionId);
  }
}

export async function getSessionPhotos(
  sessionId: string
): Promise<Array<{ id: string; url: string; name: string; width: number; height: number }>> {
  if (!isSupabaseConfigured) {
    return demoPhotos.get(sessionId) || [];
  }

  const { data, error } = await supabase
    .from("photos")
    .select("id, url, name, width, height")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch photos: ${error.message}`);
  return (data || []).map((p: Record<string, any>) => ({
    id: p.id,
    url: p.url,
    name: p.name,
    width: p.width ?? 0,
    height: p.height ?? 0,
  }));
}
