const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

class AudioRecorder {
  constructor() {
    this.ffmpegCommand = null;
    this.outputPath = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.recordingsDir = null;
  }

  getRecordingsDir() {
    if (!this.recordingsDir) {
      // Lazy initialization - obtener el path del servicio de configuración
      const configService = require('./configService');
      this.recordingsDir = configService.getRecordingsPath();
    }
    return this.recordingsDir;
  }

  async ensureRecordingsDir() {
    const recordingsDir = this.getRecordingsDir();
    try {
      await fs.access(recordingsDir);
    } catch {
      await fs.mkdir(recordingsDir, { recursive: true });
    }
  }

  async startRecording(config = {}) {
    if (this.isRecording) {
      throw new Error('Ya hay una grabación en progreso');
    }

    await this.ensureRecordingsDir();

    const {
      sampleRate = 16000,
      channels = 1,
      format = 'wav'
    } = config;

    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.${format}`;
    this.outputPath = path.join(this.getRecordingsDir(), filename);

    return new Promise((resolve, reject) => {
      try {
        // Usar FFmpeg directamente para grabar desde el micrófono
        // En Windows, usamos dshow (DirectShow)
        let inputDevice = 'dshow';
        let audioSource = 'audio=Micrófono (NVIDIA Broadcast)'; // Tu dispositivo de micrófono

        if (process.platform === 'darwin') {
          inputDevice = 'avfoundation';
          audioSource = ':0'; // Dispositivo de audio predeterminado en macOS
        } else if (process.platform === 'linux') {
          inputDevice = 'alsa';
          audioSource = 'default'; // Dispositivo ALSA predeterminado
        }

        this.ffmpegCommand = ffmpeg()
          .input(audioSource)
          .inputFormat(inputDevice)
          .audioCodec('pcm_s16le')
          .audioChannels(channels)
          .audioFrequency(sampleRate)
          .format(format)
          .on('start', (commandLine) => {
            console.log('FFmpeg iniciado:', commandLine);
            this.isRecording = true;
            this.startTime = Date.now();
            console.log('Estado de grabación:', { isRecording: this.isRecording, outputPath: this.outputPath });
            resolve({
              success: true,
              outputPath: this.outputPath,
              message: 'Grabación iniciada'
            });
          })
          .on('error', (err) => {
            console.error('Error en FFmpeg:', err);
            console.log('Estado al error:', { isRecording: this.isRecording });
            this.isRecording = false;
            reject(err);
          })
          .on('end', () => {
            console.log('Grabación finalizada naturalmente');
            this.isRecording = false;
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg stderr:', stderrLine);
          })
          .save(this.outputPath);

      } catch (error) {
        console.error('Error iniciando grabación:', error);
        this.isRecording = false;
        reject(error);
      }
    });
  }

  async stopRecording() {
    console.log('stopRecording llamado, estado actual:', {
      isRecording: this.isRecording,
      hasFfmpegCommand: !!this.ffmpegCommand
    });

    if (!this.isRecording) {
      throw new Error('No hay ninguna grabación activa');
    }

    return new Promise((resolve, reject) => {
      // Detener FFmpeg
      if (this.ffmpegCommand) {
        console.log('Enviando señal SIGINT a FFmpeg');

        const handleEnd = async () => {
          console.log('FFmpeg finalizó correctamente');
          const duration = this.startTime ? Date.now() - this.startTime : 0;
          let fileSize = 0;

          try {
            const stats = await fs.stat(this.outputPath);
            fileSize = stats.size;
            console.log('Archivo guardado:', { path: this.outputPath, size: fileSize, duration });
          } catch (error) {
            console.error('Error obteniendo información del archivo:', error);
          }

          const result = {
            success: true,
            outputPath: this.outputPath,
            duration: Math.floor(duration / 1000), // en segundos
            size: fileSize,
            message: 'Grabación detenida'
          };

          this.cleanup();
          resolve(result);
        };

        // Manejar tanto 'end' como 'error' porque fluent-ffmpeg lanza error en SIGINT
        this.ffmpegCommand.on('end', handleEnd);

        this.ffmpegCommand.on('error', async (err, stdout, stderr) => {
          // Si el error es por SIGINT (lo cual es esperado), tratarlo como éxito
          if (err.message && err.message.includes('SIGINT')) {
            console.log('FFmpeg detenido por SIGINT (esperado)');
            await handleEnd();
          } else {
            // Si es un error real, rechazar
            console.error('Error real en FFmpeg:', err);
            this.isRecording = false;
            this.cleanup();
            reject(err);
          }
        });

        // Enviar señal SIGINT para terminar gracefully
        this.ffmpegCommand.kill('SIGINT');
      }
    });
  }

  pauseRecording() {
    if (!this.isRecording || this.isPaused) {
      throw new Error('No se puede pausar la grabación');
    }

    // FFmpeg no soporta pausa nativa, se implementaría deteniendo y reanudando
    // Por simplicidad, marcamos como pausado pero no detenemos FFmpeg
    this.isPaused = true;

    return { success: true, message: 'Grabación pausada (continuará grabando)' };
  }

  resumeRecording() {
    if (!this.isRecording || !this.isPaused) {
      throw new Error('No se puede reanudar la grabación');
    }

    this.isPaused = false;

    return { success: true, message: 'Grabación reanudada' };
  }

  getStatus() {
    const duration = this.startTime ? Date.now() - this.startTime : 0;

    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: Math.floor(duration / 1000),
      outputPath: this.outputPath
    };
  }

  cleanup() {
    this.ffmpegCommand = null;
    this.outputPath = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
  }
}

module.exports = new AudioRecorder();
