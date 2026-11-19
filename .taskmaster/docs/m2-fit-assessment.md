# M2 fit assessment: made-to-order (task 27)

Assessed 2026-11-16. Question: do the roadmap items TSU-M3-005, TSU-M6-006, TSU-M14-004 and TSU-M14-005 still apply to a
made-to-order store fulfilled through Printify? These are recommendations only. The owner decides whether to cancel,
reword or keep each roadmap item. `master_plan.md` was not edited.

Sources: `docs/PHASE_2_CATALOG_FULFILLMENT_DECISIONS.md`, `docs/CATALOG_PRICE_INVENTORY.md`, `docs/PRINTIFY_FULFILLMENT.md`,
`master_plan.md` entries, `migrations/forward/004` and `006`.

| Item | Recommendation | One-line evidence |
|---|---|---|
| TSU-M3-005 (normalized variant/SKU/inventory tables or validated JSONB) | **Adapt**: validated JSONB is enough; no normalized inventory tables for launch | Decisions doc: per-size `available` flag lives in the existing JSONB `sizes` array, no SKU system, no physical inventory. Shared Zod schemas (M6-004) already validate sizes. Still to confirm: each size stores its Printify `variant_id` (integer), which order submission needs. |
| TSU-M6-006 (atomic reserve/decrement of inventory, release holds) | **Not applicable** as written | Owner model note (2026-09-30): products are made to order and have no finite physical stock; decrement would invent scarcity. Per-size on/off availability (M6-005, done) covers the real risk. The residual need (a size Printify cannot fulfil) belongs to Printify failure handling: `out_of_stock`/`discontinued` mapping to `needs_attention` (PRINTIFY_FULFILLMENT s5). |
| TSU-M14-004 (pick/pack/print/QC workflow, print-size checks, packaging) | **Adapt**: drop pick/pack; keep artwork print-size check and an exception checklist | Printify prints and packs; the store does not handle physical stock. Approved print-size set (`lib/print-sizes.ts`) still needs an artwork check before listing. Exception handling already exists in `docs/DAILY_ORDER_RECOVERY.md` (M14-006, done). |
| TSU-M14-005 (shipment and stock reconciliation: cancellations, partial fulfilment, losses, manual corrections) | **Adapt**: order/shipment reconciliation against Printify status yes; physical stock reconciliation no | PRINTIFY_FULFILLMENT s2 needs Printify invoice reconciliation for shipping cost (ops task). Printify statuses `partially-fulfilled`, `canceled`, line-item cancel (s8) cover cancellations and partial fulfilment. CATALOG_PRICE_INVENTORY item 3 (reconcile on-hand count) does not apply. |

## Notes for the owner
- Neither "adapt" item changes scope on its own. Each needs its wording changed in `master_plan.md` by the owner, then
  the matching build task.
- Open owner questions these depend on: Printify availability (automatic sync or manual toggle, task 17) and whether
  Printify charges at submit or is pre-funded (PRINTIFY_FULFILLMENT s2).
- The `variant_id` check for M3-005 is a verification step, not a build step: confirm against the Printify product
  import before the first real order.
