import { test, expect } from '@playwright/test'

test.describe('Shopping Lists (Authenticated)', () => {
  // Helper to create a recipe for shopping list tests
  async function createTestRecipe(page: Parameters<Parameters<typeof test>[1]>[0]['page'], name: string): Promise<void> {
    await page.goto('/recipes/new')
    await page.getByLabel('Title').fill(name)
    await page.locator('input[placeholder="1"]').first().fill('2')
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'cup' }).click()
    await page.locator('input[placeholder="Ingredient name"]').fill('flour')
    await page.locator('textarea[placeholder="Describe this step..."]').fill('Mix flour')
    await page.getByRole('button', { name: 'Create Recipe' }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }

  test.describe('Shopping List Index', () => {
    test('should show shopping lists page', async ({ page }) => {
      await page.goto('/shopping')

      await expect(page.getByRole('heading', { name: 'Shopping Lists' })).toBeVisible()
    })

    test('should have link to create new list', async ({ page }) => {
      await page.goto('/shopping')

      const newListLink = page.getByRole('link', { name: /New List/i })
      await expect(newListLink).toBeVisible()
    })
  })

  test.describe('Shopping List Creation', () => {
    test('should show two creation options on new page', async ({ page }) => {
      await page.goto('/shopping/new')

      await expect(page.getByRole('heading', { name: 'Create Shopping List' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Start from Scratch/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /From Recipes/i })).toBeVisible()
    })

    test('should create a shopping list from recipes', async ({ page }) => {
      // First create a recipe
      const recipeName = `Shopping Recipe ${Date.now()}`
      await createTestRecipe(page, recipeName)

      // Navigate to shopping list creation
      await page.goto('/shopping/new')

      await expect(page.getByRole('heading', { name: 'Create Shopping List' })).toBeVisible()

      // Click on "From Recipes" option
      await page.getByRole('button', { name: /From Recipes/i }).click()

      // Fill in list name
      const listName = `Test List ${Date.now()}`
      await page.getByLabel('List Name').fill(listName)

      // Select the recipe (click on the recipe card)
      await page.getByRole('heading', { name: recipeName }).click()

      // Should show 1 selected
      await expect(page.getByText('1 selected')).toBeVisible()

      // Create the list
      await page.getByRole('button', { name: 'Create Shopping List' }).click()

      // Should navigate to list detail page
      await expect(page.getByRole('heading', { name: listName })).toBeVisible()
      await expect(page.getByText('flour')).toBeVisible()
      await expect(page.getByText('2 cup')).toBeVisible()
    })

    test('should disable create button when no recipes selected', async ({ page }) => {
      await page.goto('/shopping/new')

      // Click on "From Recipes" option
      await page.getByRole('button', { name: /From Recipes/i }).click()

      // Create button should be disabled initially
      const createButton = page.getByRole('button', { name: 'Create Shopping List' })
      await expect(createButton).toBeDisabled()
    })
  })

  test.describe('Shopping List Item Toggle', () => {
    test('should toggle item checked state without page flash', async ({ page }) => {
      // Create a recipe first
      const recipeName = `Toggle Recipe ${Date.now()}`
      await createTestRecipe(page, recipeName)

      // Create a shopping list
      await page.goto('/shopping/new')
      // Click on "From Recipes" option
      await page.getByRole('button', { name: /From Recipes/i }).click()
      const listName = `Toggle List ${Date.now()}`
      await page.getByLabel('List Name').fill(listName)
      await page.getByRole('heading', { name: recipeName }).click()
      await page.getByRole('button', { name: 'Create Shopping List' }).click()

      // Wait for list to load
      await expect(page.getByRole('heading', { name: listName })).toBeVisible()

      // Initial state should show 0 checked
      await expect(page.getByText('0 of 1 items')).toBeVisible()
      await expect(page.getByText('0%')).toBeVisible()

      // Click on item to toggle
      await page.getByText('flour').click()

      // Should update to checked state
      await expect(page.getByText('1 of 1 items')).toBeVisible()
      await expect(page.getByText('100%')).toBeVisible()
      await expect(page.getByText('Shopping complete!')).toBeVisible()

      // Click again to uncheck
      await page.getByText('flour').click()

      // Should return to unchecked state
      await expect(page.getByText('0 of 1 items')).toBeVisible()
      await expect(page.getByText('0%')).toBeVisible()
    })

    test('should preserve amounts as fractions not decimals', async ({ page }) => {
      // Create a recipe with fractional amount
      await page.goto('/recipes/new')
      const recipeName = `Fraction Recipe ${Date.now()}`
      await page.getByLabel('Title').fill(recipeName)
      await page.locator('input[placeholder="1"]').first().fill('1/2')
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'cup' }).click()
      await page.locator('input[placeholder="Ingredient name"]').fill('butter')
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Melt butter')
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      // Create shopping list
      await page.goto('/shopping/new')
      // Click on "From Recipes" option
      await page.getByRole('button', { name: /From Recipes/i }).click()
      const listName = `Fraction List ${Date.now()}`
      await page.getByLabel('List Name').fill(listName)
      await page.getByRole('heading', { name: recipeName }).click()
      await page.getByRole('button', { name: 'Create Shopping List' }).click()

      // Verify amount is not showing as decimal (like "0.500" or "0.000")
      await expect(page.getByText('butter')).toBeVisible()

      // Get all text on page and verify no decimal patterns like "0.000" or "0.500"
      const pageText = await page.locator('body').textContent()
      expect(pageText).not.toMatch(/0\.000|0\.500/)
    })
  })

  test.describe('Shopping List Sections', () => {
    test('should group items by category', async ({ page }) => {
      // Create a recipe
      const recipeName = `Category Recipe ${Date.now()}`
      await createTestRecipe(page, recipeName)

      // Create shopping list
      await page.goto('/shopping/new')
      // Click on "From Recipes" option
      await page.getByRole('button', { name: /From Recipes/i }).click()
      const listName = `Category List ${Date.now()}`
      await page.getByLabel('List Name').fill(listName)
      await page.getByRole('heading', { name: recipeName }).click()
      await page.getByRole('button', { name: 'Create Shopping List' }).click()

      // Should have a section heading (Pantry, Produce, Dairy, etc.)
      const sectionHeading = page.getByRole('heading', { level: 2 })
      await expect(sectionHeading.first()).toBeVisible()
    })
  })
})
