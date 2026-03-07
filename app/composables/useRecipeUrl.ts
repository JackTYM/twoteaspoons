/**
 * Composable for generating recipe URLs using the username/slug pattern.
 * Provides consistent URL generation across the application.
 */
interface RecipeUrlHelpers {
  getRecipeUrl: (recipe: { slug: string; author?: { username: string | null } | null }) => string
  getRecipeEditUrl: (recipe: { slug: string; author?: { username: string | null } | null }) => string
  getRecipeCookUrl: (recipe: { slug: string; author?: { username: string | null } | null }, scale?: number) => string
  getRecipePrintUrl: (recipe: { slug: string; author?: { username: string | null } | null }) => string
}

export function useRecipeUrl(): RecipeUrlHelpers {
  /**
   * Generates the URL path for a recipe detail page.
   *
   * @param recipe - Recipe object with slug and author info
   * @returns The URL path (e.g., "/recipes/jack/chocolate-chip-cookies")
   */
  function getRecipeUrl(recipe: {
    slug: string
    author?: { username: string | null } | null
  }): string {
    const username = recipe.author?.username
    if (!username) {
      // This shouldn't happen after migration, but handle gracefully
      console.warn('Recipe missing author username:', recipe)
      return '/browse'
    }
    return `/recipes/${username}/${recipe.slug}`
  }

  /**
   * Generates the URL path for the recipe edit page.
   */
  function getRecipeEditUrl(recipe: {
    slug: string
    author?: { username: string | null } | null
  }): string {
    return `${getRecipeUrl(recipe)}/edit`
  }

  /**
   * Generates the URL path for the recipe cook mode page.
   * @param recipe - Recipe object with slug and author info
   * @param scale - Optional scale multiplier for ingredients (e.g., 2 for doubled)
   */
  function getRecipeCookUrl(recipe: {
    slug: string
    author?: { username: string | null } | null
  }, scale?: number): string {
    const base = `${getRecipeUrl(recipe)}/cook`
    if (scale && scale !== 1) {
      return `${base}?scale=${scale}`
    }
    return base
  }

  /**
   * Generates the URL path for the recipe print page.
   */
  function getRecipePrintUrl(recipe: {
    slug: string
    author?: { username: string | null } | null
  }): string {
    return `${getRecipeUrl(recipe)}/print`
  }

  return {
    getRecipeUrl,
    getRecipeEditUrl,
    getRecipeCookUrl,
    getRecipePrintUrl,
  }
}
