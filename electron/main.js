const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

const audioRecorder = require('./services/audioRecorder');

// Seleccionar servicio de transcripción:
// 1. OpenAI API (si hay API key)
// 2. Whisper Local con @fugood/whisper.node (binarios precompilados)
const useOpenAI = !!process.env.OPENAI_API_KEY;
const transcriptionService = useOpenAI
  ? require('./services/transcriptionServiceOpenAI')
  : require('./services/transcriptionServiceLocal'); // Usar whisper local con binarios precompilados

console.log(`\n🎙️ Servicio de transcripción: ${useOpenAI ? 'OpenAI Whisper API' : 'Whisper Local (offline)'}`);
if (useOpenAI) {
  console.log('✓ OpenAI API Key detectada');
} else {
  console.log('✓ Usando @fugood/whisper.node (binarios precompilados)');
  console.log('✓ Transcripción 100% local y privada');
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
    mainWindow.webContents.openDevTools();
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
  return path.join(app.getPath('userData'), 'recordings');
});

// IPC Handlers - Recording
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
