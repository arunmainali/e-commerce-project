import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  itemIds: string[];
  toggle: (itemId: string) => void;
  has: (itemId: string) => boolean;
  remove: (itemId: string) => void;
  clear: () => void;
  getCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      itemIds: [],
      toggle: (itemId) => {
        const current = get().itemIds;
        if (current.includes(itemId)) {
          set({ itemIds: current.filter((id) => id !== itemId) });
        } else {
          set({ itemIds: [...current, itemId] });
        }
      },
      has: (itemId) => get().itemIds.includes(itemId),
      remove: (itemId) => {
        set({ itemIds: get().itemIds.filter((id) => id !== itemId) });
      },
      clear: () => set({ itemIds: [] }),
      getCount: () => get().itemIds.length,
    }),
    { name: 'auction-studio-wishlist' }
  )
);
