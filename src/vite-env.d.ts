/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // System paths
    getAppPath: () => Promise<string>;
    getRecordingsPath: () => Promise<string>;

    // Recording
    getAudioDevices: () => Promise<AudioDevicesResult>;
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

    // Model Management
    listWhisperModels: () => Promise<ModelsListResult>;
    deleteWhisperModel: (modelName: string) => Promise<ModelOperationResult>;
    forceDownloadWhisperModel: (modelName: string) => Promise<ModelOperationResult>;

    // Recording Management
    listRecordings: () => Promise<RecordingsListResult>;
    renameRecording: (oldPath: string, newName: string) => Promise<RenameResult>;

    // File Dialogs
    openFileDialog: (options?: any) => Promise<FileDialogResult>;
    promptSaveName: (defaultName: string) => Promise<FileDialogResult>;

    // Time Estimation
    estimateTranscriptionTime: (audioPath: string, options?: any) => Promise<EstimationResult>;
    estimateWithSystemConfig: (audioPath: string) => Promise<EstimationResult>;

    // Configuration
    getConfig: () => Promise<ConfigResult>;
    updateConfig: (updates: Partial<AppConfig>) => Promise<ConfigResult>;
    resetConfig: () => Promise<ConfigResult>;
    selectDirectory: (defaultPath?: string) => Promise<DirectorySelectResult>;

    // File system
    openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;

    // Event listeners
    onRecordingProgress: (callback: (data: RecordingProgress) => void) => void;
    onTranscriptionProgress: (callback: (data: TranscriptionProgress) => void) => void;
  };
}

interface AudioDevice {
  id: string;
  name: string;
  type: 'microphone' | 'system' | 'both';
  platform: string;
}

interface AudioDevicesResult {
  success: boolean;
  devices: AudioDevice[];
  error?: string;
}

interface RecordingConfig {
  sampleRate?: number;
  channels?: number;
  format?: 'wav' | 'mp3' | 'ogg' | 'flac';
  audioSource?: string;
  bitDepth?: number;
  bitrate?: number;
  // Audio filters
  enableAudioFilters?: boolean;
  enableNoiseReduction?: boolean;
  enableNormalization?: boolean;
  enableCompression?: boolean;
  enableHighPassFilter?: boolean;
  highPassFrequency?: number;
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

interface AppConfig {
  recordingsPath: string;
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language: string;
  exportFormat: 'txt' | 'srt' | 'vtt' | 'json';
  sampleRate: number;
  channels: number;
  audioSource: string;
  audioFormat: 'flac' | 'wav' | 'mp3';
  theme: 'light' | 'dark';

  // Audio Filters for Meetings
  enableAudioFilters: boolean;
  enableNoiseReduction: boolean;
  enableNormalization: boolean;
  enableCompression: boolean;
  enableHighPassFilter: boolean;
  highPassFrequency: number;

  // Audio Quality
  bitDepth: number;
  bitrate: number;

  // Whisper Advanced Options
  useGpu: boolean;
  gpuBackend: 'default' | 'cuda' | 'vulkan';
  nThreads: number;
  beamSize: number;
  bestOf: number;
  temperature: number;
  entropyThold: number;
  logprobThold: number;
  noSpeechThold: number;
  initialPrompt: string;
  maxSegmentLength: number;
  splitOnWord: boolean;
  suppressBlank: boolean;
  detectLanguage: boolean;
}

interface ConfigResult {
  success: boolean;
  config?: AppConfig;
  error?: string;
}

interface DirectorySelectResult {
  success: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
}

interface WhisperModel {
  name: string;
  fileName: string;
  path: string;
  downloaded: boolean;
  valid: boolean;
  size: number;
  sizeFormatted: string;
  expectedSize: number;
  expectedSizeFormatted: string;
}

interface ModelsListResult {
  success: boolean;
  models?: WhisperModel[];
  error?: string;
}

interface ModelOperationResult {
  success: boolean;
  message: string;
  path?: string;
  error?: string;
}

interface Recording {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
  extension: string;
}

interface RecordingsListResult {
  success: boolean;
  recordings?: Recording[];
  error?: string;
}

interface RenameResult {
  success: boolean;
  oldPath?: string;
  newPath?: string;
  message?: string;
  error?: string;
}

interface FileDialogResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

interface TranscriptionEstimation {
  audioDuration: number;
  audioDurationFormatted: string;
  estimatedSeconds: number;
  estimatedFormatted: string;
  minSeconds: number;
  minFormatted: string;
  maxSeconds: number;
  maxFormatted: string;
  speedFactor: number;
  realTimeMultiplier: number;
  modelName: string;
  backend: string;
  useGpu: boolean;
  beamSize: number;
  message: string;
}

interface EstimationResult {
  success: boolean;
  estimation?: TranscriptionEstimation;
  error?: string;
}
