import { expect, test } from '@playwright/test'

test('contact form is labelled, keyboard operable and shows an accessible error', async ({ page }) => {
  await page.route('**/api/contact', route => route.fulfill({
    status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Too many messages. Please try again later.' }),
  }))
  await page.goto('/contact')
  await page.getByLabel('Name').fill('Aiko')
  await page.getByLabel('Email').fill('aiko@buyer.com')
  await page.getByLabel('Message').fill('Where is my order? Thanks.')
  await page.getByRole('button', { name: 'Send message' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Too many messages')
})
