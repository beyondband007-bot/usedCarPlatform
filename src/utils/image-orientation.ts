export async function readImageFileDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
      image.onerror = () => {
        reject(new Error('无法读取图片尺寸'))
      }
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function isLandscapeImage(width: number, height: number) {
  return width > height
}

export function isPortraitImage(width: number, height: number) {
  return height > width
}

export function imageMatchesOutputRatio(
  width: number,
  height: number,
  outputRatio: string,
) {
  if (outputRatio === '16:9') {
    return isLandscapeImage(width, height)
  }
  if (outputRatio === '9:16') {
    return isPortraitImage(width, height)
  }

  const [ratioWidth, ratioHeight] = outputRatio
    .split(':')
    .map((part) => Number(part.trim()))
  if (!ratioWidth || !ratioHeight) return true

  return ratioWidth > ratioHeight
    ? isLandscapeImage(width, height)
    : isPortraitImage(width, height)
}

export function buildOutputRatioMismatchMessage(outputRatio: string) {
  if (outputRatio === '16:9') {
    return '当前模板为横屏 16:9，请上传横版图片（宽度需大于高度）'
  }
  if (outputRatio === '9:16') {
    return '当前模板为竖屏 9:16，请上传竖版图片（高度需大于宽度）'
  }
  return `当前模板为 ${outputRatio}，请上传与模板方向一致的图片`
}
