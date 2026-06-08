type StaticImageWarmOptions = {
  crossorigin?: "anonymous" | "use-credentials" | "";
  referrerpolicy?:
    | ""
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
};

const staticImageRegistry = new Set<string>();
const staticImageReady = new Set<string>();
const staticImagePending = new Map<string, Promise<boolean>>();

function normalizeStaticImageUrl(url?: string | null) {
  return url?.trim() ?? "";
}

export function registerStaticImageUrls(urls: Array<string | null | undefined>) {
  urls.forEach((url) => {
    const normalized = normalizeStaticImageUrl(url);
    if (normalized) {
      staticImageRegistry.add(normalized);
    }
  });
}

export function isRegisteredStaticImage(url?: string | null) {
  const normalized = normalizeStaticImageUrl(url);
  return normalized ? staticImageRegistry.has(normalized) : false;
}

export function isStaticImageReady(url?: string | null) {
  const normalized = normalizeStaticImageUrl(url);
  return normalized ? staticImageReady.has(normalized) : false;
}

export function markStaticImageReady(url?: string | null) {
  const normalized = normalizeStaticImageUrl(url);
  if (!normalized) return;
  staticImageReady.add(normalized);
}

export function warmStaticImage(
  url?: string | null,
  options: StaticImageWarmOptions = {},
) {
  const normalized = normalizeStaticImageUrl(url);
  if (!normalized || typeof Image === "undefined") {
    return Promise.resolve(false);
  }

  if (staticImageReady.has(normalized)) {
    return Promise.resolve(true);
  }

  const existing = staticImagePending.get(normalized);
  if (existing) {
    return existing;
  }

  const task = new Promise<boolean>((resolve) => {
    const image = new Image();

    if (options.crossorigin !== undefined) {
      image.crossOrigin = options.crossorigin;
    }

    if (options.referrerpolicy !== undefined) {
      image.referrerPolicy = options.referrerpolicy;
    }

    image.onload = () => {
      staticImageReady.add(normalized);
      staticImagePending.delete(normalized);
      resolve(true);
    };

    image.onerror = () => {
      staticImagePending.delete(normalized);
      resolve(false);
    };

    image.src = normalized;
  });

  staticImagePending.set(normalized, task);
  return task;
}

export function warmStaticImages(
  urls: Array<string | null | undefined>,
  options: StaticImageWarmOptions = {},
) {
  return Promise.all(urls.map((url) => warmStaticImage(url, options)));
}
