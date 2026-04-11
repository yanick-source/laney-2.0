import { useState } from "react";
import { ShoppingCart, CheckCircle, Loader2, ArrowLeft, Package, BookOpen, Layers } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { useEditorStore } from "@/stores/editorStore";
import { submitPrintOrder } from "@/lib/printService";
import type { BookSize, BindingType, PaperType, OrderDetails } from "@/lib/printService";

const BOOK_FORMATS: { id: BookSize; label: string; size: string; price: string; desc: string }[] = [
  { id: "small",  label: "Klein Vierkant",     size: "20×20 cm", price: "€29,99", desc: "Compact fotoboek" },
  { id: "medium", label: "Medium Liggend",     size: "30×21 cm", price: "€39,99", desc: "Klassiek formaat"  },
  { id: "large",  label: "Groot Staand",       size: "21×30 cm", price: "€49,99", desc: "Maximale impact"   },
];

const BINDINGS: { id: BindingType; label: string; desc: string }[] = [
  { id: "softcover", label: "Softcover", desc: "Flexibele kaft, lichtgewicht"  },
  { id: "hardcover", label: "Hardcover", desc: "Harde kaft, premium kwaliteit" },
];

const PAPERS: { id: PaperType; label: string; desc: string }[] = [
  { id: "gloss",  label: "Glanzend",  desc: "Levendige kleuren"   },
  { id: "matte",  label: "Mat",       desc: "Subtiel & elegant"   },
  { id: "velvet", label: "Velvet",    desc: "Fluweelzachte finish" },
];

type Step = "form" | "submitting" | "success" | "error";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const pages = useEditorStore((s) => s.pages);

  const [step, setStep]       = useState<Step>("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [form, setForm] = useState<OrderDetails>({
    customerName:  "",
    customerEmail: "",
    bookSize:      "medium",
    binding:       "softcover",
    paper:         "gloss",
  });

  const selectedFormat = BOOK_FORMATS.find((f) => f.id === form.bookSize)!;

  function field(key: keyof OrderDetails, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pages.length === 0) {
      setErrorMsg("Geen pagina's gevonden. Ga terug naar de editor.");
      setStep("error");
      return;
    }

    setStep("submitting");
    try {
      const result = await submitPrintOrder(pages, form);
      setOrderId(result.orderId);
      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Onbekende fout");
      setStep("error");
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="card-elevated p-10 max-w-md w-full text-center">
            <CheckCircle size={52} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Bestelling geplaatst!</h2>
            <p className="text-muted-foreground mb-1">Ordernummer</p>
            <p className="text-lg font-mono font-semibold text-primary mb-6">{orderId}</p>
            <p className="text-sm text-muted-foreground mb-8">
              Jouw fotoboek is doorgestuurd naar de drukker. Je ontvangt een bevestiging op{" "}
              <strong>{form.customerEmail}</strong>.
            </p>
            <button
              onClick={() => navigate("/upload")}
              className="btn-gradient rounded-xl px-6 py-3 text-sm font-semibold w-full"
            >
              Nieuw fotoboek maken
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="card-elevated p-10 max-w-md w-full text-center">
            <p className="text-red-500 font-semibold text-lg mb-3">Er ging iets mis</p>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <button
              onClick={() => setStep("form")}
              className="btn-gradient rounded-xl px-6 py-3 text-sm font-semibold w-full"
            >
              Probeer opnieuw
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitting screen ───────────────────────────────────────────────────────
  if (step === "submitting") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="card-elevated p-10 max-w-md w-full text-center">
            <Loader2 size={48} className="mx-auto mb-5 animate-spin text-primary" />
            <h2 className="text-xl font-bold mb-2">Bezig met verwerken…</h2>
            <p className="text-sm text-muted-foreground">
              Jouw fotoboek wordt omgezet naar drukklare PDF's en doorgestuurd naar de drukker.
              Dit kan tot 60 seconden duren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Order form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader />

      <div className="bg-gradient-to-b from-laney-peach/70 to-background py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl icon-gradient-bg flex items-center justify-center mx-auto mb-4">
          <ShoppingCart size={24} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Bestelling afronden</h1>
        <p className="mt-2 text-muted-foreground">
          {pages.length} pagina{pages.length !== 1 ? "'s" : ""} · wordt direct naar de drukker gestuurd
        </p>
      </div>

      <div className="flex-1 flex justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-8">

          {/* ── Contact ──────────────────────────────────────────────────── */}
          <section className="card-elevated p-6 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Package size={16} /> Contactgegevens
            </h2>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Naam</label>
              <input
                required
                type="text"
                value={form.customerName}
                onChange={(e) => field("customerName", e.target.value)}
                placeholder="Jan Jansen"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">E-mailadres</label>
              <input
                required
                type="email"
                value={form.customerEmail}
                onChange={(e) => field("customerEmail", e.target.value)}
                placeholder="jan@voorbeeld.nl"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </section>

          {/* ── Book format ──────────────────────────────────────────────── */}
          <section className="card-elevated p-6 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <BookOpen size={16} /> Formaat
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOOK_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => field("bookSize", f.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${
                    form.bookSize === f.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.size}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                  <p className="mt-2 font-bold text-primary text-sm">{f.price}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Binding ──────────────────────────────────────────────────── */}
          <section className="card-elevated p-6 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Layers size={16} /> Binding &amp; Papier
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {BINDINGS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => field("binding", b.id)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    form.binding === b.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-sm">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {PAPERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => field("paper", p.id)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    form.paper === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Summary + submit ─────────────────────────────────────────── */}
          <section className="card-elevated p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{selectedFormat.label} ({selectedFormat.size})</span>
              <span className="font-semibold">{selectedFormat.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagina's</span>
              <span>{pages.length}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between font-bold">
              <span>Totaal</span>
              <span className="text-primary">{selectedFormat.price}</span>
            </div>
            <button
              type="submit"
              className="btn-gradient rounded-xl px-6 py-3.5 text-sm font-semibold w-full flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} />
              Bestelling plaatsen &amp; afdrukken
            </button>
            <button
              type="button"
              onClick={() => navigate(`/editor/${bookId}`)}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} /> Terug naar editor
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}
