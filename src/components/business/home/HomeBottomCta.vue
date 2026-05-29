<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineEmits<{
  enterWorkbench: []
}>()

const ctaRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const root = ctaRef.value
  if (!root) {
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(22px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 620,
              easing: 'cubic-bezier(.16,1,.3,1)',
              fill: 'both',
            },
          )
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 },
  )

  observer.observe(root)
})
</script>

<template>
  <section ref="ctaRef" class="final-cta" aria-label="预约演示">
    <h2>企业视觉内容生产，从一套车图开始</h2>
    <p>企业套餐 ¥980 起，账号、积分、图组并发同步开通</p>
    <button type="button" class="button gold" @click="$emit('enterWorkbench')">
      预约演示
    </button>
  </section>
</template>

<style scoped lang="scss">
.final-cta {
  width: min(1520px, calc(100% - 40px));
  margin: 0 auto;
  padding: 0 20px 120px;
  text-align: center;
}

.final-cta h2 {
  margin: 0 0 14px;
  color: var(--home-text);
  font-size: clamp(28px, 3vw, 42px);
}

.final-cta p {
  margin: 0 0 28px;
  color: var(--home-muted);
  font-size: 16px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 0 40px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
  font-weight: 900;
  text-decoration: none;
  transition:
    transform 0.22s ease,
    filter 0.22s ease,
    box-shadow 0.22s ease;
}

.button:hover {
  transform: translateY(-2px);
  filter: saturate(1.08);
}

.button.gold {
  color: #171100;
  background: linear-gradient(180deg, var(--home-gold-strong), #e9b82c);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 34px rgba(244, 200, 64, 0.18);
}

@media (max-width: 700px) {
  .final-cta {
    width: min(100% - 28px, 1520px);
  }

  .button {
    width: 100%;
    min-height: 52px;
    padding: 0 32px;
    font-size: 15px;
  }
}
</style>
