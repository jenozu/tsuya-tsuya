# Admin + Product Image Audit — 2026-09-10

## Critical issues found

1. Admin image uploads wrote directly to Supabase Storage with the public anon client. If Storage INSERT policy was missing, upload failed. The UI then silently converted the image to a base64 data URL and stored it in `products.image_url`. Those strings can be megabytes long, break checkout image metadata, bloat localStorage, and behave inconsistently across the site.
2. Multi-image products are stored as a JSON array string in `products.image_url`, but the admin product table fed that raw JSON string to `<img src>`, which is invalid.
3. Admin saved all standard sizes including zero-priced placeholders. Storefront code treated every saved size as saleable, so a listing could display/select a $0 size.
4. Admin editing discarded per-size cost and always reset product stock/cost to 0.
5. Product images can arrive from CSV as arbitrary remote URLs, while Next Image allowed only a few hosts. Valid admin images could therefore render in one place and fail in shop/cart.
6. Cart entries persist image URLs in localStorage and previously did not refresh them when the same item was re-added after a listing image changed.
7. Product create/update/delete/import APIs did not require the admin session even though the UI did.
8. `/shop` and product detail pages cache for 5 minutes, so edits could look as if they had not applied. Mutation routes now invalidate the relevant pages immediately.

## Fixes applied

- Added authenticated image-upload setup with direct-to-Supabase uploads. With `SUPABASE_SERVICE_ROLE_KEY`, the server ensures the public bucket exists and issues a signed upload token; existing anon Storage policies remain a backwards-compatible fallback. Image bytes no longer pass through Vercel functions.
- Removed base64 fallback behavior from admin upload flow; upload failures are now visible and are not silently saved as fake product URLs.
- Added a shared `SafeProductImage` renderer with legacy JSON-array normalization and a local fallback image.
- Fixed admin list thumbnails for multi-image products.
- Added upload progress/error state and JPG/PNG/WebP 10 MB validation.
- Restored product-level stock editing and per-size cost editing.
- Persist only positive-priced sizes.
- Store average product cost from the active variations rather than resetting cost to zero.
- Filter invalid/zero-priced sizes defensively on product cards/detail pages.
- Removed quick-add for products that require a size choice.
- Refresh stale cart metadata when an existing item is re-added.
- Replaced the forgeable literal admin cookie with an expiring HMAC-signed session and protected product mutation/import/image/order-create endpoints. Storefront pages are revalidated after catalogue changes.
- Corrected CSV import template metadata and image URL validation/encoding.
- Replaced simulated sales analytics with actual order-derived 7D / 30D / YTD data and kept client admin state synchronized after refresh.

## Configuration requirement

For reliable production uploads, Vercel should contain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is used only server-side and must never be exposed as a `NEXT_PUBLIC_*` variable. The `product-images` bucket must be public because storefront product images are public assets.

## Remaining security note

`SUPABASE_SCHEMA.sql` contains permissive `FOR ALL USING (true)` policies on multiple tables. Protecting the Next.js mutation APIs prevents ordinary unauthenticated API writes, but those database policies should be tightened separately before a public launch so a caller with the public anon key cannot bypass the app and write directly to Supabase.
