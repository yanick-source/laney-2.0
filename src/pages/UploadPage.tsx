import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useUploadStore } from "@/stores/uploadStore";
import { createSession, uploadAllPhotos } from "@/lib/uploadService";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE, MAX_PHOTOS, MIN_PHOTOS } from "@/types/upload";
import type { PhotoFile } from "@/types/upload";
import { generateId } from "@/lib/utils";
import UploadDropzone from "@/components/UploadDropzone";
import AIAssistantCard from "@/components/AIAssistantCard";
import PageHeader from "@/components/ui/page-header";

export default function UploadPage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const {
    photos,
    isUploading,
    addPhotos,
    removePhoto,
    updatePhoto,
    setSessionId,
    setUploading,
    setTotalProgress,
  } = useUploadStore();

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `${file.name}: Niet-ondersteund formaat`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: Bestand te groot (max 25MB)`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = MAX_PHOTOS - photos.length;

      if (fileArray.length > remaining) {
        toast.warning(`Maximum ${MAX_PHOTOS} foto's. Alleen ${remaining} toegevoegd.`);
      }

      const validFiles: PhotoFile[] = [];
      const errors: string[] = [];

      fileArray.slice(0, remaining).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push({
            id: generateId(),
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            status: "pending",
            progress: 0,
          });
        }
      });

      if (errors.length > 0) {
        toast.error(errors.join("\n"));
      }
      if (validFiles.length > 0) {
        addPhotos(validFiles);
        toast.success(`${validFiles.length} foto('s) toegevoegd`);
      }
    },
    [photos.length, addPhotos]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const handleContinue = useCallback(async () => {
    if (photos.length < MIN_PHOTOS) {
      toast.error(`Voeg minimaal ${MIN_PHOTOS} foto's toe om door te gaan.`);
      return;
    }

    try {
      setUploading(true);
      setTotalProgress(0);

      const sessionId = await createSession();
      setSessionId(sessionId);

      await uploadAllPhotos(
        sessionId,
        photos,
        (photoId: string, progress: number) => {
          updatePhoto(photoId, { progress });
        },
        (photoId: string, result: { storagePath: string; url: string }) => {
          updatePhoto(photoId, {
            status: "uploaded",
            storagePath: result.storagePath,
            url: result.url,
          });
        },
        (photoId: string, error: string) => {
          updatePhoto(photoId, { status: "failed" });
          console.error(`Photo ${photoId} failed:`, error);
        }
      );

      navigate(`/${sessionId}`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload mislukt. Probeer het opnieuw.");
    } finally {
      setUploading(false);
    }
  }, [photos, navigate, setUploading, setTotalProgress, setSessionId, updatePhoto]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ── */}
      <PageHeader />

      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-b from-laney-peach via-laney-peach/50 to-background pt-12 pb-14 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles size={12} className="text-primary" />
            <span className="text-xs font-semibold text-primary">AI Fotoboek Maker</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-foreground">
            Upload je <span className="text-gradient">foto's</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Onze AI analyseert je foto's en maakt automatisch een prachtig fotoboek
          </p>
        </motion.div>
      </section>

      {/* ── Upload Area ── */}
      <main className="max-w-7xl mx-auto px-6 pb-16 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="flex gap-6 items-start"
        >
          {/* Left: Upload Dropzone */}
          <div className="flex-1 min-w-0">
            <UploadDropzone
              photos={photos}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
              onRemovePhoto={removePhoto}
              acceptedTypes={ACCEPTED_IMAGE_TYPES}
            />
          </div>

          {/* Right: AI Assistant Card */}
          <AIAssistantCard
            photoCount={photos.length}
            onContinue={handleContinue}
            disabled={isUploading || photos.length < MIN_PHOTOS}
          />
        </motion.div>
      </main>
    </div>
  );
}
