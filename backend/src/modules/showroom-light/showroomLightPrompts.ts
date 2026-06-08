import type { LogoPlacement } from "../../shared/types";

const vehicleAndSceneRule =
  "请将第一张车自然放入第二张展厅中，保持车辆真实车型、车身比例、车漆原色、轮毂、灯组、保持和原车拍摄角度一致，车身的镜面反射和场景一致，车身完整，轮胎和车顶不要裁切。去掉蓝紫色霓虹污染、去除彩色灯带反光、去除杂乱高饱和偏色、去除过曝眩光、去除脏污反射和；真实地面反射与光影效果。严格参考第二张展厅图的空间结构、墙面材质、灯光方向和透视关系。";

const outputAndNegativeRule =
  "不要人物、不要杂物、不要额外文字、不要车牌号，不要生成多辆车。指定画幅比例汽车电商主图，2K，真实汽车广告摄影。";

const plateLogoInstruction =
  "第三张图是 Logo / 标识参考图。如果原车图片中能看到车牌或车牌框，请将第三张参考图中的标识自然添加至可见车牌位置，并匹配车牌区域的透视、尺寸、遮挡、阴影和光照关系；如果原车图片完全看不到车牌区域，例如只有车身侧面、车牌被遮挡或车牌不在画面内，不要强行新增车牌，不要新增车牌处 Logo，也不要把车牌处 Logo 贴到车身、车窗、地面或背景上。";

const wallLogoInstruction =
  "第三张图是 Logo / 标识参考图。请将第三张参考图中的标识自然放置在展厅后方背景墙、品牌墙或可用墙面区域，匹配墙面透视、尺寸、材质、光照、阴影和轻微反射；Logo 应像真实展厅品牌标识一样贴合墙面，不要遮挡车辆主体，不要贴到车牌、车身、车窗、地面或前景物体上，不要新增多余文字。";

export const showroomLightPrompt =
  "第一张图片是车辆主体，第二张图片是目标展厅参考图。请将第一张车自然放入第二张展厅中，保持车辆真实车型、车身比例、车漆原色、轮毂、灯组、保持和原车拍摄角度一致，车身的镜面反射和场景一致，车身完整，轮胎和车顶不要裁切。去掉蓝紫色霓虹污染、去除彩色灯带反光、去除杂乱高饱和偏色、去除过曝眩光、去除脏污反射和；真实地面反射与光影效果。严格参考第二张展厅图的空间结构、墙面材质、灯光方向和透视关系。不要人物、不要杂物、不要额外文字、不要车牌号，不要生成多辆车。指定画幅比例汽车电商主图，2K，真实汽车广告摄影。";

export const showroomLightWithLogoPrompt =
  "第一张图片是车辆主体，第二张图片是目标展厅参考图，第三张图是贴在车牌处的参考图，请将第一张车自然放入第二张展厅中；如果原车图片中能看到车牌或车牌框，将第三张参考图中的标识自然添加至可见车牌位置，并匹配车牌区域的透视、尺寸、遮挡、阴影和光照关系；如果原车图片完全看不到车牌区域，例如只有车身侧面、车牌被遮挡或车牌不在画面内，不要强行新增车牌，不要新增 Logo，也不要把 Logo 贴到车身、车窗、地面或背景上。保持车辆真实车型、车身比例、车漆原色、轮毂、灯组、保持和原车拍摄角度一致，车身的镜面反射和场景一致，车身完整，轮胎和车顶不要裁切。去掉蓝紫色霓虹污染、去除彩色灯带反光、去除杂乱高饱和偏色、去除过曝眩光、去除脏污反射和；真实地面反射与光影效果。严格参考第二张展厅图的空间结构、墙面材质、灯光方向和透视关系。不要人物、不要杂物、不要额外文字、不要车牌号，不要生成多辆车。指定画幅比例汽车电商主图，2K，真实汽车广告摄影。";

const buildShowroomLogoInstruction = (placements: LogoPlacement[]) => {
  const parts = [];
  if (placements.includes("plate")) parts.push(plateLogoInstruction);
  if (placements.includes("wall")) parts.push(wallLogoInstruction);
  return parts.join("");
};

export const buildShowroomLightPrompt = (placements: LogoPlacement[]) => {
  const logoInstruction = buildShowroomLogoInstruction(placements);
  const inputRule = logoInstruction
    ? "第一张图片是车辆主体，第二张图片是目标展厅参考图。"
    : "第一张图片是车辆主体，第二张图片是目标展厅参考图。";

  return `${inputRule}${vehicleAndSceneRule}${logoInstruction}${outputAndNegativeRule}`;
};
