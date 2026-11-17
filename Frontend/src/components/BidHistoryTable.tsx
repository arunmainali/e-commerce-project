import React from 'react';
import type { BidHistoryEntry } from '../types';

interface BidHistoryTableProps {
  history?: BidHistoryEntry[];
}

export const BidHistoryTable: React.FC<BidHistoryTableProps> = ({ history = [] }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between pb-1 hairline-b mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Bid History ({history.length})
        </h3>
      </div>

      {history.length === 0 ? (
        <div className="py-3 text-xs text-secondary">No bids placed yet. Be the first to bid!</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="hairline-b text-xs text-secondary text-left">
              <th className="py-1 font-medium">Bidder</th>
              <th className="py-1 font-medium">Amount</th>
              <th className="py-1 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, idx) => (
              <tr
                key={idx}
                className={`hairline-b ${idx === 0 ? 'bg-surface font-semibold' : 'hover:bg-surface/50'}`}
              >
                <td className="py-1 text-xs text-primary">
                  {entry.bidder}
                  {idx === 0 && (
                    <span className="ml-1.5 text-[10px] bg-success/10 text-success border border-success/30 px-1">
                      Highest
                    </span>
                  )}
                </td>
                <td className="py-1 text-xs text-primary">{formatCurrency(entry.amount)}</td>
                <td className="py-1 text-xs text-secondary text-right">
                  {formatTimestamp(entry.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
