import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type PhaseStatus = "complete" | "current" | "pending";

interface PhaseCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  status: PhaseStatus;
  index: number;
  progress?: number;
}

export default function PhaseCard({
  label,
  description,
  status,
  index,
  progress = 0,
}: PhaseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-300",
        status === "complete" && "border-green-200 bg-green-50 animate-complete-pulse",
        status === "current"  && "border-primary/30 bg-primary/5 shadow-sm",
        status === "pending"  && "border-border/60 bg-card opacity-40"
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          status === "complete" && "bg-green-100",
          status === "current"  && "icon-gradient-bg",
          status === "pending"  && "bg-muted"
        )}
      >
        {status === "complete" && <Check size={18} className="text-green-600" />}
        {status === "current"  && <Loader2 size={18} className="animate-spin text-primary" />}
        {status === "pending"  && (
          <span className="text-xs font-bold text-muted-foreground">
            {index + 1}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {status === "current" && (
          <p className="text-xs mt-0.5 text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Completion badge */}
      {status === "complete" && (
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
          Klaar
        </span>
      )}

      {/* Progress bar (current phase only) */}
      {status === "current" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500 btn-gradient"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
