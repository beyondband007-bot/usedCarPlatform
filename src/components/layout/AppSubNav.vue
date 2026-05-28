<script setup lang="ts">
import { secondaryNavigation } from '@/constants/prototype'
</script>

<template>
  <nav
    class="sticky top-[72px] z-40 flex min-h-[44px] w-full items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-sm xl:px-6"
    aria-label="工作台导航"
  >
    <div
      class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <RouterLink
        v-for="item in secondaryNavigation"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          type="button"
          class="inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm font-semibold transition duration-200"
          :class="
            isActive
              ? 'bg-[var(--app-header-nav-active-bg)] text-[var(--app-header-nav-active)]'
              : 'text-[var(--app-text-soft)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
          "
          @click="navigate"
        >
          {{ item.label }}
        </button>
      </RouterLink>
    </div>
  </nav>
</template>
