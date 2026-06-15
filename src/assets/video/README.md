# 模板库 Preview 视频资源

用于视觉工作台「模板库」卡片 hover 预览，不参与视频生成业务上传。

## 体积评估（Step 1 结论）

| 文件 | 体积 | 映射用途 |
|------|------|----------|
| `场景1地库.mp4` | — | 地库光影场景 preview |
| `场景2室外.mp4` | — | 室外自然光场景 preview |

**合计约 13.6 MB**

## 存放方式

采用 **Vite `import`**（`src/constants/video-template-previews.ts` 中引用）：

- 构建时输出为独立 `assets/*.mp4`，**不会打进 JS bundle**
- 享受 content hash 缓存
- 当前体积可接受；若后续单文件 > 5MB 或总量显著增加，再迁移至 `public/video/`

## 映射逻辑

见 `src/constants/video-template-previews.ts` 中的 `resolveTemplatePreviewUrl()`。
