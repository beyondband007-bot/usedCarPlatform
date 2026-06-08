const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;

const showroomLocalSceneUrlMap: Record<string, string> = {
  "workspace-showroom-scene-warm-beige":
    `${apiOrigin}/scene-refs/showroom/workspace-showroom-scene-warm-beige.png`,
  "workspace-showroom-scene-dark-gray-halo":
    `${apiOrigin}/scene-refs/showroom/workspace-showroom-scene-dark-gray-halo.png`,
  "workspace-showroom-scene-charcoal-stone":
    `${apiOrigin}/scene-refs/showroom/workspace-showroom-scene-charcoal-stone.png`,
  "workspace-showroom-scene-vertical-light":
    `${apiOrigin}/scene-refs/showroom/workspace-showroom-scene-vertical-light.png`,
};

/** 只把后端可访问的场景图 URL 传给接口，本地打包图对已知场景补成绝对地址 */
export function resolveSceneReferenceImageUrl(
  image?: string | null,
): string | undefined {
  const trimmed = image?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  for (const [assetKey, sceneUrl] of Object.entries(showroomLocalSceneUrlMap)) {
    if (trimmed.includes(assetKey)) {
      return sceneUrl;
    }
  }

  return undefined;
}
