import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { CategoryTree } from '../components/CategoryTree';
import { FilterPanel } from '../components/FilterPanel';
import { ItemRow } from '../components/ItemRow';
import { ItemCard } from '../components/ItemCard';
import { Pagination } from '../components/Pagination';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRow, SkeletonCard } from '../components/Skeleton';
import { itemsService } from '../services/itemsService';
import type { Item, Filters, CategoryNode, ViewMode, CategorySlug } from '../types';

export const BrowsePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [endingSoon, setEndingSoon] = useState<Item[]>([]);

  // Mobile filters/categories drawer state
  const [mobileDrawer, setMobileDrawer] = useState<'categories' | 'filters' | null>(null);

  // Parse filters from URL
  const currentCategory = (searchParams.get('category') as CategorySlug) || undefined;
  const currentSubcategory = searchParams.get('subcategory') || undefined;
  const currentQuery = searchParams.get('q') || undefined;
  const currentMode = (searchParams.get('type') as Filters['purchaseMode']) || undefined;
  const currentPriceMin = searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined;
  const currentPriceMax = searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined;
  const currentEra = searchParams.get('era') || undefined;
  const currentCondition = (searchParams.get('condition') as Filters['condition']) || undefined;
  const currentEndingWithin = searchParams.get('endingWithin') || undefined;
  const currentSort = (searchParams.get('sort') as Filters['sort']) || 'newest';
  const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  const filters: Filters = {
    category: currentCategory,
    subcategory: currentSubcategory,
    q: currentQuery,
    purchaseMode: currentMode,
    priceMin: currentPriceMin,
    priceMax: currentPriceMax,
    era: currentEra,
    condition: currentCondition,
    endingWithin: currentEndingWithin,
    sort: currentSort,
    page: currentPage,
  };

  useEffect(() => {
    itemsService.getCategories().then(setCategories);
    itemsService.getEndingSoon(4).then(setEndingSoon);
  }, []);

  useEffect(() => {
    setLoading(true);
    itemsService
      .getItems(filters)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<Filters>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, val]) => {
      const paramKey = key === 'purchaseMode' ? 'type' : key;
      if (val === undefined || val === '') {
        params.delete(paramKey);
      } else {
        params.set(paramKey, String(val));
      }
    });

    if (newFilters.page === undefined && !('page' in newFilters)) {
      params.set('page', '1');
    }

    setSearchParams(params);
  };

  const handleClearFilter = (key: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleClearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  // Active filter chips
  const activeChips: { key: string; label: string }[] = [];
  if (currentCategory) activeChips.push({ key: 'category', label: `Category: ${currentCategory}` });
  if (currentSubcategory) activeChips.push({ key: 'subcategory', label: `Sub: ${currentSubcategory}` });
  if (currentQuery) activeChips.push({ key: 'q', label: `Search: "${currentQuery}"` });
  if (currentMode) activeChips.push({ key: 'type', label: currentMode === 'auction' ? 'Auctions' : 'Buy Now' });
  if (currentPriceMin || currentPriceMax) {
    activeChips.push({
      key: 'price',
      label: `Price: $${currentPriceMin || 0} - $${currentPriceMax || '∞'}`,
    });
  }
  if (currentCondition) activeChips.push({ key: 'condition', label: `Condition: ${currentCondition}` });
  if (currentEndingWithin) activeChips.push({ key: 'endingWithin', label: `Ending in: ${currentEndingWithin}` });
  if (currentEra) activeChips.push({ key: 'era', label: `Era: ${currentEra}` });

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      {/* Main Container: 12 Desktop / 8 Tablet / 4 Mobile */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-3">
        {/* Mobile controls for drawer */}
        <div className="lg:hidden flex items-center justify-between hairline-b pb-2 mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMobileDrawer('categories')}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setMobileDrawer('filters')}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              Filters {activeChips.length > 0 && `(${activeChips.length})`}
            </button>
          </div>
          <span className="text-xs text-secondary font-mono">{total} Lots</span>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid text-left items-start">
          {/* Left Column: McMaster-Carr Persistent STICKY Category Tree and Filter Panel (3 cols) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto pr-3 py-1 space-y-4 hairline-r mcmaster-scrollbar">
            <CategoryTree
              categories={categories}
              activeCategory={currentCategory}
              activeSubcategory={currentSubcategory}
            />
            <FilterPanel
              currentFilters={filters}
              onFilterChange={updateFilters}
              onReset={handleClearAll}
            />
          </aside>

          {/* Right Column: Listing and Controls (9 cols) */}
          <div className="col-span-4 md:col-span-8 lg:col-span-9 flex flex-col min-w-0">
            {/* Urgent / Ending Soon banner (McMaster high-density strip) */}
            {!currentCategory && !currentQuery && endingSoon.length > 0 && (
              <div className="bg-surface border border-hairline p-2 mb-3 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-semibold uppercase tracking-wider text-accent text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse inline-block" />
                  Urgent / Ending Soon:
                </span>
                <div className="flex items-center gap-3 overflow-x-auto">
                  {endingSoon.map((es) => (
                    <Link
                      key={es.id}
                      to={`/items/${es.id}`}
                      className="hover:underline truncate max-w-[200px] text-primary font-medium"
                    >
                      {es.title} <span className="font-mono text-secondary">(${es.currentBid})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* List Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between hairline-b pb-2 mb-2 gap-2">
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-semibold text-primary">
                  {currentCategory
                    ? currentCategory.replace('-', ' ').toUpperCase()
                    : currentQuery
                    ? `Results for "${currentQuery}"`
                    : 'All Catalog Lots'}
                </h1>
                <span className="text-xs text-secondary font-mono">
                  ({total} {total === 1 ? 'item' : 'items'})
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-secondary">Sort:</span>
                  <select
                    className="input-field text-xs py-0.5"
                    value={currentSort}
                    onChange={(e) =>
                      updateFilters({ sort: e.target.value as Filters['sort'], page: 1 })
                    }
                  >
                    <option value="newest">Featured / Default</option>
                    <option value="ending-soon">Ending Soonest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="bids">Most Bids</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex border border-hairline text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-0.5 ${
                      viewMode === 'list'
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-background text-secondary hover:text-primary'
                    }`}
                    aria-label="Table list view"
                  >
                    Table List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-0.5 ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-background text-secondary hover:text-primary'
                    }`}
                    aria-label="Grid view"
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pb-2 hairline-b mb-2">
                <span className="text-xs text-secondary font-medium">Active Filters:</span>
                {activeChips.map((chip) => (
                  <span key={chip.key} className="chip">
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (chip.key === 'price') {
                          handleClearFilter('priceMin');
                          handleClearFilter('priceMax');
                        } else {
                          handleClearFilter(chip.key);
                        }
                      }}
                      className="text-secondary hover:text-accent font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-secondary hover:text-accent hover:underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* McMaster-Carr Table Header in List View */}
            {viewMode === 'list' && items.length > 0 && !loading && (
              <div className="hidden md:flex items-center justify-between py-1.5 px-3 bg-surface hairline-b text-xs text-secondary font-medium uppercase tracking-wider">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-12 text-center">Item</span>
                  <span className="flex-1">Lot & Technical Description</span>
                </div>
                <div className="hidden lg:block w-40 text-left">Format & Status</div>
                <div className="w-[200px] text-right pr-2">Current Bid / Price</div>
              </div>
            )}

            {/* Content Display: List or Grid */}
            <div className="flex-1">
              {loading ? (
                viewMode === 'list' ? (
                  <div className="space-y-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                )
              ) : items.length === 0 ? (
                <EmptyState
                  title="No items found"
                  message="We couldn't find any items matching your selected criteria. Try adjusting or clearing your active filters."
                  actionLabel="Clear All Filters"
                  actionHref="/items"
                />
              ) : viewMode === 'list' ? (
                <div className="border border-hairline divide-y divide-hairline">
                  {items.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => updateFilters({ page })}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Slide-in Drawer */}
      {mobileDrawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-primary/20 backdrop-blur-none"
            onClick={() => setMobileDrawer(null)}
          />
          <div className="relative w-4/5 max-w-xs bg-background h-full p-4 overflow-y-auto flex flex-col justify-between border-r border-hairline">
            <div>
              <div className="flex items-center justify-between hairline-b pb-2 mb-3">
                <span className="font-semibold text-sm">
                  {mobileDrawer === 'categories' ? 'Departments' : 'Filter Lots'}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawer(null)}
                  className="text-lg font-bold px-2 py-0.5"
                >
                  ×
                </button>
              </div>

              {mobileDrawer === 'categories' ? (
                <CategoryTree
                  categories={categories}
                  activeCategory={currentCategory}
                  activeSubcategory={currentSubcategory}
                />
              ) : (
                <FilterPanel
                  currentFilters={filters}
                  onFilterChange={(f) => {
                    updateFilters(f);
                    setMobileDrawer(null);
                  }}
                  onReset={() => {
                    handleClearAll();
                    setMobileDrawer(null);
                  }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileDrawer(null)}
              className="btn-primary w-full py-1.5 mt-4 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Footer />
      <Toast />
    </div>
  );
};
