import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { ordersService } from '../services/ordersService';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/format';

type PaymentState = 'verifying' | 'completed' | 'canceled' | 'pending' | 'expired' | 'failed';

export const KhaltiCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((state) => state.clearCart);

  const pidx = searchParams.get('pidx') || '';
  const urlStatus = searchParams.get('status') || '';
  const purchaseOrderId = searchParams.get('purchase_order_id') || searchParams.get('order_id') || '';
  const rawAmount = searchParams.get('amount');

  const [paymentState, setPaymentState] = useState<PaymentState>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>(searchParams.get('transaction_id') || searchParams.get('tidx') || '');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>(purchaseOrderId);
  const [confirmedAmount, setConfirmedAmount] = useState<number>(rawAmount ? parseInt(rawAmount, 10) / 100 : 0);

  // Prevent double invocation in React StrictMode
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    // Handle early cancellation if reported in URL query
    if (urlStatus === 'User canceled' || urlStatus === 'Canceled') {
      setPaymentState('canceled');
      if (pidx) {
        // Notify backend so order payment_status is transitioned to CANCELED
        ordersService.verifyKhalti(pidx).catch(() => {});
      }
      return;
    }

    if (!pidx) {
      setPaymentState('failed');
      setErrorMessage('Missing unique payment identifier (pidx). Unable to verify transaction.');
      return;
    }

    // Server-side verification: Do NOT trust client query params alone
    ordersService.verifyKhalti(pidx)
      .then((res) => {
        if (res.status === 'Completed') {
          setPaymentState('completed');
          setTransactionId(res.transactionId || 'N/A');
          if (res.orderId) setConfirmedOrderId(res.orderId);
          if (res.amount) setConfirmedAmount(res.amount);
          // Safely clear cart upon verified completion
          clearCart();
        } else if (res.status === 'User canceled') {
          setPaymentState('canceled');
        } else if (res.status === 'Pending') {
          setPaymentState('pending');
        } else if (res.status === 'Expired') {
          setPaymentState('expired');
        } else {
          setPaymentState('failed');
          setErrorMessage(res.message || `Payment status returned: ${res.status}`);
        }
      })
      .catch((err: any) => {
        setPaymentState('failed');
        setErrorMessage(err?.message || 'Failed to verify payment with server.');
      });
  }, [pidx, urlStatus, clearCart]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-full border border-hairline bg-surface/30 p-6 md:p-8 space-y-6">

          {/* VERIFYING STATE */}
          {paymentState === 'verifying' && (
            <div className="text-center py-10 space-y-4">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Verifying Khalti Payment
              </h1>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Please wait while we perform secure server-to-server confirmation with the Khalti gateway. Do not refresh this window.
              </p>
              {pidx && (
                <div className="text-[11px] font-mono text-secondary">
                  PIDX: {pidx}
                </div>
              )}
            </div>
          )}

          {/* COMPLETED SUCCESS STATE */}
          {paymentState === 'completed' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3 border-b border-hairline pb-4">
                <div className="w-8 h-8 bg-green-900/40 text-green-400 border border-green-700/50 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Khalti Payment Completed
                  </h1>
                  <p className="text-xs text-secondary">
                    Transaction verified successfully. Your invoice is marked as paid.
                  </p>
                </div>
              </div>

              {/* Transaction Receipt Details */}
              <div className="border border-hairline bg-surface/50 divide-y divide-hairline text-xs">
                {confirmedOrderId && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-secondary font-mono uppercase">Order ID</span>
                    <span className="font-mono font-semibold text-primary">{confirmedOrderId}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-secondary font-mono uppercase">Khalti Transaction ID</span>
                  <span className="font-mono font-semibold text-primary">{transactionId || 'N/A'}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-secondary font-mono uppercase">Payment Gateway</span>
                  <span className="font-medium text-purple-400">Khalti ePayment (KPG-2 Sandbox)</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-secondary font-mono uppercase">Verification Status</span>
                  <span className="inline-block px-2 py-0.5 bg-green-950 text-green-400 border border-green-800 text-[10px] font-mono font-semibold uppercase">
                    COMPLETED (PAID)
                  </span>
                </div>
                {confirmedAmount > 0 && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-secondary font-mono uppercase">Total Paid</span>
                    <span className="font-mono font-semibold text-sm text-primary">
                      {formatCurrency(confirmedAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface/20 border border-hairline text-xs text-secondary leading-relaxed">
                ℹ Your purchase is now recorded in your collector account under{' '}
                <strong className="text-primary font-semibold">Historical Orders &amp; Paid Invoices</strong>.
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {confirmedOrderId && (
                  <Link
                    to={`/order/${confirmedOrderId}`}
                    className="btn-primary text-xs py-2 px-4 font-semibold"
                  >
                    View Official Order Receipt →
                  </Link>
                )}
                <Link
                  to="/account"
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Go to Account Orders &amp; Invoices
                </Link>
                <Link
                  to="/items"
                  className="text-xs text-secondary hover:text-primary hover:underline py-2 px-2"
                >
                  Continue Browsing
                </Link>
              </div>
            </div>
          )}

          {/* CANCELED STATE */}
          {paymentState === 'canceled' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3 border-b border-hairline pb-4">
                <div className="w-8 h-8 bg-amber-900/40 text-amber-400 border border-amber-700/50 flex items-center justify-center font-bold text-sm">
                  !
                </div>
                <div>
                  <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Payment Canceled
                  </h1>
                  <p className="text-xs text-secondary">
                    You canceled the payment session on Khalti. No charges were made.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface/40 border border-hairline text-xs text-secondary space-y-2">
                <p>
                  Order <span className="font-mono text-primary font-semibold">{confirmedOrderId || 'N/A'}</span> remains unpaid in pending status.
                </p>
                <p>
                  You can retry payment whenever you are ready.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="btn-primary text-xs py-2 px-4 font-semibold"
                >
                  Return to Checkout →
                </button>
                <Link
                  to="/cart"
                  className="btn-secondary text-xs py-2 px-4"
                >
                  View Cart
                </Link>
              </div>
            </div>
          )}

          {/* PENDING STATE */}
          {paymentState === 'pending' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3 border-b border-hairline pb-4">
                <div className="w-8 h-8 bg-blue-900/40 text-blue-400 border border-blue-700/50 flex items-center justify-center font-bold text-sm">
                  ⏳
                </div>
                <div>
                  <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Payment Pending
                  </h1>
                  <p className="text-xs text-secondary">
                    Your Khalti payment is pending customer or bank confirmation.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface/40 border border-hairline text-xs text-secondary space-y-2">
                <p>
                  Once Khalti confirms settlement, your order will automatically be updated to paid.
                </p>
                {pidx && (
                  <div className="font-mono text-[11px] text-secondary">PIDX: {pidx}</div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-primary text-xs py-2 px-4 font-semibold"
                >
                  Recheck Status ↻
                </button>
                <Link to="/account" className="btn-secondary text-xs py-2 px-4">
                  Go to Account
                </Link>
              </div>
            </div>
          )}

          {/* EXPIRED STATE */}
          {paymentState === 'expired' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3 border-b border-hairline pb-4">
                <div className="w-8 h-8 bg-red-900/40 text-red-400 border border-red-700/50 flex items-center justify-center font-bold text-sm">
                  ✕
                </div>
                <div>
                  <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Payment Session Expired
                  </h1>
                  <p className="text-xs text-secondary">
                    The Khalti sandbox session expired before completion.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface/40 border border-hairline text-xs text-secondary">
                Please return to checkout to initiate a fresh payment request.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="btn-primary text-xs py-2 px-4 font-semibold"
                >
                  Initiate New Payment →
                </button>
                <Link to="/cart" className="btn-secondary text-xs py-2 px-4">
                  Return to Cart
                </Link>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {paymentState === 'failed' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-3 border-b border-hairline pb-4">
                <div className="w-8 h-8 bg-red-900/40 text-red-400 border border-red-700/50 flex items-center justify-center font-bold text-sm">
                  ✕
                </div>
                <div>
                  <h1 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Payment Verification Failed
                  </h1>
                  <p className="text-xs text-secondary">
                    We were unable to verify this transaction.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface/40 border border-hairline text-xs text-red-400 font-mono space-y-2">
                <p>{errorMessage || 'Gateway reported an unrecoverable verification error.'}</p>
                {pidx && <p className="text-secondary text-[11px]">PIDX: {pidx}</p>}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="btn-primary text-xs py-2 px-4 font-semibold"
                >
                  Retry Payment at Checkout
                </button>
                <Link to="/account" className="btn-secondary text-xs py-2 px-4">
                  Account Dashboard
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
      <Toast />
    </div>
  );
};
