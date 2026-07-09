export function usePermission() {
  function openSetting() {
    return uni.openSetting()
  }

  function showPermissionDenied(title: string) {
    uni.showModal({
      title: '权限未开启',
      content: title,
      confirmText: '前往设置',
      success: (res) => {
        if (res.confirm) {
          openSetting()
        }
      },
    })
  }

  return {
    openSetting,
    showPermissionDenied,
  }
}
