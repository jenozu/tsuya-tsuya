from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def regex_once(path, pattern, repl, flags=0):
    p = Path(path)
    text = p.read_text()
    new_text, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, found {count}: {pattern}")
    p.write_text(new_text)


# Shared resilient product image component. It accepts legacy JSON-array strings and
# swaps broken URLs for a local placeholder instead of showing a broken image.
Path('components/safe-product-image.tsx').write_text(r'''\'use client\';

import React, { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

export const PRODUCT_IMAGE_FALLBACK = '/product-placeholder.svg';

export function normalizeProductImageSrc(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return PRODUCT_IMAGE_FALLBACK;
  const trimmed = raw.trim();
  if (!trimmed) return PRODUCT_IMAGE_FALLBACK;

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const first = parsed.find((value) => typeof value === 'string' && value.trim());
        return first ? normalizeProductImageSrc(first) : PRODUCT_IMAGE_FALLBACK;
      }
    } catch {
      return PRODUCT_IMAGE_FALLBACK;
    }
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed;
  }

  return PRODUCT_IMAGE_FALLBACK;
}

type SafeProductImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SafeProductImage({
  src,
  fallbackSrc = PRODUCT_IMAGE_FALLBACK,
  onError,
  ...props
}: SafeProductImageProps) {
  const normalized = normalizeProductImageSrc(src);
  const [currentSrc, setCurrentSrc] = useState(normalized);

  useEffect(() => {
    setCurrentSrc(normalizeProductImageSrc(src));
  }, [src]);

  return (
    <Image
      {...props}
      src={currentSrc}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
        onError?.(event);
      }}
    />
  );
}
'''.replace("\\'use client\\';", "'use client';"))

Path('public/product-placeholder.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Product image unavailable"><rect width="800" height="800" fill="#F2EFE9"/><path d="M235 515l108-123 78 84 55-61 89 100H235z" fill="#CDC6BC"/><circle cx="310" cy="300" r="42" fill="#CDC6BC"/><rect x="180" y="180" width="440" height="440" rx="8" fill="none" stroke="#786B59" stroke-width="8"/><text x="400" y="670" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#786B59">Image unavailable</text></svg>''')

# Server-side Supabase storage client: service role when available, anon fallback for
# installations that already have storage INSERT policies.
Path('lib/supabase-admin.ts').write_text('''import { createClient } from '@supabase/supabase-js'\n\nexport function getSupabaseStorageAdmin() {\n  const url = process.env.NEXT_PUBLIC_SUPABASE_URL\n  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY\n  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY\n  const key = serviceRole || anonKey\n\n  if (!url || !key) {\n    throw new Error('Supabase storage is not configured')\n  }\n\n  return {\n    client: createClient(url, key, {\n      auth: { persistSession: false, autoRefreshToken: false },\n    }),\n    usingServiceRole: Boolean(serviceRole),\n  }\n}\n''')

Path('lib/admin-session.ts').write_text('''export function hasAdminSession(request: Request): boolean {\n  const cookieHeader = request.headers.get('cookie') || ''\n  return cookieHeader.split(';').some((part) => {\n    const [name, ...rest] = part.trim().split('=')\n    if (name !== 'admin_session') return false\n    try {\n      return decodeURIComponent(rest.join('=')) === 'authenticated'\n    } catch {\n      return false\n    }\n  })\n}\n''')

Path('app/api/admin/product-images').mkdir(parents=True, exist_ok=True)
Path('app/api/admin/product-images/route.ts').write_text('''import { NextRequest, NextResponse } from 'next/server'\nimport { hasAdminSession } from '@/lib/admin-session'\nimport { getSupabaseStorageAdmin } from '@/lib/supabase-admin'\n\nexport const runtime = 'nodejs'\n\nconst BUCKET = 'product-images'\nconst MAX_FILE_SIZE = 10 * 1024 * 1024\nconst ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])\n\nexport async function POST(request: NextRequest) {\n  if (!hasAdminSession(request)) {\n    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  }\n\n  try {\n    const formData = await request.formData()\n    const file = formData.get('file')\n\n    if (!(file instanceof File)) {\n      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })\n    }\n    if (!ALLOWED_TYPES.has(file.type)) {\n      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are supported' }, { status: 400 })\n    }\n    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {\n      return NextResponse.json({ error: 'Image must be between 1 byte and 10 MB' }, { status: 400 })\n    }\n\n    const { client: supabase, usingServiceRole } = getSupabaseStorageAdmin()\n\n    if (usingServiceRole) {\n      const { data: bucket } = await supabase.storage.getBucket(BUCKET)\n      if (!bucket) {\n        const { error: createError } = await supabase.storage.createBucket(BUCKET, {\n          public: true,\n          fileSizeLimit: MAX_FILE_SIZE,\n          allowedMimeTypes: Array.from(ALLOWED_TYPES),\n        })\n        if (createError && !createError.message.toLowerCase().includes('already exists')) {\n          throw createError\n        }\n      } else if (!bucket.public) {\n        const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {\n          public: true,\n          fileSizeLimit: MAX_FILE_SIZE,\n          allowedMimeTypes: Array.from(ALLOWED_TYPES),\n        })\n        if (updateError) throw updateError\n      }\n    }\n\n    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'\n    const storagePath = `products/${crypto.randomUUID()}.${extension}`\n    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {\n      cacheControl: '31536000',\n      contentType: file.type,\n      upsert: false,\n    })\n\n    if (uploadError) {\n      const hint = usingServiceRole\n        ? ''\n        : ' Add SUPABASE_SERVICE_ROLE_KEY to Vercel if the bucket does not allow anonymous uploads.'\n      throw new Error(`${uploadError.message}.${hint}`)\n    }\n\n    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)\n    if (!data.publicUrl) throw new Error('Supabase did not return a public image URL')\n\n    return NextResponse.json({ url: data.publicUrl })\n  } catch (error) {\n    console.error('Admin image upload error:', error)\n    return NextResponse.json(\n      { error: error instanceof Error ? error.message : 'Image upload failed' },\n      { status: 500 },\n    )\n  }\n}\n''')

# Route all browser admin uploads through the authenticated server endpoint instead of
# writing straight to Storage with the public anon client.
regex_once(
    'lib/supabase-helpers.ts',
    r"export async function uploadProductImage\(file: File, fileName: string\): Promise<string \| null> \{.*?\n\}\n\nexport async function deleteProductImage",
    '''export async function uploadProductImage(file: File, fileName: string): Promise<string | null> {\n  const formData = new FormData()\n  formData.append('file', file, fileName)\n\n  const response = await fetch('/api/admin/product-images', {\n    method: 'POST',\n    body: formData,\n  })\n  const result = await response.json().catch(() => ({}))\n\n  if (!response.ok || typeof result.url !== 'string') {\n    throw new Error(result.error || 'Image upload failed')\n  }\n\n  return result.url\n}\n\nexport async function deleteProductImage''',
    re.S,
)

# Admin state: keep product-level stock, retain cost per size, and expose upload status/errors.
replace_once(
    'app/admin/admin-client.tsx',
    "  const [sizes, setSizes] = useState<ProductSize[]>([]);\n  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);\n  const [isDragOver, setIsDragOver] = useState(false);",
    "  const [sizes, setSizes] = useState<ProductSize[]>([]);\n  const [stock, setStock] = useState(0);\n  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);\n  const [isDragOver, setIsDragOver] = useState(false);\n  const [isUploadingImages, setIsUploadingImages] = useState(false);\n  const [imageUploadError, setImageUploadError] = useState<string | null>(null);",
)
replace_once(
    'app/admin/admin-client.tsx',
    "    setImageUrls([]);\n    setSizes(STANDARD_PRINT_SIZES.map(label => ({ label, price: 0 })));",
    "    setImageUrls([]);\n    setStock(0);\n    setImageUploadError(null);\n    setSizes(STANDARD_PRINT_SIZES.map(label => ({ label, price: 0, cost: 0 })));",
)
replace_once(
    'app/admin/admin-client.tsx',
    "    const existingSizes = product.sizes || [];\n    const sizeMap = new Map(existingSizes.map(s => [s.label, s.price]));\n    setSizes(STANDARD_PRINT_SIZES.map(label => ({\n      label,\n      price: sizeMap.get(label) ?? 0\n    })));\n    setIsEditing(true);",
    "    const existingSizes = product.sizes || [];\n    const sizeMap = new Map(existingSizes.map(s => [s.label, s]));\n    const standardLabels = new Set<string>(STANDARD_PRINT_SIZES);\n    const standardSizes = STANDARD_PRINT_SIZES.map(label => {\n      const existing = sizeMap.get(label);\n      return { label, price: existing?.price ?? 0, cost: existing?.cost ?? 0 };\n    });\n    const customSizes = existingSizes.filter(s => !standardLabels.has(s.label));\n    setSizes([...standardSizes, ...customSizes]);\n    setStock(product.stock ?? 0);\n    setImageUploadError(null);\n    setIsEditing(true);",
)
replace_once(
    'app/admin/admin-client.tsx',
    "  const handleSave = async () => {\n    if (!name || !category) {",
    "  const handleSave = async () => {\n    if (isUploadingImages) {\n      alert('Please wait for image uploads to finish.');\n      return;\n    }\n    if (!name || !category) {",
)
replace_once(
    'app/admin/admin-client.tsx',
    "    const sizesWithPrice = sizes.filter(s => s.price > 0);",
    "    const sizesWithPrice = sizes.filter(s => Number.isFinite(s.price) && s.price > 0);",
)
replace_once(
    'app/admin/admin-client.tsx',
    "    const avgPrice = Math.round(sizesWithPrice.reduce((sum, s) => sum + s.price, 0) / sizesWithPrice.length);\n    const imageUrlValue = imageUrls.length > 0 ? serializeImageUrls(imageUrls) : 'https://picsum.photos/800/800';\n    const productData = {\n      name,\n      description,\n      price: avgPrice,\n      cost: 0,\n      category,\n      image_url: imageUrlValue,\n      stock: 0,\n      sizes: sizes\n    };",
    "    const avgPrice = Math.round(sizesWithPrice.reduce((sum, s) => sum + s.price, 0) / sizesWithPrice.length);\n    const avgCost = Math.round(sizesWithPrice.reduce((sum, s) => sum + (s.cost ?? 0), 0) / sizesWithPrice.length);\n    const imageUrlValue = imageUrls.length > 0 ? serializeImageUrls(imageUrls) : '/product-placeholder.svg';\n    const productData = {\n      name,\n      description,\n      price: avgPrice,\n      cost: avgCost,\n      category,\n      image_url: imageUrlValue,\n      stock,\n      sizes: sizesWithPrice\n    };",
)
replace_once(
    'app/admin/admin-client.tsx',
    "  const updateSizePrice = (index: number, value: string) => {\n    const num = parseFloat(value) || 0;\n    const newSizes = [...sizes];\n    newSizes[index] = { ...newSizes[index], price: num };\n    setSizes(newSizes);\n  };",
    "  const updateSizeField = (index: number, field: 'price' | 'cost', value: string) => {\n    const num = parseFloat(value) || 0;\n    const newSizes = [...sizes];\n    newSizes[index] = { ...newSizes[index], [field]: num };\n    setSizes(newSizes);\n  };",
)

# Never store failed image uploads as base64 data URLs. Base64 was the primary source of
# oversized image_url values and cart/Stripe image failures.
regex_once(
    'app/admin/admin-client.tsx',
    r"  // --- Image Upload ---\n  const processFiles = async \(files: File\[\]\) => \{.*?\n  \};\n\n  const handleImageUpload",
    '''  // --- Image Upload ---\n  const processFiles = async (files: File[]) => {\n    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);\n    const maxBytes = 10 * 1024 * 1024;\n    const validFiles = files.filter(file => allowedTypes.has(file.type) && file.size > 0 && file.size <= maxBytes);\n    const rejectedCount = files.length - validFiles.length;\n\n    if (validFiles.length === 0) {\n      setImageUploadError('No valid images selected. Use JPG, PNG, or WebP files up to 10 MB each.');\n      return;\n    }\n\n    setIsUploadingImages(true);\n    setImageUploadError(null);\n    const newUrls: string[] = [];\n    const failures: string[] = [];\n\n    for (let i = 0; i < validFiles.length; i++) {\n      const file = validFiles[i];\n      try {\n        const publicUrl = await uploadProductImage(file, file.name);\n        if (publicUrl) newUrls.push(publicUrl);\n        else failures.push(file.name);\n      } catch (error) {\n        console.error('Error uploading image:', error);\n        failures.push(`${file.name}: ${error instanceof Error ? error.message : 'upload failed'}`);\n      }\n    }\n\n    if (newUrls.length > 0) setImageUrls(prev => [...prev, ...newUrls]);\n\n    const messages: string[] = [];\n    if (rejectedCount > 0) messages.push(`${rejectedCount} file(s) were rejected because of type or size.`);\n    if (failures.length > 0) messages.push(`Upload failed for ${failures.join(', ')}`);\n    setImageUploadError(messages.length ? messages.join(' ') : null);\n    setIsUploadingImages(false);\n  };\n\n  const handleImageUpload''',
    re.S,
)

# Add product-level stock input.
replace_once(
    'app/admin/admin-client.tsx',
    '                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
    '                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">',
)
replace_once(
    'app/admin/admin-client.tsx',
    '''                      <div className="space-y-2">\n                        <label className="text-sm font-medium text-[#4A4036]">Category</label>\n                        <input \n                          value={category} \n                          onChange={(e) => setCategory(e.target.value)}\n                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"\n                          placeholder="Home Decor"\n                        />\n                      </div>\n                    </div>''',
    '''                      <div className="space-y-2">\n                        <label className="text-sm font-medium text-[#4A4036]">Category</label>\n                        <input \n                          value={category} \n                          onChange={(e) => setCategory(e.target.value)}\n                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"\n                          placeholder="Home Decor"\n                        />\n                      </div>\n                      <div className="space-y-2">\n                        <label className="text-sm font-medium text-[#4A4036]">Stock</label>\n                        <input\n                          type="number"\n                          min="0"\n                          step="1"\n                          value={stock}\n                          onChange={(e) => setStock(Math.max(0, parseInt(e.target.value || '0', 10)))}\n                          className="w-full p-3 bg-[#F9F8F4] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none transition-colors"\n                        />\n                      </div>\n                    </div>''',
)

# Show upload state and clear error; keep the browser from selecting more files mid-upload.
replace_once(
    'app/admin/admin-client.tsx',
    '                      <p className="text-xs text-[#786B59]">Add multiple images by clicking or dragging onto the upload area. Drag thumbnails to reorder. First image is the primary.</p>',
    '                      <p className="text-xs text-[#786B59]">Add multiple images by clicking or dragging onto the upload area. Drag thumbnails to reorder. First image is the primary. JPG, PNG, or WebP; max 10 MB each.</p>\n                      {isUploadingImages && <p className="text-xs text-[#4A4036]">Uploading images…</p>}\n                      {imageUploadError && <p className="text-xs text-[#8C3F3F]">{imageUploadError}</p>}',
)
replace_once(
    'app/admin/admin-client.tsx',
    '''                          <input\n                            type="file"\n                            accept="image/*"\n                            multiple\n                            onChange={handleImageUpload}\n                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"\n                          />''',
    '''                          <input\n                            type="file"\n                            accept="image/jpeg,image/png,image/webp"\n                            multiple\n                            disabled={isUploadingImages}\n                            onChange={handleImageUpload}\n                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"\n                          />''',
)

# Restore variation cost editing and persist only sizes that actually have a price.
replace_once(
    'app/admin/admin-client.tsx',
    '''                            <div className="flex items-center gap-2">\n                              <span className="text-xs text-[#786B59]">$</span>\n                              <input\n                                type="number"\n                                min="0"\n                                step="0.01"\n                                value={size.price || ''}\n                                onChange={(e) => updateSizePrice(index, e.target.value)}\n                                className="w-24 p-2 text-sm border border-[#E5E0D8] focus:border-[#2D2A26] outline-none"\n                                placeholder="0"\n                              />\n                            </div>''',
    '''                            <div className="flex items-center gap-3">\n                              <label className="flex items-center gap-1 text-xs text-[#786B59]">\n                                Price $\n                                <input\n                                  type="number"\n                                  min="0"\n                                  step="0.01"\n                                  value={size.price || ''}\n                                  onChange={(e) => updateSizeField(index, 'price', e.target.value)}\n                                  className="w-24 p-2 text-sm text-[#2D2A26] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none"\n                                  placeholder="0"\n                                />\n                              </label>\n                              <label className="flex items-center gap-1 text-xs text-[#786B59]">\n                                Cost $\n                                <input\n                                  type="number"\n                                  min="0"\n                                  step="0.01"\n                                  value={size.cost || ''}\n                                  onChange={(e) => updateSizeField(index, 'cost', e.target.value)}\n                                  className="w-24 p-2 text-sm text-[#2D2A26] border border-[#E5E0D8] focus:border-[#2D2A26] outline-none"\n                                  placeholder="0"\n                                />\n                              </label>\n                            </div>''',
)
replace_once(
    'app/admin/admin-client.tsx',
    '                      <Button onClick={handleSave}>\n                        Save Product\n                      </Button>',
    '                      <Button onClick={handleSave} disabled={isUploadingImages}>\n                        {isUploadingImages ? \'Uploading…\' : \'Save Product\'}\n                      </Button>',
)

# Multi-image rows store JSON arrays; never feed the JSON string itself to <img src>.
replace_once(
    'app/admin/admin-client.tsx',
    '<img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover bg-[#E5E0D8]" />',
    '<img src={parseImageUrls(product.image_url)[0] || \'/product-placeholder.svg\'} alt={product.name} className="w-10 h-10 object-cover bg-[#E5E0D8]" />',
)

# Next/Image must accept admin/CSV supplied remote URLs. SafeProductImage will also catch 404s.
Path('next.config.ts').write_text('''import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {\n  typescript: {\n    ignoreBuildErrors: true,\n  },\n  images: {\n    remotePatterns: [\n      { protocol: 'https', hostname: '**' },\n      { protocol: 'http', hostname: '**' },\n    ],\n  },\n};\n\nexport default nextConfig;\n''')

# Product card: resilient image display; filter zero-priced size placeholders; avoid a
# quick-add that would charge an averaged product price without a selected size.
p = Path('components/product-card.tsx')
t = p.read_text()
t = t.replace("import Image from 'next/image';", "import { SafeProductImage } from '@/components/safe-product-image';")
t = t.replace("  const primaryImage = imageUrls[0] || product.image_url;", "  const primaryImage = imageUrls[0] || product.image_url;\n  const pricedSizes = (product.sizes || []).filter(size => Number.isFinite(size.price) && size.price > 0);")
t = t.replace("product.sizes && product.sizes.length > 0", "pricedSizes.length > 0")
t = t.replace("Math.min(...product.sizes.map(s => s.price))", "Math.min(...pricedSizes.map(s => s.price))")
t = t.replace('<Image\n            src={primaryImage}', '<SafeProductImage\n            src={primaryImage}')
# Only show quick add for products without selectable priced sizes.
t = t.replace("        <button\n          onClick={handleAddToCart}", "        {pricedSizes.length === 0 && (\n        <button\n          onClick={handleAddToCart}")
t = t.replace("        </button>\n      </div>\n    </Link>", "        </button>\n        )}\n      </div>\n    </Link>")
p.write_text(t)

# Product detail: resilient images and defensive priced-size filtering.
p = Path('app/shop/[slug]/product-detail-client.tsx')
t = p.read_text()
t = t.replace("import Image from 'next/image';", "import { SafeProductImage } from '@/components/safe-product-image';")
t = t.replace("  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(\n    product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined\n  );", "  const availableSizes = (product.sizes || []).filter(size => Number.isFinite(size.price) && size.price > 0);\n  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(availableSizes[0]);")
t = t.replace("    if (product.sizes && product.sizes.length > 0) {\n      setSelectedSize(product.sizes[0]);", "    const validSizes = (product.sizes || []).filter(size => Number.isFinite(size.price) && size.price > 0);\n    if (validSizes.length > 0) {\n      setSelectedSize(validSizes[0]);")
t = t.replace('<Image\n                src={imageUrls[selectedImageIndex] || primaryImage}', '<SafeProductImage\n                src={imageUrls[selectedImageIndex] || primaryImage}')
t = t.replace("{product.sizes && product.sizes.length > 0 && (", "{availableSizes.length > 0 && (")
t = t.replace("const size = product.sizes?.find(s => s.label === e.target.value);", "const size = availableSizes.find(s => s.label === e.target.value);")
t = t.replace("{product.sizes.map((size) => (", "{availableSizes.map((size) => (")
t = t.replace('className={`flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-colors ${', 'className={`relative flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-colors ${')
t = t.replace('<Image\n                      src={url}', '<SafeProductImage\n                      src={url}')
p.write_text(t)

# Cart, drawer, and checkout all use the same resilient renderer, including old carts
# that may still contain malformed/legacy image strings.
for path in ['components/cart-drawer.tsx', 'app/cart/page.tsx', 'app/checkout/page.tsx']:
    p = Path(path)
    t = p.read_text()
    t = t.replace("import Image from 'next/image';", "import { SafeProductImage } from '@/components/safe-product-image';")
    t = t.replace('<Image src={item.imageUrl', '<SafeProductImage src={item.imageUrl')
    p.write_text(t)

# Refresh latest product metadata when an item already exists in the bag so old image
# URLs/names/base prices do not stay stale forever.
replace_once(
    'lib/cart-context.tsx',
    "        const newItems = [...prev];\n        newItems[existingIndex].quantity += 1;\n        return newItems;",
    "        const newItems = [...prev];\n        newItems[existingIndex] = {\n          ...newItems[existingIndex],\n          ...item,\n          quantity: newItems[existingIndex].quantity + 1,\n        };\n        return newItems;",
)

# Add auth checks to catalogue mutation endpoints and immediately invalidate storefront cache.
for path in ['app/api/products/route.ts', 'app/api/products/[id]/route.ts', 'app/api/products/import/route.ts']:
    p = Path(path)
    t = p.read_text()
    if "@/lib/admin-session" not in t:
        lines = t.splitlines()
        insert_at = 0
        while insert_at < len(lines) and lines[insert_at].startswith('import '):
            insert_at += 1
        lines.insert(insert_at, "import { hasAdminSession } from '@/lib/admin-session'")
        lines.insert(insert_at + 1, "import { revalidatePath } from 'next/cache'")
        t = '\n'.join(lines) + ('\n' if p.read_text().endswith('\n') else '')
    p.write_text(t)

replace_once(
    'app/api/products/route.ts',
    "export async function POST(request: NextRequest) {\n  try {",
    "export async function POST(request: NextRequest) {\n  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  try {",
)
replace_once(
    'app/api/products/route.ts',
    "    return NextResponse.json(newProduct, { status: 201 })",
    "    revalidatePath('/')\n    revalidatePath('/shop')\n    return NextResponse.json(newProduct, { status: 201 })",
)

replace_once(
    'app/api/products/[id]/route.ts',
    "  try {\n    const { id } = await context.params;\n    const body = await request.json()",
    "  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  try {\n    const { id } = await context.params;\n    const body = await request.json()",
)
# Target DELETE separately; first replacement above touches PUT only because body line is unique.
replace_once(
    'app/api/products/[id]/route.ts',
    "export async function DELETE(\n  request: NextRequest,\n  context: { params: Promise<{ id: string }> }\n) {\n  try {",
    "export async function DELETE(\n  request: NextRequest,\n  context: { params: Promise<{ id: string }> }\n) {\n  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  try {",
)
replace_once(
    'app/api/products/[id]/route.ts',
    "    return NextResponse.json(updatedProduct)",
    "    revalidatePath('/')\n    revalidatePath('/shop')\n    revalidatePath(`/shop/${id}`)\n    return NextResponse.json(updatedProduct)",
)
replace_once(
    'app/api/products/[id]/route.ts',
    "    return NextResponse.json({ message: 'Product deleted successfully' })",
    "    revalidatePath('/')\n    revalidatePath('/shop')\n    revalidatePath(`/shop/${id}`)\n    return NextResponse.json({ message: 'Product deleted successfully' })",
)

replace_once(
    'app/api/products/import/route.ts',
    "export async function POST(request: NextRequest) {\n  try {",
    "export async function POST(request: NextRequest) {\n  if (!hasAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  try {",
)
replace_once(
    'app/api/products/import/route.ts',
    "    // Return summary\n    return NextResponse.json(",
    "    // Return summary\n    revalidatePath('/')\n    revalidatePath('/shop')\n    return NextResponse.json(",
)

# Correct the CSV API's documented template so it matches the parser actually used.
replace_once(
    'app/api/products/import/route.ts',
    "      requiredHeaders: ['name', 'category', 'price', 'stock', 'imageUrl'],\n      optionalHeaders: ['description', 'salePrice', 'cost', 'videoUrl'],",
    "      requiredHeaders: ['name', 'category', 'stock', 'imageUrl'],\n      requiredPricing: 'At least one price_8x10 ... price_24x36 column must contain a positive price',\n      optionalHeaders: ['description', 'videoUrl', 'cost_8x10 ... cost_24x36'],",
)

# Handle query strings in external image URLs and safely encode filename path segments.
p = Path('lib/csv-parser.ts')
t = p.read_text()
t = t.replace("  const lowerUrl = url.toLowerCase();\n  return CSV_CONFIG.VALID_IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));", "  const lowerUrl = url.toLowerCase().split('?')[0].split('#')[0];\n  return CSV_CONFIG.VALID_IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));")
t = t.replace("  return `${supabaseUrl}/storage/v1/object/public/product-images/products/${trimmed}`;", "  const encoded = trimmed.split('/').map(part => encodeURIComponent(part)).join('/');\n  return `${supabaseUrl}/storage/v1/object/public/product-images/products/${encoded}`;")
p.write_text(t)

# Audit record retained in repo after the temporary patch script/workflow are removed.
Path('ADMIN_AUDIT_2026-09-10.md').write_text('''# Admin + Product Image Audit — 2026-09-10\n\n## Critical issues found\n\n1. Admin image uploads wrote directly to Supabase Storage with the public anon client. If Storage INSERT policy was missing, upload failed. The UI then silently converted the image to a base64 data URL and stored it in `products.image_url`. Those strings can be megabytes long, break checkout image metadata, bloat localStorage, and behave inconsistently across the site.\n2. Multi-image products are stored as a JSON array string in `products.image_url`, but the admin product table fed that raw JSON string to `<img src>`, which is invalid.\n3. Admin saved all standard sizes including zero-priced placeholders. Storefront code treated every saved size as saleable, so a listing could display/select a $0 size.\n4. Admin editing discarded per-size cost and always reset product stock/cost to 0.\n5. Product images can arrive from CSV as arbitrary remote URLs, while Next Image allowed only a few hosts. Valid admin images could therefore render in one place and fail in shop/cart.\n6. Cart entries persist image URLs in localStorage and previously did not refresh them when the same item was re-added after a listing image changed.\n7. Product create/update/delete/import APIs did not require the admin session even though the UI did.\n8. `/shop` and product detail pages cache for 5 minutes, so edits could look as if they had not applied. Mutation routes now invalidate the relevant pages immediately.\n\n## Fixes applied\n\n- Added authenticated server-side image upload endpoint. It uses `SUPABASE_SERVICE_ROLE_KEY` when available, ensures the `product-images` bucket is public, validates type/size, and returns a stable Supabase public URL. Anon-key fallback remains for existing Storage policies.\n- Removed base64 fallback behavior from admin upload flow; upload failures are now visible and are not silently saved as fake product URLs.\n- Added a shared `SafeProductImage` renderer with legacy JSON-array normalization and a local fallback image.\n- Fixed admin list thumbnails for multi-image products.\n- Added upload progress/error state and JPG/PNG/WebP 10 MB validation.\n- Restored product-level stock editing and per-size cost editing.\n- Persist only positive-priced sizes.\n- Store average product cost from the active variations rather than resetting cost to zero.\n- Filter invalid/zero-priced sizes defensively on product cards/detail pages.\n- Removed quick-add for products that require a size choice.\n- Refresh stale cart metadata when an existing item is re-added.\n- Protected product mutation/import endpoints with the current admin session cookie and revalidate storefront pages after changes.\n- Corrected CSV import template metadata and image URL validation/encoding.\n\n## Configuration requirement\n\nFor reliable production uploads, Vercel should contain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is used only server-side and must never be exposed as a `NEXT_PUBLIC_*` variable. The `product-images` bucket must be public because storefront product images are public assets.\n\n## Remaining security note\n\n`SUPABASE_SCHEMA.sql` contains permissive `FOR ALL USING (true)` policies on multiple tables. Protecting the Next.js mutation APIs prevents ordinary unauthenticated API writes, but those database policies should be tightened separately before a public launch so a caller with the public anon key cannot bypass the app and write directly to Supabase.\n''')

print('Admin audit patch applied successfully')
