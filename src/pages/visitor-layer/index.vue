<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NButton, NInput } from "naive-ui";
import { motion } from "motion-v";

import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

const triggerItems = [
  { label: "停留时长", value: "18s" },
  { label: "浏览模板", value: "3 张" },
  { label: "意向评分", value: "86" },
];

const featureItems = [
  {
    icon: "mdi:radar",
    title: "智能识别访客意向",
    desc: "根据浏览路径、停留时长和功能点击自动判断触发时机。",
  },
  {
    icon: "mdi:account-convert-outline",
    title: "轻量留资浮层",
    desc: "减少打断感，优先保留手机号、微信咨询和企业账号开通入口。",
  },
  {
    icon: "mdi:chart-timeline-variant-shimmer",
    title: "转化链路追踪",
    desc: "从访客触达到试用申请，保留关键节点用于后续运营分析。",
  },
];
</script>

<template>
  <main
    class="visitor-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div class="visitor-grid-bg" aria-hidden="true"></div>
    <div class="visitor-orbit visitor-orbit-a" aria-hidden="true"></div>
    <div class="visitor-orbit visitor-orbit-b" aria-hidden="true"></div>

    <motion.section
      :initial="{ opacity: 0, y: 24 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.46 }"
      class="visitor-shell"
    >
      <section class="visitor-copy" aria-label="访客浮层介绍">
        <span class="visitor-kicker">
          <Icon icon="mdi:account-group-outline" />
          访客浮层
        </span>
        <h1>把匿名访问转成可跟进线索</h1>
        <p>
          面向企业二手车内容平台的访客引导浮层，在合适时机展示试用申请、客服咨询和企业账号开通入口。
        </p>

        <div class="visitor-metrics" aria-label="触发指标">
          <div v-for="item in triggerItems" :key="item.label">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>

        <div class="visitor-feature-list">
          <article v-for="item in featureItems" :key="item.title">
            <Icon :icon="item.icon" />
            <div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.desc }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="visitor-preview" aria-label="访客浮层预览">
        <div class="browser-frame">
          <div class="browser-top">
            <span></span>
            <span></span>
            <span></span>
            <strong>workspace.preview/car-scene</strong>
          </div>

          <div class="preview-stage">
            <img
              src="https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=82"
              alt="车辆内容生成预览"
            />
            <div class="preview-scanline" aria-hidden="true"></div>

            <aside class="lead-floating-card" aria-label="浮层示例">
              <button class="lead-close" type="button" aria-label="关闭访客浮层">
                <Icon icon="mdi:close" />
              </button>
              <span>访客专属试用</span>
              <h2>想批量生成同款车辆视觉？</h2>
              <p>留下手机号，获取 3 套企业内容模板和 1 次演示账号开通。</p>
              <NInput class="lead-input" size="large" placeholder="请输入手机号" />
              <NButton type="primary" size="large" block class="lead-submit">
                申请试用
              </NButton>
              <small>预计 10 分钟内由企业顾问联系</small>
            </aside>
          </div>
        </div>

        <div class="visitor-ops-panel" aria-label="运营配置摘要">
          <div>
            <span>触发策略</span>
            <strong>高意向访客自动展示</strong>
          </div>
          <div>
            <span>当前状态</span>
            <strong>已启用 · 转化监测中</strong>
          </div>
        </div>
      </section>
    </motion.section>
  </main>
</template>

<style scoped lang="scss">
.visitor-page {
  --visitor-bg: #eef4fb;
  --visitor-surface: rgba(255, 255, 255, 0.76);
  --visitor-surface-strong: rgba(255, 255, 255, 0.92);
  --visitor-border: rgba(148, 170, 199, 0.38);
  --visitor-border-strong: rgba(47, 124, 255, 0.34);
  --visitor-text: #10233c;
  --visitor-muted: #5c708c;
  --visitor-blue: #2f7cff;
  --visitor-cyan: #12b9d6;
  --visitor-green: #1ab981;
  --visitor-amber: #f3a72f;
  --visitor-shadow: 0 24px 80px rgba(67, 100, 136, 0.16);
  --visitor-grid-color: rgba(67, 107, 154, 0.12);
  --visitor-glow-a: rgba(47, 124, 255, 0.18);
  --visitor-glow-b: rgba(18, 185, 214, 0.18);
  --visitor-image-filter: saturate(0.96) brightness(1.02);

  position: relative;
  min-height: calc(100vh - var(--app-header-offset));
  overflow: hidden;
  padding: clamp(26px, 4vw, 58px);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(229, 239, 251, 0.82)),
    var(--visitor-bg);
  color: var(--visitor-text);
}

.visitor-page.theme-dark {
  --visitor-bg: #050b14;
  --visitor-surface: rgba(9, 18, 32, 0.72);
  --visitor-surface-strong: rgba(12, 24, 42, 0.9);
  --visitor-border: rgba(95, 136, 189, 0.28);
  --visitor-border-strong: rgba(56, 145, 255, 0.45);
  --visitor-text: #f3f8ff;
  --visitor-muted: #95a9c3;
  --visitor-shadow: 0 28px 92px rgba(0, 0, 0, 0.36);
  --visitor-grid-color: rgba(114, 161, 224, 0.12);
  --visitor-glow-a: rgba(47, 124, 255, 0.24);
  --visitor-glow-b: rgba(18, 185, 214, 0.18);
  --visitor-image-filter: saturate(1.08) brightness(0.72);

  background:
    linear-gradient(135deg, rgba(4, 10, 20, 0.96), rgba(7, 18, 34, 0.92)),
    var(--visitor-bg);
}

.visitor-grid-bg,
.visitor-orbit {
  position: absolute;
  pointer-events: none;
}

.visitor-grid-bg {
  inset: 0;
  background-image:
    linear-gradient(var(--visitor-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--visitor-grid-color) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.96), transparent 86%);
}

.visitor-orbit {
  width: 46vw;
  height: 46vw;
  min-width: 520px;
  min-height: 520px;
  border-radius: 999px;
  filter: blur(8px);
  opacity: 0.82;
}

.visitor-orbit-a {
  right: -18vw;
  top: -24vw;
  background: radial-gradient(circle, var(--visitor-glow-a), transparent 62%);
}

.visitor-orbit-b {
  left: -22vw;
  bottom: -26vw;
  background: radial-gradient(circle, var(--visitor-glow-b), transparent 64%);
}

.visitor-shell {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: calc(100vh - var(--app-header-offset) - clamp(52px, 8vw, 116px));
  grid-template-columns: minmax(360px, 0.82fr) minmax(620px, 1.18fr);
  align-items: center;
  gap: clamp(28px, 4vw, 68px);
}

.visitor-copy {
  max-width: 620px;
}

.visitor-kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 34px;
  border: 1px solid var(--visitor-border-strong);
  border-radius: 999px;
  background: color-mix(in srgb, var(--visitor-surface) 78%, transparent);
  color: var(--visitor-blue);
  padding: 0 13px;
  font-size: 14px;
  font-weight: 900;
}

.visitor-kicker .iconify {
  font-size: 18px;
}

.visitor-copy h1 {
  margin: 24px 0 0;
  color: var(--visitor-text);
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.08;
  font-weight: 950;
  letter-spacing: 0;
}

.visitor-copy > p {
  max-width: 560px;
  margin: 24px 0 0;
  color: var(--visitor-muted);
  font-size: 18px;
  line-height: 1.8;
  font-weight: 750;
}

.visitor-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 32px;
}

.visitor-metrics div {
  border: 1px solid var(--visitor-border);
  border-radius: 14px;
  background: var(--visitor-surface);
  padding: 16px;
  box-shadow: var(--visitor-shadow);
}

.visitor-metrics strong,
.visitor-metrics span {
  display: block;
}

.visitor-metrics strong {
  color: var(--visitor-text);
  font-size: 26px;
  line-height: 1;
  font-weight: 950;
}

.visitor-metrics span {
  margin-top: 8px;
  color: var(--visitor-muted);
  font-size: 13px;
  font-weight: 800;
}

.visitor-feature-list {
  display: grid;
  gap: 14px;
  margin-top: 28px;
}

.visitor-feature-list article {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  border: 1px solid var(--visitor-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--visitor-surface) 86%, transparent);
  padding: 15px;
}

.visitor-feature-list .iconify {
  display: grid;
  place-self: start;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: rgba(47, 124, 255, 0.13);
  color: var(--visitor-blue);
  padding: 10px;
}

.visitor-feature-list h2 {
  margin: 0;
  color: var(--visitor-text);
  font-size: 16px;
  font-weight: 950;
}

.visitor-feature-list p {
  margin: 7px 0 0;
  color: var(--visitor-muted);
  font-size: 13px;
  line-height: 1.65;
  font-weight: 720;
}

.visitor-preview {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.browser-frame {
  overflow: hidden;
  border: 1px solid var(--visitor-border);
  border-radius: 22px;
  background: var(--visitor-surface);
  box-shadow: var(--visitor-shadow);
  backdrop-filter: blur(20px) saturate(130%);
}

.browser-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border-bottom: 1px solid var(--visitor-border);
  padding: 0 16px;
  background: color-mix(in srgb, var(--visitor-surface-strong) 84%, transparent);
}

.browser-top span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--visitor-muted);
  opacity: 0.45;
}

.browser-top span:nth-child(1) {
  background: #ef6464;
}

.browser-top span:nth-child(2) {
  background: var(--visitor-amber);
}

.browser-top span:nth-child(3) {
  background: var(--visitor-green);
}

.browser-top strong {
  min-width: 0;
  overflow: hidden;
  margin-left: 10px;
  color: var(--visitor-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 800;
}

.preview-stage {
  position: relative;
  min-height: clamp(480px, 54vh, 640px);
  overflow: hidden;
  background: #08111f;
}

.preview-stage > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: var(--visitor-image-filter);
  object-fit: cover;
}

.preview-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(3, 11, 22, 0.38), transparent 48%, rgba(3, 11, 22, 0.52)),
    linear-gradient(180deg, transparent 42%, rgba(4, 11, 22, 0.66));
}

.theme-light .preview-stage::before {
  background:
    linear-gradient(90deg, rgba(238, 246, 255, 0.42), transparent 48%, rgba(238, 246, 255, 0.58)),
    linear-gradient(180deg, transparent 42%, rgba(235, 244, 255, 0.66));
}

.preview-scanline {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0,
      rgba(255, 255, 255, 0.08) 1px,
      transparent 1px,
      transparent 7px
    );
  opacity: 0.24;
}

.lead-floating-card {
  position: absolute;
  right: clamp(22px, 4vw, 54px);
  top: 50%;
  width: min(390px, calc(100% - 44px));
  transform: translateY(-50%);
  border: 1px solid var(--visitor-border-strong);
  border-radius: 20px;
  background: color-mix(in srgb, var(--visitor-surface-strong) 88%, transparent);
  padding: 24px;
  box-shadow:
    0 24px 80px rgba(3, 12, 25, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(128%);
}

.lead-close {
  position: absolute;
  right: 14px;
  top: 14px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: rgba(127, 151, 179, 0.14);
  color: var(--visitor-muted);
  cursor: pointer;
}

.lead-floating-card > span {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  background: rgba(26, 185, 129, 0.14);
  color: var(--visitor-green);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 900;
}

.lead-floating-card h2 {
  margin: 18px 0 0;
  color: var(--visitor-text);
  font-size: 25px;
  line-height: 1.28;
  font-weight: 950;
}

.lead-floating-card p {
  margin: 12px 0 0;
  color: var(--visitor-muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 760;
}

.lead-input {
  margin-top: 20px;
  --n-height: 44px !important;
  --n-border-radius: 9px !important;
  --n-color: color-mix(in srgb, var(--visitor-surface) 82%, transparent) !important;
  --n-color-focus: color-mix(in srgb, var(--visitor-surface) 92%, transparent) !important;
  --n-border: 1px solid var(--visitor-border) !important;
  --n-border-hover: 1px solid var(--visitor-border-strong) !important;
  --n-border-focus: 1px solid var(--visitor-blue) !important;
  --n-box-shadow-focus: 0 0 0 3px rgba(47, 124, 255, 0.14) !important;
  --n-text-color: var(--visitor-text) !important;
  --n-placeholder-color: var(--visitor-muted) !important;
  --n-caret-color: var(--visitor-blue) !important;
}

.lead-submit {
  --n-color: var(--visitor-blue) !important;
  --n-color-hover: #448cff !important;
  --n-color-pressed: #1f66d8 !important;
  --n-color-focus: var(--visitor-blue) !important;
  --n-border: 1px solid var(--visitor-blue) !important;
  --n-border-hover: 1px solid #448cff !important;
  --n-border-pressed: 1px solid #1f66d8 !important;
  --n-border-focus: 1px solid var(--visitor-blue) !important;
  --n-text-color: #ffffff !important;
  --n-text-color-hover: #ffffff !important;
  --n-text-color-pressed: #ffffff !important;
  --n-text-color-focus: #ffffff !important;

  margin-top: 12px;
  height: 44px !important;
  border-radius: 9px !important;
  font-weight: 950 !important;
  box-shadow: 0 14px 32px rgba(47, 124, 255, 0.25);
}

.lead-floating-card small {
  display: block;
  margin-top: 12px;
  color: var(--visitor-muted);
  text-align: center;
  font-size: 12px;
  font-weight: 760;
}

.visitor-ops-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.visitor-ops-panel > div {
  border: 1px solid var(--visitor-border);
  border-radius: 16px;
  background: var(--visitor-surface);
  padding: 16px;
  box-shadow: var(--visitor-shadow);
}

.visitor-ops-panel span,
.visitor-ops-panel strong {
  display: block;
}

.visitor-ops-panel span {
  color: var(--visitor-muted);
  font-size: 13px;
  font-weight: 800;
}

.visitor-ops-panel strong {
  margin-top: 8px;
  color: var(--visitor-text);
  font-size: 16px;
  font-weight: 950;
}

@media (max-width: 1320px) {
  .visitor-shell {
    grid-template-columns: minmax(340px, 0.72fr) minmax(560px, 1fr);
    gap: 34px;
  }

  .lead-floating-card {
    right: 28px;
  }
}

@media (max-width: 1080px) {
  .visitor-page {
    overflow-y: auto;
  }

  .visitor-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .visitor-copy {
    max-width: 820px;
  }
}
</style>
