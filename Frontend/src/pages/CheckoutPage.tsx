import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { SafeImage } from '../components/SafeImage';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { itemsService } from '../services/itemsService';
import { ordersService } from '../services/ordersService';
import { formatCurrency } from '../utils/format';
import { trackBeginCheckout } from '../services/analytics';
import type { Item, ContactInfo, ShippingAddress, PaymentInfo } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const addToast = useToastStore((state) => state.addToast);

  const [resolvedItems, setResolvedItems] = useState<{ item: Item; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Form State
  const [contact, setContact] = useState<ContactInfo>({
    firstName: 'Jane',
    lastName: 'Collector',
    email: 'jane@example.com',
    phone: '+1 (555) 019-2834',
  });

  const [shipping, setShipping] = useState<ShippingAddress>({
    line1: '742 Evergreen Terrace',
    line2: '',
    city: 'Springfield',
    state: 'OR',
    zip: '97477',
    country: 'United States',
  });

  const [payment, setPayment] = useState<PaymentInfo>({
    cardNumber: '4532 •••• •••• 8892',
    expiry: '12/28',
    cvv: '891',
    nameOnCard: 'Jane Collector',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isSubmittingRef.current) {
      return;
    }
    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    setLoading(true);
    Promise.all(
      cartItems.map(async (ci) => {
        const item = await itemsService.getItemById(ci.itemId);
        return item ? { item, quantity: ci.quantity } : null;
      })
    )
      .then((res) => {
        setResolvedItems(res.filter((r): r is { item: Item; quantity: number } => r !== null));
      })
      .finally(() => setLoading(false));
  }, [cartItems, navigate]);

  const subtotal = resolvedItems.reduce((acc, curr) => {
    const price =
      curr.item.purchaseMode === 'auction'
        ? (curr.item.currentBid ?? 0)
        : (curr.item.price ?? 0);
    return acc + price * curr.quantity;
  }, 0);

  const shippingCost = resolvedItems.reduce(
    (acc, curr) => acc + curr.item.shipping.cost * curr.quantity,
    0
  );

  const buyersPremium = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + shippingCost + buyersPremium;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!contact.firstName.trim()) errs.firstName = 'First name is required';
    if (!contact.lastName.trim()) errs.lastName = 'Last name is required';
    if (!contact.email.trim() || !contact.email.includes('@')) errs.email = 'Valid email is required';
    if (!shipping.line1.trim()) errs.line1 = 'Address line 1 is required';
    if (!shipping.city.trim()) errs.city = 'City is required';
    if (!shipping.zip.trim()) errs.zip = 'Postal code is required';
    if (!payment.cardNumber.trim()) errs.cardNumber = 'Card number is required';
    if (!payment.expiry.trim()) errs.expiry = 'Expiration date is required';
    if (!payment.cvv.trim()) errs.cvv = 'CVV is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please complete all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    try {
      const order = await ordersService.placeOrder(cartItems, contact, shipping);
      clearCart();
      addToast('Order confirmed successfully!', 'success');

      if (order.paymentUrl && order.paymentUrl.startsWith('http') && !order.paymentUrl.includes('mock_ready')) {
        window.location.href = order.paymentUrl;
        return;
      }

      navigate(`/order/${order.id}`, { state: { order }, replace: true });
    } catch (err: unknown) {
      isSubmittingRef.current = false;
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      addToast(msg, 'error');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-primary">
        <Header />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 animate-pulse">
          <div className="h-6 bg-surface w-1/4 mb-6" />
          <div className="h-64 bg-surface w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 py-6 text-left">
        <h1 className="text-lg font-semibold text-primary hairline-b pb-3 mb-6">
          Order Settlement & Checkout
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-grid items-start">
            {/* Left 7 cols: Three Clearly Numbered Sequential Sections */}
            <div className="col-span-4 md:col-span-8 lg:col-span-7 space-y-8">
              {/* SECTION 1: CONTACT */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 hairline-b pb-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs font-semibold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Buyer Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.firstName ? 'border-accent' : ''}`}
                      value={contact.firstName}
                      onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                    />
                    {errors.firstName && (
                      <span className="text-[11px] text-accent mt-0.5 block">{errors.firstName}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.lastName ? 'border-accent' : ''}`}
                      value={contact.lastName}
                      onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                    />
                    {errors.lastName && (
                      <span className="text-[11px] text-accent mt-0.5 block">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      className={`input-field ${errors.email ? 'border-accent' : ''}`}
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    />
                    {errors.email && (
                      <span className="text-[11px] text-accent mt-0.5 block">{errors.email}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 2: SHIPPING */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 hairline-b pb-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs font-semibold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Delivery Address
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    className={`input-field ${errors.line1 ? 'border-accent' : ''}`}
                    value={shipping.line1}
                    onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                  />
                  {errors.line1 && (
                    <span className="text-[11px] text-accent mt-0.5 block">{errors.line1}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Apartment, Suite, Unit (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={shipping.line2}
                    onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.city ? 'border-accent' : ''}`}
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    />
                    {errors.city && (
                      <span className="text-[11px] text-accent mt-0.5 block">{errors.city}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={shipping.state}
                      onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      ZIP / Postal Code *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.zip ? 'border-accent' : ''}`}
                      value={shipping.zip}
                      onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                    />
                    {errors.zip && (
                      <span className="text-[11px] text-accent mt-0.5 block">{errors.zip}</span>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 3: PAYMENT */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 hairline-b pb-2">
                  <span className="w-5 h-5 bg-primary text-white text-xs font-semibold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Payment Method
                  </h2>
                </div>

                <div className="p-3 bg-surface border border-hairline space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Name on Card *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={payment.nameOnCard}
                      onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      className={`input-field ${errors.cardNumber ? 'border-accent' : ''}`}
                      value={payment.cardNumber}
                      onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })}
                    />
                    {errors.cardNumber && (
                      <span className="text-[11px] text-accent mt-0.5 block">
                        {errors.cardNumber}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Expiry (MM/YY) *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className={`input-field ${errors.expiry ? 'border-accent' : ''}`}
                        value={payment.expiry}
                        onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                      />
                      {errors.expiry && (
                        <span className="text-[11px] text-accent mt-0.5 block">{errors.expiry}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Security Code (CVV) *
                      </label>
                      <input
                        type="text"
                        placeholder="3-4 digits"
                        className={`input-field ${errors.cvv ? 'border-accent' : ''}`}
                        value={payment.cvv}
                        onChange={(e) => setPayment({ ...payment, cvv: e.target.value })}
                      />
                      {errors.cvv && (
                        <span className="text-[11px] text-accent mt-0.5 block">{errors.cvv}</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Submit CTA */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3 text-sm font-semibold tracking-wide"
                >
                  {isSubmitting
                    ? 'Processing Payment...'
                    : `Authorize & Place Order • ${formatCurrency(total)}`}
                </button>
                <p className="text-[11px] text-secondary mt-2">
                  By completing this purchase, you agree to the conditions of sale, storage rules, and release liability.
                </p>
              </div>
            </div>

            {/* Right 5 cols: Sticky Order Review */}
            <div className="col-span-4 md:col-span-8 lg:col-span-5 bg-surface p-4 border border-hairline lg:sticky lg:top-20">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary hairline-b pb-2 mb-3">
                Review Line Items ({resolvedItems.length})
              </h2>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {resolvedItems.map(({ item, quantity }) => {
                  const price =
                    item.purchaseMode === 'auction'
                      ? (item.currentBid ?? 0)
                      : (item.price ?? 0);

                  return (
                    <div key={item.id} className="flex items-start gap-2.5 text-xs hairline-b pb-2">
                      <SafeImage
                        src={item.images[0]}
                        alt={item.title}
                        className="w-10 h-10 object-contain p-0.5 bg-background border border-hairline flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary truncate">{item.title}</div>
                        <div className="text-secondary font-mono">Lot {item.lotNumber} • Qty {quantity}</div>
                      </div>
                      <div className="font-mono font-medium">{formatCurrency(price * quantity)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-xs text-primary mb-3">
                <div className="flex justify-between">
                  <span className="text-secondary">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Shipping & Insurance:</span>
                  <span className="font-mono">{formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Buyer&apos;s Premium (10%):</span>
                  <span className="font-mono">{formatCurrency(buyersPremium)}</span>
                </div>
                <div className="hairline-t pt-2 mt-2 flex justify-between font-semibold text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-accent">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
