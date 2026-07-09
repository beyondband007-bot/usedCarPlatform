export type LongVideoSlot =
  | 'ai_video_1'
  | 'user_video_1'
  | 'ai_video_2'
  | 'user_video_2'
  | 'ai_video_3'

export type LongVideoSegmentRole =
  | 'front_exterior_opening'
  | 'front_cabin_proof'
  | 'seated_interior_bridge'
  | 'rear_space_proof'
  | 'rear_exterior_closing'

export type LongVideoScreenType = 'ai_digital_human' | 'user_video_voiceover'

export interface LongVideoNarrationSegment {
  slot: LongVideoSlot
  role: LongVideoSegmentRole
  screenType: LongVideoScreenType
  narrationText: string
  enterCue: string
  exitCue: string
  targetDurationSeconds: number
}

export interface LongVideoVoicePreset {
  voiceId: string
  label: string
  model: string
  speed: number
  vol: number
  pitch: number
  languageBoost: string
}

export interface LongVideoDraft {
  draftId: string
  userId: string
  digitalHumanId: string
  vehicleImageAssetIds: string[]
  interiorVideoAssetIds: [string, string]
  vehicleInfo: Record<string, unknown>
  sellingPoints: string[]
  language: 'Chinese'
  voice: LongVideoVoicePreset
  segments: LongVideoNarrationSegment[]
  status: 'script_ready' | 'audio_ready'
  estimatedAiSeconds: number
  estimatedCostPoints: number
  createdAt: string
  updatedAt: string
}

export interface LongVideoAudioSegment {
  slot: LongVideoSlot
  role: LongVideoSegmentRole
  screenType: LongVideoScreenType
  text: string
  audioUrl: string
  localPath: string
  durationMs: number
  bytes: number
}

export interface LongVideoAudioPreview {
  audioPreviewId: string
  draftId: string
  userId: string
  voice: LongVideoVoicePreset
  segments: LongVideoAudioSegment[]
  totalDurationMs: number
  canUseForVideo: boolean
  createdAt: string
}

export type LongVideoTaskStatus =
  | 'queued'
  | 'generating_ai_video'
  | 'rendering'
  | 'ready_for_editing'
  | 'completed'
  | 'failed'

export interface LongVideoRenderPlanSegment {
  slot: LongVideoSlot
  role: LongVideoSegmentRole
  screenType: LongVideoScreenType
  order: number
  narrationText: string
  audioUrl: string
  audioLocalPath: string
  durationMs: number
  seedance?: {
    prompt: string
    referenceAudioUrl: string
    referenceAudioLocalPath: string
    useReferenceAudioForLipSync: true
    expectedScene: 'outdoor_vehicle_exterior' | 'vehicle_interior_seated'
  }
  userVideo?: {
    assetId: string
    sourceUrl: string
    sourceLocalPath: string
    stretchToAudioDuration: true
    trimTailFrames: 2
    originalAudioDuckDb: -20
  }
}

export interface LongVideoTask {
  taskId: string
  draftId: string
  audioPreviewId: string
  userId: string
  status: LongVideoTaskStatus
  progress: number
  renderPlanPath: string
  renderPlan: {
    planVersion: 1
    sequence: LongVideoRenderPlanSegment[]
    videoRules: {
      cutTailFramesPerClip: 2
      userVideoStretchToVoiceover: true
      aiVideoMustUseReferenceAudio: true
    }
    editorIntegration: {
      source: 'ai-video-state'
      adapter: 'packages/pipeline-adapter'
      openEditorAfterGeneratedOnly: true
      pipelineJobPath: string
    }
  }
  resultUrl?: string | null
  editorProjectUrl?: string | null
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedCost?: number | null
  estimatedPoints?: string | null
  errorMessage?: string | null
  pollingUrl: string
  createdAt: string
  updatedAt: string
}

export interface CreateLongVideoDraftPayload {
  vehicleImageAssetIds: string[]
  interiorVideoAssetIds: [string, string]
  digitalHumanId: string
  vehicleInfo: Record<string, unknown>
  sellingPoints?: string[]
  language?: 'Chinese'
}

export interface UpdateLongVideoSegmentsPayload {
  segments: Array<Pick<LongVideoNarrationSegment, 'slot' | 'narrationText'>>
}

export interface CreateLongVideoTaskPayload {
  audioPreviewId: string
}
