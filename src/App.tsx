import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingPath, setRecordingPath] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Listo para grabar')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar que electronAPI esté disponible
    if (!window.electronAPI) {
      console.error('electronAPI no está disponible. Verifica que el preload script esté cargado correctamente.')
      setError('Error: La aplicación no se cargó correctamente. Reinicia la aplicación.')
      return
    }

    // Escuchar progreso de transcripción
    window.electronAPI.onTranscriptionProgress((data) => {
      setTranscriptionProgress(data.progress)
      setStatusMessage(data.status)
    })
  }, [])

  const handleStartRecording = async () => {
    try {
      if (!window.electronAPI) {
        setError('electronAPI no está disponible')
        return
      }

      setError(null)
      setStatusMessage('Iniciando grabación...')

      const result = await window.electronAPI.startRecording({
        sampleRate: 16000,
        channels: 1,
        format: 'wav'
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
        setRecordingPath(result.outputPath || null)
        setStatusMessage(`Grabación guardada (${result.duration}s)`)

        // Intentar transcripción automática (opcional)
        if (result.outputPath) {
          try {
            await handleTranscribe(result.outputPath)
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
      setStatusMessage('Inicializando Whisper...')
      setError(null)

      // Inicializar Whisper si no está listo
      const initResult = await window.electronAPI.initializeWhisper('base')

      if (!initResult.success) {
        throw new Error(initResult.error || 'No se pudo inicializar Whisper')
      }

      setStatusMessage('Transcribiendo...')

      const result = await window.electronAPI.transcribeAudio(audioPath, {
        language: 'es'
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Recorder</h1>
        <p>Grabación y Transcripción Local de Reuniones</p>
      </header>

      <main className="app-main">
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
          {isTranscribing && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${transcriptionProgress}%` }}
              />
            </div>
          )}
        </div>

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
      </main>

      <footer className="app-footer">
        <p>v0.1.0 - MVP con Whisper AI</p>
      </footer>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default App
