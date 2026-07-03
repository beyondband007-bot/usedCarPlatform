<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import { INTERPRETER_SCRIPT } from "@/constants/interpreter";
import type { InterpreterSession } from "@/composables/useInterpreterSession";
import type { InterpreterTranscriptEntry } from "@/types/interpreter";

const props = defineProps<{ session: InterpreterSession }>();
const emit = defineEmits<{ (e: "notify", text: string): void; (e: "restart"): void }>();

const { state } = props.session;
const summary = computed(() => props.session.summary.value);

const hostLangName = computed(() => props.session.langInfo(state.host.lang).name);
const guestLangName = computed(() => props.session.langInfo(state.guest.lang).name);

const rows = computed<InterpreterTranscriptEntry[]>(() =>
  state.transcript.length
    ? state.transcript
    : INTERPRETER_SCRIPT.slice(0, 12).map((line) => ({
        time: props.session.fmtTimer(line.time),
        who: line.who,
        sideLabel: props.session.partyOf(line.who).name,
        zh: line.zh,
        en: line.en,
      })),
);

function onExport() {
  props.session.exportTranscript();
  emit("notify", "字幕记录已下载");
}
async function onShareAgain() {
  const url = await props.session.copyInvite();
  emit("notify", `链接已复制 · ${url}`);
}
</script>

<template>
  <div class="summary-stage">
    <div class="summary-head">
      <div class="summary-icon"><Icon icon="lucide:check" /></div>
      <h2 class="summary-h1">通话已结束</h2>
      <p class="summary-sub">
        {{ state.endedByRemote ? "对方已挂断 · " : "" }}已自动生成双语字幕记录 · 可在工作台历史中查看
      </p>
    </div>

    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-label"><Icon icon="lucide:clock" />通话时长</div>
        <div class="stat-value">{{ summary.durationText }}<span class="unit">mm:ss</span></div>
        <div class="stat-sub">{{ summary.dateText }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><Icon icon="lucide:languages" />语种组合</div>
        <div class="stat-value" style="margin-bottom: 8px">
          <span class="lang-pair">{{ summary.langA }} ⇄ {{ summary.langB }}</span>
        </div>
        <div class="stat-sub">{{ summary.participants }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><Icon icon="lucide:message-square" />字幕条数</div>
        <div class="stat-value">{{ summary.lineCount }}<span class="unit">条</span></div>
        <div class="stat-sub">已识别 · 已翻译</div>
      </div>
    </div>

    <div class="transcript-card">
      <div class="transcript-head">
        <h3><Icon icon="lucide:file-text" />双语字幕记录</h3>
        <span class="i-badge" style="background: var(--i-bg-elevated); color: var(--i-text-secondary)">
          本地存储 · 不上传
        </span>
      </div>
      <div class="transcript-body">
        <div v-for="(t, idx) in rows" :key="idx" class="tr-line" :class="{ guest: t.who === 'guest' }">
          <div class="time">{{ t.time }}</div>
          <div>
            <div class="who">{{ t.sideLabel }}</div>
            <div>{{ hostLangName }}: {{ t.zh }}</div>
            <div class="tr-orig">{{ guestLangName }}: {{ t.en }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="summary-actions">
      <button class="i-btn i-btn-secondary" type="button" @click="onExport">
        <Icon icon="lucide:download" />导出字幕 (.txt)
      </button>
      <button class="i-btn i-btn-secondary" type="button" @click="onShareAgain">
        <Icon icon="lucide:share-2" />分享给同事
      </button>
      <button class="i-btn i-btn-primary" type="button" @click="emit('restart')">
        <Icon icon="lucide:rotate-cw" />再来一次
      </button>
    </div>
  </div>
</template>
