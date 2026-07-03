<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Icon } from "@iconify/vue";

import { useInterpreterOverlayStore } from "@/stores/interpreterOverlay";
import InterpreterSetupView from "@/components/business/interpreter/InterpreterSetupView.vue";
import InterpreterShareView from "@/components/business/interpreter/InterpreterShareView.vue";
import InterpreterCallView from "@/components/business/interpreter/InterpreterCallView.vue";
import InterpreterSummaryView from "@/components/business/interpreter/InterpreterSummaryView.vue";

const overlay = useInterpreterOverlayStore();
// 组件挂载时确保 session 存在;restart 会 destroy + 重建,所以 session 用 computed 跟随 store
overlay.ensureHostSession();
const session = computed(() => overlay.ensureHostSession());
const state = computed(() => session.value.state);

// ---- 反馈 toast ----
const toastText = ref("");
const toastShow = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function notify(text: string) {
  toastText.value = text;
  toastShow.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastShow.value = false;
  }, 1800);
}

function restart() {
  // 结束当前会话后彻底重建,避免残留信令通道/驱动
  overlay.destroy();
  overlay.ensureHostSession();
}

/** share / call 视图允许最小化 */
const canMinimize = computed(
  () => state.value.view === "share" || state.value.view === "call",
);

function minimize() {
  if (canMinimize.value) overlay.minimize();
}

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer);
  // 注意:不销毁 session,离开路由后由 overlay store 继续持有,
  // 悬浮 Widget 需要它。会话在挂断/取消/再来一次时统一销毁。
});
</script>

<template>
  <div class="interpreter-root interpreter-host">
    <div class="i-toast" :class="{ show: toastShow }">
      <Icon icon="lucide:check" />
      <span>{{ toastText }}</span>
    </div>

    <!-- 已最小化占位:提示用户可从右下角悬浮窗恢复 -->
    <div v-if="overlay.minimized && canMinimize" class="minimized-placeholder">
      <div class="mp-icon"><Icon icon="lucide:picture-in-picture-2" width="28" height="28" /></div>
      <div class="mp-title">会议已最小化</div>
      <div class="mp-sub">
        {{ state.view === "share" ? "邀请等待中" : "通话进行中" }} · 右下角悬浮窗可随时恢复
      </div>
      <button class="i-btn i-btn-primary" type="button" @click="overlay.expand()">
        <Icon icon="lucide:maximize-2" />展开会议
      </button>
    </div>

    <template v-else>
      <InterpreterSetupView v-if="state.view === 'setup'" :session="session" @notify="notify" />

      <div v-else-if="state.view === 'share'" class="i-stage">
        <InterpreterShareView
          :session="session"
          :can-minimize="canMinimize"
          @notify="notify"
          @minimize="minimize"
        />
      </div>

      <div v-else-if="state.view === 'call'" class="i-stage">
        <InterpreterCallView :session="session" :can-minimize="canMinimize" @minimize="minimize" />
      </div>

      <InterpreterSummaryView
        v-else-if="state.view === 'summary'"
        :session="session"
        @notify="notify"
        @restart="restart"
      />
    </template>
  </div>
</template>

<style lang="scss">
@use "../interpreter/interpreter.scss";
</style>

<style scoped lang="scss">
.minimized-placeholder {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
  color: #fff;

  .mp-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 201, 60, 0.16);
    color: #ffc93c;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }
  .mp-title {
    font-size: 20px;
    font-weight: 600;
  }
  .mp-sub {
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
  }
}
</style>
