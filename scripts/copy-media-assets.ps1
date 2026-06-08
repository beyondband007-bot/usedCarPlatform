$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$media = Join-Path $root 'src\assets\media'

$dirs = @(
  'home', 'auth', 'pricing', 'package', 'global', 'points',
  'workspace\showroom', 'workspace\road\scene', 'workspace\road\tutorial',
  'workspace\outdoor', 'workspace\sky',
  'workspace\beauty\watermark', 'workspace\beauty\paint-refresh',
  'workspace\beauty\light-consistency', 'workspace\beauty\interior',
  'design'
)
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path (Join-Path $media $d) | Out-Null
}

function Copy-Mapped($src, $dest) {
  $from = Join-Path $root $src
  $to = Join-Path $media $dest
  if (-not (Test-Path $from)) {
    Write-Warning "Missing: $src"
    return
  }
  Copy-Item -LiteralPath $from -Destination $to -Force
  Write-Host "OK $dest"
}

# Home
Copy-Mapped 'src\img\home\feature-scene.png' 'home\home-capability-scene-bg.png'
Copy-Mapped 'src\img\home\feature-refine.png' 'home\home-capability-refine.png'
Copy-Mapped 'src\img\home\feature-batch.png' 'home\home-capability-batch.png'
Copy-Mapped 'src\img\home\feature-showroom.png' 'home\home-capability-showroom.png'
Copy-Mapped 'src\img\home\feature-sky.png' 'home\home-capability-outdoor.png'
Copy-Mapped 'src\img\home\feature-road.png' 'home\home-capability-road-motion.png'
Copy-Mapped 'src\img\home\feature-outdoor.png' 'home\home-capability-sky-studio.png'
Copy-Mapped 'src\img\home\case-used.png' 'home\home-case-used-car.png'
Copy-Mapped 'src\img\home\suite-workbench.png' 'home\home-entry-workbench-dark.png'
Copy-Mapped 'src\img\home\suite-workbench-light.png' 'home\home-entry-workbench-light.png'
Copy-Mapped 'src\img\home\suite-enterprise.png' 'home\home-entry-enterprise-dark.png'
Copy-Mapped 'src\img\home\suite-enterprise-light.png' 'home\home-entry-enterprise-light.png'
Copy-Mapped 'src\img\home\promo-banners\banner-01-light-pollution.png' 'home\home-promo-light-pollution.png'
Copy-Mapped 'src\img\home\promo-banners\banner-02-agent-recruitment.png' 'home\home-promo-agent-recruitment.png'
Copy-Mapped 'src\img\home\promo-banners\banner-03-creative-team.png' 'home\home-promo-creative-team.png'
Copy-Mapped 'src\img\home\hero-car.png' 'home\home-hero-car-unused.png'
Copy-Mapped 'src\img\home\feature-video.png' 'home\home-capability-video-unused.png'
Copy-Mapped 'src\assets\img\首页背景图\日间hero背景图.png' 'home\home-hero-bg-light.png'
Copy-Mapped 'src\assets\img\首页背景图\夜间hero背景图.png' 'home\home-hero-bg-dark.png'

# Auth / pricing / package / global / points
Copy-Mapped 'src\assets\img\enterprise-login-bg.png' 'auth\auth-enterprise-login-bg-dark.png'
Copy-Mapped 'src\assets\img\enterprise-login-bg-light.png' 'auth\auth-enterprise-login-bg-light.png'
Copy-Mapped 'src\assets\img\pricing-hero-bg.png' 'pricing\pricing-hero-bg-dark.png'
Copy-Mapped 'src\assets\img\日间企业套餐背景图.png' 'pricing\pricing-hero-bg-light.png'
Copy-Mapped 'src\img\home\suite-workbench-light.png' 'package\package-plan-basic-bg.png'
Copy-Mapped 'src\img\home\suite-enterprise-light.png' 'package\package-plan-team-bg.png'
Copy-Mapped 'src\img\home\suite-enterprise.png' 'package\package-plan-flagship-bg.png'
Copy-Mapped 'src\assets\img\footer-brand-logo.png' 'global\global-footer-brand-logo.png'
Copy-Mapped 'src\assets\img\icon\logo\日间模式logo.png' 'global\global-footer-brand-logo-light.png'
Copy-Mapped 'src\assets\img\contact-support-wechat-qr.png' 'global\global-contact-wechat-qr.png'
Copy-Mapped 'src\assets\img\积分查询\积分查询背景白天.png' 'points\points-query-bg-light.png'
Copy-Mapped 'src\assets\img\积分查询\积分查询背景黑夜.jpg' 'points\points-query-bg-dark.jpg'

# Workspace showroom tutorial
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\上传车图.png' 'workspace\showroom\workspace-showroom-tutorial-step-upload.png'
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\选择模板1.png' 'workspace\showroom\workspace-showroom-tutorial-step-template-01.png'
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\选择模板2.png' 'workspace\showroom\workspace-showroom-tutorial-step-template-02.png'
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\选择模板3.png' 'workspace\showroom\workspace-showroom-tutorial-step-template-03.png'
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\生成效果.png' 'workspace\showroom\workspace-showroom-tutorial-step-result.png'
Copy-Mapped 'src\assets\img\展厅灯光\展厅模板\ai-car-studio-logo.png' 'workspace\showroom\workspace-showroom-tutorial-logo-sample.png'

# Showroom tutorial thumbnails
Copy-Mapped 'src\assets\img\展厅灯光\教程图片\经典白棚.png' 'workspace\showroom\workspace-showroom-tutorial-classic-white.png'
Copy-Mapped 'src\assets\img\展厅灯光\教程图片\玻璃展厅.png' 'workspace\showroom\workspace-showroom-tutorial-glass-hall.png'
Copy-Mapped 'src\assets\img\展厅灯光\教程图片\暗调豪华.png' 'workspace\showroom\workspace-showroom-tutorial-luxury-dark.png'
Copy-Mapped 'src\assets\img\展厅灯光\教程图片\柔光灯顶.png' 'workspace\showroom\workspace-showroom-tutorial-soft-top-light.png'
Copy-Mapped 'src\assets\img\展厅灯光\场景选择\暖调米棚.png' 'workspace\showroom\scene\workspace-showroom-scene-warm-beige.png'
Copy-Mapped 'src\assets\img\展厅灯光\场景选择\深灰光晕.png' 'workspace\showroom\scene\workspace-showroom-scene-dark-gray-halo.png'
Copy-Mapped 'src\assets\img\展厅灯光\场景选择\炭灰岩墙.png' 'workspace\showroom\scene\workspace-showroom-scene-charcoal-stone.png'
Copy-Mapped 'src\assets\img\展厅灯光\场景选择\竖光展厅.png' 'workspace\showroom\scene\workspace-showroom-scene-vertical-light.png'

# Road scenes
Copy-Mapped 'src\assets\img\道路动态\场景选择\城市主干道.png' 'workspace\road\scene\workspace-road-scene-city-day.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\夕阳高速.png' 'workspace\road\scene\workspace-road-scene-highway-sunset.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\傍晚高架.png' 'workspace\road\scene\workspace-road-scene-overpass-dusk.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\商务园区.png' 'workspace\road\scene\workspace-road-scene-business-park.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\雨夜城市.png' 'workspace\road\scene\workspace-road-scene-rainy-night.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\山路弯道.png' 'workspace\road\scene\workspace-road-scene-mountain-curve.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\海岸公路.png' 'workspace\road\scene\workspace-road-scene-coastal.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\林荫大道.png' 'workspace\road\scene\workspace-road-scene-forest-avenue.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\雪后公路.png' 'workspace\road\scene\workspace-road-scene-snow-road.png'
Copy-Mapped 'src\assets\img\道路动态\场景选择\隧道出口.png' 'workspace\road\scene\workspace-road-scene-tunnel-exit.png'

# Road tutorials
Copy-Mapped 'src\assets\img\道路动态\教程背景图\城市主干道.png' 'workspace\road\tutorial\workspace-road-tutorial-city-day.png'
Copy-Mapped 'src\assets\img\道路动态\教程背景图\夕阳高速.png' 'workspace\road\tutorial\workspace-road-tutorial-highway-sunset.png'
Copy-Mapped 'src\assets\img\道路动态\教程背景图\傍晚高架.png' 'workspace\road\tutorial\workspace-road-tutorial-overpass-dusk.png'
Copy-Mapped 'src\assets\img\道路动态\教程背景图\商务园区.png' 'workspace\road\tutorial\workspace-road-tutorial-business-park.png'

# Outdoor tutorials
Copy-Mapped 'src\assets\img\户外场景\教程\林荫公园.png' 'workspace\outdoor\workspace-outdoor-tutorial-tree-park.png'
Copy-Mapped 'src\assets\img\户外场景\教程\山野湖畔.png' 'workspace\outdoor\workspace-outdoor-tutorial-mountain-lake.png'
Copy-Mapped 'src\assets\img\户外场景\教程\城市街区.png' 'workspace\outdoor\workspace-outdoor-tutorial-city-block.png'
Copy-Mapped 'src\assets\img\户外场景\教程\海滨城市.png' 'workspace\outdoor\workspace-outdoor-tutorial-coast-city.png'

# Sky tutorials
Copy-Mapped 'src\assets\img\天空影棚\天空影棚教程\天空镜场.png' 'workspace\sky\workspace-sky-tutorial-mirror-field.png'
Copy-Mapped 'src\assets\img\天空影棚\天空影棚教程\夕阳车镜.png' 'workspace\sky\workspace-sky-tutorial-sunset-drive.png'
Copy-Mapped 'src\assets\img\天空影棚\天空影棚教程\云海展台.png' 'workspace\sky\workspace-sky-tutorial-cloud-sea-stage.png'
Copy-Mapped 'src\assets\img\天空影棚\天空影棚教程\云镜车场.png' 'workspace\sky\workspace-sky-tutorial-cloud-parking.png'

# Beauty compare
Copy-Mapped 'src\assets\img\水印图1.png' 'workspace\beauty\watermark\workspace-watermark-compare-before.png'
Copy-Mapped 'src\assets\img\无水印图1.png' 'workspace\beauty\watermark\workspace-watermark-compare-after.png'
Copy-Mapped 'src\assets\img\烤漆翻新\翻新前.png' 'workspace\beauty\paint-refresh\workspace-paint-refresh-compare-before.png'
Copy-Mapped 'src\assets\img\烤漆翻新\翻新后.png' 'workspace\beauty\paint-refresh\workspace-paint-refresh-compare-after.png'
Copy-Mapped 'src\assets\img\光污一致化\修复前.png' 'workspace\beauty\light-consistency\workspace-light-consistency-compare-before.png'
Copy-Mapped 'src\assets\img\光污一致化\修复后.png' 'workspace\beauty\light-consistency\workspace-light-consistency-compare-after.png'
Copy-Mapped 'src\assets\img\内饰清洁\清洁前.png' 'workspace\beauty\interior\workspace-interior-clean-compare-before.png'
Copy-Mapped 'src\assets\img\内饰清洁\清洁后.png' 'workspace\beauty\interior\workspace-interior-clean-compare-after.png'
Copy-Mapped 'src\assets\img\内饰清洁\内饰拼接.png' 'workspace\beauty\interior\workspace-interior-stitch-result.png'

# Design
if (Test-Path (Join-Path $root 'design-mockups\workspace-light-studio-theme.png')) {
  Copy-Mapped 'design-mockups\workspace-light-studio-theme.png' 'design\design-workspace-light-theme.png'
}

Write-Host 'Done.'
