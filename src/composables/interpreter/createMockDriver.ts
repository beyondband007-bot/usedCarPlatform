/**
 * MockDriver:纯前端演示驱动器。
 *
 * 用于 mock 阶段和联调环境未就绪时:
 * - 房间号/凭证在前端生成(不经后端)
 * - 跨标签信令走 BroadcastChannel
 * - "自动剧本"推进内置对话脚本模拟 ASR+TMT 输出
 * - "手动模式"用内置词典 DICT 模拟翻译
 * - 视频/音频挂载为空实现(UI 用 mock 头像)
 */
import {
  INTERPRETER_DICT,
  INTERPRETER_INVITE_TTL_SECONDS,
  INTERPRETER_JOIN_ROUTE,
  INTERPRETER_LINE_GAP_MS,
  INTERPRETER_SCRIPT,
  INTERPRETER_TYPING_MS,
} from '@/constants/interpreter'
import type { InterpreterLangCode } from '@/types/interpreter'
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  DriverEvent,
  InterpreterDriver,
  JoinAsGuestRequest,
  JoinAsGuestResponse,
  ManualTranslateRequest,
  ManualTranslateResponse,
  MediaMountTargets,
  CallMode,
  PartyDescriptor,
} from '@/types/interpreter-driver'

const ROOM_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genRoomId() {
  let s = ''
  for (let i = 0; i < 6; i += 1) {
    s += ROOM_CHARSET[Math.floor(Math.random() * ROOM_CHARSET.length)]
  }
  return s
}

interface StoredMeeting {
  topic: string
  host: PartyDescriptor
  hostLang: InterpreterLangCode
  guestLang: InterpreterLangCode
}

function meetingKey(roomId: string) {
  return `interpreter-meeting-${roomId}`
}

/**
 * BroadcastChannel 层的"信令消息"。这是 mock 内部实现细节,
 * 不属于契约的一部分——真实实现走 WebSocket。
 */
type MockSignal =
  | {
      type: 'joined'
      guest: PartyDescriptor
      guestLang: InterpreterLangCode
    }
  | { type: 'hangup'; by: 'host' | 'guest' }

export interface CreateMockDriverOptions {
  perspective: 'host' | 'guest'
}

export function createMockDriver(options: CreateMockDriverOptions): InterpreterDriver {
  const { perspective } = options

  const listeners = new Set<(event: DriverEvent) => void>()
  const emit = (event: DriverEvent) => {
    listeners.forEach((fn) => fn(event))
  }

  let channel: BroadcastChannel | null = null
  let roomId = ''
  let autoTimer: ReturnType<typeof setTimeout> | null = null
  let autoIdx = 0
  let mode: CallMode = 'auto'
  let autoRunning = false
  let lineSeq = 0
  let disposed = false

  function connectChannel(rid: string) {
    if (channel) channel.close()
    if (typeof BroadcastChannel === 'undefined' || !rid) return
    channel = new BroadcastChannel(`interpreter-room-${rid}`)
    channel.onmessage = (ev: MessageEvent<MockSignal>) => {
      const msg = ev.data
      if (!msg) return
      if (msg.type === 'joined' && perspective === 'host') {
        emit({
          type: 'participant-joined',
          role: 'guest',
          party: msg.guest,
          lang: msg.guestLang,
        })
      } else if (msg.type === 'hangup') {
        const remoteRole = perspective === 'host' ? 'guest' : 'host'
        if (msg.by === remoteRole) {
          emit({
            type: 'participant-left',
            role: remoteRole,
            reason: 'hangup',
          })
          emit({
            type: 'room-ended',
            reason: msg.by === 'host' ? 'host-hangup' : 'guest-hangup',
          })
        }
      }
    }
  }

  function stopAuto() {
    if (autoTimer) {
      clearTimeout(autoTimer)
      autoTimer = null
    }
    autoRunning = false
  }

  function nextLineId() {
    lineSeq += 1
    return `mock-${roomId || 'x'}-${lineSeq}`
  }

  function pushNextScriptLine() {
    if (disposed || mode !== 'auto') return
    const item = INTERPRETER_SCRIPT[autoIdx % INTERPRETER_SCRIPT.length]
    autoIdx += 1
    const lineId = nextLineId()
    // 打字机:先发 interim,typing 后发 final(含译文)
    emit({
      type: 'subtitle-interim',
      speaker: item.who,
      lineId,
      textOrig: item.who === 'me' ? item.zh : item.en,
      ts: Date.now(),
    })
    autoTimer = setTimeout(() => {
      if (disposed || mode !== 'auto') return
      emit({
        type: 'subtitle-final',
        speaker: item.who,
        lineId,
        textOrig: item.who === 'me' ? item.zh : item.en,
        textTrans: item.who === 'me' ? item.en : item.zh,
        ts: Date.now(),
      })
      autoTimer = setTimeout(pushNextScriptLine, INTERPRETER_LINE_GAP_MS)
    }, INTERPRETER_TYPING_MS)
  }

  function startAuto() {
    stopAuto()
    autoRunning = true
    autoIdx = 0
    pushNextScriptLine()
  }

  return {
    kind: 'mock',

    async createRoom(req: CreateRoomRequest): Promise<CreateRoomResponse> {
      roomId = genRoomId()
      const inviteUrl = `${location.origin}${INTERPRETER_JOIN_ROUTE}?room=${roomId}`
      // 保存 meta 供受邀方 loadMeeting 使用
      try {
        const stored: StoredMeeting = {
          topic: req.topic,
          host: req.host,
          hostLang: req.hostLang,
          guestLang: req.guestLang,
        }
        localStorage.setItem(meetingKey(roomId), JSON.stringify(stored))
      } catch {
        // ignore
      }
      connectChannel(roomId)
      return {
        roomId,
        sdkAppId: 0,
        hostUserId: 'mock-host',
        hostUserSig: 'mock-sig',
        inviteToken: 'mock-invite-token',
        inviteUrl,
        inviteExpiresAt: Date.now() + INTERPRETER_INVITE_TTL_SECONDS * 1000,
      }
    },

    async joinAsGuest(req: JoinAsGuestRequest): Promise<JoinAsGuestResponse> {
      roomId = req.roomId
      connectChannel(roomId)
      // 读取 host 存放的 meta
      let stored: StoredMeeting | null = null
      try {
        const raw = localStorage.getItem(meetingKey(roomId))
        if (raw) stored = JSON.parse(raw) as StoredMeeting
      } catch {
        // ignore
      }
      const fallback: StoredMeeting = {
        topic: '面谈会议',
        host: { name: '林沐辰', color: 'gold', initial: '林' },
        hostLang: 'zh',
        guestLang: 'en',
      }
      const meta = stored ?? fallback
      // 广播 joined 通知 host
      channel?.postMessage({
        type: 'joined',
        guest: req.guest,
        guestLang: req.guestLang,
      } satisfies MockSignal)
      // 通知本地引擎:host 信息已就位
      emit({
        type: 'participant-joined',
        role: 'host',
        party: meta.host,
        lang: meta.hostLang,
      })
      return {
        sdkAppId: 0,
        guestUserId: 'mock-guest',
        guestUserSig: 'mock-sig',
        host: meta.host,
        hostLang: meta.hostLang,
        topic: meta.topic,
      }
    },

    async hangup() {
      channel?.postMessage({
        type: 'hangup',
        by: perspective,
      } satisfies MockSignal)
      stopAuto()
    },

    dispose() {
      disposed = true
      stopAuto()
      channel?.close()
      channel = null
      listeners.clear()
    },

    async attachMedia(_targets: MediaMountTargets) {
      // mock 不接管真实视频,UI 直接展示头像
    },

    toggleMic(_on: boolean) {
      // mock 无实体音轨
    },

    toggleCam(_on: boolean) {
      // mock 无实体视频轨
    },

    setMode(next: CallMode) {
      mode = next
      if (mode === 'auto') {
        if (!autoRunning) startAuto()
      } else {
        stopAuto()
      }
    },

    async translateManual(req: ManualTranslateRequest): Promise<ManualTranslateResponse> {
      const raw = req.text.trim()
      let translated: string | null = null
      const dict = INTERPRETER_DICT[raw]
      if (dict && dict[req.to]) {
        translated = dict[req.to] as string
      } else {
        const clean = raw.replace(/[,.!?;:，。！？；：]/g, '').trim()
        const dict2 = INTERPRETER_DICT[clean]
        if (dict2 && dict2[req.to]) translated = dict2[req.to] as string
      }
      const lineId = nextLineId()
      const textOrig = raw
      const textTrans = translated ?? raw
      // 通过事件流也推一次 final,让引擎归档 transcript
      emit({
        type: 'subtitle-final',
        speaker: req.speaker,
        lineId,
        textOrig,
        textTrans,
        ts: Date.now(),
      })
      return { textOrig, textTrans, degraded: translated === null }
    },

    on(handler) {
      listeners.add(handler)
      // 首次进 auto 模式时启动剧本;引擎会在通话开始时调 setMode('auto')
      // 但为了兼容"连接后立即出字幕"这种预期,mock 里也可以在此处启动。
      // 实际由 setMode 触发,这里保持纯订阅。
      return () => listeners.delete(handler)
    },
  }
}

/** 主持人单标签演示兜底:打开受邀方 tab */
export function openMockGuestTab(roomId: string) {
  const url = `${location.origin}${INTERPRETER_JOIN_ROUTE}?room=${roomId}`
  window.open(url, '_blank')
}
