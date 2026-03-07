<script setup lang="ts">
interface Tab {
  label: string
  icon: string
  value: string
  requiresAuth?: boolean
}

interface Props {
  tabs: Tab[]
  activeTab: string
  isAuthenticated: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [tab: Tab]
}>()

// Track tab button refs for calculating indicator position
const tabRefs = ref<(HTMLButtonElement | null)[]>([])
const navRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({ left: '0px', width: '0px' })

// Calculate indicator position based on active tab
function updateIndicator(): void {
  const activeIndex = props.tabs.findIndex(t => t.value === props.activeTab)
  const activeEl = tabRefs.value[activeIndex]

  if (activeEl && navRef.value) {
    const navRect = navRef.value.getBoundingClientRect()
    const tabRect = activeEl.getBoundingClientRect()
    indicatorStyle.value = {
      left: `${tabRect.left - navRect.left}px`,
      width: `${tabRect.width}px`,
    }
  }
}

// Update indicator when active tab changes
watch(() => props.activeTab, () => {
  nextTick(updateIndicator)
})

// Initial update after mount
onMounted(() => {
  nextTick(updateIndicator)
})

// Handle window resize
if (import.meta.client) {
  window.addEventListener('resize', updateIndicator)
}

function setTabRef(el: HTMLButtonElement | null, index: number): void {
  tabRefs.value[index] = el
}
</script>

<template>
  <nav
    ref="navRef"
    class="relative border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm"
  >
    <div class="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.value"
        :ref="(el) => setTabRef(el as HTMLButtonElement | null, index)"
        class="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-lg mx-0.5"
        :class="[
          activeTab === tab.value
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        ]"
        @click="emit('select', tab)"
      >
        <UIcon
          :name="tab.icon"
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'scale-110': activeTab === tab.value }"
        />
        <span>{{ tab.label }}</span>
        <UTooltip
          v-if="tab.requiresAuth && !isAuthenticated"
          text="Sign in required"
          :delay-duration="300"
        >
          <UIcon
            name="i-heroicons-lock-closed"
            class="w-3 h-3 opacity-50"
          />
        </UTooltip>
      </button>
    </div>

    <!-- Animated underline indicator -->
    <div
      class="absolute bottom-0 h-0.5 bg-primary-500 rounded-full transition-all duration-300 ease-out"
      :style="indicatorStyle"
    />
  </nav>
</template>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
