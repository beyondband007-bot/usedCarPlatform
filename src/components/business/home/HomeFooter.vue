<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
</script>

<template>
  <footer
    id="footer"
    class="footer"
    :class="appStore.isDarkMode ? 'footer--dark' : 'footer--light'"
  >
    <div class="footer-container">
      <div class="footer-brand">
        <div class="brand-logo">
          <div class="logo-icon">脸</div>
          <span class="brand-name">脸谱AI</span>
        </div>
        <button
          type="button"
          class="footer-theme-toggle"
          :aria-label="appStore.isDarkMode ? '切换到日间模式' : '切换到夜间模式'"
          @click="appStore.toggleTheme()"
        >
          <Icon
            :icon="
              appStore.isDarkMode
                ? 'mdi:white-balance-sunny'
                : 'mdi:moon-waning-crescent'
            "
          />
          <span>{{ appStore.isDarkMode ? "日间模式" : "夜间模式" }}</span>
        </button>
        <p class="brand-desc">
          面向汽车电商、二手车商和企业运营团队的 AI SaaS 工作台
        </p>
        <div class="qr-codes">
          <div class="qr-item">
            <div class="qr-placeholder">
              <div class="qr-pattern">
                <div class="qr-inner"></div>
                <div class="qr-center"></div>
              </div>
            </div>
            <span class="qr-label">客服微信</span>
          </div>
          <div class="qr-item">
            <div class="qr-placeholder">
              <div class="qr-pattern">
                <div class="qr-inner"></div>
                <div class="qr-center"></div>
              </div>
            </div>
            <span class="qr-label">微信公众号</span>
          </div>
        </div>
        <p class="brand-tip">
          添加客服微信，了解更多定制服务<br>
          关注脸谱AI公众号，获取产品更新
        </p>
      </div>

      <div class="footer-nav">
        <div class="nav-column">
          <h3 class="nav-title">场景更换</h3>
          <ul class="nav-list">
            <li><a href="#">展厅棚拍</a></li>
            <li><a href="#">户外实景</a></li>
            <li><a href="#">行驶动效</a></li>
            <li><a href="#">天空影棚</a></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">车辆美容</h3>
          <ul class="nav-list">
            <li><a href="#">烤漆翻新</a></li>
            <li><a href="#">光污美化</a></li>
            <li><a href="#">内饰清洁</a></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">智能交付</h3>
          <ul class="nav-list">
            <li><a href="#">批量上新</a></li>
            <li><a href="#">成片交付</a></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">营销工具</h3>
          <ul class="nav-list">
            <li>
              <a href="#">去水印<span class="tag tag-beta">Beta</span></a>
            </li>
            <li>
              <a href="#">创意生图<span class="tag tag-beta">Beta</span></a>
            </li>
            <li>
              <a href="#">主图套版<span class="tag tag-plan">规划中</span></a>
            </li>
            <li>
              <a href="#">短视频生成<span class="tag tag-beta">Beta</span></a>
            </li>
            <li>
              <a href="#">详情页物料<span class="tag tag-plan">规划中</span></a>
            </li>
            <li>
              <a href="#">多平台分发<span class="tag tag-plan">规划中</span></a>
            </li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">联系我们</h3>
          <ul class="nav-list">
            <li><a href="#">商务合作：sales@lianpu.ai</a></li>
            <li><a href="#">媒体联系：media@lianpu.ai</a></li>
            <li><a href="#">关于我们</a></li>
            <li><a href="#">帮助中心</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>脸谱AI 版权所有</p>
      <div class="footer-bottom-links">
        <a href="#">隐私政策</a>
        <a href="#">服务条款</a>
        <a href="#">京ICP备xxxxxxxx号</a>
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
  --footer-bg: #101010;
  --footer-border: #1f1f1f;
  --footer-title: #f3f3f3;
  --footer-text: #e8e8e8;
  --footer-link: #888;
  --footer-link-hover: #2f6bff;
  --footer-muted: #777;
  --footer-subtle: #555;
  --footer-qr-bg: #1a1a1a;
  --footer-qr-border: #2a2a2a;
  --footer-brand-bg: linear-gradient(135deg, #2f6bff, #5c8dff);
  --footer-toggle-bg: rgba(255, 255, 255, 0.06);
  --footer-toggle-border: rgba(255, 255, 255, 0.1);
  --footer-toggle-text: #e8e8e8;
  --footer-toggle-hover: #2f6bff;
  --footer-toggle-hover-border: rgba(47, 107, 255, 0.28);
  --footer-toggle-hover-shadow: rgba(47, 107, 255, 0.08);
  --footer-tag-beta-bg: rgba(239, 194, 76, 0.12);
  --footer-tag-beta-text: #efc24c;
  --footer-tag-beta-border: transparent;
  --footer-tag-plan-bg: rgba(136, 136, 136, 0.12);
  --footer-tag-plan-text: #666;
  --footer-tag-plan-border: transparent;

  display: block;
  width: 100%;
  margin: 0;
  padding: 56px 0 32px;
  color: var(--footer-text);
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;
  text-align: left;
  background-color: var(--footer-bg);
  border-top: 1px solid var(--footer-border);
}

.footer--light {
  --footer-bg: #ffffff;
  --footer-border: #e6eaf2;
  --footer-title: #0f172a;
  --footer-text: #334155;
  --footer-link: #64748b;
  --footer-link-hover: #334155;
  --footer-muted: #94a3b8;
  --footer-subtle: #94a3b8;
  --footer-qr-bg: #ffffff;
  --footer-qr-border: #e6eaf2;
  --footer-brand-bg: #f5c84c;
  --footer-toggle-bg: #ffffff;
  --footer-toggle-border: #e6eaf2;
  --footer-toggle-text: #334155;
  --footer-toggle-hover: #0f172a;
  --footer-toggle-hover-border: #e6eaf2;
  --footer-toggle-hover-shadow: rgba(15, 23, 42, 0.06);
  --footer-tag-beta-bg: #fffbeb;
  --footer-tag-beta-text: #b7791f;
  --footer-tag-beta-border: #fde68a;
  --footer-tag-plan-bg: #f8fafc;
  --footer-tag-plan-text: #64748b;
  --footer-tag-plan-border: #e2e8f0;
}

.footer-container {
  display: flex;
  width: min(100%, 1200px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  gap: 64px;
  align-items: flex-start;
  justify-content: space-between;
}

.footer-brand {
  flex: 0 0 260px;
  width: 260px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.logo-icon {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: var(--footer-brand-bg);
  border-radius: 10px;
}

.brand-name {
  color: var(--footer-title);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.footer-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 24px;
  padding: 7px 11px;
  border: 1px solid var(--footer-toggle-border);
  border-radius: 999px;
  background: var(--footer-toggle-bg);
  color: var(--footer-toggle-text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.footer-theme-toggle:hover {
  color: var(--footer-toggle-hover);
  border-color: var(--footer-toggle-hover-border);
  box-shadow: 0 8px 22px var(--footer-toggle-hover-shadow);
}

.footer-theme-toggle :deep(svg) {
  flex-shrink: 0;
  font-size: 15px;
}

.brand-desc {
  margin: 0 0 24px;
  color: var(--footer-link);
  font-size: 13px;
  line-height: 1.7;
}

.qr-codes {
  display: flex;
  gap: 16px;
}

.qr-item {
  text-align: center;
}

.qr-placeholder {
  position: relative;
  display: flex;
  width: 90px;
  height: 90px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  overflow: hidden;
  background-color: var(--footer-qr-bg);
  border: 1px solid var(--footer-qr-border);
  border-radius: 8px;
}

.qr-pattern {
  position: relative;
  width: 68px;
  height: 68px;
  background: #fff;
}

.qr-pattern::before {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  content: "";
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px #000;
}

.qr-pattern::after {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  content: "";
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px #000;
}

.qr-inner {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px #000;
}

.qr-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  background: var(--footer-brand-bg);
  border-radius: 3px;
  transform: translate(-50%, -50%);
}

.qr-label {
  color: var(--footer-muted);
  font-size: 12px;
}

.brand-tip {
  margin: 16px 0 0;
  color: var(--footer-subtle);
  font-size: 12px;
  line-height: 1.8;
}

.footer-nav {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
}

.nav-column {
  flex: 0 0 auto;
}

.nav-title {
  margin: 0 0 18px;
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

.nav-list a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--footer-link);
  font-size: 13px;
  line-height: 1.6;
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-list a:hover {
  color: var(--footer-link-hover);
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
  color: var(--footer-tag-plan-text);
  background-color: var(--footer-tag-plan-bg);
  border-color: var(--footer-tag-plan-border);
}

.footer-bottom {
  display: flex;
  width: min(100%, 1200px);
  max-width: 1200px;
  align-items: center;
  justify-content: space-between;
  margin: 48px auto 0;
  padding: 20px 32px 0;
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

.footer-bottom-links a {
  color: var(--footer-subtle);
  font-size: 12px;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-bottom-links a:hover {
  color: #888;
}

@media (max-width: 960px) {
  .footer-container {
    flex-direction: column;
    gap: 36px;
  }

  .footer-nav {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .nav-column {
    width: calc(50% - 16px);
  }

  .footer-bottom {
    gap: 16px;
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .footer-container,
  .footer-bottom {
    padding-right: 20px;
    padding-left: 20px;
  }

  .footer-brand,
  .nav-column {
    width: 100%;
  }

  .footer-nav,
  .footer-bottom-links {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
