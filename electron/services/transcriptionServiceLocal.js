/**
 * Servicio de transcripción usando @fugood/whisper.node
 * Solución 100% local con binarios precompilados (sin necesidad de compilar)
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

class TranscriptionServiceLocal {
  constructor() {
    this.isInitialized = false;
    this.modelsDir = path.join(app.getPath('userData'), 'models');
    this.whisperContext = null;
    this.modelName = 'base';
    this.modelPath = null;
  }

  async ensureModelsDir() {
    try {
      await fs.access(this.modelsDir);
    } catch {
      await fs.mkdir(this.modelsDir, { recursive: true });
    }
  }

  async downloadModel(modelName = 'base') {
    await this.ensureModelsDir();

    const modelFile = `ggml-${modelName}.bin`;
    this.modelPath = path.join(this.modelsDir, modelFile);

    // Verificar si ya existe
    try {
      await fs.access(this.modelPath);
      console.log(`✓ Modelo ${modelName} ya existe en:`, this.modelPath);
      return this.modelPath;
    } catch {
      // El modelo no existe, descargar
      console.log(`Descargando modelo ${modelName}...`);
    }

    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;

    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(this.modelPath);

      https.get(modelUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Seguir redirect
          https.get(response.headers.location, (redirectResponse) => {
            const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
            let downloadedSize = 0;

            redirectResponse.on('data', (chunk) => {
              downloadedSize += chunk.length;
              const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
              process.stdout.write(`\rDescargando: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
            });

            redirectResponse.pipe(file);

            file.on('finish', () => {
              file.close();
              console.log(`\n✓ Modelo ${modelName} descargado exitosamente`);
              resolve(this.modelPath);
            });

            file.on('error', (err) => {
              fs.unlink(this.modelPath);
              reject(err);
            });
          });
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✓ Modelo ${modelName} descargado`);
            resolve(this.modelPath);
          });
        }
      }).on('error', (err) => {
        fs.unlink(this.modelPath);
        reject(err);
      });
    });
  }

  async initialize(modelName = 'base') {
    if (this.isInitialized) {
      return { success: true, message: 'Whisper ya está inicializado' };
    }

    try {
      this.modelName = modelName;

      // Descargar modelo si no existe
      await this.downloadModel(modelName);

      // Importar whisper.node
      const { initWhisper } = require('@fugood/whisper.node');

      console.log('Inicializando Whisper con modelo:', this.modelPath);

      // Verificar que el archivo del modelo existe
      try {
        await fs.access(this.modelPath);
        console.log('✓ Archivo del modelo verificado');
      } catch (error) {
        throw new Error(`El archivo del modelo no existe: ${this.modelPath}`);
      }

      // Inicializar contexto de Whisper
      console.log('Llamando a initWhisper con configuración:', {
        model: this.modelPath,
        useGpu: false
      });

      // Probar diferentes nombres de parámetros según la documentación
      // La librería puede esperar 'filePath' en lugar de 'model'
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,  // Intentar con filePath
        useGpu: false,
      });

      console.log('✓ Whisper inicializado correctamente');

      this.isInitialized = true;

      return {
        success: true,
        message: `Whisper inicializado con modelo: ${modelName}`,
        modelName,
        modelPath: this.modelPath
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
      if (onProgress) {
        onProgress({ progress: 0, status: 'Iniciando transcripción...' });
      }

      if (onProgress) {
        onProgress({ progress: 30, status: 'Transcribiendo...' });
      }

      // Transcribir usando whisper.node
      const { stop, promise } = this.whisperContext.transcribeFile(audioPath, {
        language: language === 'auto' ? undefined : language,
        temperature: 0.0,
        maxLen: 0,
        splitOnWord: true,
        tokenTimestamps: true,
      });

      const result = await promise;

      if (onProgress) {
        onProgress({ progress: 90, status: 'Procesando resultados...' });
      }

      // Procesar la salida
      const transcriptionResult = this.parseWhisperOutput(result);

      if (onProgress) {
        onProgress({ progress: 100, status: 'Transcripción completada' });
      }

      return {
        success: true,
        ...transcriptionResult
      };

    } catch (error) {
      console.error('Error en transcripción:', error);
      throw new Error(`Error al transcribir: ${error.message}`);
    }
  }

  parseWhisperOutput(result) {
    // @fugood/whisper.node devuelve segmentos con timestamps
    const segments = (result.segments || []).map((segment, index) => ({
      id: index,
      start: segment.t0 / 100, // Convertir de centisegundos a segundos
      end: segment.t1 / 100,
      text: (segment.text || '').trim()
    }));

    const text = result.result || segments.map(s => s.text).join(' ');

    return {
      text: text.trim(),
      segments,
      language: result.language || 'es',
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0
    };
  }

  async saveTranscription(transcription, outputPath) {
    try {
      const data = {
        text: transcription.text,
        segments: transcription.segments,
        language: transcription.language,
        duration: transcription.duration,
        timestamp: new Date().toISOString(),
        provider: 'Whisper Local (@fugood/whisper.node)'
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
}

module.exports = new TranscriptionServiceLocal();
