/**
 * Test específico para transcripción local con @fugood/whisper.node
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Mock de Electron
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(os.tmpdir(), 'recorder-test');
    }
    return os.tmpdir();
  }
};

// Inyectar mock
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'electron') {
    return { app: mockApp };
  }
  return originalRequire.apply(this, arguments);
};

console.log('=== TEST: Transcripción Local con @fugood/whisper.node ===\n');

async function runTests() {
  try {
    // Test 1: Verificar que @fugood/whisper.node está instalado
    console.log('Test 1: Verificar instalación de @fugood/whisper.node');

    try {
      const { initWhisper } = require('@fugood/whisper.node');
      console.log('  ✓ @fugood/whisper.node importado correctamente');
      console.log('  Tipo de initWhisper:', typeof initWhisper);
    } catch (error) {
      console.log('  ✗ Error importando @fugood/whisper.node:', error.message);
      return;
    }

    // Test 2: Importar el servicio
    console.log('\nTest 2: Importar servicio de transcripción local');

    const transcriptionService = require('../electron/services/transcriptionServiceLocal');
    console.log('  ✓ Servicio importado');
    console.log('  Directorio de modelos:', transcriptionService.modelsDir);

    // Test 3: Descargar modelo
    console.log('\nTest 3: Verificar/Descargar modelo base');
    console.log('  Esto puede tardar varios minutos si es la primera vez...\n');

    try {
      const modelPath = await transcriptionService.downloadModel('base');
      console.log('\n  ✓ Modelo disponible en:', modelPath);

      // Verificar tamaño del archivo
      const stats = fs.statSync(modelPath);
      console.log('  Tamaño:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    } catch (error) {
      console.log('  ✗ Error descargando modelo:', error.message);
      return;
    }

    // Test 4: Inicializar Whisper
    console.log('\nTest 4: Inicializar Whisper');

    try {
      const initResult = await transcriptionService.initialize('base');
      console.log('  Resultado:', initResult);

      if (initResult.success) {
        console.log('  ✓ Whisper inicializado correctamente');
        console.log('  Modelo:', initResult.modelPath);
      } else {
        console.log('  ✗ Error al inicializar');
        return;
      }
    } catch (error) {
      console.log('  ✗ Error inicializando:', error.message);
      console.log('  Stack:', error.stack);
      return;
    }

    // Test 5: Buscar archivo de audio para transcribir
    console.log('\nTest 5: Buscar archivo de audio de prueba');

    const testRecordingsDir = path.join(__dirname, '../test-recordings');
    let testAudioFile = null;

    if (fs.existsSync(testRecordingsDir)) {
      const files = fs.readdirSync(testRecordingsDir).filter(f => f.endsWith('.wav'));
      if (files.length > 0) {
        testAudioFile = path.join(testRecordingsDir, files[0]);
        console.log('  ✓ Archivo encontrado:', testAudioFile);

        const stats = fs.statSync(testAudioFile);
        console.log('  Tamaño:', (stats.size / 1024).toFixed(2), 'KB');
      }
    }

    if (!testAudioFile) {
      console.log('  ⚠️  No hay archivos de prueba');
      console.log('  Ejecuta primero: npm run test:recording');
      console.log('\n  Saltando test de transcripción...');
      return;
    }

    // Test 6: Transcribir
    console.log('\nTest 6: Transcribir archivo de audio');
    console.log('  Esto puede tardar 10-30 segundos...\n');

    try {
      const result = await transcriptionService.transcribe(testAudioFile, {
        language: 'es',
        onProgress: (progress) => {
          console.log(`  ${progress.progress}% - ${progress.status}`);
        }
      });

      console.log('\n  Resultado:');
      console.log('    Success:', result.success);
      console.log('    Texto:', result.text.substring(0, 100) + '...');
      console.log('    Segmentos:', result.segments.length);
      console.log('    Idioma:', result.language);
      console.log('    Duración:', result.duration, 'segundos');

      if (result.success) {
        console.log('\n  ✓ Transcripción exitosa!');
        console.log('\n  Texto completo:');
        console.log('  "' + result.text + '"');
      }

    } catch (error) {
      console.log('\n  ✗ Error en transcripción:', error.message);
      console.log('  Stack:', error.stack);
    }

    console.log('\n=== TESTS COMPLETADOS ===');

  } catch (error) {
    console.error('\n✗ ERROR durante los tests:', error);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar tests
runTests().then(() => {
  console.log('\nTests finalizados.');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
