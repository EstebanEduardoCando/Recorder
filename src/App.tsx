import { useState, useEffect } from 'react'
import './App.css'
import AudioPlayer from './components/AudioPlayer'
import Settings from './components/Settings'
import ModelManager from './components/ModelManager'
import RecordingsManager from './components/RecordingsManager'
import Waveform from './components/Waveform'

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

  // Estados para contador regresivo
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isCountingDown, setIsCountingDown] = useState(false)

  // Estados para estimación y contador
  const [estimation, setEstimation] = useState<TranscriptionEstimation | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [finalElapsedTime, setFinalElapsedTime] = useState(0) // Tiempo final cuando termina la transcripción
  const [startTime, setStartTime] = useState<number | null>(null)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [recordingElapsedTime, setRecordingElapsedTime] = useState(0)

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

  // Efecto para contador de tiempo transcurrido (transcripción)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTranscribing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    // NO resetear elapsedTime cuando termina, se maneja en handleTranscribe

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTranscribing, startTime])

  // Efecto para contador de tiempo de grabación
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRecording && recordingStartTime && !isPaused) {
      interval = setInterval(() => {
        setRecordingElapsedTime(Math.floor((Date.now() - recordingStartTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, recordingStartTime, isPaused])

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

  const startCountdown = (seconds: number, onComplete: () => void) => {
    return new Promise<void>((resolve) => {
      setIsCountingDown(true)
      setCountdown(seconds)

      let current = seconds
      const interval = setInterval(() => {
        current--
        if (current > 0) {
          setCountdown(current)
        } else {
          clearInterval(interval)
          setCountdown(null)
          setIsCountingDown(false)
          onComplete()
          resolve()
        }
      }, 1000)
    })
  }

  const handleStartRecording = async () => {
    try {
      if (!window.electronAPI) {
        setError('electronAPI no está disponible')
        return
      }

      setError(null)

      // Iniciar contador regresivo de 3 segundos
      setStatusMessage('Preparando grabación...')
      await startCountdown(3, () => {
        setStatusMessage('¡Grabando!')
      })

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
        setRecordingStartTime(Date.now())
        setRecordingElapsedTime(0)
        setStatusMessage('Grabando... Hable ahora')
      } else {
        setError(result.error || 'Error al iniciar grabación')
        setStatusMessage('Error al iniciar')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al iniciar la grabación')
      setStatusMessage('Error')
      setIsCountingDown(false)
      setCountdown(null)
    }
  }

  const handleStopRecording = async () => {
    try {
      // Iniciar contador regresivo de 3 segundos antes de detener
      setStatusMessage('Finalizando grabación...')
      await startCountdown(3, () => {
        setStatusMessage('Deteniendo...')
      })

      const result = await window.electronAPI.stopRecording()

      if (result.success) {
        setIsRecording(false)
        setIsPaused(false)
        setRecordingStartTime(null)
        setRecordingElapsedTime(0)
        const finalPath = result.outputPath || null

        setRecordingPath(finalPath)
        setStatusMessage(`Grabación guardada: ${finalPath ? finalPath.split(/[\\/]/).pop() : 'archivo.wav'}`)

        // Intentar transcripción automática (opcional)
        if (finalPath) {
          // No usar try-catch porque handleTranscribe ya maneja sus propios errores
          await handleTranscribe(finalPath)
        } else {
          setStatusMessage(`Grabación guardada (${result.duration}s)`)
        }
      } else {
        setError(result.error || 'Error al detener grabación')
        setStatusMessage('Error al detener')
        setIsRecording(false)
        setIsPaused(false)
      }
    } catch (err) {
      console.error('Error al detener:', err)
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError('Error al detener la grabación: ' + errorMsg)
      setStatusMessage('Error al detener')
      setIsRecording(false)
      setIsPaused(false)
      setIsCountingDown(false)
      setCountdown(null)
      setRecordingStartTime(null)
      setRecordingElapsedTime(0)
    }
  }

  const handleCancelTranscription = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.cancelTranscription();
      if (result.success) {
        setStatusMessage('Transcripción cancelada');
        setIsTranscribing(false);
        setTranscriptionProgress(0);
        setStartTime(null);
        setError(null);
      } else {
        setError(result.message || 'No se pudo cancelar la transcripción');
      }
    } catch (err) {
      console.error('Error al cancelar transcripción:', err);
      setError('Error al cancelar la transcripción');
    }
  }

  const handleTranscribe = async (audioPath: string) => {
    try {
      setIsTranscribing(true)
      setTranscriptionProgress(0)
      setError(null)
      setEstimation(null)
      setElapsedTime(0)
      setFinalElapsedTime(0)

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
        // Calcular el tiempo final ANTES de limpiar startTime
        const finalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedTime

        setTranscription(result)
        setStatusMessage('Transcripción completada')
        setTranscriptionProgress(100)
        // Guardar el tiempo final
        setFinalElapsedTime(finalTime)
      } else {
        throw new Error(result.error || 'Error en transcripción')
      }
    } catch (err) {
      console.error('Error en transcripción:', err)
      const errorMsg = err instanceof Error ? err.message : 'Error al transcribir'

      // Calcular el tiempo final ANTES de limpiar startTime
      const finalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedTime

      // Detectar si es un error de Whisper no configurado
      if (errorMsg.includes('whisper-cli') || errorMsg.includes('CMake') || errorMsg.includes('compiler')) {
        setError('⚠️ Transcripción no disponible: Whisper.cpp no está compilado. Ver consola para más detalles.')
        setStatusMessage('Grabación guardada - Transcripción no disponible')
      } else {
        setError(errorMsg)
        setStatusMessage('Error en transcripción')
      }
      // En caso de error también guardar el tiempo
      setFinalElapsedTime(finalTime)
    } finally {
      setIsTranscribing(false)
      setStartTime(null)
      // NO limpiamos estimation - se queda visible para que el usuario vea el resumen
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

  const handleCopyToClipboard = async () => {
    if (!transcription || !transcription.text) return

    try {
      await navigator.clipboard.writeText(transcription.text)
      setStatusMessage('Texto copiado al portapapeles')

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        if (transcription) {
          setStatusMessage('Transcripción completada')
        }
      }, 3000)
    } catch (err) {
      console.error('Error copiando al portapapeles:', err)
      setError('Error al copiar al portapapeles')
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

  const handleLoadExistingTranscription = async (audioPath: string) => {
    try {
      setActiveTab('recorder')
      setRecordingPath(audioPath)
      setTranscription(null)
      setError(null)
      setStatusMessage('Cargando transcripción...')

      const result = await window.electronAPI.loadTranscription(audioPath)

      if (result.success && result.text) {
        setTranscription(result)
        setStatusMessage('Transcripción cargada')
      } else {
        setError(result.error || 'No se encontró transcripción para este archivo')
        setStatusMessage('No se encontró transcripción')
      }
    } catch (err) {
      console.error('Error cargando transcripción:', err)
      setError('Error al cargar transcripción: ' + String(err))
      setStatusMessage('Error')
    }
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
              disabled={isTranscribing || isCountingDown}
            >
              ⏺ Grabar
            </button>
          ) : (
            <button
              className="btn-record recording"
              onClick={handleStopRecording}
              disabled={isCountingDown}
            >
              ⏹ Detener
            </button>
          )}
        </div>

        {/* Visualización de forma de onda */}
        <Waveform isRecording={isRecording} isPaused={isPaused} />

        {/* Contador regresivo visual */}
        {isCountingDown && countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">
              {isRecording ? 'Finalizando grabación...' : 'Iniciando grabación...'}
            </div>
          </div>
        )}

        <div className="status">
          <p>{statusMessage}</p>

          {/* Mostrar contador de tiempo durante la grabación */}
          {isRecording && (
            <div className="recording-timer">
              <span className="timer-label">⏱️ Tiempo de grabación:</span>
              <span className="timer-value">{formatTime(recordingElapsedTime)}</span>
            </div>
          )}

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
              <span>Completado en {formatTime(finalElapsedTime)} (estimado: {estimation.estimatedFormatted})</span>
            </div>
          )}

          {isTranscribing && (
            <>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${transcriptionProgress}%` }}
                />
              </div>
              <button
                className="btn-cancel-transcription"
                onClick={handleCancelTranscription}
                title="Cancelar transcripción"
              >
                🛑 Cancelar Transcripción
              </button>
            </>
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
                <button onClick={handleCopyToClipboard} className="btn-copy" title="Copiar todo el texto">
                  📋 Copiar todo
                </button>
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
          </div>
        )}
          </>
        )}

        {activeTab === 'recordings' && (
          <RecordingsManager
            onSelectRecording={handleSelectRecordingForTranscription}
            onLoadTranscription={handleLoadExistingTranscription}
          />
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
