<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

import { useInterpreterOverlayStore } from "@/stores/interpreterOverlay";
import { INTERPRETER_CAPABILITY_CODE } from "@/constants/interpreter";

const store = useInterpreterOverlayStore();
const route = useRoute();
const router = useRouter();

/** 用户已在 Studio 页时,展开只需 store.expand();否则先路由回去 */
const onStudioPage = computed(
  () =>
    route.name === "Workspace" &&
    (route.params as { code?: string }).code === INTERPRETER_CAPABILITY_CODE,
);

async function expand() {
  store.expand();
  if (!onStudioPage.value) {
    await router.push({
      name: "Workspace",
      params: { code: INTERPRETER_CAPABILITY_CODE },
    });
  }
}

async function hangup() {
  const session = store.session;
  if (session) {
    await session.hangup();
  }
  // 收起悬浮窗;summary 由 Studio 页承接展示,若不在 Studio 页则跳回去看摘要
  store.minimized = false;
  if (!onStudioPage.value) {
    await router.push({
      name: "Workspace",
      params: { code: INTERPRETER_CAPABILITY_CODE },
    });
  }
}

const statusText = computed(() => {
  const view = store.session?.state.view;
  if (view === "share") return "等待对方加入…";
  if (view === "call") return "通话进行中";
  return "";
});

const timerText = computed(() => {
  const s = store.session;
  if (!s) return "";
  if (s.state.view === "call") return s.fmtTimer(s.state.callElapsed);
  if (s.state.view === "share") {
    if (s.state.shareExpired) return "已过期";
    return s.fmtTimer(s.state.shareRemaining);
  }
  return "";
});
</script>

<template>
  <div
    v-if="store.showFloating && store.session"
    class="interpreter-widget"
    role="dialog"
    aria-label="同声传译悬浮窗"
    @click="expand"
  >
    <div class="widget-inner">
      <div
        class="widget-avatar"
        :style="{ background: store.session.gradientOf(store.session.remoteParty.value.color) }"
      >
        {{ store.session.remoteParty.value.initial }}
      </div>
      <div class="widget-body">
        <div class="widget-line-top">
          <span class="widget-name">{{ store.session.remoteParty.value.name }}</span>
          <span class="widget-status">
            <span class="widget-dot" :class="{ pulse: store.session.state.view === 'call' }" />
            {{ statusText }}
          </span>
        </div>
        <div class="widget-line-bottom">
          <span class="widget-room">
            ROOM · {{ store.session.state.roomId || "————" }}
          </span>
          <span class="widget-timer">{{ timerText }}</span>
        </div>
      </div>
      <div class="widget-actions" @click.stop>
        <button class="widget-btn expand" title="展开" @click="expand">
          <Icon icon="lucide:maximize-2" width="16" height="16" />
        </button>
        <button class="widget-btn hangup" title="挂断" @click="hangup">
          <Icon icon="lucide:phone-off" width="16" height="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.interpreter-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 999;
  width: 320px;
  padding: 12px 14px;
  background: rgba(20, 20, 20, 0.94);
  border: 1px solid rgba(255, 201, 60, 0.35);
  border-radius: 14px;
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 32px rgba(255, 201, 60, 0.12);
  backdrop-filter: blur(16px);
  color: #fff;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  cursor: pointer;
  transition:
    transform 0.18s,
    box-shadow 0.18s;
  animation: widgetIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.interpreter-widget:hover {
  transform: translateY(-2px);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(255, 201, 60, 0.2);
}
@keyframes widgetIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.widget-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.widget-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}
.widget-body {
  flex: 1;
  min-width: 0;
}
.widget-line-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.widget-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.widget-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
}
.widget-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}
.widget-dot.pulse {
  background: #ef4444;
  animation: widgetBlink 1.4s infinite;
}
@keyframes widgetBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.widget-line-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.widget-room {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.widget-timer {
  color: #ffc93c;
  font-weight: 500;
}

.widget-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.widget-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.18s;
}
.widget-btn.expand:hover {
  border-color: #ffc93c;
  color: #ffc93c;
  transform: translateY(-1px);
}
.widget-btn.hangup {
  background: #ef4444;
  border-color: #ef4444;
}
.widget-btn.hangup:hover {
  background: #dc2626;
  transform: translateY(-1px);
}
</style>
