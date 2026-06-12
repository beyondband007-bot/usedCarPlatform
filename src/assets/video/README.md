# 模板库 Preview 视频资源

用于视觉工作台「模板库」卡片 hover 预览，不参与视频生成业务上传。

## 体积评估（Step 1 结论）

| 文件 | 体积 | 映射用途 |
|------|------|----------|
| `WeChat_20260612164649.mp4` | 1.73 MB | 车场介绍 / 默认 preview |
| `WeChat_20260612164538.mp4` | 3.05 MB | 单车品介绍 |
| `WeChat_20260612164627.mp4` | 2.63 MB | 促销活动 |
| `WeChat_20260612164711.mp4` | 2.41 MB | 行情资讯（coming_soon，仅展示） |
| `WeChat_20260612164637.mp4` | 1.69 MB | 备用 |
| `WeChat_20260612164659.mp4` | 2.13 MB | 备用 |

**合计约 13.6 MB**

## 存放方式

采用 **Vite `import`**（`src/constants/video-template-previews.ts` 中引用）：

- 构建时输出为独立 `assets/*.mp4`，**不会打进 JS bundle**
- 享受 content hash 缓存
- 当前体积可接受；若后续单文件 > 5MB 或总量显著增加，再迁移至 `public/video/`

## 映射逻辑

见 `src/constants/video-template-previews.ts` 中的 `resolveTemplatePreviewUrl()`。
