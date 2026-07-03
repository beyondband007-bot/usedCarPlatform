<script setup lang="ts">
import { Icon } from '@iconify/vue'

import { workspaceMenuGroups } from '@/constants/workspace'
import type { SidebarCapabilityStatus, WorkspaceMenuItem } from '@/types/workspace'

const STATIC_TAG_GROUP_TITLE = '营销工具'

defineProps<{
  activeCode: string
  capabilityStatuses?: Partial<Record<string, SidebarCapabilityStatus>>
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

function getCapabilityStatus(
  item: WorkspaceMenuItem,
  capabilityStatuses?: Partial<Record<string, SidebarCapabilityStatus>>,
): SidebarCapabilityStatus | null {
  return capabilityStatuses?.[item.code] ?? null
}

function shouldShowStaticTag(
  groupTitle: string,
  item: WorkspaceMenuItem,
  capabilityStatuses?: Partial<Record<string, SidebarCapabilityStatus>>,
) {
  if (groupTitle !== STATIC_TAG_GROUP_TITLE) return false
  if (getCapabilityStatus(item, capabilityStatuses)) return false
  return Boolean(item.tag)
}

function getStatusAriaLabel(
  item: WorkspaceMenuItem,
  status: SidebarCapabilityStatus,
) {
  if (status === 'generating') return `${item.label}，正在生成中`
  if (status === 'success') return `${item.label}，生成成功`
  return `${item.label}，生成失败`
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
                'has-status-dot': Boolean(
                  getCapabilityStatus(item, capabilityStatuses),
                ),
                [`tag-${item.tagVariant ?? 'planned'}`]:
                  shouldShowStaticTag(group.title, item, capabilityStatuses),
              }"
              :disabled="item.disabled"
              :aria-label="
                getCapabilityStatus(item, capabilityStatuses)
                  ? getStatusAriaLabel(
                      item,
                      getCapabilityStatus(item, capabilityStatuses)!,
                    )
                  : shouldShowStaticTag(group.title, item, capabilityStatuses)
                    ? `${item.label}，${item.tag}`
                    : item.label
              "
              @click="handleSelect(item)"
            >
              <span class="sidebar-menu-icon" aria-hidden="true">
                <Icon :icon="item.icon" />
              </span>
              <span class="sidebar-menu-label">{{ item.label }}</span>
              <span
                v-if="getCapabilityStatus(item, capabilityStatuses)"
                class="sidebar-status-dot"
                :class="`is-${getCapabilityStatus(item, capabilityStatuses)}`"
                aria-hidden="true"
              />
              <span
                v-else-if="shouldShowStaticTag(group.title, item, capabilityStatuses)"
                class="sidebar-menu-tag"
              >
                {{ item.tag }}
              </span>
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
  border: 1px solid var(--workspace-line, var(--app-border));
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
    var(--workspace-panel, var(--app-surface));
  box-shadow: var(--workspace-shadow, 0 18px 52px rgba(0, 0, 0, 0.2));
}

:global(.workspace-page.theme-light) .workspace-sidebar {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), transparent 32%),
    var(--workspace-panel, var(--app-surface));
  box-shadow: var(--workspace-shadow, 0 14px 34px rgba(78, 111, 148, 0.09));
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
  padding: 18px 10px 20px;
}

.sidebar-group-title {
  margin: 0 0 10px;
  padding: 0 8px;
  color: #9ca3af;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  font-weight: 900;
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
  gap: 8px;
  padding: 10px 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--workspace-text-secondary, var(--app-text-soft));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.sidebar-menu-item:hover:not(:disabled) {
  background: var(--workspace-hover-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-text, var(--app-text));
}

.sidebar-menu-item.is-active {
  border-color: var(--workspace-accent-border, var(--workspace-line-strong, color-mix(in srgb, #efc24c 24%, transparent)));
  background: var(--workspace-accent-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-accent, var(--workspace-accent-strong, #ffd75a));
  box-shadow: none;
}

.sidebar-menu-item.is-active:hover:not(:disabled) {
  border-color: var(--workspace-accent-border, var(--workspace-line-strong, color-mix(in srgb, #efc24c 24%, transparent)));
  background: var(--workspace-accent-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-accent, var(--workspace-accent-strong, #ffd75a));
}

:global([data-theme='dark']) .sidebar-menu-item.is-active {
  border-color: var(--workspace-line-strong, rgba(239, 194, 76, 0.42));
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, var(--workspace-panel-soft, var(--app-surface-soft)));
  color: var(--workspace-accent-strong, #ffd75a);
  box-shadow: none;
}

.sidebar-menu-item.is-disabled {
  cursor: not-allowed;
  color: var(--workspace-text-disabled, var(--app-text-disabled, var(--app-text-soft)));
  opacity: 1;
}

.sidebar-menu-icon {
  display: grid;
  place-items: center;
  font-size: 20px;
  line-height: 1;
}

.sidebar-menu-item.is-active .sidebar-menu-icon {
  color: var(--workspace-accent, var(--workspace-accent-strong, #ffd75a));
}

:global([data-theme='dark']) .sidebar-menu-item.is-active .sidebar-menu-icon {
  color: var(--workspace-accent-strong, #ffd75a);
}

.sidebar-menu-label {
  min-width: 0;
  overflow: hidden;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.sidebar-status-dot.is-generating {
  background: #ffc000;
  box-shadow: 0 0 0 3px rgba(255, 192, 0, 0.18);
}

.sidebar-status-dot.is-success {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
}

.sidebar-status-dot.is-fail {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16);
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
  background: var(--workspace-tag-available-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-tag-available-text, var(--workspace-accent, var(--workspace-accent-strong, #ffd75a)));
}

.sidebar-menu-item.tag-demo .sidebar-menu-tag {
  background: var(--workspace-tag-demo-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-tag-demo-text, var(--workspace-accent, var(--workspace-accent-strong, #ffd75a)));
}

.sidebar-menu-item.tag-beta .sidebar-menu-tag {
  background: var(--workspace-tag-beta-bg, color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-tag-beta-text, var(--workspace-accent, var(--workspace-accent-strong, #ffd75a)));
}

.sidebar-menu-item.tag-planned .sidebar-menu-tag {
  background: var(--workspace-tag-planned-bg, color-mix(in srgb, var(--workspace-muted, var(--app-text-soft)) 10%, var(--workspace-panel-soft, var(--app-surface-soft))));
  color: var(--workspace-tag-planned-text, var(--workspace-muted, var(--app-text-muted, var(--app-text-soft))));
}

.sidebar-menu-item.tag-hot .sidebar-menu-tag {
  background: color-mix(in srgb, #ef4444 18%, var(--workspace-panel-soft, var(--app-surface-soft)));
  color: #ef4444;
}

.sidebar-menu-item.is-active.tag-hot .sidebar-menu-tag {
  background: color-mix(in srgb, #ef4444 24%, transparent);
  color: #f87171;
}

:global([data-theme='dark']) .sidebar-menu-item.tag-demo .sidebar-menu-tag {
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent);
  color: var(--workspace-accent-strong, #ffd75a);
}

:global([data-theme='dark']) .sidebar-menu-item.tag-beta .sidebar-menu-tag {
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
  color: var(--workspace-accent-strong, #ffd75a);
}

:global([data-theme='dark']) .sidebar-menu-item.tag-hot .sidebar-menu-tag {
  background: color-mix(in srgb, #ef4444 22%, transparent);
  color: #fca5a5;
}

:global([data-theme='dark']) .sidebar-menu-item.is-active.tag-hot .sidebar-menu-tag {
  background: color-mix(in srgb, #ef4444 28%, transparent);
  color: #fecaca;
}

</style>
