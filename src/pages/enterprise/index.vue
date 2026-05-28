<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

import LoginPanel from '@/components/business/account/LoginPanel.vue'
import {
  enterpriseLoginFeatures,
  enterpriseLoginHeroImage,
} from '@/constants/enterprise-login'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const isDark = computed(() => appStore.isDarkMode)
</script>

<template>
  <main
    class="enterprise-login-page"
    :class="isDark ? 'theme-dark' : 'theme-light'"
  >
    <div class="enterprise-login-bg" aria-hidden="true">
      <img :src="enterpriseLoginHeroImage" alt="" />
    </div>
    <div class="enterprise-login-overlay" aria-hidden="true"></div>

    <section class="enterprise-login-copy" aria-label="企业登录介绍">
      <p class="enterprise-login-kicker">企业二手车</p>
      <h1>让每一辆车<br />都值得被精心呈现</h1>
      <p class="enterprise-login-subtitle">AI 驱动的汽车视觉内容创作平台</p>

      <ul class="enterprise-login-features">
        <li v-for="item in enterpriseLoginFeatures" :key="item.title">
          <span class="enterprise-login-feature-icon" aria-hidden="true">
            <Icon :icon="item.icon" />
          </span>
          <span class="enterprise-login-feature-text">
            <b>{{ item.title }}</b>
            <small>{{ item.description }}</small>
          </span>
        </li>
      </ul>
    </section>

    <section class="enterprise-login-panel" aria-label="企业账号登录">
      <LoginPanel :is-dark="isDark" />
    </section>
  </main>
</template>

<style scoped lang="scss">
.enterprise-login-page {
  --login-bg: #e8f0fa;
  --login-text: #10233c;
  --login-muted: #5c708c;
  --login-kicker: #5c708c;
  --login-feature-bg: rgba(255, 255, 255, 0.72);
  --login-feature-border: rgba(15, 35, 60, 0.08);
  --login-feature-icon-bg: rgba(47, 124, 255, 0.1);
  --login-feature-icon: #2f7cff;
  --login-overlay:
    linear-gradient(
      90deg,
      rgba(248, 251, 255, 0.97) 0%,
      rgba(248, 251, 255, 0.82) 42%,
      rgba(232, 242, 255, 0.55) 68%,
      rgba(220, 234, 250, 0.35) 100%
    );
  --login-image-filter: saturate(0.92) brightness(1.08);

  position: relative;
  display: grid;
  min-height: calc(100vh - var(--app-header-offset));
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 440px);
  align-items: center;
  gap: clamp(28px, 5vw, 80px);
  overflow: hidden;
  padding: clamp(36px, 5vw, 72px) clamp(24px, 6vw, 96px);
  background: var(--login-bg);
}

.enterprise-login-page.theme-dark {
  --login-bg: #050b14;
  --login-text: #f8fbff;
  --login-muted: rgba(198, 214, 236, 0.72);
  --login-kicker: rgba(198, 214, 236, 0.82);
  --login-feature-bg: rgba(255, 255, 255, 0.04);
  --login-feature-border: rgba(255, 255, 255, 0.1);
  --login-feature-icon-bg: rgba(47, 124, 255, 0.18);
  --login-feature-icon: #7eb0ff;
  --login-overlay:
    linear-gradient(
      90deg,
      rgba(4, 9, 18, 0.96) 0%,
      rgba(5, 12, 24, 0.88) 44%,
      rgba(5, 12, 24, 0.62) 70%,
      rgba(4, 9, 18, 0.42) 100%
    );
  --login-image-filter: saturate(1.05) brightness(0.55);
}

.enterprise-login-bg,
.enterprise-login-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.enterprise-login-bg {
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
    filter: var(--login-image-filter);
    transform: scale(1.03);
    transition: filter 0.28s ease;
  }
}

.enterprise-login-overlay {
  background: var(--login-overlay);
  transition: background 0.28s ease;
}

.enterprise-login-copy,
.enterprise-login-panel {
  position: relative;
  z-index: 1;
}

.enterprise-login-copy {
  max-width: 640px;
  color: var(--login-text);
}

.enterprise-login-kicker {
  margin: 0 0 20px;
  color: var(--login-kicker);
  font-size: 16px;
  font-weight: 800;
}

.enterprise-login-copy h1 {
  margin: 0;
  max-width: 560px;
  color: var(--login-text);
  font-size: clamp(40px, 4.8vw, 68px);
  line-height: 1.14;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.enterprise-login-subtitle {
  margin: 24px 0 0;
  max-width: 520px;
  color: var(--login-muted);
  font-size: clamp(17px, 1.5vw, 22px);
  line-height: 1.65;
  font-weight: 700;
}

.enterprise-login-features {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 2.5vw, 28px);
  margin: clamp(40px, 7vh, 88px) 0 0;
  padding: 0;
  list-style: none;
}

.enterprise-login-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 148px;
  padding: 12px 16px;
  border: 1px solid var(--login-feature-border);
  border-radius: 12px;
  background: var(--login-feature-bg);
  backdrop-filter: blur(8px);
}

.enterprise-login-feature-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--login-feature-icon-bg);
  color: var(--login-feature-icon);
  font-size: 22px;
}

.enterprise-login-feature-text {
  display: grid;
  gap: 2px;
}

.enterprise-login-feature-text b {
  color: var(--login-text);
  font-size: 16px;
  font-weight: 900;
}

.enterprise-login-feature-text small {
  color: var(--login-muted);
  font-size: 13px;
  font-weight: 700;
}

.enterprise-login-panel {
  justify-self: end;
  width: min(100%, 420px);
}

@media (max-width: 1100px) {
  .enterprise-login-page {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    padding-top: clamp(28px, 4vw, 48px);
    padding-bottom: clamp(40px, 6vw, 64px);
  }

  .enterprise-login-copy {
    max-width: 100%;
  }

  .enterprise-login-panel {
    justify-self: stretch;
    width: 100%;
    max-width: 440px;
  }

  .enterprise-login-features {
    margin-top: 32px;
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
</style>
