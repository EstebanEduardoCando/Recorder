const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);
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

  /**
   * Detecta los dispositivos de audio disponibles en el sistema
   * @returns {Promise<Array>} Lista de dispositivos de audio con su tipo (input/output)
   */
  async getAudioDevices() {
    try {
      const devices = [];

      if (process.platform === 'win32') {
        // En Windows, usar FFmpeg con DirectShow para listar dispositivos
        const { stdout } = await execPromise(`"${ffmpegPath}" -list_devices true -f dshow -i dummy`, {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024
        }).catch(err => {
          // FFmpeg retorna exit code 1 al listar dispositivos, pero stdout contiene la info
          return { stdout: err.stdout || '' };
        });

        // Parsear la salida de FFmpeg
        const lines = stdout.split('\n');
        let currentType = null;

        for (const line of lines) {
          if (line.includes('DirectShow video devices')) {
            currentType = 'video';
          } else if (line.includes('DirectShow audio devices')) {
            currentType = 'audio';
          } else if (currentType === 'audio' && line.includes('"')) {
            // Extraer el nombre del dispositivo entre comillas
            const match = line.match(/"([^"]+)"/);
            if (match) {
              const deviceName = match[1];
              // Detectar si es un dispositivo de entrada o salida
              const isOutput = deviceName.toLowerCase().includes('stereo mix') ||
                              deviceName.toLowerCase().includes('mezcla estéreo') ||
                              deviceName.toLowerCase().includes('what u hear') ||
                              deviceName.toLowerCase().includes('wave out') ||
                              deviceName.toLowerCase().includes('loopback');

              devices.push({
                id: deviceName,
                name: deviceName,
                type: isOutput ? 'system' : 'microphone',
                platform: 'win32'
              });
            }
          }
        }
      } else if (process.platform === 'darwin') {
        // En macOS, usar FFmpeg con AVFoundation
        const { stdout } = await execPromise(`"${ffmpegPath}" -f avfoundation -list_devices true -i ""`, {
          encoding: 'utf8'
        }).catch(err => {
          return { stdout: err.stdout || '' };
        });

        const lines = stdout.split('\n');
        let audioDeviceIndex = 0;

        for (const line of lines) {
          if (line.includes('AVFoundation audio devices')) {
            continue;
          }
          const match = line.match(/\[AVFoundation.*?\] \[(\d+)\] (.+)/);
          if (match) {
            const deviceName = match[2];
            const isOutput = deviceName.toLowerCase().includes('blackhole') ||
                            deviceName.toLowerCase().includes('loopback');

            devices.push({
              id: `:${audioDeviceIndex}`,
              name: deviceName,
              type: isOutput ? 'system' : 'microphone',
              platform: 'darwin'
            });
            audioDeviceIndex++;
          }
        }
      } else if (process.platform === 'linux') {
        // En Linux, usar arecord para listar dispositivos
        try {
          const { stdout } = await execPromise('arecord -L');
          const lines = stdout.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith(' ')) {
              devices.push({
                id: trimmed,
                name: trimmed,
                type: trimmed.includes('loopback') ? 'system' : 'microphone',
                platform: 'linux'
              });
            }
          }
        } catch (error) {
          console.error('Error listando dispositivos en Linux:', error);
        }
      }

      // Agregar opciones especiales
      devices.unshift({
        id: 'both',
        name: 'Micrófono + Audio del Sistema (Mezclado)',
        type: 'both',
        platform: process.platform
      });

      return devices;
    } catch (error) {
      console.error('Error detectando dispositivos de audio:', error);
      return [];
    }
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
      format = 'wav',
      audioSource = null // ID del dispositivo de audio seleccionado
    } = config;

    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.${format}`;
    this.outputPath = path.join(this.getRecordingsDir(), filename);

    return new Promise((resolve, reject) => {
      try {
        let inputDevice, audioInput;

        // Configurar dispositivo según la plataforma y la fuente seleccionada
        if (process.platform === 'win32') {
          inputDevice = 'dshow';

          if (audioSource && audioSource !== 'both') {
            // Usar el dispositivo seleccionado
            audioInput = `audio=${audioSource}`;
          } else if (audioSource === 'both') {
            // TODO: Implementar mezcla de micrófono + sistema (requiere filtros complejos)
            audioInput = 'audio=Micrófono (NVIDIA Broadcast)';
            console.warn('Mezcla de audio no implementada aún, usando micrófono');
          } else {
            // Dispositivo predeterminado
            audioInput = 'audio=Micrófono (NVIDIA Broadcast)';
          }
        } else if (process.platform === 'darwin') {
          inputDevice = 'avfoundation';
          audioInput = audioSource || ':0'; // Dispositivo seleccionado o predeterminado
        } else if (process.platform === 'linux') {
          inputDevice = 'alsa';
          audioInput = audioSource || 'default'; // Dispositivo seleccionado o predeterminado
        }

        this.ffmpegCommand = ffmpeg()
          .input(audioInput)
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
