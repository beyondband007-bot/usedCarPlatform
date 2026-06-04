# 静态图片资源（按页面结构命名）

本目录为项目 UI 用图的规范副本：由 `scripts/copy-media-assets.mjs` 从 `src/assets/img`、`src/img/home` 等复制并重命名。

## 目录说明

| 目录 | 页面/模块 |
|------|-----------|
| `home/` | 首页 Hero、能力卡、轮播、案例、快捷入口 |
| `auth/` | 企业登录背景 |
| `pricing/` | 定价页 Hero |
| `package/` | 积分充值 / 套餐卡片背景 |
| `points/` | 积分查询页整页背景 |
| `global/` | 页脚 Logo、联系微信二维码 |
| `workspace/showroom/` | 工作台 - 展厅教程与模板推荐 |
| `workspace/road/scene/` | 工作台 - 道路动态场景选择 |
| `workspace/road/tutorial/` | 工作台 - 道路动态教程 |
| `workspace/outdoor/` | 工作台 - 户外场景教程 |
| `workspace/sky/` | 工作台 - 天空影棚教程 |
| `workspace/beauty/` | 工作台 - 美容/去水印前后对比 |
| `design/` | 设计稿（未接入运行时） |

## 维护

新增或替换图片后，更新 `scripts/copy-media-assets.mjs` 映射表并执行：

```bash
node scripts/copy-media-assets.mjs
```

旧路径 `src/assets/img/**`、`src/img/home/**` 仍保留作源文件，待确认无引用后可逐步删除。
