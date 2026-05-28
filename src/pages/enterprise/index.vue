<script setup lang="ts">
import LoginPanel from '@/components/business/account/LoginPanel.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <main class="enterprise-login-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <div class="enterprise-login-bg" aria-hidden="true"></div>
    <div class="enterprise-login-overlay" aria-hidden="true"></div>

    <section class="enterprise-login-copy" aria-label="企业登录介绍">
      <p>企业二手车</p>
      <h1>让每一辆车<br />都值得被精心呈现</h1>
      <span></span>
      <strong>AI 驱动的汽车视觉内容创作平台</strong>
      <div class="enterprise-login-features">
        <div>
          <b>场景影棚</b>
          <small>多场景模板</small>
        </div>
        <div>
          <b>智能生成</b>
          <small>AI 一键生成</small>
        </div>
        <div>
          <b>高效交付</b>
          <small>批量导出下载</small>
        </div>
      </div>
    </section>

    <section class="enterprise-login-panel" aria-label="企业账号登录">
      <LoginPanel />
    </section>
  </main>
</template>

<style scoped lang="scss">
.enterprise-login-page {
  --login-bg: #050b14;
  --login-text: #f8fbff;
  --login-muted: rgba(211, 225, 243, 0.68);
  --login-bg-opacity: 1;
  --login-bg-filter: saturate(112%) brightness(0.78);
  --login-overlay:
    linear-gradient(90deg, rgba(3, 8, 16, 0.9) 0%, rgba(5, 13, 26, 0.56) 48%, rgba(3, 8, 16, 0.84) 100%),
    linear-gradient(180deg, rgba(3, 8, 16, 0.24), rgba(3, 8, 16, 0.78));

  position: relative;
  display: grid;
  min-height: calc(100vh - var(--app-header-offset));
  grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
  align-items: center;
  gap: clamp(32px, 6vw, 110px);
  overflow: hidden;
  padding: clamp(32px, 5vw, 72px) clamp(28px, 7vw, 120px);
  background: var(--login-bg);
}

.enterprise-login-page.theme-dark {
  --login-bg: #050b14;
  --login-text: #f8fbff;
  --login-muted: rgba(211, 225, 243, 0.68);
  --login-bg-opacity: 1;
  --login-bg-filter: saturate(112%) brightness(0.78);
  --login-overlay:
    linear-gradient(90deg, rgba(3, 8, 16, 0.9) 0%, rgba(5, 13, 26, 0.56) 48%, rgba(3, 8, 16, 0.84) 100%),
    linear-gradient(180deg, rgba(3, 8, 16, 0.24), rgba(3, 8, 16, 0.78));
}

.enterprise-login-page.theme-light {
  --login-bg: #edf4fb;
  --login-text: #10233c;
  --login-muted: rgba(43, 62, 88, 0.72);
  --login-bg-opacity: 0.38;
  --login-bg-filter: saturate(86%) brightness(1.12);
  --login-overlay:
    linear-gradient(90deg, rgba(246, 250, 255, 0.94) 0%, rgba(246, 250, 255, 0.68) 48%, rgba(232, 242, 255, 0.95) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(222, 235, 250, 0.78));
}

.enterprise-login-bg,
.enterprise-login-overlay {
  position: absolute;
  inset: 0;
}

.enterprise-login-bg {
  background-image: url("https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=2400&q=88");
  background-position: center;
  background-size: cover;
  filter: var(--login-bg-filter);
  opacity: var(--login-bg-opacity);
  transform: scale(1.02);
  transition:
    opacity 0.28s ease,
    filter 0.28s ease;
}

.enterprise-login-overlay {
  background: var(--login-overlay);
  backdrop-filter: saturate(112%);
}

.enterprise-login-copy,
.enterprise-login-panel {
  position: relative;
  z-index: 1;
}

.enterprise-login-copy {
  max-width: 660px;
  color: var(--login-text);
}

.enterprise-login-copy p {
  margin: 0 0 24px;
  color: var(--login-muted);
  font-size: 17px;
  font-weight: 800;
}

.enterprise-login-copy h1 {
  margin: 0;
  max-width: 620px;
  color: var(--login-text);
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.15;
  font-weight: 950;
  letter-spacing: 0;
}

.enterprise-login-copy > span {
  display: block;
  width: 58px;
  height: 4px;
  margin: 30px 0 26px;
  border-radius: 999px;
  background: #2f7cff;
}

.enterprise-login-copy strong {
  display: block;
  color: var(--login-muted);
  font-size: clamp(18px, 1.4vw, 22px);
  line-height: 1.7;
  font-weight: 800;
}

.enterprise-login-features {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(22px, 3vw, 48px);
  margin-top: clamp(44px, 8vh, 96px);
}

.enterprise-login-features div {
  display: grid;
  gap: 7px;
  min-width: 118px;
}

.enterprise-login-features b {
  color: var(--login-text);
  font-size: 17px;
  font-weight: 900;
}

.enterprise-login-features small {
  color: var(--login-muted);
  font-size: 14px;
  font-weight: 700;
}

.enterprise-login-panel {
  justify-self: end;
  width: min(100%, 410px);
  background: transparent;
}

@media (max-width: 1180px) {
  .enterprise-login-page {
    grid-template-columns: minmax(0, 1fr);
    align-content: center;
  }

  .enterprise-login-copy {
    max-width: 760px;
  }

  .enterprise-login-panel {
    justify-self: start;
  }
}
</style>
