/**
 * 同声传译模块常量与 mock 数据
 *
 * 来源：可点击原型 `同声传译模块 v0.1`（LANGS / DICT / SCRIPT）。
 * 纯前端 mock：词典与剧本仅用于演示，不代表真实翻译能力。
 */
import type {
  InterpreterAvatarColor,
  InterpreterGuestPreset,
  InterpreterLangCode,
  InterpreterLangInfo,
  InterpreterScriptLine,
} from '@/types/interpreter'

/** 能力 code（工作台 · 营销工具） */
export const INTERPRETER_CAPABILITY_CODE = 'simultaneous-interpretation'

/** 受邀方公开加入路由 */
export const INTERPRETER_JOIN_ROUTE = '/interpreter/join'

/** 邀请链接有效期（秒），share 页倒计时 */
export const INTERPRETER_INVITE_TTL_SECONDS = 600

/** 自动剧本：出泡前打字机时长（毫秒） */
export const INTERPRETER_TYPING_MS = 1500

/** 自动剧本：两句之间间隔（毫秒） */
export const INTERPRETER_LINE_GAP_MS = 2800

/** 语种表 */
export const INTERPRETER_LANGS: Record<InterpreterLangCode, InterpreterLangInfo> = {
  zh: { name: '中文', short: '中' },
  en: { name: 'English', short: 'EN' },
  ja: { name: '日本語', short: '日' },
  ko: { name: '한국어', short: '韩' },
  es: { name: 'Español', short: 'ES' },
  fr: { name: 'Français', short: 'FR' },
  de: { name: 'Deutsch', short: 'DE' },
}

/** 下拉可选语种顺序 */
export const INTERPRETER_LANG_OPTIONS: InterpreterLangCode[] = [
  'zh',
  'en',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
]

/** 头像渐变色板（供 CSS 类使用） */
export const INTERPRETER_AVATAR_PALETTE: InterpreterAvatarColor[] = [
  'gold',
  'blue',
  'green',
  'red',
  'violet',
  'amber',
  'teal',
  'slate',
]

/** 头像渐变（内联 background，避免依赖全局样式） */
export const INTERPRETER_AVATAR_GRADIENT: Record<InterpreterAvatarColor, string> = {
  gold: 'linear-gradient(135deg, #FFC93C, #FF8A3C)',
  blue: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  green: 'linear-gradient(135deg, #22C55E, #15803D)',
  red: 'linear-gradient(135deg, #EF4444, #B91C1C)',
  violet: 'linear-gradient(135deg, #A78BFA, #6D28D9)',
  amber: 'linear-gradient(135deg, #F59E0B, #B45309)',
  teal: 'linear-gradient(135deg, #14B8A6, #0F766E)',
  slate: 'linear-gradient(135deg, #64748B, #334155)',
}

/** 受邀方昵称预设 chip */
export const INTERPRETER_GUEST_PRESETS: InterpreterGuestPreset[] = [
  { name: 'Sarah Cohen', color: 'green', initial: 'S' },
  { name: 'John Mitchell', color: 'blue', initial: 'J' },
  { name: '田中 健太', color: 'violet', initial: '田' },
  { name: '김민준', color: 'amber', initial: '김' },
  { name: 'Pedro García', color: 'red', initial: 'P' },
  { name: 'Émile Dubois', color: 'teal', initial: 'É' },
  { name: 'Klaus Bauer', color: 'slate', initial: 'K' },
]

/**
 * MOCK 词典（汽车跨境贸易常用语，中 → 6 语种），用于「手动对话」模式演示。
 */
export const INTERPRETER_DICT: Record<
  string,
  Partial<Record<InterpreterLangCode, string>>
> = {
  你好: { en: 'Hello', ja: 'こんにちは', ko: '안녕하세요', es: 'Hola', fr: 'Bonjour', de: 'Hallo' },
  价格: { en: 'price', ja: '価格', ko: '가격', es: 'precio', fr: 'prix', de: 'Preis' },
  多少钱: { en: 'how much', ja: 'いくらですか', ko: '얼마예요', es: 'cuánto cuesta', fr: 'combien', de: 'wie viel' },
  颜色: { en: 'color', ja: '色', ko: '색상', es: 'color', fr: 'couleur', de: 'Farbe' },
  黑色: { en: 'black', ja: 'ブラック', ko: '블랙', es: 'negro', fr: 'noir', de: 'Schwarz' },
  白色: { en: 'white', ja: 'ホワイト', ko: '화이트', es: 'blanco', fr: 'blanc', de: 'Weiß' },
  现货: { en: 'in stock', ja: '在庫あり', ko: '재고 있음', es: 'en stock', fr: 'en stock', de: 'auf Lager' },
  库存: { en: 'stock', ja: '在庫', ko: '재고', es: 'stock', fr: 'stock', de: 'Bestand' },
  配置: { en: 'configuration', ja: '仕様', ko: '사양', es: 'configuración', fr: 'configuration', de: 'Ausstattung' },
  物流: { en: 'logistics', ja: '物流', ko: '물류', es: 'logística', fr: 'logistique', de: 'Logistik' },
  海运: { en: 'sea freight', ja: '海運', ko: '해운', es: 'transporte marítimo', fr: 'fret maritime', de: 'Seefracht' },
  空运: { en: 'air freight', ja: '空運', ko: '항공 운송', es: 'transporte aéreo', fr: 'fret aérien', de: 'Luftfracht' },
  保修: { en: 'warranty', ja: '保証', ko: '보증', es: 'garantía', fr: 'garantie', de: 'Garantie' },
  售后: { en: 'after-sales', ja: 'アフターサービス', ko: '애프터 서비스', es: 'postventa', fr: 'service après-vente', de: 'Kundendienst' },
  定金: { en: 'deposit', ja: '頭金', ko: '계약금', es: 'depósito', fr: 'acompte', de: 'Anzahlung' },
  尾款: { en: 'balance payment', ja: '残金', ko: '잔금', es: 'pago final', fr: 'solde', de: 'Restzahlung' },
  谢谢: { en: 'Thank you', ja: 'ありがとう', ko: '감사합니다', es: 'Gracias', fr: 'Merci', de: 'Danke' },
  不客气: { en: "You're welcome", ja: 'どういたしまして', ko: '천만에요', es: 'De nada', fr: 'De rien', de: 'Bitte sehr' },
  再见: { en: 'Goodbye', ja: 'さようなら', ko: '안녕히 가세요', es: 'Adiós', fr: 'Au revoir', de: 'Auf Wiedersehen' },
  好的: { en: 'Okay', ja: '了解', ko: '알겠습니다', es: 'Está bien', fr: "D'accord", de: 'In Ordnung' },
  没问题: { en: 'No problem', ja: '問題ありません', ko: '문제 없습니다', es: 'Sin problema', fr: 'Pas de problème', de: 'Kein Problem' },
  可以: { en: 'sure', ja: 'できます', ko: '가능합니다', es: 'puede ser', fr: "d'accord", de: 'kann' },
  请: { en: 'please', ja: 'どうぞ', ko: '제발', es: 'por favor', fr: "s'il vous plaît", de: 'bitte' },
  对不起: { en: "I'm sorry", ja: 'すみません', ko: '죄송합니다', es: 'Lo siento', fr: 'Désolé', de: 'Entschuldigung' },
  早上好: { en: 'Good morning', ja: 'おはようございます', ko: '좋은 아침입니다', es: 'Buenos días', fr: 'Bonjour', de: 'Guten Morgen' },
}

/**
 * MOCK 剧本（30 句中英汽车商务对话），用于「自动剧本」模式演示。
 */
export const INTERPRETER_SCRIPT: InterpreterScriptLine[] = [
  { who: 'me', zh: '你好,我们已经准备好了,可以开始吗?', en: "Hi, we're ready. Can we get started?", time: 0 },
  { who: 'guest', zh: '好的,我叫 Sarah,来自西海岸汽车公司。', en: 'Yes, please. I am Sarah from West Coast Motors.', time: 4 },
  { who: 'me', zh: '今天主要介绍 2024款 Model C,白色,长续航版本。', en: "Today I'll show you the 2024 Model C, white, long range.", time: 9 },
  { who: 'guest', zh: '你们现在有多少现货?', en: 'How many units do you have in stock?', time: 14 },
  { who: 'me', zh: '这款目前有 180 台现货,可立即发运。', en: 'We have 180 units in stock, ready to ship immediately.', time: 19 },
  { who: 'guest', zh: '10 台的批发价是多少?', en: 'What is the wholesale price for 10 units?', time: 25 },
  { who: 'me', zh: '10 台起,MOQ 报价 32500 美元一台,含 13% 增值税。', en: 'For 10 units, MOQ is USD 32,500 each, including 13% VAT.', time: 30 },
  { who: 'guest', zh: '价格还能再优惠一点吗?', en: 'Can you do better on the price?', time: 37 },
  { who: 'me', zh: '30 台以上可以给到 31200,这是最优惠价。', en: "For 30+ units we can do USD 31,200 — that's our best price.", time: 42 },
  { who: 'guest', zh: '有哪些颜色可选?', en: 'What colors are available?', time: 49 },
  { who: 'me', zh: '有 6 种颜色可选:黑、白、银、香槟金、深空灰、冰川蓝。', en: 'We have six colors: black, white, silver, champagne, space gray, ice blue.', time: 54 },
  { who: 'guest', zh: '质保政策是怎样的?', en: 'What is the warranty?', time: 61 },
  { who: 'me', zh: '整车 4 年或 15 万公里,三电终身质保。', en: '4 years or 150,000 km for the whole vehicle, lifetime warranty on the battery.', time: 66 },
  { who: 'guest', zh: '海运到洛杉矶要多久?', en: 'How long does shipping take to Los Angeles?', time: 73 },
  { who: 'me', zh: '海运到洛杉矶大约 18 天,空运 7 个工作日。', en: 'Sea freight to LA is about 18 days. Air freight is 7 business days.', time: 78 },
  { who: 'guest', zh: '海运费大概多少?', en: 'What is the freight cost for sea shipping?', time: 85 },
  { who: 'me', zh: '海运费按 FOB 报价,大约每台 850 美元到 LA 港。', en: 'Freight is FOB, about USD 850 per unit to LA port.', time: 90 },
  { who: 'guest', zh: '我需要 50 台,能提供分期付款吗?', en: 'I need 50 units. Can you offer financing?', time: 97 },
  { who: 'me', zh: '可以。我们提供 30% 定金 + 70% 见提单尾款,信用证也可。', en: 'We offer 30% deposit and 70% balance on B/L. L/C is also accepted.', time: 102 },
  { who: 'guest', zh: '首批什么时候可以发货?', en: 'When can you deliver the first batch?', time: 109 },
  { who: 'me', zh: '首批 15 台 7 个工作日内发出,月底前可全部清关。', en: 'First 15 units ship in 7 business days. Full clearance by month-end.', time: 114 },
  { who: 'guest', zh: '你们在美国有售后服务吗?', en: 'Do you provide after-sales service in the US?', time: 121 },
  { who: 'me', zh: '我们与加州和德州两家服务商合作,可提供本地保养。', en: 'We partner with two service providers in CA and TX for local maintenance.', time: 126 },
  { who: 'guest', zh: '能把完整的产品目录和参数表发给我吗?', en: 'Can you send me the full catalog and specs?', time: 133 },
  { who: 'me', zh: '会议结束后我会发 PDF 到您邮箱,含价格表和认证证书。', en: "I'll send the PDF with pricing and certifications to your email after the call.", time: 138 },
  { who: 'guest', zh: '好的,下周可以安排一次试驾吗?', en: 'Great. Can we schedule a test drive next week?', time: 145 },
  { who: 'me', zh: '可以,周三或周五我都有空,您选一个时间。', en: "Sure. I'm free Wednesday or Friday. Pick a time.", time: 150 },
  { who: 'guest', zh: '周三上午 10 点太平洋时间可以。', en: 'Wednesday at 10am Pacific Time works for me.', time: 157 },
  { who: 'me', zh: '好的,周三十点 PT 我会准时到场,会议纪要也会一并发邮件。', en: "Got it. I'll be there on time Wednesday at 10am PT, and I'll also send the meeting notes.", time: 162 },
  { who: 'guest', zh: '谢谢,那到时候见。', en: 'Thank you. Talk to you then.', time: 169 },
  { who: 'me', zh: '谢谢,期待下次见面,再见。', en: 'Thank you. Looking forward to meeting again. Goodbye.', time: 174 },
]
