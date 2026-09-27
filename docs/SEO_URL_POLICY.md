# Product URL and indexing policy

**Canonical host:** `https://tsuyanouchi.com`; `www.tsuyanouchi.com` remains a deployed alias. Confirm that Vercel redirects the alternate host to the canonical host before final SEO signoff.

**Existing product URL contract:** `/shop/[slug]` currently resolves the product's database **ID**, not a human-readable slug. Published links containing IDs must remain valid. The new product metadata, sitemap, breadcrumbs and schema use the existing ID URL.

**Changing to readable slugs:** Only after a dedicated, reviewed migration introduces durable unique slugs and collision handling. Before deployment:
1. Save the mapping of each public product ID URL to its new URL; preserve deleted-product behavior.
2. Add permanent server-side redirects from every historical ID URL to its corresponding slug URL; test direct navigation and old inbound links.
3. Deploy redirects and canonical metadata together and revalidate the sitemap.
4. Do **not** replace IDs in checkout or order references; product IDs remain database identifiers.

**Indexing environments:** Only production deployment with `NEXT_PUBLIC_UNDER_CONSTRUCTION` not set to `true` can publish a sitemap and allow indexing. All previews and under-construction environments emit robots exclusion and noindex metadata. The sitemap reads current database products dynamically; when Neon is unavailable it cannot establish which products exist and will not include them. Verify production database connectivity separately.

**Privacy and authorization:** Never index admin, API, checkout, cart, private favorites, order-confirmation, previews, or under-construction paths. Do not publish customer details or payment metadata in JSON-LD. Product availability is based on the existing shared product stock field; SKU-level inventory remains an unapproved future model.

**Post-release review:** Independently inspect generated production robots/sitemap and each representative product's canonical tags and JSON-LD; validate indexing with Search Console only after store-owner approval to launch. These live steps remain separate roadmap work.
