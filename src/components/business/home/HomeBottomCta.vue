<script setup lang="ts">
import { onMounted, ref } from 'vue'

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
  <section ref="ctaRef" class="final-cta" aria-label="企业套餐">
    <h2>企业视觉内容生产，从一套车图开始</h2>
    <p>企业套餐，超值优惠中，即开即用，一套车图解锁全渠道营销内容</p>
  </section>
</template>

<style scoped lang="scss">
.final-cta {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--home-shell-max, 1440px);
  margin: 0 auto;
  padding: 0 var(--home-space-x, 24px) var(--home-section-pb, 120px);
  text-align: center;
}

.final-cta h2 {
  margin: 0 0 14px;
  color: var(--home-text);
  font-family: "PingFang SC", sans-serif;
  font-size: 30px;
  font-weight: 700;
  white-space: nowrap;
}

.final-cta p {
  margin: 0;
  color: var(--home-muted);
  font-family: "PingFang SC", sans-serif;
  font-size: 18px;
  font-weight: 500;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .final-cta {
    padding-bottom: calc(var(--home-section-pb, 86px) + var(--h5-bottom-inset, 0px));
  }

  .final-cta h2 {
    font-size: clamp(18px, 5.2vw, 22px);
    line-height: 1.3;
    white-space: normal;
  }

  .final-cta p {
    font-size: clamp(12px, 3.2vw, 14px);
    line-height: 1.5;
    white-space: normal;
  }
}
</style>
