# SSR Data-Fetching Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the public/SEO pages (home, browse, public recipe detail, user profiles) render real recipe data during server-side rendering on Cloudflare, instead of the empty "No recipes yet" state.

**Architecture:** The Vue services (`recipeService`, `categoryService`, `userService`) currently fetch data through `@neondatabase/neon-js` (the Neon Data API client). That client is **client-only** — it does async I/O at module load and does not function in the Cloudflare Workers SSR runtime, so every `useAsyncData` handler that calls it fails silently during SSR and renders an empty payload. The fix: add Nitro server API routes that query the database via Drizzle on the `@neondatabase/serverless` HTTP driver (already wired up in `server/db/index.ts`, proven to work in Workers), and rewrite the affected service read-methods to call those routes with `$fetch` (which works identically during SSR and in the browser). Auth-gated pages that don't need SSR get `server: false` on their `useAsyncData` calls so they fetch client-side where the Data API client still works.

**Tech Stack:** Nuxt 4, Nitro (`cloudflare-pages` preset), Drizzle ORM, `@neondatabase/serverless` (neon-http), Vitest, Playwright.

---

## Background — root cause (already diagnosed, do not re-investigate)

- `app/composables/useNeonClient.ts` builds a `@neondatabase/neon-js` client. It works in the browser but not during Cloudflare Workers SSR.
- `app/composables/useNeonData.ts` `from()` and all services that use it (`recipeService`, `categoryService`, `userService`, etc.) therefore fail during SSR.
- Pages call these services inside `await useAsyncData(...)`. On a fresh (server-rendered) page load the handler throws/returns empty → the page renders the empty state and serializes that empty result into the hydration payload. On later **client-side** navigation, `useAsyncData` re-runs the handler in the browser, where the client works — which is why the page "fixes itself" after navigating away and back.
- Server-side DB access that DOES work in Workers already exists: `server/db/index.ts` (Drizzle + `@neondatabase/serverless`, lazy-init proxy, uses `process.env.DATABASE_URL`), `server/db/schema.ts` (full schema + relations), `server/utils/session.ts` (`getAuthUser(event)` decodes the `Authorization: Bearer <base64>` header). Existing routes such as `server/api/users/ensure.post.ts` use this pattern.

## Scope

**In scope — true SSR via new server routes:**
- `/` (`app/pages/index.vue`) — public recipe list
- `/browse` (`app/pages/browse.vue`) — public recipe list + category chips
- `/recipes/[username]/[slug]` (`app/pages/recipes/[username]/[slug]/index.vue`) — single public recipe (the main `useAsyncData`, schema.org-critical)
- `/users/[username]` (`app/pages/users/[username].vue`) — public profile + their published recipes + public collections

**In scope — `server: false` (fetch client-side, no new route):** every other page that fetches through a Data-API-backed service inside `useAsyncData`, plus the two secondary `useAsyncData` calls on the recipe detail page (fork info, "my collections" dropdown). Full list in Task 7.

**Out of scope (do not change):** all service *mutation* methods (create/update/delete/save/etc.) — they only ever run client-side on user interaction, where the Data API client works. Public *collection* view pages (`/collections/[username]/[slug]`) are treated as out of scope for true SSR and get `server: false` like other non-SEO pages; if the product owner later wants them indexed, a `/api/collections/by-slug` route can be added the same way.

## Contract: server routes return the existing snake_case DTO shapes

Drizzle returns **camelCase** keys (`userId`, `coverPhoto`, `createdAt`, …) and `Date` objects for timestamps. The services and `app/utils/transformCase.ts` expect the **snake_case** shapes in `app/types/database.ts` (`DbRecipe`, `DbIngredient`, …) with `created_at`/`updated_at` as ISO **strings**. To keep the change contained, **the routes convert Drizzle rows → the snake_case DTOs**; nothing downstream of the service methods changes. A shared serializer util (Task 1) does this conversion.

Authoritative DTO field lists are in `app/types/database.ts` — match them exactly. Service-level composite shapes: `RecipeWithDetails` in `app/services/recipeService.ts`, `UserProfile`/`UserPublicProfile` in `app/services/userService.ts`, `CategoryGroup` in `app/services/categoryService.ts`.

Do **not** pass an explicit generic to `$fetch` in the rewritten service methods — let Nuxt infer the return type from the route handler so `npm run typecheck` catches any shape mismatch between route and service.

---

## Task 1: Server-side serializer util (camelCase Drizzle row → snake_case DTO)

**Files:**
- Create: `server/utils/serialize.ts`
- Test: `tests/unit/serialize.test.ts`

Provide one pure mapper per entity. Each takes a Drizzle-row-shaped object and returns the matching `app/types/database.ts` DTO. Timestamps (`Date`) → `.toISOString()`. Functions: `serializeRecipe`, `serializeIngredient`, `serializeInstruction`, `serializeCategory`, `serializeUser` (returns `DbUser`), `serializeAuthor` (returns the `Pick<DbUser,'id'|'name'|'username'|'avatar'>` used by `RecipeWithDetails.author`), `serializeCollection`.

**Step 1: Write failing unit tests** in `tests/unit/serialize.test.ts`. Cover at least: `serializeRecipe` maps `userId→user_id`, `coverPhoto→cover_photo`, `forkedFromId→forked_from_id`, and converts a `Date` `createdAt` to an ISO string; `serializeIngredient` maps `recipeId→recipe_id`, `sortOrder→sort_order`; `serializeCategory` keeps `icon` and maps `sortOrder→sort_order`; `serializeUser` maps `createdAt/updatedAt` Dates to ISO strings. Use plain object literals shaped like Drizzle rows as input.

**Step 2: Run** `npm run test:unit -- serialize` — Expected: FAIL (module not found).

**Step 3: Implement** `server/utils/serialize.ts`. Pure functions, no imports from `~/` app code. Import the DTO types from `~/types/database` for return typing (server can import shared types). Each function maps fields explicitly (no generic key-casing helper — explicit is type-checkable).

**Step 4: Run** `npm run test:unit -- serialize` — Expected: PASS.

**Step 5: Run** `npm run typecheck` and `npm run lint` — Expected: PASS.

**Step 6: Commit**
```bash
git add server/utils/serialize.ts tests/unit/serialize.test.ts
git commit -m "Add server-side Drizzle-row to DTO serializer"
```

---

## Task 2: `GET /api/recipes` route

**Files:**
- Create: `server/api/recipes/index.get.ts`

Backs `recipeService.getPublicRecipes(options?)`. Returns `RecipeWithDetails[]`.

Behavior:
- Read optional query param `categories` (comma-separated category slugs). When present, resolve it to the set of recipe IDs that have any of those categories (mirror the logic in the current `getPublicRecipes`: slugs → category IDs → `recipe_categories.recipe_id`); if it resolves to zero IDs, return `[]`.
- Fetch published recipes via the Drizzle relational query API:
  ```ts
  db.query.recipes.findMany({
    where: /* eq(recipes.isPublished, true) [+ inArray(recipes.id, filteredIds) when filtering] */,
    orderBy: /* desc(recipes.createdAt) */,
    with: {
      author: true,                                  // users
      ingredients: { orderBy: /* asc(sortOrder) */ },
      instructions: { orderBy: /* asc(stepNumber) */ },
      categories: { with: { category: true } },      // recipe_categories junction → category
    },
  })
  ```
  (Verify the exact relation names against `server/db/schema.ts` — `recipesRelations`, `recipeCategoriesRelations`.)
- Resolve the current user with `getAuthUser(event)` (optional — null for anonymous). If a user is present, query `favorites` for `userId = user.id AND recipeId IN (recipeIds)` and build a `Set` of saved recipe IDs.
- Map each row to `RecipeWithDetails` using the Task 1 serializers: `author` via `serializeAuthor` (or `null`), `ingredients`/`instructions`/`categories` via their serializers (flatten the `categories` junction down to `DbCategory[]`), and `is_saved` from the saved set (default `false`).

**Step 1:** Implement `server/api/recipes/index.get.ts` as a `defineEventHandler`.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS.
**Step 3: Commit**
```bash
git add server/api/recipes/index.get.ts
git commit -m "Add GET /api/recipes server route"
```

---

## Task 3: Route `recipeService.getPublicRecipes` through `/api/recipes`

**Files:**
- Modify: `app/services/recipeService.ts` — `getPublicRecipes`, and add `getAuthHeaders` to the `useAuth()` destructure near the top of `useRecipeService`.

Replace the body of `getPublicRecipes` with a single `$fetch` call:
```ts
async function getPublicRecipes(options?: GetPublicRecipesOptions): Promise<RecipeWithDetails[]> {
  const query: Record<string, string> = {}
  if (options?.categorySlugs?.length) query.categories = options.categorySlugs.join(',')
  return await $fetch('/api/recipes', { query, headers: getAuthHeaders() })
}
```
Keep the existing `RecipeWithDetails[]` return type. The private helpers (`fetchAuthors`, `fetchIngredients`, etc.) are still used by other methods — leave them. `getAuthHeaders` comes from `useAuth()` and works during SSR (it reads the `tts_auth` cookie via `useCookie`).

This fixes the **home page and `/browse` recipe lists** — both call `getPublicRecipes` and nothing else about those pages changes.

**Step 1:** Make the edit.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS. (If typecheck flags a shape mismatch, fix the Task 2 route — the route is the source of truth for the shape.)
**Step 3: Commit**
```bash
git add app/services/recipeService.ts
git commit -m "Fetch public recipes via /api/recipes for SSR support"
```

---

## Task 4: `GET /api/categories` route + route `categoryService` through it

**Files:**
- Create: `server/api/categories/index.get.ts`
- Modify: `app/services/categoryService.ts` — `getAllCategories`

Route: fetch all rows from `categories` via Drizzle, ordered by `type` asc, `sortOrder` asc, `name` asc; map each with `serializeCategory`; return `DbCategory[]`. No auth.

Service: replace the body of `getAllCategories` with `return await $fetch('/api/categories')`. Leave `getCategoriesGrouped` unchanged — it just calls `getAllCategories` and groups the result. This fixes the `/browse` category chips.

**Step 1:** Implement route and edit service.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS.
**Step 3: Commit**
```bash
git add server/api/categories/index.get.ts app/services/categoryService.ts
git commit -m "Add GET /api/categories route for SSR support"
```

---

## Task 5: `GET /api/recipes/by-slug` route + route `recipeService.getRecipeBySlug` through it

**Files:**
- Create: `server/api/recipes/by-slug.get.ts`
- Modify: `app/services/recipeService.ts` — `getRecipeBySlug`

Route: read query params `username` and `slug` (both required → 400 if missing). Look up the user by `username`; if not found return `null` (HTTP 200, body `null`). Look up the recipe by `userId` + `slug`; if not found return `null`. Otherwise return a single `RecipeWithDetails` built exactly like a Task 2 row (same `with:` relations, same serializers, same optional-auth `is_saved`). Returning `null` rather than throwing keeps the service a clean passthrough — the page's `useAsyncData` handler already turns a `null` recipe into a 404.

Service: replace the body of `getRecipeBySlug` with:
```ts
async function getRecipeBySlug(username: string, slug: string): Promise<RecipeWithDetails | null> {
  return await $fetch('/api/recipes/by-slug', {
    query: { username, slug },
    headers: getAuthHeaders(),
  })
}
```

This fixes SSR of the public recipe detail page (the main `useAsyncData` at `app/pages/recipes/[username]/[slug]/index.vue:26`), including its schema.org output.

**Step 1:** Implement route and edit service.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS.
**Step 3: Commit**
```bash
git add server/api/recipes/by-slug.get.ts app/services/recipeService.ts
git commit -m "Add GET /api/recipes/by-slug route for SSR support"
```

---

## Task 6: `GET /api/users/by-username/[username]` route + route `userService.getUserByUsername` through it

**Files:**
- Create: `server/api/users/by-username/[username].get.ts`
- Modify: `app/services/userService.ts` — `getUserByUsername`

Route: read the `username` route param. Look up the user by `username`; if not found return `null`. Otherwise, in parallel: published recipes for that user (`userId` match, `isPublished = true`, `orderBy desc(createdAt)`), public collections (`userId` match, `isPublic = true`, `orderBy desc(createdAt)`), follower count (`follows` where `followingId = user.id`), following count (`follows` where `followerId = user.id`). Return a `UserPublicProfile`:
```
{
  user: { ...serializeUser(user), recipe_count, follower_count, following_count },  // UserProfile
  recipes: DbRecipe[],          // serializeRecipe on each (no relations needed)
  collections: DbCollection[],  // serializeCollection on each
}
```
No auth required.

Service: replace the body of `getUserByUsername` with `return await $fetch(\`/api/users/by-username/${username}\`)`.

This fixes SSR of `/users/[username]`.

**Step 1:** Implement route and edit service.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS.
**Step 3: Commit**
```bash
git add server/api/users/by-username/ app/services/userService.ts
git commit -m "Add GET /api/users/by-username route for SSR support"
```

---

## Task 7: `server: false` on auth-gated / non-SEO `useAsyncData` calls

These pages fetch through Data-API-backed services that still fail during SSR. They are behind auth and/or not search-indexed, so they don't need SSR — make their `useAsyncData` run client-side only. For each `useAsyncData` call listed below, add `server: false` to its options object (create an options object if there isn't one; merge into the existing one if there is — e.g. browse-style `{ watch: [...] }`, though browse itself is NOT in this list).

**Files to modify:**
- `app/pages/meal-plan.vue` — the `useAsyncData` call
- `app/pages/saved.vue` — the `useAsyncData` call
- `app/pages/shopping/index.vue`
- `app/pages/shopping/new.vue`
- `app/pages/shopping/[slug]/index.vue`
- `app/pages/collections/index.vue`
- `app/pages/collections/[slug]/index.vue`
- `app/pages/collections/[slug]/edit.vue`
- `app/pages/collections/[username]/[slug]/index.vue`
- `app/pages/recipes/[id]/index.vue`
- `app/pages/recipes/[id]/cook.vue`
- `app/pages/recipes/[id]/print.vue`
- `app/pages/recipes/[id]/edit.vue`
- `app/pages/recipes/[username]/[slug]/cook.vue`
- `app/pages/recipes/[username]/[slug]/print.vue`
- `app/pages/recipes/[username]/[slug]/edit.vue`
- `app/pages/recipes/[username]/[slug]/index.vue` — **only the secondary calls**: the `collectionService.getMyCollections()` call (around line 141) and the `getForkInfo` call (around line 171). **Do NOT** touch the main recipe `useAsyncData` at line 26 — that one stays SSR (fixed in Task 5).

For each modified page, confirm the template already tolerates `data` being `null` while loading (these pages use the `status` from `useAsyncData`) — if any page would render-error on `null` data, add a guard. Don't redesign loading states.

**Step 1:** Apply `server: false` to every call above.
**Step 2:** Run `npm run typecheck` and `npm run lint` — Expected: PASS.
**Step 3: Commit**
```bash
git add app/pages
git commit -m "Fetch auth-gated page data client-side to avoid broken SSR"
```

---

## Task 8: E2E SSR regression test

**Files:**
- Create: `tests/e2e/ssr-recipes.spec.ts`

Write a Playwright test that fetches the **raw server-rendered HTML** (via `request.get`, not a hydrated `page.goto`) and asserts the SSR markup contains real recipe content. This directly catches the regression — a hydrated `page` check would mask it because client-side hydration re-fetches successfully.

Tests:
1. `GET /` raw HTML contains recipe-card markup and does **not** contain the "No recipes yet" empty-state text.
2. `GET /browse` raw HTML contains recipe-card markup.

Use a stable selector/text for the assertions (inspect the rendered recipe card component for a usable `class`, `data-*`, or recipe-title text). Add a comment at the top of the file: this test requires the dev/preview server running against a database that has at least one published recipe.

**Step 1:** Write the test.
**Step 2:** Run `npm run test:e2e -- ssr-recipes` against a server with a seeded DB — Expected: PASS with the fix. (Note for the implementer: if DB credentials are unavailable in the execution environment, still commit the test; it is the regression guard and the repo owner will run it.)
**Step 3: Commit**
```bash
git add tests/e2e/ssr-recipes.spec.ts
git commit -m "Add E2E test asserting recipes render in SSR HTML"
```

---

## Final verification

Run and confirm each passes:
```bash
npm run typecheck   # TypeScript strict
npm run lint        # ESLint strict
npm run test:unit   # includes the new serializer tests
npm run build       # production build with the cloudflare-pages preset must succeed
```

Manual / deploy verification (repo owner):
- Hard-reload `https://twotsps.com/` and `/browse` in a fresh tab — recipes appear immediately, no navigation needed.
- View Source on `/` — recipe cards are present in the server-rendered HTML.
- Open a public recipe URL `/recipes/<username>/<slug>` fresh — recipe content and the schema.org `<script type="application/ld+json">` are in the SSR HTML.
- Open a profile `/users/<username>` fresh — recipes/collections render.
- Confirm auth-gated pages (saved, meal-plan, shopping, collections, recipe edit/cook/print) still load correctly (now via a brief client-side fetch).

## Notes / gotchas

- The new routes rely on `process.env.DATABASE_URL`, set as a Cloudflare Pages secret (see `wrangler.toml` comment). Locally it comes from `.env`.
- Internal `$fetch('/api/...')` works during SSR (Nitro resolves it in-process) and in the browser — no base-URL handling needed.
- `getAuthHeaders()` from `useAuth()` reads the `tts_auth` cookie via `useCookie`, which is populated on both server and client, so passing `headers: getAuthHeaders()` makes `is_saved` correct in SSR and on the client.
- Do not "improve" the unrelated services or mutation methods — keep this change scoped to the four read paths plus the `server: false` edits.
