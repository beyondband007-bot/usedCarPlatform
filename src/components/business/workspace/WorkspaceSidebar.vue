<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { workspaceMenuGroups } from '@/constants/workspace'
import type { WorkspaceMenuItem } from '@/types/workspace'

defineProps<{
  activeCode: string
}>()

const emit = defineEmits<{
  select: [code: string]
}>()

function handleSelect(item: WorkspaceMenuItem) {
  if (item.disabled) {
    return
  }

  emit('select', item.code)
}
</script>

<template>
  <aside class="workspace-sidebar" aria-label="视觉工作台能力导航">
    <div class="workspace-sidebar-body">
      <section
        v-for="group in workspaceMenuGroups"
        :key="group.title"
        class="sidebar-group"
      >
        <h2 class="sidebar-group-title">{{ group.title }}</h2>

        <ul class="sidebar-menu">
          <li v-for="item in group.items" :key="item.code">
            <button
              type="button"
              class="sidebar-menu-item"
              :class="{
                'is-active': item.code === activeCode,
                'is-disabled': item.disabled,
                [`tag-${item.tagVariant ?? 'planned'}`]: true,
              }"
              :disabled="item.disabled"
              :aria-label="`${item.label}，${item.tag}`"
              @click="handleSelect(item)"
            >
              <span class="sidebar-menu-icon" aria-hidden="true">
                <Icon :icon="item.icon" />
              </span>
              <span class="sidebar-menu-label">{{ item.label }}</span>
              <span class="sidebar-menu-tag">{{ item.tag }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.workspace-sidebar {
  display: flex;
  height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface);
}

.workspace-sidebar-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px 14px 20px;
}

.sidebar-group-title {
  margin: 0 0 10px;
  padding: 0 8px;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.sidebar-menu {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar-menu-item {
  display: grid;
  width: 100%;
  align-items: center;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px 10px 10px 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.sidebar-menu-item:hover:not(:disabled) {
  background: color-mix(in srgb, #52c41a 8%, var(--app-surface-soft));
}

.sidebar-menu-item.is-active {
  border-color: color-mix(in srgb, #52c41a 24%, transparent);
  background: #e6f7ed;
  color: #135200;
}

:global([data-theme='dark']) .sidebar-menu-item.is-active {
  border-color: color-mix(in srgb, #52c41a 34%, transparent);
  background: color-mix(in srgb, #52c41a 16%, var(--app-surface-soft));
  color: #95de64;
}

.sidebar-menu-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.sidebar-menu-icon {
  display: grid;
  place-items: center;
  font-size: 20px;
  line-height: 1;
}

.sidebar-menu-item.is-active .sidebar-menu-icon {
  color: #389e0d;
}

:global([data-theme='dark']) .sidebar-menu-item.is-active .sidebar-menu-icon {
  color: #73d13d;
}

.sidebar-menu-label {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-menu-tag {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.sidebar-menu-item.tag-available .sidebar-menu-tag {
  background: #e6f7ed;
  color: #52c41a;
}

.sidebar-menu-item.tag-demo .sidebar-menu-tag {
  background: #fff7e6;
  color: #faad14;
}

.sidebar-menu-item.tag-package .sidebar-menu-tag {
  background: #f9f0ff;
  color: #722ed1;
}

.sidebar-menu-item.tag-beta .sidebar-menu-tag {
  background: #f9f0ff;
  color: #722ed1;
}

.sidebar-menu-item.tag-planned .sidebar-menu-tag {
  background: color-mix(in srgb, var(--app-text-soft) 14%, var(--app-surface-soft));
  color: var(--app-text-soft);
}

:global([data-theme='dark']) .sidebar-menu-item.tag-available .sidebar-menu-tag {
  background: color-mix(in srgb, #52c41a 18%, transparent);
  color: #95de64;
}

:global([data-theme='dark']) .sidebar-menu-item.tag-demo .sidebar-menu-tag {
  background: color-mix(in srgb, #faad14 18%, transparent);
  color: #ffc53d;
}

:global([data-theme='dark']) .sidebar-menu-item.tag-package .sidebar-menu-tag,
:global([data-theme='dark']) .sidebar-menu-item.tag-beta .sidebar-menu-tag {
  background: color-mix(in srgb, #722ed1 20%, transparent);
  color: #d3adf7;
}

</style>
