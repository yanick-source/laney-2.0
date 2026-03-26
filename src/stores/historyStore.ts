import { create } from "zustand";
import type { PhotobookPage } from "@/types/editor";

interface HistoryState {
  past: PhotobookPage[][];
  present: PhotobookPage[];
  future: PhotobookPage[][];
}

interface HistoryStore extends HistoryState {
  pushState: (pages: PhotobookPage[]) => void;
  undo: () => PhotobookPage[] | null;
  redo: () => PhotobookPage[] | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

const initialState: HistoryState = {
  past: [],
  present: [],
  future: [],
};

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  ...initialState,

  pushState: (pages) => {
    const { past, present } = get();
    
    // Don't push if pages are identical to present
    if (JSON.stringify(pages) === JSON.stringify(present)) {
      return;
    }

    const newPast = [...past, present].slice(-MAX_HISTORY);
    set({
      past: newPast,
      present: pages,
      future: [], // Clear future on new action
    });
  },

  undo: () => {
    const { past, present, future } = get();
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      present: previous,
      future: [present, ...future],
    });

    return previous;
  },

  redo: () => {
    const { past, present, future } = get();
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, present],
      present: next,
      future: newFuture,
    });

    return next;
  },

  clear: () => set(initialState),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
