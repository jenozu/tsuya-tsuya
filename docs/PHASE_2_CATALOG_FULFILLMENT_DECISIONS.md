# Phase 2 catalog and fulfillment decisions

Recorded from the store owner on 2026-09-30. These are product/fulfillment decisions to guide the remaining launch work; they do not by themselves prove provider or production behavior.

## Approved direction

- Final launch products are still being finalized by the owner.
- The current print-size set is approved and should remain the launch size set unless the owner later changes it.
- Do not require or expose a customer-facing SKU system for launch merely for its own sake. Until a provider/API requires a durable external SKU, the internal sellable-variant identity may be the product ID plus normalized size label.
- Inventory/availability is **per size**, not one quantity shared by the whole product.
- Inventory quantities are operational data and must not be shown to customers.
- Products are made to order through Printify. The normal customer experience should not use scarcity or “only N left” messaging.
- Products are expected to remain orderable in normal operation. If a specific size becomes unavailable through the fulfillment provider, show only an availability/unavailable state rather than an internal quantity.

## Implementation impact

The current database/type model still stores one product-level `stock` value and per-size price/cost only. Therefore per-size availability/stock is **not yet implemented**. Before launch, the product model, admin/import validation, cart reconciliation and server-authoritative checkout checks must be updated together so a size cannot be purchasable in one layer and unavailable in another.

The product-detail page no longer exposes stock counts and instead describes the print as made to order. This is presentation-only; existing checkout inventory guards remain in place until the per-size model is implemented and tested.

For product discovery, related-product recommendations should prefer other prints in the same `category` (currently used as the anime/series grouping), exclude the current product, and use other catalog products only as fallback suggestions.

For browser/SEO titles, product pages should use `Character/Product Name - Series/Category - TsuyaNoUchi`. If the product name and category are exactly the same text, omit the repeated category and use `Name - TsuyaNoUchi`.
