# Product Images Folder

These tracked folders are available for bulk uploading product images to Cloudflare R2.

```text
product-images/
├── 1/
├── 2/
└── 3/
```

For normal day-to-day product creation, use the image picker in `/admin`; the application uploads those files to R2 automatically. You only need these local folders for existing/batch image sets.

## Bulk upload

Configure the five `R2_*` variables in `.env.local`, then run from the repository root:

```bash
npm run upload-images-1
npm run upload-images-2
npm run upload-images-3
```

The script stores objects under:

```text
products/1/<filename>
products/2/<filename>
products/3/<filename>
```

It preserves JPG/JPEG, PNG, and WebP files and prints each resulting public R2 URL.

## CSV imports

A CSV can reference an uploaded object by filename/path. See `CSV_IMPORT_GUIDE.md` for the current format and workflow.

## File naming tips

- Prefer descriptive filenames.
- Prefer lowercase names with hyphens instead of spaces.
- Keep filenames unique within a folder.
- Verify the object exists in R2 before importing a CSV that references it.
