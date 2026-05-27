import { ref, onMounted, onUnmounted } from 'vue'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

export interface ImageViewerOptions {
  // 是否显示工具栏
  toolbar?: boolean | Viewer.ToolbarButtonSize
  // 是否显示导航栏
  navbar?: boolean | number
  // 是否显示标题
  title?: boolean | number | ((image: HTMLImageElement, imageData: Viewer.ImageData) => string)
  // 是否显示缩略图
  tooltip?: boolean
  // 是否可移动
  movable?: boolean
  // 是否可缩放
  zoomable?: boolean
  // 是否可旋转
  rotatable?: boolean
  // 是否可翻转
  scalable?: boolean
  // 是否可切换
  transition?: boolean
  // 是否全屏
  fullscreen?: boolean
  // 是否键盘操作
  keyboard?: boolean
  // 是否循环播放
  loop?: boolean
  // 是否拖拽
  dragMode?: Viewer.DragMode
  // 图片大小
  interval?: number
  // 最小缩放比例
  minZoomRatio?: number
  // 最大缩放比例
  maxZoomRatio?: number
  // 是否模态显示
  modal?: boolean
  // 是否显示关闭按钮
  button?: boolean
  // 是否点击遮罩关闭
  backdrop?: boolean | 'static'
  // 是否显示加载动画
  loading?: boolean
  // 其他自定义选项
  [key: string]: any
}

// 默认配置
const defaultOptions: ImageViewerOptions = {
  toolbar: true,
  navbar: true,
  title: true,
  tooltip: true,
  movable: true,
  zoomable: true,
  rotatable: true,
  scalable: true,
  transition: true,
  fullscreen: true,
  keyboard: true,
  loop: true,
  minZoomRatio: 0.1,
  maxZoomRatio: 10,
  modal: true,
  button: true,
  backdrop: true,
  loading: true,
}

export const useImageViewer = (options: ImageViewerOptions = {}) => {
  const viewerInstance = ref<Viewer | null>(null)
  const currentIndex = ref(0)
  const isOpen = ref(false)
  
  /**
   * 初始化图片预览器
   * @param container 容器元素或选择器
   * @param images 图片列表
   * @param opts 配置选项
   */
  const initViewer = (
    container: HTMLElement | string,
    images?: string[],
    opts: ImageViewerOptions = {}
  ) => {
    // 合并配置
    const mergedOptions = { ...defaultOptions, ...options, ...opts }
    
    // 如果传入图片列表，创建临时容器
    let targetContainer: HTMLElement
    
    if (images && images.length > 0) {
      // 创建临时容器
      const tempContainer = document.createElement('div')
      tempContainer.style.display = 'none'
      document.body.appendChild(tempContainer)
      
      images.forEach((src, index) => {
        const img = document.createElement('img')
        img.src = src
        img.dataset.index = String(index)
        tempContainer.appendChild(img)
      })
      
      targetContainer = tempContainer
    } else if (typeof container === 'string') {
      targetContainer = document.querySelector(container) as HTMLElement
    } else {
      targetContainer = container
    }
    
    if (!targetContainer) {
      console.error('找不到图片容器元素')
      return null
    }
    
    // 销毁之前的实例
    if (viewerInstance.value) {
      viewerInstance.value.destroy()
    }
    
    // 创建新的预览器实例
    viewerInstance.value = new Viewer(targetContainer, {
      ...mergedOptions,
      ready: () => {
        isOpen.value = true
        mergedOptions.ready?.()
      },
      show: () => {
        isOpen.value = true
        mergedOptions.show?.()
      },
      shown: () => {
        currentIndex.value = viewerInstance.value?.index || 0
        mergedOptions.shown?.()
      },
      hide: () => {
        isOpen.value = false
        mergedOptions.hide?.()
      },
      hidden: () => {
        isOpen.value = false
        mergedOptions.hidden?.()
      },
      view: (event: CustomEvent) => {
        currentIndex.value = event.detail.index
        mergedOptions.view?.(event)
      },
      viewed: (event: CustomEvent) => {
        mergedOptions.viewed?.(event)
      },
      zoom: (event: CustomEvent) => {
        mergedOptions.zoom?.(event)
      },
      zoomed: (event: CustomEvent) => {
        mergedOptions.zoomed?.(event)
      },
    })
    
    return viewerInstance.value
  }
  
  /**
   * 显示预览器
   * @param index 默认显示的图片索引
   */
  const show = (index = 0) => {
    viewerInstance.value?.show()
    if (index > 0) {
      viewerInstance.value?.view(index)
    }
  }
  
  /**
   * 隐藏预览器
   */
  const hide = () => {
    viewerInstance.value?.hide()
  }
  
  /**
   * 切换到指定图片
   * @param index 图片索引
   */
  const view = (index: number) => {
    viewerInstance.value?.view(index)
  }
  
  /**
   * 切换到上一张
   */
  const prev = () => {
    viewerInstance.value?.prev()
  }
  
  /**
   * 切换到下一张
   */
  const next = () => {
    viewerInstance.value?.next()
  }
  
  /**
   * 放大
   * @param ratio 缩放比例
   */
  const zoom = (ratio: number) => {
    viewerInstance.value?.zoom(ratio)
  }
  
  /**
   * 放大到指定比例
   * @param ratio 缩放比例
   */
  const zoomTo = (ratio: number) => {
    viewerInstance.value?.zoomTo(ratio)
  }
  
  /**
   * 旋转
   * @param degree 旋转角度
   */
  const rotate = (degree: number) => {
    viewerInstance.value?.rotate(degree)
  }
  
  /**
   * 旋转到指定角度
   * @param degree 旋转角度
   */
  const rotateTo = (degree: number) => {
    viewerInstance.value?.rotateTo(degree)
  }
  
  /**
   * 水平翻转
   */
  const scaleX = (scaleX: number) => {
    viewerInstance.value?.scaleX(scaleX)
  }
  
  /**
   * 垂直翻转
   */
  const scaleY = (scaleY: number) => {
    viewerInstance.value?.scaleY(scaleY)
  }
  
  /**
   * 重置图片
   */
  const reset = () => {
    viewerInstance.value?.reset()
  }
  
  /**
   * 进入全屏
   */
  const fullscreen = () => {
    viewerInstance.value?.fullscreen()
  }
  
  /**
   * 退出全屏
   */
  const exitFullscreen = () => {
    viewerInstance.value?.exitFullscreen()
  }
  
  /**
   * 播放（幻灯片模式）
   */
  const play = () => {
    viewerInstance.value?.play()
  }
  
  /**
   * 停止播放
   */
  const stop = () => {
    viewerInstance.value?.stop()
  }
  
  /**
   * 获取当前索引
   */
  const getCurrentIndex = () => {
    return viewerInstance.value?.index || 0
  }
  
  /**
   * 获取当前图片数据
   */
  const getImageData = () => {
    return viewerInstance.value?.imageData
  }
  
  /**
   * 销毁预览器
   */
  const destroy = () => {
    viewerInstance.value?.destroy()
    viewerInstance.value = null
    isOpen.value = false
  }
  
  // 组件卸载时销毁
  onUnmounted(() => {
    destroy()
  })
  
  return {
    viewerInstance,
    currentIndex,
    isOpen,
    initViewer,
    show,
    hide,
    view,
    prev,
    next,
    zoom,
    zoomTo,
    rotate,
    rotateTo,
    scaleX,
    scaleY,
    reset,
    fullscreen,
    exitFullscreen,
    play,
    stop,
    getCurrentIndex,
    getImageData,
    destroy,
  }
}

// 便捷函数：直接预览单张图片
export const previewImage = (src: string, options: ImageViewerOptions = {}) => {
  const { initViewer, show } = useImageViewer(options)
  
  // 创建临时容器
  const tempDiv = document.createElement('div')
  tempDiv.style.display = 'none'
  document.body.appendChild(tempDiv)
  
  const img = document.createElement('img')
  img.src = src
  tempDiv.appendChild(img)
  
  initViewer(tempDiv, undefined, {
    ...options,
    hidden: () => {
      // 清理临时元素
      document.body.removeChild(tempDiv)
      options.hidden?.()
    },
  })
  
  show()
}

// 便捷函数：预览多张图片
export const previewImages = (
  images: string[],
  index = 0,
  options: ImageViewerOptions = {}
) => {
  const { initViewer, show } = useImageViewer(options)
  
  initViewer('body', images, {
    ...options,
    hidden: () => {
      options.hidden?.()
    },
  })
  
  show(index)
}

export default useImageViewer