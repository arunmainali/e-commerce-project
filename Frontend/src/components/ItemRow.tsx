import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Item } from '../types';
import { Countdown } from './Countdown';
import { WishlistButton } from './WishlistButton';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { bidsService } from '../services/bidsService';

interface ItemRowProps {
  item: Item;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item }) => {
  const navigate = useNavigate();
  const addItemToCart = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);
  const [showQuickPreview, setShowQuickPreview] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.purchaseMode === 'buy-now') {
      addItemToCart(item.id, 1);
      addToast(`Added "${item.title}" to cart`, 'success');
    } else {
      navigate(`/items/${item.id}#bid`);
    }
  };

  const currentPrice =
    item.purchaseMode === 'auction'
      ? (item.currentBid ?? item.startingBid ?? 0)
      : (item.price ?? 0);

  const minNextBid =
    item.purchaseMode === 'auction' ? bidsService.getMinimumBid(item) : undefined;

  return (
    <div className="group relative flex flex-col md:flex-row md:items-center justify-between py-2.5 px-3 hover:bg-surface/60 hairline-b gap-3 transition-colors duration-150 text-left">
      {/* Left: Thumbnail (McMaster-Carr compact 48x48) + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Compact 48px thumbnail with quick preview on click/hover */}
        <div
          className="relative flex-shrink-0"
          onMouseEnter={() => setShowQuickPreview(true)}
          onMouseLeave={() => setShowQuickPreview(false)}
        >
          <Link
            to={`/items/${item.id}`}
            className="block w-12 h-12 bg-surface border border-hairline overflow-hidden p-0.5 group-hover:border-primary transition-colors"
            title="Click to view item details"
          >
            <img
              src={item.images[0]}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </Link>

          {/* McMaster-Carr Quick Image Preview with price attached */}
          {showQuickPreview && (
            <div className="hidden lg:block absolute left-14 top-0 z-50 bg-background border border-primary p-2 w-64 shadow-none pointer-events-none">
              <div className="w-full h-44 bg-surface border border-hairline mb-2 overflow-hidden flex items-center justify-center">
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="text-xs font-mono text-secondary">Lot #{item.lotNumber}</div>
              <div className="text-xs font-semibold text-primary truncate">{item.title}</div>
              <div className="mt-1 flex items-baseline justify-between hairline-t pt-1">
                <span className="text-[11px] text-secondary">
                  {item.purchaseMode === 'auction' ? 'Current bid:' : 'Price:'}
                </span>
                <span className="text-sm font-semibold font-mono text-primary">
                  {formatCurrency(currentPrice)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Lot Number + Technical Title + Dense McMaster Specs */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-primary bg-surface px-1 border border-hairline">
              Lot {item.lotNumber}
            </span>
            <span className="text-xs text-secondary uppercase tracking-wider text-[11px]">
              {item.category.replace('-', ' ')}
            </span>
            {item.specs.condition && (
              <span className="text-xs text-secondary font-normal">
                • {item.specs.condition}
              </span>
            )}
          </div>

          <Link
            to={`/items/${item.id}`}
            className="block text-sm font-semibold text-primary truncate hover:underline mt-0.5"
            title={item.title}
          >
            {item.title}
          </Link>

          {/* McMaster-Carr style tabular specs row */}
          <div className="text-xs text-secondary truncate mt-0.5 font-normal">
            {item.specs.era && <span>{item.specs.era}</span>}
            {item.specs.origin && <span> • Origin: {item.specs.origin}</span>}
            {item.specs.material && <span> • {item.specs.material}</span>}
            {item.specs.dimensions && <span> • {item.specs.dimensions}</span>}
          </div>
        </div>
      </div>

      {/* Middle/Right: Format & Status */}
      <div className="hidden lg:flex flex-col text-left text-xs text-secondary w-40 flex-shrink-0">
        <span className="font-medium text-primary">
          {item.purchaseMode === 'auction' ? 'Live Auction' : 'Buy Now'}
        </span>
        {item.purchaseMode === 'auction' && item.endTime ? (
          <div className="mt-0.5">
            <Countdown endTime={item.endTime} />
            <div className="text-[11px] text-secondary">{item.bidCount ?? 0} bids placed</div>
          </div>
        ) : (
          <div className="text-[11px] text-secondary mt-0.5">Immediate checkout</div>
        )}
      </div>

      {/* Right Column: Permanent Price Block (Never wraps or gets hidden) */}
      <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-2 md:pt-0 border-t md:border-0 border-hairline">
        <div className="text-left md:text-right min-w-[110px]">
          <div className="text-xs text-secondary font-medium">
            {item.purchaseMode === 'auction' ? 'Current bid' : 'Price'}
          </div>
          <div className="text-base font-semibold font-mono text-primary leading-tight">
            {formatCurrency(currentPrice)}
          </div>
          {item.purchaseMode === 'auction' && minNextBid !== undefined && (
            <div className="text-[11px] text-secondary">
              Min next: {formatCurrency(minNextBid)}
            </div>
          )}
        </div>

        {/* Action button & Wishlist save */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
          >
            {item.purchaseMode === 'auction' ? 'Place Bid' : 'Add to Cart'}
          </button>
          <WishlistButton itemId={item.id} itemTitle={item.title} />
        </div>
      </div>
    </div>
  );
};
