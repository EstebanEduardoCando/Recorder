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
        const { stdout, stderr } = await execPromise(`"${ffmpegPath}" -list_devices true -f dshow -i dummy`, {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024
        }).catch(err => {
          // FFmpeg retorna exit code 1 al listar dispositivos, pero stdout/stderr contienen la info
          return { stdout: err.stdout || '', stderr: err.stderr || '' };
        });

        // La salida de FFmpeg con -list_devices va a stderr, no stdout
        const output = stderr || stdout;
        console.log('FFmpeg output para listar dispositivos (primeras 500 chars):', output.substring(0, 500));

        // Parsear la salida de FFmpeg
        const lines = output.split('\n');
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
              console.log(`  → Dispositivo detectado: "${deviceName}" (${isOutput ? 'system' : 'microphone'})`);
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

      console.log(`✓ Detectados ${devices.length} dispositivos de audio:`, devices.map(d => `${d.name} (${d.type})`));
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
      sampleRate = 44100,
      channels = 2,
      format = 'wav',
      audioSource = null, // ID del dispositivo de audio seleccionado
      bitDepth = 16,
      bitrate = 192,
      // Audio filters
      enableAudioFilters = true,
      enableNoiseReduction = true,
      enableNormalization = true,
      enableCompression = true,
      enableHighPassFilter = true,
      highPassFrequency = 80
    } = config;

    // Generar nombre de archivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.${format}`;
    this.outputPath = path.join(this.getRecordingsDir(), filename);

    return new Promise(async (resolve, reject) => {
      try {
        let inputDevice, audioInput;

        // Configurar dispositivo según la plataforma y la fuente seleccionada
        let isMixingMode = false;
        let microphoneInput = null;
        let systemInput = null;

        if (process.platform === 'win32') {
          inputDevice = 'dshow';

          if (audioSource === 'both') {
            // Modo mezcla: necesitamos identificar micrófono y sistema
            isMixingMode = true;

            // Obtener dispositivos disponibles
            const devices = await this.getAudioDevices();
            const microphones = devices.filter(d => d.type === 'microphone' && d.id !== 'both');
            const systemDevices = devices.filter(d => d.type === 'system');

            if (microphones.length > 0 && systemDevices.length > 0) {
              microphoneInput = microphones[0].id;
              systemInput = systemDevices[0].id;
              console.log('Mezcla de audio configurada:', { microphoneInput, systemInput });
            } else {
              console.warn('No se encontraron dispositivos para mezcla. Usando solo micrófono.');
              // Si no hay dispositivos del sistema, usar solo el micrófono
              const defaultMic = microphones.length > 0 ? microphones[0] : devices.find(d => d.type === 'microphone' && d.id !== 'both');
              if (defaultMic) {
                audioInput = `audio=${defaultMic.id}`;
                console.log('Usando micrófono:', defaultMic.name);
              } else {
                throw new Error('No se encontró ningún micrófono. Verifica que tengas un micrófono conectado.');
              }
              isMixingMode = false;
            }
          } else if (audioSource && audioSource !== '' && audioSource !== 'both') {
            // Usar el dispositivo seleccionado específico
            audioInput = `audio=${audioSource}`;
            console.log('Usando dispositivo seleccionado:', audioSource);
          } else {
            // Sin fuente especificada o vacía: obtener primer micrófono disponible
            console.log('Audio source vacío o no especificado, buscando micrófono predeterminado...');
            const devices = await this.getAudioDevices();
            console.log('Dispositivos encontrados:', devices.length);
            console.log('Dispositivos tipo micrófono:', devices.filter(d => d.type === 'microphone'));

            const defaultMic = devices.find(d => d.type === 'microphone' && d.id !== 'both');
            if (defaultMic) {
              audioInput = `audio=${defaultMic.id}`;
              console.log('✓ Usando micrófono predeterminado:', defaultMic.name);
            } else {
              console.error('❌ No se encontró ningún micrófono. Dispositivos disponibles:', devices);
              throw new Error('No se encontró ningún micrófono disponible. Verifica que tengas un micrófono conectado y habilitado en Windows.');
            }
          }
        } else if (process.platform === 'darwin') {
          inputDevice = 'avfoundation';
          audioInput = audioSource || ':0'; // Dispositivo seleccionado o predeterminado
        } else if (process.platform === 'linux') {
          inputDevice = 'alsa';
          audioInput = audioSource || 'default'; // Dispositivo seleccionado o predeterminado
        }

        // Construir cadena de filtros de audio para mejorar calidad
        const audioFilters = [];

        if (enableAudioFilters) {
          // 1. Filtro pasa-altos (elimina ruidos graves como ventiladores, tráfico)
          if (enableHighPassFilter) {
            audioFilters.push(`highpass=f=${highPassFrequency}`);
          }

          // 2. Reducción de ruido de fondo (afftdn = FFT Denoiser)
          if (enableNoiseReduction) {
            audioFilters.push('afftdn=nf=-25:tn=1');
          }

          // 3. Normalización de volumen (loudnorm para reuniones con diferentes niveles)
          if (enableNormalization) {
            audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
          }

          // 4. Compresión dinámica (hace voces bajas más audibles sin distorsión)
          if (enableCompression) {
            audioFilters.push('acompressor=threshold=0.089:ratio=4:attack=200:release=1000:makeup=2');
          }
        }

        // Determinar codec según el formato
        let audioCodec;
        if (format === 'flac') {
          audioCodec = 'flac';
        } else if (format === 'mp3') {
          audioCodec = 'libmp3lame';
        } else if (format === 'wav') {
          audioCodec = bitDepth === 24 ? 'pcm_s24le' : 'pcm_s16le';
        } else {
          audioCodec = 'pcm_s16le'; // default
        }

        // Configurar FFmpeg según el modo
        if (isMixingMode && microphoneInput && systemInput) {
          // Modo mezcla: capturar ambas fuentes y mezclarlas
          this.ffmpegCommand = ffmpeg()
            .input(`audio=${microphoneInput}`)
            .inputFormat(inputDevice)
            .input(`audio=${systemInput}`)
            .inputFormat(inputDevice)
            .audioCodec(audioCodec)
            .audioChannels(channels)
            .audioFrequency(sampleRate);

          // Construir cadena de filtros compleja correctamente
          let filterChain = '[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2';

          // Si hay filtros de audio, aplicarlos después de la mezcla
          if (audioFilters.length > 0) {
            filterChain += '[outa];[outa]' + audioFilters.join(',');
          }

          this.ffmpegCommand.complexFilter(filterChain);
        } else {
          // Modo normal: una sola fuente
          this.ffmpegCommand = ffmpeg()
            .input(audioInput)
            .inputFormat(inputDevice)
            .audioCodec(audioCodec)
            .audioChannels(channels)
            .audioFrequency(sampleRate);

          // Aplicar filtros si hay alguno
          if (audioFilters.length > 0) {
            this.ffmpegCommand.audioFilters(audioFilters.join(','));
          }
        }

        // Configurar bitrate para formatos comprimidos
        if (format === 'mp3' || format === 'flac') {
          this.ffmpegCommand.audioBitrate(`${bitrate}k`);
        }

        this.ffmpegCommand.format(format)
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

  /**
   * Renombra una grabación
   * @param {string} oldPath - Ruta del archivo actual
   * @param {string} newName - Nuevo nombre (sin extensión)
   * @returns {Promise<Object>} Resultado con la nueva ruta
   */
  async renameRecording(oldPath, newName) {
    try {
      // Verificar que el archivo existe
      await fs.access(oldPath);

      // Obtener la extensión del archivo actual
      const ext = path.extname(oldPath);

      // Sanitizar el nombre (remover caracteres no válidos)
      const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '_').trim();

      if (!sanitizedName) {
        throw new Error('El nombre no puede estar vacío');
      }

      // Crear nueva ruta en el mismo directorio
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, `${sanitizedName}${ext}`);

      // Verificar que no exista un archivo con el nuevo nombre
      try {
        await fs.access(newPath);
        throw new Error('Ya existe un archivo con ese nombre');
      } catch (error) {
        // Si el archivo no existe (ENOENT), continuamos
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Renombrar el archivo
      await fs.rename(oldPath, newPath);

      console.log(`✓ Archivo renombrado: ${path.basename(oldPath)} → ${path.basename(newPath)}`);

      return {
        success: true,
        oldPath,
        newPath,
        message: 'Archivo renombrado exitosamente'
      };
    } catch (error) {
      throw new Error(`No se pudo renombrar el archivo: ${error.message}`);
    }
  }

  /**
   * Lista todas las grabaciones en el directorio
   * @returns {Promise<Array>} Lista de grabaciones con metadata
   */
  async listRecordings() {
    try {
      await this.ensureRecordingsDir();
      const recordingsDir = this.getRecordingsDir();

      const files = await fs.readdir(recordingsDir);
      const audioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];

      const recordings = [];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (audioExtensions.includes(ext)) {
          const filePath = path.join(recordingsDir, file);

          try {
            const stats = await fs.stat(filePath);

            recordings.push({
              name: file,
              path: filePath,
              size: stats.size,
              sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
              created: stats.birthtime,
              modified: stats.mtime,
              extension: ext.substring(1)
            });
          } catch (error) {
            console.error(`Error obteniendo info de ${file}:`, error);
          }
        }
      }

      // Ordenar por fecha de modificación (más reciente primero)
      recordings.sort((a, b) => b.modified - a.modified);

      return recordings;
    } catch (error) {
      throw new Error(`No se pudo listar las grabaciones: ${error.message}`);
    }
  }
}

module.exports = new AudioRecorder();
