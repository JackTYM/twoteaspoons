/**
 * Generates a URL-safe slug from a title string.
 * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
 * removes leading/trailing hyphens, and truncates to 100 characters.
 *
 * This is a client-side utility for generating slug suggestions.
 * The server may still adjust slugs to ensure uniqueness.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}
