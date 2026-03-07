import { test, expect } from '@playwright/test'

/**
 * Recipe tests for unauthenticated users.
 * For authenticated recipe tests, see recipes.auth.spec.ts
 */

test.describe('Recipe Management (Unauthenticated)', () => {
  test.describe('Recipe Import Page', () => {
    test('should redirect to signin when not authenticated', async ({ page }) => {
      await page.goto('/recipes/import')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect /recipes/new to signin when not authenticated', async ({ page }) => {
      await page.goto('/recipes/new')

      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /recipes to signin when not authenticated', async ({ page }) => {
      await page.goto('/recipes')

      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})

test.describe('Recipe Import (Unauthenticated)', () => {
  test('should redirect to signin for import page', async ({ page }) => {
    await page.goto('/recipes/import')

    // Should redirect to signin since import requires auth
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})
