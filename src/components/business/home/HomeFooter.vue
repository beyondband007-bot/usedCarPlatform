<script setup lang="ts">
import { homeFooterLinks } from '@/constants/home-page'
</script>

<template>
  <footer id="footer" class="footer">
    <h2>AI CAR STUDIO</h2>
    <nav aria-label="页脚导航">
      <template v-for="item in homeFooterLinks" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
        <a v-else :href="item.href ?? '#'">{{ item.label }}</a>
      </template>
    </nav>
    <p>
      © {{ new Date().getFullYear() }} AI CAR STUDIO. All rights reserved.
      Professional Automotive AI Content Generation.
    </p>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  padding: 112px 20px 62px;
  text-align: center;
  background: #121212;
}

.footer h2 {
  margin: 0 0 38px;
  font-size: clamp(34px, 4vw, 50px);
}

.footer nav {
  display: flex;
  justify-content: center;
  gap: clamp(22px, 4vw, 72px);
  flex-wrap: wrap;
  margin-bottom: 26px;
  color: #a8a8a8;
  font-size: 14px;
  font-weight: 800;
}

.footer nav a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer nav a:hover {
  color: var(--home-gold);
}

.footer p {
  margin: 0;
  color: #8b8b8b;
  font-size: 13px;
}
</style>
