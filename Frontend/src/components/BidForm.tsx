import React, { useState } from 'react';
import type { Item } from '../types';
import { bidsService } from '../services/bidsService';
import { useToastStore } from '../store/toastStore';

interface BidFormProps {
  item: Item;
  onSuccess?: () => void;
}

export const BidForm: React.FC<BidFormProps> = ({ item, onSuccess }) => {
  const minBid = bidsService.getMinimumBid(item);
  const [bidAmount, setBidAmount] = useState<number>(minBid);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

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
      const res = await bidsService.placeBid(item.id, bidAmount, 'Jane Collector (You)');
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

      <div className="text-sm mb-2">
        <span className="text-secondary">Minimum Next Bid: </span>
        <span className="font-semibold text-primary">{formatCurrency(minBid)}</span>
        <span className="text-xs text-secondary ml-1">
          (Increment: {formatCurrency(item.minimumIncrement || 10)})
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
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary text-sm">
                $
              </span>
              <input
                type="number"
                step={item.minimumIncrement || 10}
                min={minBid}
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                className="input-field pl-6 text-sm"
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
