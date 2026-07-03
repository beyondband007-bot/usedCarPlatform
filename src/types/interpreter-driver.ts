/**
 * 同声传译驱动器接口
 *
 * 前后端契约的类型层。UI 与会话引擎只依赖此接口,
 * 具体实现可以是 MockDriver(纯前端演示)或 TencentDriver(TRTC+ASR+TMT+TTS)。
 *
 * 事件流(下行)由 driver.on* 回调推送;命令流(上行)由 driver 方法调用。
 * 所有事件的 payload 结构与后端 WebSocket 事件一一对应,详见:
 *   docs/superpowers/specs/2026-07-02-interpreter-integration-contract.md
 */
import type {
  InterpreterAvatarColor,
  InterpreterLangCode,
  InterpreterPerspective,
  InterpreterSpeaker,
} from './interpreter'

// ============================================================
// 房间与凭证
// ============================================================

/** 创建房间请求(主持人发起) */
export interface CreateRoomRequest {
  topic: string
  hostLang: InterpreterLangCode
  guestLang: InterpreterLangCode
  host: PartyDescriptor
}

/** 创建房间响应 */
export interface CreateRoomResponse {
  roomId: string
  sdkAppId: number
  hostUserId: string
  hostUserSig: string
  /** 受邀方免登录用的一次性凭证(短期,绑定 roomId) */
  inviteToken: string
  /** 邀请链接完整 URL(前端展示/复制用) */
  inviteUrl: string
  /** 邀请有效期截止时间 (unix ms) */
  inviteExpiresAt: number
}

/** 受邀方用 inviteToken 换 userSig 的请求 */
export interface JoinAsGuestRequest {
  roomId: string
  inviteToken: string
  guest: PartyDescriptor
  /** 受邀方选择的语言(可能与主持人预设不同) */
  guestLang: InterpreterLangCode
}

export interface JoinAsGuestResponse {
  sdkAppId: number
  guestUserId: string
  guestUserSig: string
  /** 主持人已声明的信息,用于受邀方 UI 展示 */
  host: PartyDescriptor
  hostLang: InterpreterLangCode
  topic: string
}

/** 参与者的展示信息 */
export interface PartyDescriptor {
  name: string
  color: InterpreterAvatarColor
  initial: string
}

// ============================================================
// 下行事件(driver → UI)
// ============================================================

/**
 * 字幕事件(interim/final 两种)
 *
 * interim:临时结果,前端灰色/斜体显示,后续会被 final 替换。
 * final:定版,归档进 transcript,可能带译文;若译文暂缺,textTrans 为 null,
 *        UI 保留原文并等待 subtitle-translation-update 补齐。
 */
export interface SubtitleInterimEvent {
  type: 'subtitle-interim'
  /** 说话人角色(相对于事件接收者的 perspective 前端会自行映射) */
  speaker: InterpreterSpeaker
  /** 会话内单调递增的行号,同一 lineId 的 interim 会被后续 final 替换 */
  lineId: string
  /** 原文文本(尚在识别中) */
  textOrig: string
  /** 事件产生时间 (unix ms) */
  ts: number
}

export interface SubtitleFinalEvent {
  type: 'subtitle-final'
  speaker: InterpreterSpeaker
  lineId: string
  textOrig: string
  /** 译文;若后端翻译暂未就绪可为 null,稍后由 translation-update 补齐 */
  textTrans: string | null
  ts: number
}

/** 译文补齐/更新(用于 final 已到、译文延迟到达的场景) */
export interface SubtitleTranslationUpdateEvent {
  type: 'subtitle-translation-update'
  lineId: string
  textTrans: string
  /** 是否为降级结果(如翻译失败、返回原文) */
  degraded?: boolean
}

/** 参与者加入 */
export interface ParticipantJoinedEvent {
  type: 'participant-joined'
  role: InterpreterPerspective
  party: PartyDescriptor
  lang: InterpreterLangCode
}

/** 参与者离开(挂断/掉线) */
export interface ParticipantLeftEvent {
  type: 'participant-left'
  role: InterpreterPerspective
  reason: 'hangup' | 'timeout' | 'kicked' | 'network'
}

/** 网络质量变化 */
export interface QualityChangeEvent {
  type: 'quality-change'
  /** 1(优) ~ 6(断线) */
  level: 1 | 2 | 3 | 4 | 5 | 6
  role: InterpreterPerspective
}

/** 房间结束(服务端主动或双方挂断) */
export interface RoomEndedEvent {
  type: 'room-ended'
  reason: 'host-hangup' | 'guest-hangup' | 'timeout' | 'server-close'
  /** 服务端返回的最终 transcript URL / VOD fileId(可选) */
  archiveUrl?: string
  vodFileId?: string
}

/** 错误事件(前端展示 toast/横幅) */
export interface DriverErrorEvent {
  type: 'error'
  /** 错误分类,便于前端做对应降级 */
  scope: 'signaling' | 'media' | 'asr' | 'translate' | 'tts' | 'auth' | 'network'
  message: string
  recoverable: boolean
}

/** 所有下行事件的联合类型 */
export type DriverEvent =
  | SubtitleInterimEvent
  | SubtitleFinalEvent
  | SubtitleTranslationUpdateEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | QualityChangeEvent
  | RoomEndedEvent
  | DriverErrorEvent

// ============================================================
// 上行命令(UI → driver)
// ============================================================

/** 手动翻译请求(手动对话模式) */
export interface ManualTranslateRequest {
  text: string
  from: InterpreterLangCode
  to: InterpreterLangCode
  /** 说话人角色(用于归档 transcript) */
  speaker: InterpreterSpeaker
}

export interface ManualTranslateResponse {
  textOrig: string
  textTrans: string
  /** 是否为降级结果 */
  degraded: boolean
}

/** 通话模式切换 */
export type CallMode = 'auto' | 'manual'

/** 媒体挂载点 */
export interface MediaMountTargets {
  /** 本地视频渲染容器(PIP) */
  localVideoEl: HTMLElement
  /** 远端视频渲染容器(主舞台) */
  remoteVideoEl: HTMLElement
}

// ============================================================
// Driver 接口
// ============================================================

export interface InterpreterDriver {
  /** 驱动器实现标识,便于调试 */
  readonly kind: 'mock' | 'tencent'

  // ---- 生命周期 ----
  /** 主持人:创建房间(内部完成 userSig 拉取、TRTC 连接) */
  createRoom(req: CreateRoomRequest): Promise<CreateRoomResponse>

  /** 受邀方:用 inviteToken 加入房间 */
  joinAsGuest(req: JoinAsGuestRequest): Promise<JoinAsGuestResponse>

  /** 挂断(通知对方,清理本地资源) */
  hangup(): Promise<void>

  /** 完全销毁,组件卸载时调用 */
  dispose(): void

  // ---- 媒体 ----
  /** 附加本地媒体到 DOM 节点(TRTC 需要真实 DOM,mock 可空实现) */
  attachMedia(targets: MediaMountTargets): Promise<void>

  toggleMic(on: boolean): void
  toggleCam(on: boolean): void

  // ---- 通话模式 ----
  setMode(mode: CallMode): void

  /** 手动模式:提交一句待翻译 */
  translateManual(req: ManualTranslateRequest): Promise<ManualTranslateResponse>

  // ---- 事件订阅 ----
  /**
   * 订阅下行事件。返回取消订阅函数。
   * UI 层通常在 useInterpreterSession 内部集中订阅,不外露给视图。
   */
  on(handler: (event: DriverEvent) => void): () => void
}
