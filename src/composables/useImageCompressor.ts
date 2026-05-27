import { ref } from 'vue'
import Compressor from 'compressorjs'

export interface CompressorOptions {
  // 输出图片的最大宽度（单位：像素）
  maxWidth?: number
  // 输出图片的最大高度（单位：像素）
  maxHeight?: number
  // 输出图片的最小宽度（单位：像素）
  minWidth?: number
  // 输出图片的最小高度（单位：像素）
  minHeight?: number
  // 输出图片的宽度（单位：像素）
  width?: number
  // 输出图片的高度（单位：像素）
  height?: number
  // 裁剪区域比例（宽度/高度），例如：1、2、0.5、NaN（自由裁剪）
  aspectRatio?: number
  // 图片质量，范围 0 到 1，默认 0.8
  quality?: number
  // 是否保持原始分辨率
  retainExif?: boolean
  // 检查图片方向
  checkOrientation?: boolean
  // 压缩成功回调
  success?: (file: File | Blob) => void
  // 压缩失败回调
  error?: (err: Error) => void
  // 压缩进度回调（如果支持）
  progress?: (progress: number) => void
  // 是否 mimeType
  mimeType?: string
  // 是否转为数组缓冲区
  convertTypes?: string | string[]
  // 转为数组缓冲区的阈值
  convertSize?: number
  // 是否自动处理旋转
  rotate?: number
  // 缩放比例
  scale?: number
}

// 预设配置
export const compressorPresets = {
  // 高质量（适合保存作品）
  high: {
    quality: 0.95,
    maxWidth: 4096,
    maxHeight: 4096,
  } as CompressorOptions,
  
  // 中等质量（默认推荐）
  medium: {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1920,
  } as CompressorOptions,
  
  // 低质量（适合缩略图）
  low: {
    quality: 0.6,
    maxWidth: 800,
    maxHeight: 800,
  } as CompressorOptions,
  
  // 极低质量（适合预览图）
  thumbnail: {
    quality: 0.4,
    maxWidth: 400,
    maxHeight: 400,
  } as CompressorOptions,
  
  // 头像专用
  avatar: {
    quality: 0.85,
    width: 400,
    height: 400,
    aspectRatio: 1,
  } as CompressorOptions,
  
  // 电商产品图
  product: {
    quality: 0.9,
    maxWidth: 1200,
    maxHeight: 1200,
    aspectRatio: 1,
  } as CompressorOptions,
  
  // 横幅/海报
  banner: {
    quality: 0.85,
    maxWidth: 1920,
    maxHeight: 1080,
    aspectRatio: 16 / 9,
  } as CompressorOptions,
}

export interface CompressionResult {
  original: {
    file: File
    size: number
    sizeFormatted: string
    width?: number
    height?: number
  }
  compressed: {
    file: File | Blob
    size: number
    sizeFormatted: string
    width?: number
    height?: number
  }
  compressionRatio: number
  compressionRatioFormatted: string
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取图片尺寸
const getImageDimensions = (file: File | Blob): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片尺寸'))
    }
    
    img.src = url
  })
}

export const useImageCompressor = () => {
  const isCompressing = ref(false)
  const progress = ref(0)
  const error = ref<Error | null>(null)
  
  /**
   * 压缩单张图片
   * @param file 原始文件
   * @param options 压缩选项
   */
  const compress = (
    file: File,
    options: CompressorOptions = {}
  ): Promise<File | Blob> => {
    return new Promise((resolve, reject) => {
      isCompressing.value = true
      progress.value = 0
      error.value = null
      
      new Compressor(file, {
        ...options,
        success: (result) => {
          isCompressing.value = false
          progress.value = 100
          options.success?.(result)
          resolve(result)
        },
        error: (err) => {
          isCompressing.value = false
          error.value = err
          options.error?.(err)
          reject(err)
        },
      })
    })
  }
  
  /**
   * 压缩图片并获取完整结果信息
   */
  const compressWithInfo = async (
    file: File,
    options: CompressorOptions = {}
  ): Promise<CompressionResult> => {
    const originalDimensions = await getImageDimensions(file)
    
    const compressedFile = await compress(file, options)
    const compressedDimensions = await getImageDimensions(compressedFile)
    
    const originalSize = file.size
    const compressedSize = compressedFile instanceof File 
      ? compressedFile.size 
      : (compressedFile as Blob).size
    
    const compressionRatio = originalSize / compressedSize
    
    return {
      original: {
        file,
        size: originalSize,
        sizeFormatted: formatFileSize(originalSize),
        width: originalDimensions.width,
        height: originalDimensions.height,
      },
      compressed: {
        file: compressedFile,
        size: compressedSize,
        sizeFormatted: formatFileSize(compressedSize),
        width: compressedDimensions.width,
        height: compressedDimensions.height,
      },
      compressionRatio,
      compressionRatioFormatted: compressionRatio.toFixed(2) + 'x',
    }
  }
  
  /**
   * 批量压缩图片
   */
  const compressBatch = async (
    files: File[],
    options: CompressorOptions = {}
  ): Promise<CompressionResult[]> => {
    const results: CompressionResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      progress.value = Math.round((i / files.length) * 100)
      
      try {
        const result = await compressWithInfo(files[i], options)
        results.push(result)
      } catch (err) {
        console.error(`压缩文件 ${files[i].name} 失败:`, err)
      }
    }
    
    progress.value = 100
    return results
  }
  
  /**
   * 使用预设配置压缩
   */
  const compressWithPreset = (
    file: File,
    preset: keyof typeof compressorPresets,
    customOptions: CompressorOptions = {}
  ): Promise<File | Blob> => {
    const presetOptions = compressorPresets[preset]
    return compress(file, { ...presetOptions, ...customOptions })
  }
  
  /**
   * 压缩图片到指定大小以下
   */
  const compressToTargetSize = async (
    file: File,
    targetSize: number, // 目标大小（字节）
    minQuality = 0.3 // 最低质量
  ): Promise<File | Blob> => {
    let quality = 0.9
    let result: File | Blob = file
    
    while (quality >= minQuality) {
      result = await compress(file, { quality })
      
      const size = result instanceof File ? result.size : (result as Blob).size
      if (size <= targetSize) {
        return result
      }
      
      quality -= 0.1
    }
    
    // 如果无法达到目标大小，返回最小质量的结果
    return result
  }
  
  /**
   * 压缩并转为 Base64
   */
  const compressToBase64 = async (
    file: File,
    options: CompressorOptions = {}
  ): Promise<string> => {
    const compressedFile = await compress(file, options)
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(compressedFile)
    })
  }
  
  /**
   * 压缩并转为 File 对象
   */
  const compressToFile = async (
    file: File,
    options: CompressorOptions = {},
    filename?: string
  ): Promise<File> => {
    const compressedFile = await compress(file, options)
    
    if (compressedFile instanceof File) {
      return compressedFile
    }
    
    // 如果是 Blob，转为 File
    const finalName = filename || file.name
    return new File([compressedFile], finalName, {
      type: compressedFile.type || file.type,
      lastModified: file.lastModified,
    })
  }
  
  /**
   * 重置状态
   */
  const reset = () => {
    isCompressing.value = false
    progress.value = 0
    error.value = null
  }
  
  return {
    isCompressing,
    progress,
    error,
    compress,
    compressWithInfo,
    compressBatch,
    compressWithPreset,
    compressToTargetSize,
    compressToBase64,
    compressToFile,
    reset,
    compressorPresets,
    formatFileSize,
  }
}

// 便捷函数：直接压缩图片
export const compressImage = (
  file: File,
  options: CompressorOptions = {}
): Promise<File | Blob> => {
  const { compress } = useImageCompressor()
  return compress(file, options)
}

// 便捷函数：压缩图片到目标大小
export const compressImageToSize = (
  file: File,
  targetSize: number,
  minQuality = 0.3
): Promise<File | Blob> => {
  const { compressToTargetSize } = useImageCompressor()
  return compressToTargetSize(file, targetSize, minQuality)
}

export default useImageCompressor