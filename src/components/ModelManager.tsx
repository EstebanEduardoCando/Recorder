import { useState, useEffect } from 'react';
import './ModelManager.css';

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

export default function ModelManager() {
  const [models, setModels] = useState<WhisperModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.listWhisperModels();

      if (result.success && result.models) {
        setModels(result.models);
      } else {
        setError(result.error || 'Error al cargar modelos');
      }
    } catch (err) {
      setError('Error al cargar modelos: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleDownload = async (modelName: string) => {
    try {
      setDownloading(modelName);
      setError(null);

      const result = await window.electronAPI.forceDownloadWhisperModel(modelName);

      if (result.success) {
        alert(`Modelo ${modelName} descargado exitosamente`);
        await loadModels();
      } else {
        setError(result.error || 'Error al descargar modelo');
      }
    } catch (err) {
      setError('Error al descargar: ' + String(err));
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el modelo ${modelName}?`)) {
      return;
    }

    try {
      setError(null);
      const result = await window.electronAPI.deleteWhisperModel(modelName);

      if (result.success) {
        alert(`Modelo ${modelName} eliminado`);
        await loadModels();
      } else {
        setError(result.error || result.message);
      }
    } catch (err) {
      setError('Error al eliminar: ' + String(err));
    }
  };

  const getModelDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      tiny: 'Más rápido, menor precisión',
      base: 'Balance velocidad/precisión (recomendado)',
      small: 'Buena precisión, velocidad moderada',
      medium: 'Alta precisión, más lento',
      large: 'Máxima precisión, muy lento'
    };
    return descriptions[name] || '';
  };

  if (loading) {
    return (
      <div className="model-manager">
        <h2>Gestión de Modelos Whisper</h2>
        <div className="loading">Cargando modelos...</div>
      </div>
    );
  }

  return (
    <div className="model-manager">
      <div className="model-manager-header">
        <h2>Gestión de Modelos Whisper</h2>
        <button onClick={loadModels} className="btn-refresh">
          Actualizar
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="models-list">
        {models.map((model) => (
          <div
            key={model.name}
            className={`model-item ${!model.valid && model.downloaded ? 'model-invalid' : ''}`}
          >
            <div className="model-info">
              <div className="model-name-row">
                <h3>{model.name}</h3>
                <span className={`model-status ${model.downloaded ? 'downloaded' : 'not-downloaded'}`}>
                  {model.downloaded ? (model.valid ? '✓ Descargado' : '⚠ Corrupto') : '○ No descargado'}
                </span>
              </div>

              <p className="model-description">{getModelDescription(model.name)}</p>

              <div className="model-size">
                {model.downloaded ? (
                  <span>
                    Tamaño: {model.sizeFormatted}
                    {!model.valid && ` (esperado: ${model.expectedSizeFormatted})`}
                  </span>
                ) : (
                  <span>Tamaño esperado: {model.expectedSizeFormatted}</span>
                )}
              </div>
            </div>

            <div className="model-actions">
              {model.downloaded && model.valid && (
                <button
                  onClick={() => handleDelete(model.name)}
                  className="btn-delete"
                  disabled={downloading !== null}
                >
                  Eliminar
                </button>
              )}

              <button
                onClick={() => handleDownload(model.name)}
                className={`btn-download ${!model.valid && model.downloaded ? 'btn-redownload' : ''}`}
                disabled={downloading !== null}
              >
                {downloading === model.name
                  ? 'Descargando...'
                  : model.downloaded && !model.valid
                  ? 'Re-descargar'
                  : model.downloaded
                  ? 'Re-descargar'
                  : 'Descargar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="model-info-box">
        <p><strong>Nota:</strong> Los modelos más grandes ofrecen mejor precisión pero requieren más tiempo de procesamiento.</p>
        <p>El modelo "base" es recomendado para uso general.</p>
      </div>
    </div>
  );
}
