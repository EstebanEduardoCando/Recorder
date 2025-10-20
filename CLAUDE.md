# Recorder - Claude Code Instructions

Aplicación de escritorio para grabación y transcripción local de reuniones con Electron + React + Whisper AI.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Desktop:** Electron 31
- **Audio:** FFmpeg (grabación) + @fugood/whisper.node (transcripción)
- **Database:** SQLite (pendiente integración)

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Desarrollo (Vite + Electron)
npm run type-check   # Verificar tipos TypeScript
npm run lint         # Linter
npm run build        # Build producción
```

## Arquitectura

### Procesos
- **Main** (`electron/main.js`): Lifecycle, windows, IPC handlers
- **Renderer** (`src/`): React UI
- **Preload** (`electron/preload.js`): IPC bridge via contextBridge

### Directorios Clave
```
electron/
├── main.js                              # Main process + IPC
├── preload.js                          # Secure bridge
└── services/
    ├── audioRecorder.js                # FFmpeg recording
    ├── configService.js                # Config persistence
    ├── transcriptionServiceLocal.js    # Whisper local
    └── transcriptionServiceOpenAI.js   # OpenAI API (opcional)

src/
├── App.tsx                      # Main component con tabs
└── components/
    ├── AudioPlayer.tsx          # Reproductor
    ├── Settings.tsx             # Panel configuración
    ├── ModelManager.tsx         # Gestión de modelos Whisper
    └── RecordingsManager.tsx    # Gestión de grabaciones
```

### IPC Pattern
- Renderer → Main: `window.electronAPI.*` (Promises)
- Main → Renderer: Events (`onRecordingProgress`, `onTranscriptionProgress`)

**Definiciones:**
- Handlers: `electron/main.js` (ipcMain.handle)
- Types: `src/vite-env.d.ts` (Window.electronAPI)
- Bridge: `electron/preload.js` (contextBridge.exposeInMainWorld)

### Path Aliases
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@services/*` → `src/services/*`

## Estado Actual (MVP v0.3.0)

✅ **Implementado:**
1. Grabación audio (micrófono, FFmpeg)
2. Transcripción local (Whisper con @fugood/whisper.node - binarios precompilados)
3. Configuración persistente (JSON)
4. IPC completo (recording, transcription, config, models, recordings)
5. UI React con reproductor de audio integrado y navegación por tabs
6. Panel de configuración (modelo Whisper, idioma, paths, sample rate)
7. Exportación (TXT, SRT, VTT, JSON)
8. **Gestión de modelos Whisper** (listar, descargar, eliminar, validar)
9. **Gestión de grabaciones** (listar, renombrar, transcribir archivos existentes)
10. **Cargar archivos externos** para transcripción
11. **Renombrado personalizado** al finalizar grabación (prompt al usuario)
12. **Validación automática** de modelos corruptos con re-descarga

🚧 **Pendiente:**
- SQLite para metadata y búsqueda
- Captura de audio del sistema (requiere Stereo Mix en Windows o VB-Cable)
- Visualizador de forma de onda en tiempo real
- Sincronización playback + transcripción con highlighting
- Historial de transcripciones con búsqueda full-text

## Notas de Implementación

### Audio Recording
- **Stack:** FFmpeg + DirectShow (Windows) / AVFoundation (macOS) / ALSA (Linux)
- **FFmpeg:** Instalado automáticamente via `@ffmpeg-installer/ffmpeg`
- **Sistema audio:** Requiere "Stereo Mix" (Windows) o VB-Audio Cable

### Whisper Integration
- **Paquete:** `@fugood/whisper.node` (binarios precompilados, NO requiere compilación)
- **Modelos:** tiny (~75MB), base (~142MB), small (~466MB), medium (~1.5GB), large (~2.9GB)
- **Auto-descarga:** Primera transcripción descarga el modelo seleccionado
- **Auto-conversión:** Convierte audio a WAV 16kHz automáticamente

### Storage Paths
- **Config:** `app.getPath('userData')/config.json`
- **Recordings:** User-configurable (default: `userData/recordings/`)
- **Models:** `app.getPath('userData')/models/`
- **Database:** `app.getPath('userData')/recorder.db` (pendiente)

### Service Initialization Pattern
Servicios que usan `app.getPath()` requieren lazy initialization:

```javascript
class Service {
  constructor() {
    this.initialized = false;
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.path = path.join(app.getPath('userData'), 'folder');
      this.initialized = true;
    }
  }

  method() {
    this.ensureInitialized();
    // use this.path
  }
}
```

Usado en: `configService.js`, `audioRecorder.js`, `transcriptionServiceLocal.js`

### Security
- ❌ NUNCA `nodeIntegration: true`
- ✅ Exponer APIs via preload + contextBridge
- ✅ Validar inputs IPC en main process
- ✅ Sanitizar file paths

### Build & Distribution
- Tool: electron-builder
- Output: `dist-electron/`
- Formatos: NSIS (Windows), DMG (macOS), AppImage (Linux)
