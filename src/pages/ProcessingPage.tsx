import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanLine,
  Type,
  ArrowUpDown,
  LayoutGrid,
  BookOpen,
  Crop,
  Image,
  BookMarked,
  Package,
  Sparkles,
  BookHeart,
} from "lucide-react";
import PhaseCard from "@/components/PhaseCard";
import type { PhaseStatus } from "@/components/PhaseCard";
import { processSession } from "@/lib/processingService";
import type { ProcessingResult } from "@/lib/processingService";
import type { LucideIcon } from "lucide-react";

interface Phase {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const PHASES: Phase[] = [
  { id: "preprocess", icon: ScanLine, label: "Foto's analyseren", description: "Kwaliteit en inhoud beoordelen" },
  { id: "title", icon: Type, label: "Titel genereren", description: "Passende boektitel bedenken" },
  { id: "reorder", icon: ArrowUpDown, label: "Foto's ordenen", description: "Logische volgorde bepalen" },
  { id: "organize", icon: LayoutGrid, label: "Pagina's inrichten", description: "Groepen en bijschriften maken" },
  { id: "evenPages", icon: BookOpen, label: "Paginabalans", description: "Optimaal aantal pagina's afstemmen" },
  { id: "layoutMatch", icon: Crop, label: "Layout optimaliseren", description: "Foto-afmetingen afstemmen" },
  { id: "background", icon: Image, label: "Achtergronden kiezen", description: "Sfeervolle achtergronden selecteren" },
  { id: "closing", icon: BookMarked, label: "Afsluiting schrijven", description: "Slotpagina genereren" },
  { id: "assemble", icon: Package, label: "Fotoboek samenstellen", description: "Alles samenvoegen" },
];

// Map pipeline progress callback steps to phase indices
function stepToPhaseIndex(step: string, progress: number): number {
  if (step === "analyze") {
    if (progress <= 20) return 0;      // preprocess
    if (progress <= 60) return 1;       // title
    if (progress <= 80) return 2;       // reorder
    return 2;
  }
  if (step === "layout") {
    if (progress <= 40) return 3;       // organize
    if (progress <= 60) return 4;       // evenPages
    return 5;                            // layoutMatch
  }
  if (step === "generate") {
    if (progress <= 40) return 6;       // background
    if (progress <= 60) return 7;       // closing
    return 8;                            // assemble
  }
  return 0;
}

export default function ProcessingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [currentDescription, setCurrentDescription] = useState("Voorbereiden...");
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((step: string, progress: number, message: string) => {
    const phaseIdx = stepToPhaseIndex(step, progress);
    setCurrentPhaseIndex(phaseIdx);
    setPhaseProgress(progress);
    setCurrentDescription(message);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function run() {
      try {
        // Quick API test first
        console.log("🔄 Testing Gemini API before processing...");
        const { generateText, isGeminiConfigured } = await import("@/integrations/gemini/client");
        
        if (!isGeminiConfigured) {
          throw new Error("Gemini API key not configured. Check your .env file.");
        }

        const testResponse = await generateText({
          prompt: "Respond with exactly: 'API working'",
          maxOutputTokens: 10,
        });
        
        console.log("✅ Gemini API test passed:", testResponse.data);

        // Now run the full processing
        const result: ProcessingResult = await processSession(sessionId!, handleProgress);
        if (!cancelled) {
          navigate(`/editor/${result.bookId}`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Processing failed:", err);
          const errorMessage = err instanceof Error ? err.message : "Processing failed";
          
          // Provide specific error guidance
          if (errorMessage.includes("403") || errorMessage.includes("401")) {
            setError("API Key Error: Your Gemini API key is invalid or revoked. Please get a new key from Google AI Studio and update your .env file.");
          } else if (errorMessage.includes("429")) {
            setError("Rate Limit Error: Too many requests. Please wait a moment and try again.");
          } else if (errorMessage.includes("configured")) {
            setError("Configuration Error: Please check your .env file and ensure VITE_GEMINI_API_KEY is set.");
          } else {
            setError(errorMessage);
          }
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [sessionId, navigate, handleProgress]);

  function getPhaseStatus(index: number): PhaseStatus {
    if (index < currentPhaseIndex) return "complete";
    if (index === currentPhaseIndex) return "current";
    return "pending";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/60 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BookHeart size={14} className="text-white" />
          </div>
          <span className="font-bold text-foreground tracking-tight">Laney</span>
        </div>
      </header>

      {/* Hero band */}
      <div className="bg-gradient-to-b from-laney-peach/70 to-background pt-10 pb-8 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Animated spinner */}
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full icon-gradient-bg flex items-center justify-center">
              <Sparkles size={20} className="text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">AI is bezig...</h2>
          <motion.p
            key={currentDescription}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm mt-1.5 text-muted-foreground"
          >
            {currentDescription}
          </motion.p>
        </motion.div>
      </div>

      {/* Phase Cards */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12">
        <div className="w-full max-w-md flex flex-col gap-2.5">
          {PHASES.map((phase, index) => (
            <PhaseCard
              key={phase.id}
              icon={phase.icon}
              label={phase.label}
              description={phase.description}
              status={getPhaseStatus(index)}
              index={index}
              progress={index === currentPhaseIndex ? phaseProgress : undefined}
            />
          ))}
        </div>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 w-full max-w-md rounded-xl p-4 text-center bg-destructive/10 border border-destructive/20"
          >
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button
              onClick={() => navigate("/upload")}
              className="mt-3 text-sm font-semibold text-primary underline underline-offset-2"
            >
              Terug naar upload
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
