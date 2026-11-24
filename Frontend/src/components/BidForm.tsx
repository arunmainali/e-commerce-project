import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item } from '../types';
import { bidsService } from '../services/bidsService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { formatCurrency } from '../utils/format';

interface BidFormProps {
  item: Item;
  onSuccess?: () => void;
}

export const BidForm: React.FC<BidFormProps> = ({ item, onSuccess }) => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const minBid = bidsService.getMinimumBid(item);
  const [bidAmount, setBidAmount] = useState<number>(minBid);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  // Not signed in — show sign-in prompt instead of bid form
  if (!isAuthenticated) {
    return (
      <div className="bg-surface p-3 border border-hairline text-left" id="bid">
        <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
          Bidding Information
        </div>
        <p className="text-sm text-secondary mb-3">
          You must be signed in to place a bid on this lot.
        </p>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="btn-primary py-1.5 px-4 text-sm"
        >
          Sign In to Bid
        </button>
      </div>
    );
  }

  // Sold / Closed / Auction ended check
  const isSold = item.status === 'sold';
  const isBidOver = item.status === 'ended' || isSold || (item.endTime ? new Date(item.endTime).getTime() <= Date.now() : false);
  if (isBidOver) {
    return (
      <div className="bg-accent/5 border border-accent p-3.5 text-left space-y-2" id="bid">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            {isSold ? 'Item Sold' : 'Bidding Concluded'}
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          {isSold
            ? 'This lot has already been sold. Bidding is permanently closed.'
            : 'Bidding on this lot has ended. No further bids can be accepted.'}
        </p>
        <div className="text-xs font-mono text-primary pt-1 hairline-t">
          Final Winning Bid: <span className="font-bold text-accent">{formatCurrency(item.currentBid ?? item.startingBid ?? 0)}</span>
        </div>
      </div>
    );
  }

  // Consignor restriction — consignors cannot place bids on their own consigned lots
  const isConsignor = Boolean(user?.id && item.sellerId && user.id === item.sellerId);
  if (isConsignor) {
    return (
      <div className="bg-surface/50 p-4 border border-hairline text-left space-y-2.5" id="bid">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Consignor Notice
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          You are the registered consignor of this lot (Lot #{item.lotNumber}). Platform regulations strictly prohibit consignors from placing bids on their own lots.
        </p>
        <div className="pt-1 flex items-center gap-2">
          <span className="inline-block text-[11px] font-mono px-2 py-0.5 border border-hairline bg-surface text-secondary">
            Lot #{item.lotNumber} • Consigned by You
          </span>
        </div>
      </div>
    );
  }

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (bidAmount < minBid) {
      setErrorMsg(`Minimum required bid is ${formatCurrency(minBid)}`);
      return;
    }
    setStep('confirm');
  };

  const handleConfirmBid = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await bidsService.placeBid(item.id, bidAmount);
      if (res.success) {
        addToast(res.message, 'success');
        setStep('input');
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message);
        setStep('input');
        addToast(res.message, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place bid';
      setErrorMsg(msg);
      setStep('input');
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface p-3 border border-hairline text-left" id="bid">
      <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
        Bidding Information
      </div>

      <div className="text-sm mb-1">
        <span className="text-secondary">Signed in as: </span>
        <span className="font-semibold text-primary">{user?.name}</span>
      </div>

      <div className="text-sm mb-2">
        <span className="text-secondary">Minimum Next Bid: </span>
        <span className="font-semibold text-primary">{formatCurrency(minBid)}</span>
        <span className="text-xs text-secondary ml-1">
          (Increment: {formatCurrency(item.minimumIncrement || 100)})
        </span>
      </div>

      {errorMsg && (
        <div className="mb-2 p-1.5 text-xs bg-accent/10 border border-accent text-accent font-medium">
          {errorMsg}
        </div>
      )}

      {step === 'input' ? (
        <form onSubmit={handleInitialSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center border border-hairline bg-background focus-within:border-primary transition-colors duration-150">
              <span className="px-2.5 py-1 text-xs font-semibold text-secondary bg-surface border-r border-hairline select-none">
                NPR
              </span>
              <input
                type="number"
                step={item.minimumIncrement || 100}
                min={minBid}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-sm bg-transparent text-primary outline-none focus:outline-none"
                required
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-1 px-3 whitespace-nowrap"
            >
              Review Bid
            </button>
          </div>
          <p className="text-xs text-secondary">
            By placing a bid, you commit to purchasing the item if you are the winning bidder.
          </p>
        </form>
      ) : (
        <div className="space-y-2 bg-background p-2 border border-hairline">
          <p className="text-sm text-primary">
            Confirm placing a bid of <span className="font-semibold">{formatCurrency(bidAmount)}</span> for this lot?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmBid}
              className="btn-primary py-1 px-3 text-xs"
            >
              {isSubmitting ? 'Placing...' : 'Confirm Bid'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep('input')}
              className="btn-secondary py-1 px-3 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
