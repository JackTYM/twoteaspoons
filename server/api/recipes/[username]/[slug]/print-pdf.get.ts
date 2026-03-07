import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const format = (query.format as string) || '3x5'
  const rotated = query.rotated === 'true'
  const scale = (Number(query.scale) || 100) / 100

  // Fetch recipe data
  const recipe = await $fetch(`/api/recipes/${username}/${slug}`, {
    headers: event.node.req.headers as Record<string, string>,
  }).catch(() => null)

  if (!recipe?.recipe) {
    throw createError({ statusCode: 404, message: 'Recipe not found' })
  }

  const recipeData = recipe.recipe

  // Format dimensions in points (72 points per inch)
  const defaultDims = { width: 5 * 72, height: 3 * 72 }
  const formats: Record<string, { width: number; height: number }> = {
    '3x5': defaultDims,
    '4x6': { width: 6 * 72, height: 4 * 72 },
    'a6': { width: 4.13 * 72, height: 5.83 * 72 },
    'half-letter': { width: 5.5 * 72, height: 8.5 * 72 },
    'full': { width: 8.5 * 72, height: 11 * 72 },
  }

  const dims: { width: number; height: number } = formats[format] ?? defaultDims

  // Large formats combine ingredients and instructions on same page
  const isLargeFormat = ['a6', 'half-letter', 'full'].includes(format)

  // For rotated mode, swap page dimensions (portrait page)
  const pageWidth = rotated ? dims.height : dims.width
  const pageHeight = rotated ? dims.width : dims.height

  // Create PDF
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Helper to format time
  function formatTime(minutes: number | null): string {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours}h ${mins}m` : `${hours}h`
  }

  const prepTime = formatTime(recipeData.prepTime)
  const cookTime = formatTime(recipeData.cookTime)
  const totalTime = formatTime((recipeData.prepTime || 0) + (recipeData.cookTime || 0))

  const minMargin = 0.15 * 72 // Minimum margin to stop content

  if (rotated) {
    // Rotated mode: text rotated -90° (clockwise in PDF)
    // Apply scale to font sizes (base sizes tuned for ~8-10 ingredients on 3x5 card)
    const titleSize = 16 * scale
    const metaSize = 9 * scale
    const headerSize = 11 * scale
    const itemSize = 9 * scale
    const lineSpacing = 3 * scale
    const sectionSpacing = 6 * scale
    const titleSpacing = 2 * scale
    const metaSpacing = 4 * scale
    const headerSpacing = sectionSpacing
    const topMargin = 0.3 * 72
    const leftMargin = 0.2 * 72
    const y = pageHeight - leftMargin
    // Use minimum of actual card width (prevents overflow at large scales) and scaled width (maintains logical wrap points at small scales)
    const baseMaxWidth = pageHeight - 2 * leftMargin
    const maxTextWidth = Math.min(baseMaxWidth, baseMaxWidth * scale)
    const wrapSpacing = 2 * scale

    const metaItems = [
      prepTime ? `Prep: ${prepTime}` : '',
      cookTime ? `Cook: ${cookTime}` : '',
      totalTime ? `Total: ${totalTime}` : '',
      recipeData.servings ? `${recipeData.servings} servings` : '',
    ].filter(Boolean)
    const metaText = metaItems.join('  ')

    // Pre-calculate total content height to determine if we need multi-page or can center
    let totalContentHeight = titleSize + titleSpacing
    if (metaText) totalContentHeight += metaSize + metaSpacing
    totalContentHeight += headerSize + headerSpacing

    // Calculate height needed for ingredients (with word wrapping)
    for (const ing of recipeData.ingredients || []) {
      const amount = [ing.amount, ing.unit].filter(Boolean).join(' ')
      const text = amount ? `${amount} ${ing.item}` : ing.item
      const words = text.split(' ')
      let line = ''
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, itemSize)
        if (testWidth > maxTextWidth && line) {
          totalContentHeight += itemSize + wrapSpacing
          line = word
        } else {
          line = testLine
        }
      }
      if (line) totalContentHeight += itemSize + lineSpacing
    }

    const availableSpace = pageWidth - 2 * minMargin
    const fitsOnOnePage = totalContentHeight <= availableSpace

    // Create first page
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    // Center if fits (but not for large formats - they align to top)
    let x = (fitsOnOnePage && !isLargeFormat)
      ? (pageWidth + totalContentHeight) / 2
      : pageWidth - topMargin

    function needsNewPage(requiredSpace: number): boolean {
      return x - requiredSpace < minMargin
    }

    function startNewIngredientPage(): void {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      x = pageWidth - topMargin
    }

    // Title
    currentPage.drawText(recipeData.title, {
      x: x,
      y: y,
      size: titleSize,
      font: fontBold,
      color: rgb(0, 0, 0),
      rotate: degrees(-90),
    })
    x -= titleSize + titleSpacing

    // Time and servings
    if (metaText) {
      if (needsNewPage(metaSize + metaSpacing)) {
        startNewIngredientPage()
      }
      currentPage.drawText(metaText, {
        x: x,
        y: y,
        size: metaSize,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
        rotate: degrees(-90),
      })
      x -= metaSize + metaSpacing
    }

    // Ingredients header
    if (needsNewPage(headerSize + headerSpacing)) {
      startNewIngredientPage()
    }
    currentPage.drawText('Ingredients', {
      x: x,
      y: y,
      size: headerSize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
      rotate: degrees(-90),
    })
    x -= headerSize + headerSpacing

    // Ingredients list with multi-page support and word wrapping
    for (const ing of recipeData.ingredients || []) {
      const amount = [ing.amount, ing.unit].filter(Boolean).join(' ')
      const text = amount ? `${amount} ${ing.item}` : ing.item

      const words = text.split(' ')
      let line = ''
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, itemSize)

        if (testWidth > maxTextWidth && line) {
          if (needsNewPage(itemSize + wrapSpacing)) {
            startNewIngredientPage()
            currentPage.drawText('Ingredients (continued)', {
              x: x,
              y: y,
              size: headerSize,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2),
              rotate: degrees(-90),
            })
            x -= headerSize + headerSpacing
          }
          currentPage.drawText(line, {
            x: x,
            y: y,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
            rotate: degrees(-90),
          })
          x -= itemSize + wrapSpacing
          line = word
        } else {
          line = testLine
        }
      }

      if (line) {
        if (needsNewPage(itemSize + lineSpacing)) {
          startNewIngredientPage()
          currentPage.drawText('Ingredients (continued)', {
            x: x,
            y: y,
            size: headerSize,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
            rotate: degrees(-90),
          })
          x -= headerSize + headerSpacing
        }
        currentPage.drawText(line, {
          x: x,
          y: y,
          size: itemSize,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
          rotate: degrees(-90),
        })
        x -= itemSize + lineSpacing
      }
    }

    // For large formats, add instructions on the same page flow
    if (isLargeFormat && recipeData.instructions?.length > 0) {
      const instructionHeaderSpacing = sectionSpacing * 2
      const stepSpacing = 5 * scale

      // Instructions header
      if (needsNewPage(headerSize + instructionHeaderSpacing)) {
        startNewIngredientPage()
      }
      x -= instructionHeaderSpacing // Extra space before instructions
      currentPage.drawText('Instructions', {
        x: x,
        y: y,
        size: headerSize,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
        rotate: degrees(-90),
      })
      x -= headerSize + headerSpacing

      // Instructions list
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`

        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)

          if (testWidth > maxTextWidth && line) {
            if (needsNewPage(itemSize + wrapSpacing)) {
              startNewIngredientPage()
              currentPage.drawText('Instructions (continued)', {
                x: x,
                y: y,
                size: headerSize,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
                rotate: degrees(-90),
              })
              x -= headerSize + headerSpacing
            }
            currentPage.drawText(line, {
              x: x,
              y: y,
              size: itemSize,
              font: font,
              color: rgb(0.3, 0.3, 0.3),
              rotate: degrees(-90),
            })
            x -= itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }

        if (line) {
          if (needsNewPage(itemSize + stepSpacing)) {
            startNewIngredientPage()
            currentPage.drawText('Instructions (continued)', {
              x: x,
              y: y,
              size: headerSize,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2),
              rotate: degrees(-90),
            })
            x -= headerSize + headerSpacing
          }
          currentPage.drawText(line, {
            x: x,
            y: y,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
            rotate: degrees(-90),
          })
          x -= itemSize + stepSpacing
        }
      }
    }

  } else {
    // Non-rotated mode: horizontal text with scale, centering, and multi-page support
    const margin = 0.25 * 72
    const titleSize = 14 * scale
    const metaSize = 9 * scale
    const headerSize = 10 * scale
    const itemSize = 9 * scale
    const titleSpacing = 4 * scale
    const metaSpacing = 8 * scale
    const headerSpacing = 6 * scale
    const lineSpacing = 3 * scale
    const wrapSpacing = 2 * scale
    const baseMaxWidth = pageWidth - 2 * margin
    const maxTextWidth = Math.min(baseMaxWidth, baseMaxWidth * scale)

    const metaItems2 = [
      prepTime ? `Prep: ${prepTime}` : '',
      cookTime ? `Cook: ${cookTime}` : '',
      totalTime ? `Total: ${totalTime}` : '',
      recipeData.servings ? `${recipeData.servings} servings` : '',
    ].filter(Boolean)
    const metaText = metaItems2.join('  ')

    // Pre-calculate total content height
    let totalContentHeight = titleSize + titleSpacing
    if (metaText) totalContentHeight += metaSize + metaSpacing
    totalContentHeight += headerSize + headerSpacing

    for (const ing of recipeData.ingredients || []) {
      const amount = [ing.amount, ing.unit].filter(Boolean).join(' ')
      const text = amount ? `${amount} ${ing.item}` : ing.item
      const words = text.split(' ')
      let line = ''
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, itemSize)
        if (testWidth > maxTextWidth && line) {
          totalContentHeight += itemSize + wrapSpacing
          line = word
        } else {
          line = testLine
        }
      }
      if (line) totalContentHeight += itemSize + lineSpacing
    }

    const availableSpace = pageHeight - 2 * margin
    const fitsOnOnePage = totalContentHeight <= availableSpace

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
    // Center vertically if fits (but not for large formats - they align to top)
    let y = (fitsOnOnePage && !isLargeFormat)
      ? (pageHeight + totalContentHeight) / 2
      : pageHeight - margin

    function needsNewPageH(requiredSpace: number): boolean {
      return y - requiredSpace < margin
    }

    function startNewIngredientPageH(): void {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    // Title
    currentPage.drawText(recipeData.title, {
      x: margin,
      y: y - titleSize,
      size: titleSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    y -= titleSize + titleSpacing

    // Time and servings
    if (metaText) {
      if (needsNewPageH(metaSize + metaSpacing)) {
        startNewIngredientPageH()
      }
      currentPage.drawText(metaText, {
        x: margin,
        y: y - metaSize,
        size: metaSize,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= metaSize + metaSpacing
    }

    // Ingredients header
    if (needsNewPageH(headerSize + headerSpacing)) {
      startNewIngredientPageH()
    }
    currentPage.drawText('Ingredients', {
      x: margin,
      y: y - headerSize,
      size: headerSize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })
    y -= headerSize + headerSpacing

    // Ingredients list with word wrapping and multi-page
    for (const ing of recipeData.ingredients || []) {
      const amount = [ing.amount, ing.unit].filter(Boolean).join(' ')
      const text = amount ? `${amount} ${ing.item}` : ing.item
      const words = text.split(' ')
      let line = ''

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, itemSize)

        if (testWidth > maxTextWidth && line) {
          if (needsNewPageH(itemSize + wrapSpacing)) {
            startNewIngredientPageH()
            currentPage.drawText('Ingredients (continued)', {
              x: margin,
              y: y - headerSize,
              size: headerSize,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2),
            })
            y -= headerSize + headerSpacing
          }
          currentPage.drawText(line, {
            x: margin,
            y: y - itemSize,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          })
          y -= itemSize + wrapSpacing
          line = word
        } else {
          line = testLine
        }
      }

      if (line) {
        if (needsNewPageH(itemSize + lineSpacing)) {
          startNewIngredientPageH()
          currentPage.drawText('Ingredients (continued)', {
            x: margin,
            y: y - headerSize,
            size: headerSize,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          })
          y -= headerSize + headerSpacing
        }
        currentPage.drawText(line, {
          x: margin,
          y: y - itemSize,
          size: itemSize,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        })
        y -= itemSize + lineSpacing
      }
    }

    // For large formats, add instructions on the same page flow
    if (isLargeFormat && recipeData.instructions?.length > 0) {
      const instructionHeaderSpacing = headerSpacing * 2
      const stepSpacing = 4 * scale

      // Instructions header
      if (needsNewPageH(headerSize + instructionHeaderSpacing)) {
        startNewIngredientPageH()
      }
      y -= instructionHeaderSpacing // Extra space before instructions
      currentPage.drawText('Instructions', {
        x: margin,
        y: y - headerSize,
        size: headerSize,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      y -= headerSize + headerSpacing

      // Instructions list
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`

        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)

          if (testWidth > maxTextWidth && line) {
            if (needsNewPageH(itemSize + wrapSpacing)) {
              startNewIngredientPageH()
              currentPage.drawText('Instructions (continued)', {
                x: margin,
                y: y - headerSize,
                size: headerSize,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
              })
              y -= headerSize + headerSpacing
            }
            currentPage.drawText(line, {
              x: margin,
              y: y - itemSize,
              size: itemSize,
              font: font,
              color: rgb(0.3, 0.3, 0.3),
            })
            y -= itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }

        if (line) {
          if (needsNewPageH(itemSize + stepSpacing)) {
            startNewIngredientPageH()
            currentPage.drawText('Instructions (continued)', {
              x: margin,
              y: y - headerSize,
              size: headerSize,
              font: fontBold,
              color: rgb(0.2, 0.2, 0.2),
            })
            y -= headerSize + headerSpacing
          }
          currentPage.drawText(line, {
            x: margin,
            y: y - itemSize,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          })
          y -= itemSize + stepSpacing
        }
      }
    }
  }

  // Create instruction pages (may span multiple cards) - skip for large formats (handled above)
  if (!isLargeFormat && recipeData.instructions?.length > 0) {
    if (rotated) {
      // Apply scale to font sizes
      const headerSize = 11 * scale
      const itemSize = 9 * scale
      const titleSpacing = 8 * scale
      const wrapSpacing = 2 * scale
      const stepSpacing = 5 * scale
      const leftMargin = 0.2 * 72
      const topMargin = 0.3 * 72
      // Use minimum of actual card width (prevents overflow at large scales) and scaled width (maintains logical wrap points at small scales)
      const baseMaxWidth = pageHeight - 2 * leftMargin
      const maxTextWidth = Math.min(baseMaxWidth, baseMaxWidth * scale)
      const y = pageHeight - leftMargin

      // Pre-calculate total content height
      let totalContentHeight = headerSize + titleSpacing
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`
        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)
          if (testWidth > maxTextWidth && line) {
            totalContentHeight += itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }
        if (line) totalContentHeight += itemSize + stepSpacing
      }

      const availableSpace = pageWidth - 2 * minMargin
      const fitsOnOnePage = totalContentHeight <= availableSpace

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      let x = fitsOnOnePage
        ? (pageWidth + totalContentHeight) / 2
        : pageWidth - topMargin

      function drawHeader(continued: boolean): void {
        const headerText = continued ? 'Instructions (continued)' : 'Instructions'
        currentPage.drawText(headerText, {
          x: x,
          y: y,
          size: headerSize,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
          rotate: degrees(-90),
        })
        x -= headerSize + titleSpacing
      }

      function needsNewPage(requiredSpace: number): boolean {
        return x - requiredSpace < minMargin
      }

      function startNewPage(): void {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        x = pageWidth - topMargin
        drawHeader(true)
      }

      drawHeader(false)

      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`

        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)

          if (testWidth > maxTextWidth && line) {
            if (needsNewPage(itemSize + wrapSpacing)) {
              startNewPage()
            }
            currentPage.drawText(line, {
              x: x,
              y: y,
              size: itemSize,
              font: font,
              color: rgb(0.3, 0.3, 0.3),
              rotate: degrees(-90),
            })
            x -= itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }

        if (line) {
          if (needsNewPage(itemSize + stepSpacing)) {
            startNewPage()
          }
          currentPage.drawText(line, {
            x: x,
            y: y,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
            rotate: degrees(-90),
          })
          x -= itemSize + stepSpacing
        }
      }

    } else {
      // Non-rotated instructions with centering and multi-page support
      const margin = 0.25 * 72
      const headerSize = 12 * scale
      const itemSize = 9 * scale
      const headerSpacing = 8 * scale
      const wrapSpacing = 2 * scale
      const stepSpacing = 4 * scale
      const baseMaxWidth = dims.width - 2 * margin
      const maxTextWidth = Math.min(baseMaxWidth, baseMaxWidth * scale)

      // Pre-calculate total content height
      let totalContentHeight = headerSize + headerSpacing
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`
        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)
          if (testWidth > maxTextWidth && line) {
            totalContentHeight += itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }
        if (line) totalContentHeight += itemSize + stepSpacing
      }

      const availableSpace = pageHeight - 2 * margin
      const fitsOnOnePage = totalContentHeight <= availableSpace

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      let y = fitsOnOnePage
        ? (pageHeight + totalContentHeight) / 2
        : pageHeight - margin

      function needsNewPageI(requiredSpace: number): boolean {
        return y - requiredSpace < margin
      }

      function startNewInstructionPageH(): void {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
        currentPage.drawText('Instructions (continued)', {
          x: margin,
          y: y - headerSize,
          size: headerSize,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        })
        y -= headerSize + headerSpacing
      }

      // Header
      currentPage.drawText('Instructions', {
        x: margin,
        y: y - headerSize,
        size: headerSize,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      y -= headerSize + headerSpacing

      // Instructions with multi-page support
      for (let i = 0; i < recipeData.instructions.length; i++) {
        const inst = recipeData.instructions[i]
        if (!inst) continue
        const text = `${i + 1}. ${inst.content}`

        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          const testWidth = font.widthOfTextAtSize(testLine, itemSize)
          if (testWidth > maxTextWidth && line) {
            if (needsNewPageI(itemSize + wrapSpacing)) {
              startNewInstructionPageH()
            }
            currentPage.drawText(line, {
              x: margin,
              y: y - itemSize,
              size: itemSize,
              font: font,
              color: rgb(0.3, 0.3, 0.3),
            })
            y -= itemSize + wrapSpacing
            line = word
          } else {
            line = testLine
          }
        }
        if (line) {
          if (needsNewPageI(itemSize + stepSpacing)) {
            startNewInstructionPageH()
          }
          currentPage.drawText(line, {
            x: margin,
            y: y - itemSize,
            size: itemSize,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          })
          y -= itemSize + stepSpacing
        }
      }
    }
  }

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save()

  // Return PDF
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${recipeData.title.replace(/[^a-z0-9]/gi, '-')}.pdf"`)

  return pdfBytes
})
