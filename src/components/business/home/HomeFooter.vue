<script setup lang="ts">
import { homeFooterLinks } from '@/constants/home-page'
</script>

<template>
  <footer class="home-footer">
    <nav class="home-footer-links" aria-label="页脚导航">
      <template v-for="item in homeFooterLinks" :key="item.label">
        <RouterLink v-if="item.to" :to="item.to" class="home-footer-link">
          {{ item.label }}
        </RouterLink>
        <a v-else :href="item.href ?? '#'" class="home-footer-link">{{ item.label }}</a>
      </template>
    </nav>
    <p class="home-footer-copy">© {{ new Date().getFullYear() }} 脸谱AI汽车电商内容平台</p>
  </footer>
</template>

<style scoped lang="scss">
.home-footer {
  padding: 32px clamp(20px, 4vw, 48px) 40px;
  border-top: 1px solid var(--home-border);
  background: var(--home-surface);
  text-align: center;
}

.home-footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 28px;
}

.home-footer-link {
  color: var(--home-muted);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;
}

.home-footer-link:hover {
  color: var(--home-blue);
}

.home-footer-copy {
  margin: 20px 0 0;
  color: var(--home-muted);
  font-size: 13px;
  font-weight: 600;
}
</style>
