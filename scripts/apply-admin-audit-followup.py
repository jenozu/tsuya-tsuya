from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


def regex_once(path, pattern, repl, flags=0):
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, got {count}: {pattern}")
    p.write_text(updated)


# Use an expiring, HMAC-signed admin session cookie. The previous literal
# `admin_session=authenticated` value could be forged by any HTTP client.
Path('lib/admin-session.ts').write_text(r'''const SESSION_COOKIE = 'admin_session'
const SESSION_VERSION = 'v1'
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null
}

function parseCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const part of cookieHeader.split(';')) {
    const [cookieName, ...rest] = part.trim().split('=')
    if (cookieName !== name) continue
    try {
      return decodeURIComponent(rest.join('='))
    } catch {
      return null
    }
  }
  return null
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bytesToHex(signature)
}

export async function createAdminSessionToken(): Promise<string> {
  const secret = getSessionSecret()
  if (!secret) throw new Error('Admin session secret is not configured')

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE
  const payload = `${SESSION_VERSION}.${expiresAt}`
  const signature = await sign(payload, secret)
  return `${payload}.${signature}`
}

export async function hasAdminSession(request: Request): Promise<boolean> {
  const token = parseCookie(request, SESSION_COOKIE)
  const secret = getSessionSecret()
  if (!token || !secret) return false

  const [version, expiresRaw, signature, ...extra] = token.split('.')
  if (extra.length > 0 || version !== SESSION_VERSION || !expiresRaw || !signature) return false

  const expiresAt = Number(expiresRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_MAX_AGE + 300) {
    return false
  }

  const payload = `${version}.${expiresAt}`
  const expected = await sign(payload, secret)
  return constantTimeEqual(signature, expected)
}
''')

# Issue the signed session token on successful login.
Path('app/api/admin/auth/route.ts').write_text(r'''import { NextResponse } from 'next/server'
import { ADMIN_SESSION_MAX_AGE, createAdminSessionToken } from '@/lib/admin-session'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', await createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
''')

# Middleware validates the signed cookie for admin pages and owner bypass access.
Path('middleware.ts').write_text(r'''import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasAdminSession } from '@/lib/admin-session'

const UNDER_CONSTRUCTION = process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdmin = pathname.startsWith('/admin')
  const hasAdminAccess = (UNDER_CONSTRUCTION || isAdmin)
    ? await hasAdminSession(request)
    : false

  if (UNDER_CONSTRUCTION) {
    const isUnderConstructionPage = pathname === '/under-construction'
    const isApi = pathname.startsWith('/api')
    const isStatic = pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image')
    const isFavicon = pathname === '/favicon.ico'
    const previewCookie = request.cookies.get('preview_access')
    const hasPreviewAccess = previewCookie?.value === 'granted'

    if (!isUnderConstructionPage && !isApi && !isStatic && !isFavicon && !isAdmin && !hasAdminAccess && !hasPreviewAccess) {
      return NextResponse.redirect(new URL('/under-construction', request.url))
    }
  }

  if (isAdmin && !pathname.startsWith('/admin/login') && !hasAdminAccess) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
''')

# All API checks now await signed-session verification.
for path in [
    'app/api/admin/product-images/route.ts',
    'app/api/products/route.ts',
    'app/api/products/[id]/route.ts',
    'app/api/products/import/route.ts',
]:
    p = Path(path)
    text = p.read_text().replace('if (!hasAdminSession(request))', 'if (!(await hasAdminSession(request)))')
    p.write_text(text)

# Product image uploads request a signed Supabase upload target first, then upload bytes
# directly from the browser to Supabase. If the service-role key is not configured, the
# route provides a backwards-compatible anon target so existing Storage INSERT policies
# continue to work. This avoids Vercel function request-body limits.
regex_once(
    'lib/supabase-helpers.ts',
    r"export async function uploadProductImage\(file: File, fileName: string\): Promise<string \| null> \{.*?\n\}\n\nexport async function deleteProductImage",
    r'''export async function uploadProductImage(file: File, fileName: string): Promise<string | null> {
  const setupResponse = await fetch('/api/admin/product-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileType: file.type,
      fileSize: file.size,
    }),
  })
  const setup = await setupResponse.json().catch(() => ({}))

  if (!setupResponse.ok || typeof setup.path !== 'string' || typeof setup.url !== 'string') {
    throw new Error(setup.error || 'Could not prepare image upload')
  }

  if (setup.mode === 'signed') {
    if (typeof setup.token !== 'string') throw new Error('Signed upload token is missing')
    const { error } = await supabase.storage
      .from('product-images')
      .uploadToSignedUrl(setup.path, setup.token, file, {
        cacheControl: '31536000',
        contentType: file.type,
      })
    if (error) throw error
    return setup.url
  }

  const { error } = await supabase.storage
    .from('product-images')
    .upload(setup.path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`${error.message}. Add SUPABASE_SERVICE_ROLE_KEY to Vercel or allow authenticated admin uploads in the product-images bucket.`)
  }

  return setup.url
}

export async function deleteProductImage''',
    re.S,
)

# Legacy cart entries may still contain base64 image data. Next/Image requires inline
# sources to bypass optimization, while ordinary URLs retain optimization/fallbacks.
replace_once(
    'components/safe-product-image.tsx',
    "  return (\n    <Image\n      {...props}\n      src={currentSrc}",
    "  const inlineImage = currentSrc.startsWith('data:') || currentSrc.startsWith('blob:')\n\n  return (\n    <Image\n      {...props}\n      src={currentSrc}\n      unoptimized={props.unoptimized ?? inlineImage}",
)

# Do not use a remote random image as checkout fallback; the shared component handles a
# deterministic local placeholder and broken URL recovery.
replace_once(
    'app/checkout/page.tsx',
    "src={item.imageUrl || 'https://picsum.photos/64/64'}",
    "src={item.imageUrl}",
)

# Keep client state synchronized after router.refresh() updates the Server Component props.
replace_once(
    'app/admin/admin-client.tsx',
    "  const [isImporting, setIsImporting] = useState(false);\n\n  // --- Calculations for Dashboard ---",
    "  const [isImporting, setIsImporting] = useState(false);\n\n  React.useEffect(() => { setProducts(initialProducts); }, [initialProducts]);\n  React.useEffect(() => { setOrders(initialOrders); }, [initialOrders]);\n\n  // --- Calculations for Dashboard ---",
)

# Replace simulated sales with actual order performance, honoring 7D / 30D / YTD.
regex_once(
    'app/admin/admin-client.tsx',
    r"  // Mock Sales Data\n  const salesData = useMemo\(\(\) => \{.*?\n  \}, \[totalValue\]\);",
    r'''  const salesData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (timeRange === '7D') start.setDate(now.getDate() - 6);
    else if (timeRange === '30D') start.setDate(now.getDate() - 29);
    else start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    const productById = new Map(products.map(product => [product.id, product]));
    const productByName = new Map(products.map(product => [product.name, product]));
    const buckets = new Map<string, { period: string; revenue: number; cost: number }>();

    const addBucket = (date: Date) => {
      const key = timeRange === 'YTD'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10);
      if (!buckets.has(key)) {
        buckets.set(key, {
          period: timeRange === 'YTD'
            ? date.toLocaleDateString(undefined, { month: 'short' })
            : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          revenue: 0,
          cost: 0,
        });
      }
      return buckets.get(key)!;
    };

    if (timeRange === 'YTD') {
      for (let month = 0; month <= now.getMonth(); month += 1) {
        addBucket(new Date(now.getFullYear(), month, 1));
      }
    } else {
      const cursor = new Date(start);
      while (cursor <= now) {
        addBucket(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    for (const order of orders) {
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime()) || date < start || date > now) continue;
      if (['failed', 'canceled', 'cancelled'].includes(order.status?.toLowerCase())) continue;
      if (['failed', 'canceled', 'cancelled'].includes(order.payment_status?.toLowerCase())) continue;

      const bucket = addBucket(date);
      for (const item of order.items || []) {
        const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
        bucket.revenue += (Number.isFinite(item.price) ? item.price : 0) * quantity;
        const product = productById.get(item.productId) || productByName.get(item.productName);
        const sizeCost = item.selectedSize
          ? product?.sizes?.find(size => size.label === item.selectedSize)?.cost
          : undefined;
        bucket.cost += (sizeCost ?? product?.cost ?? 0) * quantity;
      }
    }

    return Array.from(buckets.values()).map(item => ({
      ...item,
      profit: item.revenue - item.cost,
      profitMargin: item.revenue > 0 ? Math.round(((item.revenue - item.cost) / item.revenue) * 100) : 0,
    }));
  }, [orders, products, timeRange]);''',
    re.S,
)
replace_once(
    'app/admin/admin-client.tsx',
    '<XAxis dataKey="month" stroke="#786B59" fontSize={12} tickLine={false} />',
    '<XAxis dataKey="period" stroke="#786B59" fontSize={12} tickLine={false} interval="preserveStartEnd" />',
)
replace_once(
    'app/admin/admin-client.tsx',
    '<YAxis stroke="#786B59" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />',
    '<YAxis stroke="#786B59" fontSize={12} tickLine={false} tickFormatter={(val) => val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`} />',
)
replace_once(
    'app/admin/admin-client.tsx',
    '                      Showing simulated 6-month performance based on current inventory mix.',
    '                      Showing actual {timeRange} order revenue, estimated product cost, and gross profit.',
)

# Avoid mutating the products React state array while rendering the valuation detail modal.
replace_once(
    'app/admin/admin-client.tsx',
    "{products.sort((a,b) => (b.price * b.stock) - (a.price * a.stock)).map(item => {",
    "{[...products].sort((a,b) => (b.price * b.stock) - (a.price * a.stock)).map(item => {",
)

# The legacy order-create endpoint is not part of checkout (Stripe webhook creates orders).
# Requiring the admin session prevents arbitrary callers from inserting fake orders.
p = Path('app/api/orders/route.ts')
text = p.read_text()
text = text.replace("import { createOrder } from '@/lib/supabase-helpers'", "import { createOrder } from '@/lib/supabase-helpers'\nimport { hasAdminSession } from '@/lib/admin-session'")
text = text.replace("export async function POST(request: Request) {\n  try {", "export async function POST(request: Request) {\n  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  try {")
p.write_text(text)

# Keep the audit record aligned with the final implementation.
p = Path('ADMIN_AUDIT_2026-09-10.md')
text = p.read_text()
text = text.replace(
    '- Added authenticated server-side image upload endpoint. It uses `SUPABASE_SERVICE_ROLE_KEY` when available, ensures the `product-images` bucket is public, validates type/size, and returns a stable Supabase public URL. Anon-key fallback remains for existing Storage policies.',
    '- Added authenticated image-upload setup with direct-to-Supabase uploads. With `SUPABASE_SERVICE_ROLE_KEY`, the server ensures the public bucket exists and issues a signed upload token; existing anon Storage policies remain a backwards-compatible fallback. Image bytes no longer pass through Vercel functions.'
)
text = text.replace(
    '- Protected product mutation/import endpoints with the current admin session cookie and revalidate storefront pages after changes.',
    '- Replaced the forgeable literal admin cookie with an expiring HMAC-signed session and protected product mutation/import/image/order-create endpoints. Storefront pages are revalidated after catalogue changes.'
)
text = text.replace(
    '- Corrected CSV import template metadata and image URL validation/encoding.',
    '- Corrected CSV import template metadata and image URL validation/encoding.\n- Replaced simulated sales analytics with actual order-derived 7D / 30D / YTD data and kept client admin state synchronized after refresh.'
)
p.write_text(text)

print('Admin audit follow-up patch applied')
