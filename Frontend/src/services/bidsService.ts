import type { BidHistoryEntry } from '../types';
import { mockItems } from '../mocks/items';

function delay(ms = 200): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const bidsService = {
  async placeBid(itemId: string, amount: number, bidder = 'you'): Promise<{ success: boolean; message: string }> {
    await delay(300);
    const item = mockItems.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };
    if (item.purchaseMode !== 'auction') return { success: false, message: 'This item is not an auction.' };

    const minBid = (item.currentBid ?? item.startingBid ?? 0) + (item.minimumIncrement ?? 0);
    if (amount < minBid) {
      return { success: false, message: `Bid must be at least ${formatCurrency(minBid)}.` };
    }

    if (item.endTime && new Date(item.endTime).getTime() < Date.now()) {
      return { success: false, message: 'This auction has ended.' };
    }

    // Mutate mock data for session persistence
    const entry: BidHistoryEntry = {
      bidder,
      amount,
      timestamp: new Date().toISOString(),
    };
    item.currentBid = amount;
    item.bidCount = (item.bidCount ?? 0) + 1;
    if (!item.bidHistory) item.bidHistory = [];
    item.bidHistory.unshift(entry);

    return { success: true, message: `Bid of ${formatCurrency(amount)} placed successfully.` };
  },

  async getBidHistory(itemId: string): Promise<BidHistoryEntry[]> {
    await delay();
    const item = mockItems.find((i) => i.id === itemId);
    return item?.bidHistory ?? [];
  },

  getMinimumBid(item: { currentBid?: number; startingBid?: number; minimumIncrement?: number }): number {
    return (item.currentBid ?? item.startingBid ?? 0) + (item.minimumIncrement ?? 10);
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
