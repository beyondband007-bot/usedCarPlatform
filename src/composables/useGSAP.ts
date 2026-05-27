import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TextPlugin } from 'gsap/TextPlugin'

// 注册 GSAP 插件
gsap.registerPlugin(ScrollTrigger, TextPlugin)

// 导出配置好的 gsap
export { gsap, ScrollTrigger, TextPlugin }

// 常用动画预设
export const useGSAP = () => {
  /**
   * 页面元素入场动画
   */
  const fadeInUp = (target: string | Element | Element[], options?: gsap.TweenVars) => {
    return gsap.from(target, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out',
      ...options,
    })
  }

  /**
   * 缩放入场动画
   */
  const scaleIn = (target: string | Element | Element[], options?: gsap.TweenVars) => {
    return gsap.from(target, {
      opacity: 0,
      scale: 0.8,
      duration: 0.5,
      ease: 'back.out(1.7)',
      ...options,
    })
  }

  /**
   * 交错列表动画
   */
  const staggerList = (
    target: string | Element | Element[],
    staggerDelay = 0.1,
    options?: gsap.TweenVars
  ) => {
    return gsap.from(target, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: staggerDelay,
      ease: 'power2.out',
      ...options,
    })
  }

  /**
   * 滚动触发动画
   */
  const scrollTriggerAnimation = (
    target: string | Element | Element[],
    trigger: string | Element,
    animation: gsap.TweenVars,
    scrollOptions?: ScrollTrigger.Vars
  ) => {
    return gsap.from(target, {
      ...animation,
      scrollTrigger: {
        trigger,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
        ...scrollOptions,
      },
    })
  }

  /**
   * 文字打字效果
   */
  const typewriter = (target: string | Element, text: string, options?: gsap.TweenVars) => {
    return gsap.to(target, {
      text: {
        value: text,
        delimiter: '',
      },
      duration: 2,
      ease: 'none',
      ...options,
    })
  }

  /**
   * 数字滚动动画
   */
  const numberCounter = (
    target: string | Element,
    endValue: number,
    options?: gsap.TweenVars
  ) => {
    const obj = { value: 0 }
    return gsap.to(obj, {
      value: endValue,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        if (target instanceof Element) {
          target.textContent = Math.round(obj.value).toString()
        }
      },
      ...options,
    })
  }

  return {
    gsap,
    ScrollTrigger,
    fadeInUp,
    scaleIn,
    staggerList,
    scrollTriggerAnimation,
    typewriter,
    numberCounter,
  }
}