import React from 'react';
import type { Item } from '../types';
import { Countdown } from './Countdown';

interface PriceBlockProps {
  item: Item;
  showCountdown?: boolean;
}

export const PriceBlock: React.FC<PriceBlockProps> = ({ item, showCountdown = true }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  if (item.purchaseMode === 'auction') {
    const current = item.currentBid ?? item.startingBid ?? 0;
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-secondary">Current bid:</span>
          <span className="text-base font-semibold text-primary">{formatCurrency(current)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
          <span>{item.bidCount ?? 0} {item.bidCount === 1 ? 'bid' : 'bids'}</span>
          {showCountdown && item.endTime && (
            <>
              <span>•</span>
              <Countdown endTime={item.endTime} />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-secondary">Price:</span>
        <span className="text-base font-semibold text-primary">
          {formatCurrency(item.price ?? 0)}
        </span>
      </div>
      <div className="text-xs text-secondary mt-0.5">
        <span>Buy Now</span>
        {item.stock && item.stock > 1 && (
          <span className="ml-1 text-disabled">({item.stock} in stock)</span>
        )}
      </div>
    </div>
  );
};
