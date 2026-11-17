import type { Item, Filters, PaginatedResult, CategoryNode } from '../types';
import { mockItems } from '../mocks/items';
import { categories } from '../mocks/categories';

const PAGE_SIZE = 12;

function delay(ms = 150): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function matchesFilter(item: Item, filters: Filters): boolean {
  if (filters.category && item.category !== filters.category) return false;
  if (filters.subcategory && item.subcategory !== filters.subcategory) return false;
  if (filters.purchaseMode && item.purchaseMode !== filters.purchaseMode) return false;
  if (filters.condition && item.specs.condition !== filters.condition) return false;

  if (filters.q) {
    const q = filters.q.toLowerCase();
    const searchable = `${item.title} ${item.description} ${item.category} ${item.subcategory} ${item.specs.era ?? ''} ${item.specs.origin ?? ''} ${item.specs.material ?? ''} ${item.seller.name}`.toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  const itemPrice = item.purchaseMode === 'auction' ? (item.currentBid ?? item.startingBid ?? 0) : (item.price ?? 0);
  if (filters.priceMin !== undefined && itemPrice < filters.priceMin) return false;
  if (filters.priceMax !== undefined && itemPrice > filters.priceMax) return false;

  if (filters.era) {
    const era = filters.era.toLowerCase();
    if (!(item.specs.era ?? '').toLowerCase().includes(era)) return false;
  }

  if (filters.endingWithin && item.purchaseMode === 'auction' && item.endTime) {
    const hoursMap: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
    const maxHours = hoursMap[filters.endingWithin];
    if (maxHours) {
      const remaining = (new Date(item.endTime).getTime() - Date.now()) / 3600000;
      if (remaining > maxHours || remaining < 0) return false;
    }
  }

  return true;
}

function sortItems(items: Item[], sort?: Filters['sort']): Item[] {
  const sorted = [...items];
  switch (sort) {
    case 'ending-soon':
      return sorted.sort((a, b) => {
        const aTime = a.endTime ? new Date(a.endTime).getTime() : Infinity;
        const bTime = b.endTime ? new Date(b.endTime).getTime() : Infinity;
        return aTime - bTime;
      });
    case 'price-asc':
      return sorted.sort((a, b) => {
        const aP = a.purchaseMode === 'auction' ? (a.currentBid ?? 0) : (a.price ?? 0);
        const bP = b.purchaseMode === 'auction' ? (b.currentBid ?? 0) : (b.price ?? 0);
        return aP - bP;
      });
    case 'price-desc':
      return sorted.sort((a, b) => {
        const aP = a.purchaseMode === 'auction' ? (a.currentBid ?? 0) : (a.price ?? 0);
        const bP = b.purchaseMode === 'auction' ? (b.currentBid ?? 0) : (b.price ?? 0);
        return bP - aP;
      });
    case 'bids':
      return sorted.sort((a, b) => (b.bidCount ?? 0) - (a.bidCount ?? 0));
    case 'newest':
    default:
      return sorted;
  }
}

export const itemsService = {
  async getItems(filters: Filters = {}): Promise<PaginatedResult<Item>> {
    await delay();
    let filtered = mockItems.filter((item) => matchesFilter(item, filters));
    filtered = sortItems(filtered, filters.sort);
    const page = filters.page ?? 1;
    const start = (page - 1) * PAGE_SIZE;
    const paged = filtered.slice(start, start + PAGE_SIZE);
    return {
      items: paged,
      total: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    };
  },

  async getItemById(id: string): Promise<Item | null> {
    await delay();
    return mockItems.find((item) => item.id === id) ?? null;
  },

  async search(query: string): Promise<Item[]> {
    await delay(100);
    const q = query.toLowerCase();
    return mockItems
      .filter((item) => {
        const s = `${item.title} ${item.category} ${item.specs.era ?? ''}`.toLowerCase();
        return s.includes(q);
      })
      .slice(0, 8);
  },

  async getEndingSoon(limit = 5): Promise<Item[]> {
    await delay();
    return mockItems
      .filter((item) => item.purchaseMode === 'auction' && item.endTime)
      .sort((a, b) => new Date(a.endTime!).getTime() - new Date(b.endTime!).getTime())
      .slice(0, limit);
  },

  async getCategories(): Promise<CategoryNode[]> {
    await delay(50);
    return categories;
  },
};
