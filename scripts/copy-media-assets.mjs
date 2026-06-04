import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** @type {[string, string][]} */
const mappings = [
  ['src/img/home/feature-scene.png', 'src/assets/media/home/home-capability-scene-bg.png'],
  ['src/img/home/feature-refine.png', 'src/assets/media/home/home-capability-refine.png'],
  ['src/img/home/feature-batch.png', 'src/assets/media/home/home-capability-batch.png'],
  ['src/img/home/feature-showroom.png', 'src/assets/media/home/home-capability-showroom.png'],
  ['src/img/home/feature-sky.png', 'src/assets/media/home/home-capability-outdoor.png'],
  ['src/img/home/feature-road.png', 'src/assets/media/home/home-capability-road-motion.png'],
  ['src/img/home/feature-outdoor.png', 'src/assets/media/home/home-capability-sky-studio.png'],
  ['src/img/home/case-used.png', 'src/assets/media/home/home-case-used-car.png'],
  ['src/img/home/suite-workbench.png', 'src/assets/media/home/home-entry-workbench-dark.png'],
  ['src/img/home/suite-workbench-light.png', 'src/assets/media/home/home-entry-workbench-light.png'],
  ['src/img/home/suite-enterprise.png', 'src/assets/media/home/home-entry-enterprise-dark.png'],
  ['src/img/home/suite-enterprise-light.png', 'src/assets/media/home/home-entry-enterprise-light.png'],
  ['src/img/home/promo-banners/banner-01-light-pollution.png', 'src/assets/media/home/home-promo-light-pollution.png'],
  ['src/img/home/promo-banners/banner-02-agent-recruitment.png', 'src/assets/media/home/home-promo-agent-recruitment.png'],
  ['src/img/home/promo-banners/banner-03-creative-team.png', 'src/assets/media/home/home-promo-creative-team.png'],
  ['src/img/home/hero-car.png', 'src/assets/media/home/home-hero-car-unused.png'],
  ['src/img/home/feature-video.png', 'src/assets/media/home/home-capability-video-unused.png'],
  ['src/assets/img/首页背景图/日间hero背景图.png', 'src/assets/media/home/home-hero-bg-light.png'],
  ['src/assets/img/首页背景图/夜间hero背景图.png', 'src/assets/media/home/home-hero-bg-dark.png'],
  ['src/assets/img/enterprise-login-bg.png', 'src/assets/media/auth/auth-enterprise-login-bg-dark.png'],
  ['src/assets/img/enterprise-login-bg-light.png', 'src/assets/media/auth/auth-enterprise-login-bg-light.png'],
  ['src/assets/img/pricing-hero-bg.png', 'src/assets/media/pricing/pricing-hero-bg-dark.png'],
  ['src/assets/img/日间企业套餐背景图.png', 'src/assets/media/pricing/pricing-hero-bg-light.png'],
  ['src/img/home/suite-workbench-light.png', 'src/assets/media/package/package-plan-basic-bg.png'],
  ['src/img/home/suite-enterprise-light.png', 'src/assets/media/package/package-plan-team-bg.png'],
  ['src/img/home/suite-enterprise.png', 'src/assets/media/package/package-plan-flagship-bg.png'],
  ['src/assets/img/footer-brand-logo.png', 'src/assets/media/global/global-footer-brand-logo.png'],
  ['src/assets/img/contact-support-wechat-qr.png', 'src/assets/media/global/global-contact-wechat-qr.png'],
  ['src/assets/img/积分查询/积分查询背景白天.png', 'src/assets/media/points/points-query-bg-light.png'],
  ['src/assets/img/积分查询/积分查询背景黑夜.jpg', 'src/assets/media/points/points-query-bg-dark.jpg'],
  ['src/assets/img/展厅灯光/展厅模板/上传车图.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-step-upload.png'],
  ['src/assets/img/展厅灯光/展厅模板/选择模板1.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-01.png'],
  ['src/assets/img/展厅灯光/展厅模板/选择模板2.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-02.png'],
  ['src/assets/img/展厅灯光/展厅模板/选择模板3.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-03.png'],
  ['src/assets/img/展厅灯光/展厅模板/生成效果.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-step-result.png'],
  ['src/assets/img/展厅灯光/展厅模板/ai-car-studio-logo.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-logo-sample.png'],
  ['src/assets/img/展厅灯光/教程图片/经典白棚.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-classic-white.png'],
  ['src/assets/img/展厅灯光/教程图片/玻璃展厅.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-glass-hall.png'],
  ['src/assets/img/展厅灯光/教程图片/暗调豪华.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-luxury-dark.png'],
  ['src/assets/img/展厅灯光/教程图片/柔光灯顶.png', 'src/assets/media/workspace/showroom/workspace-showroom-tutorial-soft-top-light.png'],
  ['src/assets/img/道路动态/场景选择/城市主干道.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-city-day.png'],
  ['src/assets/img/道路动态/场景选择/夕阳高速.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-highway-sunset.png'],
  ['src/assets/img/道路动态/场景选择/傍晚高架.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-overpass-dusk.png'],
  ['src/assets/img/道路动态/场景选择/商务园区.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-business-park.png'],
  ['src/assets/img/道路动态/场景选择/雨夜城市.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-rainy-night.png'],
  ['src/assets/img/道路动态/场景选择/山路弯道.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-mountain-curve.png'],
  ['src/assets/img/道路动态/场景选择/海岸公路.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-coastal.png'],
  ['src/assets/img/道路动态/场景选择/林荫大道.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-forest-avenue.png'],
  ['src/assets/img/道路动态/场景选择/雪后公路.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-snow-road.png'],
  ['src/assets/img/道路动态/场景选择/隧道出口.png', 'src/assets/media/workspace/road/scene/workspace-road-scene-tunnel-exit.png'],
  ['src/assets/img/道路动态/教程背景图/城市主干道.png', 'src/assets/media/workspace/road/tutorial/workspace-road-tutorial-city-day.png'],
  ['src/assets/img/道路动态/教程背景图/夕阳高速.png', 'src/assets/media/workspace/road/tutorial/workspace-road-tutorial-highway-sunset.png'],
  ['src/assets/img/道路动态/教程背景图/傍晚高架.png', 'src/assets/media/workspace/road/tutorial/workspace-road-tutorial-overpass-dusk.png'],
  ['src/assets/img/道路动态/教程背景图/商务园区.png', 'src/assets/media/workspace/road/tutorial/workspace-road-tutorial-business-park.png'],
  ['src/assets/img/户外场景/教程/林荫公园.png', 'src/assets/media/workspace/outdoor/workspace-outdoor-tutorial-tree-park.png'],
  ['src/assets/img/户外场景/教程/山野湖畔.png', 'src/assets/media/workspace/outdoor/workspace-outdoor-tutorial-mountain-lake.png'],
  ['src/assets/img/户外场景/教程/城市街区.png', 'src/assets/media/workspace/outdoor/workspace-outdoor-tutorial-city-block.png'],
  ['src/assets/img/户外场景/教程/海滨城市.png', 'src/assets/media/workspace/outdoor/workspace-outdoor-tutorial-coast-city.png'],
  ['src/assets/img/天空影棚/天空影棚教程/天空镜场.png', 'src/assets/media/workspace/sky/workspace-sky-tutorial-mirror-field.png'],
  ['src/assets/img/天空影棚/天空影棚教程/夕阳车镜.png', 'src/assets/media/workspace/sky/workspace-sky-tutorial-sunset-drive.png'],
  ['src/assets/img/天空影棚/天空影棚教程/云海展台.png', 'src/assets/media/workspace/sky/workspace-sky-tutorial-cloud-sea-stage.png'],
  ['src/assets/img/天空影棚/天空影棚教程/云镜车场.png', 'src/assets/media/workspace/sky/workspace-sky-tutorial-cloud-parking.png'],
  ['src/assets/img/水印图1.png', 'src/assets/media/workspace/beauty/watermark/workspace-watermark-compare-before.png'],
  ['src/assets/img/无水印图1.png', 'src/assets/media/workspace/beauty/watermark/workspace-watermark-compare-after.png'],
  ['src/assets/img/烤漆翻新/翻新前.png', 'src/assets/media/workspace/beauty/paint-refresh/workspace-paint-refresh-compare-before.png'],
  ['src/assets/img/烤漆翻新/翻新后.png', 'src/assets/media/workspace/beauty/paint-refresh/workspace-paint-refresh-compare-after.png'],
  ['src/assets/img/光污一致化/修复前.png', 'src/assets/media/workspace/beauty/light-consistency/workspace-light-consistency-compare-before.png'],
  ['src/assets/img/光污一致化/修复后.png', 'src/assets/media/workspace/beauty/light-consistency/workspace-light-consistency-compare-after.png'],
  ['src/assets/img/内饰清洁/清洁前.png', 'src/assets/media/workspace/beauty/interior/workspace-interior-clean-compare-before.png'],
  ['src/assets/img/内饰清洁/清洁后.png', 'src/assets/media/workspace/beauty/interior/workspace-interior-clean-compare-after.png'],
  ['src/assets/img/内饰清洁/内饰拼接.png', 'src/assets/media/workspace/beauty/interior/workspace-interior-stitch-result.png'],
  ['design-mockups/workspace-light-studio-theme.png', 'src/assets/media/design/design-workspace-light-theme.png'],
]

let ok = 0
let missing = 0

for (const [srcRel, destRel] of mappings) {
  const from = path.join(root, srcRel)
  const to = path.join(root, destRel)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  if (!fs.existsSync(from)) {
    console.warn('Missing:', srcRel)
    missing += 1
    continue
  }
  fs.copyFileSync(from, to)
  console.log('OK', destRel)
  ok += 1
}

console.log(`Done. copied=${ok} missing=${missing}`)
