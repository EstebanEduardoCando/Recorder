const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class TranscriptionService {
  constructor() {
    this.isInitialized = false;
    this.modelsDir = path.join(app.getPath('userData'), 'models');
    this.currentTranscription = null;
    this.modelName = 'base';
    this.nodewhisper = null;

    console.log('TranscriptionService: Node.js path:', process.execPath);
  }

  async ensureModelsDir() {
    try {
      await fs.access(this.modelsDir);
    } catch {
      await fs.mkdir(this.modelsDir, { recursive: true });
    }
  }

  async initialize(modelName = 'base') {
    if (this.isInitialized) {
      return { success: true, message: 'Whisper ya está inicializado' };
    }

    await this.ensureModelsDir();

    try {
      // Cargar nodejs-whisper solo cuando se necesite
      if (!this.nodewhisper) {
        const { nodewhisper } = require('nodejs-whisper');
        this.nodewhisper = nodewhisper;
        console.log('nodejs-whisper cargado correctamente');
      }

      this.modelName = modelName;
      this.isInitialized = true;

      return {
        success: true,
        message: `Whisper inicializado con modelo: ${modelName}`,
        modelName
      };
    } catch (error) {
      console.error('Error inicializando Whisper:', error);
      throw new Error(`No se pudo inicializar Whisper: ${error.message}`);
    }
  }

  async transcribe(audioPath, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Verificar que el archivo existe
    try {
      await fs.access(audioPath);
    } catch {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }

    const {
      language = 'es',
      onProgress = null
    } = options;

    try {
      // Notificar inicio
      if (onProgress) {
        onProgress({ progress: 0, status: 'Iniciando transcripción...' });
      }

      // nodejs-whisper automáticamente convierte el audio a WAV 16kHz
      const whisperOptions = {
        modelName: this.modelName,  // tiny, base, small, medium, large
        autoDownloadModelName: this.modelName, // Auto-descarga del modelo
        whisperOptions: {
          language: language === 'auto' ? null : language,
          word_timestamps: true,
          max_len: 0,
          split_on_word: true,
        },
        removeWavFileAfterTranscription: false, // Mantener el archivo original
      };

      // Notificar progreso
      if (onProgress) {
        onProgress({ progress: 30, status: 'Procesando audio...' });
      }

      // Ejecutar transcripción
      const output = await this.nodewhisper(audioPath, whisperOptions);

      // Notificar progreso
      if (onProgress) {
        onProgress({ progress: 80, status: 'Procesando resultados...' });
      }

      // Procesar la salida de Whisper
      const result = this.parseWhisperOutput(output, audioPath);

      // Notificar completado
      if (onProgress) {
        onProgress({ progress: 100, status: 'Transcripción completada' });
      }

      this.currentTranscription = result;

      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('Error en transcripción:', error);
      throw new Error(`Error al transcribir: ${error.message}`);
    }
  }

  parseWhisperOutput(output, audioPath) {
    // nodejs-whisper devuelve un objeto con diferentes formatos
    let text = '';
    let segments = [];

    // El output puede contener el texto directamente o en diferentes formatos
    if (typeof output === 'string') {
      text = output.trim();
      // Si es solo texto, crear un segmento único
      segments = [{
        id: 0,
        start: 0,
        end: 0,
        text: text
      }];
    } else if (output && output.length > 0) {
      // Si es un array de segmentos
      segments = output.map((segment, index) => ({
        id: index,
        start: segment.start || segment.from || 0,
        end: segment.end || segment.to || 0,
        text: (segment.text || segment.speech || '').trim()
      }));

      text = segments.map(s => s.text).join(' ');
    }

    // Intentar leer el archivo .txt generado por whisper
    const txtPath = audioPath.replace(/\.\w+$/, '.txt');

    return {
      text: text || 'Transcripción completada. Ver archivo de salida.',
      segments,
      language: 'es',
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
      outputFiles: {
        txt: txtPath,
        srt: audioPath.replace(/\.\w+$/, '.srt'),
        vtt: audioPath.replace(/\.\w+$/, '.vtt'),
      }
    };
  }

  async saveTranscription(transcription, outputPath) {
    try {
      const data = {
        text: transcription.text,
        segments: transcription.segments,
        language: transcription.language,
        duration: transcription.duration,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        outputPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      return {
        success: true,
        message: 'Transcripción guardada',
        path: outputPath
      };
    } catch (error) {
      console.error('Error guardando transcripción:', error);
      throw new Error(`No se pudo guardar la transcripción: ${error.message}`);
    }
  }

  async exportAsText(transcription, outputPath) {
    try {
      await fs.writeFile(outputPath, transcription.text, 'utf-8');
      return {
        success: true,
        message: 'Texto exportado',
        path: outputPath
      };
    } catch (error) {
      console.error('Error exportando texto:', error);
      throw new Error(`No se pudo exportar el texto: ${error.message}`);
    }
  }

  async exportAsSRT(transcription, outputPath) {
    try {
      let srt = '';

      transcription.segments.forEach((segment, index) => {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.end);

        srt += `${index + 1}\n`;
        srt += `${startTime} --> ${endTime}\n`;
        srt += `${segment.text.trim()}\n\n`;
      });

      await fs.writeFile(outputPath, srt, 'utf-8');
      return {
        success: true,
        message: 'SRT exportado',
        path: outputPath
      };
    } catch (error) {
      console.error('Error exportando SRT:', error);
      throw new Error(`No se pudo exportar como SRT: ${error.message}`);
    }
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  getCurrentTranscription() {
    return this.currentTranscription;
  }

  async downloadModel(modelName = 'base') {
    // nodejs-whisper descarga modelos automáticamente en la primera ejecución
    await this.ensureModelsDir();

    return {
      success: true,
      message: `El modelo ${modelName} se descargará automáticamente en la primera transcripción`,
      modelName
    };
  }
}

module.exports = new TranscriptionService();
