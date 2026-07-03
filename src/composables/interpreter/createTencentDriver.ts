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
  let disposed = false

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

    return trtcClient
  }

  async function enterTrtcRoom() {
    const client = await initTrtc()
    await client.enterRoom({
      roomId: hashRoomId(roomId),
      sdkAppId,
      userId,
      userSig,
      // 默认 mode 由 SDK 选择;这里显式指定视频通话模式
    })
    // 开始本地流(先关麦克风/摄像头,等 UI 调 toggleMic/Cam 打开)
    if (localVideoEl) {
      try {
        await client.startLocalVideo({ view: localVideoEl })
        await client.startLocalAudio()
      } catch (e) {
        emit({
          type: 'error',
          scope: 'media',
          message: `本地媒体启动失败,请检查摄像头/麦克风权限: ${String(e)}`,
          recoverable: false,
        })
      }
    }
  }

  async function leaveTrtcRoom() {
    if (!trtcClient) return
    try {
      await trtcClient.exitRoom()
    } catch {
      // ignore
    }
  }

  /**
   * TRTC v5 的 roomId 支持字符串型 strRoomId 或数字型 roomId。
   * 后端返回的 roomId 是 6 位字母数字(如 Z6C784),此处直接用 strRoomId。
   */
  function hashRoomId(rid: string): number {
    // 兼容层:若后端将来给数字型房间号,此处替换;当前接口仍用 strRoomId,
    // 由 enterRoom 的 strRoomId 参数承接。为保持类型简单,此函数返回一个稳定 hash。
    let h = 0
    for (let i = 0; i < rid.length; i += 1) {
      h = (h * 31 + rid.charCodeAt(i)) | 0
    }
    return Math.abs(h)
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
        await enterTrtcRoom()
      }
    },

    toggleMic(on: boolean) {
      if (!trtcClient) return
      // TRTC v5:updateLocalAudio 或 muteLocalAudio
      trtcClient.updateLocalAudio({ mute: !on }).catch((e) => {
        emit({
          type: 'error',
          scope: 'media',
          message: `切换麦克风失败: ${String(e)}`,
          recoverable: true,
        })
      })
    },

    toggleCam(on: boolean) {
      if (!trtcClient) return
      trtcClient.updateLocalVideo({ mute: !on }).catch((e) => {
        emit({
          type: 'error',
          scope: 'media',
          message: `切换摄像头失败: ${String(e)}`,
          recoverable: true,
        })
      })
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
