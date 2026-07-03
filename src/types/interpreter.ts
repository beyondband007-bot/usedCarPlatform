/**
 * 同声传译模块类型定义
 *
 * 纯前端 mock：不涉及真实音视频 / 信令 / 持久化。
 */

/** 支持的语种代码 */
export type InterpreterLangCode = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de'

/** 头像渐变色板键 */
export type InterpreterAvatarColor =
  | 'gold'
  | 'blue'
  | 'green'
  | 'red'
  | 'violet'
  | 'amber'
  | 'teal'
  | 'slate'

/** 会话视图（去掉演示标签栏后按真实流程流转） */
export type InterpreterView = 'setup' | 'share' | 'join' | 'call' | 'summary'

/** 会话视角：主持人（发起方）/ 受邀方 */
export type InterpreterPerspective = 'host' | 'guest'

/** 通话字幕呈现模式 */
export type InterpreterSubtitleMode = 'double' | 'single'

/** 通话对话模式 */
export type InterpreterCallMode = 'auto' | 'manual'

/** 对话发言方 */
export type InterpreterSpeaker = 'me' | 'guest'

/** 语种展示信息 */
export interface InterpreterLangInfo {
  /** 完整名称，如 "中文" */
  name: string
  /** 单字/短标，如 "中" / "EN" */
  short: string
}

/** 受邀方预设昵称 chip */
export interface InterpreterGuestPreset {
  name: string
  color: InterpreterAvatarColor
  initial: string
}

/** 自动剧本单句 */
export interface InterpreterScriptLine {
  who: InterpreterSpeaker
  zh: string
  en: string
  /** 原型里的相对秒（仅作参考，实际推进用固定节奏） */
  time: number
}

/** 字幕记录条目（transcript / 摘要复用） */
export interface InterpreterTranscriptEntry {
  /** 记录时刻 mm:ss 或 HH:mm 文本 */
  time: string
  who: InterpreterSpeaker
  /** 发言方昵称 */
  sideLabel: string
  /** 我方语言文本（原型里恒为中文侧） */
  zh: string
  /** 对方语言文本（原型里恒为英文侧） */
  en: string
}
