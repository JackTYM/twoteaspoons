# Phase 2: Recipe Import from URLs

**Goal:** Allow users to import recipes from any URL by extracting structured data (JSON-LD, microdata) or parsing HTML.

**Architecture:** Server-side URL fetching and parsing to handle CORS. Multiple parsing strategies with fallbacks. Import flow loads data into recipe form for user review before saving.

**Tech Stack:** Nuxt server routes, cheerio for HTML parsing, JSON-LD extraction

---

## Task 1: Install Dependencies

```bash
npm install cheerio
```

## Task 2: Create Recipe Parser Utility

Parse recipes from HTML using multiple strategies:
1. JSON-LD schema.org Recipe
2. Microdata
3. HTML heuristics (common class names, patterns)

## Task 3: Create Import API Endpoint

`POST /api/recipes/import` - accepts URL, returns parsed recipe data

## Task 4: Create Import Page UI

`/recipes/import` - paste URL, preview extracted data, edit, save

## Task 5: Add Import Button to Navigation/List

---
