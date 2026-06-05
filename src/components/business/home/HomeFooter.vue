<script setup lang="ts">
import { computed, inject } from "vue";
import { useRouter } from "vue-router";

import footerBrandLogoLight from "@/assets/img/icon/logo/日间模式logo.png";
import { mediaUrls } from "@/constants/media-urls";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import {
  homeFooterContactItems,
  homeFooterNavColumns,
  type HomeFooterNavItem,
} from "@/constants/home-page";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";

const contactSupportWechatQr = mediaUrls.global.contactWechatQr;
const footerBrandLogo = mediaUrls.global.footerBrandLogo;
const appStore = useAppStore();
const authStore = useAuthStore();
const router = useRouter();
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY);

function handleFooterNavClick(item: HomeFooterNavItem) {
  if (item.disabled || !item.workspaceCode) return;

  if (!authStore.isLoggedIn) {
    workbenchEntry?.openVisitorModal();
    return;
  }

  void router.push({
    name: "Workspace",
    params: { code: item.workspaceCode },
  });
}

function isNavItemClickable(item: HomeFooterNavItem) {
  return Boolean(item.workspaceCode) && !item.disabled;
}

const footerBrandLogoSrc = computed(() =>
  appStore.isDarkMode ? footerBrandLogo : footerBrandLogoLight,
);
</script>

<template>
  <footer
    id="footer"
    class="footer"
    :class="appStore.isDarkMode ? 'footer--dark' : 'footer--light'"
  >
    <div class="footer-container">
      <div class="footer-brand">
        <img
          class="brand-logo-image"
          :src="footerBrandLogoSrc"
          alt="Facemini 脸谱科技"
          width="168"
          height="40"
          loading="lazy"
          decoding="async"
        />

        <div class="brand-body">
          <div class="qr-codes">
            <div class="qr-item">
              <div class="qr-frame">
                <img
                  class="qr-image"
                  :src="contactSupportWechatQr"
                  alt="客服微信二维码"
                  width="88"
                  height="88"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span class="qr-label">客服微信</span>
            </div>
          </div>

          <div class="brand-copy">
            <p class="brand-desc">
              面向汽车电商、二手车商和企业运营团队的 AI SaaS 工作台
            </p>
            <p class="brand-tip">
              添加客服微信，了解更多定制服务<br />
              关注脸谱AI公众号，获取产品更新
            </p>
          </div>
        </div>
      </div>

      <div class="footer-nav">
        <div
          v-for="column in homeFooterNavColumns"
          :key="column.title"
          class="nav-column"
        >
          <h3 class="nav-title">{{ column.title }}</h3>
          <ul class="nav-list">
            <li v-for="item in column.items" :key="item.label">
              <button
                v-if="isNavItemClickable(item)"
                type="button"
                class="nav-item nav-item--clickable"
                @click="handleFooterNavClick(item)"
              >
                {{ item.label }}
                <span
                  v-if="item.tag === 'beta'"
                  class="tag tag-beta"
                >Beta</span>
              </button>
              <span
                v-else
                class="nav-item"
                :class="{ 'nav-item--disabled': item.disabled }"
              >
                {{ item.label }}
                <span
                  v-if="item.tag === 'beta'"
                  class="tag tag-beta"
                >Beta</span>
                <span
                  v-else-if="item.tag === 'plan'"
                  class="tag tag-plan"
                >开发中</span>
              </span>
            </li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">联系我们</h3>
          <ul class="nav-list">
            <li v-for="line in homeFooterContactItems" :key="line">
              <span class="nav-item nav-item--static">{{ line }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>脸谱AI版权所有</p>
      <div class="footer-bottom-links">
        <span>隐私政策</span>
        <span>服务条款</span>
        <span>京ICP备xxxxxxxx号</span>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer,
.footer * {
  box-sizing: border-box;
}

.footer {
  --footer-bg: #000000;
  --footer-border: rgba(255, 255, 255, 0.12);
  --footer-title: #ffffff;
  --footer-text: rgba(255, 255, 255, 0.88);
  --footer-link: rgba(255, 255, 255, 0.72);
  --footer-muted: rgba(255, 255, 255, 0.56);
  --footer-subtle: rgba(255, 255, 255, 0.42);
  --footer-qr-border: rgba(255, 255, 255, 0.14);
  --footer-tag-beta-bg: rgba(239, 194, 76, 0.16);
  --footer-tag-beta-text: #efc24c;
  --footer-tag-beta-border: transparent;

  display: block;
  width: 100%;
  margin: 0;
  padding: 48px 0 28px;
  color: var(--footer-text);
  font-family:
    "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  text-align: left;
  background-color: var(--footer-bg);
}

.footer--light {
  --footer-bg: #ffffff;
  --footer-border: #e6eaf2;
  --footer-title: #0f172a;
  --footer-text: #334155;
  --footer-link: #64748b;
  --footer-muted: #94a3b8;
  --footer-subtle: #94a3b8;
  --footer-qr-border: #e6eaf2;
  --footer-tag-beta-bg: #fffbeb;
  --footer-tag-beta-text: #b7791f;
  --footer-tag-beta-border: #fde68a;
}

.footer-container {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--layout-content-max, 1440px);
  margin: 0 auto;
  padding: 0 var(--space-page-x, clamp(16px, 2vw, 32px));
  gap: clamp(40px, 8vw, 128px);
  align-items: flex-start;
  justify-content: space-between;
}

.footer-brand {
  flex: 0 0 420px;
  width: min(100%, 420px);
}

.brand-logo-image {
  display: block;
  width: auto;
  max-width: 168px;
  height: 40px;
  margin-bottom: 24px;
  object-fit: contain;
  object-position: left center;
}

.brand-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.brand-copy {
  min-width: 0;
  flex: 1;
}

.brand-desc {
  margin: 0 0 12px;
  color: var(--footer-text);
  font-size: 13px;
  line-height: 1.75;
}

.qr-codes {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
}

.qr-item {
  text-align: center;
}

.qr-frame {
  display: flex;
  width: 88px;
  height: 88px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  overflow: hidden;
  background-color: #ffffff;
  border: 1px solid var(--footer-qr-border);
  border-radius: 6px;
}

.qr-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-label {
  color: var(--footer-muted);
  font-size: 12px;
  line-height: 1.3;
}

.brand-tip {
  margin: 0;
  color: var(--footer-muted);
  font-size: 12px;
  line-height: 1.75;
}

.footer-nav {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 40px;
  align-items: flex-start;
  justify-content: space-between;
}

.nav-column {
  flex: 0 0 auto;
}

.nav-title {
  margin: 0 0 16px;
  color: var(--footer-title);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.nav-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.nav-list li {
  margin-bottom: 10px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--footer-link);
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
  cursor: default;
}

.nav-item--clickable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-item--clickable:hover {
  color: var(--footer-title);
}

.nav-item--disabled {
  cursor: default;
  opacity: 0.72;
}

.nav-item--static {
  cursor: default;
}

.tag {
  padding: 1px 5px;
  border: 1px solid transparent;
  font-size: 10px;
  font-weight: 500;
  border-radius: 3px;
}

.tag-beta {
  color: var(--footer-tag-beta-text);
  background-color: var(--footer-tag-beta-bg);
  border-color: var(--footer-tag-beta-border);
}

.tag-plan {
  color: var(--footer-tag-beta-text);
  background-color: var(--footer-tag-beta-bg);
  border-color: var(--footer-tag-beta-border);
}

.footer-bottom {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--layout-content-max, 1440px);
  align-items: center;
  justify-content: space-between;
  margin: 40px auto 0;
  padding: 20px var(--space-page-x, clamp(16px, 2vw, 32px)) 0;
  border-top: 1px solid var(--footer-border);
}

.footer-bottom p {
  margin: 0;
  color: var(--footer-subtle);
  font-size: 12px;
}

.footer-bottom-links {
  display: flex;
  gap: 24px;
}

.footer-bottom-links span {
  color: var(--footer-subtle);
  font-size: 12px;
  cursor: default;
}

@media (max-width: 1023px) {
  .footer-container {
    flex-direction: column;
    gap: 40px;
  }

  .footer-brand {
    width: 100%;
    max-width: none;
  }

  .footer-nav {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 28px 40px;
  }
}

@media (max-width: 767px) {
  .brand-body {
    flex-direction: column;
  }

  .footer-nav {
    flex-direction: column;
    gap: 24px;
  }

  .nav-column {
    width: 100%;
  }

  .nav-item--clickable {
    min-height: 44px;
    align-items: center;
  }

  .footer-bottom {
    gap: 16px;
    align-items: flex-start;
    flex-direction: column;
  }

  .footer-bottom-links {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
