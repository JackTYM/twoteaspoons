import { test, expect } from '@playwright/test'

test.describe('Recipe Management (Authenticated)', () => {
  test.describe('Recipe Creation', () => {
    test('should create a new recipe from scratch', async ({ page }) => {
      await page.goto('/')

      // Click Add dropdown and select "Create from scratch"
      await page.getByRole('button', { name: 'Add' }).click()
      await page.getByRole('menuitem', { name: 'Create from scratch' }).click()

      // Should navigate to new recipe page
      await expect(page).toHaveURL('/recipes/new')
      await expect(page.getByRole('heading', { name: 'New Recipe' })).toBeVisible()

      // Fill in recipe details
      const uniqueTitle = `E2E Test Recipe ${Date.now()}`
      await page.getByLabel('Title').fill(uniqueTitle)
      await page.getByLabel('Description').fill('A recipe created by E2E tests')
      await page.getByLabel('Prep Time').fill('10')
      await page.getByLabel('Cook Time').fill('20')

      // Add ingredient
      await page.locator('input[placeholder="1"]').first().fill('2')
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'cup' }).click()
      await page.locator('input[placeholder="Ingredient name"]').fill('test ingredient')

      // Add instruction
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Mix all ingredients together')

      // Submit the recipe
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      // Should navigate to recipe detail page
      await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
      await expect(page.getByText('A recipe created by E2E tests')).toBeVisible()
      await expect(page.getByText('Prep: 10 min')).toBeVisible()
      await expect(page.getByText('Cook: 20 min')).toBeVisible()
      await expect(page.getByText('test ingredient')).toBeVisible()
    })

    test('should require title for recipe creation', async ({ page }) => {
      await page.goto('/recipes/new')

      // Leave title empty
      await page.getByLabel('Description').fill('Description without title')

      // Add minimal ingredient and instruction to enable form
      await page.locator('input[placeholder="1"]').first().fill('1')
      await page.locator('input[placeholder="Ingredient name"]').fill('test')
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Test step')

      // Try to submit - title is required
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      // Should still be on the new recipe page (validation failed)
      await expect(page).toHaveURL('/recipes/new')
    })
  })

  test.describe('Recipe Scaling', () => {
    test('should scale ingredients correctly', async ({ page }) => {
      // Create a recipe with a specific amount
      await page.goto('/recipes/new')

      const uniqueTitle = `Scaling Test ${Date.now()}`
      await page.getByLabel('Title').fill(uniqueTitle)
      await page.locator('input[placeholder="1"]').first().fill('2')
      await page.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'cup' }).click()
      await page.locator('input[placeholder="Ingredient name"]').fill('sugar')
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Add sugar')
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      // Wait for recipe page
      await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()

      // Verify initial amount
      await expect(page.getByText('2 cup')).toBeVisible()

      // Click 2x scale button
      await page.getByRole('button', { name: '2x' }).click()
      await expect(page.getByText('4 cup')).toBeVisible()

      // Click 1x to reset
      await page.getByRole('button', { name: '1x' }).click()
      await expect(page.getByText('2 cup')).toBeVisible()

      // Click 1/2x scale
      await page.getByRole('button', { name: '½x' }).click()
      await expect(page.getByText('1 cup')).toBeVisible()

      // Click 3x scale
      await page.getByRole('button', { name: '3x' }).click()
      await expect(page.getByText('6 cup')).toBeVisible()
    })
  })

  test.describe('Recipe Edit', () => {
    test('should edit an existing recipe', async ({ page }) => {
      // Create a recipe first
      await page.goto('/recipes/new')

      const originalTitle = `Edit Test ${Date.now()}`
      await page.getByLabel('Title').fill(originalTitle)
      await page.getByLabel('Description').fill('Original description')
      await page.locator('input[placeholder="1"]').first().fill('1')
      await page.locator('input[placeholder="Ingredient name"]').fill('original ingredient')
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Original step')
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      await expect(page.getByRole('heading', { name: originalTitle })).toBeVisible()

      // Click edit button
      await page.getByRole('link', { name: 'Edit' }).click()

      // Should be on edit page
      await expect(page.getByRole('heading', { name: 'Edit Recipe' })).toBeVisible()

      // Update the title and description
      const updatedTitle = `Updated ${Date.now()}`
      await page.getByLabel('Title').fill(updatedTitle)
      await page.getByLabel('Description').fill('Updated description')

      // Save changes
      await page.getByRole('button', { name: 'Save Changes' }).click()

      // Verify changes
      await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
      await expect(page.getByText('Updated description')).toBeVisible()
    })
  })

  test.describe('Recipe Delete', () => {
    test('should delete a recipe with confirmation', async ({ page }) => {
      // Create a recipe first
      await page.goto('/recipes/new')

      const deleteTitle = `Delete Test ${Date.now()}`
      await page.getByLabel('Title').fill(deleteTitle)
      await page.locator('input[placeholder="1"]').first().fill('1')
      await page.locator('input[placeholder="Ingredient name"]').fill('test')
      await page.locator('textarea[placeholder="Describe this step..."]').fill('Test step')
      await page.getByRole('button', { name: 'Create Recipe' }).click()

      // Verify recipe exists
      await expect(page.getByRole('heading', { name: deleteTitle })).toBeVisible()

      // Get the current URL to know the recipe ID
      const recipeUrl = page.url()

      // Click delete button (trash icon)
      await page.locator('button').filter({ has: page.locator('[class*="trash"]') }).click()

      // Confirmation modal should appear
      await expect(page.getByRole('heading', { name: 'Delete Recipe' })).toBeVisible()
      await expect(page.getByText('Are you sure you want to delete')).toBeVisible()

      // Confirm deletion
      await page.getByRole('button', { name: 'Delete' }).last().click()

      // Should navigate away from recipe page
      await expect(page).not.toHaveURL(recipeUrl)
    })
  })

  test.describe('Recipe Navigation', () => {
    test('should show authenticated navigation', async ({ page }) => {
      await page.goto('/')

      // Should see authenticated nav links
      await expect(page.getByRole('link', { name: 'My Recipes' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Collections' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Shopping' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Meal Plan' })).toBeVisible()
    })

    test('should show Add menu with options', async ({ page }) => {
      await page.goto('/')

      await page.getByRole('button', { name: 'Add' }).click()

      await expect(page.getByRole('menuitem', { name: 'Create from scratch' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'Import from URL' })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: 'What Can I Make?' })).toBeVisible()
    })

    test('should navigate to import from Add menu', async ({ page }) => {
      await page.goto('/')

      await page.getByRole('button', { name: 'Add' }).click()
      await page.getByRole('menuitem', { name: 'Import from URL' }).click()

      await expect(page).toHaveURL('/recipes/import')
      await expect(page.getByRole('heading', { name: 'Import Recipe' })).toBeVisible()
    })
  })
})
