Repo Audit Summary
1. Stack and Architecture
Runtime/framework: Next.js 16 (App Router), React 19, TypeScript 5.8, Node.js ≥20
Styling: Tailwind CSS v4 via @tailwindcss/postcss
Database: Supabase (PostgreSQL), accessed via @supabase/supabase-js with a lazy proxy pattern
Payments: Stripe Payment Intents (Stripe JS + React Stripe.js for embedded form); stripe@^17.5
Email: Resend
AI: Google Gemini via @google/genai
Deployment target: Vercel
Package manager: npm
Env strategy: .env.local for local; Vercel environment variables for production

⚠️ Critical structural observation: The repo contains two complete Next.js applications:

/app, /components, /lib at the repo root — an older version
/gemini/tsuyanouchi/app, /gemini/tsuyanouchi/components, etc. — the current version
All files shared in this audit are from gemini/tsuyanouchi/. The root-level app was not shared and is almost certainly what is currently deployed.

2. Checkout Flow Map (gemini/tsuyanouchi version)
CartPage (/cart)
  └─ "Proceed to Checkout" → /checkout

CheckoutPage (/checkout)
  Step 1 – Shipping form (react-hook-form + zod)
  Concurrent: GET /api/shipping/rate?country=X&quantity=N
              → lib/shipping.ts (hardcoded rates table, no DB)
  Tax:        computeTaxAmount() via lib/tax.ts (hardcoded table)

  "Continue to Payment" click:
  └─ POST /api/payments/create-intent
       body: { amount: <dollars float>, metadata: { orderId, email } }
       → lib/stripe.ts createPaymentIntent()
           → stripe.paymentIntents.create({ amount: Math.round(amt*100), ... })
       ← { clientSecret, paymentIntentId }

  Step 2 – Stripe Elements rendered with clientSecret
  "Place Order" click:
  └─ elements.submit() → stripe.confirmPayment()
  └─ POST /api/orders  (fire-and-forget after Stripe confirms)
  └─ router.push(/thank-you?orderId=X)

Webhook: POST /api/webhooks/stripe
  Handles: payment_intent.succeeded → updateOrderStatus + emails
           payment_intent.payment_failed → failed
           payment_intent.canceled → canceled

Success: /thank-you?orderId=X  (clears cart)
3. Issues Found
Critical
C-1 — Vercel is deploying the repo root app, not gemini/tsuyanouchi/

The browser error is POST /api/checkout/create-session 500. That path does not exist anywhere in gemini/tsuyanouchi/app/api/. The checkout page in the current code calls /api/payments/create-intent. The create-session path is the old Stripe Checkout Session pattern that lives in the root-level /app/ directory.

This means vercel.json at root (if it exists) or the Vercel project settings have not set Root Directory to gemini/tsuyanouchi. Vercel is building and serving the old root-level app, which has app/api/checkout/create-session/route.ts. That route is crashing with 500, most likely because STRIPE_SECRET_KEY is missing from Vercel env vars or was set for the wrong project, causing Stripe to throw on initialization.

Root cause of the 500: The wrong application is deployed.

C-2 — Root-level app/api/checkout/create-session/route.ts crashes on init

Even if the root directory were corrected, the old route would need diagnosis. The 500 (not 404) means the file exists and executes but throws. The most probable causes in order:

STRIPE_SECRET_KEY not set → getStripeClient() throws immediately
success_url / cancel_url built with a relative path instead of absolute URL
Malformed line_items (e.g., non-integer unit_amount)
C-3 — gemini/tsuyanouchi/vercel.json is missing rootDirectory

// current
{ "framework": "nextjs", "buildCommand": "npm run build", ... }

// needed
{ "framework": "nextjs", "rootDirectory": "gemini/tsuyanouchi", ... }
Without this, any Vercel deployment triggered from the repo root defaults to building /, not gemini/tsuyanouchi/.

High
H-1 — ProductSize interface missing cost — TypeScript build error

lib/supabase-helpers.ts:

export interface ProductSize {
  label: string
  price: number
  // cost is absent
}
lib/csv-parser.ts imports this type and pushes objects with cost:

variations.push({
  label: sizeLabel,
  price: Math.round(price),
  cost: Math.round(cost),  // TS error: Object literal may only specify known properties
});
With strict: true and no typescript.ignoreBuildErrors in next.config.ts, this breaks npm run build. The CSV import feature is entirely non-functional until fixed.

H-2 — Gemini env var name mismatch — AI description silently broken

services/gemini.ts:

const apiKey = process.env.API_KEY;  // wrong
The documented variable (per ENV_TEMPLATE.md and TODO.md) is GEMINI_API_KEY. The AI "Generate Description" button in the admin will always throw "API Key is missing" and return a fallback string.

H-3 — Product interface and createProduct don't include product_type

The products table has product_type TEXT. The Product interface in lib/supabase-helpers.ts omits it. createProduct() never writes it. The admin form doesn't expose it. The CSV import route passes product_type: null but createProduct silently ignores it. Products can never have product_type set through the app.

Medium
M-1 — Size label inconsistency between DB samples and STANDARD_PRINT_SIZES

lib/print-sizes.ts defines sizes as: '8" x 10"' (ASCII " and letter x)
SUPABASE_SCHEMA_UPDATED.sql creates sample products with: '8\" × 10\"' (Unicode ×)

These are different strings. Products seeded from SQL won't match size labels generated by the admin panel or CSV importer. The size-selection UI would display both variants inconsistently.

M-2 — Two next.config files at repo root

Both next.config.ts and next.config.mjs exist at repo root. Next.js picks only one. If one contains settings the other lacks (e.g., image domain allowlists), those settings are silently dropped. The gemini/tsuyanouchi/ subdirectory has only next.config.ts, which is clean.

M-3 — Cart page "Proceed to Checkout" is a plain <Link> — no cart-empty guard

app/cart/page.tsx renders the checkout link even when the cart is empty:

{cartItems.length === 0 ? (
  <div>...empty state...</div>
) : (
  <div>
    ...
    <Link href="/checkout"><Button>Proceed to Checkout</Button></Link>
  </div>
)}
The empty-cart case correctly hides the link, but there's no server-side or middleware guard on /checkout. A direct navigation to /checkout with an empty cart triggers the empty-cart UI within the page component — this is handled, but only client-side.

M-4 — Order is only persisted as fire-and-forget after Stripe confirms

In StripePaymentForm.handlePay():

try {
  await fetch('/api/orders', { method: 'POST', ... });
} catch {
  // swallowed
}
If POST /api/orders fails (Supabase down, network blip), the payment is taken but no order record exists. The webhook (payment_intent.succeeded) calls updateOrderStatus — but if the order was never created, updateOrderStatus silently does nothing. Orders can be permanently lost.

The correct pattern is to create the order before confirming payment (as a pending record), not after.

M-5 — Stripe webhook is configured for Payment Intent events; SETUP.md also lists Payment Intent events — consistent, but must NOT accidentally register Checkout Session events

The current implementation is internally consistent. However, if the root-level app (which uses Checkout Sessions) ever had a webhook registered, those events would arrive at the wrong handler and be unhandled. Verify in the Stripe dashboard that only one active webhook endpoint exists.

Low
L-1 — app/admin/admin-client.tsx dashboard uses mock/simulated sales data

salesData is derived from totalValue * 0.15 with hardcoded multipliers. There are no real sales figures. The chart is labeled "Sales Performance" but shows fabricated numbers. This is a UX/trust issue.

L-2 — supabase-setup.sql referenced in TODO.md doesn't exist; correct file is SUPABASE_SCHEMA_UPDATED.sql

TODO.md says to run supabase-setup.sql. That file doesn't exist in the repo. The correct file is SUPABASE_SCHEMA_UPDATED.sql. New developers following the TODO will fail.

L-3 — Favicon 404

No favicon.ico exists in public/. The middleware correctly excludes favicon.ico from processing, so no redirect loop, but the browser console will log a 404 on every page load.

L-4 — app/api/webhooks/stripe/route.ts runtime declaration is redundant

export const runtime = 'nodejs'
This is the default for App Router API routes. Not harmful, just noise.

4. Likely Root Causes of the Stripe 500
#	Hypothesis	Confidence
1	Vercel root directory is / (repo root), not gemini/tsuyanouchi/ — deploying the old app which has app/api/checkout/create-session/route.ts. That route crashes because STRIPE_SECRET_KEY is undefined in Vercel env vars (set for wrong project or missing), throwing on Stripe client init	High
2	Root-level create-session route exists and has STRIPE_SECRET_KEY set, but success_url/cancel_url are relative paths — Stripe API rejects them with a 400 which the route converts to 500	Medium
3	Root-level create-session route has non-integer unit_amount (prices not multiplied by 100 or not Math.rounded) — Stripe returns a 400 which the route converts to 500	Medium
4	Deployed correctly from gemini/tsuyanouchi/ but a separate browser tab / cached Service Worker is making requests to /api/checkout/create-session from an old JS bundle	Low
5. Repair Plan
Step 1 — Fix Vercel root directory (resolves the 500 immediately if hypothesis 1 is correct)
Option A (Vercel dashboard): Go to Vercel project → Settings → General → Root Directory → set to gemini/tsuyanouchi → Redeploy.

Option B (code): Add rootDirectory to gemini/tsuyanouchi/vercel.json. Note: rootDirectory in vercel.json only works when the file is at the repo root. Move it, or set via dashboard.

After fixing the root directory, the correct app (gemini/tsuyanouchi/) will be deployed. The checkout page in that app calls /api/payments/create-intent, which is correctly implemented.

Step 2 — Fix ProductSize interface (TypeScript build error)
Add cost to the interface:

// lib/supabase-helpers.ts
export interface ProductSize {
  label: string
  price: number
  cost?: number  // optional to not break cart-context or existing data without cost
}
Step 3 — Fix Gemini env var
// services/gemini.ts
const apiKey = process.env.GEMINI_API_KEY;  // was API_KEY
Step 4 — Add product_type to Product interface and createProduct
// lib/supabase-helpers.ts — Product interface
export interface Product {
  // ...existing fields...
  product_type?: string | null
}

// createProduct insert
const { data, error } = await supabase
  .from('products')
  .insert({
    name: product.name,
    description: product.description,
    price: product.price,
    cost: product.cost,
    category: product.category,
    product_type: (product as any).product_type ?? null,
    image_url: product.image_url,
    stock: product.stock,
    sizes: product.sizes,
  })
Step 5 — Fix size label inconsistency
Standardize on one format. The × (Unicode multiplication sign) is more typographically correct. Update lib/print-sizes.ts:

export const STANDARD_PRINT_SIZES = [
  '8" × 10"',
  '11" × 14"',
  '12" × 18"',
  '16" × 20"',
  '18" × 24"',
  '20" × 30"',
  '24" × 32"',
  '24" × 36"',
] as const;
Update lib/csv-parser.ts sizeMapping keys to match.

Step 6 — Fix order persistence race condition
In app/checkout/page.tsx, create the pending order before confirming payment:

// In onContinueToPayment, after getting clientSecret:
// 1. Create pending order in Supabase immediately
await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...orderData, payment_status: 'pending' }),
});
// 2. Then proceed to payment step
setClientSecret(secret);
Remove the fire-and-forget fetch('/api/orders', ...) from StripePaymentForm.handlePay().

Step 7 — Add rootDirectory comment to vercel.json and favicon.ico
Add a placeholder favicon to public/favicon.ico to clear the 404.

6. Code Changes Made
No automated edits were made (this is a plan-mode audit). The changes to implement are:

File	Change	Why
Vercel dashboard or repo root vercel.json	Set rootDirectory: "gemini/tsuyanouchi"	Primary fix — deploys correct app
gemini/tsuyanouchi/lib/supabase-helpers.ts	Add cost?: number to ProductSize; add product_type to Product and createProduct	Fixes TS build error, enables product_type
gemini/tsuyanouchi/services/gemini.ts	process.env.API_KEY → process.env.GEMINI_API_KEY	Fix broken AI description
gemini/tsuyanouchi/lib/print-sizes.ts	Change x to × in all size strings	Consistency with DB schema
gemini/tsuyanouchi/lib/csv-parser.ts	Update sizeMapping keys to × format	Match DB schema
gemini/tsuyanouchi/app/checkout/page.tsx	Create order before payment, remove fire-and-forget	Prevent lost orders
gemini/tsuyanouchi/public/	Add favicon.ico	Clear 404
7. Remaining Risks / Follow-ups
Root-level app/ cleanup: Once gemini/tsuyanouchi/ is confirmed as the deployed app, the root-level app/, components/, lib/ should be deleted or moved to old-root-backup/ to avoid future confusion. Two Next.js apps in one repo is a maintenance hazard.
STRIPE_WEBHOOK_SECRET in Vercel: After fixing the root directory, a new webhook endpoint URL will be active (yourdomain.com/api/webhooks/stripe). The Stripe dashboard webhook secret must match STRIPE_WEBHOOK_SECRET in Vercel env vars. Re-register the webhook in Stripe for the correct production domain.
Supabase waitlist table: The newsletter form (/api/waitlist) will 500 silently if the waitlist table wasn't created via supabase-waitlist-table.sql. Run it.
SUPABASE_SERVICE_ROLE_KEY: Not used in any current route (only the bulk-upload script uses it). If you add admin-only DB mutations that bypass RLS, you'll need this in Vercel env vars. Currently all routes use the anon key, which is fine given the permissive RLS policies.
RLS policies are fully open: All tables have FOR ALL USING (true) — anyone with the anon key can write to orders, products, etc. For a production store this is a significant security risk. Add proper policies or move mutations to routes that use the service role key.
8. Local Test Checklist
Environment setup

[ ] cd gemini/tsuyanouchi
[ ] .env.local exists with all required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_PASSWORD, RESEND_API_KEY, GEMINI_API_KEY
[ ] npm install runs clean
[ ] npm run build completes with no TypeScript errors (will fail until Step 2 fix is applied)
[ ] npm run dev starts on port 3000
Checkout flow

[ ] Navigate to /shop, add at least one product to cart
[ ] Cart badge increments in navbar
[ ] Navigate to /cart — items display correctly
[ ] Click "Proceed to Checkout"
[ ] Fill in shipping form — shippingCost populates (non-null) after country is set
[ ] "Continue to Payment" button becomes enabled
[ ] Click it — POST /api/payments/create-intent returns 200 in Network tab
[ ] Stripe Elements payment form appears
[ ] Enter test card 4242 4242 4242 4242, any future date, any CVC
[ ] Click "Place Order" — no error in console
[ ] Redirected to /thank-you?orderId=ORD-...
[ ] Check Supabase orders table — row exists with payment_status: 'pending' (before webhook) or 'paid' (after webhook)
Webhook (local)

[ ] stripe listen --forward-to localhost:3000/api/webhooks/stripe running
[ ] After payment, payment_intent.succeeded event appears in Stripe CLI output
[ ] Order in Supabase updates to status: 'processing', payment_status: 'paid'
Production checklist

[ ] Vercel project Root Directory is set to gemini/tsuyanouchi
[ ] All env vars are set in Vercel (including live Stripe keys for production)
[ ] Stripe webhook endpoint registered in Stripe Dashboard pointing to https://yourdomain.com/api/webhooks/stripe for events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled
[ ] STRIPE_WEBHOOK_SECRET in Vercel matches the signing secret from the Stripe webhook endpoint above
[ ] Redeploy triggered after root directory change
[ ] Hit /api/payments/create-intent directly with curl or Postman to confirm 200 before testing checkout end-to-end in production