import { useState, useRef, useEffect } from "react";
import type { TextElement } from "@/types/editor";

interface TextEditModeProps {
  text: TextElement;
  style: React.CSSProperties;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export default function TextEditMode({ text, style, onSave, onCancel }: TextEditModeProps) {
  const [editContent, setEditContent] = useState(text.content);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editRef.current) {
      editRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const handleBlur = () => {
    onSave(editContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(editContent);
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      ref={editRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={(e) => setEditContent(e.currentTarget.textContent || "")}
      className="outline-none w-full h-full"
      style={{ ...style, cursor: "text" }}
    >
      {text.content}
    </div>
  );
}
