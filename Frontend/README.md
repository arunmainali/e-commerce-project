# Auction Studio — Frontend

An online auction house and fine antique marketplace built with React 18, TypeScript, Tailwind CSS, and Vite. Designed under the strict functional principles of **McMaster-Carr** (dense, tabular, utilitarian) and the **Swiss / International Typographic Style** (12-column grid, modular baseline, neo-grotesque typography, monochrome canvas with a single Swiss-red urgency accent).

---

## Quick Start

```bash
# 1. Navigate to the Frontend project directory
cd "e-commerce-project/Frontend"

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit the app at `http://localhost:5173`.

---

## Project Structure

```
Frontend/
├── index.html
├── package.json
├── tailwind.config.ts          # Swiss design tokens & 12-col grid definition
├── vite.config.ts
├── DESIGN.md                   # Complete specification of grid, tokens & rules
└── src/
    ├── App.tsx                 # Route mapping
    ├── main.tsx                # React DOM entry
    ├── index.css               # Hairline borders, buttons, and baseline resets
    ├── types/                  # Typed models: Item, Filters, Order, CartItem, etc.
    ├── mocks/
    │   ├── categories.ts       # 8 departments with hierarchical subcategories
    │   └── items.ts            # ~40 antique & general goods with realistic specs
    ├── services/
    │   ├── itemsService.ts     # Search, filter, category, ending soon queries
    │   ├── bidsService.ts      # Validations, increment calculation, bid history
    │   ├── ordersService.ts    # Checkout and invoice calculation (10% buyer's premium)
    │   └── authService.ts      # Lightweight authentication mock
    ├── store/
    │   ├── cartStore.ts        # Zustand store persisted to localStorage
    │   ├── wishlistStore.ts    # Zustand store persisted to localStorage
    │   ├── authStore.ts        # Session auth store
    │   └── toastStore.ts       # Non-intrusive status toast notifications
    ├── components/
    │   ├── Header.tsx          # Wordmark, SearchBar, Wishlist & Cart badges
    │   ├── SearchBar.tsx       # Debounced auto-complete dropdown
    │   ├── CategoryTree.tsx    # Collapsible hierarchical department tree
    │   ├── FilterPanel.tsx     # Format, price range, era, condition, end time
    │   ├── ItemRow.tsx         # McMaster-Carr dense tabular row view
    │   ├── ItemCard.tsx        # Modular grid card view
    │   ├── PriceBlock.tsx      # Current bid/price with live countdown
    │   ├── Countdown.tsx       # 1-second countdown, Swiss-red under 1 hour
    │   ├── BidForm.tsx         # Minimum bid validation & confirmation step
    │   ├── WishlistButton.tsx  # Toggle with visual feedback
    │   ├── SpecsTable.tsx      # Tabular specifications (Era, Origin, Material, etc.)
    │   ├── BidHistoryTable.tsx # Live sorted bid log with highest bidder tag
    │   ├── Breadcrumbs.tsx     # Department navigation crumbs
    │   ├── Pagination.tsx      # Numbered page control
    │   ├── EmptyState.tsx      # Plain-language zero-state message
    │   ├── Skeleton.tsx        # Grey pulse loading state placeholders
    │   ├── Toast.tsx           # Bottom-left non-blocking feedback
    │   └── Footer.tsx          # 4-column structured footer
    └── pages/
        ├── BrowsePage.tsx      # Catalog browsing, dual-view, drawer filters
        ├── ItemDetailPage.tsx  # 7/5 grid gallery, specs, sticky bid box
        ├── WishlistPage.tsx    # Saved lots table with quick bidding/cart
        ├── CartPage.tsx        # Line-item table, fees breakdown, settlement
        ├── CheckoutPage.tsx    # 3-step numbered form: Contact, Shipping, Payment
        ├── OrderConfirmationPage.tsx # Receipt with itemized breakdown
        ├── AuthPage.tsx        # Sign in & registration toggle
        └── AccountPage.tsx     # Active bids, won items ready for payment, orders
```

---

## Swapping Mock Data for a Real REST API

All data calls are abstracted in `src/services/` (`itemsService.ts`, `bidsService.ts`, `ordersService.ts`, `authService.ts`). The UI components and Zustand stores do not know whether data comes from local memory or network endpoints.

To switch to a live REST backend:

1. **Items Endpoint (`itemsService.ts`)**:
   - Replace the in-memory array filtering with `fetch('/api/v1/items?' + new URLSearchParams(filters))`
   - Update `getItemById(id)` to call `fetch(`/api/v1/items/${id}`)`
2. **Bidding (`bidsService.ts`)**:
   - Update `placeBid` to send `POST /api/v1/items/:id/bids` with `{ amount, bidder }`
   - WebSocket or Server-Sent Events (SSE) can be attached to `Countdown` or `BidHistoryTable` to listen for realtime outbid notifications.
3. **Checkout (`ordersService.ts`)**:
   - Update `placeOrder` to post cart payload to `POST /api/v1/checkout` and return real payment gateway intent or invoice numbers.
