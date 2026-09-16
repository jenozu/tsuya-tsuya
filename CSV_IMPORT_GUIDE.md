# CSV Import Guide

Tsuyanouchi imports product data into Neon PostgreSQL and uses Cloudflare R2 for product images.

## Batch workflow

1. Put image files in `product-images/1`, `product-images/2`, or `product-images/3`.
2. Upload that folder to R2 with `npm run upload-images-1`, `npm run upload-images-2`, or `npm run upload-images-3`.
3. Put the matching R2 filename/path in the CSV `imageUrl` column.
4. In the admin portal, open Products and choose Import CSV.

The CSV importer does not upload a local file merely because its filename is listed. The corresponding object must already exist in R2.

## Image URLs

The parser accepts a full HTTP(S) image URL or an R2 object filename/path. Bare paths are combined with `R2_PUBLIC_URL` under the `products/` prefix.

For example, `1/aizawa-1.png` resolves to `<R2_PUBLIC_URL>/products/1/aizawa-1.png`.

Supported image extensions: JPG/JPEG, PNG, and WebP.

## Supported CSV fields

```text
name
category
stock
imageUrl
description
videoUrl
price_8x10
cost_8x10
price_11x14
cost_11x14
price_12x18
cost_12x18
price_16x20
cost_16x20
price_18x24
cost_18x24
price_20x30
cost_20x30
price_24x32
cost_24x32
price_24x36
cost_24x36
```

Each row needs `name`, `stock`, `imageUrl`, and at least one positive size price. Keep the `category` header in the file; a blank row value defaults to `Art Prints`.

## Templates

Use one of these root-level files as a starting point:

- `csv-template-blank.csv`
- `csv-template-with-example.csv`
- `csv-template-1pc.csv`
- `csv-template-2pc.csv`
- `csv-template-3pc.csv`

## After import

Confirm the product appears in admin, the product row exists in Neon, its image URL is publicly readable from R2, and the primary image renders in the shop and product detail page.
