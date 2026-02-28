# CLAUDE.md - TwoTeaspoons

## Project Overview

TwoTeaspoons (twotsps.com) is a recipe sharing platform for home cooks. Built with Nuxt 4, Neon Postgres, and Drizzle ORM.

## Tech Stack

- **Framework:** Nuxt 4
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Neon Auth
- **UI:** Nuxt UI (Tailwind-based)
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

### Definition of Done
A feature is complete when:
1. Style matches branding kit (verify via Chrome MCP screenshot)
2. `npm run typecheck` passes (TypeScript strict)
3. `npm run lint` passes (ESLint strict)
4. `npm run test` passes (all test suites)

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

### Personality
Warm & homey - cozy family kitchen feel, friendly and approachable

### Colors
- **Base:** Soft creams and warm browns
- **Accents:** Soft pastels
- Logo and specific palette TBD

### Typography
- **Headers:** Serif font (classic recipe book feel)
- **Body:** Clean sans-serif for readability

### UI Guidelines
- Use Nuxt UI components as base
- Customize to match warm/homey branding
- Maintain consistency across all pages
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

## Print Styling

- Separate print stylesheets
- 3x5 card layout: specific dimensions, margins
- Multi-card continuation with page breaks
- Format selection UI with visual icons
