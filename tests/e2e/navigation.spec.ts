import { test, expect } from '@playwright/test'

/**
 * Navigation tests for unauthenticated users.
 * Authenticated navigation is tested in recipes.auth.spec.ts
 */

test.describe('Navigation (Unauthenticated)', () => {
  test.describe('Public Header', () => {
    test('should show signin and signup links when not authenticated', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
    })

    test('should navigate to signin', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Sign in' }).click()

      await expect(page).toHaveURL('/auth/signin')
    })

    test('should navigate to signup', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('link', { name: 'Get Started' }).click()

      await expect(page).toHaveURL('/auth/signup')
    })
  })

  test.describe('Logo Navigation', () => {
    test('should navigate to home when clicking logo', async ({ page }) => {
      await page.goto('/auth/signin')

      // Click the logo/site name
      await page.getByRole('link', { name: 'TwoTeaspoons TwoTeaspoons' }).click()

      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Dark Mode Toggle', () => {
    test('should have dark mode toggle button', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('button', { name: 'Toggle color mode' })).toBeVisible()
    })

    test('should be able to click dark mode toggle', async ({ page }) => {
      await page.goto('/')

      const toggleButton = page.getByRole('button', { name: 'Toggle color mode' })
      await expect(toggleButton).toBeVisible()
      await expect(toggleButton).toBeEnabled()

      // Click should not throw error
      await toggleButton.click()

      // Button should still be visible after click
      await expect(toggleButton).toBeVisible()
    })
  })

  test.describe('Protected Route Redirects', () => {
    test('should redirect My Recipes to signin when unauthenticated', async ({ page }) => {
      await page.goto('/recipes')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect Collections to signin when unauthenticated', async ({ page }) => {
      await page.goto('/collections')

      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect Shopping to signin when unauthenticated', async ({ page }) => {
      await page.goto('/shopping')

      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect Meal Plan to signin when unauthenticated', async ({ page }) => {
      await page.goto('/meal-plan')

      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})
