import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createStorefrontCheckout, type CartItem } from "@/lib/shopify";

interface CartStore {
  items: CartItem[];
  checkoutUrl: string | null;
  isLoading: boolean;

  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  createCheckout: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutUrl: null,
      isLoading: false,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item
          ),
        });
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((item) => item.variantId !== variantId) });
      },

      clearCart: () => set({ items: [], checkoutUrl: null }),

      createCheckout: async () => {
        const { items } = get();
        if (items.length === 0) return;
        set({ isLoading: true });
        try {
          const checkoutUrl = await createStorefrontCheckout(items);
          set({ checkoutUrl });
        } catch (error) {
          console.error("Failed to create checkout:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "laney-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
