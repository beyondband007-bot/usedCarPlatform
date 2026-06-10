# 车型口播文案生成准备稿

## 目标

根据用户输入的车型名称，结合用户选择的参考视频风格，生成可用于数字人口播短视频的结构化文案草稿。视频风格、类型、镜头节奏必须跟随 `referenceMaterialId` 对应的参考素材。

## 输入字段

```json
{
  "vehicleName": "丰田凯美瑞运动款2.0T",
  "referenceMaterial": {
    "id": "ref-video-001",
    "title": "室内展厅数字人口播讲车",
    "videoType": "indoor_showroom_host_walkthrough",
    "styleJson": {},
    "stylePrompt": ""
  },
  "durationSeconds": 20,
  "sellingPointHints": ["运动外观", "空间舒适", "家用省心"],
  "vehicleImageSummary": "用户上传外观图显示车辆为白色轿车，车身干净，内饰为黑色座舱。"
}
```

## System Prompt

你是二手车短视频口播文案策划，负责根据车型名称和参考视频风格生成中文短视频文案。你必须遵守：

1. 只输出 JSON，不输出 Markdown 或解释。
2. 文案必须适合数字人口播，口语化、销售导向、可信，不要像说明书。
3. 视频类型、镜头节奏、场景氛围必须跟随输入的 `referenceMaterial.videoType`、`styleJson` 和 `stylePrompt`。
4. 不得编造无法从车型名称合理推断的具体年份、公里数、事故记录、价格、过户次数、官方配置或金融政策。
5. 如果车型名称无法确认具体配置，只能使用“运动外观、空间、舒适性、家用场景、到店看车”等稳妥表达。
6. 如果用户上传图片摘要包含颜色、内饰、外观状态，可以写入文案；没有图片摘要时不要假设车色和内饰。
7. 文案要自然带出行动号召，但不能承诺虚假优惠。
8. 输出中 `shotCues` 要把口播和画面绑定，方便后端后续拼接数字人、车辆参考图和视频模型 Prompt。

## User Prompt Template

```text
请为以下车型生成数字人口播短视频文案。

车型名称：{{vehicleName}}
视频时长：{{durationSeconds}} 秒
用户补充卖点：{{sellingPointHints}}
车辆图片摘要：{{vehicleImageSummary}}

参考视频风格：
标题：{{referenceMaterial.title}}
视频类型：{{referenceMaterial.videoType}}
风格标签：{{referenceMaterial.styleJson.styleTags}}
场景风格：{{referenceMaterial.styleJson.sceneStyle}}
灯光：{{referenceMaterial.styleJson.lighting}}
镜头语言：{{referenceMaterial.styleJson.cameraLanguage}}
节奏：{{referenceMaterial.styleJson.pacing}}
适配车型：{{referenceMaterial.styleJson.applicableCarTypes}}
禁用方向：{{referenceMaterial.styleJson.avoid}}
可复用风格 Prompt：{{referenceMaterial.stylePrompt}}

请输出符合 schema 的 JSON。
```

## 输出 Schema

```json
{
  "vehicleName": "string",
  "referenceMaterialId": "string",
  "videoType": "string",
  "openingHook": "string",
  "scriptText": "string",
  "sellingPoints": ["string"],
  "shotCues": [
    {
      "timeRange": "0-4s",
      "visual": "string",
      "voiceover": "string",
      "assetRole": "exterior|interior|digital_human|reference_style|mixed"
    }
  ],
  "stylePrompt": "string",
  "riskNotes": ["string"]
}
```

## 示例输出

```json
{
  "vehicleName": "丰田凯美瑞运动款2.0T",
  "referenceMaterialId": "ref-video-001",
  "videoType": "indoor_showroom_host_walkthrough",
  "openingHook": "想找一台看着运动、开着省心、家用也舒服的合资轿车，可以重点看看这台凯美瑞运动款。",
  "scriptText": "想找一台看着运动、开着省心、家用也舒服的合资轿车，可以重点看看这台凯美瑞运动款。外观走的是更年轻的运动风格，车身线条干净利落，日常通勤和家庭出行都不违和。2.0T 这个关键词也很明确，适合想要动力响应更从容的用户。坐进车内，空间、舒适性和丰田一贯的省心属性，都是它容易打动人的地方。如果你正在看一台好开、好养、也有一点运动感的家用轿车，这台值得到店实看。",
  "sellingPoints": ["运动化外观", "家用舒适", "动力响应更从容", "省心耐用印象", "适合通勤和家庭出行"],
  "shotCues": [
    {
      "timeRange": "0-4s",
      "visual": "数字人站在展厅车辆前，车头和前45度外观入画。",
      "voiceover": "想找一台看着运动、开着省心、家用也舒服的合资轿车，可以重点看看这台凯美瑞运动款。",
      "assetRole": "mixed"
    },
    {
      "timeRange": "4-10s",
      "visual": "切换外观侧面、轮毂、灯组和车身线条。",
      "voiceover": "外观走的是更年轻的运动风格，车身线条干净利落，日常通勤和家庭出行都不违和。",
      "assetRole": "exterior"
    },
    {
      "timeRange": "10-16s",
      "visual": "切入内饰、方向盘、中控和座椅空间。",
      "voiceover": "坐进车内，空间、舒适性和丰田一贯的省心属性，都是它容易打动人的地方。",
      "assetRole": "interior"
    },
    {
      "timeRange": "16-20s",
      "visual": "数字人回到车旁总结，画面保持展厅口播风格。",
      "voiceover": "如果你正在看一台好开、好养、也有一点运动感的家用轿车，这台值得到店实看。",
      "assetRole": "digital_human"
    }
  ],
  "stylePrompt": "采用室内展厅数字人口播讲车风格，明亮展厅光、真实销售现场感、人物车旁讲解，穿插外观和内饰细节，节奏中等偏快。",
  "riskNotes": ["车型名称未提供年份、车况、里程和价格，文案未编造这些信息。"]
}
```
