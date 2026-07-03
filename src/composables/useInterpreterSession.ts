/**
 * 同声传译会话引擎(重构版)
 *
 * 只承载 UI 层需要的状态与派生:视图状态机、控制项、字幕缓冲、transcript、导出。
 * 业务动作(创建/加入/挂断/翻译/剧本推进/信令)全部委派给 driver。
 * driver 可以是 MockDriver(演示)或 TencentDriver(生产),视图零改动。
 */
import { computed, reactive } from 'vue'

import {
  INTERPRETER_AVATAR_GRADIENT,
  INTERPRETER_INVITE_TTL_SECONDS,
  INTERPRETER_JOIN_ROUTE,
  INTERPRETER_LANGS,
  INTERPRETER_SCRIPT,
} from '@/constants/interpreter'
import type {
  InterpreterAvatarColor,
  InterpreterCallMode,
  InterpreterLangCode,
  InterpreterPerspective,
  InterpreterSpeaker,
  InterpreterSubtitleMode,
  InterpreterTranscriptEntry,
  InterpreterView,
} from '@/types/interpreter'
import type {
  DriverEvent,
  InterpreterDriver,
  MediaMountTargets,
} from '@/types/interpreter-driver'
import { createMockDriver, openMockGuestTab } from './interpreter/createMockDriver'
import { createTencentDriver } from './interpreter/createTencentDriver'

/**
 * 选择驱动器:环境变量 VITE_INTERPRETER_DRIVER 决定,
 * 联调期可切换 'tencent' 走后端,回退到 'mock' 走本地演示。
 */
function resolveDefaultDriver(perspective: InterpreterPerspective): InterpreterDriver {
  const flag = import.meta.env.VITE_INTERPRETER_DRIVER as string | undefined
  if (flag === 'tencent') return createTencentDriver({ perspective })
  return createMockDriver({ perspective })
}

export interface InterpreterParty {
  name: string
  color: InterpreterAvatarColor
  initial: string
  lang: InterpreterLangCode
}

export interface InterpreterBubble extends InterpreterTranscriptEntry {
  id: number
  lineId: string
  interim: boolean
}

export function fmtTimer(secs: number) {
  const safe = Math.max(0, Math.floor(secs))
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0')
  const s = (safe % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}
function nowTimeString() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function initialOf(name: string) {
  const trimmed = name.replace(/\s/g, '')
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : '?'
}

export interface UseInterpreterSessionOptions {
  perspective: InterpreterPerspective
  /** 可选:注入自定义 driver(联调期切换 TencentDriver 用) */
  driver?: InterpreterDriver
}

export function useInterpreterSession(options: UseInterpreterSessionOptions) {
  const { perspective } = options
  const driver: InterpreterDriver = options.driver ?? resolveDefaultDriver(perspective)

  const state = reactive({
    view: (perspective === 'guest' ? 'join' : 'setup') as InterpreterView,
    perspective,

    // setup(主持人)
    isMember: true,
    topic: '2024款 Model C 海外渠道洽谈',
    myLang: 'zh' as InterpreterLangCode,
    theirLang: 'en' as InterpreterLangCode,

    // 房间
    roomId: '',
    inviteUrl: '',
    inviteExpiresAt: 0,

    // 身份
    host: {
      name: '林沐辰',
      color: 'gold' as InterpreterAvatarColor,
      initial: '林',
      lang: 'zh' as InterpreterLangCode,
    } as InterpreterParty,
    guest: {
      name: 'Sarah Cohen',
      color: 'green' as InterpreterAvatarColor,
      initial: 'S',
      lang: 'en' as InterpreterLangCode,
    } as InterpreterParty,

    // 通话控制
    subtitleMode: 'double' as InterpreterSubtitleMode,
    callMode: 'auto' as InterpreterCallMode,
    micOn: true,
    camOn: true,
    subOn: true,
    sidebarOn: true,
    volOrig: 80,
    volTrans: 90,

    // 运行时
    shareRemaining: INTERPRETER_INVITE_TTL_SECONDS,
    shareExpired: false,
    callElapsed: 0,
    centerLine: '会议已连接 · 请开始对话',
    typingWho: null as InterpreterSpeaker | null,
    bubbles: [] as InterpreterBubble[],
    transcript: [] as InterpreterTranscriptEntry[],
    guestJoined: false,
    endedByRemote: false,
    /** 网络质量,1(优)~6(断线),供 UI 展示横幅 */
    quality: 1 as 1 | 2 | 3 | 4 | 5 | 6,
    /** 最近一次错误(scope+message),UI 可展示 toast */
    lastError: null as { scope: string; message: string } | null,
  })

  // ---- 非响应式运行时句柄 ----
  let shareTimer: ReturnType<typeof setInterval> | null = null
  let callTimer: ReturnType<typeof setInterval> | null = null
  let bubbleSeq = 0
  let callStartedAt = 0
  let unsubscribeDriver: (() => void) | null = null
  /** lineId → bubbles[] 索引,用于 interim → final 原地替换 */
  const bubbleIndex = new Map<string, number>()

  // ---- 身份派生 ----
  const localParty = computed(() =>
    perspective === 'host' ? state.host : state.guest,
  )
  const remoteParty = computed(() =>
    perspective === 'host' ? state.guest : state.host,
  )
  const localSpeaker: InterpreterSpeaker = perspective === 'host' ? 'me' : 'guest'

  function partyOf(who: InterpreterSpeaker): InterpreterParty {
    return who === 'me' ? state.host : state.guest
  }
  function gradientOf(color: InterpreterAvatarColor) {
    return INTERPRETER_AVATAR_GRADIENT[color]
  }
  function langInfo(code: InterpreterLangCode) {
    return INTERPRETER_LANGS[code]
  }
  function bubbleMain(entry: InterpreterTranscriptEntry) {
    return perspective === 'host' ? entry.zh : entry.en
  }
  function bubbleSub(entry: InterpreterTranscriptEntry) {
    return perspective === 'host' ? entry.en : entry.zh
  }
  function bubbleIsLocal(entry: InterpreterTranscriptEntry) {
    return entry.who === localSpeaker
  }
  const langBadge = computed(
    () => `${langInfo(state.host.lang).short} ⇄ ${langInfo(state.guest.lang).short}`,
  )

  // ---- 计时器 ----
  function stopShareTimer() {
    if (shareTimer) {
      clearInterval(shareTimer)
      shareTimer = null
    }
  }
  function startShareTimer() {
    stopShareTimer()
    state.shareExpired = false
    state.shareRemaining = INTERPRETER_INVITE_TTL_SECONDS
    shareTimer = setInterval(() => {
      if (state.shareRemaining <= 0) {
        stopShareTimer()
        state.shareExpired = true
        return
      }
      state.shareRemaining -= 1
    }, 1000)
  }
  function stopCallTimer() {
    if (callTimer) {
      clearInterval(callTimer)
      callTimer = null
    }
  }
  function startCallTimer() {
    stopCallTimer()
    callStartedAt = Date.now()
    state.callElapsed = 0
    callTimer = setInterval(() => {
      state.callElapsed = Math.floor((Date.now() - callStartedAt) / 1000)
    }, 1000)
  }

  // ---- 视图流转 ----
  function resetCallRuntime() {
    state.micOn = true
    state.camOn = true
    state.subOn = true
    state.sidebarOn = true
    state.subtitleMode = 'double'
    state.callMode = 'auto'
    state.centerLine = '会议已连接 · 请开始对话'
    state.bubbles = []
    state.transcript = []
    state.typingWho = null
    bubbleIndex.clear()
  }
  function goSetup() {
    stopCallTimer()
    stopShareTimer()
    state.view = 'setup'
  }
  function goShare() {
    stopCallTimer()
    state.view = 'share'
    startShareTimer()
  }
  function goJoin() {
    stopCallTimer()
    state.view = 'join'
  }
  function goCall() {
    stopShareTimer()
    state.view = 'call'
    resetCallRuntime()
    startCallTimer()
    driver.setMode('auto')
  }
  function endCall() {
    stopCallTimer()
    driver.setMode('manual') // 停剧本
    state.view = 'summary'
  }

  // ---- Driver 事件处理 ----
  function upsertBubbleFromFinal(evt: {
    speaker: InterpreterSpeaker
    lineId: string
    textOrig: string
    textTrans: string | null
  }) {
    const zh = evt.speaker === 'me' ? evt.textOrig : evt.textTrans ?? evt.textOrig
    const en = evt.speaker === 'me' ? evt.textTrans ?? evt.textOrig : evt.textOrig
    const entry: InterpreterTranscriptEntry = {
      time: nowTimeString(),
      who: evt.speaker,
      sideLabel: partyOf(evt.speaker).name,
      zh,
      en,
    }
    const idx = bubbleIndex.get(evt.lineId)
    if (idx != null) {
      const existing = state.bubbles[idx]
      state.bubbles[idx] = {
        ...existing,
        ...entry,
        lineId: evt.lineId,
        interim: false,
      }
    } else {
      bubbleSeq += 1
      state.bubbles.push({
        ...entry,
        id: bubbleSeq,
        lineId: evt.lineId,
        interim: false,
      })
      bubbleIndex.set(evt.lineId, state.bubbles.length - 1)
    }
    state.transcript.push(entry)
    state.centerLine = bubbleMain(entry)
    state.typingWho = null
  }

  function handleDriverEvent(event: DriverEvent) {
    switch (event.type) {
      case 'subtitle-interim': {
        state.typingWho = event.speaker
        // 未来若要显示流式 interim 文本,可在此写入 bubbles(interim: true)
        break
      }
      case 'subtitle-final': {
        upsertBubbleFromFinal(event)
        break
      }
      case 'subtitle-translation-update': {
        const idx = bubbleIndex.get(event.lineId)
        if (idx != null) {
          const b = state.bubbles[idx]
          const zh = b.who === 'me' ? b.zh : event.textTrans
          const en = b.who === 'me' ? event.textTrans : b.en
          state.bubbles[idx] = { ...b, zh, en }
        }
        break
      }
      case 'participant-joined': {
        if (event.role === 'guest' && perspective === 'host') {
          state.guest = {
            name: event.party.name,
            color: event.party.color,
            initial: event.party.initial,
            lang: event.lang,
          }
          state.guestJoined = true
          if (state.view === 'share') goCall()
        } else if (event.role === 'host' && perspective === 'guest') {
          state.host = {
            name: event.party.name,
            color: event.party.color,
            initial: event.party.initial,
            lang: event.lang,
          }
        }
        break
      }
      case 'participant-left': {
        if (state.view === 'call' && event.reason === 'hangup') {
          state.endedByRemote = true
        }
        break
      }
      case 'room-ended': {
        if (state.view === 'call') endCall()
        break
      }
      case 'quality-change': {
        state.quality = event.level
        break
      }
      case 'error': {
        state.lastError = { scope: event.scope, message: event.message }
        break
      }
    }
  }
  unsubscribeDriver = driver.on(handleDriverEvent)

  // ---- 动作(委派给 driver) ----
  function syncHostIdentity() {
    state.host.lang = state.myLang
    if (!state.guestJoined) state.guest.lang = state.theirLang
  }

  async function createMeeting() {
    if (!state.isMember) return false
    syncHostIdentity()
    const res = await driver.createRoom({
      topic: state.topic,
      hostLang: state.myLang,
      guestLang: state.theirLang,
      host: {
        name: state.host.name,
        color: state.host.color,
        initial: state.host.initial,
      },
    })
    state.roomId = res.roomId
    state.inviteUrl = res.inviteUrl
    state.inviteExpiresAt = res.inviteExpiresAt
    goShare()
    return true
  }

  async function cancelShare() {
    stopShareTimer()
    await driver.hangup()
    state.roomId = ''
    state.inviteUrl = ''
    state.guestJoined = false
    goSetup()
  }

  function setGuestName(name: string) {
    state.guest.name = name || 'Guest'
    state.guest.initial = initialOf(state.guest.name)
  }

  function selectGuestPreset(preset: {
    name: string
    color: InterpreterAvatarColor
    initial: string
  }) {
    state.guest = {
      name: preset.name,
      color: preset.color,
      initial: preset.initial,
      lang: state.guest.lang,
    }
  }

  async function acceptInvite() {
    const res = await driver.joinAsGuest({
      roomId: state.roomId,
      inviteToken: 'mock-invite-token',
      guest: {
        name: state.guest.name,
        color: state.guest.color,
        initial: state.guest.initial,
      },
      guestLang: state.guest.lang,
    })
    state.host = {
      name: res.host.name,
      color: res.host.color,
      initial: res.host.initial,
      lang: res.hostLang,
    }
    state.myLang = state.guest.lang
    state.theirLang = res.hostLang
    state.topic = res.topic
    state.guestJoined = true
    goCall()
  }

  async function hangup() {
    await driver.hangup()
    endCall()
  }

  async function translateManual(side: 'self' | 'other', text: string) {
    if (!text.trim()) return null
    const speaker: InterpreterSpeaker =
      side === 'self' ? localSpeaker : localSpeaker === 'me' ? 'guest' : 'me'
    const from =
      side === 'self' ? localParty.value.lang : remoteParty.value.lang
    const to = side === 'self' ? remoteParty.value.lang : localParty.value.lang
    const res = await driver.translateManual({ text, from, to, speaker })
    return res.textTrans
  }

  // ---- 控制 ----
  function toggleMic() {
    state.micOn = !state.micOn
    driver.toggleMic(state.micOn)
  }
  function toggleCam() {
    state.camOn = !state.camOn
    driver.toggleCam(state.camOn)
  }
  function toggleCenterSub(force?: boolean) {
    state.subOn = typeof force === 'boolean' ? force : !state.subOn
  }
  function toggleSidebar(force?: boolean) {
    state.sidebarOn = typeof force === 'boolean' ? force : !state.sidebarOn
  }
  function setSubtitleMode(mode: InterpreterSubtitleMode) {
    state.subtitleMode = mode
  }
  function setCallMode(mode: InterpreterCallMode) {
    if (state.callMode === mode) return
    state.callMode = mode
    driver.setMode(mode)
  }

  // ---- 摘要/导出 ----
  const summary = computed(() => {
    const secs = callStartedAt
      ? Math.max(60, Math.floor(((Date.now() - callStartedAt) / 1000) * 0.6))
      : 184
    return {
      durationText: fmtTimer(state.callElapsed || secs),
      dateText: `${todayString()} ${nowTimeString()}`,
      langA: langInfo(state.host.lang).short,
      langB: langInfo(state.guest.lang).short,
      participants: `${state.host.name} · ${state.guest.name}`,
      lineCount: state.transcript.length || INTERPRETER_SCRIPT.length,
    }
  })

  function buildTranscriptText() {
    const items = state.transcript.length
      ? state.transcript
      : INTERPRETER_SCRIPT.slice(0, 12).map<InterpreterTranscriptEntry>((line) => ({
          time: fmtTimer(line.time),
          who: line.who,
          sideLabel: partyOf(line.who).name,
          zh: line.zh,
          en: line.en,
        }))
    const lines = [
      '# 同声传译记录 — 车新新',
      `# 发起: ${state.host.name} (${langInfo(state.host.lang).name})`,
      `# 受邀: ${state.guest.name} (${langInfo(state.guest.lang).name})`,
      `# 日期: ${todayString()} ${nowTimeString()}`,
      '',
    ]
    items.forEach((t) => {
      lines.push(`[${t.time}] ${t.sideLabel}`)
      lines.push(`  ${langInfo(state.host.lang).name}: ${t.zh}`)
      lines.push(`  ${langInfo(state.guest.lang).name}: ${t.en}`)
      lines.push('')
    })
    return lines.join('\n')
  }

  function exportTranscript() {
    const blob = new Blob([buildTranscriptText()], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carxen_translate_${state.roomId || 'session'}.txt`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 100)
  }

  async function copyInvite(): Promise<string> {
    const url =
      state.inviteUrl ||
      `${location.origin}${INTERPRETER_JOIN_ROUTE}?room=${state.roomId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        // ignore
      }
      document.body.removeChild(ta)
    }
    return url
  }

  /**
   * 主持人单标签兜底:新标签打开受邀方页。仅 MockDriver 场景下有意义,
   * 生产环境应通过真实 IM 通知受邀方。
   */
  function openGuestTab() {
    if (driver.kind === 'mock') {
      openMockGuestTab(state.roomId)
    } else {
      window.open(state.inviteUrl, '_blank')
    }
  }

  /** 受邀方入口:driver 负责用 inviteToken 换 userSig */
  function initGuestSession(roomId: string) {
    state.roomId = roomId
    goJoin()
  }

  /** 媒体挂载:通话视图 mounted 后调用,把真实视频元素交给 driver */
  async function attachMedia(targets: MediaMountTargets) {
    await driver.attachMedia(targets)
  }

  function dispose() {
    stopShareTimer()
    stopCallTimer()
    if (unsubscribeDriver) {
      unsubscribeDriver()
      unsubscribeDriver = null
    }
    driver.dispose()
  }

  return {
    state,
    driver,
    // 派生
    localParty,
    remoteParty,
    localSpeaker,
    langBadge,
    summary,
    // 工具
    fmtTimer,
    langInfo,
    gradientOf,
    partyOf,
    bubbleMain,
    bubbleSub,
    bubbleIsLocal,
    // 流转
    goSetup,
    goShare,
    goJoin,
    goCall,
    endCall,
    // 动作
    createMeeting,
    cancelShare,
    selectGuestPreset,
    setGuestName,
    acceptInvite,
    hangup,
    translateManual,
    // 控制
    toggleMic,
    toggleCam,
    toggleCenterSub,
    toggleSidebar,
    setSubtitleMode,
    setCallMode,
    // 导出/媒体
    exportTranscript,
    copyInvite,
    openGuestTab,
    initGuestSession,
    attachMedia,
    dispose,
  }
}

export type InterpreterSession = ReturnType<typeof useInterpreterSession>
