import React from 'react';
import type { Filters, PurchaseMode, ItemCondition } from '../types';

interface FilterPanelProps {
  currentFilters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onReset: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  currentFilters,
  onFilterChange,
  onReset,
}) => {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between hairline-b pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Refine Results
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-secondary hover:text-accent hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Format / Type */}
      <div className="hairline-b pb-2 space-y-1">
        <div className="text-xs font-semibold text-primary">Format</div>
        <div className="space-y-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="radio"
              name="purchaseMode"
              checked={!currentFilters.purchaseMode}
              onChange={() => onFilterChange({ purchaseMode: undefined, page: 1 })}
              className="accent-primary"
            />
            <span>All Formats</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="radio"
              name="purchaseMode"
              value="auction"
              checked={currentFilters.purchaseMode === 'auction'}
              onChange={() => onFilterChange({ purchaseMode: 'auction' as PurchaseMode, page: 1 })}
              className="accent-primary"
            />
            <span>Auctions Only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="radio"
              name="purchaseMode"
              value="buy-now"
              checked={currentFilters.purchaseMode === 'buy-now'}
              onChange={() => onFilterChange({ purchaseMode: 'buy-now' as PurchaseMode, page: 1 })}
              className="accent-primary"
            />
            <span>Buy Now Only</span>
          </label>
        </div>
      </div>

      {/* Price Range */}
      <div className="hairline-b pb-2 space-y-1">
        <div className="text-xs font-semibold text-primary">Price Range ($)</div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min"
            className="input-field text-xs py-0.5 w-1/2"
            value={currentFilters.priceMin ?? ''}
            onChange={(e) =>
              onFilterChange({
                priceMin: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
          />
          <span className="text-secondary text-xs">–</span>
          <input
            type="number"
            placeholder="Max"
            className="input-field text-xs py-0.5 w-1/2"
            value={currentFilters.priceMax ?? ''}
            onChange={(e) =>
              onFilterChange({
                priceMax: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
          />
        </div>
      </div>

      {/* Condition */}
      <div className="hairline-b pb-2 space-y-1">
        <div className="text-xs font-semibold text-primary">Condition</div>
        <select
          className="input-field text-xs py-0.5"
          value={currentFilters.condition ?? ''}
          onChange={(e) =>
            onFilterChange({
              condition: (e.target.value || undefined) as ItemCondition | undefined,
              page: 1,
            })
          }
        >
          <option value="">Any Condition</option>
          <option value="Excellent">Excellent</option>
          <option value="Very Good">Very Good</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="As Found">As Found</option>
        </select>
      </div>

      {/* Ending Within (Auctions) */}
      <div className="hairline-b pb-2 space-y-1">
        <div className="text-xs font-semibold text-primary">Auction Ending Within</div>
        <select
          className="input-field text-xs py-0.5"
          value={currentFilters.endingWithin ?? ''}
          onChange={(e) =>
            onFilterChange({
              endingWithin: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">Any Time</option>
          <option value="1h">Under 1 hour</option>
          <option value="6h">Under 6 hours</option>
          <option value="24h">Under 24 hours</option>
          <option value="7d">Under 7 days</option>
        </select>
      </div>

      {/* Era / Period */}
      <div className="pb-1 space-y-1">
        <div className="text-xs font-semibold text-primary">Era or Period</div>
        <input
          type="text"
          placeholder="e.g. Victorian, 1960s"
          className="input-field text-xs py-0.5"
          value={currentFilters.era ?? ''}
          onChange={(e) =>
            onFilterChange({
              era: e.target.value || undefined,
              page: 1,
            })
          }
        />
      </div>
    </div>
  );
};
