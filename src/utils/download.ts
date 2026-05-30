export interface DownloadFileItem {
  url: string
  filename: string
}

export function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').slice(0, 120)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function triggerUrlDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.append(link)
  link.click()
  link.remove()
}

export async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`download failed: ${response.status}`)

    const blob = await response.blob()
    triggerBlobDownload(blob, filename)
  } catch {
    triggerUrlDownload(url, filename)
  }
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
    await downloadFile(file.url, file.filename)
    if (index < files.length - 1) {
      await wait(intervalMs)
    }
  }
}

const crcTable = new Uint32Array(256)

for (let index = 0; index < 256; index += 1) {
  let value = index

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  crcTable[index] = value >>> 0
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

function createHeader(size: number) {
  const buffer = new ArrayBuffer(size)
  return {
    buffer,
    view: new DataView(buffer),
  }
}

async function fetchFileBytes(file: DownloadFileItem) {
  const response = await fetch(file.url)
  if (!response.ok) throw new Error(`download failed: ${response.status}`)

  const bytes = new Uint8Array(await response.arrayBuffer())
  return {
    bytes,
    filenameBytes: new TextEncoder().encode(file.filename),
    crc: crc32(bytes),
  }
}

export async function downloadFilesAsZip(files: DownloadFileItem[], zipFilename: string) {
  if (!files.length) return 0

  const fetchedFiles = await Promise.all(files.map(fetchFileBytes))
  const chunks: Uint8Array[] = []
  const centralDirectoryChunks: Uint8Array[] = []
  let offset = 0

  for (const file of fetchedFiles) {
    const localHeader = createHeader(30)
    writeUint32(localHeader.view, 0, 0x04034b50)
    writeUint16(localHeader.view, 4, 20)
    writeUint16(localHeader.view, 6, 0)
    writeUint16(localHeader.view, 8, 0)
    writeUint16(localHeader.view, 10, 0)
    writeUint16(localHeader.view, 12, 0)
    writeUint32(localHeader.view, 14, file.crc)
    writeUint32(localHeader.view, 18, file.bytes.length)
    writeUint32(localHeader.view, 22, file.bytes.length)
    writeUint16(localHeader.view, 26, file.filenameBytes.length)
    writeUint16(localHeader.view, 28, 0)

    chunks.push(new Uint8Array(localHeader.buffer), file.filenameBytes, file.bytes)

    const centralHeader = createHeader(46)
    writeUint32(centralHeader.view, 0, 0x02014b50)
    writeUint16(centralHeader.view, 4, 20)
    writeUint16(centralHeader.view, 6, 20)
    writeUint16(centralHeader.view, 8, 0)
    writeUint16(centralHeader.view, 10, 0)
    writeUint16(centralHeader.view, 12, 0)
    writeUint16(centralHeader.view, 14, 0)
    writeUint32(centralHeader.view, 16, file.crc)
    writeUint32(centralHeader.view, 20, file.bytes.length)
    writeUint32(centralHeader.view, 24, file.bytes.length)
    writeUint16(centralHeader.view, 28, file.filenameBytes.length)
    writeUint16(centralHeader.view, 30, 0)
    writeUint16(centralHeader.view, 32, 0)
    writeUint16(centralHeader.view, 34, 0)
    writeUint16(centralHeader.view, 36, 0)
    writeUint32(centralHeader.view, 38, 0)
    writeUint32(centralHeader.view, 42, offset)

    centralDirectoryChunks.push(new Uint8Array(centralHeader.buffer), file.filenameBytes)
    offset += 30 + file.filenameBytes.length + file.bytes.length
  }

  const centralDirectorySize = centralDirectoryChunks.reduce(
    (total, chunk) => total + chunk.length,
    0,
  )
  const centralDirectoryOffset = offset
  const endRecord = createHeader(22)
  writeUint32(endRecord.view, 0, 0x06054b50)
  writeUint16(endRecord.view, 4, 0)
  writeUint16(endRecord.view, 6, 0)
  writeUint16(endRecord.view, 8, fetchedFiles.length)
  writeUint16(endRecord.view, 10, fetchedFiles.length)
  writeUint32(endRecord.view, 12, centralDirectorySize)
  writeUint32(endRecord.view, 16, centralDirectoryOffset)
  writeUint16(endRecord.view, 20, 0)

  const zipBlob = new Blob(
    [...chunks, ...centralDirectoryChunks, new Uint8Array(endRecord.buffer)] as BlobPart[],
    { type: 'application/zip' },
  )
  triggerBlobDownload(zipBlob, zipFilename)

  return files.length
}
