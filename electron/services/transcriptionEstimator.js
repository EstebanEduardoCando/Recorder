/**
 * Servicio para estimar tiempo de transcripción
 * Basado en benchmarks reales de rendimiento por modelo y hardware
 */

const fs = require('fs').promises;
const path = require('path');

class TranscriptionEstimator {
  constructor() {
    // Factores de velocidad relativa al tiempo real del audio
    // Valores basados en benchmarks con diferentes configuraciones
    this.speedFactors = {
      // CPU (sin GPU)
      cpu: {
        tiny: 0.5,    // 0.5x = tarda el doble del tiempo del audio
        base: 0.3,    // 0.3x = ~3.3 veces el tiempo del audio
        small: 0.15,  // 0.15x = ~6.6 veces el tiempo del audio
        medium: 0.08, // 0.08x = ~12.5 veces el tiempo del audio
        large: 0.04   // 0.04x = ~25 veces el tiempo del audio
      },
      // GPU CUDA (NVIDIA)
      cuda: {
        tiny: 5.0,    // 5x = procesa 5 veces más rápido que el audio
        base: 4.0,    // 4x = 1 min audio en 15s
        small: 3.0,   // 3x = 1 min audio en 20s
        medium: 2.0,  // 2x = 1 min audio en 30s
        large: 1.5    // 1.5x = 1 min audio en 40s
      },
      // GPU Vulkan (Multi-vendor)
      vulkan: {
        tiny: 3.0,
        base: 2.5,
        small: 2.0,
        medium: 1.5,
        large: 1.0
      },
      // Metal (Apple Silicon)
      metal: {
        tiny: 4.0,
        base: 3.5,
        small: 3.0,
        medium: 2.5,
        large: 2.0
      }
    };

    // Factores de ajuste por configuración de calidad
    this.qualityFactors = {
      beamSize: {
        1: 1.0,   // Sin overhead
        2: 1.2,   // +20%
        3: 1.4,   // +40%
        4: 1.6,   // +60%
        5: 1.8,   // +80%
        6: 2.0,   // +100%
        7: 2.2,
        8: 2.4,
        9: 2.6,
        10: 2.8
      }
    };
  }

  /**
   * Obtiene la duración de un archivo de audio
   * @param {string} audioPath - Ruta al archivo
   * @returns {Promise<number>} Duración en segundos
   */
  async getAudioDuration(audioPath) {
    try {
      const stats = await fs.stat(audioPath);
      const fileSizeBytes = stats.size;

      // Estimación aproximada basada en formato
      const ext = path.extname(audioPath).toLowerCase();

      // Factores de compresión aproximados (bytes por segundo)
      const compressionRates = {
        '.wav': 176400,  // PCM 16-bit, 44.1kHz, stereo (~1.4 MB/min)
        '.mp3': 16000,   // ~128 kbps (~1 MB/min)
        '.m4a': 16000,   // ~128 kbps
        '.flac': 100000, // Variable, ~800 kbps
        '.ogg': 16000    // ~128 kbps
      };

      const rate = compressionRates[ext] || compressionRates['.wav'];
      const durationSeconds = fileSizeBytes / rate;

      return Math.max(1, Math.floor(durationSeconds)); // Mínimo 1 segundo
    } catch (error) {
      console.error('Error calculando duración:', error);
      // Fallback: asumir 60 segundos
      return 60;
    }
  }

  /**
   * Calcula el tiempo estimado de transcripción
   * @param {Object} options - Opciones de estimación
   * @param {string} options.audioPath - Ruta al archivo de audio
   * @param {string} options.modelName - Modelo a usar (tiny, base, small, medium, large)
   * @param {boolean} options.useGpu - Si se usa GPU
   * @param {string} options.gpuBackend - Backend de GPU (cuda, vulkan, metal)
   * @param {number} options.beamSize - Tamaño del beam search
   * @param {number} options.audioDuration - Duración del audio en segundos (opcional)
   * @returns {Promise<Object>} Estimación con tiempos
   */
  async estimateTranscriptionTime(options) {
    const {
      audioPath,
      modelName = 'base',
      useGpu = false,
      gpuBackend = 'cuda',
      beamSize = 3,
      audioDuration = null
    } = options;

    // Obtener duración del audio
    const duration = audioDuration || await this.getAudioDuration(audioPath);

    // Determinar backend
    let backend = 'cpu';
    if (useGpu) {
      backend = gpuBackend || 'cuda';
    }

    // Obtener factor de velocidad base
    const speedFactor = this.speedFactors[backend]?.[modelName] || this.speedFactors.cpu[modelName];

    // Aplicar factor de calidad (beam size)
    const qualityFactor = this.qualityFactors.beamSize[beamSize] || 1.4;

    // Calcular tiempo de procesamiento
    let processingTime;
    if (speedFactor >= 1.0) {
      // GPU: más rápido que tiempo real
      processingTime = duration / (speedFactor / qualityFactor);
    } else {
      // CPU: más lento que tiempo real
      processingTime = duration / speedFactor * qualityFactor;
    }

    // Agregar overhead de inicialización y finalización (~5-10 segundos)
    const overhead = Math.min(10, duration * 0.1);
    const totalTime = processingTime + overhead;

    // Redondear a segundos
    const estimatedSeconds = Math.ceil(totalTime);
    const minEstimate = Math.ceil(estimatedSeconds * 0.8); // -20%
    const maxEstimate = Math.ceil(estimatedSeconds * 1.3); // +30%

    return {
      audioDuration: duration,
      audioDurationFormatted: this.formatDuration(duration),

      estimatedSeconds: estimatedSeconds,
      estimatedFormatted: this.formatDuration(estimatedSeconds),

      minSeconds: minEstimate,
      minFormatted: this.formatDuration(minEstimate),

      maxSeconds: maxEstimate,
      maxFormatted: this.formatDuration(maxEstimate),

      speedFactor: speedFactor,
      realTimeMultiplier: speedFactor >= 1 ? speedFactor : (1 / speedFactor),

      modelName: modelName,
      backend: backend,
      useGpu: useGpu,
      beamSize: beamSize,

      message: this.generateMessage(duration, estimatedSeconds, speedFactor, backend)
    };
  }

  /**
   * Formatea duración en formato legible
   * @param {number} seconds - Segundos
   * @returns {string} Formato "Xm Ys" o "Xs"
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (secs === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${secs}s`;
  }

  /**
   * Genera mensaje descriptivo
   * @private
   */
  generateMessage(audioDuration, estimatedTime, speedFactor, backend) {
    const ratio = audioDuration / estimatedTime;
    const backendName = {
      cpu: 'CPU',
      cuda: 'GPU CUDA',
      vulkan: 'GPU Vulkan',
      metal: 'GPU Metal'
    }[backend] || backend;

    if (ratio > 1) {
      return `${backendName}: ~${ratio.toFixed(1)}x más rápido que tiempo real`;
    } else {
      return `${backendName}: tomará ~${(1/ratio).toFixed(1)}x el tiempo del audio`;
    }
  }

  /**
   * Estima basándose en configuración del sistema
   * @param {string} audioPath - Ruta al archivo
   * @returns {Promise<Object>} Estimación
   */
  async estimateWithSystemConfig(audioPath) {
    const configService = require('./configService');
    const config = configService.getConfig();

    return this.estimateTranscriptionTime({
      audioPath,
      modelName: config.whisperModel || 'base',
      useGpu: config.useGpu !== false,
      gpuBackend: config.gpuBackend || 'cuda',
      beamSize: config.beamSize || 3
    });
  }
}

module.exports = new TranscriptionEstimator();
