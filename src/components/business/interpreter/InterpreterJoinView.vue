<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import {
  INTERPRETER_GUEST_PRESETS,
  INTERPRETER_LANG_OPTIONS,
  INTERPRETER_LANGS,
} from "@/constants/interpreter";
import type { InterpreterSession } from "@/composables/useInterpreterSession";

const props = defineProps<{ session: InterpreterSession }>();
const emit = defineEmits<{ (e: "decline"): void }>();

const { state } = props.session;

const inviterLangShort = computed(() => props.session.langInfo(state.theirLang).short);
const targetLangName = computed(() => props.session.langInfo(state.host.lang).name);
</script>

<template>
  <div class="join-stage">
    <div class="i-card join-card">
      <div class="join-banner">
        <div class="join-banner-kicker">受邀加入</div>
        <div class="join-banner-body">
          <div
            class="i-avatar"
            style="width: 72px; height: 72px; font-size: 22px; border: 2px solid var(--i-border)"
            :style="{ background: props.session.gradientOf(state.host.color) }"
          >
            {{ state.host.initial }}
          </div>
          <div>
            <div class="join-banner-name">{{ state.host.name }}</div>
            <div class="join-banner-sub">
              邀请你加入 · <strong>{{ state.topic || "面谈会议" }}</strong>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap">
              <span class="i-badge i-badge-accent">
                <Icon icon="lucide:languages" />中 ⇄ {{ inviterLangShort }}
              </span>
              <span class="i-badge i-badge-success">
                <Icon icon="lucide:shield-check" />端到端加密
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="join-body">
        <div class="i-field">
          <div class="i-field-label">
            <Icon icon="lucide:user" />你的昵称
            <span style="color: var(--i-text-tertiary); font-weight: 400">(对方可见)</span>
          </div>
          <input
            :value="state.guest.name"
            class="i-input"
            type="text"
            placeholder="输入你的名字"
            @input="props.session.setGuestName(($event.target as HTMLInputElement).value)"
          />
          <div class="guest-presets">
            <button
              v-for="preset in INTERPRETER_GUEST_PRESETS"
              :key="preset.name"
              type="button"
              class="guest-chip"
              :class="{ active: state.guest.name === preset.name }"
              @click="props.session.selectGuestPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <div class="i-field">
          <div class="i-field-label"><Icon icon="lucide:mic" />我使用的语言</div>
          <select v-model="state.guest.lang" class="i-select">
            <option v-for="code in INTERPRETER_LANG_OPTIONS" :key="code" :value="code">
              {{ INTERPRETER_LANGS[code].name }}
            </option>
          </select>
          <div class="i-field-hint">
            你讲话时,对方将看到 <strong>{{ targetLangName }}</strong> 翻译字幕
          </div>
        </div>

        <div class="join-privacy">
          <div class="join-privacy-icon"><Icon icon="lucide:lock" width="14" height="14" /></div>
          <div class="join-privacy-text">
            <strong>免登录加入</strong> · 通话仅本机处理,<strong>不会存储到服务器</strong> · 你可随时拒绝
          </div>
        </div>

        <div class="join-cta">
          <button
            class="i-btn i-btn-secondary"
            type="button"
            style="flex: 0.6"
            @click="emit('decline')"
          >
            <Icon icon="lucide:x" width="14" height="14" />拒绝
          </button>
          <button
            class="i-btn i-btn-primary"
            type="button"
            style="flex: 1.4"
            @click="props.session.acceptInvite()"
          >
            <Icon icon="lucide:phone-incoming" />接受邀请 · 加入会议
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
