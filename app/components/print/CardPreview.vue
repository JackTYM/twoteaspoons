<script setup lang="ts">
interface Recipe {
  title: string
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  ingredients: { id: number; amount: string | null; unit: string | null; item: string }[]
  instructions: { id: number; content: string }[]
  author?: { username: string | null } | null
  slug?: string
}

interface Props {
  recipe: Recipe
  format: string
  rotated?: boolean
  printScale?: number
}

const props = withDefaults(defineProps<Props>(), {
  rotated: false,
  printScale: 100,
})

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)

// Build PDF URL with current settings
const pdfUrl = computed(() => {
  const params = new URLSearchParams({
    format: props.format,
    rotated: String(props.rotated),
    scale: String(props.printScale),
  })
  return `/api/recipes/${username.value}/${slug.value}/print-pdf?${params.toString()}`
})

// Preview dimensions based on format
type PreviewSize = { width: string; height: string }

const defaultSize: PreviewSize = { width: '300px', height: '180px' }

const previewSizes: Record<string, PreviewSize> = {
  '3x5': defaultSize,
  '4x6': { width: '360px', height: '240px' },
  'a6': { width: '250px', height: '350px' },
  'half-letter': { width: '330px', height: '510px' },
  'full': { width: '510px', height: '660px' },
}

const previewSize = computed((): PreviewSize => {
  const base = previewSizes[props.format] ?? defaultSize
  // Swap dimensions if rotated (portrait page)
  if (props.rotated) {
    return {
      width: base.height,
      height: base.width,
    }
  }
  return base
})
</script>

<template>
  <div
    class="bg-white rounded-lg border border-neutral-200 shadow-lg overflow-hidden"
    :style="{ width: previewSize.width, height: previewSize.height }"
  >
    <embed
      :src="`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`"
      :style="{ width: previewSize.width, height: previewSize.height }"
      type="application/pdf"
    >
  </div>
</template>
