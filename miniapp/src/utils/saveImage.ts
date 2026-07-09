export function saveImageToAlbum(url: string) {
  return new Promise<void>((resolve, reject) => {
    uni.showLoading({ title: '正在保存' })
    uni.downloadFile({
      url,
      success: (download) => {
        if (download.statusCode !== 200) {
          reject(new Error('图片下载失败'))
          return
        }
        uni.saveImageToPhotosAlbum({
          filePath: download.tempFilePath,
          success: () => {
            uni.showToast({ title: '已保存到相册', icon: 'success' })
            resolve()
          },
          fail: (error) => {
            const message = String(error.errMsg || '')
            if (message.includes('auth') || message.includes('authorize')) {
              uni.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存到相册。',
                confirmText: '前往设置',
                success: result => result.confirm && uni.openSetting({}),
              })
            }
            reject(error)
          },
        })
      },
      fail: reject,
      complete: () => uni.hideLoading(),
    })
  })
}
