<script setup lang="ts">
import { homeFooterLinks } from '@/constants/home-page'
</script>

<template>
  <footer id="footer" class="footer">
    <h2>AI CARXEN</h2>
    <nav aria-label="页脚导航">
      <template v-for="item in homeFooterLinks" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
        <a v-else :href="item.href ?? '#'">{{ item.label }}</a>
      </template>
    </nav>
    <p>
      © {{ new Date().getFullYear() }} AI CARXEN. All rights reserved.
      Professional Automotive AI Content Generation.
    </p>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  padding: 112px 20px 62px;
  text-align: center;
  color: var(--home-text);
  border-top: 1px solid var(--home-line);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--home-gold) 4%, transparent), transparent 42%),
    var(--home-footer-bg);
}

.footer h2 {
  margin: 0 0 38px;
  color: var(--home-text);
  font-size: clamp(34px, 4vw, 50px);
  letter-spacing: 0;
}

.footer nav {
  display: flex;
  justify-content: center;
  gap: clamp(22px, 4vw, 72px);
  flex-wrap: wrap;
  margin-bottom: 26px;
  color: var(--home-footer-nav);
  font-size: 14px;
  font-weight: 800;
}

.footer nav a {
  position: relative;
  color: inherit;
  text-decoration: none;
  transition: color var(--home-motion-fast, 160ms ease);
}

.footer nav a:hover {
  color: var(--home-gold);
}

.footer nav a:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 70%, transparent);
  outline-offset: 5px;
}

.footer p {
  margin: 0;
  color: var(--home-footer-copy);
  font-size: 13px;
}
</style>
