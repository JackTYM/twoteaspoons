import { eq } from 'drizzle-orm'
import puppeteer from 'puppeteer'
import { accessSync, constants } from 'node:fs'
import { db, recipes } from '../../../db'
import { requireAuth } from '../../../utils/session'

interface FormatDimension {
  width: string
  height: string
  name: string
  // PDF dimensions in inches
  pdfWidth: number
  pdfHeight: number
}

const formatDimensions: Record<string, FormatDimension> = {
  '3x5': { width: '5in', height: '3in', name: '3x5 Index Card', pdfWidth: 5, pdfHeight: 3 },
  '4x6': { width: '6in', height: '4in', name: '4x6 Card', pdfWidth: 6, pdfHeight: 4 },
  'a6': { width: '4.13in', height: '5.83in', name: 'A6', pdfWidth: 4.13, pdfHeight: 5.83 },
  'half-letter': { width: '5.5in', height: '8.5in', name: 'Half Letter', pdfWidth: 5.5, pdfHeight: 8.5 },
  'full': { width: '8.5in', height: '11in', name: 'Full Page', pdfWidth: 8.5, pdfHeight: 11 },
}

function findExecutable(paths: string[]): string | undefined {
  for (const p of paths) {
    try {
      accessSync(p, constants.X_OK)
      return p
    } catch {
      // Continue to next path
    }
  }
  return undefined
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface RecipeData {
  id: number
  title: string
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  ingredients: Array<{
    amount: string | null
    unit: string | null
    item: string
  }>
  instructions: Array<{
    stepNumber: number
    content: string
  }>
}

function generateRecipeHtml(recipe: RecipeData, format: FormatDimension, formatKey: string): string {
  const totalTime = formatTime((recipe.prepTime || 0) + (recipe.cookTime || 0))
  const isSmallFormat = formatKey === '3x5' || formatKey === '4x6'

  // For small formats, generate two pages (ingredients + instructions)
  if (formatKey === '3x5') {
    return `
      <div class="recipe-card" style="width: ${format.width}; height: ${format.height}; page-break-after: always;">
        <div class="card-content">
          <h1 class="title">${escapeHtml(recipe.title)}</h1>
          <div class="meta">
            ${totalTime ? `<span>${totalTime}</span>` : ''}
            ${recipe.servings ? `<span>${recipe.servings} servings</span>` : ''}
          </div>
          <h2 class="section-title">Ingredients</h2>
          <ul class="ingredients">
            ${recipe.ingredients.map(ing => `
              <li><span class="amount">${escapeHtml(ing.amount || '')} ${escapeHtml(ing.unit || '')}</span> ${escapeHtml(ing.item)}</li>
            `).join('')}
          </ul>
        </div>
      </div>
      <div class="recipe-card" style="width: ${format.width}; height: ${format.height}; page-break-after: always;">
        <div class="card-content">
          <h1 class="title small">${escapeHtml(recipe.title)} <span class="continued">(Instructions)</span></h1>
          <ol class="instructions">
            ${recipe.instructions.map(inst => `
              <li>${escapeHtml(inst.content)}</li>
            `).join('')}
          </ol>
        </div>
      </div>
    `
  }

  // For 4x6, try to fit both on one card but split if needed
  if (formatKey === '4x6') {
    const needsSplit = recipe.ingredients.length > 10 || recipe.instructions.length > 5
    if (needsSplit) {
      return `
        <div class="recipe-card" style="width: ${format.width}; height: ${format.height}; page-break-after: always;">
          <div class="card-content">
            <h1 class="title">${escapeHtml(recipe.title)}</h1>
            <div class="meta">
              ${totalTime ? `<span>${totalTime}</span>` : ''}
              ${recipe.servings ? `<span>${recipe.servings} servings</span>` : ''}
            </div>
            <h2 class="section-title">Ingredients</h2>
            <ul class="ingredients">
              ${recipe.ingredients.map(ing => `
                <li><span class="amount">${escapeHtml(ing.amount || '')} ${escapeHtml(ing.unit || '')}</span> ${escapeHtml(ing.item)}</li>
              `).join('')}
            </ul>
          </div>
        </div>
        <div class="recipe-card" style="width: ${format.width}; height: ${format.height}; page-break-after: always;">
          <div class="card-content">
            <h1 class="title small">${escapeHtml(recipe.title)} <span class="continued">(Instructions)</span></h1>
            <ol class="instructions">
              ${recipe.instructions.map(inst => `
                <li>${escapeHtml(inst.content)}</li>
              `).join('')}
            </ol>
          </div>
        </div>
      `
    }
  }

  // For larger formats or small recipes, fit everything on one page
  return `
    <div class="recipe-card" style="width: ${format.width}; min-height: ${format.height}; page-break-after: always;">
      <div class="card-content">
        <h1 class="title">${escapeHtml(recipe.title)}</h1>
        <div class="meta">
          ${totalTime ? `<span>${totalTime}</span>` : ''}
          ${recipe.servings ? `<span>${recipe.servings} servings</span>` : ''}
        </div>

        <div class="${isSmallFormat ? '' : 'two-column'}">
          <div class="column">
            <h2 class="section-title">Ingredients</h2>
            <ul class="ingredients">
              ${recipe.ingredients.map(ing => `
                <li><span class="amount">${escapeHtml(ing.amount || '')} ${escapeHtml(ing.unit || '')}</span> ${escapeHtml(ing.item)}</li>
              `).join('')}
            </ul>
          </div>

          <div class="column">
            <h2 class="section-title">Instructions</h2>
            <ol class="instructions">
              ${recipe.instructions.map(inst => `
                <li>${escapeHtml(inst.content)}</li>
              `).join('')}
            </ol>
          </div>
        </div>
      </div>
    </div>
  `
}

function generateFullHtml(userRecipes: RecipeData[], format: FormatDimension, formatKey: string): string {
  const isSmallFormat = formatKey === '3x5' || formatKey === '4x6'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          font-size: ${isSmallFormat ? '9pt' : '11pt'};
          line-height: 1.4;
          color: #333;
        }

        .recipe-card {
          background: white;
          overflow: hidden;
        }

        .card-content {
          padding: ${isSmallFormat ? '12pt' : '24pt'};
        }

        .title {
          font-size: ${isSmallFormat ? '12pt' : '18pt'};
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4pt;
          line-height: 1.2;
        }

        .title.small {
          font-size: ${isSmallFormat ? '10pt' : '14pt'};
        }

        .continued {
          font-weight: 400;
          color: #666;
        }

        .meta {
          display: flex;
          gap: 12pt;
          font-size: ${isSmallFormat ? '8pt' : '10pt'};
          color: #666;
          margin-bottom: ${isSmallFormat ? '8pt' : '16pt'};
        }

        .section-title {
          font-size: ${isSmallFormat ? '9pt' : '12pt'};
          font-weight: 600;
          color: #444;
          margin-bottom: 6pt;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }

        .two-column {
          display: flex;
          gap: 24pt;
        }

        .two-column .column {
          flex: 1;
        }

        .ingredients {
          list-style: none;
          margin-bottom: ${isSmallFormat ? '8pt' : '16pt'};
        }

        .ingredients li {
          margin-bottom: 2pt;
          padding-left: 8pt;
          position: relative;
        }

        .ingredients li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #999;
        }

        .amount {
          font-weight: 500;
          color: #1a1a1a;
        }

        .instructions {
          margin-left: 16pt;
        }

        .instructions li {
          margin-bottom: 4pt;
        }

        @page {
          margin: 0;
          size: ${format.pdfWidth}in ${format.pdfHeight}in;
        }
      </style>
    </head>
    <body>
      ${userRecipes.map(r => generateRecipeHtml(r, format, formatKey)).join('')}
    </body>
    </html>
  `
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const formatKey = (query.format as string) || 'full'

  const format = formatDimensions[formatKey]
  if (!format) {
    throw createError({
      statusCode: 400,
      message: `Invalid format. Valid formats: ${Object.keys(formatDimensions).join(', ')}`,
    })
  }

  // Get all user's recipes with ingredients and instructions
  const userRecipes = await db.query.recipes.findMany({
    where: eq(recipes.userId, user.id),
    with: {
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
    },
  })

  if (userRecipes.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'No recipes found to export',
    })
  }

  // Generate HTML for all recipes
  const html = generateFullHtml(userRecipes as RecipeData[], format, formatKey)

  // Find browser executable
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean) as string[]

  const executablePath = findExecutable(possiblePaths)

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      width: `${format.pdfWidth}in`,
      height: `${format.pdfHeight}in`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    // Set response headers for PDF download
    const filename = `twoteaspoons-cookbook-${formatKey}-${new Date().toISOString().split('T')[0]}.pdf`
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return pdfBuffer
  } finally {
    await browser.close()
  }
})
