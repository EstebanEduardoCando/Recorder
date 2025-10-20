const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
require('dotenv').config();

// Cargar servicios de forma diferida para evitar problemas con app.getPath()
let audioRecorder;
let configService;
let transcriptionService;
let transcriptionEstimator;

function initializeServices() {
  audioRecorder = require('./services/audioRecorder');
  configService = require('./services/configService');
  transcriptionEstimator = require('./services/transcriptionEstimator');

  // Seleccionar servicio de transcripción:
  // 1. OpenAI API (si hay API key)
  // 2. Whisper Local con @fugood/whisper.node (binarios precompilados)
  const useOpenAI = !!process.env.OPENAI_API_KEY;
  transcriptionService = useOpenAI
    ? require('./services/transcriptionServiceOpenAI')
    : require('./services/transcriptionServiceLocal'); // Usar whisper local con binarios precompilados

  console.log(`\n🎙️ Servicio de transcripción: ${useOpenAI ? 'OpenAI Whisper API' : 'Whisper Local (offline)'}`);
  if (useOpenAI) {
    console.log('✓ OpenAI API Key detectada');
  } else {
    console.log('✓ Usando @fugood/whisper.node (binarios precompilados)');
    console.log('✓ Transcripción 100% local y privada');
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  // En desarrollo, cargar desde Vite
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    //mainWindow.webContents.openDevTools();
  } else {
    // En producción, cargar el archivo HTML construido
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Suprimir errores de DevTools que no afectan la funcionalidad
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.executeJavaScript(`
      console.defaultError = console.error.bind(console);
      console.error = (...args) => {
        const message = args[0] || '';
        if (
          message.includes('Autofill.enable') ||
          message.includes('Autofill.setAddresses') ||
          message.includes('Failed to fetch')
        ) {
          return;
        }
        console.defaultError(...args);
      };
    `);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Inicializar servicios después de que app esté listo
  initializeServices();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers - System
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-recordings-path', () => {
  return configService.getRecordingsPath();
});

// IPC Handlers - Recording
ipcMain.handle('get-audio-devices', async () => {
  try {
    const devices = await audioRecorder.getAudioDevices();
    return { success: true, devices };
  } catch (error) {
    console.error('Error en get-audio-devices:', error);
    return { success: false, error: error.message, devices: [] };
  }
});

ipcMain.handle('start-recording', async (event, config) => {
  try {
    const result = await audioRecorder.startRecording(config);
    return result;
  } catch (error) {
    console.error('Error en start-recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  try {
    const result = await audioRecorder.stopRecording();
    return result;
  } catch (error) {
    console.error('Error en stop-recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pause-recording', async () => {
  try {
    const result = audioRecorder.pauseRecording();
    return result;
  } catch (error) {
    console.error('Error en pause-recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('resume-recording', async () => {
  try {
    const result = audioRecorder.resumeRecording();
    return result;
  } catch (error) {
    console.error('Error en resume-recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recording-status', () => {
  return audioRecorder.getStatus();
});

// IPC Handlers - Transcription
ipcMain.handle('initialize-whisper', async (event, modelName) => {
  try {
    const result = await transcriptionService.initialize(modelName);
    return result;
  } catch (error) {
    console.error('Error en initialize-whisper:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transcribe-audio', async (event, audioPath, options) => {
  try {
    // Configurar callback de progreso
    const onProgress = (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription-progress', data);
      }
    };

    const result = await transcriptionService.transcribe(audioPath, {
      ...options,
      onProgress
    });

    return result;
  } catch (error) {
    console.error('Error en transcribe-audio:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-transcription', async (event, transcription, outputPath) => {
  try {
    const result = await transcriptionService.saveTranscription(transcription, outputPath);
    return result;
  } catch (error) {
    console.error('Error en save-transcription:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-transcription-text', async (event, transcription, outputPath) => {
  try {
    const result = await transcriptionService.exportAsText(transcription, outputPath);
    return result;
  } catch (error) {
    console.error('Error en export-transcription-text:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-transcription-srt', async (event, transcription, outputPath) => {
  try {
    const result = await transcriptionService.exportAsSRT(transcription, outputPath);
    return result;
  } catch (error) {
    console.error('Error en export-transcription-srt:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-whisper-model', async (event, modelName) => {
  try {
    const result = await transcriptionService.downloadModel(modelName);
    return result;
  } catch (error) {
    console.error('Error en download-whisper-model:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers - Model Management
ipcMain.handle('list-whisper-models', async () => {
  try {
    const models = await transcriptionService.listModels();
    return { success: true, models };
  } catch (error) {
    console.error('Error en list-whisper-models:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-whisper-model', async (event, modelName) => {
  try {
    const result = await transcriptionService.deleteModel(modelName);
    return result;
  } catch (error) {
    console.error('Error en delete-whisper-model:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('force-download-whisper-model', async (event, modelName) => {
  try {
    const result = await transcriptionService.forceDownloadModel(modelName);
    return result;
  } catch (error) {
    console.error('Error en force-download-whisper-model:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers - Recording Management
ipcMain.handle('list-recordings', async () => {
  try {
    const recordings = await audioRecorder.listRecordings();
    return { success: true, recordings };
  } catch (error) {
    console.error('Error en list-recordings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-recording', async (event, oldPath, newName) => {
  try {
    const result = await audioRecorder.renameRecording(oldPath, newName);
    return result;
  } catch (error) {
    console.error('Error en rename-recording:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Estimate transcription time
ipcMain.handle('estimate-transcription-time', async (event, audioPath, options = {}) => {
  try {
    const estimation = await transcriptionEstimator.estimateTranscriptionTime({
      audioPath,
      ...options
    });
    return { success: true, estimation };
  } catch (error) {
    console.error('Error en estimate-transcription-time:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('estimate-with-system-config', async (event, audioPath) => {
  try {
    const estimation = await transcriptionEstimator.estimateWithSystemConfig(audioPath);
    return { success: true, estimation };
  } catch (error) {
    console.error('Error en estimate-with-system-config:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Open file dialog
ipcMain.handle('open-file-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      ...options
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePaths[0] };
  } catch (error) {
    console.error('Error en open-file-dialog:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Prompt for save name
ipcMain.handle('prompt-save-name', async (event, defaultName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [
        { name: 'Audio Files', extensions: ['wav'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Error en prompt-save-name:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers - Configuration
ipcMain.handle('get-config', () => {
  try {
    return { success: true, config: configService.getConfig() };
  } catch (error) {
    console.error('Error en get-config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-config', (_event, updates) => {
  try {
    const success = configService.update(updates);
    return { success, config: configService.getConfig() };
  } catch (error) {
    console.error('Error en update-config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-config', () => {
  try {
    const success = configService.reset();
    return { success, config: configService.getConfig() };
  } catch (error) {
    console.error('Error en reset-config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-directory', async (_event, defaultPath) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath || app.getPath('documents'),
      title: 'Seleccionar carpeta para grabaciones'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error en select-directory:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler - Open file in system
ipcMain.handle('open-file', async (_event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error en open-file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external', async (_event, url) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error en open-external:', error);
    return { success: false, error: error.message };
  }
});
