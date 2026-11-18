import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { SearchBar } from './SearchBar';

export const Header: React.FC = () => {
  const wishlistCount = useWishlistStore((state) => state.getCount());
  const cartCount = useCartStore((state) => state.getCount());
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background hairline-b w-full">
      <div className="max-w-[1440px] mx-auto px-3 h-14 flex items-center justify-between gap-3">
        {/* Left: Wordmark */}
        <div className="flex-shrink-0">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-primary hover:no-underline"
          >
            Auction Studio
          </Link>
        </div>

        {/* Center: SearchBar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <SearchBar onSelect={(item) => navigate(`/items/${item.id}`)} />
        </div>

        {/* Right: Actions */}
        <nav className="flex items-center gap-3 text-sm font-medium">
          <button
            type="button"
            className="md:hidden text-primary px-1 py-0.5 text-xs border border-hairline"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            aria-label="Toggle mobile search"
          >
            Search
          </button>

          <Link
            to="/wishlist"
            className="text-primary hover:text-primary hover:underline flex items-center gap-1"
          >
            <span>Wishlist</span>
            <span className="text-xs text-secondary font-normal">({wishlistCount})</span>
          </Link>

          <Link
            to="/cart"
            className="text-primary hover:text-primary hover:underline flex items-center gap-1"
          >
            <span>Cart</span>
            <span className="text-xs text-secondary font-normal">({cartCount})</span>
          </Link>

          <Link
            to="/account"
            className="text-primary hover:text-primary hover:underline"
          >
            {isAuthenticated && user?.name ? user.name.split(' ')[0] : 'Account'}
          </Link>

          <Link
            to="/sell"
            className="btn-primary py-1 px-2.5 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1"
            title="List an item for auction or direct sale"
          >
            <span>+</span>
            <span>List Item</span>
          </Link>
        </nav>
      </div>

      {/* Mobile search bar expandable */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-3 hairline-b bg-surface">
          <SearchBar
            onSelect={(item) => {
              navigate(`/items/${item.id}`);
              setMobileSearchOpen(false);
            }}
          />
        </div>
      )}
    </header>
  );
};
