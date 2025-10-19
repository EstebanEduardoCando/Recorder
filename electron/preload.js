const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Rutas del sistema
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getRecordingsPath: () => ipcRenderer.invoke('get-recordings-path'),

  // Audio recording APIs
  startRecording: (config) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Transcription APIs
  initializeWhisper: (modelName) => ipcRenderer.invoke('initialize-whisper', modelName),
  transcribeAudio: (audioPath, options) => ipcRenderer.invoke('transcribe-audio', audioPath, options),
  saveTranscription: (transcription, outputPath) => ipcRenderer.invoke('save-transcription', transcription, outputPath),
  exportTranscriptionText: (transcription, outputPath) => ipcRenderer.invoke('export-transcription-text', transcription, outputPath),
  exportTranscriptionSRT: (transcription, outputPath) => ipcRenderer.invoke('export-transcription-srt', transcription, outputPath),
  downloadWhisperModel: (modelName) => ipcRenderer.invoke('download-whisper-model', modelName),

  // Configuration APIs
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates) => ipcRenderer.invoke('update-config', updates),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),

  // File system APIs
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Listeners para eventos
  onRecordingProgress: (callback) => {
    ipcRenderer.on('recording-progress', (_, data) => callback(data));
  },
  onTranscriptionProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (_, data) => callback(data));
  },
});
