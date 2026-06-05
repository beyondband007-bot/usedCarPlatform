<script setup lang="ts">
import { computed } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import LoginPanel from "@/components/business/account/LoginPanel.vue";
import {
  enterpriseLoginFeatures,
  enterpriseLoginHeroImageDark,
  enterpriseLoginHeroImageLight,
} from "@/constants/enterprise-login";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const isDark = computed(() => appStore.isDarkMode);
const enterpriseLoginHeroImage = computed(() =>
  isDark.value ? enterpriseLoginHeroImageDark : enterpriseLoginHeroImageLight,
);
</script>

<template>
  <main
    class="enterprise-login-page"
    :class="isDark ? 'theme-dark' : 'theme-light'"
    aria-label="企业账号登录"
  >
    <div class="enterprise-login-bg" aria-hidden="true">
      <PreloadImage
        class="enterprise-login-bg-image"
        :src="enterpriseLoginHeroImage"
        alt=""
        loading="eager"
        fetchpriority="high"
        decoding="async"
        object-position="left center"
      />
    </div>
    <div class="enterprise-login-overlay" aria-hidden="true"></div>

    <div class="enterprise-login-shell">
      <section class="enterprise-login-copy" aria-label="企业登录介绍">
        <h1 class="enterprise-login-title">每一辆车，都值得被精心呈现</h1>
        <p class="enterprise-login-subtitle">AI驱动的汽车电商内容生产平台</p>

        <ul class="enterprise-login-features">
          <li v-for="item in enterpriseLoginFeatures" :key="item.title">
            <span class="enterprise-login-feature-icon" aria-hidden="true">
              <img
                class="enterprise-login-feature-icon-image"
                :src="item.icon"
                alt=""
                width="40"
                height="40"
                decoding="async"
                draggable="false"
              />
            </span>
            <span class="enterprise-login-feature-text">
              <b>{{ item.title }}</b>
              <small>{{ item.description }}</small>
            </span>
          </li>
        </ul>
      </section>

      <section class="enterprise-login-panel" aria-label="企业账号登录表单">
        <LoginPanel :is-dark="isDark" />
      </section>
    </div>
  </main>
</template>

<style scoped lang="scss">
.enterprise-login-page {
  --login-gold: #efc24c;
  --login-gold-strong: #f4d36a;
  --login-text: #ffffff;
  --login-muted: rgba(255, 255, 255, 0.72);
  --login-feature-bg: rgba(8, 8, 8, 0.42);
  --login-feature-border: rgba(255, 255, 255, 0.1);
  --login-feature-icon-bg: rgba(239, 194, 76, 0.14);
  --login-shell-top-gap: calc(
    (100dvh - var(--app-header-offset, 72px)) * 0.2
  );
  --login-overlay: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.62) 0%,
    rgba(0, 0, 0, 0.34) 34%,
    rgba(0, 0, 0, 0.12) 58%,
    rgba(0, 0, 0, 0.04) 100%
  );

  position: relative;
  display: flow-root;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: calc(100dvh - var(--app-header-offset, 72px));
  overflow: hidden;
  padding: 0;
  background: #050505;
  transition:
    background 0.28s ease,
    color 0.28s ease;
}

.enterprise-login-page.theme-light {
  --login-gold: #d4a017;
  --login-gold-strong: #e5b85c;
  --login-text: #10233c;
  --login-muted: #5c708c;
  --login-feature-bg: rgba(255, 255, 255, 0.78);
  --login-feature-border: rgba(15, 35, 60, 0.08);
  --login-feature-icon-bg: rgba(212, 160, 23, 0.12);
  --login-overlay: linear-gradient(
    90deg,
    rgba(248, 251, 255, 0.94) 0%,
    rgba(248, 251, 255, 0.78) 38%,
    rgba(236, 244, 255, 0.48) 62%,
    rgba(230, 240, 252, 0.22) 100%
  );

  background: #e8f0fa;
}

.enterprise-login-page.theme-light .enterprise-login-bg-image {
  filter: saturate(0.95) brightness(1.06);
}

.enterprise-login-page.theme-light .enterprise-login-title {
  color: #0f172a;
  text-shadow: 0 2px 16px rgba(255, 255, 255, 0.78);
}

.enterprise-login-page.theme-light .enterprise-login-subtitle {
  color: #475569;
  text-shadow: 0 1px 12px rgba(255, 255, 255, 0.65);
}

.enterprise-login-shell {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(calc(100vw - clamp(48px, 11vw, 176px)), 1120px);
  margin: var(--login-shell-top-gap) auto 0;
  box-sizing: border-box;
  overflow: visible;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 400px);
  align-items: start;
  gap: clamp(32px, 5vw, 80px);
}

.enterprise-login-bg,
.enterprise-login-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.enterprise-login-bg {
  overflow: hidden;
}

.enterprise-login-bg-image {
  display: block;
  width: 100%;
  height: 100%;
  filter: saturate(1.04) brightness(0.94);
  transition: filter 0.28s ease;
}

.enterprise-login-overlay {
  background: var(--login-overlay);
  transition: background 0.28s ease;
}

.enterprise-login-copy {
  width: max-content;
  max-width: min(100%, 720px);
  color: var(--login-text);
}

.enterprise-login-title {
  margin: 0 0 clamp(6px, 1vh, 12px);
  color: var(--home-hero-title, #f3f3f3);
  font-size: clamp(22px, 2.2vw, 46px);
  line-height: 1.12;
  letter-spacing: 0;
  white-space: nowrap;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.42);
}

.enterprise-login-subtitle {
  margin: 0;
  color: var(--home-hero-sub, #d5d5d5);
  font-size: clamp(14px, 0.92vw, 20px);
  line-height: 1.35;
  font-weight: 400;
  white-space: nowrap;
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.38);
}

.enterprise-login-features {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(14px, 2vw, 24px);
  margin: clamp(36px, 6vh, 72px) 0 0;
  padding: 0;
  list-style: none;
}

.enterprise-login-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 168px;
  padding: 12px 16px;
  border: 1px solid var(--login-feature-border);
  border-radius: 12px;
  background: var(--login-feature-bg);
  backdrop-filter: blur(10px);
}

.enterprise-login-feature-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  background: transparent;
}

.enterprise-login-feature-icon-image {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.enterprise-login-feature-text {
  display: grid;
  gap: 2px;
}

.enterprise-login-feature-text b {
  color: var(--login-text);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}

.enterprise-login-feature-text small {
  color: var(--login-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.enterprise-login-panel {
  width: 100%;
  height: auto;
  overflow: visible;
}

@media (max-width: 1100px) {
  .enterprise-login-shell {
    width: min(calc(100vw - 48px), 420px);
    grid-template-columns: minmax(0, 1fr);
  }

  .enterprise-login-copy {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }

  .enterprise-login-features {
    margin-top: 28px;
  }
}

@media (max-width: 640px) {
  .enterprise-login-features {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .enterprise-login-features li {
    min-width: 0;
  }
}

@media (min-width: 1600px) {
  .enterprise-login-title {
    margin-bottom: 24px;
    font-weight: 800;
  }
}
</style>
