export interface PaintColorOption {
  name: string
  hex: string
}

export const paintColorOptions: PaintColorOption[] = [
  { name: '珍珠白', hex: '#F8F9F5' },
  { name: '冰川白', hex: '#F2F6F8' },
  { name: '极地白', hex: '#FFFFFF' },
  { name: '象牙白', hex: '#F6F0E3' },
  { name: '奶油白', hex: '#F4EAD5' },
  { name: '银白色', hex: '#D9DEE3' },
  { name: '星耀银', hex: '#C8CED6' },
  { name: '钛银灰', hex: '#AEB5BD' },
  { name: '流光银', hex: '#BFC6CC' },
  { name: '香槟银', hex: '#D6C7A8' },
  { name: '浅灰色', hex: '#B8BDC3' },
  { name: '水泥灰', hex: '#8D9298' },
  { name: '量子灰', hex: '#6F7781' },
  { name: '钛金灰', hex: '#5F666D' },
  { name: '深空灰', hex: '#3E454D' },
  { name: '磨砂灰', hex: '#555A60' },
  { name: '石墨灰', hex: '#2F3439' },
  { name: '碳晶灰', hex: '#23272B' },
  { name: '曜石黑', hex: '#0E1114' },
  { name: '玄武黑', hex: '#111111' },
  { name: '魅影黑', hex: '#181A1D' },
  { name: '星夜黑', hex: '#080A0D' },
  { name: '钢琴黑', hex: '#050505' },
  { name: '墨蓝黑', hex: '#101820' },
  { name: '深海蓝', hex: '#0B2B45' },
  { name: '宝石蓝', hex: '#0057A8' },
  { name: '极光蓝', hex: '#1E6FB8' },
  { name: '冰川蓝', hex: '#A9D8F2' },
  { name: '天空蓝', hex: '#75BCE8' },
  { name: '电光蓝', hex: '#0077FF' },
  { name: '星河蓝', hex: '#1D2F6F' },
  { name: '午夜蓝', hex: '#061A2F' },
  { name: '湖水蓝', hex: '#2FA7B8' },
  { name: '松石绿', hex: '#2A9D8F' },
  { name: '森林绿', hex: '#123C2C' },
  { name: '墨绿色', hex: '#0B2F22' },
  { name: '翡翠绿', hex: '#007A5E' },
  { name: '青灰绿', hex: '#6F8A83' },
  { name: '沙漠金', hex: '#C7A15A' },
  { name: '香槟金', hex: '#D9C79E' },
  { name: '琥珀金', hex: '#B9822C' },
  { name: '金属棕', hex: '#6B4A2D' },
  { name: '摩卡棕', hex: '#4B3326' },
  { name: '咖啡棕', hex: '#3B2418' },
  { name: '枫叶红', hex: '#A21C26' },
  { name: '中国红', hex: '#D71920' },
  { name: '酒红色', hex: '#6E1023' },
  { name: '熔岩红', hex: '#C1121F' },
  { name: '橙红色', hex: '#E85D04' },
  { name: '活力橙', hex: '#F77F00' },
]

export const paintColorSwatches = paintColorOptions.map((item) => item.hex)

export function findPaintColorByHex(hex?: string | null) {
  if (!hex) return undefined
  const normalized = hex.trim().toUpperCase()
  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`
  return paintColorOptions.find((item) => item.hex.toUpperCase() === withHash)
}
