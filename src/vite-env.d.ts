/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // System paths
    getAppPath: () => Promise<string>;
    getRecordingsPath: () => Promise<string>;

    // Recording
    startRecording: (config?: RecordingConfig) => Promise<RecordingResult>;
    stopRecording: () => Promise<RecordingResult>;
    pauseRecording: () => Promise<RecordingResult>;
    resumeRecording: () => Promise<RecordingResult>;
    getRecordingStatus: () => Promise<RecordingStatus>;

    // Transcription
    initializeWhisper: (modelName?: string) => Promise<WhisperInitResult>;
    transcribeAudio: (audioPath: string, options?: TranscriptionOptions) => Promise<TranscriptionResult>;
    saveTranscription: (transcription: TranscriptionResult, outputPath: string) => Promise<SaveResult>;
    exportTranscriptionText: (transcription: TranscriptionResult, outputPath: string) => Promise<SaveResult>;
    exportTranscriptionSRT: (transcription: TranscriptionResult, outputPath: string) => Promise<SaveResult>;
    downloadWhisperModel: (modelName: string) => Promise<ModelDownloadResult>;

    // Event listeners
    onRecordingProgress: (callback: (data: RecordingProgress) => void) => void;
    onTranscriptionProgress: (callback: (data: TranscriptionProgress) => void) => void;
  };
}

interface RecordingConfig {
  sampleRate?: number;
  channels?: number;
  format?: 'wav' | 'mp3' | 'ogg';
}

interface RecordingResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  size?: number;
  message?: string;
  error?: string;
}

interface RecordingStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  outputPath: string | null;
}

interface RecordingProgress {
  duration: number;
  size: number;
  audioLevel: number;
}

interface TranscriptionOptions {
  language?: string;
}

interface TranscriptionResult {
  success: boolean;
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration?: number;
  error?: string;
}

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionProgress {
  progress: number;
  status: string;
}

interface WhisperInitResult {
  success: boolean;
  message: string;
  modelName?: string;
  error?: string;
}

interface SaveResult {
  success: boolean;
  message: string;
  path?: string;
  error?: string;
}

interface ModelDownloadResult {
  success: boolean;
  message: string;
  modelName?: string;
  error?: string;
}
