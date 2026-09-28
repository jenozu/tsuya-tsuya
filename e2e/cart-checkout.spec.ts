import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const storageKey = 'tsuyanouchi_cart'
const id = '00000000-0000-4000-8000-000000000001'
const firstSize = { label: '8" x 10"', price: 12.5 }
const secondSize = { label: '11" x 14"', price: 22 }

function cartLine(size=firstSize, quantity=1) {
  return {
    id, name: 'Test Art Print', price: 17.25, quantity,
    imageUrl: '/product-placeholder.svg', selectedSize: size,
  }
}

async function seedCart(page: Page, lines: unknown) {
  // Seed before React hydration rather than racing the first empty-cart write.
  // Session storage makes this a one-time seed: refreshes and checkout
  // navigation must preserve actual cart changes, not reinstate the fixture.
  await page.addInitScript(({ key, value }) => {
    const marker = '__playwright_cart_seeded'
    if (!sessionStorage.getItem(marker)) {
      localStorage.setItem(key, value)
      sessionStorage.setItem(marker, 'true')
    }
  }, { key: storageKey, value: JSON.stringify(lines) })
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible()
}

async function waitForCart(page: Page) {
  await expect(page.getByTestId('cart-line').first()).toBeVisible()
}

test('selected variation and quantity persist after browser refresh', async ({ page }) => {
  await seedCart(page, [cartLine(firstSize,2)])
  await waitForCart(page)
  await expect(page.getByTestId('cart-line').getByText('Size: 8" x 10"')).toBeVisible()
  await expect(page.getByTestId('cart-line-quantity')).toHaveText('2')
  await page.reload()
  await waitForCart(page)
  await expect(page.getByTestId('cart-line').getByText('Size: 8" x 10"')).toBeVisible()
  await expect(page.getByTestId('cart-line-quantity')).toHaveText('2')
})

test('independent variation lines preserve identity when the other is removed', async ({ page }) => {
  await seedCart(page, [cartLine(firstSize),cartLine(secondSize)])
  await expect(page.getByTestId('cart-line')).toHaveCount(2)
  await page.getByRole('button',{ name: /Remove Test Art Print 8" x 10" from cart/ }).click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('cart-line').getByText('Size: 11" x 14"')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('cart-line').getByText('Size: 11" x 14"')).toBeVisible()
})

test('cross-tab edits synchronize and quantity caps prevent runaway carts', async ({ context, page }) => {
  await seedCart(page, [cartLine(firstSize,19)])
  await waitForCart(page)
  const second = await context.newPage()
  await second.goto('/cart')
  await expect(second.getByTestId('cart-line-quantity')).toHaveText('19')
  await second.getByRole('button',{ name:'Increase quantity of Test Art Print' }).click()
  await expect(second.getByTestId('cart-line-quantity')).toHaveText('20')
  await expect(page.getByTestId('cart-line-quantity')).toHaveText('20')
  await second.getByRole('button',{ name:'Increase quantity of Test Art Print' }).click()
  await expect(second.getByTestId('cart-line-quantity')).toHaveText('20')
})

test('corrupt cached records are rejected instead of crashing the cart', async ({ page }) => {
  await seedCart(page, [{ ...cartLine(), quantity: -99 },
    { ...cartLine(), selectedSize: {label:'8" x 10"',price:0} }])
  await expect(page.getByText('Your cart is empty')).toBeVisible()
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await expect(page.getByText('Your cart is empty')).toBeVisible()
})

test.describe('mobile checkout — mocked catalog and no provider calls', () => {
  test.use({ viewport: {width:375,height:812}, isMobile:true, hasTouch:true })
  const catalog = [{
    id, name:'Test Art Print', price:21, stock:5, description:'',
    category:'Art Prints', image_url:'/product-placeholder.svg',
    sizes:[{label:'8" x 10"',price:18},{label:'11" x 14"',price:24}],
  }]

  test('refreshes outdated variation prices and handles checkout rejection safely', async ({page}) => {
    await page.route('**/api/products', route => route.fulfill({
      status:200, contentType:'application/json',body:JSON.stringify(catalog),
    }))
    await page.route('**/api/shipping/rate?**', route => route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify({price:0}),
    }))
    await seedCart(page,[cartLine(firstSize)])
    await page.getByRole('button', {name:'Proceed to Checkout'}).click()
    await expect(page.getByText(/Your cart was updated to current prices/i)).toBeVisible()
    await expect(page.getByRole('button',{name:'Proceed to payment'})).toBeEnabled()
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'[]'),storageKey)
    expect(saved[0].selectedSize.price).toBe(18)

    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
    await page.locator('input[name="firstName"]').fill('Test')
    await page.locator('input[name="lastName"]').fill('Customer')
    await page.locator('input[name="email"]').fill('buyer@example.test')
    await page.locator('input[name="address"]').fill('123 Example Street')
    await page.locator('input[name="city"]').fill('Testville')
    await page.locator('input[name="state"]').fill('NY')
    await page.locator('input[name="postalCode"]').fill('10001')
    let called=false
    await page.route('**/api/checkout/create-session', async route=>{
      called=true
      const payload=route.request().postDataJSON()
      expect(payload.items[0].sizeLabel).toBe('8" x 10"')
      expect(payload.items[0].quantity).toBe(1)
      await route.fulfill({status:409, contentType:'application/json',
        body:JSON.stringify({error:'Your cart totals changed. Refresh checkout.'})})
    })
    await page.getByRole('button',{name:'Proceed to payment'}).click()
    await expect(page.getByText('Your cart totals changed. Refresh checkout.')).toBeVisible()
    expect(called).toBe(true)
  })

  test('removes a discontinued cached variation instead of silently changing the size', async ({page}) => {
    await page.route('**/api/products', route => route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify([{...catalog[0],sizes:[{label:'11" x 14"',price:24}]}]),
    }))
    await seedCart(page,[cartLine(firstSize)])
    await page.goto('/checkout')
    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect.poll(async () => page.evaluate(
      key => JSON.parse(localStorage.getItem(key) ?? '[]'), storageKey,
    )).toEqual([])
  })
})
