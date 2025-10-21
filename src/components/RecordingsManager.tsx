import { useState, useEffect } from 'react';
import './RecordingsManager.css';

interface Recording {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
  extension: string;
}

interface RecordingsManagerProps {
  onSelectRecording?: (path: string) => void;
  onLoadTranscription?: (path: string) => void;
}

export default function RecordingsManager({ onSelectRecording, onLoadTranscription }: RecordingsManagerProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.listRecordings();

      if (result.success && result.recordings) {
        setRecordings(result.recordings);
      } else {
        setError(result.error || 'Error al cargar grabaciones');
      }
    } catch (err) {
      setError('Error al cargar grabaciones: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const handleOpenFile = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        title: 'Seleccionar archivo de audio',
        properties: ['openFile'],
        filters: [
          { name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] }
        ]
      });

      if (result.success && result.filePath && !result.canceled) {
        if (onSelectRecording) {
          onSelectRecording(result.filePath);
        }
      }
    } catch (err) {
      setError('Error al abrir archivo: ' + String(err));
    }
  };

  const handleSelectRecording = (path: string) => {
    if (onSelectRecording) {
      onSelectRecording(path);
    }
  };

  const startRename = (recording: Recording) => {
    setRenaming(recording.path);
    // Remover la extensión del nombre para editarlo
    const nameWithoutExt = recording.name.replace(/\.[^/.]+$/, '');
    setNewName(nameWithoutExt);
  };

  const handleRename = async (oldPath: string) => {
    if (!newName.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    try {
      const result = await window.electronAPI.renameRecording(oldPath, newName.trim());

      if (result.success) {
        alert('Archivo renombrado exitosamente');
        await loadRecordings();
        setRenaming(null);
        setNewName('');
      } else {
        setError(result.error || 'Error al renombrar');
      }
    } catch (err) {
      setError('Error al renombrar: ' + String(err));
    }
  };

  const cancelRename = () => {
    setRenaming(null);
    setNewName('');
  };

  const handleToggleSelection = (path: string) => {
    const newSelection = new Set(selectedRecordings);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedRecordings(newSelection);
  };

  const handleToggleSelectAll = () => {
    if (selectedRecordings.size === recordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(recordings.map(r => r.path)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRecordings.size === 0) return;

    const confirmMessage = selectedRecordings.size === 1
      ? '¿Estás seguro de eliminar esta grabación?'
      : `¿Estás seguro de eliminar ${selectedRecordings.size} grabaciones?`;

    if (!confirm(confirmMessage)) return;

    try {
      setDeleting(true);
      setError(null);

      const paths = Array.from(selectedRecordings);
      const result = await window.electronAPI.deleteRecordings(paths);

      if (result.success || result.deleted.length > 0) {
        alert(result.message);
        setSelectedRecordings(new Set());
        await loadRecordings();
      } else {
        setError(result.error || 'Error al eliminar grabaciones');
      }
    } catch (err) {
      setError('Error al eliminar: ' + String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (path: string) => {
    if (!confirm('¿Estás seguro de eliminar esta grabación?')) return;

    try {
      setDeleting(true);
      setError(null);

      const result = await window.electronAPI.deleteRecordings(path);

      if (result.success) {
        alert(result.message);
        await loadRecordings();
      } else {
        setError(result.error || 'Error al eliminar');
      }
    } catch (err) {
      setError('Error al eliminar: ' + String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleLoadTranscription = async (path: string) => {
    if (onLoadTranscription) {
      onLoadTranscription(path);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="recordings-manager">
        <h2>Grabaciones</h2>
        <div className="loading">Cargando grabaciones...</div>
      </div>
    );
  }

  return (
    <div className="recordings-manager">
      <div className="recordings-header">
        <h2>Grabaciones</h2>
        <div className="recordings-actions">
          {recordings.length > 0 && (
            <>
              <button
                onClick={handleDeleteSelected}
                className="btn-delete"
                disabled={selectedRecordings.size === 0 || deleting}
                title="Eliminar seleccionados"
              >
                {deleting ? 'Eliminando...' : `Eliminar (${selectedRecordings.size})`}
              </button>
              <button
                onClick={handleToggleSelectAll}
                className="btn-select-all"
                title={selectedRecordings.size === recordings.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              >
                {selectedRecordings.size === recordings.length ? 'Deseleccionar' : 'Seleccionar todo'}
              </button>
            </>
          )}
          <button onClick={handleOpenFile} className="btn-open-file">
            Abrir archivo...
          </button>
          <button onClick={loadRecordings} className="btn-refresh">
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {recordings.length === 0 ? (
        <div className="no-recordings">
          <p>No hay grabaciones disponibles</p>
          <p className="hint">Las grabaciones aparecerán aquí después de grabar</p>
        </div>
      ) : (
        <div className="recordings-list">
          {recordings.map((recording) => (
            <div key={recording.path} className={`recording-item ${selectedRecordings.has(recording.path) ? 'selected' : ''}`}>
              {renaming === recording.path ? (
                <div className="rename-form">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleRename(recording.path);
                      if (e.key === 'Escape') cancelRename();
                    }}
                    autoFocus
                    className="rename-input"
                  />
                  <span className="file-extension">.{recording.extension}</span>
                  <div className="rename-buttons">
                    <button onClick={() => handleRename(recording.path)} className="btn-save">
                      ✓
                    </button>
                    <button onClick={cancelRename} className="btn-cancel">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="checkbox"
                    className="recording-checkbox"
                    checked={selectedRecordings.has(recording.path)}
                    onChange={() => handleToggleSelection(recording.path)}
                    title="Seleccionar para eliminar"
                  />

                  <div className="recording-info">
                    <div className="recording-name">{recording.name}</div>
                    <div className="recording-metadata">
                      <span>{recording.sizeFormatted}</span>
                      <span>•</span>
                      <span>{formatDate(recording.modified)}</span>
                    </div>
                  </div>

                  <div className="recording-actions">
                    <button
                      onClick={() => handleLoadTranscription(recording.path)}
                      className="btn-load"
                      title="Cargar transcripción"
                    >
                      Ver texto
                    </button>
                    <button
                      onClick={() => handleSelectRecording(recording.path)}
                      className="btn-transcribe"
                      title="Transcribir este archivo"
                    >
                      Transcribir
                    </button>
                    <button
                      onClick={() => startRename(recording)}
                      className="btn-rename"
                      title="Renombrar archivo"
                    >
                      Renombrar
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(recording.path)}
                      className="btn-delete-single"
                      title="Eliminar"
                      disabled={deleting}
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
