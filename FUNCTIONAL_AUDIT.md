# Functional Audit Report — Tsuyanouchi (`gemini/tsuyanouchi`)

**Audited by:** Senior Full-Stack QA Engineer (AI)  
**Date:** March 2026  
**Project root:** `gemini/tsuyanouchi`  
**Stack:** Next.js 15 App Router · TypeScript · Supabase · Stripe · Tailwind CSS  
**Method:** Sequential reasoning + Context7 (Next.js official docs)

---

## Priority Summary

| # | Severity | Issue | File(s) |
|---|----------|-------|---------|
| 1 | 🔴 Critical | Checkout never charges a card — payment not captured | `app/checkout/page.tsx` |
| 2 | 🔴 Critical | `CartDrawer.tsx` imports `./ui/Button` (capital B) — TypeScript compile error | `components/CartDrawer.tsx` |
| 3 | 🔴 Critical | Newsletter Subscribe button does nothing | `app/page.tsx` |
| 4 | 🟠 High | `/account` page is unreachable — no nav/footer link anywhere | `components/navbar.tsx`, `components/footer.tsx` |
| 5 | 🟡 Medium | "BEST SELLERS" sort is identical to "NEW ARRIVALS" | `app/shop/shop-client.tsx` |
| 6 | 🟡 Medium | Admin Sales chart shows simulated/fake data | `app/admin/admin-client.tsx` |
| 7 | 🟡 Medium | No custom `not-found.tsx` page — Next.js default 404 served | `app/shop/[slug]/page.tsx` |
| 8 | 🟡 Medium | `/cart` page unreachable from Navbar | `components/navbar.tsx` |
| 9 | 🟡 Medium | Dead SPA-era components in codebase — risk of TS errors and confusion | `components/CartDrawer.tsx`, `ProductCard.tsx`, `Layout.tsx` |
| 10 | 🟢 Low | No image fallback — broken `<img>` if product has no image | `components/product-card.tsx` |
| 11 | 🟢 Low | Checkout restricted to 5 countries; others silently fail | `app/checkout/page.tsx` |
| 12 | 🟢 Low | No `public/` directory — all images from external URLs | — |

---

## Broken Links

### 1. `/account` page is completely unreachable via navigation
**Files:** `components/navbar.tsx` (all lines), `components/footer.tsx` (lines 24–27)

The Navbar contains only `HOME`, `SHOP`, favourites icon, and cart icon. The Account (`User`) icon **present in the root project's navbar has been removed here**. The Footer's Navigate section lists only Home, Shop, Favourites — Account is absent. The page at `app/account/page.tsx` exists and renders correctly, but there is zero navigation pointing to it.

**Fix:**
```tsx
// components/navbar.tsx — add Account icon alongside Heart icon
import { Heart, User } from 'lucide-react';

// In the Icons section (after the Heart link):
<Link href="/account" className="relative text-[#2D2A26] hover:text-[#786B59] transition-colors">
  <User size={22} className={pathname === '/account' ? "fill-[#2D2A26]" : ""} />
</Link>
```
Also add to `components/footer.tsx` Navigate list:
```tsx
<li><Link href="/account" className="hover:text-[#2D2A26]">Account</Link></li>
```

---

### 2. `/cart` page unreachable from Navbar
**File:** `components/navbar.tsx`

The Navbar has no link to `/cart`. The only route to the cart page is from the Cart Drawer's "Checkout" button (which goes directly to `/checkout`, not `/cart`) or by typing the URL directly. The `/cart` page is a full standalone page with a working `Back to Cart` link on `/checkout`, but users can't get there from the nav.

**Fix:** Either add a direct link `<Link href="/cart">` on the ShoppingBag icon, or confirm the cart page is intentionally hidden and remove it.

---

## Non-functional Buttons

### 1. Newsletter "Subscribe" button — no handler, no form
**File:** `app/page.tsx`, lines 87–93

```tsx
<div className="flex gap-2">
  <input type="email" placeholder="Email address" ... />
  <Button className="bg-[#F9F8F4] text-[#2D2A26] hover:bg-[#E5E0D8]">Subscribe</Button>
</div>
```

The email input and Subscribe button are inside a plain `<div>`, not a `<form>`. The Button has no `onClick` handler and no `type="submit"`. Nothing happens when clicked. No API is called.

**Fix:** Replace the `<div>` wrapper with a `<form>` connected to `/api/waitlist` (which already handles email validation and deduplication). The `WaitlistForm` component at `app/under-construction/waitlist-form.tsx` is the exact pattern to follow:

```tsx
// app/page.tsx — replace the newsletter section's <div className="flex gap-2"> with:
import { WaitlistForm } from '@/app/under-construction/waitlist-form';

// Or inline it directly:
'use client';
// ...
const [email, setEmail] = useState('');
const [submitted, setSubmitted] = useState(false);

const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();
  await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  setSubmitted(true);
};

// In JSX:
<form onSubmit={handleSubscribe} className="flex gap-2">
  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required ... />
  <Button type="submit">Subscribe</Button>
</form>
{submitted && <p className="text-sm text-[#F9F8F4]/70 mt-2">You're on the list.</p>}
```

---

### 2. `CartDrawer.tsx` (PascalCase) — Checkout button shows `alert()`
**File:** `components/CartDrawer.tsx`, line 111

```tsx
<Button className="w-full" disabled={items.length === 0}
  onClick={() => alert('Checkout functionality coming soon!')}>
  Checkout
</Button>
```

This is the **old SPA-era CartDrawer** component (not the one currently used by the Navbar). It is not imported by any page, but if it ever were rendered, clicking Checkout would show a browser `alert()` instead of navigating anywhere. This file should be deleted (see Dead Code section).

---

## Form Issues

### 1. Checkout — Stripe PaymentIntent created but card never captured
**File:** `app/checkout/page.tsx`, lines 99–170

This is the most severe functional bug in the entire codebase. The `onSubmit` handler:

1. **Creates** a Stripe `PaymentIntent` via `POST /api/payments/create-intent` ✓  
2. **Receives** `{ clientSecret, paymentIntentId }` from the API  
3. **Discards `clientSecret` entirely** — only `paymentIntentId` is destructured (line 120)  
4. **Creates** an order in Supabase with `status: 'pending'`  
5. **Calls `clearCart()`** and **redirects to `/thank-you`**  

There is no `<CardElement>`, no `<PaymentElement>`, no `stripe.confirmCardPayment()` call. **Users are shown a success page and their cart is cleared, but no payment was ever charged.** The PaymentIntent will sit in your Stripe dashboard as `requires_payment_method` indefinitely.

Additionally, since no payment is ever confirmed, the Stripe webhook (`app/api/webhooks/stripe/route.ts`) will never fire — meaning all orders stay `pending` forever and no confirmation emails are ever sent via Resend.

**Fix:** Install `@stripe/stripe-js` and `@stripe/react-stripe-js`, collect card details with `<PaymentElement>`, and call `stripe.confirmPayment()` before creating the order. The `clientSecret` from the API response is the required input:

```tsx
// 1. npm install @stripe/stripe-js @stripe/react-stripe-js
// 2. Wrap <CheckoutPage> in <Elements stripe={stripePromise} options={{ clientSecret }}>
// 3. Add <PaymentElement /> in the form after Shipping Method
// 4. In onSubmit, BEFORE router.push('/thank-you'):
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: `${window.location.origin}/thank-you?orderId=${orderId}` },
  redirect: 'if_required',
});
if (error) {
  alert(error.message);
  setIsProcessing(false);
  return;
}
// ONLY then create the order and redirect
```

---

### 2. Admin product form — no `<form>` wrapper on "Save Product"
**File:** `app/admin/admin-client.tsx`, lines 983–990

The product editing panel uses individual `<input>` and `<textarea>` elements with `value`/`onChange` handlers, and a `<Button onClick={handleSave}>` — but they are not inside a `<form>`. This is not a breaking bug (the onClick works), but pressing `Enter` in any input field will not save the product, which is unexpected behaviour.

**Fix:** Wrap the admin product form in `<form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>`.

---

## Missing Routes

All defined Next.js App Router pages map to existing files. No orphaned routes detected.

| Route | Page file | Status |
|-------|-----------|--------|
| `/` | `app/page.tsx` | ✅ |
| `/shop` | `app/shop/page.tsx` | ✅ |
| `/shop/[slug]` | `app/shop/[slug]/page.tsx` | ✅ |
| `/cart` | `app/cart/page.tsx` | ✅ (exists, unreachable from nav) |
| `/checkout` | `app/checkout/page.tsx` | ✅ |
| `/favourites` | `app/favourites/page.tsx` | ✅ |
| `/account` | `app/account/page.tsx` | ✅ (exists, unreachable from nav — see Broken Links) |
| `/thank-you` | `app/thank-you/page.tsx` | ✅ |
| `/admin` | `app/admin/page.tsx` | ✅ (protected by middleware) |
| `/admin/login` | `app/admin/login/page.tsx` | ✅ |
| `/under-construction` | `app/under-construction/page.tsx` | ✅ |

**Missing:** `app/not-found.tsx`  
`app/shop/[slug]/page.tsx` (line 21) calls `notFound()` when a product ID doesn't exist. Per [Next.js docs](https://nextjs.org/docs/app/api-reference/file-conventions/not-found), this requires a `not-found.tsx` file in the same directory or globally at `app/not-found.tsx`. Without it, Next.js serves its default unstyled 404 page, breaking the site's visual identity.

**Fix:** Create `app/not-found.tsx`:
```tsx
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4]">
      <Navbar />
      <main className="flex-grow pt-24 flex items-center justify-center">
        <div className="text-center space-y-6">
          <p className="text-[#786B59] uppercase tracking-[0.3em] text-xs">404</p>
          <h1 className="text-4xl font-serif text-[#2D2A26]">Page Not Found</h1>
          <Link href="/shop" className="text-sm text-[#786B59] hover:text-[#2D2A26] underline">
            Return to Shop
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

---

## Missing Assets

### 1. No `public/` directory
The project has no `public/` folder. All images are loaded from external URLs:
- Hero image: `images.unsplash.com` (reliable, but external dependency)
- Background washi texture: `www.transparenttextures.com/patterns/washi.png` — a free community-hosted texture site with **no uptime SLA**. If this goes down, the newsletter section's background will silently disappear.
- Product images: Supabase storage URLs or external URLs stored per-product in the database.

**Fix:** Download the washi texture and host it locally in `public/`:
```tsx
// Replace in app/page.tsx line 83:
<div className="absolute inset-0 bg-[url('/images/washi.png')] opacity-10">
```

### 2. `product.image_url` can be empty — broken `<img>` displayed
**Files:** `components/product-card.tsx` line 20, `app/shop/[slug]/product-detail-client.tsx` line 25

```tsx
const primaryImage = imageUrls[0] || product.image_url;
// If both are empty/undefined → <img src={undefined}> → broken image icon
```

If a product is created without an image, both `getImageUrls()` and `product.image_url` will be falsy. The browser will render a broken image icon.

**Fix:** Add a local placeholder fallback:
```tsx
const primaryImage = imageUrls[0] || product.image_url || '/placeholder.jpg';
```
Then add a `public/placeholder.jpg` file.

---

## Other Risks

### 1. Dead SPA-era code — TypeScript compile error risk
**Files:** `components/CartDrawer.tsx`, `components/ProductCard.tsx`, `components/Layout.tsx`, `services/storage.ts`, `types.ts`, `constants.ts`

This project contains a complete set of old single-page-app components that were the original non-Next.js prototype. They are **not imported by any Next.js page** — the actual app uses `components/cart-drawer.tsx`, `components/product-card.tsx`, and `components/navbar.tsx` instead.

The critical problem: `components/CartDrawer.tsx` line 4 imports:
```tsx
import { Button } from './ui/Button'; // Capital B
```
But the actual file is `components/ui/button.tsx` (lowercase). On **Linux/macOS with case-sensitive filesystems** (Vercel production), this import will cause a `Module not found` compile error that prevents the **entire build** from completing — even though `CartDrawer.tsx` is never rendered.

**Fix (recommended):** Delete all SPA-era files:
```
components/CartDrawer.tsx    ← delete
components/ProductCard.tsx   ← delete
components/Layout.tsx        ← delete
services/storage.ts          ← delete
types.ts                     ← delete
constants.ts                 ← delete
```

If you need to keep them for reference, at minimum fix the broken import in `CartDrawer.tsx`:
```tsx
import { Button } from './ui/button'; // lowercase b
```

---

### 2. "BEST SELLERS" sort is identical to "NEW ARRIVALS"
**File:** `app/shop/shop-client.tsx`, lines 55–58

```tsx
case 'newest':
  return (b.created_at || '').localeCompare(a.created_at || '');
case 'best-seller':
  return (b.created_at || '').localeCompare(a.created_at || ''); // ← exact same
```

Both sort by `created_at` descending. Clicking "BEST SELLERS" shows the exact same product order as "NEW ARRIVALS". There is no sales/order data being used.

**Fix:** Either connect `best-seller` to actual order counts, or remove the button until that data is available:
```tsx
// Remove from sortOptions array:
{ value: 'best-seller', label: 'BEST SELLERS' },
```

---

### 3. Admin Sales Performance chart — simulated data presented as real
**File:** `app/admin/admin-client.tsx`, lines 92–107

```tsx
// Mock Sales Data
const salesData = useMemo(() => {
  const baseRevenue = totalValue * 0.15;
  return [ /* fabricated monthly figures */ ]
}, [totalValue]);
```

The "Sales Perf." chart in the Admin Dashboard shows computed mock data. It looks like real monthly revenue (Jan–Jun bars with cost vs profit) but is entirely fabricated from inventory value. Admin users may base purchasing or marketing decisions on these figures.

**Fix:** Label the chart clearly as simulated, or replace with real data aggregated from the `orders` table (which is already fetched as `initialOrders`):
```tsx
// Replace mock with real order aggregation:
const salesData = useMemo(() => {
  return orders.reduce((acc, order) => {
    const month = new Date(order.created_at).toLocaleString('en', { month: 'short' });
    const existing = acc.find(d => d.month === month);
    if (existing) existing.revenue += order.total;
    else acc.push({ month, revenue: order.total });
    return acc;
  }, [] as { month: string; revenue: number }[]);
}, [orders]);
```

---

### 4. Checkout form only supports 5 countries
**File:** `app/checkout/page.tsx`, lines 280–285

Only US, CA, GB, AU, JP are listed in the country dropdown. The shipping rates API filters by `country_code === watchedCountry || country_code === 'INTL'`. Customers from any other country see **no shipping options** and cannot proceed — but receive no error message explaining why, only a validation error "Please select a shipping method" with no options to choose from.

**Fix:** Either expand the country list, or add a message when `availableRates.length === 0`:
```tsx
{availableRates.length === 0 && (
  <p className="text-sm text-[#786B59] italic">
    No shipping options available for the selected country. Please contact us at concierge@tsuyanouchi.com.
  </p>
)}
```

---

### 5. `product-card.tsx` links use `product.id` as the slug
**File:** `components/product-card.tsx`, line 41

```tsx
<Link href={`/shop/${product.id}`}>
```

The dynamic route is `app/shop/[slug]/page.tsx`, but the slug is actually the database UUID. `getProduct(slug)` does `.eq('id', id)`, so this works correctly today. However, the naming inconsistency means any future migration to human-readable slugs (for SEO) would silently break all product links. It is also SEO-unfriendly — URLs look like `/shop/3f2a7c8d-e124-4b9f-...`.

**Fix (long-term):** Add a `slug` column to the `products` table and update `ProductCard`, `getProduct`, and the dynamic route to use it.

---

### 6. `/under-construction` redirect bypasses the `public/` images check
**File:** `middleware.ts`, lines 8–17

When `NEXT_PUBLIC_UNDER_CONSTRUCTION=true`, all traffic is redirected to `/under-construction`. Static assets at `/_next/static` and `/_next/image` are excluded. However, if any `<img src="/some-local-asset.png">` is used in the under-construction page and there is no `public/` directory, those images will 404.

Currently `app/under-construction/page.tsx` and `waitlist-form.tsx` use no local image assets, so this is not currently breaking — but worth noting for future additions.

---

### 7. `handleAddToCart` in `product-detail-client.tsx` uses `product.image_url` not `primaryImage`
**File:** `app/shop/[slug]/product-detail-client.tsx`, line 45

```tsx
const handleAddToCart = () => {
  addToCart({
    id: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.image_url,  // ← uses raw image_url, not primaryImage
    selectedSize: selectedSize
  });
};
```

But `primaryImage` (line 25) is derived from `getImageUrls(product)` which parses JSON arrays of multiple image URLs. If `product.image_url` is a JSON string like `'["url1","url2"]'`, the cart item's `imageUrl` will be that raw JSON string — which will render as a broken image in the cart drawer and cart page.

**Fix:**
```tsx
imageUrl: primaryImage,  // use the already-parsed primaryImage, not image_url
```

---

## API Routes — Status

All API routes are correctly wired:

| Endpoint | Method(s) | Status |
|----------|-----------|--------|
| `/api/admin/auth` | POST, DELETE | ✅ |
| `/api/orders` | POST | ✅ |
| `/api/payments/create-intent` | POST | ✅ (but see Form Issues #1) |
| `/api/payments/update-intent` | POST | ✅ |
| `/api/products` | GET, POST | ✅ |
| `/api/products/[id]` | GET, PUT, DELETE | ✅ |
| `/api/products/import` | POST | ✅ |
| `/api/shipping/rates` | GET | ✅ |
| `/api/waitlist` | POST | ✅ |
| `/api/webhooks/stripe` | POST | ✅ (but never fires — see Form Issues #1) |
| `/preview/order-confirmation` | GET | ✅ (dev tool) |

---

## Recommended Fix Order

1. **Fix `components/CartDrawer.tsx` import** (`./ui/Button` → `./ui/button`) or delete the file entirely — stops any potential build failure
2. **Wire the Newsletter Subscribe button** to `/api/waitlist` — quick win, 15 min fix
3. **Add `/account` link to Navbar and Footer** — restores broken discoverability
4. **Implement Stripe card capture in Checkout** — critical revenue fix
5. **Add `app/not-found.tsx`** — restores branded 404 experience
6. **Add `imageUrl: primaryImage` fix in product-detail-client.tsx** — prevents JSON string in cart images
7. **Delete dead SPA-era files** — reduces codebase confusion
8. **Add no-shipping-rates message in Checkout** — improves international UX
9. **Label admin Sales chart as simulated** — prevents misinformed decisions
10. **Add local fallback image** — prevents broken `<img>` when product has no image
