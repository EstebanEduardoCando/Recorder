# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recorder** is a local desktop application for recording and transcribing meetings using Electron, React, and Whisper AI. The application captures both microphone input and system audio, then transcribes the recordings locally using OpenAI's Whisper model.

**Key Technology Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Desktop Framework:** Electron 31
- **Audio Recording:** node-record-lpcm16 + fluent-ffmpeg
- **Transcription:** nodejs-whisper (Whisper AI local)
- **Database:** SQLite via better-sqlite3 (for metadata - to be integrated)
- **Build Tool:** Vite 5 with TypeScript support

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (starts both Vite dev server and Electron)
npm run dev

# Type checking (without emitting files)
npm run type-check

# Lint code
npm run lint

# Build for production
npm run build
npm run build:electron
```

## Architecture

### Process Architecture
- **Main Process** (`electron/main.js`): Manages app lifecycle, windows, and IPC handlers
- **Renderer Process** (`src/`): React application running in the browser context
- **Preload Script** (`electron/preload.js`): Secure bridge between main and renderer via `contextBridge`

### Key Directories
```
Recorder/
├── electron/
│   ├── main.js                 # Main process with IPC handlers
│   ├── preload.js              # Secure IPC bridge
│   └── services/
│       ├── audioRecorder.js    # Audio recording service
│       └── transcriptionService.js  # Whisper integration
├── src/
│   ├── App.tsx                 # Main React component
│   ├── App.css                 # Application styles
│   ├── main.tsx                # React entry point
│   ├── vite-env.d.ts           # TypeScript definitions
│   ├── components/             # React components (to be created)
│   ├── hooks/                  # Custom React hooks (to be created)
│   └── stores/                 # State stores (to be created)
├── recordings/                 # User recordings storage (gitignored)
└── dist/                       # Build output (gitignored)
```

### IPC Communication Pattern
The app uses Electron's IPC (Inter-Process Communication) for secure communication:
- Renderer → Main: `window.electronAPI.*` methods return Promises
- Main → Renderer: Event listeners via `onRecordingProgress`, `onTranscriptionProgress`

Example:
```typescript
// Renderer process
const recordingsPath = await window.electronAPI.getRecordingsPath();
await window.electronAPI.startRecording({ sampleRate: 44100 });
```

All IPC APIs are defined in:
- Handler implementations: `electron/main.js` (ipcMain.handle)
- Type definitions: `src/vite-env.d.ts` (Window.electronAPI interface)
- Exposure: `electron/preload.js` (contextBridge.exposeInMainWorld)

### Path Aliases
TypeScript path aliases are configured in `tsconfig.json` and `vite.config.ts`:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@services/*` → `src/services/*`
- `@hooks/*` → `src/hooks/*`
- `@stores/*` → `src/stores/*`
- `@types/*` → `src/types/*`

## Current Implementation Status

### ✅ MVP Completed
1. **Audio Recording Service** (`electron/services/audioRecorder.js`)
   - Microphone capture using node-record-lpcm16
   - System audio capture (SoX-based)
   - FFmpeg encoding to WAV format
   - Record, pause, resume, stop functionality
   - Recording metadata (duration, file size)

2. **Whisper Integration** (`electron/services/transcriptionService.js`)
   - Local Whisper model using nodejs-whisper
   - Automatic model download on first use
   - Automatic audio conversion to WAV 16kHz
   - Language detection and specification
   - Word-level timestamp generation
   - Export to TXT, SRT, VTT, and JSON formats

3. **IPC Communication** (`electron/main.js`, `electron/preload.js`)
   - Full IPC handlers for recording and transcription
   - Progress event streaming
   - Secure contextBridge API exposure

4. **React UI** (`src/App.tsx`)
   - Recording controls (start, stop, pause/resume)
   - Automatic transcription after recording
   - Progress indicators
   - Transcription display with timestamps
   - Export functionality (TXT, SRT)
   - Error handling and status messages

### 🚧 To Be Implemented
1. **Data Persistence**
   - SQLite database for meeting metadata
   - Recording list and search functionality
   - Meeting history with thumbnails

2. **Enhanced UI**
   - Dashboard with recordings list
   - Audio visualizer/waveform
   - Settings panel (model selection, language, etc.)
   - Dark/light theme

3. **Advanced Features**
   - Speaker diarization
   - Real-time transcription
   - Cloud backup (optional)
   - Meeting summaries with LLMs

## Important Implementation Notes

### Audio Recording Implementation
The current implementation uses:
- **node-record-lpcm16**: Cross-platform audio recording
- **SoX (Sound eXchange)**: Audio recording program (requires installation)
- **fluent-ffmpeg**: Audio encoding and format conversion
- **@ffmpeg-installer/ffmpeg**: Automatic FFmpeg binary installation

**Prerequisites:**
- SoX must be installed on the system:
  - Windows: `choco install sox` or download from SourceForge
  - macOS: `brew install sox`
  - Linux: `sudo apt-get install sox` or `sudo yum install sox`

### Whisper Integration
Using **nodejs-whisper** package which:
- Downloads models automatically on first transcription
- Automatically converts audio to WAV 16kHz (required format)
- Supports models: tiny, base, small, medium, large
- Language auto-detection or manual specification
- Generates word-level timestamps
- Supports CUDA acceleration if available (set `withCuda: true`)
- Outputs to multiple formats: TXT, SRT, VTT, JSON

**Model Sizes:**
- tiny: ~75MB, fastest, lower accuracy
- base: ~142MB, good balance (default)
- small: ~466MB, better accuracy
- medium: ~1.5GB, high accuracy
- large: ~2.9GB, best accuracy

### System Audio Capture
Current implementation captures microphone only. For system audio:
- Windows: Requires virtual audio cable (VB-Cable, VoiceMeeter)
- macOS: Requires BlackHole or Loopback
- Linux: Configure PulseAudio loopback module

### Security Considerations
- Never enable `nodeIntegration: true` in BrowserWindow
- All Node.js APIs must be explicitly exposed via preload script
- Validate all IPC inputs in main process handlers
- Sanitize file paths to prevent directory traversal

### Storage Strategy
- Recordings: `app.getPath('userData')/recordings/`
- Database: `app.getPath('userData')/recorder.db`
- Models: `app.getPath('userData')/models/`
- Temporary files: `app.getPath('temp')/recorder/`

## Building and Distribution

The app uses electron-builder for packaging:
- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage

Build outputs go to `dist-electron/` directory.

## Future Enhancements (Roadmap)
- Speaker diarization (identifying different speakers)
- Export formats: TXT, JSON, SRT, VTT subtitles
- Cloud backup integration (optional)
- Keyword search in transcriptions
- Meeting summaries using LLMs
- Audio playback synchronized with transcription
