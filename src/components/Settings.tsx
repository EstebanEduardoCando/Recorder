import { useState, useEffect } from 'react';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
}

const WHISPER_MODELS = [
  { value: 'tiny', label: 'Tiny (~75MB) - Más rápido, menor precisión' },
  { value: 'base', label: 'Base (~142MB) - Buen balance (recomendado)' },
  { value: 'small', label: 'Small (~466MB) - Buena precisión' },
  { value: 'medium', label: 'Medium (~1.5GB) - Alta precisión' },
  { value: 'large', label: 'Large (~2.9GB) - Máxima precisión' },
];

const EXPORT_FORMATS = [
  { value: 'txt', label: 'Texto plano (.txt)' },
  { value: 'srt', label: 'Subtítulos SRT (.srt)' },
  { value: 'vtt', label: 'WebVTT (.vtt)' },
  { value: 'json', label: 'JSON con timestamps (.json)' },
];

const LANGUAGES = [
  { value: 'auto', label: 'Detectar automáticamente' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugués' },
  { value: 'zh', label: 'Chino' },
  { value: 'ja', label: 'Japonés' },
  { value: 'ko', label: 'Coreano' },
];

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    loadAudioDevices();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.getConfig();
      if (result.success && result.config) {
        setConfig(result.config);
      } else {
        setMessage({ type: 'error', text: 'Error al cargar configuración' });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: 'Error al cargar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const loadAudioDevices = async () => {
    try {
      const result = await window.electronAPI.getAudioDevices();
      if (result.success && result.devices) {
        setAudioDevices(result.devices);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.updateConfig(config);
      if (result.success) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar configuración' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que quieres restaurar la configuración por defecto?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.resetConfig();
      if (result.success && result.config) {
        setConfig(result.config);
        setMessage({ type: 'success', text: 'Configuración restaurada' });
      } else {
        setMessage({ type: 'error', text: 'Error al restaurar configuración' });
      }
    } catch (error) {
      console.error('Error resetting config:', error);
      setMessage({ type: 'error', text: 'Error al restaurar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const result = await window.electronAPI.selectDirectory(config?.recordingsPath);
      if (result.success && result.path) {
        setConfig(prev => prev ? { ...prev, recordingsPath: result.path! } : null);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      setMessage({ type: 'error', text: 'Error al seleccionar directorio' });
    }
  };

  const handleOpenRecordingsFolder = async () => {
    if (!config?.recordingsPath) return;
    try {
      await window.electronAPI.openFile(config.recordingsPath);
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  if (loading) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-loading">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-error">Error al cargar la configuración</div>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Configuración</h2>
          <button className="close-button" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="settings-content">
          {message && (
            <div className={`settings-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="settings-section">
            <h3>📁 Almacenamiento</h3>
            <div className="settings-field">
              <label htmlFor="recordingsPath">Carpeta de grabaciones</label>
              <div className="path-selector">
                <input
                  type="text"
                  id="recordingsPath"
                  value={config.recordingsPath}
                  readOnly
                  className="path-input"
                />
                <button
                  type="button"
                  onClick={handleSelectDirectory}
                  className="btn-secondary"
                  title="Seleccionar carpeta"
                >
                  📂 Cambiar
                </button>
                <button
                  type="button"
                  onClick={handleOpenRecordingsFolder}
                  className="btn-secondary"
                  title="Abrir carpeta"
                >
                  🔗
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>🎤 Transcripción</h3>
            <div className="settings-field">
              <label htmlFor="whisperModel">Modelo de Whisper</label>
              <select
                id="whisperModel"
                value={config.whisperModel}
                onChange={(e) => setConfig({ ...config, whisperModel: e.target.value as AppConfig['whisperModel'] })}
              >
                {WHISPER_MODELS.map(model => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                Modelos más grandes ofrecen mejor precisión pero requieren más tiempo y recursos
              </small>
            </div>

            <div className="settings-field">
              <label htmlFor="language">Idioma</label>
              <select
                id="language"
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="exportFormat">Formato de exportación</label>
              <select
                id="exportFormat"
                value={config.exportFormat}
                onChange={(e) => setConfig({ ...config, exportFormat: e.target.value as AppConfig['exportFormat'] })}
              >
                {EXPORT_FORMATS.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>🎙️ Audio</h3>
            <div className="settings-field">
              <label htmlFor="audioSource">Fuente de audio</label>
              <select
                id="audioSource"
                value={config.audioSource}
                onChange={(e) => setConfig({ ...config, audioSource: e.target.value })}
              >
                <option value="">Dispositivo predeterminado</option>
                {audioDevices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.type === 'microphone' ? '🎤' : device.type === 'system' ? '🔊' : '🎧'} {device.name}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                Para grabar audio del sistema (reuniones, música, etc.), selecciona un dispositivo de salida (🔊) o "Stereo Mix".
                {audioDevices.filter(d => d.type === 'system').length === 0 && (
                  <div style={{
                    color: '#ff9f43',
                    display: 'block',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 159, 67, 0.1)',
                    borderRadius: '4px',
                    borderLeft: '3px solid #ff9f43'
                  }}>
                    <strong>⚠️ Audio del sistema no disponible</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', lineHeight: '1.4' }}>
                      Para capturar audio del sistema en Windows:
                      <br/>1. Configuración de Sonido → Grabación
                      <br/>2. Mostrar dispositivos deshabilitados
                      <br/>3. Habilitar "Mezcla estéreo" o "Stereo Mix"
                      <br/>
                      <br/>Si no aparece, instala <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://vb-audio.com/Cable/') }}
                        style={{ color: '#4dabf7', textDecoration: 'underline' }}
                      >VB-Audio Cable</a>
                    </p>
                  </div>
                )}
              </small>
            </div>

            <div className="settings-field">
              <label htmlFor="audioFormat">Formato de audio</label>
              <select
                id="audioFormat"
                value={config.audioFormat || 'flac'}
                onChange={(e) => setConfig({ ...config, audioFormat: e.target.value as 'flac' | 'wav' | 'mp3' })}
              >
                <option value="flac">FLAC (Sin pérdida, comprimido)</option>
                <option value="wav">WAV (Sin comprimir)</option>
                <option value="mp3">MP3 (Comprimido con pérdida)</option>
              </select>
              <small className="field-hint">
                FLAC recomendado: mejor calidad con menor tamaño de archivo
              </small>
            </div>

            <div className="settings-field">
              <label htmlFor="sampleRate">Frecuencia de muestreo</label>
              <select
                id="sampleRate"
                value={config.sampleRate}
                onChange={(e) => setConfig({ ...config, sampleRate: parseInt(e.target.value) })}
              >
                <option value="16000">16 kHz (Transcripción básica)</option>
                <option value="44100">44.1 kHz (Calidad CD - Recomendado)</option>
                <option value="48000">48 kHz (Calidad profesional)</option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="channels">Canales de audio</label>
              <select
                id="channels"
                value={config.channels || 2}
                onChange={(e) => setConfig({ ...config, channels: parseInt(e.target.value) })}
              >
                <option value="1">Mono (1 canal)</option>
                <option value="2">Estéreo (2 canales)</option>
              </select>
              <small className="field-hint">
                Estéreo recomendado para reuniones con audio del sistema
              </small>
            </div>
          </div>

          <div className="settings-section">
            <h3>🎛️ Filtros de Audio (Reuniones)</h3>
            <div className="settings-field">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.enableAudioFilters ?? true}
                  onChange={(e) => setConfig({ ...config, enableAudioFilters: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Activar filtros de audio
              </label>
              <small className="field-hint">
                Mejora automática de calidad para reuniones y transcripción
              </small>
            </div>

            {(config.enableAudioFilters ?? true) && (
              <>
                <div className="settings-field">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.enableNoiseReduction ?? true}
                      onChange={(e) => setConfig({ ...config, enableNoiseReduction: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Reducción de ruido de fondo
                  </label>
                  <small className="field-hint">
                    Elimina ruidos ambientales (ventiladores, teclado, tráfico)
                  </small>
                </div>

                <div className="settings-field">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.enableNormalization ?? true}
                      onChange={(e) => setConfig({ ...config, enableNormalization: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Normalización de volumen
                  </label>
                  <small className="field-hint">
                    Balancea el volumen de todos los participantes
                  </small>
                </div>

                <div className="settings-field">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.enableCompression ?? true}
                      onChange={(e) => setConfig({ ...config, enableCompression: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Compresión dinámica
                  </label>
                  <small className="field-hint">
                    Hace las voces bajas más audibles sin distorsión
                  </small>
                </div>

                <div className="settings-field">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.enableHighPassFilter ?? true}
                      onChange={(e) => setConfig({ ...config, enableHighPassFilter: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Filtro pasa-altos
                  </label>
                  <small className="field-hint">
                    Elimina ruidos graves (ventiladores, vibraciones) - {config.highPassFrequency || 80} Hz
                  </small>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button
            onClick={handleReset}
            className="btn-secondary"
            disabled={saving}
          >
            🔄 Restaurar por defecto
          </button>
          <div className="footer-actions">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
