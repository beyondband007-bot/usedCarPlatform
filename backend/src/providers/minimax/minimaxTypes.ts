export interface MinimaxUploadedCloneAudio {
  fileId: number;
  raw: unknown;
}

export interface MinimaxClonedVoice {
  voiceId: string;
  raw: unknown;
}

export interface MinimaxSpeechAudio {
  audio: Buffer;
  durationMs: number | null;
  sizeBytes: number;
  model: string;
  voiceId: string;
  speed: number;
  languageBoost: string;
  raw: unknown;
}
