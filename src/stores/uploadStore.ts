import { create } from "zustand";
import type { PhotoFile } from "@/types/upload";

interface UploadStore {
  sessionId: string | null;
  photos: PhotoFile[];
  isUploading: boolean;
  totalProgress: number;

  setSessionId: (id: string) => void;
  addPhotos: (photos: PhotoFile[]) => void;
  updatePhoto: (id: string, changes: Partial<PhotoFile>) => void;
  removePhoto: (id: string) => void;
  setUploading: (uploading: boolean) => void;
  setTotalProgress: (progress: number) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  sessionId: null,
  photos: [],
  isUploading: false,
  totalProgress: 0,

  setSessionId: (id) => set({ sessionId: id }),

  addPhotos: (newPhotos) =>
    set({ photos: [...get().photos, ...newPhotos] }),

  updatePhoto: (id, changes) =>
    set({
      photos: get().photos.map((p) =>
        p.id === id ? { ...p, ...changes } : p
      ),
    }),

  removePhoto: (id) => {
    const photo = get().photos.find((p) => p.id === id);
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    set({ photos: get().photos.filter((p) => p.id !== id) });
  },

  setUploading: (uploading) => set({ isUploading: uploading }),
  setTotalProgress: (progress) => set({ totalProgress: progress }),

  reset: () => {
    get().photos.forEach((p) => {
      if (p.preview) URL.revokeObjectURL(p.preview);
    });
    set({
      sessionId: null,
      photos: [],
      isUploading: false,
      totalProgress: 0,
    });
  },
}));
