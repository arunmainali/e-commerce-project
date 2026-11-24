import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { Countdown } from '../components/Countdown';
import { SafeImage } from '../components/SafeImage';
import { useWishlistStore } from '../store/wishlistStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { itemsService } from '../services/itemsService';
import { formatCurrency } from '../utils/format';
import type { Item } from '../types';

export const WishlistPage: React.FC = () => {
  const itemIds = useWishlistStore((state) => state.itemIds);
  const removeFromWishlist = useWishlistStore((state) => state.remove);
  const clearWishlist = useWishlistStore((state) => state.clear);
  const addItemToCart = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all(itemIds.map((id) => itemsService.getItemById(id)))
      .then((res) => {
        setItems(res.filter((item): item is Item => item !== null));
      })
      .finally(() => setLoading(false));
  }, [itemIds]);

  const handleAddToCart = (item: Item) => {
    addItemToCart(item.id, 1);
    addToast(`Added "${item.title}" to cart`, 'success');
  };

  const handleRemove = (item: Item) => {
    removeFromWishlist(item.id);
    addToast(`Removed "${item.title}" from wishlist`, 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 text-left">
        <div className="flex items-baseline justify-between hairline-b pb-3 mb-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-primary">Saved Lots & Wishlist</h1>
            <span className="text-xs text-secondary font-mono">({items.length} items)</span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearWishlist}
              className="text-xs text-secondary hover:text-accent hover:underline"
            >
              Clear all saved
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-12 bg-surface animate-pulse" />
            <div className="h-12 bg-surface animate-pulse" />
            <div className="h-12 bg-surface animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            message="You haven't saved any auction lots or marketplace items yet. Click the 'Save' button on any item to track its progress."
            actionLabel="Explore Catalog"
            actionHref="/items"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="hairline-b text-xs text-secondary text-left font-medium">
                  <th className="py-2 w-16">Item</th>
                  <th className="py-2">Lot & Description</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Price / Current Bid</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSold = item.status === 'sold' || (item.purchaseMode === 'buy-now' && item.stock !== undefined && item.stock <= 0);
                  const isBidOver = item.purchaseMode === 'auction' && (item.status === 'ended' || isSold || (item.endTime ? new Date(item.endTime).getTime() <= Date.now() : false));
                  const isUnavailable = isSold || isBidOver;

                  return (
                  <tr key={item.id} className="hairline-b hover:bg-surface/40 transition-colors">
                    <td className="py-2 pr-3">
                      <Link
                        to={`/items/${item.id}`}
                        className="block w-12 h-12 bg-surface border border-hairline overflow-hidden p-0.5 relative flex items-center justify-center"
                      >
                        <SafeImage
                          src={item.images[0]}
                          alt={item.title}
                          className={`max-w-full max-h-full object-contain ${isUnavailable ? 'grayscale opacity-75' : ''}`}
                        />
                        {isUnavailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white bg-accent px-0.5 uppercase">
                              SOLD
                            </span>
                          </div>
                        )}
                      </Link>
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-secondary">Lot {item.lotNumber}</span>
                        {isUnavailable && (
                          <span className="bg-accent text-white text-[9px] font-bold px-1 uppercase">
                            SOLD
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/items/${item.id}`}
                        className="font-semibold text-primary hover:underline block truncate max-w-sm"
                      >
                        {item.title}
                      </Link>
                      <div className="text-xs text-secondary">{item.specs.era}</div>
                    </td>

                    <td className="py-2 pr-3 text-xs">
                      {isUnavailable ? (
                        <span className="text-accent font-bold uppercase text-[11px]">Sold / Closed</span>
                      ) : item.purchaseMode === 'auction' ? (
                        <div>
                          <span className="font-semibold text-primary">Auction</span>
                          {item.endTime && (
                            <div className="text-[11px] text-secondary mt-0.5">
                              <Countdown endTime={item.endTime} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-secondary">Buy Now</span>
                      )}
                    </td>

                    <td className="py-2 pr-3">
                      <div className="font-semibold text-primary">
                        {formatCurrency(
                          item.purchaseMode === 'auction'
                            ? (item.currentBid ?? item.startingBid ?? 0)
                            : (item.price ?? 0)
                        )}
                      </div>
                      {item.purchaseMode === 'auction' && (
                        <div className="text-xs text-secondary">{item.bidCount} bids</div>
                      )}
                    </td>

                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isUnavailable ? (
                          <span className="bg-surface text-secondary border border-hairline text-xs py-1 px-2.5 font-medium cursor-not-allowed">
                            {isSold ? 'Sold' : 'Bid Over'}
                          </span>
                        ) : item.purchaseMode === 'buy-now' ? (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="btn-primary text-xs py-1 px-2.5"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/items/${item.id}#bid`)}
                            className="btn-primary text-xs py-1 px-2.5"
                          >
                            Bid Now
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="btn-secondary text-xs py-1 px-2 text-secondary hover:text-accent hover:border-accent"
                          title="Remove item"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
