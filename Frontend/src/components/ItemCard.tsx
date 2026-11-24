import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Item } from '../types';
import { PriceBlock } from './PriceBlock';
import { WishlistButton } from './WishlistButton';
import { SafeImage } from './SafeImage';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

interface ItemCardProps {
  item: Item;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const addItemToCart = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);

  const isSold = item.status === 'sold' || (item.purchaseMode === 'buy-now' && item.stock !== undefined && item.stock <= 0);
  const isBidOver = item.purchaseMode === 'auction' && (item.status === 'ended' || isSold || (item.endTime ? new Date(item.endTime).getTime() <= Date.now() : false));
  const isUnavailable = isSold || isBidOver;

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;
    if (item.purchaseMode === 'buy-now') {
      addItemToCart(item.id, 1);
      addToast(`Added "${item.title}" to cart`, 'success');
    } else {
      navigate(`/items/${item.id}#bid`);
    }
  };

  return (
    <div className={`group relative flex flex-col justify-between p-2.5 hairline-b hover:bg-surface/40 transition-colors duration-150 text-left border ${isUnavailable ? 'border-accent/40 bg-accent/5' : 'border-hairline bg-background'}`}>
      <div>
        {/* Compact McMaster-Carr Technical Thumbnail (Restrained h-36) */}
        <Link
          to={`/items/${item.id}`}
          className="block w-full h-36 bg-surface overflow-hidden border border-hairline mb-2 p-1 relative flex items-center justify-center group-hover:border-primary transition-colors"
          title={item.title}
        >
          <SafeImage
            src={item.images[0]}
            alt={item.title}
            className={`max-w-full max-h-full object-contain ${isUnavailable ? 'grayscale contrast-75 opacity-75' : ''}`}
          />
          {isUnavailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-accent text-white font-extrabold text-xs tracking-widest px-3 py-1 border border-white/60 shadow uppercase">
                {isSold ? 'SOLD' : 'SOLD • BID OVER'}
              </span>
            </div>
          )}
          <span className="absolute bottom-1 right-1 bg-background/90 text-primary border border-hairline px-1 py-0.2 text-[10px] font-mono z-20">
            Lot {item.lotNumber}
          </span>
          {isUnavailable && (
            <span className="absolute top-1 left-1 bg-accent text-white font-bold text-[9px] px-1.5 py-0.5 tracking-wider uppercase z-20">
              SOLD
            </span>
          )}
        </Link>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-secondary font-mono mb-1">
          <span className="uppercase text-[11px] font-semibold text-primary">{item.category.replace('-', ' ')}</span>
          <span className="truncate max-w-[120px] text-[11px]">{item.specs.era || item.specs.condition}</span>
        </div>

        <Link
          to={`/items/${item.id}`}
          className="block text-sm font-semibold text-primary line-clamp-2 hover:underline mb-2 min-h-[36px]"
          title={item.title}
        >
          {item.title}
        </Link>

        {/* Dense specs table */}
        <div className="text-[11px] text-secondary space-y-0.5 border-t border-hairline pt-1.5 mb-2">
          {item.specs.material && <div className="truncate"><span className="text-disabled">Mat:</span> {item.specs.material}</div>}
          {item.specs.dimensions && <div className="truncate"><span className="text-disabled">Dim:</span> {item.specs.dimensions}</div>}
        </div>
      </div>

      <div className="pt-2 hairline-t">
        <div className="mb-2">
          <PriceBlock item={item} />
        </div>

        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            disabled={isUnavailable}
            onClick={handleAction}
            className={`text-xs py-1.5 px-2 flex-1 font-semibold ${
              isUnavailable
                ? 'bg-surface text-secondary border border-hairline cursor-not-allowed opacity-80'
                : 'btn-primary'
            }`}
          >
            {isUnavailable ? 'Sold' : (item.purchaseMode === 'auction' ? 'Place Bid' : 'Add to Cart')}
          </button>
          <WishlistButton itemId={item.id} itemTitle={item.title} />
        </div>
      </div>
    </div>
  );
};
