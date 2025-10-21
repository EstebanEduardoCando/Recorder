import { useState, useEffect } from 'react'
import './App.css'
import AudioPlayer from './components/AudioPlayer'
import Settings from './components/Settings'
import ModelManager from './components/ModelManager'
import RecordingsManager from './components/RecordingsManager'

type TabType = 'recorder' | 'models' | 'recordings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('recorder')
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingPath, setRecordingPath] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Listo para grabar')
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)

  // Estados para estimación y contador
  const [estimation, setEstimation] = useState<TranscriptionEstimation | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  useEffect(() => {
    // Verificar que electronAPI esté disponible
    if (!window.electronAPI) {
      console.error('electronAPI no está disponible. Verifica que el preload script esté cargado correctamente.')
      setError('Error: La aplicación no se cargó correctamente. Reinicia la aplicación.')
      return
    }

    // Cargar configuración
    loadConfig()

    // Escuchar progreso de transcripción
    window.electronAPI.onTranscriptionProgress((data) => {
      setTranscriptionProgress(data.progress)
      setStatusMessage(data.status)
    })
  }, [])

  // Efecto para contador de tiempo transcurrido
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTranscribing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTranscribing, startTime])

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.getConfig()
      if (result.success && result.config) {
        setConfig(result.config)
      }
    } catch (err) {
      console.error('Error loading config:', err)
    }
  }

  const handleStartRecording = async () => {
    try {
      if (!window.electronAPI) {
        setError('electronAPI no está disponible')
        return
      }

      setError(null)
      setStatusMessage('Iniciando grabación...')

      const result = await window.electronAPI.startRecording({
        sampleRate: config?.sampleRate || 44100,
        channels: config?.channels || 2,
        format: config?.audioFormat || 'wav',
        audioSource: config?.audioSource || '',
        bitDepth: config?.bitDepth || 16,
        bitrate: config?.bitrate || 192,
        // Audio filters
        enableAudioFilters: config?.enableAudioFilters ?? true,
        enableNoiseReduction: config?.enableNoiseReduction ?? true,
        enableNormalization: config?.enableNormalization ?? true,
        enableCompression: config?.enableCompression ?? true,
        enableHighPassFilter: config?.enableHighPassFilter ?? true,
        highPassFrequency: config?.highPassFrequency || 80
      })

      if (result.success) {
        setIsRecording(true)
        setRecordingPath(result.outputPath || null)
        setStatusMessage('Grabando... Hable ahora')
      } else {
        setError(result.error || 'Error al iniciar grabación')
        setStatusMessage('Error al iniciar')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al iniciar la grabación')
      setStatusMessage('Error')
    }
  }

  const handleStopRecording = async () => {
    try {
      setStatusMessage('Deteniendo grabación...')

      const result = await window.electronAPI.stopRecording()

      if (result.success) {
        setIsRecording(false)
        setIsPaused(false)
        let finalPath = result.outputPath || null

        // Preguntar si desea renombrar el archivo
        if (finalPath) {
          const newName = prompt('¿Desea dar un nombre personalizado a la grabación?\n(Dejar vacío para mantener el nombre automático)')

          if (newName && newName.trim()) {
            try {
              const renameResult = await window.electronAPI.renameRecording(finalPath, newName.trim())
              if (renameResult.success && renameResult.newPath) {
                finalPath = renameResult.newPath
                setStatusMessage(`Grabación guardada como: ${newName}`)
              }
            } catch (renameError) {
              console.error('Error al renombrar:', renameError)
              // Continuar con el nombre original
            }
          }
        }

        setRecordingPath(finalPath)

        // Intentar transcripción automática (opcional)
        if (finalPath) {
          try {
            await handleTranscribe(finalPath)
          } catch (transcriptionError) {
            console.warn('Transcripción no disponible:', transcriptionError)
            setStatusMessage(`Grabación guardada (${result.duration}s) - Transcripción no disponible`)
          }
        }
      } else {
        setError(result.error || 'Error al detener grabación')
        setStatusMessage('Error al detener')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al detener la grabación')
      setStatusMessage('Error')
    }
  }

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        const result = await window.electronAPI.resumeRecording()
        if (result.success) {
          setIsPaused(false)
          setStatusMessage('Grabando...')
        }
      } else {
        const result = await window.electronAPI.pauseRecording()
        if (result.success) {
          setIsPaused(true)
          setStatusMessage('Pausado')
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al pausar/reanudar')
    }
  }

  const handleTranscribe = async (audioPath: string) => {
    try {
      setIsTranscribing(true)
      setTranscriptionProgress(0)
      setError(null)
      setEstimation(null)
      setElapsedTime(0)

      // Obtener estimación de tiempo
      setStatusMessage('Calculando tiempo estimado...')
      const estimationResult = await window.electronAPI.estimateWithSystemConfig(audioPath)

      if (estimationResult.success && estimationResult.estimation) {
        // Guardar la estimación para mostrarla durante todo el proceso
        setEstimation(estimationResult.estimation)
        setStatusMessage('Estimación lista')

        // Esperar 2 segundos para que el usuario vea la estimación
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Iniciar el contador de tiempo
      setStartTime(Date.now())
      setStatusMessage('Inicializando Whisper...')

      // Inicializar Whisper si no está listo
      const modelName = config?.whisperModel || 'base'
      const initResult = await window.electronAPI.initializeWhisper(modelName)

      if (!initResult.success) {
        throw new Error(initResult.error || 'No se pudo inicializar Whisper')
      }

      setStatusMessage('Transcribiendo...')

      const language = config?.language === 'auto' ? undefined : config?.language
      const result = await window.electronAPI.transcribeAudio(audioPath, {
        language: language || 'es'
      })

      if (result.success) {
        setTranscription(result)
        setStatusMessage('Transcripción completada')
        setTranscriptionProgress(100)
      } else {
        throw new Error(result.error || 'Error en transcripción')
      }
    } catch (err) {
      console.error('Error en transcripción:', err)
      const errorMsg = err instanceof Error ? err.message : 'Error al transcribir'

      // Detectar si es un error de Whisper no configurado
      if (errorMsg.includes('whisper-cli') || errorMsg.includes('CMake') || errorMsg.includes('compiler')) {
        setError('⚠️ Transcripción no disponible: Whisper.cpp no está compilado. Ver consola para más detalles.')
        setStatusMessage('Grabación guardada - Transcripción no disponible')
      } else {
        setError(errorMsg)
        setStatusMessage('Error en transcripción')
      }
    } finally {
      setIsTranscribing(false)
      setStartTime(null)
      // No limpiar la estimación aquí, dejarla visible para comparar
    }
  }

  const handleExportText = async () => {
    if (!transcription || !recordingPath) return

    try {
      const textPath = recordingPath.replace(/\.\w+$/, '.txt')
      const result = await window.electronAPI.exportTranscriptionText(transcription, textPath)

      if (result.success) {
        setStatusMessage(`Texto exportado: ${result.path}`)
      }
    } catch (err) {
      console.error('Error exportando:', err)
      setError('Error al exportar texto')
    }
  }

  const handleExportSRT = async () => {
    if (!transcription || !recordingPath) return

    try {
      const srtPath = recordingPath.replace(/\.\w+$/, '.srt')
      const result = await window.electronAPI.exportTranscriptionSRT(transcription, srtPath)

      if (result.success) {
        setStatusMessage(`SRT exportado: ${result.path}`)
      }
    } catch (err) {
      console.error('Error exportando:', err)
      setError('Error al exportar SRT')
    }
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    loadConfig() // Recargar configuración al cerrar
  }

  const handleSelectRecordingForTranscription = async (audioPath: string) => {
    // Cambiar a la pestaña de grabadora
    setActiveTab('recorder')

    // Establecer el path de la grabación y limpiar transcripción anterior
    setRecordingPath(audioPath)
    setTranscription(null)
    setError(null)

    // Iniciar transcripción automáticamente
    await handleTranscribe(audioPath)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Recorder</h1>
            <p>Grabación y Transcripción Local de Reuniones</p>
          </div>
          <button
            className="btn-settings"
            onClick={() => setShowSettings(true)}
            title="Configuración"
          >
            ⚙️
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'recorder' ? 'active' : ''}`}
          onClick={() => setActiveTab('recorder')}
        >
          🎙️ Grabar
        </button>
        <button
          className={`tab ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
        >
          📁 Grabaciones
        </button>
        <button
          className={`tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          🤖 Modelos Whisper
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'recorder' && (
          <>
            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}

            <div className="recording-controls">
          {!isRecording ? (
            <button
              className="btn-record"
              onClick={handleStartRecording}
              disabled={isTranscribing}
            >
              ⏺ Grabar
            </button>
          ) : (
            <>
              <button
                className="btn-record recording"
                onClick={handleStopRecording}
              >
                ⏹ Detener
              </button>
              <button
                className="btn-pause"
                onClick={handlePauseResume}
              >
                {isPaused ? '▶ Reanudar' : '⏸ Pausar'}
              </button>
            </>
          )}
        </div>

        <div className="status">
          <p>{statusMessage}</p>

          {/* Mostrar información de estimación durante la transcripción */}
          {estimation && isTranscribing && (
            <div className="estimation-info">
              <div className="estimation-row">
                <span className="estimation-label">Audio:</span>
                <span className="estimation-value">{estimation.audioDurationFormatted}</span>
              </div>
              <div className="estimation-row">
                <span className="estimation-label">Tiempo transcurrido:</span>
                <span className="estimation-value elapsed-time">{formatTime(elapsedTime)}</span>
              </div>
              <div className="estimation-row">
                <span className="estimation-label">Tiempo estimado:</span>
                <span className="estimation-value">
                  {estimation.estimatedFormatted}
                  <span className="estimation-range"> ({estimation.minFormatted} - {estimation.maxFormatted})</span>
                </span>
              </div>
              <div className="estimation-row">
                <span className="estimation-label">Tiempo restante:</span>
                <span className="estimation-value remaining-time">
                  {elapsedTime < estimation.maxSeconds
                    ? `~${formatTime(Math.max(0, estimation.estimatedSeconds - elapsedTime))}`
                    : 'Finalizando...'}
                </span>
              </div>
              <div className="estimation-row backend-info">
                <span className="estimation-label">Backend:</span>
                <span className="estimation-value">{estimation.message}</span>
              </div>
            </div>
          )}

          {/* Mostrar estimación después de completar */}
          {estimation && !isTranscribing && transcription && (
            <div className="estimation-summary">
              <span className="summary-icon">✓</span>
              <span>Completado en {formatTime(elapsedTime)} (estimado: {estimation.estimatedFormatted})</span>
            </div>
          )}

          {isTranscribing && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${transcriptionProgress}%` }}
              />
            </div>
          )}
        </div>

        {recordingPath && !isRecording && (
          <AudioPlayer audioPath={recordingPath} />
        )}

        {transcription && transcription.text && (
          <div className="transcription-section">
            <div className="transcription-header">
              <h2>Transcripción</h2>
              <div className="export-buttons">
                <button onClick={handleExportText} className="btn-export">
                  Exportar TXT
                </button>
                <button onClick={handleExportSRT} className="btn-export">
                  Exportar SRT
                </button>
              </div>
            </div>
            <div className="transcription-text">
              {transcription.text}
            </div>
            {transcription.segments && transcription.segments.length > 0 && (
              <div className="segments">
                <h3>Segmentos con timestamps:</h3>
                {transcription.segments.map((segment) => (
                  <div key={segment.id} className="segment">
                    <span className="timestamp">
                      [{formatTime(segment.start)} - {formatTime(segment.end)}]
                    </span>
                    <span className="segment-text">{segment.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}

        {activeTab === 'recordings' && (
          <RecordingsManager onSelectRecording={handleSelectRecordingForTranscription} />
        )}

        {activeTab === 'models' && (
          <ModelManager />
        )}
      </main>

      <footer className="app-footer">
        <p>v0.3.0 - Gestión de Modelos + Grabaciones + Renombrado</p>
      </footer>

      {showSettings && <Settings onClose={handleSettingsClose} />}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default App
