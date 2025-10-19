/**
 * Servicio de transcripción usando OpenAI Whisper API
 * Alternativa a nodejs-whisper para cuando no se puede compilar whisper.cpp
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const FormData = require('form-data');

class TranscriptionServiceOpenAI {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || null;
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    console.log('OpenAI API key configurada');
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('Se requiere una API key de OpenAI. Configúrala con setApiKey()');
    }

    return {
      success: true,
      message: 'Servicio de transcripción OpenAI inicializado',
      provider: 'OpenAI Whisper API'
    };
  }

  async transcribe(audioPath, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key de OpenAI no configurada');
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
        onProgress({ progress: 0, status: 'Preparando archivo...' });
      }

      // Leer el archivo
      const audioBuffer = await fs.readFile(audioPath);
      const fileName = path.basename(audioPath);

      if (onProgress) {
        onProgress({ progress: 20, status: 'Enviando a OpenAI...' });
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      if (language !== 'auto') {
        formData.append('language', language);
      }
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      if (onProgress) {
        onProgress({ progress: 50, status: 'Transcribiendo...' });
      }

      // Hacer request a OpenAI
      const result = await this.makeOpenAIRequest(formData);

      if (onProgress) {
        onProgress({ progress: 90, status: 'Procesando resultados...' });
      }

      // Procesar respuesta
      const transcriptionResult = this.parseOpenAIResponse(result);

      if (onProgress) {
        onProgress({ progress: 100, status: 'Transcripción completada' });
      }

      return {
        success: true,
        ...transcriptionResult
      };

    } catch (error) {
      console.error('Error en transcripción OpenAI:', error);
      throw new Error(`Error al transcribir: ${error.message}`);
    }
  }

  async makeOpenAIRequest(formData) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              reject(new Error('Error parseando respuesta de OpenAI'));
            }
          } else {
            reject(new Error(`OpenAI API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      formData.pipe(req);
    });
  }

  parseOpenAIResponse(response) {
    const segments = response.segments || [];

    const processedSegments = segments.map((segment, index) => ({
      id: index,
      start: segment.start || 0,
      end: segment.end || 0,
      text: (segment.text || '').trim()
    }));

    return {
      text: response.text || '',
      segments: processedSegments,
      language: response.language || 'es',
      duration: response.duration || 0
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
        provider: 'OpenAI Whisper API'
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
}

module.exports = new TranscriptionServiceOpenAI();
