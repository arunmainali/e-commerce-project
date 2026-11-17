import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PriceBlock } from '../components/PriceBlock';
import { BidForm } from '../components/BidForm';
import { WishlistButton } from '../components/WishlistButton';
import { SpecsTable } from '../components/SpecsTable';
import { BidHistoryTable } from '../components/BidHistoryTable';
import { Countdown } from '../components/Countdown';
import { EmptyState } from '../components/EmptyState';
import { itemsService } from '../services/itemsService';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import type { Item } from '../types';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const addItemToCart = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);

  const loadItem = () => {
    if (!id) return;
    setLoading(true);
    itemsService
      .getItemById(id)
      .then((data) => {
        setItem(data);
        setActiveImageIndex(0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  // Track scroll position to show sticky persistent price bar when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 340) {
        setScrolledPastHero(true);
      } else {
        setScrolledPastHero(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-primary">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 animate-pulse">
          <div className="h-4 bg-surface w-1/4 mb-4" />
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid">
            <div className="col-span-4 md:col-span-4 lg:col-span-4 h-64 bg-surface" />
            <div className="col-span-4 md:col-span-4 lg:col-span-8 space-y-4">
              <div className="h-6 bg-surface w-3/4" />
              <div className="h-4 bg-surface w-1/4" />
              <div className="h-20 bg-surface w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-primary">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-12">
          <EmptyState
            title="Lot not found"
            message="The item or auction lot you requested cannot be located in the catalog. It may have been archived or removed."
            actionLabel="Browse Catalog"
            actionHref="/items"
          />
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addItemToCart(item.id, 1);
    addToast(`Added "${item.title}" to cart`, 'success');
  };

  const breadcrumbs = [
    { label: 'Catalog', href: '/items' },
    {
      label: item.category.replace('-', ' ').toUpperCase(),
      href: `/items?category=${item.category}`,
    },
    {
      label: item.subcategory.replace('-', ' ').toUpperCase(),
      href: `/items?category=${item.category}&subcategory=${item.subcategory}`,
    },
    { label: `Lot ${item.lotNumber}` },
  ];

  const currentPrice =
    item.purchaseMode === 'auction'
      ? (item.currentBid ?? item.startingBid ?? 0)
      : (item.price ?? 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      {/* McMaster-Carr Sticky Top Price & Action Bar (Appears when scrolled past initial view) */}
      {scrolledPastHero && (
        <div className="sticky top-14 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm hairline-b py-2 px-3 shadow-none transition-all">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-10 h-10 object-contain border border-hairline bg-surface flex-shrink-0"
              />
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-primary truncate max-w-sm sm:max-w-md">
                  {item.title}
                </div>
                <div className="text-[11px] text-secondary font-mono">
                  Lot #{item.lotNumber} • {item.specs.condition}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Permanent Price */}
              <div className="text-right">
                <div className="text-xs text-secondary font-medium">
                  {item.purchaseMode === 'auction' ? 'Current bid' : 'Price'}
                </div>
                <div className="text-sm font-semibold font-mono text-primary leading-tight">
                  {formatCurrency(currentPrice)}
                </div>
                {item.purchaseMode === 'auction' && item.endTime && (
                  <div className="text-[10px] text-secondary">
                    <Countdown endTime={item.endTime} />
                  </div>
                )}
              </div>

              {/* Action Button */}
              {item.purchaseMode === 'auction' ? (
                <a href="#bid" className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap">
                  Place Bid
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  Add to Cart
                </button>
              )}
              <WishlistButton itemId={item.id} itemTitle={item.title} />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-3 text-left">
        <Breadcrumbs items={breadcrumbs} />

        {/* McMaster-Carr Compact Technical Grid: Product Figure (4 cols) & Console (8 cols) */}
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid mt-2 items-start">
          {/* Left Column: Compact Technical Image Display (McMaster style: restrained h-64, NOT 800px) */}
          <div className="col-span-4 md:col-span-4 lg:col-span-4 flex flex-col gap-2">
            {/* Main Stage Image: Compact 260px height container */}
            <div className="w-full h-64 bg-surface border border-hairline relative flex items-center justify-center p-2 group">
              <img
                src={item.images[activeImageIndex]}
                alt={`${item.title} - view ${activeImageIndex + 1}`}
                className="max-w-full max-h-full object-contain cursor-zoom-in"
                onClick={() => setIsViewerOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                className="absolute top-2 right-2 bg-background/90 hover:bg-background border border-hairline text-secondary hover:text-primary px-1.5 py-0.5 text-xs font-mono"
                title="Open full inspection viewer"
              >
                🔍 Enlarge
              </button>
              <span className="absolute bottom-2 left-2 bg-background/90 text-primary border border-hairline px-1.5 py-0.5 text-[11px] font-mono">
                {activeImageIndex + 1} of {item.images.length}
              </span>
            </div>

            {/* Thumbnail Strip (McMaster 48px square) */}
            {item.images.length > 1 && (
              <div
                className="flex items-center gap-2 overflow-x-auto py-1"
                role="tablist"
                aria-label="Item image thumbnails"
              >
                {item.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activeImageIndex === idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-12 h-12 flex-shrink-0 bg-surface border overflow-hidden p-0.5 transition-colors flex items-center justify-center ${
                      activeImageIndex === idx
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-hairline hover:border-secondary'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Technical Image Note */}
            <div className="text-[11px] text-secondary border border-hairline bg-surface/30 p-2">
              <span className="font-semibold text-primary">Cataloguer Imagery: </span>
              High-resolution neutral studio photography. Click image to inspect details and provenance markings.
            </div>
          </div>

          {/* Right Column: Title, Primary Price, Bidding & Summary (8 cols on desktop) */}
          <div className="col-span-4 md:col-span-4 lg:col-span-8 flex flex-col gap-3">
            {/* Title & Lot Header */}
            <div className="hairline-b pb-2">
              <div className="flex items-center justify-between text-xs text-secondary font-mono mb-1">
                <span className="font-semibold bg-surface px-1.5 py-0.5 border border-hairline text-primary">
                  LOT #{item.lotNumber}
                </span>
                <span className="uppercase text-[11px]">{item.specs.condition} Condition</span>
              </div>
              <h1 className="text-lg font-semibold text-primary leading-snug">{item.title}</h1>
            </div>

            {/* Permanent McMaster Price Console & Action Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface border border-hairline">
              {/* Left half: Clear Price and Status */}
              <div>
                <PriceBlock item={item} />
                <div className="mt-2 pt-2 hairline-t text-xs text-secondary space-y-1">
                  <div>
                    <span className="font-medium text-primary">Consignor: </span>
                    {item.seller.name} ★ {item.seller.rating} ({item.seller.location})
                  </div>
                  <div>
                    <span className="font-medium text-primary">Dispatch: </span>
                    ${item.shipping.cost} ({item.shipping.estimatedDays})
                  </div>
                </div>
              </div>

              {/* Right half: Immediate Action & Bidding Form */}
              <div className="border-t sm:border-t-0 sm:border-l border-hairline sm:pl-3 flex flex-col justify-between">
                {item.purchaseMode === 'auction' ? (
                  <BidForm item={item} onSuccess={loadItem} />
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="btn-primary w-full py-2.5 text-sm"
                    >
                      Add to Cart • {formatCurrency(item.price ?? 0)}
                    </button>
                    <p className="text-[11px] text-secondary">
                      Fixed price catalog purchase. Ships within {item.shipping.estimatedDays}.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <WishlistButton itemId={item.id} itemTitle={item.title} className="flex-1 py-1.5" />
                </div>
              </div>
            </div>

            {/* McMaster Tabular Specifications Table (Immediate visibility) */}
            <div className="mt-1">
              <SpecsTable specs={item.specs} />
            </div>
          </div>
        </div>

        {/* Lower Detail Sections: Narrative Description, Bid History, Logistics */}
        <div className="mt-6 pt-6 hairline-t grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid items-start">
          {/* Factual Description & Provenance (Left 6 cols on desktop) */}
          <div className="col-span-4 md:col-span-8 lg:col-span-6 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary pb-1 hairline-b mb-2">
                Cataloguer Note & Description
              </h3>
              <p className="text-sm text-primary leading-relaxed max-w-[65ch]">
                {item.description}
              </p>
              {item.specs.provenance && (
                <div className="mt-3 text-xs text-secondary border-l-2 border-hairline pl-3">
                  <span className="font-semibold text-primary">Provenance: </span>
                  {item.specs.provenance}
                </div>
              )}
            </div>
          </div>

          {/* Bid History & Guarantee (Right 6 cols on desktop) */}
          <div className="col-span-4 md:col-span-8 lg:col-span-6 space-y-4">
            {item.purchaseMode === 'auction' && (
              <BidHistoryTable history={item.bidHistory} />
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary pb-1 hairline-b mb-2">
                Shipping, Premium & Guarantee
              </h3>
              <div className="text-xs text-secondary space-y-1.5">
                <p>
                  <strong className="text-primary">Buyer&apos;s Premium: </strong>
                  10% applied to hammer price at final settlement.
                </p>
                <p>
                  <strong className="text-primary">Dispatch: </strong>
                  Shipped via {item.shipping.methods.join(', ')}. Full transit insurance included.
                </p>
                <p>
                  <strong className="text-primary">Authenticity: </strong>
                  Guaranteed genuine antique or collectible as catalogued.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* McMaster-Carr Enlarged Technical Image Viewer Modal (Price is NEVER hidden when viewing) */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-50 bg-primary/80 backdrop-blur-none flex flex-col justify-between p-4 sm:p-6">
          {/* Top Viewer Control Bar with CLEAR PRICE ALWAYS VISIBLE */}
          <div className="bg-background border border-hairline p-3 max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0 text-left">
              <span className="font-mono text-xs text-secondary">Lot #{item.lotNumber}</span>
              <div className="text-sm font-semibold text-primary truncate max-w-md">
                {item.title}
              </div>
            </div>

            {/* Permanent Price Display in Image Viewer */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-secondary">
                  {item.purchaseMode === 'auction' ? 'Current bid:' : 'Price:'}
                </span>
                <div className="text-base font-semibold font-mono text-primary leading-none">
                  {formatCurrency(currentPrice)}
                </div>
                {item.purchaseMode === 'auction' && item.endTime && (
                  <div className="text-[10px] text-secondary mt-0.5">
                    <Countdown endTime={item.endTime} />
                  </div>
                )}
              </div>

              {item.purchaseMode === 'auction' ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsViewerOpen(false);
                    const el = document.getElementById('bid');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Place Bid
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart();
                    setIsViewerOpen(false);
                  }}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Add to Cart
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="btn-secondary text-sm font-bold px-2.5 py-1"
                aria-label="Close image viewer"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Central Stage: High Resolution Image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden max-w-5xl w-full mx-auto">
            <img
              src={item.images[activeImageIndex]}
              alt={`${item.title} enlarged`}
              className="max-h-[70vh] max-w-full object-contain border border-hairline bg-surface p-2"
            />
          </div>

          {/* Bottom Thumbnail Selector in Image Viewer */}
          {item.images.length > 1 && (
            <div className="bg-background/95 border border-hairline p-2 max-w-md mx-auto flex items-center justify-center gap-2">
              {item.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-12 h-12 bg-surface border p-0.5 ${
                    activeImageIndex === idx ? 'border-primary ring-1 ring-primary' : 'border-hairline'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Footer />
      <Toast />
    </div>
  );
};
