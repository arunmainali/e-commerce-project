import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (itemId: string, quantity?: number) => boolean;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (itemId, _quantity = 1) => {
        const existing = get().items.find((i) => i.itemId === itemId);
        if (existing) {
          // Unique items: only 1 pcs per item allowed, cannot be added again
          return false;
        }
        set({ items: [...get().items, { itemId, quantity: 1 }] });
        return true;
      },
      removeItem: (itemId) => {
        set({ items: get().items.filter((i) => i.itemId !== itemId) });
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        // Force max quantity to 1 for unique lots
        set({
          items: get().items.map((i) =>
            i.itemId === itemId ? { ...i, quantity: 1 } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getCount: () => get().items.length,
    }),
    { name: 'auction-studio-cart' }
  )
);
