import React from 'react';
import type { Item } from '../types';
import { Countdown } from './Countdown';
import { formatCurrency } from '../utils/format';

interface PriceBlockProps {
  item: Item;
  showCountdown?: boolean;
}

export const PriceBlock: React.FC<PriceBlockProps> = ({ item, showCountdown = true }) => {
  const isSold = item.status === 'sold' || (item.purchaseMode === 'buy-now' && item.stock !== undefined && item.stock <= 0);
  const isBidOver = item.purchaseMode === 'auction' && (item.status === 'ended' || isSold || (item.endTime ? new Date(item.endTime).getTime() <= Date.now() : false));
  const isUnavailable = isSold || isBidOver;

  if (item.purchaseMode === 'auction') {
    const current = item.currentBid ?? item.startingBid ?? 0;
    return (
      <div className="flex flex-col text-left">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs text-secondary">
            {isUnavailable ? 'Final bid:' : 'Current bid:'}
          </span>
          <span className="text-base font-semibold text-primary">{formatCurrency(current)}</span>
          {isUnavailable && (
            <span className="ml-1 bg-accent text-white text-[10px] font-bold px-1.5 py-0.2 uppercase tracking-wider">
              SOLD
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
          <span>{item.bidCount ?? 0} {item.bidCount === 1 ? 'bid' : 'bids'}</span>
          {isUnavailable ? (
            <>
              <span>•</span>
              <span className="text-accent font-semibold text-[11px] uppercase">Bidding Closed</span>
            </>
          ) : (
            showCountdown && item.endTime && (
              <>
                <span>•</span>
                <Countdown endTime={item.endTime} />
              </>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xs text-secondary">Price:</span>
        <span className="text-base font-semibold text-primary">
          {formatCurrency(item.price ?? 0)}
        </span>
        {isUnavailable && (
          <span className="ml-1 bg-accent text-white text-[10px] font-bold px-1.5 py-0.2 uppercase tracking-wider">
            SOLD
          </span>
        )}
      </div>
      <div className="text-xs text-secondary mt-0.5">
        {isUnavailable ? (
          <span className="text-accent font-semibold text-[11px] uppercase">Sold Out</span>
        ) : (
          <>
            <span>Buy Now</span>
            {item.stock && item.stock > 1 && (
              <span className="ml-1 text-disabled">({item.stock} in stock)</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
