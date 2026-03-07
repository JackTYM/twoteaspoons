import { test, expect } from '@playwright/test'

/**
 * Shopping list tests for unauthenticated users.
 * For authenticated shopping tests, see shopping.auth.spec.ts
 */

test.describe('Shopping Lists (Unauthenticated)', () => {
  test.describe('Protected Routes', () => {
    test('should redirect to signin when not authenticated', async ({ page }) => {
      await page.goto('/shopping')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /shopping/new to signin when not authenticated', async ({ page }) => {
      await page.goto('/shopping/new')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})
