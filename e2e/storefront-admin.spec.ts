import { expect, test, type Page } from '@playwright/test'
import { createHmac } from 'node:crypto'

// Synthetic login responses exercise real browser cookie handling and server
// middleware. The auth route itself has independent Node route tests; Next dev
// may expose a different internal request origin than Chromium's host.
function syntheticToken() {
  const expires = Math.floor(Date.now()/1000) + 3600
  const payload = 'v1.' + expires
  const signature = createHmac('sha256', 'tsu-e2e-synthetic-session-signing-key-not-for-production')
    .update(payload).digest('hex')
  return payload + '.' + signature
}
async function mockAuth(page: Page) {
  await page.route('**/api/admin/auth', async route => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status:200, contentType:'application/json',
        headers:{'set-cookie':'admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'},
        body:JSON.stringify({success:true}) })
    }
    const password = (route.request().postDataJSON() as {password:string}).password
    if (password !== 'tsu-e2e-synthetic-admin-password') {
      return route.fulfill({status:401,contentType:'application/json',
        body:JSON.stringify({error:'Invalid password'})})
    }
    return route.fulfill({status:200, contentType:'application/json',
      headers:{'set-cookie': 'admin_session='+syntheticToken()+'; Path=/; HttpOnly; SameSite=Lax'},
      body:JSON.stringify({success:true})})
  })
}
async function login(page: Page) {
  await mockAuth(page)
  await page.goto('/admin/login')
  await page.locator('input[type="password"]').fill('tsu-e2e-synthetic-admin-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)
  await expect(page.getByText('Total Products')).toBeVisible()
}

test('anonymous users cannot open administrator screens', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login(?:\?.*)?$/)
  await expect(page.getByText('Admin Portal')).toBeVisible()
})

test('admin rejects an incorrect password and successfully logs out after synthetic login', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/admin/login')
  await page.locator('input[type="password"]').fill('not-the-test-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Invalid password')).toBeVisible()
  await page.locator('input[type="password"]').fill('tsu-e2e-synthetic-admin-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)
  // The URL/dashboard HTML can appear before React has hydrated. Prove the
  // client has attached event handlers before testing its logout handler.
  await page.getByRole('button', { name: 'Orders', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Order Management' })).toBeVisible()
  // The deliberately unconfigured local database may trigger Next's dev overlay,
  // so DOM-dispatch this click to exercise the handler without hiding errors.
  await page.getByRole('button', { name: /logout|log out/i })
    .evaluate(button => (button as HTMLButtonElement).click())
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('admin product form rejects incomplete products without making write calls', async ({ page }) => {
  await login(page)
  let writes = 0
  await page.route('**/api/products', route => {
    if (route.request().method() !== 'GET') writes++
    return route.fulfill({ status: 500, contentType: 'application/json', body: '[]' })
  })
  await page.getByRole('button', { name: 'Products', exact: true }).click()
  await page.getByRole('button', { name: 'Add Product' }).click()
  await expect(page.getByRole('heading', { name: 'New Product' })).toBeVisible()
  const messages: string[] = []
  page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.dismiss() })
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect.poll(() => messages.length).toBe(1)
  expect(messages[0]).toMatch(/Name and Category/)
  await page.getByPlaceholder('Obsidian Vase').fill('Browser Fixture Print')
  await page.getByPlaceholder('e.g. Naruto, Jujutsu Kaisen').fill('Synthetic Series')
  await page.getByRole('button', { name: 'Save Product' }).click()
  await expect.poll(() => messages.length).toBe(2)
  expect(messages[1]).toMatch(/at least one size/)
  expect(writes).toBe(0)
})

test('admin product form sends normalized size pricing and displays server rejection without losing edits', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Products', exact: true }).click()
  await page.getByRole('button', { name: 'Add Product' }).click()
  await page.getByPlaceholder('Obsidian Vase').fill('Browser Fixture Print')
  await page.getByPlaceholder('e.g. Naruto, Jujutsu Kaisen').fill('Synthetic Series')
  const row = page.getByText('8" x 10"', { exact: true }).locator('xpath=../..')
  await row.locator('input[type="number"]').first().fill('12.50')
  let body: Record<string, unknown> | null = null
  await page.route('**/api/products', async route => {
    if (route.request().method() === 'POST') {
      body = route.request().postDataJSON()
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic error' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  const dialog = page.waitForEvent('dialog')
  await page.getByRole('button', { name: 'Save Product' }).click()
  const alert = await dialog
  expect(alert.message()).toBe('Failed to save product')
  await alert.dismiss()
  expect(body).toMatchObject({
    name: 'Browser Fixture Print', category: 'Synthetic Series', price: 12.5,
    sizes: [{ label: '8" x 10"', price: 12.5 }],
  })
  await expect(page.getByRole('heading', { name: 'New Product' })).toBeVisible()
  await expect(page.getByPlaceholder('Obsidian Vase')).toHaveValue('Browser Fixture Print')
})

test('admin order and settings navigation supports empty data without payment or database writes', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Orders', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Order Management' })).toBeVisible()
  await expect(page.getByText('No orders yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible()
  await expect(page.getByText(/You are currently signed in/)).toBeVisible()
})

test('empty storefront provides usable navigation and an explicit search no-results state', async ({ page }) => {
  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: 'The Collection' })).toBeVisible()
  await page.getByPlaceholder('Search collection...').fill('There-Is-No-Test-Product')
  await expect(page.getByText('No products found matching your criteria.')).toBeVisible()
  await page.locator('nav').getByRole('link', { name: 'HOME', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
})

test.describe('mobile storefront at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
  test('hamburger navigation reaches the empty shop without horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Toggle menu' }).click()
    await page.locator('nav').getByRole('link', { name: 'Shop', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'The Collection' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
  })
  test('waitlist shows server failure, then handles a synthetic success without contacting email provider', async ({ page }) => {
    await page.goto('/under-construction')
    let succeed = false
    let requests = 0
    await page.route('**/api/waitlist', route => {
      requests++
      expect(route.request().postDataJSON()).toMatchObject({ email: 'browser@example.test' })
      return route.fulfill({
        status: succeed ? 200 : 503, contentType: 'application/json',
        body: JSON.stringify(succeed ? { status: 'added' } : { error: 'Waitlist temporarily unavailable' }),
      })
    })
    await page.getByRole('textbox', { name: 'Email address' }).fill('browser@example.test')
    await page.getByRole('button', { name: 'Notify me' }).click()
    await expect(page.getByText('Waitlist temporarily unavailable')).toBeVisible()
    succeed = true
    await page.getByRole('button', { name: 'Notify me' }).click()
    await expect(page.getByText(/You're on the list/)).toBeVisible()
    expect(requests).toBe(2)
  })
})
