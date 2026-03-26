import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onNudge?: (direction: "up" | "down" | "left" | "right") => void;
  onSelectAll?: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  handlers: KeyboardShortcutHandlers;
}

export function useKeyboardShortcuts({ enabled = true, handlers }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handlers.onDelete?.();
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }

      // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
      if ((modifier && e.shiftKey && e.key === "z") || (modifier && e.key === "y")) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }

      // Copy (Ctrl/Cmd + C)
      if (modifier && e.key === "c") {
        e.preventDefault();
        handlers.onCopy?.();
        return;
      }

      // Paste (Ctrl/Cmd + V)
      if (modifier && e.key === "v") {
        e.preventDefault();
        handlers.onPaste?.();
        return;
      }

      // Select All (Ctrl/Cmd + A)
      if (modifier && e.key === "a") {
        e.preventDefault();
        handlers.onSelectAll?.();
        return;
      }

      // Arrow keys for nudging (1px at a time)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const directionMap: Record<string, "up" | "down" | "left" | "right"> = {
          ArrowUp: "up",
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
        };
        handlers.onNudge?.(directionMap[e.key]);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handlers]);
}
