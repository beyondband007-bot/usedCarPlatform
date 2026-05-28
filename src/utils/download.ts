export interface DownloadFileItem {
  url: string
  filename: string
}

export function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').slice(0, 120)
}

export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.append(link)
  link.click()
  link.remove()
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function downloadFilesSequentially(
  files: DownloadFileItem[],
  intervalMs = 280,
) {
  for (const [index, file] of files.entries()) {
    downloadFile(file.url, file.filename)
    if (index < files.length - 1) {
      await wait(intervalMs)
    }
  }
}
