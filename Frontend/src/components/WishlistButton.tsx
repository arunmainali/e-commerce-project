import React from 'react';
import { useWishlistStore } from '../store/wishlistStore';
import { useToastStore } from '../store/toastStore';

interface WishlistButtonProps {
  itemId: string;
  itemTitle?: string;
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  itemId,
  itemTitle,
  className = '',
}) => {
  const hasItem = useWishlistStore((state) => state.has(itemId));
  const toggle = useWishlistStore((state) => state.toggle);
  const addToast = useToastStore((state) => state.addToast);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(itemId);
    if (!hasItem) {
      addToast(`Saved "${itemTitle || 'Item'}" to your wishlist`, 'success');
    } else {
      addToast(`Removed "${itemTitle || 'Item'}" from wishlist`, 'info');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`border border-hairline hover:border-primary px-2 py-1 text-xs font-medium transition-colors duration-150 inline-flex items-center gap-1 ${
        hasItem ? 'bg-surface text-primary border-primary' : 'bg-background text-secondary hover:text-primary'
      } ${className}`}
      aria-label={hasItem ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <span>{hasItem ? '♥' : '♡'}</span>
      <span>{hasItem ? 'Saved' : 'Save'}</span>
    </button>
  );
};
