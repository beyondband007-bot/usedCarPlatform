import { resolveLogoPlacements } from "../../shared/logoPlacements";
import type { LogoPlacement } from "../../shared/types";
import type { BatchVisualConfig } from "./batchTypes";

const sceneInstruction =
  "请将第一张车自然放入第二张场景中，保持车辆真实车型、车身比例、车漆原色、轮毂、灯组、车窗结构和原车拍摄角度一致，车身完整，轮胎和车顶不要裁切。让车辆与目标场景的地面接触、透视关系、阴影、环境反射和整体光照自然融合，严格参考第二张场景图的空间结构、地面材质、光线方向、景深和环境氛围。";

const preserveSceneInstruction =
  "请在保留原始车辆和背景画面的基础上处理车辆外观，保持原车车型、结构、车身比例、车漆原色、轮毂、灯组、背景环境和拍摄角度不变，车身完整，不要裁切轮胎和车顶。";

const lightInstruction =
  "请对车辆外观进行光污一致化处理，重点修复车身表面因环境光、反光、炫光、色偏和曝光不均造成的视觉不一致问题，弱化强烈反光、杂乱倒影、过曝光斑和异常色彩干扰，使车身光线更加均匀自然、漆面质感稳定统一。";

const paintInstruction =
  "请对整车外观进行清洁与烤漆翻新预览处理，清除车身表面的灰尘、污渍、暗沉感和老旧痕迹，增强漆面亮度、通透度、镜面反射和高级质感，让轮毂更加干净并呈现金属光泽。车漆颜色默认保持原车颜色，不主动改色。";

const plateLogoInstruction = (logoImageLabel: string) =>
  `${logoImageLabel}是 Logo / 标识参考图。如果上传车辆图片中原本能看到车牌或车牌框，请将 ${logoImageLabel}中的 Logo / 标识清晰、端正、自然地贴合到可见车牌区域，符合原车牌区域的透视、尺寸、弯曲、遮挡、阴影、反射和光照关系；不要变形，不要漂浮，不要额外生成其它文字。如果上传车辆角度看不到车牌、只有车身侧面看不到车牌区域，或车牌区域被遮挡，请不要强行新增车牌、不要新增车牌处 Logo、不要把车牌处 Logo 贴到车身、车窗、地面或背景上。`;

const wallLogoInstruction = (logoImageLabel: string) =>
  `${logoImageLabel}是 Logo / 标识参考图。背景墙 Logo 只参考 ${logoImageLabel}中的文字轮廓、字形结构和图形符号，不参考也不要复制它的底色、底板、材质、外框、边框、螺丝、铆钉、牌匾造型、车牌比例或装饰风格。请将提取出的标识重新设计为目标场景后方背景墙上的品牌墙主视觉，例如浅灰金属立体字、白色亚克力字、磨砂银墙面字或轻微背光发光字；标识应直接附着在墙面上，与展厅灯光和简洁高级的装修风格一致。背景墙 Logo 需要中等偏大、清晰可读，成为墙面的主要品牌识别元素，宽度约占车辆车身可见宽度的 35% 到 55%，或占后方主墙面宽度的 25% 到 40%，不要过小、不要像角标。不要生成任何矩形牌子、黑色底牌、金色边框、螺丝固定件或悬挂牌匾，不要让墙面 Logo 像车牌。位置要自然，通常位于车辆后方上方或主墙视觉中心，不要遮挡车辆主体，不要贴到车牌、车身、车窗、地面或前景物体上，不要新增多余文字。`;

const negativeInstruction =
  "不要人物、不要杂物、不要额外文字、不要车牌号，不要生成多辆车，不要改变车型，不要车体扭曲，不要轮胎畸形。输出适合二手车电商批量上新的真实汽车广告主图，画面干净、高级、统一。";

export const batchInteriorPrompt =
  "请对上传的车辆内饰图进行清洁增强处理，重点提升方向盘、座椅、仪表台、中控区域、门板、扶手、地毯和脚垫区域的整洁度、清爽感与材质质感。保留原车内饰结构、布局、材质、颜色、屏幕内容和拍摄角度不变。清除灰尘、污渍、使用痕迹、油光、杂乱感和局部脏污，让皮革、塑料、金属、织物、木纹或碳纤维等材质呈现更加干净、细腻、自然的质感。整体画面需要真实、明亮、舒适，呈现车辆内饰焕然一新但不过度修饰的展示效果。不要改变内饰颜色，不要改变座椅和方向盘形状，不要新增文字，不要生成外观场景。";

const batchInteriorSceneCorePrompt =
  "第一张图片是车辆内饰原图，第二张图片是本批次外观图共同使用的目标场景。严格保持第一张图片中的车型身份、方向盘、中控台、仪表盘、座椅、门板、天窗、屏幕、材质、颜色、结构比例、拍摄位置和视角不变。仅将前挡风玻璃、侧窗、后窗、天窗、打开车门以及其他真实开口中可见的车外环境，替换为从当前车内视角观察第二张目标场景时应当看到的合理景象。保持目标场景的建筑结构、墙地面材质、灯具样式、主色调和空间氛围一致，不要机械复制第二张图片的外观拍摄视角。统一车内与目标场景的光线方向、色温、曝光、玻璃反射、亮面饰板反射和环境映色，使内饰图与外观图看起来拍摄于同一地点、同一时段。若原图没有可见车外区域，不要虚构车窗或扩大开口，只调整环境光和合理反射。不得改变或新增方向盘、座椅、中控屏、仪表盘、挡把、门板、天窗和车内配置；不得改变内饰颜色、左右舵、屏幕文字和车辆身份；不得生成其他车辆、人物、错误文字、额外 Logo、畸形结构或不合理镜面反射。";

const batchInteriorCleanAppendPrompt =
  "在保持上述结构和场景约束的基础上，清除灰尘、污渍、油光和杂乱感，轻微提升皮革、塑料、金属、织物等材质质感，不得过度翻新或改变真实材质和颜色。";

export const batchInteriorScenePrompt = batchInteriorSceneCorePrompt;

export const batchInteriorSceneCleanPrompt =
  `${batchInteriorSceneCorePrompt}${batchInteriorCleanAppendPrompt}`;

export const batchInteriorCollagePrompt =
  "请基于本组已经完成处理的车辆内饰图片生成一张汽车电商内饰拼图。每张拼图必须至少包含 2 张输入图片，不允许只包含 1 张图片或空白拼图。完整展示本组图片内容，尽量避免重复和遗漏。只负责规整排版和必要裁切，必须保持每张输入图已经确认的车型、内饰结构、材质、颜色、场景、窗外环境、光线、反射和清洁效果，不要再次执行场景替换、清洁增强或内容重绘，不要把多张图片错误融合成一个空间。采用简洁规整的网格布局，图片之间间距均匀，边缘整齐，视觉平衡。每张小图保持原始视角和主体完整，避免裁切方向盘、座椅、中控屏、仪表盘、座椅靠背、门板等关键区域。不要添加文字、Logo、水印、边框装饰、价格标签、人物或额外物体。输出高清、真实、专业的二手车详情页内饰拼图。";

export const batchInteriorCleanCollagePrompt =
  "请基于本组上传的车辆内饰图片，生成一张汽车电商内饰拼图，并同时对每张内饰图进行清洁增强处理。每张拼图必须至少包含 2 张输入图片，不允许只包含 1 张图片或空白拼图。请完整展示本组图片内容，尽量避免重复和遗漏。所有图片均为同一辆车的内饰素材。请保留每张图片中的真实内饰结构、座椅布局、方向盘、中控、仪表台、门板、地毯、天窗、后排等细节，不要改变车型、材质、颜色和空间关系，不要生成不存在的部件，不要把多张图片内容错误融合成一个空间。请对车内空间进行清洁增强处理，重点提升方向盘、座椅、仪表台、中控区域、门板及地毯区域的整洁度与清爽感。清除灰尘、污渍、使用痕迹和杂乱感，使内饰表面看起来更加干净、细致、清爽自然；同时增强皮革、塑料、金属与织物等材质的质感表现，让整车内饰呈现焕然一新、整洁舒适的视觉效果。拼图采用简洁规整的网格布局，图片之间间距均匀，边缘整齐，视觉平衡。统一亮度、色温、对比度和清晰度，每张小图保持原始视角和主体完整，避免裁切方向盘、座椅、中控屏、仪表盘、座椅靠背、门板等关键区域。不要添加文字、Logo、水印、边框装饰、价格标签、人物或额外物体。输出高清、真实、专业的二手车详情页内饰拼图。";

const resolveBatchPaintColorCode = (config: BatchVisualConfig) => {
  const colorCode = typeof config.colorCode === "string" ? config.colorCode.trim() : "";
  return colorCode || null;
};

const appendBatchPaintColorPrompt = (prompt: string, colorCode: string | null) =>
  colorCode
    ? `${prompt} 本次烤漆翻新指定色号为 ${colorCode}，请以该色号对应的车漆颜色作为翻新后的车身颜色；如前文出现“保持原车颜色”或“不主动改色”，以本指定色号要求为准。不要自行扩展为其它颜色，不要改变车辆车型、结构、轮毂、灯组、车窗比例和拍摄角度。`
    : prompt;

const appendLogoPlacementPrompt = (
  parts: string[],
  placements: LogoPlacement[],
  hasSceneChange: boolean,
) => {
  if (!placements.length) return;
  const logoImageLabel = hasSceneChange ? "第三张图片" : "第二张图片";
  if (placements.includes("plate")) parts.push(plateLogoInstruction(logoImageLabel));
  if (placements.includes("wall")) parts.push(wallLogoInstruction(logoImageLabel));
};

export const buildBatchPromptKey = (config: BatchVisualConfig) =>
  [
    config.enableSceneChange ? "scene" : "",
    config.useRecentLogo ? "logo" : "",
    config.logoPlacements?.length ? config.logoPlacements.join("_") : "",
    config.enableLightConsistency || config.lightConsistency ? "light" : "",
    config.enablePaintRefresh || config.paintRefresh ? "paint" : "",
  ]
    .filter(Boolean)
    .join("+");

export const batchWallLogoScenePrompt =
  "第一张图片是目标上新场景参考图，第二张图片是 Logo / 标识参考图。请基于第一张图片生成一张不含车辆的统一上新背景场景图，并将第二张图片中的 Logo / 标识自然设计到场景后方背景墙上。背景墙 Logo 只参考第二张图片中的文字轮廓、字形结构和图形符号，不要复制底色、底板、材质、外框、边框、螺丝、铆钉、牌匾造型、车牌比例或装饰风格。Logo 应直接附着在墙面上，与场景灯光、透视、材质和装修风格一致，可表现为浅灰金属立体字、白色亚克力字、磨砂银墙面字或轻微背光发光字。Logo 需要中等偏大、清晰可读，成为墙面主要品牌识别元素，位置通常位于主墙视觉中心或车辆未来摆放区域后方上方。请保持场景空间结构、地面材质、光线方向、景深和整体氛围稳定统一，不要生成车辆、人物、杂物、车牌号、额外文字、矩形牌子、黑色底牌、金色边框、螺丝固定件或悬挂牌匾。输出适合二手车电商批量上新的真实汽车广告背景图，画面干净、高级、统一。";

export const resolveBatchExteriorPromptWithBrandedScene = (config: BatchVisualConfig) => {
  const hasLight = config.enableLightConsistency === true || config.lightConsistency === true;
  const hasPaint = config.enablePaintRefresh === true || config.paintRefresh === true;
  const placements = resolveLogoPlacements({
    enabled: config.useRecentLogo === true,
    logoPlacements: config.logoPlacements,
    legacyDefault: ["plate"],
  }).filter((placement) => placement !== "wall");
  const parts = [
    "第一张图片是车辆主体，第二张图片是已经带有统一背景墙 Logo 的目标上新场景图。",
    "请将第一张车自然放入第二张场景中，保持车辆真实车型、车身比例、车漆原色、轮毂、灯组、车窗结构和原车拍摄角度一致，车身完整，轮胎和车顶不要裁切。让车辆与第二张场景的地面接触、透视关系、阴影、环境反射和整体光照自然融合。第二张场景中的背景墙 Logo 是已经确认的品牌墙效果，必须保持其文字轮廓、位置、大小、材质、颜色、透视和光照关系不变，不要重绘、替换、移动、放大、缩小、遮挡或新增背景墙 Logo。",
  ];

  if (hasPaint) parts.push(paintInstruction);
  if (hasLight) parts.push(lightInstruction);
  if (!hasPaint && !hasLight && !placements.length) {
    parts.push(lightInstruction);
  }

  if (placements.includes("plate")) parts.push(plateLogoInstruction("第三张图片"));
  parts.push(negativeInstruction);

  return appendBatchPaintColorPrompt(parts.join(""), hasPaint ? resolveBatchPaintColorCode(config) : null);
};

export const resolveBatchExteriorPrompt = (config: BatchVisualConfig) => {
  const hasSceneChange = config.enableSceneChange === true;
  const hasLight = config.enableLightConsistency === true || config.lightConsistency === true;
  const hasPaint = config.enablePaintRefresh === true || config.paintRefresh === true;
  const placements = resolveLogoPlacements({
    enabled: config.useRecentLogo === true,
    logoPlacements: config.logoPlacements,
    legacyDefault: ["plate"],
  });
  const parts = [
    hasSceneChange
      ? "第一张图片是车辆主体，第二张图片是目标上新场景参考图。"
      : "第一张图片是车辆外观图。",
    hasSceneChange ? sceneInstruction : preserveSceneInstruction,
  ];

  if (hasPaint) parts.push(paintInstruction);
  if (hasLight) parts.push(lightInstruction);
  if (!hasSceneChange && !hasPaint && !hasLight && !placements.length) {
    parts.push(lightInstruction);
  }

  appendLogoPlacementPrompt(parts, placements, hasSceneChange);
  parts.push(negativeInstruction);

  return appendBatchPaintColorPrompt(parts.join(""), hasPaint ? resolveBatchPaintColorCode(config) : null);
};
