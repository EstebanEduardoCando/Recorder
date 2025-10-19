/**
 * Test para el servicio de transcripción
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

// Importar servicio
const transcriptionService = require('../electron/services/transcriptionService');

console.log('=== TEST: Servicio de Transcripción ===\n');

async function runTests() {
  try {
    // Test 1: Verificar configuración de nodejs-whisper
    console.log('Test 1: Verificar nodejs-whisper');

    const { nodewhisper } = require('nodejs-whisper');
    console.log('  ✓ nodejs-whisper importado correctamente');

    // Test 2: Verificar que Node.js está disponible
    console.log('\nTest 2: Verificar Node.js');
    const { execSync } = require('child_process');

    try {
      const nodePath = execSync('where node', { encoding: 'utf-8' }).trim();
      console.log('  Node.js encontrado en:', nodePath.split('\n')[0]);
      console.log('  ✓ Node.js disponible');
    } catch (error) {
      console.log('  ✗ Node.js no encontrado en PATH');
      console.log('  Error:', error.message);
    }

    // Test 3: Inicializar servicio
    console.log('\nTest 3: Inicializar servicio de transcripción');

    const initResult = await transcriptionService.initialize('base');
    console.log('  Resultado:', initResult);

    if (initResult.success) {
      console.log('  ✓ Servicio inicializado correctamente');
    } else {
      console.log('  ✗ Error al inicializar servicio');
      return;
    }

    // Test 4: Crear un archivo de audio de prueba
    console.log('\nTest 4: Preparar archivo de audio de prueba');

    // Buscar si hay archivos de grabación de pruebas anteriores
    const testRecordingsDir = path.join(__dirname, '../test-recordings');
    let testAudioFile = null;

    if (fs.existsSync(testRecordingsDir)) {
      const files = fs.readdirSync(testRecordingsDir).filter(f => f.endsWith('.wav'));
      if (files.length > 0) {
        testAudioFile = path.join(testRecordingsDir, files[0]);
        console.log('  Usando archivo existente:', testAudioFile);
        console.log('  ✓ Archivo de prueba encontrado');
      }
    }

    if (!testAudioFile) {
      console.log('  ⚠️  No hay archivos de prueba disponibles');
      console.log('  Ejecuta primero: npm run test:recording');
      console.log('\n  Saltando test de transcripción...');
      return;
    }

    // Test 5: Probar transcripción
    console.log('\nTest 5: Transcribir audio de prueba');
    console.log('  Esto puede tardar varios minutos si es la primera vez...');
    console.log('  (El modelo Whisper se descargará automáticamente)\n');

    const transcribeResult = await transcriptionService.transcribe(testAudioFile, {
      language: 'es',
      onProgress: (progress) => {
        console.log(`  Progreso: ${progress.progress}% - ${progress.status}`);
      }
    });

    console.log('\n  Resultado:', {
      success: transcribeResult.success,
      textLength: transcribeResult.text?.length || 0,
      segmentsCount: transcribeResult.segments?.length || 0,
      language: transcribeResult.language
    });

    if (transcribeResult.success) {
      console.log('  ✓ Transcripción exitosa');
      console.log('\n  Texto transcrito:');
      console.log('  "' + transcribeResult.text + '"');
    } else {
      console.log('  ✗ Error en transcripción');
      console.log('  Error:', transcribeResult.error);
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
