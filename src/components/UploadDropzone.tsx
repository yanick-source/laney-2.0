import { useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoFile } from "@/types/upload";

interface UploadDropzoneProps {
  photos: PhotoFile[];
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
  acceptedTypes: string[];
}

const MAX_VISIBLE = 16;

export default function UploadDropzone({
  photos,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onRemovePhoto,
  acceptedTypes,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const visiblePhotos = photos.slice(0, MAX_VISIBLE);
  const overflowCount = photos.length - MAX_VISIBLE;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-h-[400px] w-full rounded-2xl border-2 border-dashed p-8",
        "transition-all duration-200 cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.015]"
          : photos.length > 0
            ? "border-border/60 bg-card"
            : "border-border/60 bg-card hover:border-primary/40 hover:bg-secondary/50"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={triggerFileInput}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={onFileInput}
        className="hidden"
      />

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 w-full mb-6"
          onClick={(e) => e.stopPropagation()}
        >
          {visiblePhotos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square rounded-xl overflow-hidden relative group"
            >
              <img
                src={photo.preview}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePhoto(photo.id);
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="aspect-square rounded-xl overflow-hidden bg-black/60 flex items-center justify-center">
              <span className="text-white text-sm font-medium">+{overflowCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state / Add more prompt */}
      <div className="flex flex-col items-center space-y-3">
        {photos.length === 0 && (
          <div className="w-20 h-20 rounded-2xl icon-gradient-bg flex items-center justify-center">
            <Upload size={40} className="text-primary" />
          </div>
        )}
        <div className="text-center">
          <h3 className={cn(
            "font-semibold text-foreground",
            photos.length === 0 ? "text-xl mt-4" : "text-sm"
          )}>
            {photos.length === 0
              ? "Sleep je foto's hierheen"
              : "Voeg meer foto's toe"}
          </h3>
          {photos.length === 0 && (
            <p className="text-sm mt-1 text-muted-foreground">
              of klik om bestanden te selecteren
            </p>
          )}
        </div>

        {photos.length === 0 && (
          <>
            <button
              type="button"
              className="btn-gradient rounded-xl px-6 py-3 flex items-center gap-2 font-semibold text-sm"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
            >
              <Upload size={20} />
              Selecteer foto's
            </button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, HEIC · Max 25MB per bestand
            </p>
          </>
        )}
      </div>
    </div>
  );
}
