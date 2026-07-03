<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

import { useInterpreterSession } from "@/composables/useInterpreterSession";
import InterpreterJoinView from "@/components/business/interpreter/InterpreterJoinView.vue";
import InterpreterCallView from "@/components/business/interpreter/InterpreterCallView.vue";
import InterpreterSummaryView from "@/components/business/interpreter/InterpreterSummaryView.vue";

const route = useRoute();
const router = useRouter();

const session = useInterpreterSession({ perspective: "guest" });
const { state } = session;

const invalid = ref(false);

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

function onDecline() {
  notify("已拒绝加入会议");
  window.setTimeout(() => router.replace("/home"), 700);
}

onMounted(() => {
  const room = typeof route.query.room === "string" ? route.query.room : "";
  if (!room) {
    invalid.value = true;
    return;
  }
  session.initGuestSession(room);
});

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer);
  session.dispose();
});
</script>

<template>
  <div class="interpreter-root interpreter-guest">
    <div class="i-toast" :class="{ show: toastShow }">
      <Icon icon="lucide:check" />
      <span>{{ toastText }}</span>
    </div>

    <div
      v-if="invalid"
      class="join-stage"
      style="flex: 1; align-items: center; justify-content: center"
    >
      <div class="i-card" style="padding: 40px 36px; text-align: center; max-width: 420px">
        <div class="summary-icon" style="background: var(--i-danger-soft); color: var(--i-danger)">
          <Icon icon="lucide:link-2-off" />
        </div>
        <h2 class="summary-h1" style="margin-top: 14px">邀请链接无效</h2>
        <p class="summary-sub" style="margin: 8px 0 20px">未找到有效的会议房间,请向邀请人重新获取链接。</p>
        <button class="i-btn i-btn-secondary" type="button" @click="router.replace('/home')">
          返回首页
        </button>
      </div>
    </div>

    <template v-else>
      <InterpreterJoinView
        v-if="state.view === 'join'"
        :session="session"
        @decline="onDecline"
      />

      <div v-else-if="state.view === 'call'" class="i-stage">
        <InterpreterCallView :session="session" />
      </div>

      <InterpreterSummaryView
        v-else-if="state.view === 'summary'"
        :session="session"
        @notify="notify"
        @restart="router.replace('/home')"
      />
    </template>
  </div>
</template>

<style lang="scss">
@use "../../components/business/interpreter/interpreter.scss";
</style>
