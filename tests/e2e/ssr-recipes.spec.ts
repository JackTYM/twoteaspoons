import { expect, test } from '@playwright/test'

// Requires the dev/preview server running against a database with at least one published recipe.
test.describe('recipe SSR HTML', () => {
  test('home page raw HTML contains recipe cards and not the empty state', async ({ request }) => {
    const response = await request.get('/')

    expect(response.ok()).toBe(true)
    const html = await response.text()

    expect(html).toContain('href="/recipes/')
    expect(html).not.toContain('No recipes yet')
  })

  test('browse page raw HTML contains recipe cards', async ({ request }) => {
    const response = await request.get('/browse')

    expect(response.ok()).toBe(true)
    const html = await response.text()

    expect(html).toContain('href="/recipes/')
  })
})
