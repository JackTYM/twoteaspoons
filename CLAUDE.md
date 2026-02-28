# CLAUDE.md - TwoTeaspoons

## Project Overview

TwoTeaspoons (twotsps.com) is a recipe sharing platform for home cooks. Built with Nuxt 4, Neon Postgres, and Drizzle ORM.

## Tech Stack

- **Framework:** Nuxt 4
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Neon Auth
- **UI:** Nuxt UI (Tailwind-based)
- **SEO:** @nuxtjs/seo (robots, sitemap, schema.org, og-image, link-checker)
- **Image Storage:** Cloudflare R2
- **AI:** Claude via AWS Bedrock (ingredient recognition, recipe parsing)
- **Nutrition:** USDA FoodData Central API
- **Hosting:** Self-hosted Docker + nginx

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # All tests
npm run test:unit    # Vitest unit/component tests
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript strict check
npm run db:migrate   # Run Drizzle migrations
npm run db:studio    # Open Drizzle Studio
```

## Code Practices

### TypeScript
- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- All function parameters and returns should be typed

### Linting & Formatting
- ESLint strict with Vue/Nuxt rules
- Prettier for formatting
- Run `npm run lint:fix` before committing

### Testing (TDD)
- Write tests BEFORE implementation
- **Vitest:** Unit tests for utilities, composables
- **Vue Test Utils:** Component tests
- **Playwright:** E2E browser tests for user flows

### Screenshots
- Save screenshots to `/tmp/` not `docs/screenshots/`
- Use Chrome MCP for visual verification during development
- Screenshots are temporary and should not be committed

### Definition of Done
A feature is complete when:
1. Style matches branding kit (verify via Chrome MCP screenshot)
2. `npm run typecheck` passes (TypeScript strict)
3. `npm run lint` passes (ESLint strict)
4. `npm run test` passes (all test suites)

### Visual Verification Workflow (REQUIRED)
**After implementing any UI feature, you MUST verify visually:**

1. **Start dev server** if not running: `npm run dev`
2. **Use Chrome MCP** to navigate to the new/changed pages
3. **Take screenshots** to `/tmp/` and review against branding guide:
   - Colors match palette (cream backgrounds, terracotta accents, brown text)
   - Typography uses Fraunces for headers, Source Sans 3 for body
   - Border radius is soft (12-20px)
   - Shadows are subtle and warm
   - Dark mode works correctly
4. **Check UI/UX:**
   - Mobile responsive (test at 375px width)
   - Interactive states (hover, focus, loading)
   - Error states are handled gracefully
   - Empty states are informative
5. **Fix issues** before committing

**Pages to verify for each feature:**
- New pages created
- Modified pages
- Related pages that might be affected (e.g., navigation)

### Git Workflow
- `develop` branch: Active development
- `master` branch: Stable/production
- Work on `develop`, merge to `master` when feature complete
- Commit messages: Clear, imperative mood ("Add recipe scaling", not "Added scaling")

## Project Structure

```
app/
├── components/     # Vue components
├── composables/    # Vue composables
├── layouts/        # Page layouts
├── pages/          # File-based routing
├── middleware/     # Route middleware
└── plugins/        # Nuxt plugins

server/
├── api/            # API routes
├── middleware/     # Server middleware
└── utils/          # Server utilities

db/
├── schema/         # Drizzle schema definitions
├── migrations/     # Database migrations
└── seed/           # Seed data

tests/
├── unit/           # Vitest unit tests
├── components/     # Component tests
└── e2e/            # Playwright E2E tests
```

## Branding

See full branding kit: `docs/branding/branding-kit.html`

### Personality
Warm & homey - modern farmhouse feel, friendly and approachable

### Colors

**Base - Warm Browns & Creams:**
| Name | Hex | Usage |
|------|-----|-------|
| Cream Light | `#FEF9F2` | Page background |
| Cream | `#F8EEE2` | Card backgrounds, secondary bg |
| Cream Dark | `#EBE0D0` | Borders, dividers |
| Brown Light | `#CBA67A` | Muted text, placeholders |
| Brown | `#96724D` | Secondary text |
| Brown Dark | `#6B4D35` | Primary text, headings |
| Brown Darkest | `#4A3525` | High emphasis text |

**Accents - Kitchen Garden + Terracotta:**
| Name | Hex | Usage |
|------|-----|-------|
| Sage Light | `#B5C9A3` | Success backgrounds, dietary tags |
| Sage | `#8FA878` | Success buttons, positive actions |
| Sage Dark | `#6E8759` | Success text |
| Terracotta Light | `#E5A892` | Warning/allergen backgrounds |
| Terracotta | `#C97B5D` | Primary accent, favorites, CTAs |
| Terracotta Dark | `#A65E42` | Accent hover states |
| Butter Light | `#F7E8BF` | Info backgrounds, breakfast tags |
| Butter | `#F0D699` | Stars, ratings |
| Butter Dark | `#DCBE72` | Info emphasis |

**Dark Mode:**
| Element | Light Class | Dark Class |
|---------|-------------|------------|
| Page BG | `bg-neutral-50` | `dark:bg-neutral-950` |
| Section BG | `bg-neutral-100` | `dark:bg-neutral-900` |
| Card BG | `bg-neutral-50` | `dark:bg-neutral-800` |
| Borders | `border-neutral-200` | `dark:border-neutral-700` |
| Headings | `text-neutral-700` | `dark:text-neutral-50` |
| Body Text | `text-neutral-500` | `dark:text-neutral-400` |
| Accent BG | `bg-{color}-100` | `dark:bg-{color}-900` |
| Accent Text | `text-{color}-600` | `dark:text-{color}-400` |

### Typography
- **Headers:** Fraunces (friendly serif with personality)
- **Body:** Source Sans 3 (clean, readable)
- **Font imports:** Google Fonts

### Logo
- Keyring with two playful/cartoon teaspoons
- Simple circle ring
- Colors: Terracotta or Brown Dark
- Tagline: "Recipes worth sharing"

### UI Guidelines
- Use Nuxt UI components as base
- Border radius: 12-20px (softer, friendlier)
- Shadows: Subtle, warm (rgba with low opacity)
- Focus states: Terracotta ring
- Hover: Slight lift (translateY -1px to -4px)
- Mobile-first responsive design (PWA)

## Key Features Reference

### Recipe Data Model
- title, description, coverPhoto
- ingredients[] (structured: amount, unit, item, notes)
- instructions[] (steps with optional timers)
- prepTime, cookTime
- servings (base for scaling)
- category (global), tags (personal)
- nutrition (calculated), allergens (detected + manual)
- source (for imports: author, site, url)
- forkedFrom (link to parent recipe)

### Scaling Logic
- Quick buttons: 0.5x, 2x, 3x
- Custom serving input
- Smart rounding with user warnings when significant rounding occurs
- Warning threshold: display when rounding changes ingredient by >20%

### Import Pipeline
1. User pastes URL
2. Fetch and parse (JSON-LD schema, microdata, fallback HTML parsing)
3. Extract: title, ingredients, instructions, times, servings, images
4. Load into editor for user review/fixes
5. Save with full attribution

### Cook Mode
- Fullscreen step-by-step view
- Wake lock to prevent screen sleep
- Web Speech API for voice commands
- Timer management (multiple concurrent)

### Shopping List Consolidation
- Parse ingredient quantities and units
- Normalize units (convert tbsp to cups when appropriate)
- Sum same ingredients across recipes
- Group by store section categories

## Database Schema (High Level)

### Core Tables
- users (id, email, name, avatar, bio, createdAt)
- recipes (id, userId, title, description, ..., forkedFromId, sourceUrl, sourceAuthor)
- ingredients (id, recipeId, amount, unit, item, notes, order)
- instructions (id, recipeId, step, timerMinutes, order)

### Organization
- categories (id, name, slug)
- recipe_categories (recipeId, categoryId)
- tags (id, userId, name)
- recipe_tags (recipeId, tagId)
- collections (id, userId, name, isPublic)
- collection_recipes (collectionId, recipeId)

### Social
- follows (followerId, followingId)
- favorites (userId, recipeId)
- comments (id, recipeId, userId, content, photoUrl, tasteRating, difficultyRating)
- cook_logs (id, userId, recipeId, cookedAt, photoUrl, tasteRating, difficultyRating)

### Planning
- meal_plans (id, userId, date, mealType, recipeId)
- shopping_lists (id, userId, name, createdAt)
- shopping_items (id, listId, ingredient, amount, unit, checked, recipeId)

## External Service Integration

### Neon Auth
- Handle auth via Neon's SDK
- User sessions managed server-side

### Cloudflare R2
- Store recipe images, user uploads
- Generate signed URLs for uploads
- CDN delivery for fast loading

### AWS Bedrock (Claude)
- Ingredient photo recognition
- Recipe URL parsing assistance
- PDF recipe extraction

### USDA FoodData Central
- Nutrition calculation from ingredients
- Cache common ingredient lookups
- Fallback to estimated values when no match

## PWA Configuration

- Installable on mobile/desktop
- Offline support for saved recipes
- Service worker for caching
- App manifest with icons

## SEO Configuration (@nuxtjs/seo)

Site configured in `nuxt.config.ts`:
- URL: https://twotsps.com
- Auto-generated /sitemap.xml and /robots.txt
- Schema.org structured data for recipes (Recipe schema)
- Dynamic OG images for social sharing
- Link checker for broken link detection

### Recipe Schema.org
Use `useSchemaOrg` composable for recipe pages:
```typescript
useSchemaOrg([
  defineRecipe({
    name: recipe.title,
    image: recipe.coverPhoto,
    author: { name: recipe.author },
    prepTime: `PT${recipe.prepTime}M`,
    cookTime: `PT${recipe.cookTime}M`,
    recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map(i => `${i.amount} ${i.unit} ${i.item}`),
    recipeInstructions: recipe.instructions.map(i => ({ text: i.step })),
  })
])
```

## Print Styling

- Separate print stylesheets
- 3x5 card layout: specific dimensions, margins
- Multi-card continuation with page breaks
- Format selection UI with visual icons

## Resources & References

- **Neon and Drizzle ORM best practices**: https://raw.githubusercontent.com/neondatabase-labs/ai-rules/main/neon-drizzle.mdc
- **Neon Serverless connection patterns**: https://raw.githubusercontent.com/neondatabase-labs/ai-rules/main/neon-serverless.mdc
