import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { useAuthStore } from '../store/authStore';
import { ordersService } from '../services/ordersService';
import { mockItems, wonItemIds } from '../mocks/items';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import type { Order, Item } from '../types';

export const AccountPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signOut = useAuthStore((state) => state.signOut);
  const addItemToCart = useCartStore((state) => state.addItem);
  const addToast = useToastStore((state) => state.addToast);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    ordersService.getOrders().then(setOrders);
  }, [isAuthenticated, navigate]);

  const activeBidItems = mockItems.filter((i) => i.purchaseMode === 'auction').slice(0, 3);
  const wonItems: Item[] = mockItems.filter((i) => wonItemIds.includes(i.id));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  const handleClaimWonItem = (item: Item) => {
    addItemToCart(item.id, 1);
    addToast(`Added won lot "${item.title}" to cart for settlement`, 'success');
    navigate('/cart');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 text-left">
        {/* User Profile Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between hairline-b pb-4 mb-6 gap-2">
          <div>
            <h1 className="text-lg font-semibold text-primary">{user?.name}</h1>
            <p className="text-xs text-secondary font-mono">
              Account: {user?.id} • Verified Collector ({user?.email})
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut();
              addToast('Signed out', 'info');
              navigate('/auth');
            }}
            className="btn-secondary text-xs py-1 px-3 self-start sm:self-auto"
          >
            Sign Out
          </button>
        </div>

        {/* 3 Main Sections */}
        <div className="space-y-8">
          {/* SECTION 1: ACTIVE BIDS */}
          <section>
            <div className="flex items-center justify-between hairline-b pb-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                1. Active Auction Bids ({activeBidItems.length})
              </h2>
              <span className="text-xs text-success font-medium">● Highest Bidder on all</span>
            </div>

            <div className="border border-hairline overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface hairline-b text-xs text-secondary text-left">
                    <th className="py-2 px-3">Lot</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3">Your Highest Bid</th>
                    <th className="py-2 px-3">Time Remaining</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {activeBidItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface/30">
                      <td className="py-2 px-3 font-mono text-xs">{item.lotNumber}</td>
                      <td className="py-2 px-3">
                        <Link
                          to={`/items/${item.id}`}
                          className="font-semibold text-primary hover:underline block truncate max-w-sm"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {formatCurrency(item.currentBid || 0)}
                      </td>
                      <td className="py-2 px-3 text-xs text-secondary">
                        {item.endTime ? new Date(item.endTime).toLocaleTimeString() : 'Active'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          to={`/items/${item.id}#bid`}
                          className="btn-secondary text-xs py-0.5 px-2"
                        >
                          Increase Bid
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 2: WON ITEMS READY FOR SETTLEMENT */}
          <section>
            <div className="flex items-center justify-between hairline-b pb-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                2. Won Auction Lots Awaiting Payment ({wonItems.length})
              </h2>
              <span className="text-xs text-secondary">Ready for invoice settlement</span>
            </div>

            <div className="border border-hairline divide-y divide-hairline">
              {wonItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-surface/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-12 h-12 object-contain p-0.5 border border-hairline bg-surface flex-shrink-0"
                    />
                    <div>
                      <div className="text-xs font-mono text-secondary">LOT #{item.lotNumber} [WINNER]</div>
                      <Link
                        to={`/items/${item.id}`}
                        className="font-semibold text-primary hover:underline text-sm"
                      >
                        {item.title}
                      </Link>
                      <div className="text-xs text-success font-medium">
                        Hammer Price: {formatCurrency(item.price ?? item.currentBid ?? 1850)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimWonItem(item)}
                    className="btn-primary text-xs py-1.5 px-3 self-end sm:self-auto"
                  >
                    Add to Cart for Payment →
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: ORDER HISTORY */}
          <section>
            <div className="flex items-center justify-between hairline-b pb-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
                3. Historical Orders & Paid Invoices ({orders.length})
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-4 border border-hairline text-xs text-secondary bg-surface/20">
                No completed invoices in your purchase record yet.
              </div>
            ) : (
              <div className="border border-hairline divide-y divide-hairline">
                {orders.map((ord) => (
                  <div key={ord.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold font-mono text-primary mr-3">{ord.id}</span>
                      <span className="text-secondary">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-secondary ml-2">
                        • {ord.items.length} line items
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCurrency(ord.total)}</span>
                      <Link to={`/order/${ord.id}`} className="hover:underline text-primary">
                        View Receipt
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
