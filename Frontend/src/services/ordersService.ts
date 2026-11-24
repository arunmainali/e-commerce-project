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
  ): Promise<Order & { paymentUrl?: string; pidx?: string }> {
    try {
      const resp = await apiFetch<{ order: Order; payment?: { paymentUrl?: string; pidx?: string } }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          contact,
          shippingAddress,
          cartItemIds: cartItems.map((c) => c.itemId),
        }),
      });

      const order = resp.order;
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

      return {
        ...order,
        paymentUrl: resp.payment?.paymentUrl,
        pidx: resp.payment?.pidx,
      };
    } catch {
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

  async verifyPayment(pidx: string): Promise<{ status: string; transactionId: string; amount: number; message: string }> {
    return await apiFetch('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ pidx }),
    });
  },
};
