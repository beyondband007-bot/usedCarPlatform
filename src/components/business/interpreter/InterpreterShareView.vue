<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import type { InterpreterSession } from "@/composables/useInterpreterSession";

const props = defineProps<{
  session: InterpreterSession;
  canMinimize?: boolean;
}>();
const emit = defineEmits<{
  (e: "notify", text: string): void;
  (e: "minimize"): void;
}>();

const { state } = props.session;

const timerText = computed(() =>
  state.shareExpired ? "已过期" : props.session.fmtTimer(state.shareRemaining),
);
const guestShort = computed(() => props.session.langInfo(state.theirLang).short);

async function onInvite() {
  const url = await props.session.copyInvite();
  emit("notify", `邀请链接已复制 · ${url}`);
}

function onSimulate() {
  props.session.openGuestTab();
  emit("notify", '已在新标签打开"对方加入"页,加入后本页自动进入通话');
}
</script>

<template>
  <div class="share-stage">
    <div class="share-meta">
      <span class="label">ROOM</span>
      <span>{{ state.roomId || "————" }}</span>
    </div>

    <div class="share-top-actions">
      <button class="share-icon-btn" type="button" title="邀请其他人" @click="onInvite">
        <Icon icon="lucide:user-plus" width="16" height="16" />
      </button>
      <button
        v-if="props.canMinimize"
        class="share-icon-btn"
        type="button"
        title="最小化到悬浮窗"
        @click="emit('minimize')"
      >
        <Icon icon="lucide:picture-in-picture-2" width="16" height="16" />
      </button>
      <button
        class="share-icon-btn"
        type="button"
        title="取消会议"
        @click="props.session.cancelShare()"
      >
        <Icon icon="lucide:x" width="16" height="16" />
      </button>
    </div>

    <div class="share-content">
      <div class="share-avatar-stage">
        <div class="share-avatar-ring" />
        <div class="share-avatar-ring r2" />
        <div class="share-avatar-ring r3" />
        <div class="share-avatar" :style="{ background: props.session.gradientOf(state.guest.color) }">
          {{ state.guest.initial }}
        </div>
      </div>

      <h2 class="share-guest-name">{{ state.guest.name || "等待加入" }}</h2>
      <div class="share-guest-sub">
        <span class="lang-chip">
          <Icon icon="lucide:languages" />中 ⇄ {{ guestShort }}
        </span>
        <span class="lang-chip muted"> <Icon icon="lucide:video" />视频通话 </span>
      </div>
      <div class="share-call-type">
        <Icon icon="lucide:lock" />端到端加密 · 工作台会话
      </div>

      <div class="share-waiting">
        <div class="share-dots"><span /><span /><span /></div>
        <div class="share-status-text">
          等待 <strong>{{ state.guest.name || "对方" }}</strong> 接受邀请…
        </div>
      </div>
    </div>

    <div class="share-actions-row">
      <div class="share-actions-primary">
        <button class="share-action-circle mini" type="button" title="模拟对方接听" @click="onSimulate">
          <Icon icon="lucide:user-round" width="22" height="22" />
          <span class="share-action-label">模拟接听</span>
        </button>
        <button
          class="share-action-circle hangup"
          type="button"
          title="取消会议"
          @click="props.session.cancelShare()"
        >
          <Icon icon="lucide:phone-off" width="26" height="26" />
          <span class="share-action-label" style="color: rgba(255, 255, 255, 0.95)">取消</span>
        </button>
        <button class="share-action-circle mini" type="button" title="邀请其他人" @click="onInvite">
          <Icon icon="lucide:share-2" width="22" height="22" />
          <span class="share-action-label">邀请</span>
        </button>
      </div>
      <div class="share-foot">
        <span class="live-dot" />链接有效 · {{ timerText }}
      </div>
    </div>
  </div>
</template>
