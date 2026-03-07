import { test, expect } from '@playwright/test'

/**
 * Collections tests for unauthenticated users.
 * For authenticated collections tests, see collections.auth.spec.ts
 */

test.describe('Collections (Unauthenticated)', () => {
  test.describe('Protected Routes', () => {
    test('should redirect to signin when not authenticated', async ({ page }) => {
      await page.goto('/collections')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /collections/new to signin when not authenticated', async ({ page }) => {
      await page.goto('/collections/new')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})
