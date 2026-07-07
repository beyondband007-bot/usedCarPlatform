# 二手车移动端 SaaS 小程序 1.0 开发文档

> 项目名称：`car_wx`  
> 技术方向：微信小程序优先，兼容 H5  
> 核心目标：完成车辆任务创建、规范拍摄、图片上传、素材管理、AI 处理结果查看的完整闭环  
> 当前版本：V1.0 MVP

> **2026-07-01 范围修订（优先级高于下文旧规划）**：V1.0 移动端用户只负责创建车辆任务、按拍摄位拍照并上传。取消独立“素材”模块、素材 Tab、素材列表/详情页面及素材管理接口；下文涉及素材库、素材详情、素材删除、设置封面的内容均不属于 V1.0 验收范围。

---

## 1. 项目定位

本项目是二手车 SaaS 平台的移动端入口，主要服务于车辆拍摄人员、门店员工和运营人员。

第一版本不做完整二手车交易平台，重点解决以下问题：

1. 在手机端快速创建车辆任务。
2. 按规定角度拍摄车辆照片。
3. 将图片稳定上传至后端。
4. 查看车辆原始素材和 AI 处理结果。
5. 查看积分余额、套餐状态和基础设置。
6. 保证弱网、上传失败、页面退出等场景下，任务数据不会轻易丢失。

---

## 2. 技术栈

```text
框架：uni-app
基础工程：unibest
语言：Vue 3 + TypeScript
构建工具：Vite
包管理器：pnpm
UI 组件库：Wot UI v2
状态管理：Pinia
原子化样式：UnoCSS
CSS 预处理：SCSS
目标平台：微信小程序 + H5
开发工具：VS Code
调试工具：微信开发者工具
```

### 2.1 运行命令

```bash
pnpm install

# 微信小程序
pnpm dev:mp-weixin

# H5
pnpm dev:h5

# 微信小程序生产构建
pnpm build:mp-weixin
```

微信开发者工具导入目录：

```text
dist/dev/mp-weixin
```

---

## 3. V1.0 功能范围

### 3.1 必须实现

```text
微信登录
账号登录兜底
工作台首页
车辆任务列表
创建车辆任务
车辆详情
拍摄引导
拍照与相册选择
图片预览
单张上传
上传进度
上传失败重试
车辆素材库
AI 处理记录
AI 结果详情
积分账户
基础设置
登录状态持久化
接口统一错误处理
```

### 3.2 暂不实现

```text
在线购车
车辆支付
复杂订单体系
团队权限管理
多门店管理
复杂数据报表
视频生成
视频发布
直播功能
即时聊天
社区功能
多语言
App 原生能力
复杂离线同步
```

---

## 4. 页面目录

```text
src/pages
├─ auth
│  └─ login.vue                 登录
│
├─ home
│  └─ index.vue                 工作台首页
│
├─ vehicle
│  ├─ list.vue                  车辆任务
│  ├─ detail.vue                车辆详情
│  └─ create.vue                创建车辆
│
├─ capture
│  ├─ index.vue                 拍摄引导
│  ├─ upload.vue                图片上传
│  └─ preview.vue               图片预览
│
├─ asset
│  ├─ index.vue                 车辆素材库
│  └─ detail.vue                素材详情
│
├─ result
│  ├─ list.vue                  AI 处理记录
│  └─ detail.vue                处理结果
│
└─ user
   ├─ index.vue                 个人中心
   ├─ points.vue                积分账户
   └─ settings.vue              设置
```

---

## 5. 页面规划

## 5.1 登录页

文件：

```text
src/pages/auth/login.vue
```

### 页面目标

完成用户身份验证，并将登录状态写入本地缓存和 Pinia。

### 页面内容

```text
品牌 Logo
产品名称
微信快捷登录
手机号或账号登录
用户协议
隐私政策
登录加载状态
登录失败提示
```

### 登录方式

V1.0 推荐支持两种方式：

1. 微信授权登录。
2. 账号密码登录，用于测试、审核和特殊账号。

### 交互要求

- 登录按钮点击后必须进入 Loading 状态。
- 登录过程中禁止重复提交。
- 登录成功后进入首页。
- Token 失效后自动跳转登录页。
- 登录页不显示底部导航。
- 用户未同意协议时禁止提交。

---

## 5.2 工作台首页

文件：

```text
src/pages/home/index.vue
```

### 页面目标

展示用户当前最需要处理的车辆任务，并提供快速拍摄入口。

### 页面模块

```text
顶部用户信息
当前门店或账号信息
快捷拍摄入口
任务数据概览
待拍摄车辆
上传中的车辆
AI 处理中车辆
最近处理结果
积分余额
```

### 数据卡片建议

```text
待拍摄
待补充
上传中
处理中
已完成
```

### 快捷入口

```text
创建车辆
继续拍摄
查看素材
查看结果
```

### 注意事项

- 首页不要设计为商城首页。
- 重点突出“继续拍摄”和“创建车辆”。
- 数据卡片最多展示 4～5 个。
- 最近任务最多展示 3 条。
- 首页接口允许并行请求，但应有 Skeleton 状态。

---

## 5.3 车辆任务列表

文件：

```text
src/pages/vehicle/list.vue
```

### 页面目标

查看所有车辆任务，并根据状态筛选。

### 筛选状态

```text
全部
待拍摄
拍摄中
待补充
上传中
处理中
已完成
失败
```

### 单个车辆卡片信息

```text
车辆封面
车辆名称
车辆编号
车牌号
已上传图片数量
必拍图片完成数量
当前状态
更新时间
```

### 操作按钮

根据状态显示：

```text
开始拍摄
继续拍摄
补充图片
查看详情
查看结果
重新提交
```

### 列表要求

- 支持下拉刷新。
- 支持上拉分页。
- 使用分页请求，不允许一次加载全部数据。
- 空状态必须显示引导按钮。
- 状态标签颜色保持统一。
- 删除任务必须二次确认。

---

## 5.4 创建车辆

文件：

```text
src/pages/vehicle/create.vue
```

### 页面目标

创建新的车辆拍摄任务。

### V1.0 字段

```text
车辆品牌
车辆车系
车辆型号
车辆颜色
车牌号
车架号
上牌时间
行驶里程
车辆备注
```

### 必填字段

```text
车辆品牌
车辆车系
车辆型号
车辆颜色
车辆编号或车架号
```

### 表单要求

- 使用 Wot UI 表单组件。
- 必填项必须校验。
- 行驶里程只允许输入数字。
- 车架号自动转大写。
- 提交时禁止重复点击。
- 创建成功后进入拍摄引导页。
- 页面退出前如有未保存内容，需要提示用户。

---

## 5.5 车辆详情

文件：

```text
src/pages/vehicle/detail.vue
```

### 页面目标

查看车辆基础信息、拍摄完成情况、上传状态和 AI 状态。

### 页面模块

```text
车辆基础信息
拍摄进度
图片数量
上传状态
AI 处理状态
异常提示
任务操作
```

### 操作入口

```text
继续拍摄
查看素材
查看 AI 结果
编辑车辆信息
删除车辆任务
重新提交
```

---

## 5.6 拍摄引导

文件：

```text
src/pages/capture/index.vue
```

### 页面目标

按照固定拍摄角度，引导用户完成车辆照片采集。

### 推荐拍摄角度

#### 外观

```text
左前 45°
右前 45°
左后 45°
右后 45°
正前
正后
左侧
右侧
```

#### 内饰

```text
中控台
方向盘
仪表盘
前排座椅
后排座椅
车门内饰
```

#### 车辆细节

```text
发动机舱
后备箱
轮胎
钥匙
铭牌
车辆瑕疵
其他图片
```

### 单个拍摄卡槽包含

```text
拍摄参考图
拍摄角度名称
拍摄说明
完成状态
重拍按钮
删除按钮
查看大图
上传状态
```

### 交互要求

- 必拍项与选拍项需要明显区分。
- 已拍摄角度显示缩略图。
- 上传失败项显示重试按钮。
- 页面顶部显示整体拍摄进度。
- 必拍项未完成时，不允许提交任务。
- 拍完一张后立即进入上传队列。
- 不要等所有图片拍完后再一次性上传。

---

## 5.7 图片上传

文件：

```text
src/pages/capture/upload.vue
```

### 页面目标

展示当前车辆全部图片的上传状态，并支持失败重试。

### 上传状态

```ts
export type UploadStatus =
  | 'waiting'
  | 'uploading'
  | 'success'
  | 'failed'
  | 'cancelled'
```

### 上传策略

```text
拍摄或选择图片
  ↓
本地生成临时记录
  ↓
加入上传队列
  ↓
单张上传
  ↓
后端返回图片地址
  ↓
更新车辆图片记录
  ↓
继续下一张
```

### V1.0 上传限制

```text
默认并发数：2
单张图片最大：20MB
支持格式：JPG、JPEG、PNG、WEBP
上传失败自动重试：2 次
自动重试仍失败：转为手动重试
```

### 必须处理

- 网络中断。
- 请求超时。
- Token 失效。
- 图片过大。
- 图片格式错误。
- 用户退出页面。
- 上传过程中切换后台。
- 重复上传。
- 同一拍摄位重新拍摄。

---

## 5.8 图片预览

文件：

```text
src/pages/capture/preview.vue
```

### 页面目标

查看单张或多张车辆图片，并执行重拍、删除和确认操作。

### 操作

```text
上一张
下一张
放大查看
重新拍摄
删除图片
设为封面
确认使用
```

### 注意事项

- 删除远程图片时必须同步调用后端接口。
- 删除本地未上传图片时，只清理本地状态。
- 重新拍摄后，应替换当前拍摄位原有图片。
- 设为封面后同步更新车辆封面字段。

---

## 5.9 车辆素材库

文件：

```text
src/pages/asset/index.vue
```

### 页面目标

查看原始上传图片、处理中图片和 AI 生成图片。

### 分类

```text
原始素材
AI 生成
处理中
失败素材
```

### 筛选条件

```text
车辆
素材类型
生成状态
上传时间
```

### 布局要求

- 移动端使用双列瀑布流。
- 单个卡片显示图片、车辆名称、类型和状态。
- 不允许一次加载全部图片。
- 大图使用单独预览页面。
- 图片加载失败显示默认占位图。

---

## 5.10 素材详情

文件：

```text
src/pages/asset/detail.vue
```

### 页面内容

```text
大图预览
车辆信息
素材类型
拍摄角度
上传时间
图片尺寸
文件大小
处理状态
来源信息
```

### 操作

```text
保存到相册
设为封面
删除素材
重新处理
查看关联结果
```

---

## 5.11 AI 处理记录

文件：

```text
src/pages/result/list.vue
```

### 页面目标

查看车辆图片的 AI 处理任务。

### 任务状态

```text
排队中
处理中
处理成功
处理失败
已取消
```

### 单条记录内容

```text
车辆名称
处理类型
原图缩略图
结果图缩略图
任务状态
创建时间
完成时间
积分消耗
```

### V1.0 处理类型

```text
车辆抠图
场景合成
画质增强
车漆优化
内饰清洁
```

---

## 5.12 处理结果详情

文件：

```text
src/pages/result/detail.vue
```

### 页面内容

```text
原图
结果图
对比查看
处理类型
处理参数
任务状态
失败原因
积分消耗
完成时间
```

### 操作

```text
保存图片
重新生成
查看原图
查看结果
删除记录
```

### 注意事项

- 处理中状态需要轮询。
- 页面离开后停止轮询。
- 重新进入页面后重新查询状态。
- 失败状态必须展示明确原因。
- V1.0 不强制接入 WebSocket。

---

## 5.13 个人中心

文件：

```text
src/pages/user/index.vue
```

### 页面模块

```text
用户头像
用户名称
账号信息
当前套餐
积分余额
使用记录
联系客服
设置
退出登录
```

### 快捷入口

```text
积分账户
套餐信息
使用记录
联系客服
系统设置
```

---

## 5.14 积分账户

文件：

```text
src/pages/user/points.vue
```

### 页面内容

```text
当前积分
累计充值
累计消耗
积分明细
套餐状态
到期时间
```

### 积分明细类型

```text
充值
任务消耗
失败退回
活动赠送
系统调整
```

### V1.0 说明

第一版可只展示积分和明细，不强制实现小程序内支付。

---

## 5.15 设置

文件：

```text
src/pages/user/settings.vue
```

### 页面内容

```text
图片上传质量
是否允许相册选择
上传并发数量
清理本地缓存
隐私政策
用户协议
版本信息
退出登录
```

### 推荐设置项

```text
图片质量：原图 / 高清 / 标准
弱网时是否继续上传
上传失败是否自动重试
是否保留本地临时记录
```

---

## 6. 底部导航

V1.0 推荐 4 个主导航：

```text
首页
车辆
素材
我的
```

拍摄功能不单独占用底部导航，使用首页主按钮和车辆详情入口进入。

推荐配置：

```ts
export const tabBarItems = [
  {
    text: '首页',
    pagePath: 'pages/home/index',
  },
  {
    text: '车辆',
    pagePath: 'pages/vehicle/list',
  },
  {
    text: '素材',
    pagePath: 'pages/asset/index',
  },
  {
    text: '我的',
    pagePath: 'pages/user/index',
  },
]
```

---

## 7. 推荐项目目录

```text
src
├─ api
│  ├─ auth.ts
│  ├─ home.ts
│  ├─ vehicle.ts
│  ├─ capture.ts
│  ├─ asset.ts
│  ├─ result.ts
│  ├─ points.ts
│  └─ user.ts
│
├─ components
│  ├─ AppNavbar.vue
│  ├─ AppEmpty.vue
│  ├─ AppLoading.vue
│  ├─ VehicleCard.vue
│  ├─ VehicleStatusTag.vue
│  ├─ CaptureSlot.vue
│  ├─ UploadProgress.vue
│  ├─ AssetCard.vue
│  ├─ ResultCard.vue
│  └─ PointsCard.vue
│
├─ composables
│  ├─ useAuth.ts
│  ├─ useVehicle.ts
│  ├─ useCapture.ts
│  ├─ useUploadQueue.ts
│  ├─ usePagination.ts
│  ├─ usePermission.ts
│  └─ usePolling.ts
│
├─ constants
│  ├─ vehicle.ts
│  ├─ capture.ts
│  ├─ upload.ts
│  └─ storage.ts
│
├─ layouts
│  ├─ default.vue
│  └─ tabbar.vue
│
├─ pages
│
├─ services
│  ├─ request.ts
│  ├─ upload.ts
│  ├─ storage.ts
│  └─ logger.ts
│
├─ stores
│  ├─ user.ts
│  ├─ vehicle.ts
│  ├─ upload.ts
│  └─ app.ts
│
├─ styles
│  ├─ variables.scss
│  ├─ theme.scss
│  ├─ mixins.scss
│  └─ global.scss
│
├─ types
│  ├─ api.ts
│  ├─ auth.ts
│  ├─ vehicle.ts
│  ├─ upload.ts
│  ├─ asset.ts
│  └─ result.ts
│
├─ utils
│  ├─ format.ts
│  ├─ validate.ts
│  ├─ image.ts
│  ├─ permission.ts
│  └─ error.ts
│
├─ App.vue
└─ main.ts
```

---

## 8. 核心数据模型

## 8.1 用户

```ts
export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  phone?: string
  tenantId?: string
  tenantName?: string
  points: number
  packageName?: string
  packageExpireAt?: string
}
```

## 8.2 车辆

```ts
export type VehicleTaskStatus =
  | 'draft'
  | 'waiting_capture'
  | 'capturing'
  | 'waiting_complete'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'

export interface VehicleTask {
  id: string
  brandName: string
  seriesName: string
  modelName: string
  colorName: string
  plateNumber?: string
  vin?: string
  mileage?: number
  registerDate?: string
  coverUrl?: string
  photoCount: number
  requiredPhotoCount: number
  status: VehicleTaskStatus
  remark?: string
  createdAt: string
  updatedAt: string
}
```

## 8.3 拍摄位

```ts
export interface CapturePosition {
  code: string
  name: string
  category: 'exterior' | 'interior' | 'detail' | 'damage' | 'other'
  required: boolean
  referenceImage?: string
  description?: string
  sort: number
}
```

## 8.4 上传任务

```ts
export interface UploadTask {
  id: string
  vehicleId: string
  captureCode: string
  localPath: string
  remoteUrl?: string
  fileName?: string
  fileSize?: number
  progress: number
  retryCount: number
  status: 'waiting' | 'uploading' | 'success' | 'failed' | 'cancelled'
  errorMessage?: string
  createdAt: number
}
```

## 8.5 车辆素材

```ts
export interface VehicleAsset {
  id: string
  vehicleId: string
  assetType: 'original' | 'generated'
  captureCode?: string
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  fileSize?: number
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  createdAt: string
}
```

## 8.6 AI 处理任务

```ts
export type AiTaskType =
  | 'remove_background'
  | 'scene_generation'
  | 'image_enhancement'
  | 'paint_optimization'
  | 'interior_cleanup'

export interface AiResultTask {
  id: string
  vehicleId: string
  taskType: AiTaskType
  sourceAssetId: string
  sourceUrl: string
  resultUrl?: string
  status: 'queued' | 'processing' | 'success' | 'failed' | 'cancelled'
  pointsCost: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
}
```

---

## 9. Pinia 状态设计

## 9.1 userStore

负责：

```text
Token
用户信息
积分余额
套餐信息
登录状态
退出登录
```

## 9.2 vehicleStore

负责：

```text
当前车辆
车辆列表缓存
车辆筛选条件
拍摄完成进度
```

## 9.3 uploadStore

负责：

```text
上传任务队列
上传并发控制
上传进度
失败任务
自动重试
页面切换后的任务恢复
```

## 9.4 appStore

负责：

```text
主题
系统信息
网络状态
应用版本
全局加载状态
```

---

## 10. 接口设计

统一前缀示例：

```text
/api/miniapp
```

## 10.1 登录

```http
POST /api/miniapp/auth/wechat-login
POST /api/miniapp/auth/password-login
POST /api/miniapp/auth/refresh-token
GET  /api/miniapp/auth/profile
POST /api/miniapp/auth/logout
```

## 10.2 首页

```http
GET /api/miniapp/home/summary
GET /api/miniapp/home/recent-vehicles
GET /api/miniapp/home/recent-results
```

## 10.3 车辆

```http
GET    /api/miniapp/vehicles
POST   /api/miniapp/vehicles
GET    /api/miniapp/vehicles/:id
PUT    /api/miniapp/vehicles/:id
DELETE /api/miniapp/vehicles/:id
POST   /api/miniapp/vehicles/:id/submit
```

## 10.4 拍摄和上传

```http
GET    /api/miniapp/vehicles/:id/capture-positions
POST   /api/miniapp/vehicles/:id/photos
DELETE /api/miniapp/vehicles/:id/photos/:photoId
PUT    /api/miniapp/vehicles/:id/photos/:photoId
POST   /api/miniapp/vehicles/:id/photos/:photoId/retry
```

## 10.5 素材

```http
GET    /api/miniapp/assets
GET    /api/miniapp/assets/:id
DELETE /api/miniapp/assets/:id
PUT    /api/miniapp/assets/:id/cover
```

## 10.6 AI 结果

```http
GET  /api/miniapp/results
GET  /api/miniapp/results/:id
POST /api/miniapp/results/:id/retry
POST /api/miniapp/results/:id/cancel
```

## 10.7 积分

```http
GET /api/miniapp/points/summary
GET /api/miniapp/points/records
```

---

## 11. 请求封装规范

所有请求必须经过统一请求层。

```ts
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId?: string
}
```

### 请求层职责

```text
自动添加 Token
自动添加租户信息
自动处理 401
统一错误提示
统一超时处理
统一 Loading 控制
统一日志记录
防止重复提交
```

### 错误码约定

```text
401：登录失效
403：无权限
404：资源不存在
409：数据冲突
422：参数错误
429：请求频繁
500：服务异常
```

---

## 12. 图片上传方案

## 12.1 V1.0 推荐方案

```text
小程序选择图片
  ↓
uni.uploadFile
  ↓
业务后端
  ↓
OSS / COS
  ↓
后端保存图片记录
```

### 原因

- 实现简单。
- 权限控制集中。
- 日志和异常容易追踪。
- 适合 MVP。
- 后续可以升级为客户端直传 OSS。

## 12.2 上传队列规则

```text
最大并发：2
上传成功：立即写入后端记录
上传失败：自动重试 2 次
自动重试失败：保留失败状态
页面退出：队列仍保存在 Pinia 和本地缓存
重新进入：恢复未完成任务
```

## 12.3 本地持久化

建议保存：

```text
当前车辆 ID
未完成上传任务
本地图片路径
失败原因
重试次数
拍摄完成状态
```

注意：小程序临时文件路径可能失效，长时间保存时应使用 `uni.saveFile` 转为本地持久文件。

---

## 13. 权限处理

需要处理以下权限：

```text
相机权限
相册权限
保存到相册权限
网络权限
```

### 权限拒绝后的处理

- 禁止直接无限重复弹窗。
- 展示明确原因。
- 提供“前往设置”按钮。
- 返回页面后重新检查权限。
- H5 环境隐藏不支持的能力。

---

## 14. 视觉规范

## 14.1 风格

```text
简洁
专业
偏工具型
少装饰
高信息密度
移动端优先
轻科技感
```

## 14.2 推荐色彩

```scss
$color-primary: #3B82F6;
$color-success: #16A34A;
$color-warning: #F59E0B;
$color-danger: #EF4444;

$color-bg: #F5F7FA;
$color-card: #FFFFFF;
$color-text-primary: #111827;
$color-text-secondary: #6B7280;
$color-border: #E5E7EB;
```

## 14.3 尺寸建议

```text
页面左右边距：24rpx
卡片间距：20rpx
按钮高度：88rpx
输入框高度：88rpx
卡片圆角：16rpx
按钮圆角：12rpx
缩略图圆角：12rpx
```

### 视觉限制

- 不使用大面积渐变。
- 不使用过多玻璃拟态。
- 不使用复杂阴影。
- 不让按钮过度抢眼。
- 不在移动端堆叠过多统计图表。
- 统一使用 Wot UI 组件作为基础交互。

---

## 15. 通用组件规划

### VehicleCard

展示车辆任务。

```ts
interface VehicleCardProps {
  vehicle: VehicleTask
  showProgress?: boolean
  showActions?: boolean
}
```

### CaptureSlot

展示单个拍摄角度。

```ts
interface CaptureSlotProps {
  position: CapturePosition
  asset?: VehicleAsset
  uploadTask?: UploadTask
}
```

### UploadProgress

展示上传状态和进度。

```ts
interface UploadProgressProps {
  progress: number
  status: UploadStatus
  errorMessage?: string
}
```

### VehicleStatusTag

统一车辆状态颜色和文本。

### AppEmpty

统一空状态。

### AppLoading

统一页面级和局部 Loading。

---

## 16. 关键业务流程

## 16.1 创建并拍摄车辆

```text
登录
  ↓
进入工作台
  ↓
点击创建车辆
  ↓
填写车辆信息
  ↓
创建成功
  ↓
进入拍摄引导
  ↓
按角度拍摄
  ↓
单张自动上传
  ↓
必拍项完成
  ↓
提交任务
  ↓
进入 AI 处理状态
```

## 16.2 上传失败

```text
图片上传失败
  ↓
自动重试
  ↓
仍然失败
  ↓
显示失败状态
  ↓
用户点击重试
  ↓
重新进入上传队列
```

## 16.3 AI 处理

```text
车辆任务提交
  ↓
后端创建 AI 任务
  ↓
前端显示排队中
  ↓
定时轮询
  ↓
处理成功或失败
  ↓
进入结果详情
```

---

## 17. 页面加载状态

每个页面必须至少处理以下状态：

```text
首次加载
加载成功
数据为空
加载失败
下拉刷新
加载更多
网络异常
登录失效
```

禁止只处理成功状态。

---

## 18. 性能要求

```text
列表必须分页。
图片必须使用缩略图。
大图进入详情后再加载。
图片组件开启懒加载。
上传并发不超过 2。
首页接口尽量并行。
轮询间隔建议 3～5 秒。
页面离开后停止无用轮询。
不在 Pinia 中长期保存大体积 Base64。
不在前端保存原始图片二进制。
```

---

## 19. 安全要求

```text
Token 不写入代码。
接口域名通过环境变量配置。
生产环境禁止打印敏感信息。
上传接口校验文件类型和大小。
车辆数据必须按用户或租户隔离。
删除操作必须二次确认。
账号退出时清理 Token 和业务缓存。
```

环境变量示例：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_UPLOAD_MAX_SIZE=20971520
VITE_UPLOAD_CONCURRENCY=2
```

---

## 20. 开发阶段规划

## 第一阶段：基础工程

```text
完成项目启动
配置环境变量
配置请求封装
配置 Pinia
配置登录拦截
配置底部导航
建立页面目录
建立类型目录
```

## 第二阶段：登录和工作台

```text
完成登录页
完成用户状态
完成首页布局
完成首页数据接口
```

## 第三阶段：车辆任务

```text
车辆列表
创建车辆
车辆详情
状态筛选
分页加载
```

## 第四阶段：拍照上传

```text
拍摄引导
相机和相册权限
图片预览
上传队列
上传进度
失败重试
本地恢复
```

## 第五阶段：素材和结果

```text
素材列表
素材详情
AI 任务列表
结果详情
轮询状态
保存图片
```

## 第六阶段：个人中心

```text
个人中心
积分账户
设置
退出登录
```

## 第七阶段：测试和发布

```text
微信真机测试
弱网测试
上传中断测试
权限拒绝测试
Token 失效测试
小程序分包检查
生产构建
体验版发布
```

---

## 21. V1.0 验收标准

满足以下条件才视为第一版完成：

### 登录

- 能正常登录。
- Token 能持久化。
- Token 失效能回到登录页。

### 车辆

- 能创建车辆。
- 能查看车辆列表和详情。
- 能根据状态筛选。
- 能保存车辆基本信息。

### 拍摄上传

- 能调用手机相机。
- 能从相册选择图片。
- 能按拍摄位保存图片。
- 能显示上传进度。
- 上传失败能重试。
- 页面重新进入后能恢复任务状态。
- 必拍项未完成时不能提交。

### 素材

- 能查看车辆原始图片。
- 能查看图片详情。
- 能删除和设置封面。

### AI 结果

- 能查看 AI 任务状态。
- 能查看成功结果。
- 能查看失败原因。
- 能保存结果图片。

### 用户

- 能查看积分余额。
- 能查看积分明细。
- 能修改基础设置。
- 能退出登录。

---

## 22. 开发约束

1. 所有业务接口必须放在 `src/api`。
2. 所有接口类型必须定义在 `src/types`。
3. 页面中禁止直接拼接接口地址。
4. 页面中禁止直接操作 Token。
5. 上传逻辑必须抽离到 `useUploadQueue` 或 `services/upload.ts`。
6. 状态颜色和状态文案必须统一维护。
7. 页面中不允许大量复制重复组件。
8. 所有异步请求必须处理异常。
9. 所有提交按钮必须防止重复点击。
10. 不得为追求视觉效果引入复杂动画。
11. 不得在 V1.0 中提前加入未确认的复杂业务。
12. 所有页面必须优先保证微信小程序可用，再兼容 H5。

---

## 23. Codex 执行建议

该项目基础搭建、页面结构、类型设计、接口层和上传队列更适合交给 Codex 执行。

建议分阶段提交任务，不要一次性要求完成全部页面：

```text
阶段 1：工程配置、目录、请求、状态管理
阶段 2：登录、首页、底部导航
阶段 3：车辆任务
阶段 4：拍照上传
阶段 5：素材和结果
阶段 6：个人中心和联调
```

每个阶段完成后进行一次：

```text
类型检查
lint
微信小程序构建
真机验证
代码提交
```

---

## 24. 最终目标

V1.0 不追求功能数量，而是确保以下核心闭环稳定：

```text
创建车辆
  ↓
规范拍照
  ↓
可靠上传
  ↓
查看素材
  ↓
查看 AI 处理结果
```

第一版本完成后，再逐步扩展团队管理、套餐支付、车辆视频生成、数据统计和多端发布能力。
