<script setup lang="ts">
import { Icon } from "@iconify/vue";

import {
  INTERPRETER_LANG_OPTIONS,
  INTERPRETER_LANGS,
} from "@/constants/interpreter";
import type { InterpreterSession } from "@/composables/useInterpreterSession";

const props = defineProps<{ session: InterpreterSession }>();
const emit = defineEmits<{ (e: "notify", text: string): void }>();

const { state } = props.session;

function onCreate() {
  if (!state.isMember) {
    emit("notify", "请升级套餐后发起会议");
    return;
  }
  props.session.createMeeting();
}
</script>

<template>
  <div class="setup-hero">
    <!-- 左侧叙事 -->
    <div class="setup-intro">
      <div class="setup-kicker">
        <span class="setup-kicker-dot" />
        营销工具 · 同声传译
      </div>
      <h1 class="setup-h1">跨越语言的<br /><span class="accent">视频洽谈室</span></h1>
      <p class="setup-sub">
        为车新新商家与海外买家打造的多语言实时视频洽谈空间。
        双方各用母语视频通话,模型实时识别并翻译,把中文变成英文,把英文变回中文。
      </p>
      <ul class="setup-features">
        <li>
          <span class="icon-circle"><Icon icon="lucide:zap" /></span>
          <span><strong>3 秒生成专属链接</strong> · 对方浏览器点开即入会,无需下载 App</span>
        </li>
        <li>
          <span class="icon-circle"><Icon icon="lucide:globe" /></span>
          <span><strong>多种语言双向互译</strong> · 中 / 英 / 日 / 韩 / 西 / 法 / 德 等主流商务语种全覆盖</span>
        </li>
        <li>
          <span class="icon-circle"><Icon icon="lucide:file-text" /></span>
          <span><strong>自动双语字幕记录</strong> · 通话结束即生成文字归档</span>
        </li>
      </ul>
    </div>

    <!-- 右侧配置卡片 -->
    <div class="i-card setup-card">
      <div class="setup-card-head">
        <div class="setup-card-title">
          <span class="icon-circle"><Icon icon="lucide:settings-2" /></span>
          发起会议
        </div>
        <div class="identity-toggle">
          <button
            type="button"
            class="member"
            :class="{ active: state.isMember }"
            @click="state.isMember = true"
          >
            <span class="dot" />商务会员
          </button>
          <button
            type="button"
            class="preview"
            :class="{ active: !state.isMember }"
            @click="state.isMember = false"
          >
            <span class="dot" />预览版
          </button>
        </div>
      </div>

      <div v-if="!state.isMember" class="identity-banner">
        <Icon icon="lucide:lock" />
        <span>同声传译为 <strong>商务会员专享功能</strong> · 请升级套餐</span>
      </div>

      <div class="i-field">
        <div class="i-field-label">
          <Icon icon="lucide:message-square" />
          会议主题 <span style="color: var(--i-text-tertiary); font-weight: 400">(对方可见)</span>
        </div>
        <input
          v-model="state.topic"
          class="i-input"
          type="text"
          placeholder="例:2024款 Model C 海外渠道洽谈"
        />
      </div>

      <div class="avatar-row">
        <div
          class="i-avatar"
          style="width: 44px; height: 44px; font-size: 14px"
          :style="{ background: props.session.gradientOf(state.host.color) }"
        >
          {{ state.host.initial }}
        </div>
        <div style="flex: 1">
          <div class="avatar-row-name">
            {{ state.host.name }} ·
            <span style="color: var(--i-text-tertiary); font-weight: 400">商务会员</span>
          </div>
          <div class="avatar-row-sub">已认证 · 车新新 ID 8001</div>
        </div>
        <span class="i-badge i-badge-accent">企业版</span>
      </div>

      <div class="i-form-grid">
        <div class="i-field">
          <div class="i-field-label"><Icon icon="lucide:mic" />我使用的语言</div>
          <select v-model="state.myLang" class="i-select">
            <option v-for="code in INTERPRETER_LANG_OPTIONS" :key="code" :value="code">
              {{ INTERPRETER_LANGS[code].name }}
            </option>
          </select>
        </div>
        <div class="i-field">
          <div class="i-field-label"><Icon icon="lucide:users" />对方使用的语言</div>
          <select v-model="state.theirLang" class="i-select">
            <option v-for="code in INTERPRETER_LANG_OPTIONS" :key="code" :value="code">
              {{ INTERPRETER_LANGS[code].name }}
            </option>
          </select>
        </div>
      </div>

      <div class="setup-actions">
        <button
          class="i-btn i-btn-secondary"
          type="button"
          @click="emit('notify', '历史会议演示中')"
        >
          <Icon icon="lucide:history" />历史会议
        </button>
        <button
          class="i-btn i-btn-primary"
          type="button"
          style="flex: 1.4"
          :disabled="!state.isMember"
          @click="onCreate"
        >
          <Icon :icon="state.isMember ? 'lucide:video' : 'lucide:lock'" />
          {{ state.isMember ? "创建会议" : "升级解锁" }}
        </button>
      </div>
    </div>
  </div>
</template>
