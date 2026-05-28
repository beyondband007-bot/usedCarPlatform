<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton } from 'naive-ui'
import { computed, onUnmounted, ref, watch } from 'vue'

import { homeCaseTabs } from '@/constants/home-page'

const activeTabId = ref(homeCaseTabs[0]?.id ?? '')

const activeCase = computed(
  () => homeCaseTabs.find((tab) => tab.id === activeTabId.value) ?? homeCaseTabs[0],
)

const compareEl = ref<HTMLElement | null>(null)
const comparePosition = ref(52)
const isDragging = ref(false)

function clampPosition(ratio: number) {
  comparePosition.value = Math.min(92, Math.max(8, ratio))
}

function updatePositionFromClientX(clientX: number) {
  const root = compareEl.value
  if (!root) {
    return
  }

  const rect = root.getBoundingClientRect()
  const ratio = ((clientX - rect.left) / rect.width) * 100
  clampPosition(ratio)
}

function onPointerMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) {
    return
  }

  const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
  if (clientX == null) {
    return
  }

  updatePositionFromClientX(clientX)
}

function stopDrag() {
  isDragging.value = false
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('touchend', stopDrag)
  document.body.classList.remove('home-case-dragging')
}

function startDrag(event: MouseEvent | TouchEvent) {
  isDragging.value = true
  document.body.classList.add('home-case-dragging')

  const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
  if (clientX != null) {
    updatePositionFromClientX(clientX)
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onPointerMove, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

watch(activeTabId, () => {
  comparePosition.value = 52
})

onUnmounted(() => {
  stopDrag()
})
</script>

<template>
  <section class="home-cases" aria-label="真实成片交付案例">
    <div class="home-cases-inner">
      <header class="home-cases-header">
        <h2>真实成片交付案例</h2>
        <div class="home-cases-tabs" role="tablist">
          <button
            v-for="tab in homeCaseTabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="home-cases-tab"
            :class="{ 'is-active': tab.id === activeTabId }"
            :aria-selected="tab.id === activeTabId"
            @click="activeTabId = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </header>

      <article v-if="activeCase" class="home-case-card">
        <div
          ref="compareEl"
          class="home-case-compare"
          :class="{ 'is-dragging': isDragging }"
        >
          <img class="home-case-before" :src="activeCase.beforeImage" alt="处理前" draggable="false" />
          <img
            class="home-case-after"
            :src="activeCase.afterImage"
            alt="AI 影棚效果"
            draggable="false"
            :style="{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }"
          />
          <div
            class="home-case-divider"
            :style="{ left: `${comparePosition}%` }"
            aria-hidden="true"
          ></div>
          <button
            type="button"
            class="home-case-handle"
            :class="{ 'is-dragging': isDragging }"
            :style="{ left: `${comparePosition}%` }"
            aria-label="拖动对比处理前后效果"
            @mousedown.prevent="startDrag"
            @touchstart.prevent="startDrag"
          >
            <Icon icon="mdi:chevron-left" />
            <Icon icon="mdi:chevron-right" />
          </button>
          <span class="home-case-label home-case-label--before">处理前</span>
          <span class="home-case-label home-case-label--after">AI 影棚</span>
        </div>

        <div class="home-case-copy">
          <h3>{{ activeCase.title }}</h3>
          <p>{{ activeCase.summary }}</p>
          <ul>
            <li v-for="point in activeCase.painPoints" :key="point">{{ point }}</li>
          </ul>
          <div class="home-case-stats">
            <div v-for="stat in activeCase.stats" :key="stat.label">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
          <NButton type="primary" class="home-case-cta">查看案例详情</NButton>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-cases {
  padding: clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px);
}

.home-cases-inner {
  max-width: 1280px;
  margin: 0 auto;
}

.home-cases-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.home-cases-header h2 {
  margin: 0;
  color: var(--home-text);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 950;
}

.home-cases-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-cases-tab {
  border: 1px solid var(--home-border);
  border-radius: 999px;
  background: var(--home-surface);
  color: var(--home-muted);
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.home-cases-tab.is-active {
  border-color: transparent;
  background: var(--home-blue);
  color: #fff;
}

.home-case-card {
  display: grid;
  gap: 24px;
  margin-top: 28px;
  padding: clamp(20px, 2.5vw, 28px);
  border: 1px solid var(--home-border);
  border-radius: 20px;
  background: var(--home-surface);
  box-shadow: var(--home-shadow-soft);
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
}

.home-case-compare {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  aspect-ratio: 16 / 11;
  background: var(--home-soft);
  user-select: none;
  touch-action: none;
}

.home-case-compare.is-dragging {
  cursor: ew-resize;
}

.home-case-before,
.home-case-after {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.home-case-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
  pointer-events: none;
}

.home-case-handle {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: var(--home-blue);
  box-shadow: 0 8px 24px rgba(15, 35, 60, 0.22);
  transform: translate(-50%, -50%);
  cursor: grab;
  transition: box-shadow 0.15s ease;
}

.home-case-handle.is-dragging {
  cursor: grabbing;
  box-shadow: 0 10px 28px rgba(15, 35, 60, 0.32);
}

.home-case-handle :deep(svg) {
  font-size: 18px;
}

.home-case-label {
  position: absolute;
  top: 12px;
  z-index: 2;
  border-radius: 6px;
  background: rgba(8, 12, 22, 0.65);
  color: #fff;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

.home-case-label--before {
  left: 12px;
}

.home-case-label--after {
  right: 12px;
}

.home-case-copy h3 {
  margin: 0;
  color: var(--home-text);
  font-size: clamp(22px, 2.2vw, 28px);
  font-weight: 900;
}

.home-case-copy > p {
  margin: 12px 0 0;
  color: var(--home-muted);
  font-size: 15px;
  line-height: 1.65;
  font-weight: 600;
}

.home-case-copy ul {
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--home-muted);
  font-size: 14px;
  line-height: 1.7;
}

.home-case-stats {
  display: grid;
  gap: 12px;
  margin-top: 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.home-case-stats div {
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--home-blue) 10%, var(--home-surface));
}

.home-case-stats strong {
  display: block;
  color: var(--home-blue);
  font-size: clamp(24px, 2.5vw, 32px);
  font-weight: 950;
  line-height: 1.1;
}

.home-case-stats span {
  display: block;
  margin-top: 6px;
  color: var(--home-muted);
  font-size: 13px;
  font-weight: 700;
}

.home-case-cta {
  margin-top: 24px;
  min-width: 140px;
  height: 42px !important;
  border-radius: 8px !important;
  font-weight: 800 !important;
}

@media (max-width: 960px) {
  .home-case-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<style lang="scss">
body.home-case-dragging {
  cursor: grabbing !important;
  user-select: none;
}
</style>
