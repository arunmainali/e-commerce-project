import React from 'react';

export const SkeletonRow: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-2 hairline-b gap-3 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-16 h-16 bg-surface flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-surface w-1/4" />
          <div className="h-4 bg-surface w-3/4" />
          <div className="h-3 bg-surface w-1/2" />
        </div>
      </div>
      <div className="w-32 h-8 bg-surface flex-shrink-0" />
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-2 hairline-b border border-hairline/60 flex flex-col justify-between animate-pulse">
      <div>
        <div className="aspect-square w-full bg-surface mb-2" />
        <div className="h-3 bg-surface w-1/3 mb-1" />
        <div className="h-4 bg-surface w-5/6 mb-2" />
      </div>
      <div className="pt-2 hairline-t">
        <div className="h-4 bg-surface w-1/2 mb-2" />
        <div className="h-7 bg-surface w-full" />
      </div>
    </div>
  );
};
