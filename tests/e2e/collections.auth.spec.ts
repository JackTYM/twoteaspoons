import { test, expect } from '@playwright/test'

test.describe('Collections (Authenticated)', () => {
  test.describe('Collections Index', () => {
    test('should show collections page', async ({ page }) => {
      await page.goto('/collections')

      await expect(page.getByRole('heading', { name: 'My Collections' })).toBeVisible()
    })

    test('should have link to create new collection', async ({ page }) => {
      await page.goto('/collections')

      const newCollectionLink = page.getByRole('link', { name: /New Collection/i })
      await expect(newCollectionLink).toBeVisible()
    })
  })

  test.describe('Collection Creation', () => {
    test('should create a new collection', async ({ page }) => {
      await page.goto('/collections/new')

      // Fill in collection details using inline editor placeholders
      const collectionName = `Test Collection ${Date.now()}`
      const nameInput = page.getByPlaceholder('Collection name...')
      await nameInput.waitFor({ state: 'visible', timeout: 10000 })
      await nameInput.click()
      await nameInput.pressSequentially(collectionName, { delay: 10 })

      const descInput = page.getByPlaceholder('Add a description (optional)...')
      await descInput.click()
      await descInput.pressSequentially('A test collection for E2E tests', { delay: 10 })

      // Create the collection and wait for navigation
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 15000 })

      // Should be on collection detail page
      await expect(page.getByRole('heading', { name: collectionName })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('A test collection for E2E tests')).toBeVisible()
    })

    test('should create a private collection by default', async ({ page }) => {
      await page.goto('/collections/new')

      const collectionName = `Private Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Should show Private badge
      await expect(page.getByText('Private')).toBeVisible({ timeout: 10000 })
    })

    test('should create a public collection when toggled', async ({ page }) => {
      await page.goto('/collections/new')

      const collectionName = `Public Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)

      // Toggle public switch
      await page.getByRole('switch').click()

      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Should show Public badge
      await expect(page.getByText('Public')).toBeVisible({ timeout: 10000 })
    })

    test('should require name for collection', async ({ page }) => {
      await page.goto('/collections/new')

      // Don't fill in name, just description
      await page.getByPlaceholder('Add a description (optional)...').fill('Description only')

      // Try to create - should not work (validation)
      const createButton = page.getByRole('button', { name: 'Create Collection' })
      await createButton.click()

      // Should still be on the same page (validation failed)
      await expect(page).toHaveURL('/collections/new')
    })
  })

  test.describe('Collection Detail', () => {
    test('should show empty state when collection has no recipes', async ({ page }) => {
      // Create a collection
      await page.goto('/collections/new')
      const collectionName = `Empty Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Should show empty state
      await expect(page.getByText('No recipes yet')).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('link', { name: 'Browse Recipes' })).toBeVisible()
    })

    test('should show recipe count', async ({ page }) => {
      // Create a collection
      await page.goto('/collections/new')
      const collectionName = `Count Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Should show 0 recipes
      await expect(page.getByText('0 recipes')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Collection Edit', () => {
    test('should show edit button for owned collection', async ({ page }) => {
      // Create a collection
      await page.goto('/collections/new')
      const collectionName = `Editable Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Should have edit button
      await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible({ timeout: 10000 })
    })

    test('should edit collection details', async ({ page }) => {
      // Create a collection
      await page.goto('/collections/new')
      const originalName = `Original Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(originalName)
      await page.getByPlaceholder('Add a description (optional)...').fill('Original description')
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Click edit
      await page.getByRole('link', { name: 'Edit' }).click()
      await page.waitForURL(/\/collections\/\d+\/edit/, { timeout: 10000 })

      // Update name and description using inline editor
      const updatedName = `Updated Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(updatedName)
      await page.getByPlaceholder('Add a description (optional)...').fill('Updated description')

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click()
      await page.waitForURL(/\/collections\/\d+$/, { timeout: 10000 })

      // Verify updates
      await expect(page.getByRole('heading', { name: updatedName })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Updated description')).toBeVisible()
    })
  })

  test.describe('Collection Navigation', () => {
    test('should navigate back to collections list', async ({ page }) => {
      // Create a collection
      await page.goto('/collections/new')
      const collectionName = `Nav Collection ${Date.now()}`
      await page.getByPlaceholder('Collection name...').fill(collectionName)
      await page.getByRole('button', { name: 'Create Collection' }).click()
      await page.waitForURL(/\/collections\/\d+/, { timeout: 10000 })

      // Click back link
      await page.getByRole('link', { name: 'Back to Collections' }).click()

      // Should be on collections list
      await expect(page).toHaveURL('/collections')
      await expect(page.getByRole('heading', { name: 'My Collections' })).toBeVisible()
    })
  })
})
