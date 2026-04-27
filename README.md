# TwoTeaspoons

A recipe sharing platform for home cooks to discover, save, organize, and share recipes.

**Live at:** [twotsps.com](https://twotsps.com)

## The Story

TwoTeaspoons is a family project over two decades in the making. My mom first dreamed up the idea for a recipe sharing platform back in the early 2000s. In 2009, my dad built the first version, though it wasn't online for long.

Years later, I rebuilt it from scratch as a surprise birthday gift for my mom, preloaded with all of our family's treasured recipes. What started as one family's way to preserve and share recipes has grown into a platform for anyone who wants to keep their culinary traditions alive.

The name "Two Teaspoons" comes from that universal kitchen moment - when you're following a recipe and need just the right amount of something special.

## Features

### Recipe Management
- Create, edit, and share recipes with a rich editor
- Dynamic ingredient scaling (0.5x, 2x, 3x, custom servings)
- Prep time and cook time tracking
- Cover photos with drag-and-drop upload and cropping
- Structured ingredients with amounts, units, and notes
- Step-by-step instructions with optional timers

### Recipe Import
- Import from any recipe URL with automatic parsing
- Supports JSON-LD schema, microdata, and HTML fallback parsing
- Extracts ingredients, instructions, times, servings, and photos
- Full attribution to original author and source site

### Recipe Forking
- Create your own variations of any recipe
- Fork history shows original recipe lineage
- Credit the original creator while making it your own

### Organization
- **Categories:** Browse by meal type, cuisine, dietary needs, and more
- **Cookbooks:** Create themed collections (public or private)
- **Saved Recipes:** Bookmark favorites for quick access
- **Tags:** Personal organization system

### Meal Planning
- Weekly calendar view with drag-and-drop
- Add recipes to breakfast, lunch, dinner, or snack slots
- Generate shopping lists from your meal plan

### Shopping Lists
- Smart ingredient consolidation (merges duplicates across recipes)
- Automatic grouping by store section (produce, dairy, meat, pantry)
- Check off items while shopping
- Manual items for non-recipe additions

### Cook Mode
- Distraction-free step-by-step interface
- Screen stays awake during cooking (wake lock)
- Built-in timers with audio alerts
- Ingredient highlighting for each step

### Printing
- Multiple print formats: 3x5 cards, 4x6 cards, A6, half-letter, full page
- Clean, print-optimized layouts
- PDF export for digital recipe boxes

### Social Features
- Follow other cooks
- Comment on recipes with photos and ratings
- Share recipes and cookbooks publicly or keep them private

### Data Portability
- Full JSON export of all your recipes
- JSON import for bulk recipe migration
- Your recipes, your data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| Language | TypeScript (strict mode) |
| Database | Neon Postgres with Row-Level Security |
| ORM | Drizzle |
| Auth | Neon Auth (OAuth + email/password) |
| Data API | Neon Data API (client-side queries with RLS) |
| UI | Nuxt UI + Tailwind CSS |
| Image Storage | Cloudflare R2 |
| Hosting | Cloudflare Pages |

## Development

### Prerequisites
- Node.js 22+
- Neon database account
- Cloudflare account (for R2 and Pages)

### Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Neon and Cloudflare credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

**Public (in wrangler.toml):**
- `NUXT_PUBLIC_NEON_AUTH_URL` - Neon Auth endpoint
- `NUXT_PUBLIC_NEON_DATA_API_URL` - Neon Data API endpoint
- `R2_PUBLIC_URL` - Cloudflare R2 public URL

**Secrets (in Cloudflare dashboard):**
- `DATABASE_URL` - Neon Postgres connection string

### Scripts

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build locally

npm run test         # Run all tests
npm run test:unit    # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)

npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run typecheck    # TypeScript strict check

npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
```

### Deployment

The app deploys automatically to Cloudflare Pages on push to `master`.

Manual deployment:
```bash
npm run build
npx wrangler pages deploy dist
```

## Project Structure

```
app/
├── components/     # Vue components
├── composables/    # Vue composables (useAuth, useNeonData, etc.)
├── layouts/        # Page layouts
├── pages/          # File-based routing
├── plugins/        # Nuxt plugins
└── services/       # Data service layer

server/
├── api/            # API routes (upload, import, export)
├── db/             # Database schema and connection
└── utils/          # Server utilities (R2, session, parsing)

docs/
├── branding/       # Brand guidelines and assets
└── plans/          # Implementation plans
```

## Design

TwoTeaspoons uses a warm, inviting "modern farmhouse" aesthetic:

- **Colors:** Warm creams, terracotta accents, sage greens
- **Typography:** Fraunces (headers) + Source Sans 3 (body)
- **Feel:** Friendly, approachable, like a well-loved family kitchen

See `docs/branding/branding-kit.html` for the full brand guide.

## Contributing

This is a personal family project, but contributions are welcome! Please open an issue first to discuss any major changes.

## License

MIT

---

*Made with love for mom.*
