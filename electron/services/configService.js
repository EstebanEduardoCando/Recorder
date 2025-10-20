const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class ConfigService {
  constructor() {
    this.configPath = null;
    this.defaultConfig = null;
    this.config = null;
    this.initialized = false;
  }

  /**
   * Initialize the config service (called after app is ready)
   */
  initialize() {
    if (this.initialized) return;

    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaultConfig = {
      recordingsPath: path.join(app.getPath('userData'), 'recordings'),
      whisperModel: 'base', // tiny, base, small, medium, large
      language: 'auto', // auto or specific language code
      exportFormat: 'txt', // txt, srt, vtt, json
      sampleRate: 44100,
      audioSource: '', // ID del dispositivo de audio seleccionado (vacío = predeterminado)
      theme: 'light',

      // Whisper Advanced Options
      useGpu: true,              // Usar aceleración GPU
      gpuBackend: 'cuda',        // 'default', 'cuda', 'vulkan'
      nThreads: 8,               // Número de threads CPU (0 = auto)
      beamSize: 3,               // Tamaño del beam search (1-10)
      bestOf: 3,                 // Número de candidatos (1-10)
      temperature: 0.0,          // Temperatura de sampling (0.0-1.0)
      entropyThold: 2.4,         // Umbral de entropía para calidad
      logprobThold: -1.0,        // Umbral de log-probabilidad
      noSpeechThold: 0.6,        // Umbral de detección de no-habla
      initialPrompt: '',         // Prompt inicial personalizado
      maxSegmentLength: 0,       // Longitud máxima de segmento (0 = auto)
      splitOnWord: true,         // Dividir en palabras vs tokens
      suppressBlank: true,       // Suprimir tokens en blanco
      detectLanguage: false      // Auto-detectar idioma
    };
    this.config = this.loadConfig();
    this.initialized = true;
  }

  /**
   * Ensure the service is initialized before use
   */
  ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Load configuration from disk, or create default if not exists
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(data);
        // Merge with defaults to ensure all keys exist
        return { ...this.defaultConfig, ...loadedConfig };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Return default config and save it
    this.saveConfig(this.defaultConfig);
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to disk
   */
  saveConfig(config) {
    try {
      const configToSave = config || this.config;
      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
      this.config = configToSave;

      // Ensure recordings directory exists
      if (configToSave.recordingsPath && !fs.existsSync(configToSave.recordingsPath)) {
        fs.mkdirSync(configToSave.recordingsPath, { recursive: true });
      }

      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  /**
   * Get all configuration
   */
  getConfig() {
    this.ensureInitialized();
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  get(key) {
    this.ensureInitialized();
    return this.config[key];
  }

  /**
   * Set a specific configuration value
   */
  set(key, value) {
    this.ensureInitialized();
    this.config[key] = value;
    return this.saveConfig();
  }

  /**
   * Update multiple configuration values
   */
  update(updates) {
    this.ensureInitialized();
    this.config = { ...this.config, ...updates };
    return this.saveConfig();
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.ensureInitialized();
    this.config = { ...this.defaultConfig };
    return this.saveConfig();
  }

  /**
   * Get recordings path (ensures it exists)
   */
  getRecordingsPath() {
    this.ensureInitialized();
    const recordingsPath = this.config.recordingsPath;
    if (!fs.existsSync(recordingsPath)) {
      fs.mkdirSync(recordingsPath, { recursive: true });
    }
    return recordingsPath;
  }
}

// Export singleton instance
module.exports = new ConfigService();
