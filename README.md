# TwoTeaspoons

A recipe sharing platform for home cooks to discover, save, organize, and share recipes.

**Live at:** [twotsps.com](https://twotsps.com)

## Features

### Recipe Management
- Create, edit, and share recipes
- Dynamic ingredient scaling (0.5x, 2x, 3x, custom servings)
- Prep time + cook time tracking
- Cover photos with drag-and-drop upload

### Recipe Import
- Import from any recipe URL with automatic parsing
- Supports JSON-LD, microdata, and HTML fallback parsing
- Full attribution to original author and source

### Recipe Forking
- Create your own variations of any recipe
- Fork history shows original recipe lineage

### Organization
- **Categories:** Browse by meal type (Breakfast, Dinner, Desserts, etc.)
- **Collections:** Create themed groups (public or private)
- **Saved Recipes:** Bookmark favorites for quick access

### Meal Planning
- Weekly calendar view
- Add recipes to breakfast, lunch, dinner, or snack slots
- Generate shopping lists from meal plans

### Shopping Lists
- Smart ingredient consolidation (merge duplicates)
- Group by store section (produce, dairy, meat, pantry)
- Check off items while shopping

### Cook Mode
- Step-by-step fullscreen interface
- Screen stays awake during cooking
- Built-in timers with audio alerts
- Voice control support

### Printing
- Multiple formats: 3x5, 4x6, A6, half-letter, full page
- Clean print-optimized layouts

### Data Export
- Full JSON export of all recipes

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| Language | TypeScript (strict) |
| Database | Neon Postgres |
| ORM | Drizzle |
| Auth | Neon Auth |
| UI | Nuxt UI (Tailwind) |
| Image Storage | Cloudflare R2 |
| AI | Claude via AWS Bedrock |
| Hosting | Docker + nginx |

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (or Neon account)
- Cloudflare R2 bucket

### Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run test       # Run all tests
npm run test:unit  # Unit tests (Vitest)
npm run test:e2e   # E2E tests (Playwright)
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run db:studio  # Database GUI
```

### Docker

```bash
docker build -t twoteaspoons .
docker run -p 3000:3000 --env-file .env twoteaspoons
```

## License

MIT
