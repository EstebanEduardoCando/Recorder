/**
 * Servicio de transcripción usando @fugood/whisper.node
 * Solución 100% local con binarios precompilados (sin necesidad de compilar)
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

class TranscriptionServiceLocal {
  constructor() {
    this.isInitialized = false;
    this.modelsDir = null;
    this.whisperContext = null;
    this.modelName = 'base';
    this.modelPath = null;
    this.currentTranscriptionStop = null; // Función para cancelar transcripción en curso

    // Tamaños mínimos esperados para cada modelo (en bytes)
    // Estos son valores aproximados para detectar descargas incompletas
    this.modelMinSizes = {
      'tiny': 70 * 1024 * 1024,      // ~70 MB
      'base': 140 * 1024 * 1024,     // ~140 MB
      'small': 460 * 1024 * 1024,    // ~460 MB
      'medium': 1500 * 1024 * 1024,  // ~1.5 GB
      'large': 2900 * 1024 * 1024,   // ~2.9 GB
    };
  }

  getModelsDir() {
    if (!this.modelsDir) {
      this.modelsDir = path.join(app.getPath('userData'), 'models');
    }
    return this.modelsDir;
  }

  async ensureModelsDir() {
    const modelsDir = this.getModelsDir();
    try {
      await fs.access(modelsDir);
    } catch {
      await fs.mkdir(modelsDir, { recursive: true });
    }
  }

  /**
   * Valida si un archivo de modelo tiene el tamaño correcto
   * @param {string} modelPath - Ruta al archivo del modelo
   * @param {string} modelName - Nombre del modelo (tiny, base, small, medium, large)
   * @returns {Promise<boolean>} true si el modelo es válido, false si está corrupto
   */
  async validateModelFile(modelPath, modelName) {
    try {
      const stats = await fs.stat(modelPath);
      const fileSize = stats.size;
      const minSize = this.modelMinSizes[modelName];

      if (!minSize) {
        console.warn(`⚠️  No se conoce el tamaño mínimo para el modelo ${modelName}, asumiendo válido`);
        return true;
      }

      // Verificar que el archivo tenga al menos el 90% del tamaño mínimo esperado
      const isValid = fileSize >= (minSize * 0.9);

      if (!isValid) {
        console.error(`❌ Modelo corrupto: ${modelName}`);
        console.error(`   Tamaño actual: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.error(`   Tamaño esperado: ~${(minSize / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(`✓ Modelo ${modelName} validado: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      }

      return isValid;
    } catch (error) {
      console.error('Error validando modelo:', error);
      return false;
    }
  }

  async downloadModel(modelName = 'base') {
    await this.ensureModelsDir();

    const modelFile = `ggml-${modelName}.bin`;
    this.modelPath = path.join(this.getModelsDir(), modelFile);

    // Verificar si ya existe
    try {
      await fs.access(this.modelPath);
      console.log(`ℹ️  Archivo del modelo ${modelName} encontrado, validando...`);

      // Validar que el modelo no esté corrupto
      const isValid = await this.validateModelFile(this.modelPath, modelName);

      if (isValid) {
        console.log(`✓ Modelo ${modelName} válido en:`, this.modelPath);
        return this.modelPath;
      } else {
        console.warn(`⚠️  Modelo ${modelName} corrupto, eliminando y re-descargando...`);
        try {
          await fs.unlink(this.modelPath);
          console.log(`✓ Archivo corrupto eliminado`);
        } catch (unlinkError) {
          console.error('Error eliminando archivo corrupto:', unlinkError);
        }
      }
    } catch {
      // El modelo no existe, descargar
      console.log(`ℹ️  Modelo ${modelName} no encontrado, descargando...`);
    }

    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`;

    console.log(`📥 Descargando desde: ${modelUrl}`);

    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(this.modelPath);
      let downloadedSize = 0;

      const handleResponse = (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Seguir redirect
          console.log(`➡️  Siguiendo redirección a: ${response.headers.location}`);
          https.get(response.headers.location, handleResponse).on('error', handleError);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          require('fs').unlink(this.modelPath, () => {});
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        console.log(`📦 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
          process.stdout.write(`\r📥 Descargando: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        });

        response.pipe(file);

        file.on('finish', async () => {
          file.close();
          console.log(`\n✓ Descarga completada`);

          // Validar el archivo descargado
          console.log(`🔍 Validando modelo descargado...`);
          const isValid = await this.validateModelFile(this.modelPath, modelName);

          if (isValid) {
            console.log(`✓ Modelo ${modelName} descargado y validado exitosamente`);
            resolve(this.modelPath);
          } else {
            console.error(`❌ El archivo descargado está corrupto`);
            try {
              await fs.unlink(this.modelPath);
            } catch (e) {
              // Ignorar error al eliminar
            }
            reject(new Error(`El modelo descargado está corrupto o incompleto. Por favor, intenta nuevamente.`));
          }
        });

        file.on('error', handleError);
      };

      const handleError = (err) => {
        file.close();
        require('fs').unlink(this.modelPath, () => {});
        console.error(`\n❌ Error durante la descarga:`, err.message);
        reject(new Error(`Error al descargar el modelo: ${err.message}`));
      };

      https.get(modelUrl, handleResponse).on('error', handleError);
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
        useGpu: true
      });

      // Probar diferentes nombres de parámetros según la documentación
      // La librería puede esperar 'filePath' en lugar de 'model'
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,  // Intentar con filePath
        useGpu: true,
        gpu_device: 0 
      }, 'cuda');

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

  /**
   * Convierte cualquier formato de audio a WAV 16kHz mono (requerido por Whisper)
   * @param {string} inputPath - Ruta al archivo de audio original
   * @returns {Promise<string>} Ruta al archivo WAV convertido
   */
  async convertToWav(inputPath) {
    const ext = path.extname(inputPath).toLowerCase();

    // Si ya es WAV, verificar si tiene el formato correcto
    if (ext === '.wav') {
      // TODO: Verificar sample rate y canales, convertir si es necesario
      console.log('✓ Archivo ya es WAV, usando directamente');
      return inputPath;
    }

    // Crear ruta temporal para el archivo convertido
    const tempWavPath = inputPath.replace(ext, '_temp.wav');

    console.log(`🔄 Convirtiendo ${ext} a WAV 16kHz mono para Whisper...`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('pcm_s16le')      // PCM 16-bit
        .audioChannels(1)              // Mono
        .audioFrequency(16000)         // 16kHz (requerido por Whisper)
        .format('wav')
        .on('start', (commandLine) => {
          console.log('FFmpeg conversión iniciada:', commandLine);
        })
        .on('end', () => {
          console.log(`✓ Conversión completada: ${tempWavPath}`);
          resolve(tempWavPath);
        })
        .on('error', (err) => {
          console.error('❌ Error en conversión:', err);
          reject(new Error(`No se pudo convertir el audio a WAV: ${err.message}`));
        })
        .save(tempWavPath);
    });
  }

  /**
   * Transcribe un archivo de audio (grabación nueva o existente)
   * @param {string} audioPath - Ruta al archivo de audio
   * @param {Object} options - Opciones de transcripción
   * @param {string} options.language - Idioma (default: 'es')
   * @param {Function} options.onProgress - Callback de progreso
   * @param {string} options.modelName - Modelo a usar (opcional, usa el actual por defecto)
   * @returns {Promise<Object>} Resultado de la transcripción
   */
  async transcribe(audioPath, options = {}) {
    const {
      language = 'es',
      onProgress = null,
      modelName = null
    } = options;

    // Si se especifica un modelo diferente, reinicializar
    if (modelName && modelName !== this.modelName) {
      console.log(`🔄 Cambiando a modelo: ${modelName}`);
      this.isInitialized = false;
      await this.initialize(modelName);
    } else if (!this.isInitialized) {
      await this.initialize(this.modelName || 'base');
    }

    // Verificar que el archivo existe
    try {
      await fs.access(audioPath);
    } catch {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }

    let wavPath = audioPath;
    let tempFileCreated = false;

    try {
      if (onProgress) {
        onProgress({ progress: 0, status: 'Iniciando transcripción...' });
      }

      // Convertir a WAV si es necesario
      const ext = path.extname(audioPath).toLowerCase();
      if (ext !== '.wav') {
        if (onProgress) {
          onProgress({ progress: 10, status: 'Convirtiendo audio a formato compatible...' });
        }
        wavPath = await this.convertToWav(audioPath);
        tempFileCreated = true;
      }

      if (onProgress) {
        onProgress({ progress: 30, status: 'Transcribiendo...' });
      }

      // Cargar configuración optimizada
      const configService = require('./configService');
      const appConfig = configService.getConfig();

      // Transcribir usando whisper.node con parámetros optimizados
      console.log(`📝 Transcribiendo archivo: ${wavPath}`);
      const { stop, promise} = this.whisperContext.transcribeFile(wavPath, {
        // Idioma y detección
        language: language === 'auto' ? undefined : language,

        // Parámetros de calidad optimizados para GPU
        temperature: appConfig.temperature || 0.0,           // Más determinista
        beam_size: appConfig.beamSize || 3,                  // Balance calidad/velocidad
        best_of: appConfig.bestOf || 3,                      // Candidatos a considerar

        // Control de threads (importante para CPU, GPU lo ignora)
        n_threads: appConfig.nThreads || 8,

        // Timestamps y segmentación
        token_timestamps: true,                               // Timestamps detallados
        split_on_word: appConfig.splitOnWord !== false,      // Dividir por palabras
        max_len: appConfig.maxSegmentLength || 0,            // Longitud máxima de segmento

        // Umbrales de calidad
        entropy_thold: appConfig.entropyThold || 2.4,        // Filtro de calidad
        logprob_thold: appConfig.logprobThold || -1.0,       // Filtro de confianza
        no_speech_thold: appConfig.noSpeechThold || 0.6,     // Detección de silencio

        // Supresión de tokens no deseados
        suppress_blank: appConfig.suppressBlank !== false,    // Suprimir blancos
        suppress_non_speech_tokens: true,                     // Suprimir ruido

        // Prompt inicial si está configurado
        initial_prompt: appConfig.initialPrompt || undefined,

        // Contexto
        no_context: false,                                    // Usar contexto previo
        single_segment: false,                                // Múltiples segmentos

        // Detección de idioma
        detect_language: language === 'auto' || appConfig.detectLanguage,
      });

      // Guardar referencia a la función stop para permitir cancelación
      this.currentTranscriptionStop = stop;

      const result = await promise;

      // Limpiar la referencia después de completar
      this.currentTranscriptionStop = null;

      if (onProgress) {
        onProgress({ progress: 90, status: 'Procesando resultados...' });
      }

      // Procesar la salida
      const transcriptionResult = this.parseWhisperOutput(result);

      if (onProgress) {
        onProgress({ progress: 100, status: 'Transcripción completada' });
      }

      // Limpiar archivo temporal si se creó
      if (tempFileCreated && wavPath !== audioPath) {
        try {
          await fs.unlink(wavPath);
          console.log('✓ Archivo temporal eliminado:', wavPath);
        } catch (err) {
          console.warn('⚠️  No se pudo eliminar archivo temporal:', err);
        }
      }

      return {
        success: true,
        ...transcriptionResult
      };

    } catch (error) {
      console.error('Error en transcripción:', error);

      // Limpiar archivo temporal en caso de error
      if (tempFileCreated && wavPath !== audioPath) {
        try {
          await fs.unlink(wavPath);
        } catch (err) {
          // Ignorar error de limpieza
        }
      }

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

  /**
   * Carga una transcripción guardada previamente
   * @param {string} audioPath - Ruta al archivo de audio
   * @returns {Promise<Object>} Objeto con la transcripción cargada
   */
  async loadTranscription(audioPath) {
    try {
      // Intentar cargar el archivo .txt asociado
      const basePath = audioPath.replace(/\.\w+$/, '');
      const txtPath = basePath + '.txt';

      try {
        const text = await fs.readFile(txtPath, 'utf8');

        return {
          success: true,
          text: text,
          segments: [], // Los archivos TXT no tienen segmentos
          language: 'unknown',
          message: 'Transcripción cargada desde archivo'
        };
      } catch (txtError) {
        // Si no hay archivo TXT, intentar con JSON
        const jsonPath = basePath + '.json';

        try {
          const jsonData = await fs.readFile(jsonPath, 'utf8');
          const transcription = JSON.parse(jsonData);

          return {
            success: true,
            ...transcription,
            message: 'Transcripción cargada desde JSON'
          };
        } catch (jsonError) {
          throw new Error('No se encontró transcripción para este archivo');
        }
      }
    } catch (error) {
      console.error('Error cargando transcripción:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lista todos los modelos disponibles y sus estados
   * @returns {Promise<Array>} Lista de modelos con información de descarga
   */
  async listModels() {
    await this.ensureModelsDir();
    const modelsDir = this.getModelsDir();

    const availableModels = ['tiny', 'base', 'small', 'medium', 'large'];
    const modelsList = [];

    for (const modelName of availableModels) {
      const modelFile = `ggml-${modelName}.bin`;
      const modelPath = path.join(modelsDir, modelFile);

      let downloaded = false;
      let valid = false;
      let size = 0;
      let sizeFormatted = '0 MB';

      try {
        const stats = await fs.stat(modelPath);
        downloaded = true;
        size = stats.size;
        sizeFormatted = `${(size / 1024 / 1024).toFixed(2)} MB`;
        valid = await this.validateModelFile(modelPath, modelName);
      } catch {
        // Archivo no existe
      }

      const expectedSize = this.modelMinSizes[modelName];
      const expectedSizeFormatted = `${(expectedSize / 1024 / 1024).toFixed(0)} MB`;

      modelsList.push({
        name: modelName,
        fileName: modelFile,
        path: modelPath,
        downloaded,
        valid,
        size,
        sizeFormatted,
        expectedSize,
        expectedSizeFormatted
      });
    }

    return modelsList;
  }

  /**
   * Elimina un modelo específico
   * @param {string} modelName - Nombre del modelo a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async deleteModel(modelName) {
    await this.ensureModelsDir();
    const modelFile = `ggml-${modelName}.bin`;
    const modelPath = path.join(this.getModelsDir(), modelFile);

    try {
      await fs.access(modelPath);
      await fs.unlink(modelPath);

      console.log(`✓ Modelo ${modelName} eliminado exitosamente`);

      // Si el modelo eliminado era el que estaba inicializado, resetear
      if (this.isInitialized && this.modelName === modelName) {
        this.isInitialized = false;
        this.whisperContext = null;
        this.modelName = 'base';
        this.modelPath = null;
        console.log(`ℹ️  Whisper reiniciado (modelo activo eliminado)`);
      }

      return {
        success: true,
        message: `Modelo ${modelName} eliminado correctamente`
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          success: false,
          message: `El modelo ${modelName} no existe`
        };
      }
      throw new Error(`No se pudo eliminar el modelo: ${error.message}`);
    }
  }

  /**
   * Fuerza la descarga de un modelo (elimina si existe y descarga de nuevo)
   * @param {string} modelName - Nombre del modelo a descargar
   * @param {Function} onProgress - Callback opcional para progreso
   * @returns {Promise<Object>} Resultado de la operación
   */
  async forceDownloadModel(modelName, onProgress = null) {
    await this.ensureModelsDir();
    const modelFile = `ggml-${modelName}.bin`;
    const modelPath = path.join(this.getModelsDir(), modelFile);

    // Eliminar si existe
    try {
      await fs.access(modelPath);
      await fs.unlink(modelPath);
      console.log(`✓ Modelo existente eliminado`);
    } catch {
      // No existe, continuar
    }

    // Descargar
    console.log(`📥 Iniciando descarga de modelo: ${modelName}`);

    try {
      await this.downloadModel(modelName);

      return {
        success: true,
        message: `Modelo ${modelName} descargado correctamente`,
        path: modelPath
      };
    } catch (error) {
      throw new Error(`No se pudo descargar el modelo: ${error.message}`);
    }
  }

  /**
   * Cancela la transcripción en curso
   * @returns {Object} Resultado de la cancelación
   */
  cancelTranscription() {
    if (this.currentTranscriptionStop) {
      console.log('🛑 Cancelando transcripción...');
      this.currentTranscriptionStop();
      this.currentTranscriptionStop = null;
      return { success: true, message: 'Transcripción cancelada' };
    } else {
      return { success: false, message: 'No hay transcripción en curso' };
    }
  }
}

module.exports = new TranscriptionServiceLocal();
