<script setup lang="ts">
import footerBrandLogo from "@/assets/img/footer-brand-logo.png";
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
        <img
          class="brand-logo-image"
          :src="footerBrandLogo"
          alt="Facemini 脸谱科技"
          width="168"
          height="40"
          loading="lazy"
          decoding="async"
        />

        <div class="brand-body">
          <div class="qr-codes">
            <div class="qr-item">
              <div class="qr-placeholder" aria-hidden="true">
                <div class="qr-pattern">
                  <div class="qr-inner"></div>
                  <div class="qr-center"></div>
                </div>
              </div>
              <span class="qr-label">客服微信</span>
            </div>
            <div class="qr-item">
              <div class="qr-placeholder" aria-hidden="true">
                <div class="qr-pattern">
                  <div class="qr-inner"></div>
                  <div class="qr-center"></div>
                </div>
              </div>
              <span class="qr-label">微信公众号</span>
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
        <div class="nav-column">
          <h3 class="nav-title">场景更换</h3>
          <ul class="nav-list">
            <li><span class="nav-item">展厅棚拍</span></li>
            <li><span class="nav-item">户外实景</span></li>
            <li><span class="nav-item">行驶动效</span></li>
            <li><span class="nav-item">天空影棚</span></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">车辆美容</h3>
          <ul class="nav-list">
            <li><span class="nav-item">烤漆翻新</span></li>
            <li><span class="nav-item">光污美化</span></li>
            <li><span class="nav-item">内饰清洁</span></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">智能交付</h3>
          <ul class="nav-list">
            <li><span class="nav-item">批量上新</span></li>
            <li><span class="nav-item">成片交付</span></li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">营销工具</h3>
          <ul class="nav-list">
            <li>
              <span class="nav-item">去水印<span class="tag tag-beta">Beta</span></span>
            </li>
            <li>
              <span class="nav-item">创意生图<span class="tag tag-beta">Beta</span></span>
            </li>
            <li>
              <span class="nav-item">主图套版<span class="tag tag-plan">开发中</span></span>
            </li>
            <li>
              <span class="nav-item">短视频生成<span class="tag tag-beta">Beta</span></span>
            </li>
            <li>
              <span class="nav-item">详情页物料<span class="tag tag-plan">开发中</span></span>
            </li>
            <li>
              <span class="nav-item">多平台分发<span class="tag tag-plan">开发中</span></span>
            </li>
          </ul>
        </div>

        <div class="nav-column">
          <h3 class="nav-title">联系我们</h3>
          <ul class="nav-list">
            <li><span class="nav-item">关于我们</span></li>
            <li><span class="nav-item">帮助中心</span></li>
            <li><span class="nav-item">商务合作：sales@lianpu.ai</span></li>
            <li><span class="nav-item">媒体联系：media@lianpu.ai</span></li>
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
  --footer-qr-bg: #ffffff;
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
    "Noto Sans SC",
    "PingFang SC",
    "Microsoft YaHei",
    system-ui,
    sans-serif;
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
  --footer-qr-bg: #ffffff;
  --footer-qr-border: #e6eaf2;
  --footer-tag-beta-bg: #fffbeb;
  --footer-tag-beta-text: #b7791f;
  --footer-tag-beta-border: #fde68a;
}

.footer-container {
  display: flex;
  width: min(100%, 1440px);
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 40px;
  gap: 128px;
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

.qr-placeholder {
  position: relative;
  display: flex;
  width: 88px;
  height: 88px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  overflow: hidden;
  background-color: var(--footer-qr-bg);
  border: 1px solid var(--footer-qr-border);
  border-radius: 6px;
}

.qr-pattern {
  position: relative;
  width: 64px;
  height: 64px;
  background: #fff;
}

.qr-pattern::before {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
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
  width: 16px;
  height: 16px;
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
  width: 16px;
  height: 16px;
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px #000;
}

.qr-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  background: #7c3aed;
  border-radius: 2px;
  transform: translate(-50%, -50%);
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

.nav-list .nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--footer-link);
  font-size: 13px;
  line-height: 1.6;
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
  width: min(100%, 1440px);
  max-width: 1440px;
  align-items: center;
  justify-content: space-between;
  margin: 40px auto 0;
  padding: 20px 40px 0;
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

@media (max-width: 1100px) {
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

@media (max-width: 640px) {
  .footer-container,
  .footer-bottom {
    padding-right: 20px;
    padding-left: 20px;
  }

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
