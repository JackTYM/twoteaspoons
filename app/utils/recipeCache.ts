const RECIPE_LIST_CACHE_KEYS = ['browse-recipes', 'home-recipes', 'my-recipes', 'saved-recipes']

/**
 * Invalidate cached recipe list data (browse/home/my-recipes/saved) after a
 * create/update/delete/fork so those pages fetch fresh data on next visit,
 * instead of reusing a stale useAsyncData payload from earlier in the session.
 */
export function clearRecipeListCaches(): void {
  clearNuxtData(RECIPE_LIST_CACHE_KEYS)
}
