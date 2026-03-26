import { Sparkles, MapPin, Heart, Clock, Users, Palette, ArrowRight, CheckCircle2 } from "lucide-react";

interface AIAssistantCardProps {
  photoCount: number;
  onContinue: () => void;
  disabled?: boolean;
}

const FEATURES = [
  { icon: MapPin, label: "Locaties herkennen" },
  { icon: Heart, label: "Emoties detecteren" },
  { icon: Clock, label: "Tijdlijn opbouwen" },
  { icon: Users, label: "Personen groeperen" },
  { icon: Palette, label: "Kleuren afstemmen" },
];

export default function AIAssistantCard({
  photoCount,
  onContinue,
  disabled,
}: AIAssistantCardProps) {
  return (
    <div className="card-elevated p-6 flex flex-col gap-5 w-[340px] shrink-0">
      {/* Header */}
      <div>
        <div className="w-12 h-12 rounded-xl icon-gradient-bg flex items-center justify-center">
          <Sparkles size={22} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold mt-3 text-foreground">
          AI Assistent
        </h3>
        <p className="text-sm text-muted-foreground">
          Onze AI analyseert automatisch:
        </p>
      </div>

      {/* Features list */}
      <div className="flex flex-col gap-0.5">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 py-1.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Icon size={13} className="text-primary" />
            </div>
            <span className="text-sm text-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Photo counter */}
      <div className="rounded-xl p-4 text-center bg-secondary border border-border/50">
        <span className="text-3xl font-bold text-foreground">
          {photoCount}
        </span>
        <p className="text-sm mt-0.5 text-muted-foreground">
          foto's geselecteerd
        </p>
        {photoCount > 0 && (
          <p className="text-xs mt-1 font-medium text-primary flex items-center justify-center gap-1">
            <CheckCircle2 size={11} />
            Klaar voor analyse
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        className="btn-gradient w-full rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2"
        disabled={disabled || photoCount === 0}
        onClick={onContinue}
      >
        <span>Doorgaan met AI</span>
        <ArrowRight size={16} />
      </button>

      {photoCount === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Voeg minimaal 1 foto toe om door te gaan
        </p>
      )}
    </div>
  );
}
