export interface DeliveryResultItem {
  title: string
  ratio: string
  image: string
}

export const deliveryResults: DeliveryResultItem[] = [
  {
    title: '主图 · 玻璃展厅',
    ratio: '1 / 1',
    image:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '竖版详情 · 车头',
    ratio: '3 / 4',
    image:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '横版详情 · 侧身',
    ratio: '4 / 3',
    image:
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '内饰 · 中控',
    ratio: '1 / 1',
    image:
      'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '竖版封面 · 灯光',
    ratio: '3 / 4',
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '竖屏封面 · 全屏',
    ratio: '9 / 16',
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '宽幅 · 展厅氛围',
    ratio: '16 / 9',
    image:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=82',
  },
  {
    title: '细节 · 轮毂',
    ratio: '1 / 1',
    image:
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '内饰 · 座椅',
    ratio: '4 / 3',
    image:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '主图 · 侧光',
    ratio: '1 / 1',
    image:
      'https://images.unsplash.com/photo-1583121274602-3e2820c58988?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '竖版详情 · 车尾',
    ratio: '3 / 4',
    image:
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=82',
  },
  {
    title: '横版氛围 · 夜景',
    ratio: '16 / 9',
    image:
      'https://images.unsplash.com/photo-1485291571154-772bc14410bb?auto=format&fit=crop&w=1000&q=82',
  },
]

export function formatDeliveryRatio(ratio: string) {
  return ratio.replace(/\s*\/\s*/g, ':')
}
