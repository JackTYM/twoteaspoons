import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    const response = await page.goto('/')
    // Verify page loads with 200 status
    expect(response?.status()).toBe(200)
    // Verify body is visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should render page content', async ({ page }) => {
    await page.goto('/')
    // Verify the page has visible content
    await expect(page.locator('body')).toBeVisible()
    // Check that the page has some text content (not empty)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(0)
  })
})
