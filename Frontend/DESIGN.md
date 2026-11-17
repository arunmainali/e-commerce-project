# DESIGN.md — Auction Studio Design Specifications

Auction Studio combines the functional density of **McMaster-Carr** with the rigorous clarity of the **Swiss / International Typographic Style**.

---

## 1. Grid & Layout Architecture

- **Grid System**:
  - **Desktop (>= 1024px)**: 12 equal modular columns, 24px gutters, max content container 1440px.
  - **Tablet (>= 768px)**: 8 equal columns, 24px gutters.
  - **Mobile (< 768px)**: 4 equal columns, 16px-24px gutters.
- **Rhythm & Spacing Scale**:
  - Strict 8px baseline scale:
    - `0.5` = 4px (micro spacing)
    - `1` = 8px
    - `2` = 16px
    - `3` = 24px
    - `4` = 32px
    - `6` = 48px
    - `8` = 64px
    - `12` = 96px
- **Rules of Division**:
  - Thin 1px hairlines (`#E0E0E0`) divide all sections and data rows.
  - No drop shadows, floating elevations, card glows, or background gradients.

---

## 2. Design Tokens

All tokens are declared as semantic CSS custom properties in `src/index.css` and mapped in `tailwind.config.ts`:

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `background` | `#FFFFFF` | Document background canvas |
| `surface` | `#F5F5F5` | Neutral table headers, filters, image backs, skeleton loaders |
| `hairline` | `#E0E0E0` | 1px border dividers |
| `primary` | `#111111` | Primary text, wordmarks, solid buttons |
| `secondary` | `#666666` | Metadata, lot numbers, subtitles, timestamps |
| `disabled` | `#AAAAAA` | Disabled states, placeholding text |
| `accent` | `#E30613` | Swiss Red: live urgency (<1h remaining), destructive/errors, hover on CTA |
| `success` | `#1A7F37` | Highest bidder indicators, confirmation notices |

---

## 3. Typography & Neo-Grotesque Scale

- **Typeface**: `Inter`, with fallbacks to `Helvetica Neue`, `Arial`, `sans-serif`.
- **Weights**: Strictly limited to 2 weights:
  - Regular (`400`)
  - Semibold (`600`)
- **Sizes**:
  - `xs`: 12px / 16px line-height (metadata, tags, table sub-labels, breadcrumbs)
  - `sm`: 14px / 20px line-height (body copy, filter labels, table cell values)
  - `base`: 16px / 24px line-height (section titles, prices, lead text)
  - `lg`: 24px / 32px line-height (item titles, major section headers)
  - `xl`: 40px / 48px line-height (invoice confirmation headers)
- **Alignment**:
  - All text is flush-left and ragged-right. No centered body text or decorative alignment.

---

## 4. Components & Interactive Rules

- **Buttons**:
  - `.btn-primary`: Solid `#111111` with white text. Transitions to Swiss red `#E30613` on hover.
  - `.btn-secondary`: 1px outline `#111111`. Inverts on hover (`#111111` background, white text).
  - Radius: 0–2px (square, Swiss).
- **Focus Rings**:
  - `outline: 2px solid #111111; outline-offset: 2px;` for full keyboard accessibility without default browser halos.
- **Form Inputs**:
  - Clean hairlines with explicit floating labels above each input. No placeholder-only inputs.
- **Imagery**:
  - Consistently set against light-grey neutral surfaces (`#F5F5F5`) with `object-contain` to maintain technical clarity.
  - Catalog listings: Compact 48px × 48px technical thumbnails with hover preview.
  - Grid mode: Restrained 144px (h-36) technical figure.
  - Detail gallery: Disciplined 256px–288px (h-64/h-72) technical stage image (not oversized 800px banners), with an enlarged inspection viewer.
  - **Zero Price Disappearance Guarantee**: The price is permanently visible beside the image, in the modal inspection viewer, and in a sticky top action bar when scrolling past the fold.
  - **Sticky Left Sidebar Navigation**: The category tree and filter controls stay locked at `top-14` with their own scrollbar during page scrolling, strictly adhering to McMaster-Carr catalog functionality.
