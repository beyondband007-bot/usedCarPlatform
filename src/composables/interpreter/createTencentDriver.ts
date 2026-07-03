/**
 * TencentDriver:生产驱动器骨架(TRTC + 后端 WebSocket)。
 *
 * 当前是**骨架实现**——已把结构、REST 客户端、WS 连接、TRTC SDK 挂载点都写好,
 * 但**未接真实后端**(接口尚未落地)。联调期后端 API 上线后:
 *   1. 把下方 TODO 标注处的 stub 替换成 REST/WS 调用
 *   2. TRTC 房间的 join/publish/subscribe 已经用官方 SDK API 完整调用
 *   3. WebSocket 事件透传到 driver 事件流,视图/引擎不改
 *
 * 视图与状态机完全依赖 InterpreterDriver 接口,切换 driver 就是切换实现。
 */
import TRTC from 'trtc-sdk-v5'

import {
  createInterpreterRoom,
  endInterpreterRoom,
  joinInterpreterRoom,
  translateInterpreterText,
} from '@/api/interpreter'
import type {
  CallMode,
  CreateRoomRequest,
  CreateRoomResponse,
  DriverEvent,
  InterpreterDriver,
  JoinAsGuestRequest,
  JoinAsGuestResponse,
  ManualTranslateRequest,
  ManualTranslateResponse,
  MediaMountTargets,
} from '@/types/interpreter-driver'

const WS_BASE =
  (import.meta.env.VITE_INTERPRETER_WS_BASE as string | undefined) ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/interpreter/ws`

const HEARTBEAT_MS = 25_000
const HEARTBEAT_TIMEOUT_MS = 60_000

export interface CreateTencentDriverOptions {
  perspective: 'host' | 'guest'
}

export function createTencentDriver(
  options: CreateTencentDriverOptions,
): InterpreterDriver {
  const { perspective } = options

  const listeners = new Set<(event: DriverEvent) => void>()
  const emit = (event: DriverEvent) => listeners.forEach((fn) => fn(event))

  /** TRTC 客户端实例;懒创建 */
  let trtcClient: ReturnType<typeof TRTC.create> | null = null
  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let heartbeatDeadline = 0
  let heartbeatCheck: ReturnType<typeof setInterval> | null = null

  let roomId = ''
  let inviteToken = ''
  let sdkAppId = 0
  let userId = ''
  let userSig = ''

  let localVideoEl: HTMLElement | null = null
  let remoteVideoEl: HTMLElement | null = null
  let mediaAttached = false
  let roomEntered = false
  let localAudioStarted = false
  let localVideoStarted = false
  let desiredMicOn = true
  let desiredCamOn = true
  let disposed = false

  function formatRtcError(error: unknown) {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error) {
      const maybe = error as { message?: unknown; code?: unknown; name?: unknown }
      const parts = [maybe.name, maybe.code, maybe.message]
        .filter((item) => item != null && item !== '')
        .map(String)
      if (parts.length) return parts.join(' · ')
    }
    return String(error)
  }

  function emitMediaError(message: string, error: unknown, recoverable = true) {
    emit({
      type: 'error',
      scope: 'media',
      message: `${message}: ${formatRtcError(error)}`,
      recoverable,
    })
  }

  // ============================================================
  // WebSocket
  // ============================================================
  function connectWebSocket(authSig: string) {
    disconnectWebSocket()
    const url = `${WS_BASE}?roomId=${encodeURIComponent(roomId)}&role=${perspective}&auth=${encodeURIComponent(authSig)}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      heartbeatDeadline = Date.now() + HEARTBEAT_TIMEOUT_MS
      heartbeatTimer = setInterval(() => {
        try {
          ws?.send(JSON.stringify({ type: 'ping' }))
        } catch {
          // ignore
        }
      }, HEARTBEAT_MS)
      heartbeatCheck = setInterval(() => {
        if (Date.now() > heartbeatDeadline) {
          emit({
            type: 'error',
            scope: 'network',
            message: '心跳超时,尝试重连',
            recoverable: true,
          })
          reconnectWebSocket(authSig)
        }
      }, 5000)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { type: 'pong' }
          | DriverEvent
        if ((msg as { type: string }).type === 'pong') {
          heartbeatDeadline = Date.now() + HEARTBEAT_TIMEOUT_MS
          return
        }
        emit(msg as DriverEvent)
      } catch (e) {
        emit({
          type: 'error',
          scope: 'signaling',
          message: `WS 消息解析失败: ${String(e)}`,
          recoverable: true,
        })
      }
    }

    ws.onerror = () => {
      emit({
        type: 'error',
        scope: 'signaling',
        message: 'WebSocket 连接错误',
        recoverable: true,
      })
    }

    ws.onclose = () => {
      // 由 heartbeatCheck 触发重连;此处仅清理
    }
  }

  function reconnectWebSocket(authSig: string) {
    if (disposed) return
    disconnectWebSocket()
    // 简单退避:1s 后重试(生产可加指数退避)
    setTimeout(() => {
      if (!disposed && roomId) connectWebSocket(authSig)
    }, 1000)
  }

  function disconnectWebSocket() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (heartbeatCheck) {
      clearInterval(heartbeatCheck)
      heartbeatCheck = null
    }
    if (ws) {
      try {
        ws.close()
      } catch {
        // ignore
      }
      ws = null
    }
  }

  // ============================================================
  // TRTC
  // ============================================================
  async function initTrtc() {
    if (trtcClient) return trtcClient
    trtcClient = TRTC.create()

    trtcClient.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, async (event) => {
      if (!remoteVideoEl) return
      try {
        await trtcClient!.startRemoteVideo({
          userId: event.userId,
          streamType: event.streamType,
          view: remoteVideoEl,
        })
      } catch (e) {
        emit({
          type: 'error',
          scope: 'media',
          message: `远端视频挂载失败: ${String(e)}`,
          recoverable: true,
        })
      }
    })

    trtcClient.on(TRTC.EVENT.REMOTE_USER_ENTER, (event) => {
      // 参与者加入 —— 具体身份/语言由后端 WS 推送 participant-joined,
      // 此处只感知 TRTC 层的进房,不 emit 业务事件,避免重复。
      void event
    })

    trtcClient.on(TRTC.EVENT.REMOTE_USER_EXIT, (event) => {
      void event
      // 同上:业务层 participant-left 由后端 WS 权威推送
    })

    trtcClient.on(TRTC.EVENT.NETWORK_QUALITY, (event) => {
      const uplink = event.uplinkNetworkQuality as number
      const level = (Math.min(6, Math.max(1, uplink)) as 1 | 2 | 3 | 4 | 5 | 6)
      emit({ type: 'quality-change', level, role: perspective })
    })

    trtcClient.on(TRTC.EVENT.PERMISSION_STATE_CHANGE, (event) => {
      if (event.camera === 'denied' || event.microphone === 'denied') {
        emit({
          type: 'error',
          scope: 'media',
          message: '摄像头或麦克风权限被拒绝，请在浏览器地址栏重新允许设备权限',
          recoverable: true,
        })
      }
    })

    return trtcClient
  }

  async function enterTrtcRoom() {
    const client = await initTrtc()
    if (!roomEntered) {
      await client.enterRoom({
        strRoomId: roomId,
        sdkAppId,
        userId,
        userSig,
        autoReceiveAudio: true,
        autoReceiveVideo: false,
        // 默认 mode 由 SDK 选择;这里显式指定视频通话模式
      })
      roomEntered = true
    }
    await ensureLocalMedia()
  }

  async function leaveTrtcRoom() {
    if (!trtcClient) return
    try {
      await Promise.allSettled([
        localVideoStarted ? trtcClient.stopLocalVideo() : Promise.resolve(),
        localAudioStarted ? trtcClient.stopLocalAudio() : Promise.resolve(),
      ])
      localVideoStarted = false
      localAudioStarted = false
      await trtcClient.exitRoom()
      roomEntered = false
    } catch {
      // ignore
    }
  }

  async function ensureLocalVideo() {
    if (!trtcClient || !localVideoEl || localVideoStarted || !desiredCamOn) return
    try {
      await trtcClient.startLocalVideo({
        view: localVideoEl,
        option: {
          fillMode: 'cover',
          mirror: 'view',
          profile: '480p',
        },
      })
      localVideoStarted = true
      await trtcClient.updateLocalVideo({ mute: false })
    } catch (error) {
      emitMediaError('本地摄像头启动失败，请检查摄像头权限或设备占用情况', error)
    }
  }

  async function ensureLocalAudio() {
    if (!trtcClient || localAudioStarted || !desiredMicOn) return
    try {
      await trtcClient.startLocalAudio()
      localAudioStarted = true
      await trtcClient.updateLocalAudio({ mute: false })
    } catch (error) {
      emitMediaError('本地麦克风启动失败，请检查麦克风权限或设备占用情况', error)
    }
  }

  async function ensureLocalMedia() {
    await Promise.all([ensureLocalVideo(), ensureLocalAudio()])
  }

  async function setLocalAudioEnabled(on: boolean) {
    desiredMicOn = on
    if (!trtcClient) return
    if (!localAudioStarted && on) {
      await ensureLocalAudio()
      return
    }
    if (!localAudioStarted) return
    try {
      await trtcClient.updateLocalAudio({ mute: !on })
    } catch (error) {
      emitMediaError('切换麦克风失败', error)
    }
  }

  async function setLocalVideoEnabled(on: boolean) {
    desiredCamOn = on
    if (!trtcClient) return
    if (!localVideoStarted && on) {
      await ensureLocalVideo()
      return
    }
    if (!localVideoStarted) return
    try {
      await trtcClient.updateLocalVideo({ mute: !on })
    } catch (error) {
      emitMediaError('切换摄像头失败', error)
    }
  }

  // ============================================================
  // Driver 接口实现
  // ============================================================
  return {
    kind: 'tencent',

    async createRoom(req: CreateRoomRequest): Promise<CreateRoomResponse> {
      const res = await createInterpreterRoom(req)
      roomId = res.roomId
      sdkAppId = res.sdkAppId
      userId = res.hostUserId
      userSig = res.hostUserSig
      connectWebSocket(userSig)
      return res
    },

    async joinAsGuest(req: JoinAsGuestRequest): Promise<JoinAsGuestResponse> {
      const res = await joinInterpreterRoom(req)
      roomId = req.roomId
      inviteToken = req.inviteToken
      sdkAppId = res.sdkAppId
      userId = res.guestUserId
      userSig = res.guestUserSig
      connectWebSocket(inviteToken)
      return res
    },

    async attachMedia(targets: MediaMountTargets) {
      localVideoEl = targets.localVideoEl
      remoteVideoEl = targets.remoteVideoEl
      if (!mediaAttached && roomId && userSig) {
        mediaAttached = true
        try {
          await enterTrtcRoom()
        } catch (error) {
          mediaAttached = false
          emitMediaError('进入 TRTC 房间失败', error, false)
          throw error
        }
      } else if (trtcClient && roomEntered) {
        await ensureLocalMedia()
      }
    },

    toggleMic(on: boolean) {
      void setLocalAudioEnabled(on)
    },

    toggleCam(on: boolean) {
      void setLocalVideoEnabled(on)
    },

    setMode(_mode: CallMode) {
      // 生产环境的模式切换由前端 UI 状态维护即可;
      // ASR/TMT 是否推流由后端根据 room 状态决定,driver 无需通知服务端。
      // 若未来需要主动通知(如"暂停识别节约算力"),再加 WS 上行事件。
    },

    async translateManual(req: ManualTranslateRequest): Promise<ManualTranslateResponse> {
      try {
        return await translateInterpreterText(req, { roomId, inviteToken })
      } catch (e) {
        emit({
          type: 'error',
          scope: 'translate',
          message: `翻译请求失败: ${String(e)}`,
          recoverable: true,
        })
        return { textOrig: req.text, textTrans: req.text, degraded: true }
      }
    },

    async hangup() {
      try {
        if (roomId) await endInterpreterRoom(roomId)
      } catch {
        // ignore:UI 已在切 summary
      }
      await leaveTrtcRoom()
      disconnectWebSocket()
    },

    dispose() {
      disposed = true
      disconnectWebSocket()
      if (trtcClient) {
        leaveTrtcRoom().finally(() => {
          try {
            trtcClient?.destroy?.()
          } catch {
            // ignore
          }
          trtcClient = null
        })
      }
      listeners.clear()
    },

    on(handler) {
      listeners.add(handler)
      return () => listeners.delete(handler)
    },
  }
}
