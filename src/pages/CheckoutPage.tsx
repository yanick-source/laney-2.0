import { BookHeart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CheckoutPage() {
  const navigate = useNavigate();

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
      <div className="bg-gradient-to-b from-laney-peach/70 to-background py-14 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl icon-gradient-bg flex items-center justify-center mx-auto mb-5">
          <ShoppingCart size={24} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Bestelling afronden</h1>
        <p className="mt-2 text-muted-foreground">Jouw fotoboek wordt met zorg afgedrukt en bezorgd.</p>
      </div>

      {/* Placeholder content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="card-elevated p-8 max-w-sm w-full text-center">
          <p className="text-muted-foreground text-sm mb-6">Checkout integratie komt binnenkort beschikbaar.</p>
          <button
            onClick={() => navigate("/upload")}
            className="btn-gradient rounded-xl px-6 py-3 text-sm font-semibold w-full"
          >
            Terug naar upload
          </button>
        </div>
      </div>
    </div>
  );
}
