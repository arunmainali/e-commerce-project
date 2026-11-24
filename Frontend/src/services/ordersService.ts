import type { Order, ContactInfo, ShippingAddress, CartItem, Item } from '../types';
import { apiFetch } from './api';
import { itemsService } from './itemsService';
import { mockItems } from '../mocks/items';
import { trackPurchase } from './analytics';

let orderCounter = 1000;
const orders: Order[] = [];

export const ordersService = {
  async placeOrder(
    cartItems: CartItem[],
    contact: ContactInfo,
    shippingAddress: ShippingAddress,
    paymentMethod: 'khalti' | 'card' = 'khalti',
  ): Promise<Order & { paymentUrl?: string; pidx?: string }> {
    try {
      const resp = await apiFetch<{ order: Order; payment?: { paymentUrl?: string; pidx?: string } }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          contact,
          shippingAddress,
          cartItemIds: cartItems.map((c) => c.itemId),
          returnOrigin: window.location.origin,
          paymentMethod,
        }),
      });

      const order = resp.order;
      if (paymentMethod === 'card') {
        if (order.items) {
          order.items.forEach((it) => {
            if (it.item?.id) {
              itemsService.markAsSold(it.item.id);
            } else if ((it as any).itemId) {
              itemsService.markAsSold((it as any).itemId);
            }
          });
        }
        cartItems.forEach((ci) => itemsService.markAsSold(ci.itemId));
      }

      trackPurchase(
        order.id,
        order.total,
        (order.items || []).map((i: any) => ({
          id: i.item?.id || i.itemId || '',
          title: i.item?.title || i.title || 'Catalog Item',
          price: i.item
            ? (i.item.purchaseMode === 'auction' ? (i.item.currentBid ?? 0) : (i.item.price ?? 0))
            : (i.price ?? 0),
          quantity: i.quantity || 1,
        }))
      );

      let paymentUrl = resp.payment?.paymentUrl;
      let pidx = resp.payment?.pidx;

      if (paymentMethod === 'khalti' && !paymentUrl && order.id) {
        const initResp = await ordersService.initiateKhalti(order.id);
        if (initResp && initResp.paymentUrl) {
          paymentUrl = initResp.paymentUrl;
          pidx = initResp.pidx;
        }
      }

      return {
        ...order,
        paymentUrl,
        pidx,
      };
    } catch (apiErr: any) {
      // Only fall back to offline mock mode on actual network disconnect errors, not HTTP 400/401/500 API errors
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      if (
        !msg.includes('Failed to fetch') &&
        !msg.includes('NetworkError') &&
        !msg.includes('Load failed')
      ) {
        throw apiErr;
      }
      console.warn('Network unreachable, using offline fallback:', apiErr);
      // Offline fallback
      const resolvedItems: { item: Item; quantity: number }[] = [];
      let subtotal = 0;
      let shippingCost = 0;

      for (const ci of cartItems) {
        const item = mockItems.find((i) => i.id === ci.itemId);
        if (!item) continue;
        resolvedItems.push({ item, quantity: ci.quantity });
        const price = item.purchaseMode === 'auction' ? (item.currentBid ?? 0) : (item.price ?? 0);
        subtotal += price * ci.quantity;
        shippingCost += item.shipping.cost;
      }

      const buyersPremium = Math.round(subtotal * 0.1);
      const total = subtotal + shippingCost + buyersPremium;

      const order: Order = {
        id: `ORD-${++orderCounter}`,
        items: resolvedItems,
        contact,
        shippingAddress,
        subtotal,
        shippingCost,
        buyersPremium,
        total,
        createdAt: new Date().toISOString(),
      };

      orders.push(order);
      for (const ci of cartItems) {
        itemsService.markAsSold(ci.itemId);
      }
      trackPurchase(
        order.id,
        order.total,
        order.items.map((i) => ({
          id: i.item.id,
          title: i.item.title,
          price: i.item.purchaseMode === 'auction' ? (i.item.currentBid ?? 0) : (i.item.price ?? 0),
          quantity: i.quantity,
        }))
      );

      return order;
    }
  },

  async getOrders(): Promise<Order[]> {
    try {
      return await apiFetch<Order[]>('/orders');
    } catch {
      return [...orders];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const resp = await apiFetch<any>(`/orders/${id}`);
      if (!resp) return null;

      // Normalize items if backend returns flat OrderItem { itemId, title, quantity, price }
      if (Array.isArray(resp.items)) {
        const normalizedItems = resp.items.map((it: any) => {
          if (it.item) return it;
          return {
            item: {
              id: it.itemId || it.id,
              title: it.title || 'Catalog Item',
              lotNumber: it.lotNumber || 'N/A',
              category: it.category || 'general',
              subcategory: it.subcategory || '',
              description: it.description || '',
              specs: it.specs || { condition: 'Good' },
              images: it.images && it.images.length ? it.images : ['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80'],
              purchaseMode: it.purchaseMode || 'buy-now',
              price: it.price,
              seller: it.seller || { name: 'AuctionStudio Specialist', rating: 5.0, location: 'Kathmandu' },
              shipping: it.shipping || { cost: 0, estimatedDays: '3-5 days', methods: ['Standard Courier'] },
            },
            quantity: it.quantity || 1,
          };
        });
        resp.items = normalizedItems;
      }
      return resp as Order;
    } catch {
      return orders.find((o) => o.id === id) ?? null;
    }
  },

  async initiateKhalti(orderId: string): Promise<{ pidx: string; paymentUrl: string; expiresAt: string }> {
    return await apiFetch('/payments/khalti/initiate', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, orderId, returnOrigin: window.location.origin }),
    });
  },

  async verifyKhalti(pidx: string): Promise<{ status: string; transactionId: string; amount: number; orderId?: string; message: string }> {
    return await apiFetch('/payments/khalti/verify', {
      method: 'POST',
      body: JSON.stringify({ pidx }),
    });
  },

  async verifyPayment(pidx: string): Promise<{ status: string; transactionId: string; amount: number; orderId?: string; message: string }> {
    return await apiFetch('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ pidx }),
    });
  },
};
