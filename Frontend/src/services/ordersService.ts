import type { Order, ContactInfo, ShippingAddress, CartItem, Item } from '../types';
import { mockItems } from '../mocks/items';

function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let orderCounter = 1000;
const orders: Order[] = [];

export const ordersService = {
  async placeOrder(
    cartItems: CartItem[],
    contact: ContactInfo,
    shippingAddress: ShippingAddress,
  ): Promise<Order> {
    await delay(500);

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

    const buyersPremium = Math.round(subtotal * 0.1 * 100) / 100;
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
    return order;
  },

  async getOrders(): Promise<Order[]> {
    await delay();
    return [...orders];
  },

  async getOrderById(id: string): Promise<Order | null> {
    await delay();
    return orders.find((o) => o.id === id) ?? null;
  },
};
