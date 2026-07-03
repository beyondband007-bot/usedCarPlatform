<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import type { InterpreterSession } from "@/composables/useInterpreterSession";

const props = defineProps<{
  session: InterpreterSession;
  canMinimize?: boolean;
}>();
const emit = defineEmits<{ (e: "minimize"): void }>();

const { state } = props.session;

// ---- 本地 UI 状态 ----
const volOpen = ref(false);
const hangupOpen = ref(false);
const manualSelfText = ref("");
const manualOtherText = ref("");
const manualSelfOutput = ref("");
const manualOtherOutput = ref("");
const bodyRef = ref<HTMLElement | null>(null);
const localVideoRef = ref<HTMLElement | null>(null);
const remoteVideoRef = ref<HTMLElement | null>(null);
const userScrolledUp = ref(false);
const mediaMounting = ref(false);
const mediaMounted = ref(false);
const mediaError = ref("");

// ---- 派生 ----
const timerText = computed(() => props.session.fmtTimer(state.callElapsed));
const localShort = computed(() => props.session.langInfo(props.session.localParty.value.lang).short);
const remoteShort = computed(() => props.session.langInfo(props.session.remoteParty.value.lang).short);
const localName = computed(() => props.session.localParty.value.name);
const remoteName = computed(() => props.session.remoteParty.value.name);
const remoteLangName = computed(() => props.session.langInfo(props.session.remoteParty.value.lang).name);
const mediaStatusText = computed(() => {
  if (mediaError.value) return mediaError.value;
  if (mediaMounting.value) return "正在连接摄像头与麦克风...";
  if (mediaMounted.value) return "音视频已接入";
  return "等待媒体设备接入";
});

function resolveMediaPreflightError() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "当前浏览器不支持摄像头/麦克风能力，请使用最新版 Chrome、Edge 或 Safari。";
  }
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    return "浏览器要求在 HTTPS 环境下开启摄像头和麦克风。";
  }
  return "";
}

async function mountMedia() {
  if (mediaMounted.value || mediaMounting.value) return;
  const localVideoEl = localVideoRef.value;
  const remoteVideoEl = remoteVideoRef.value;
  if (!localVideoEl || !remoteVideoEl) return;

  mediaError.value = props.session.driver.kind === "tencent" ? resolveMediaPreflightError() : "";
  if (mediaError.value) return;

  mediaMounting.value = true;
  try {
    await props.session.attachMedia({ localVideoEl, remoteVideoEl });
    mediaMounted.value = true;
  } catch (error) {
    mediaError.value = `音视频接入失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    mediaMounting.value = false;
  }
}

// ---- 字幕滚动跟随 ----
function scrollToBottom() {
  const el = bodyRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}
function onBodyScroll() {
  const el = bodyRef.value;
  if (!el) return;
  userScrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > 60;
}
function jumpLatest() {
  userScrolledUp.value = false;
  scrollToBottom();
}
watch(
  () => [state.bubbles.length, state.typingWho] as const,
  async () => {
    await nextTick();
    if (!userScrolledUp.value) scrollToBottom();
  },
);

// ---- 手动翻译 ----
async function submitManual(side: "self" | "other") {
  const text = side === "self" ? manualSelfText.value : manualOtherText.value;
  if (!text.trim()) return;
  if (side === "self") manualSelfText.value = "";
  else manualOtherText.value = "";
  const translated = await props.session.translateManual(side, text);
  const tgtShort = side === "self" ? remoteShort.value : localShort.value;
  const tgtName =
    side === "self"
      ? props.session.langInfo(props.session.remoteParty.value.lang).name
      : props.session.langInfo(props.session.localParty.value.lang).name;
  const out = translated
    ? `<strong>${tgtShort}:</strong> ${translated}`
    : `<em>[翻译中...] 未匹配到 ${tgtName} 释义</em>`;
  if (side === "self") manualSelfOutput.value = out;
  else manualOtherOutput.value = out;
}

function confirmHangup() {
  hangupOpen.value = false;
  props.session.hangup();
}

// ---- 音量弹层：点击外部 / ESC 关闭 ----
function onDocClick() {
  if (volOpen.value) volOpen.value = false;
}
function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (volOpen.value) volOpen.value = false;
  else if (hangupOpen.value) hangupOpen.value = false;
}
onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);
  void nextTick(mountMedia);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKeydown);
});

watch(
  () => state.lastError,
  (error) => {
    if (error?.scope === "media") mediaError.value = error.message;
  },
);
</script>

<template>
  <div class="call-shell">
    <!-- 顶栏 -->
    <div class="call-topbar">
      <div class="call-room-tag">
        <span class="live-dot" />
        <span>ROOM · {{ state.roomId || "————" }}</span>
        <span style="opacity: 0.4">·</span>
        <span class="name">{{ localName }}</span>
      </div>
      <div class="call-timer">{{ timerText }}</div>
      <div class="call-mode-tabs">
        <button
          :class="{ active: state.callMode === 'auto' }"
          @click="props.session.setCallMode('auto')"
        >
          自动剧本
        </button>
        <button
          :class="{ active: state.callMode === 'manual' }"
          @click="props.session.setCallMode('manual')"
        >
          手动对话
        </button>
      </div>
      <div class="call-sub-toggle">
        <span>字幕</span>
        <span
          class="toggle-pill"
          :class="{ off: state.subtitleMode === 'single' }"
          @click="props.session.setSubtitleMode(state.subtitleMode === 'double' ? 'single' : 'double')"
        />
        <span style="font-size: 11px">{{ state.subtitleMode === "double" ? "双行" : "单行" }}</span>
      </div>
      <button
        v-if="props.canMinimize"
        class="call-exit"
        type="button"
        title="最小化到悬浮窗"
        @click="emit('minimize')"
      >
        <Icon icon="lucide:picture-in-picture-2" />最小化
      </button>
      <button class="call-exit" type="button" @click="hangupOpen = true">
        <Icon icon="lucide:x" />退出
      </button>
    </div>

    <!-- 主舞台 -->
    <div class="call-main">
      <div class="signal-bars"><span /><span /><span /><span /></div>

      <div class="main-video-mock">
        <div ref="remoteVideoRef" class="remote-video-layer" aria-label="远端视频画面" />
        <div class="main-video-fallback">
          <div
            class="main-video-avatar"
            :style="{ background: props.session.gradientOf(props.session.remoteParty.value.color) }"
          >
            {{ props.session.remoteParty.value.initial }}
          </div>
          <div class="video-pulse" />
          <div class="main-video-name">{{ remoteName }}</div>
          <div class="main-video-lang">{{ remoteLangName }} · 受邀方</div>
        </div>
      </div>

      <div v-if="mediaError || mediaMounting" class="media-status-card" :class="{ error: mediaError }">
        <Icon :icon="mediaError ? 'lucide:triangle-alert' : 'lucide:loader-2'" />
        <span>{{ mediaStatusText }}</span>
      </div>

      <div class="call-center-sub" :class="{ hide: !state.subOn }">
        <div class="line">{{ state.centerLine }}</div>
      </div>

      <div class="call-pip">
        <div ref="localVideoRef" class="local-video-layer" aria-label="本地视频预览" />
        <div
          class="pip-mock-avatar"
          :class="{ show: !state.camOn }"
          :style="{ background: props.session.gradientOf(props.session.localParty.value.color) }"
        >
          {{ props.session.localParty.value.initial }}
        </div>
        <div class="pip-label">
          我 · {{ localName }}
          <span v-if="!state.camOn"> · 摄像头已关</span>
        </div>
      </div>

      <button
        v-if="!state.sidebarOn"
        class="sidebar-reopen"
        type="button"
        @click="props.session.toggleSidebar(true)"
      >
        <Icon icon="lucide:panel-right-open" width="16" height="16" />
        <span>字幕记录</span>
        <span class="reopen-dot" />
      </button>
    </div>

    <!-- 字幕侧栏 -->
    <div class="call-sidebar" :class="{ collapsed: !state.sidebarOn }">
      <div class="sidebar-head">
        <div class="sidebar-title">
          <Icon icon="lucide:captions" />
          实时字幕
          <span class="i-badge i-badge-accent">{{ props.session.langBadge.value }}</span>
        </div>
        <button class="sidebar-collapse" title="收起字幕" @click="props.session.toggleSidebar(false)">
          <Icon icon="lucide:panel-right-close" width="14" height="14" />
        </button>
      </div>

      <!-- 自动剧本：气泡列表 -->
      <div v-show="state.callMode === 'auto'" ref="bodyRef" class="sidebar-body" @scroll="onBodyScroll">
        <div
          v-for="b in state.bubbles"
          :key="b.id"
          class="bubble"
          :class="{ local: props.session.bubbleIsLocal(b) }"
        >
          <div class="av" :style="{ background: props.session.gradientOf(props.session.partyOf(b.who).color) }">
            {{ props.session.partyOf(b.who).initial }}
          </div>
          <div>
            <div class="bubble-body">
              <div class="bubble-trans">{{ props.session.bubbleMain(b) }}</div>
              <div v-if="state.subtitleMode === 'double'" class="bubble-orig">
                {{ props.session.bubbleSub(b) }}
              </div>
            </div>
            <div class="bubble-meta">{{ b.time }} · {{ props.session.partyOf(b.who).name }}</div>
          </div>
        </div>

        <!-- 打字机 -->
        <div
          v-if="state.typingWho"
          class="bubble typing"
          :class="{ local: state.typingWho === props.session.localSpeaker }"
        >
          <div class="av" :style="{ background: props.session.gradientOf(props.session.partyOf(state.typingWho).color) }">
            {{ props.session.partyOf(state.typingWho).initial }}
          </div>
          <div class="bubble-body"><span class="dot" /><span class="dot" /><span class="dot" /></div>
        </div>

        <button v-if="userScrolledUp" class="jump-to-latest" @click="jumpLatest">
          <Icon icon="lucide:arrow-down" />回到最新
        </button>
      </div>

      <!-- 手动对话 -->
      <div v-show="state.callMode === 'manual'" class="manual-panel">
        <div class="manual-side">
          <div class="manual-side-label">
            <span>我说 ({{ localShort }})</span>
            <span style="color: var(--i-text-tertiary)">回车翻译</span>
          </div>
          <textarea
            v-model="manualSelfText"
            placeholder="输入你的话... 例如:这台 2024款 Model C 有现货吗?"
            @keydown.enter.exact.prevent="submitManual('self')"
          />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="manual-output" v-html="manualSelfOutput || '对方将看到翻译'" />
        </div>
        <div class="manual-arrow"><Icon icon="lucide:arrow-down" width="14" height="14" /></div>
        <div class="manual-side other">
          <div class="manual-side-label">
            <span>他说 ({{ remoteShort }})</span>
            <span style="color: var(--i-text-tertiary)">回车翻译</span>
          </div>
          <textarea
            v-model="manualOtherText"
            placeholder="对方讲话... 例如:Yes, available. The price is $32,800."
            @keydown.enter.exact.prevent="submitManual('other')"
          />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="manual-output other" v-html="manualOtherOutput || '我将看到翻译'" />
        </div>
      </div>
    </div>

    <!-- 控制条 -->
    <div class="call-control">
      <button class="ctrl-btn" :class="{ off: !state.micOn }" title="麦克风" @click="props.session.toggleMic()">
        <svg v-if="state.micOn" class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
        </svg>
        <svg v-else class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
          <path d="M17.3 17.3A7 7 0 0 1 5 12v-2M19 10v2c0 .75-.12 1.47-.34 2.14M12 19v3M8 22h8M3 3l18 18" />
        </svg>
        <span class="ctrl-label">
          <strong>{{ state.micOn ? "麦克风" : "已静音" }}</strong>
          <small>{{ state.micOn ? "正在收音" : "点击开启" }}</small>
        </span>
      </button>
      <button class="ctrl-btn" :class="{ off: !state.camOn }" title="摄像头" @click="props.session.toggleCam()">
        <svg v-if="state.camOn" class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="6" width="14" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3z" />
        </svg>
        <svg v-else class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.7 6H14a2 2 0 0 1 2 2v3.3l5-3V17l-4.1-2.5M14 18H4a2 2 0 0 1-2-2V8c0-.6.27-1.15.7-1.52M3 3l18 18" />
        </svg>
        <span class="ctrl-label">
          <strong>{{ state.camOn ? "摄像头" : "已关闭" }}</strong>
          <small>{{ state.camOn ? "画面已开启" : "点击开启" }}</small>
        </span>
      </button>
      <button class="ctrl-btn" :class="{ off: !state.subOn }" title="主屏字幕" @click="props.session.toggleCenterSub()">
        <svg class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M7 10h3M14 10h3M7 14h4M15 14h2" />
        </svg>
        <span class="ctrl-label">
          <strong>{{ state.subOn ? "主屏字幕" : "字幕已关" }}</strong>
          <small>{{ state.subOn ? "显示译文" : "点击显示" }}</small>
        </span>
      </button>
      <button class="ctrl-btn lang" :class="{ off: !state.sidebarOn }" title="字幕记录" @click="props.session.toggleSidebar()">
        <svg class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
        </svg>
        <span class="ctrl-label">
          <strong>{{ state.sidebarOn ? "字幕记录" : "已收起" }}</strong>
          <small>{{ state.sidebarOn ? "实时双语" : "点击展开" }}</small>
        </span>
      </button>

      <div style="position: relative">
        <button
          class="ctrl-btn"
          :class="{ active: volOpen }"
          title="音量"
          @click.stop="volOpen = !volOpen"
        >
          <svg class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
          </svg>
          <span class="ctrl-label">
            <strong>音量</strong>
            <small>原声与译音</small>
          </span>
        </button>
        <div v-if="volOpen" class="vol-popover" @click.stop>
          <div class="vol-popover-title">音频音量</div>
          <div class="vol-row">
            <Icon icon="lucide:mic" />
            <span class="vol-label">原声</span>
            <input v-model.number="state.volOrig" type="range" min="0" max="100" class="vol-slider" />
            <span class="vol-val">{{ state.volOrig }}</span>
          </div>
          <div class="vol-row">
            <Icon icon="lucide:globe" style="color: var(--i-accent)" />
            <span class="vol-label">翻译</span>
            <input v-model.number="state.volTrans" type="range" min="0" max="100" class="vol-slider vol-trans" />
            <span class="vol-val">{{ state.volTrans }}</span>
          </div>
          <div class="vol-foot">
            <Icon icon="lucide:info" />
            <span>原声为对方人声,翻译为 AI 朗读译文</span>
          </div>
        </div>
      </div>

      <button class="ctrl-btn hangup" title="挂断" @click="hangupOpen = true">
        <svg class="ctrl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.68 13.31a16 16 0 0 0 3.01 3.01l2.26-2.26a2 2 0 0 1 2.11-.46l2.72 1.09a2 2 0 0 1 1.25 1.86V20a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3.45a2 2 0 0 1 1.86 1.25l1.09 2.72a2 2 0 0 1-.45 2.11L7.69 10.34M3 3l18 18" />
        </svg>
        <span class="ctrl-label">
          <strong>结束通话</strong>
          <small>保存字幕记录</small>
        </span>
      </button>
    </div>

    <!-- 挂断确认 -->
    <div v-if="hangupOpen" class="i-modal-mask" @click.self="hangupOpen = false">
      <div class="i-modal">
        <div class="i-modal-icon"><Icon icon="lucide:phone-off" /></div>
        <div class="i-modal-title">确认挂断此次会议?</div>
        <div class="i-modal-desc">
          当前通话时长 <strong>{{ timerText }}</strong> · 字幕记录已保留
        </div>
        <div class="i-modal-actions">
          <button class="i-btn i-btn-secondary" type="button" @click="hangupOpen = false">继续通话</button>
          <button class="i-btn i-btn-danger" type="button" @click="confirmHangup">确认挂断</button>
        </div>
      </div>
    </div>
  </div>
</template>
