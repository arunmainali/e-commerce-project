export type PurchaseMode = 'auction' | 'buy-now';

export type ItemCondition = 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'As Found';

export type CategorySlug =
  | 'antiques'
  | 'furniture'
  | 'ceramics-glass'
  | 'clocks-watches'
  | 'art'
  | 'jewellery'
  | 'books-maps'
  | 'general';

export interface ItemSpecs {
  era?: string;
  origin?: string;
  material?: string;
  dimensions?: string;
  condition: ItemCondition;
  provenance?: string;
  [key: string]: string | undefined;
}

export interface BidHistoryEntry {
  bidder: string;
  amount: number;
  timestamp: string;
}

export interface Seller {
  name: string;
  rating: number;
  location: string;
}

export interface ShippingInfo {
  cost: number;
  estimatedDays: string;
  methods: string[];
}

export interface Item {
  id: string;
  sellerId?: string;
  title: string;
  lotNumber: string;
  category: CategorySlug;
  subcategory: string;
  description: string;
  specs: ItemSpecs;
  images: string[];
  purchaseMode: PurchaseMode;
  status?: string;
  // Buy Now fields
  price?: number;
  stock?: number;
  // Auction fields
  currentBid?: number;
  startingBid?: number;
  minimumIncrement?: number;
  bidCount?: number;
  endTime?: string;
  bidHistory?: BidHistoryEntry[];
  // Common
  seller: Seller;
  shipping: ShippingInfo;
}

export interface CategoryNode {
  id: string;
  label: string;
  slug: CategorySlug;
  children?: { id: string; label: string; slug: string }[];
}

export interface CartItem {
  itemId: string;
  quantity: number;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PaymentInfo {
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
}

export interface Order {
  id: string;
  items: { item: Item; quantity: number }[];
  contact: ContactInfo;
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingCost: number;
  buyersPremium: number;
  total: number;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmountPaisa?: number;
  pidx?: string;
  transactionId?: string;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Filters {
  category?: CategorySlug;
  subcategory?: string;
  q?: string;
  purchaseMode?: PurchaseMode;
  priceMin?: number;
  priceMax?: number;
  era?: string;
  condition?: ItemCondition;
  endingWithin?: string;
  sort?: 'ending-soon' | 'price-asc' | 'price-desc' | 'newest' | 'bids';
  page?: number;
}

export type ViewMode = 'grid' | 'list';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface CreateItemInput {
  title: string;
  category: CategorySlug;
  subcategory?: string;
  description: string;
  specs: {
    era?: string;
    origin?: string;
    material?: string;
    dimensions?: string;
    condition: ItemCondition;
    provenance?: string;
  };
  images: string[];
  purchaseMode: PurchaseMode;
  price?: number;
  stock?: number;
  startingBid?: number;
  minimumIncrement?: number;
  endTime?: string;
  shippingCost?: number;
  estimatedDays?: string;
  shippingMethods?: string[];
}
