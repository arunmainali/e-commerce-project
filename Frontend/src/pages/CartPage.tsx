import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { itemsService } from '../services/itemsService';
import type { Item } from '../types';

interface ResolvedCartItem {
  item: Item;
  quantity: number;
}

export const CartPage: React.FC = () => {
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const addToast = useToastStore((state) => state.addToast);

  const [resolved, setResolved] = useState<ResolvedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all(
      cartItems.map(async (ci) => {
        const item = await itemsService.getItemById(ci.itemId);
        return item ? { item, quantity: ci.quantity } : null;
      })
    )
      .then((res) => {
        setResolved(res.filter((r): r is ResolvedCartItem => r !== null));
      })
      .finally(() => setLoading(false));
  }, [cartItems]);

  const subtotal = resolved.reduce((acc, curr) => {
    const unitPrice =
      curr.item.purchaseMode === 'auction'
        ? (curr.item.currentBid ?? 0)
        : (curr.item.price ?? 0);
    return acc + unitPrice * curr.quantity;
  }, 0);

  const shippingTotal = resolved.reduce(
    (acc, curr) => acc + curr.item.shipping.cost * curr.quantity,
    0
  );

  const buyersPremium = Math.round(subtotal * 0.1 * 100) / 100;
  const orderTotal = subtotal + shippingTotal + buyersPremium;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 text-left">
        <div className="flex items-baseline justify-between hairline-b pb-3 mb-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-primary">Shopping Cart & Invoices</h1>
            <span className="text-xs text-secondary font-mono">
              ({resolved.length} {resolved.length === 1 ? 'line item' : 'line items'})
            </span>
          </div>

          {resolved.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-secondary hover:text-accent hover:underline"
            >
              Clear Cart
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-16 bg-surface animate-pulse" />
            <div className="h-16 bg-surface animate-pulse" />
          </div>
        ) : resolved.length === 0 ? (
          <EmptyState
            title="Your cart is currently empty"
            message="No fixed-price purchases or won auction lots are awaiting payment in your shopping basket."
            actionLabel="Discover Available Lots"
            actionHref="/items"
          />
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid items-start">
            {/* Table of items (7 cols on desktop) */}
            <div className="col-span-4 md:col-span-8 lg:col-span-8 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="hairline-b text-xs text-secondary text-left font-medium">
                    <th className="py-2 w-16">Item</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">Price</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map(({ item, quantity }) => {
                    const price =
                      item.purchaseMode === 'auction'
                        ? (item.currentBid ?? 0)
                        : (item.price ?? 0);
                    const canChangeQty =
                      item.purchaseMode === 'buy-now' && (item.stock ?? 1) > 1;

                    return (
                      <tr key={item.id} className="hairline-b hover:bg-surface/30">
                        <td className="py-2 pr-3">
                          <Link
                            to={`/items/${item.id}`}
                            className="block w-12 h-12 bg-surface border border-hairline overflow-hidden p-0.5 flex items-center justify-center"
                          >
                            <img
                              src={item.images[0]}
                              alt={item.title}
                              className="max-w-full max-h-full object-contain"
                            />
                          </Link>
                        </td>

                        <td className="py-2 pr-3">
                          <div className="text-xs font-mono text-secondary">Lot {item.lotNumber}</div>
                          <Link
                            to={`/items/${item.id}`}
                            className="font-semibold text-primary hover:underline block truncate max-w-xs"
                          >
                            {item.title}
                          </Link>
                          <div className="text-xs text-secondary">
                            Dispatch: ${item.shipping.cost} ({item.shipping.estimatedDays})
                          </div>
                        </td>

                        <td className="py-2 pr-3 font-mono text-sm">{formatCurrency(price)}</td>

                        <td className="py-2 pr-3 text-center">
                          {canChangeQty ? (
                            <div className="inline-flex items-center border border-hairline">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                className="px-1.5 py-0.5 hover:bg-surface"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono text-xs">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                className="px-1.5 py-0.5 hover:bg-surface"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-secondary">1</span>
                          )}
                        </td>

                        <td className="py-2 pr-3 font-semibold font-mono text-right">
                          {formatCurrency(price * quantity)}
                        </td>

                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              removeItem(item.id);
                              addToast(`Removed "${item.title}" from cart`, 'info');
                            }}
                            className="text-secondary hover:text-accent font-bold px-1"
                            title="Remove from cart"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right Summary Column (5 cols on desktop, sticky) */}
            <div className="col-span-4 md:col-span-8 lg:col-span-4 bg-surface p-4 border border-hairline lg:sticky lg:top-20">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary hairline-b pb-2 mb-3">
                Order Summary
              </h2>

              <div className="space-y-2 text-sm text-primary mb-4">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal (Hammer/Fixed):</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Estimated Shipping:</span>
                  <span className="font-mono">{formatCurrency(shippingTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Buyer&apos;s Premium (10%):</span>
                  <span className="font-mono">{formatCurrency(buyersPremium)}</span>
                </div>

                <div className="hairline-t pt-2 mt-2 flex justify-between font-semibold text-base">
                  <span>Total Due:</span>
                  <span className="font-mono text-accent">{formatCurrency(orderTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="btn-primary w-full py-2.5 text-sm"
              >
                Proceed to Checkout
              </button>

              <div className="mt-3 text-[11px] text-secondary space-y-1">
                <p>• Secure checkout with SSL encryption</p>
                <p>• Immediate confirmation and invoice generated</p>
                <p>• Specialist white-glove shipping on select items</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
