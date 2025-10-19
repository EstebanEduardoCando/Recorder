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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
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
              <label htmlFor="sampleRate">Frecuencia de muestreo</label>
              <select
                id="sampleRate"
                value={config.sampleRate}
                onChange={(e) => setConfig({ ...config, sampleRate: parseInt(e.target.value) })}
              >
                <option value="16000">16 kHz (Óptimo para voz)</option>
                <option value="44100">44.1 kHz (Calidad CD)</option>
                <option value="48000">48 kHz (Calidad profesional)</option>
              </select>
            </div>
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
