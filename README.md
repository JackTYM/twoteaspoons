# TwoTeaspoons

A recipe sharing platform for home cooks to discover, save, organize, and share recipes.

**Domain:** twotsps.com

## Vision

TwoTeaspoons is built for home cooks who frequently try new recipes and want a personal, organized recipe database. Originally envisioned as a family recipe sharing platform, it prioritizes practical features that make cooking easier.

## Key Features

### Recipe Management
- Create, edit, and share recipes with markdown support
- Dynamic ingredient scaling (0.5x, 2x, 3x, custom servings)
- Smart rounding with warnings when scaling affects consistency
- Prep time + cook time tracking
- Cover photos and step photos
- Full nutrition facts (via USDA FoodData Central)
- Dietary tags and allergen detection/warnings

### Recipe Import
- **URL Import:** Paste any recipe URL, auto-extract content, fix parsing errors
- **PDF Import:** Upload recipe book PDFs, extract individual recipes
- Full attribution to original author and source with link back

### Recipe Forking
- Create variations of existing recipes
- Linked "family tree" showing original and all forks
- See how variations compare in ratings

### Organization
- **Global Categories:** Required when publishing (Breakfast, Dinner, Desserts, etc.)
- **Personal Tags:** Your own labels when saving recipes
- **Collections/Cookbooks:** Named groups ("Summer BBQ", "Mom's Classics")
  - Public or private
  - Shareable via link
  - Display on profile

### Social Features
- Follow other users to see their new recipes
- Comments on recipes for sharing results, photos, questions
- Dual rating system: taste + difficulty (community averaged)
- User profiles with public recipes and collections

### Meal Planning
- Weekly/monthly calendar view
- Drag-drop recipes into breakfast/lunch/dinner slots
- Auto-generate shopping lists from date range

### Shopping Lists
- Smart ingredient consolidation (merge duplicates, convert units)
- Group by store section (produce, dairy, meat, pantry)
- Check off items while shopping
- Manual item additions

### Printing
- **3x5 Recipe Cards:** Formatted for index cards, multi-card continuation
- **Multiple Formats:** 3x5, 4x6, A6, half-letter, full page (with visual icons)
- **Batch Printing:** Print from favorites, collections, or manual selection
- Clean print stylesheets

### Cook Mode
- Step-by-step fullscreen interface
- Large readable text, one step at a time
- Screen stays awake
- Built-in timers with audio alerts
- Voice control: "next step", "previous step", "start timer", "read step"
- Quick-access ingredient panel (scaled to chosen servings)

### "What Can I Make"
- Upload photo of ingredients
- AI identifies ingredients (Claude via AWS Bedrock)
- Tiered recipe results:
  - Perfect matches (have everything)
  - Missing 1-2 items
  - Missing 3+ items
- Quick-add missing items to shopping list

### Data Export
- Full JSON export (recipes, favorites, collections, history)
- PDF cookbook export
- Individual recipe export

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| Language | TypeScript (strict) |
| Database | Neon Postgres |
| ORM | Drizzle |
| Auth | Neon Auth |
| UI | Nuxt UI |
| Styling | Tailwind CSS |
| Image Storage | Cloudflare R2 |
| AI | Claude via AWS Bedrock |
| Nutrition API | USDA FoodData Central |
| Hosting | Self-hosted Docker + nginx |

## Development

### Prerequisites
- Node.js 20+
- Docker
- Access to Neon, Cloudflare R2, AWS Bedrock

### Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run all tests
npm run test:unit  # Unit tests (Vitest)
npm run test:e2e   # E2E tests (Playwright)
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

### Docker

```bash
# Build image
docker build -t twoteaspoons .

# Run container
docker run -p 3000:3000 twoteaspoons
```

## License

Private project.
