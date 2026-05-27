import { ref, onUnmounted } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

export interface CropperOptions {
  // 裁剪比例
  aspectRatio?: number
  // 裁剪框初始大小（相对于图片大小）
  initialAspectRatio?: number
  // 是否允许改变裁剪框大小
  cropBoxResizable?: boolean
  // 是否允许移动裁剪框
  cropBoxMovable?: boolean
  // 是否允许拖动模式
  dragMode?: Cropper.DragMode
  // 是否允许缩放图片
  scalable?: boolean
  // 是否允许旋转图片
  rotatable?: boolean
  // 是否允许翻转图片
  zoomable?: boolean
  // 是否允许触摸缩放
  zoomOnTouch?: boolean
  // 是否允许滚轮缩放
  zoomOnWheel?: boolean
  // 最小裁剪框宽度
  minCropBoxWidth?: number
  // 最小裁剪框高度
  minCropBoxHeight?: number
  // 最小画布宽度
  minCanvasWidth?: number
  // 最小画布高度
  minCanvasHeight?: number
  // 最小容器宽度
  minContainerWidth?: number
  // 最小容器高度
  minContainerHeight?: number
  // 裁剪框限制
  viewMode?: 0 | 1 | 2 | 3
  // 其他自定义选项
  [key: string]: any
}

// 常用裁剪比例预设
export const aspectRatioPresets = {
  free: NaN,
  square: 1,
  portrait: 3 / 4,
  landscape: 16 / 9,
  wide: 21 / 9,
  video: 16 / 9,
  photo: 3 / 2,
  banner: 728 / 90,
  avatar: 1,
}

// 默认配置
const defaultOptions: CropperOptions = {
  aspectRatio: NaN,
  viewMode: 1,
  dragMode: 'move',
  cropBoxResizable: true,
  cropBoxMovable: true,
  scalable: true,
  rotatable: true,
  zoomable: true,
  zoomOnTouch: true,
  zoomOnWheel: true,
  minCropBoxWidth: 50,
  minCropBoxHeight: 50,
}

export const useImageCropper = (options: CropperOptions = {}) => {
  const cropperInstance = ref<Cropper | null>(null)
  const isReady = ref(false)
  const isCropping = ref(false)
  
  /**
   * 初始化裁剪器
   * @param imageElement 图片元素
   * @param opts 配置选项
   */
  const initCropper = (imageElement: HTMLImageElement, opts: CropperOptions = {}) => {
    // 销毁之前的实例
    if (cropperInstance.value) {
      cropperInstance.value.destroy()
    }
    
    // 合并配置
    const mergedOptions = { ...defaultOptions, ...options, ...opts }
    
    // 创建裁剪器实例
    cropperInstance.value = new Cropper(imageElement, {
      ...mergedOptions,
      ready: () => {
        isReady.value = true
        isCropping.value = true
        mergedOptions.ready?.()
      },
      cropstart: (event) => {
        mergedOptions.cropstart?.(event)
      },
      cropmove: (event) => {
        mergedOptions.cropmove?.(event)
      },
      cropend: (event) => {
        mergedOptions.cropend?.(event)
      },
      crop: (event) => {
        mergedOptions.crop?.(event)
      },
      zoom: (event) => {
        mergedOptions.zoom?.(event)
      },
    })
    
    return cropperInstance.value
  }
  
  /**
   * 获取裁剪数据
   */
  const getData = (): Cropper.Data => {
    return cropperInstance.value?.getData() || { x: 0, y: 0, width: 0, height: 0, rotate: 0, scaleX: 1, scaleY: 1 }
  }
  
  /**
   * 设置裁剪数据
   */
  const setData = (data: Cropper.Data) => {
    cropperInstance.value?.setData(data)
  }
  
  /**
   * 获取裁剪框数据
   */
  const getCropBoxData = (): Cropper.CropBoxData => {
    return cropperInstance.value?.getCropBoxData() || { left: 0, top: 0, width: 0, height: 0 }
  }
  
  /**
   * 设置裁剪框数据
   */
  const setCropBoxData = (data: Cropper.CropBoxData) => {
    cropperInstance.value?.setCropBoxData(data)
  }
  
  /**
   * 获取图片数据
   */
  const getImageData = (): Cropper.ImageData => {
    return cropperInstance.value?.getImageData() || {
      left: 0, top: 0, width: 0, height: 0, rotate: 0, scaleX: 1, scaleY: 1, naturalWidth: 0, naturalHeight: 0, aspectRatio: 1
    }
  }
  
  /**
   * 获取画布数据
   */
  const getCanvasData = (): Cropper.CanvasData => {
    return cropperInstance.value?.getCanvasData() || { left: 0, top: 0, width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 }
  }
  
  /**
   * 设置画布数据
   */
  const setCanvasData = (data: Cropper.CanvasData) => {
    cropperInstance.value?.setCanvasData(data)
  }
  
  /**
   * 获取裁剪后的图片数据（Blob）
   */
  const getCroppedBlob = (options?: Cropper.GetCroppedCanvasOptions): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = cropperInstance.value?.getCroppedCanvas(options)
      if (canvas) {
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/png')
      } else {
        resolve(null)
      }
    })
  }
  
  /**
   * 获取裁剪后的图片数据（Data URL）
   */
  const getCroppedDataURL = (options?: Cropper.GetCroppedCanvasOptions, type = 'image/png', quality?: number): string => {
    const canvas = cropperInstance.value?.getCroppedCanvas(options)
    return canvas?.toDataURL(type, quality) || ''
  }
  
  /**
   * 获取裁剪后的 File 对象
   */
  const getCroppedFile = async (
    filename = 'cropped.png',
    options?: Cropper.GetCroppedCanvasOptions,
    type = 'image/png'
  ): Promise<File | null> => {
    const blob = await getCroppedBlob(options)
    if (blob) {
      return new File([blob], filename, { type })
    }
    return null
  }
  
  /**
   * 设置裁剪比例
   */
  const setAspectRatio = (ratio: number) => {
    cropperInstance.value?.setAspectRatio(ratio)
  }
  
  /**
   * 设置裁剪框位置
   */
  const setCropBoxPosition = (left: number, top: number) => {
    const data = getCropBoxData()
    setCropBoxData({ ...data, left, top })
  }
  
  /**
   * 设置裁剪框大小
   */
  const setCropBoxSize = (width: number, height: number) => {
    const data = getCropBoxData()
    setCropBoxData({ ...data, width, height })
  }
  
  /**
   * 旋转图片
   */
  const rotate = (degree: number) => {
    cropperInstance.value?.rotate(degree)
  }
  
  /**
   * 缩放图片
   */
  const scale = (scaleX: number, scaleY?: number) => {
    cropperInstance.value?.scale(scaleX, scaleY ?? scaleX)
  }
  
  /**
   * 缩放图片到指定比例
   */
  const zoom = (ratio: number) => {
    cropperInstance.value?.zoom(ratio)
  }
  
  /**
   * 重置裁剪器
   */
  const reset = () => {
    cropperInstance.value?.reset()
  }
  
  /**
   * 清空裁剪区域
   */
  const clear = () => {
    cropperInstance.value?.clear()
    isCropping.value = false
  }
  
  /**
   * 启用裁剪
   */
  const enable = () => {
    cropperInstance.value?.enable()
    isCropping.value = true
  }
  
  /**
   * 禁用裁剪
   */
  const disable = () => {
    cropperInstance.value?.disable()
    isCropping.value = false
  }
  
  /**
   * 销毁裁剪器
   */
  const destroy = () => {
    cropperInstance.value?.destroy()
    cropperInstance.value = null
    isReady.value = false
    isCropping.value = false
  }
  
  /**
   * 替换图片
   */
  const replace = (url: string, hasSameSize = false) => {
    cropperInstance.value?.replace(url, hasSameSize)
  }
  
  /**
   * 裁剪预设
   */
  const applyPreset = (preset: keyof typeof aspectRatioPresets) => {
    const ratio = aspectRatioPresets[preset]
    setAspectRatio(ratio)
  }
  
  // 组件卸载时销毁
  onUnmounted(() => {
    destroy()
  })
  
  return {
    cropperInstance,
    isReady,
    isCropping,
    initCropper,
    getData,
    setData,
    getCropBoxData,
    setCropBoxData,
    getImageData,
    getCanvasData,
    setCanvasData,
    getCroppedBlob,
    getCroppedDataURL,
    getCroppedFile,
    setAspectRatio,
    setCropBoxPosition,
    setCropBoxSize,
    rotate,
    scale,
    zoom,
    reset,
    clear,
    enable,
    disable,
    destroy,
    replace,
    applyPreset,
    aspectRatioPresets,
  }
}

// 便捷函数：裁剪单张图片
export const cropImage = async (
  imageSrc: string,
  options: CropperOptions = {}
): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const { initCropper, getCroppedBlob, destroy } = useImageCropper(options)
      
      // 创建临时容器
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      document.body.appendChild(container)
      
      img.style.maxWidth = '100%'
      container.appendChild(img)
      
      initCropper(img, {
        ...options,
        ready: async () => {
          try {
            const blob = await getCroppedBlob()
            destroy()
            document.body.removeChild(container)
            resolve(blob)
          } catch (error) {
            destroy()
            document.body.removeChild(container)
            reject(error)
          }
        },
      })
    }
    
    img.onerror = reject
    img.src = imageSrc
  })
}

export default useImageCropper