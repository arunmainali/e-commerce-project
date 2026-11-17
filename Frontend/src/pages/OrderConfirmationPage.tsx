import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ordersService } from '../services/ordersService';
import type { Order } from '../types';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ordersService.getOrderById(id).then((ord) => {
      setOrder(ord);
      setLoading(false);
    });
  }, [id]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      val
    );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-primary">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-12 animate-pulse">
          <div className="h-8 bg-surface w-1/3 mb-4" />
          <div className="h-32 bg-surface w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-primary">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-12 text-left">
          <h1 className="text-lg font-semibold text-primary mb-2">Order Notice</h1>
          <p className="text-sm text-secondary mb-4">
            Order #{id} could not be retrieved from current session history.
          </p>
          <Link to="/" className="btn-primary text-xs py-1.5 px-3">
            Return to Browse
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-8 text-left">
        {/* Order Header */}
        <div className="border border-success/40 bg-success/5 p-4 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-success mb-1">
            ✓ Order & Invoice Confirmed
          </div>
          <h1 className="text-xl font-semibold text-primary tracking-tight">
            Order Reference: {order.id}
          </h1>
          <p className="text-xs text-secondary mt-1">
            Confirmed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString()}. A settlement receipt has been dispatched to{' '}
            <strong>{order.contact.email}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid items-start">
          {/* Purchased Line Items */}
          <div className="col-span-4 md:col-span-8 lg:col-span-8 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary hairline-b pb-1">
              Acquired Lots & Merchandise
            </h2>

            <div className="border border-hairline divide-y divide-hairline">
              {order.items.map(({ item, quantity }) => {
                const price =
                  item.purchaseMode === 'auction'
                    ? (item.currentBid ?? 0)
                    : (item.price ?? 0);

                return (
                  <div key={item.id} className="p-3 flex items-start justify-between gap-3 bg-background">
                    <div className="flex items-start gap-3">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-12 h-12 object-contain border border-hairline bg-surface flex-shrink-0 p-0.5"
                      />
                      <div>
                        <div className="text-xs font-mono text-secondary">LOT #{item.lotNumber}</div>
                        <Link
                          to={`/items/${item.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="text-xs text-secondary mt-0.5">
                          Consignor: {item.seller.name} • {item.specs.condition}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">{formatCurrency(price * quantity)}</div>
                      <div className="text-xs text-secondary">Qty: {quantity}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <Link to="/items" className="btn-secondary text-xs py-1.5 px-3 inline-block">
                ← Continue Catalog Exploration
              </Link>
            </div>
          </div>

          {/* Shipping and Breakdown */}
          <div className="col-span-4 md:col-span-8 lg:col-span-4 space-y-4">
            <div className="border border-hairline p-4 bg-surface text-xs space-y-3">
              <h3 className="font-semibold uppercase tracking-wider text-secondary hairline-b pb-1">
                Settlement Summary
              </h3>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Shipping & Handling:</span>
                  <span className="font-mono">{formatCurrency(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Buyer&apos;s Premium (10%):</span>
                  <span className="font-mono">{formatCurrency(order.buyersPremium)}</span>
                </div>
                <div className="hairline-t pt-2 flex justify-between font-semibold text-sm">
                  <span>Total Paid:</span>
                  <span className="font-mono text-accent">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="border border-hairline p-4 bg-background text-xs space-y-2">
              <h3 className="font-semibold uppercase tracking-wider text-secondary hairline-b pb-1">
                Dispatch Destination
              </h3>
              <p className="font-medium text-primary">
                {order.contact.firstName} {order.contact.lastName}
              </p>
              <p className="text-secondary">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
              </p>
              <p className="text-secondary">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
              </p>
              <p className="text-secondary">{order.shippingAddress.country}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
