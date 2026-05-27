# AI 汽车视觉 SaaS 平台前端开发规范（rules.md）

---

# 一、项目定位

本项目属于：

# AI SaaS 工作台类平台

包含：

- AI 图片生成
- AI 展厅生成
- AI 图片美化
- 企业套餐
- 积分系统
- AI 工作流
- 企业后台

整体 UI 风格：

```txt
AI 科技风
Apple 极简风
深色模式
```

参考产品：

- Runway
- OpenAI
- Midjourney
- 即梦AI
- 可灵AI

---

# 二、技术栈规范（必须遵守）

## 2.1 核心技术栈

必须使用：

```txt
Vue3
TypeScript
Vite
Pinia
Vue Router
```

禁止：

```txt
Vue2
Options API
JavaScript
Vuex
```

---

## 2.2 UI 技术方案

必须使用：

```txt
TailwindCSS
Naive UI
```

禁止：

```txt
Element Plus
大量 scoped css
Bootstrap
jQuery
```

---

## 2.3 动画技术

基础动画：

```txt
Motion Vue
```

高级动画：

```txt
GSAP
```

禁止：

```txt
页面无动效
传统后台式静态页面
```

---

# 三、页面风格规范

## 3.1 UI 风格

整体页面必须符合：

```txt
AI SaaS 科技风
```

视觉关键词：

- 深色
- 毛玻璃
- 微发光
- 极简
- 卡片化
- 高级灰
- 科技感
- 呼吸感

---

## 3.2 页面布局规范

页面结构：

```txt
Header
Sidebar
MainContent
RightPanel（可选）
```

布局要求：

- 卡片化布局
- 保持留白
- 不允许页面拥挤
- 不允许传统后台风

---

## 3.3 圆角规范

统一：

| 类型   | 数值 |
| ------ | ---- | -------------------------------------------------------------------- |
| 按钮   | 12px |
| 输入框 | 14px |
| 卡片   | 0px  | 组件默认弹窗为8px，先统一改为0，如果要更改，按需求在不同文件自己设置 |
| 弹窗   | 24px |

---

## 3.4 阴影规范

使用：

```txt
柔和阴影
```

禁止：

```txt
传统硬阴影
```

---

# 四、组件开发规范（核心）

## 4.1 组件开发原则

必须：

- 高复用
- 低耦合
- 单一职责
- 组件化开发

禁止：

```txt
页面内写大量重复代码
```

---

## 4.2 组件目录规范

统一结构：

```txt
components
├─ common
├─ business
├─ layout
├─ ui
```

---

## 4.3 组件命名规范

组件：

```txt
PascalCase
```

例如：

```txt
GenerateCard.vue
WorkspaceSidebar.vue
ImagePreviewDialog.vue
```

---

## 4.4 页面命名规范

页面：

```txt
kebab-case
```

例如：

```txt
workspace-panel.vue
package-center.vue
```

---

## 4.5 页面组件拆分规范

禁止：

```txt
单页面超过 500 行
```

必须拆分：

```txt
页面
→ 模块组件
→ 业务组件
→ UI组件
```

---

# 五、TailwindCSS 规范（重点）

## 5.1 必须优先使用 Tailwind

禁止：

```txt
大量自定义 css
```

---

## 5.2 样式原则

优先：

```txt
flex
grid
gap
```

禁止：

```txt
margin 魔法值
position absolute 乱布局
```

---

## 5.3 响应式规范

必须支持：

| 设备   | 宽度    |
| ------ | ------- |
| PC     | >= 1440 |
| Laptop | 1200    |
| Tablet | 768     |
| Mobile | 375     |

---

# 六、Naive UI 使用规范

## 6.1 必须优先使用 Naive UI

允许使用：

- NButton
- NModal
- NInput
- NDropdown
- NDrawer
- NPopover
- NTooltip
- NSkeleton
- NCard
- NTag
- NProgress

---

## 6.2 禁止行为

禁止：

```txt
重复封装已有组件
```

---

## 6.3 二次封装原则

仅允许：

```txt
业务组件封装
```

例如：

```txt
GenerateButton
PointsCard
PackageCard
```

---

# 七、页面开发规范

## 7.1 页面目录结构

```txt
pages
├─ home
├─ workspace
├─ package
├─ points
├─ account
```

---

## 7.2 页面结构规范

统一：

```txt
Page
→ Section
→ Card
→ Content
```

---

## 7.3 卡片规范

所有业务区域：

必须：

```txt
卡片化
```

卡片要求：

- hover 动效
- 柔和边框
- 深色背景
- 毛玻璃感

---

# 八、状态管理规范（Pinia）

## 8.1 Store 拆分规范

```txt
stores
├─ user.ts
├─ workspace.ts
├─ package.ts
├─ generate.ts
├─ points.ts
```

---

## 8.2 Store 原则

禁止：

```txt
所有状态写一个 store
```

---

## 8.3 Store 内容规范

store 中：

允许：

- state
- getters
- actions

禁止：

```txt
复杂 DOM 操作
```

---

# 九、接口规范（重点）

## 9.1 请求统一封装

必须：

```txt
Axios 二次封装
```

结构：

```txt
api
├─ request.ts
├─ user.ts
├─ workspace.ts
├─ generate.ts
```

---

## 9.2 请求规范

统一：

```ts
GET;
POST;
PUT;
DELETE;
```

禁止：

```txt
一个接口混乱调用
```

---

## 9.3 接口返回规范

统一格式：

```ts
{
  code: number;
  message: string;
  data: any;
}
```

---

## 9.4 Token 规范

必须：

- 请求自动携带 token
- 登录失效自动跳转
- 统一错误处理

---

# 十、TypeScript 规范

## 10.1 必须使用 TypeScript

禁止：

```txt
any 泛滥
```

---

## 10.2 类型目录

```txt
types
├─ user.ts
├─ workspace.ts
├─ generate.ts
```

---

## 10.3 API 类型规范

接口数据：

必须：

```txt
定义 interface/type
```

---

# 十一、AI 工作台规范（重点）

## 11.1 工作台布局

统一：

```txt
左侧：
功能菜单

中间：
工作区

右侧：
教程 / 历史记录
```

---

## 11.2 AI 状态规范

统一状态：

```txt
waiting
queue
generating
success
fail
```

---

## 11.3 AI Loading 规范

必须：

- 骨架屏
- loading 动画
- 进度状态
- 实时提示

禁止：

```txt
页面卡死
```

---

# 十二、WebSocket 规范

## 12.1 必须支持实时通信

用于：

- AI生成进度
- 排队状态
- 实时通知

---

## 12.2 推荐方案

```txt
socket.io-client
```

---

# 十三、性能优化规范

## 13.1 图片优化

必须：

- 图片压缩
- 懒加载
- WebP
- CDN

---

## 13.2 页面优化

必须：

- 路由懒加载
- 组件按需加载
- 虚拟滚动

---

# 十四、代码规范

## 14.1 禁止行为

禁止：

```txt
console.log 不删除
大量注释废代码
重复代码
魔法值
```

---

## 14.2 注释规范

复杂逻辑：

必须：

```txt
添加注释
```

---

## 14.3 函数规范

函数：

必须：

```txt
单一职责
```

禁止：

```txt
超长函数
```

---

# 十五、Git 提交规范

提交格式：

```txt
feat:
fix:
refactor:
style:
docs:
```

例如：

```txt
feat: 新增 AI 工作台上传功能
fix: 修复生成记录滚动问题
```

---

# 十六、目录结构规范（必须遵守）

```txt
src
├─ api
├─ assets
├─ business
├─ components
│
├─ composables
├─ constants
├─ directives
├─ layouts
├─ pages
├─ router
├─ services
├─ stores
├─ styles
├─ types
├─ utils
└─ workers
```

---

# 十七、页面开发规范（重点）

## 17.1 首页

首页必须包含：

- Hero 区域
- AI 能力展示
- 平台介绍
- 企业套餐
- AI 工作流介绍
- CTA 按钮

首页必须具备：

- 粒子背景
- 微动画
- 科技感视觉

---

## 17.2 工作台页面

工作台必须：

- 卡片化
- 模块化
- 实时状态
- AI Loading
- 拖拽上传
- 结果预览

---

## 17.3 企业套餐页面

必须：

- 套餐对比
- 权益展示
- 动态价格卡片
- 企业风格 UI

---

# 十八、Cursor / Codex 执行规范（重点）

Cursor / Codex 开发时：

必须：

- 严格遵守本 rules.md
- 不允许擅自更换技术栈
- 不允许随意新增组件库
- 不允许破坏页面风格统一
- 不允许使用传统后台 UI 风格
- 不允许写低复用代码
- 不允许页面直接堆代码
- 必须优先组件化
- 必须优先 TypeScript 类型化
- 必须优先 TailwindCSS
- 必须优先 Naive UI

---

# 十九、开发优先级

开发顺序：

```txt
基础框架
→ Layout
→ 首页
→ 工作台
→ AI 上传
→ AI 生成
→ 历史记录
→ 企业套餐
→ 积分系统
→ WebSocket
→ 动效优化
```

---

# 二十、最终目标

打造：

# AI 汽车视觉营销 SaaS 平台

具备：

- AI 工作台
- 企业 SaaS
- AI 图片生成
- AI 营销能力
- 高级科技风 UI
- 高复用前端架构

的完整前端系统。
