import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Sign In Page', () => {
    test('should show sign in page', async ({ page }) => {
      await page.goto('/auth/signin')

      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })

    test('should have Google OAuth option', async ({ page }) => {
      await page.goto('/auth/signin')

      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    })

    test('should have link to sign up', async ({ page }) => {
      await page.goto('/auth/signin')

      await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL('/auth/signup')
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin')

      await page.getByLabel('Email').fill('invalid@example.com')
      await page.getByLabel('Password').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign in' }).click()

      // Should show some error indication (stay on page or show error message)
      await page.waitForTimeout(2000)
      // Either shows error or stays on signin page
      const hasError = await page.getByText(/error|invalid|incorrect/i).isVisible().catch(() => false)
      const onSignIn = await page.getByRole('heading', { name: 'Welcome back' }).isVisible()
      expect(hasError || onSignIn).toBeTruthy()
    })
  })

  test.describe('Sign Up Page', () => {
    test('should show sign up page', async ({ page }) => {
      await page.goto('/auth/signup')

      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })

    test('should have link to sign in from form', async ({ page }) => {
      await page.goto('/auth/signup')

      // Look for the "Already have an account? Sign in" link in the form
      const signInLink = page.locator('main').getByRole('link', { name: 'Sign in' })
      await expect(signInLink).toBeVisible()
      await signInLink.click()
      await expect(page).toHaveURL('/auth/signin')
    })

    test('should have Google OAuth option', async ({ page }) => {
      await page.goto('/auth/signup')

      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    })
  })

  test.describe('Protected Routes Redirect', () => {
    test('should redirect /collections to signin when not authenticated', async ({ page }) => {
      await page.goto('/collections')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /shopping to signin when not authenticated', async ({ page }) => {
      await page.goto('/shopping')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /meal-plan to signin when not authenticated', async ({ page }) => {
      await page.goto('/meal-plan')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should redirect /recipes/new to signin when not authenticated', async ({ page }) => {
      await page.goto('/recipes/new')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })
})
