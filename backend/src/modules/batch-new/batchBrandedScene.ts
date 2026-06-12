export interface BatchBrandedSceneResult {
  url?: string | null;
  sourceUrl?: string | null;
}

const normalizeUrl = (value?: string | null) => value?.trim() || null;

export const isKieAccessibleSceneUrl = (value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();
    return ![
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "[::1]",
    ].includes(hostname);
  } catch {
    return false;
  }
};

export const resolveBatchBrandedSceneInputUrl = (
  result?: BatchBrandedSceneResult | null,
) => {
  const sourceUrl = normalizeUrl(result?.sourceUrl);
  if (isKieAccessibleSceneUrl(sourceUrl)) return sourceUrl;

  const displayUrl = normalizeUrl(result?.url);
  return isKieAccessibleSceneUrl(displayUrl) ? displayUrl : null;
};
