/**
 * Test para el servicio AudioRecorder
 * Simula el entorno de Electron para probar el servicio
 */

// Simular el módulo electron/app
const path = require('path');
const os = require('os');

// Mock de Electron
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(os.tmpdir(), 'recorder-test');
    }
    return os.tmpdir();
  }
};

// Inyectar mock antes de requerir el servicio
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'electron') {
    return { app: mockApp };
  }
  return originalRequire.apply(this, arguments);
};

// Ahora importar el servicio
const AudioRecorder = require('../electron/services/audioRecorder');

console.log('=== TEST: Servicio AudioRecorder ===\n');

async function runTests() {
  try {
    // Test 1: Verificar estado inicial
    console.log('Test 1: Estado inicial');
    const initialStatus = AudioRecorder.getStatus();
    console.log('  Estado:', initialStatus);

    if (!initialStatus.isRecording && !initialStatus.isPaused) {
      console.log('  ✓ Estado inicial correcto\n');
    } else {
      console.log('  ✗ Estado inicial incorrecto\n');
      return;
    }

    // Test 2: Iniciar grabación
    console.log('Test 2: Iniciar grabación');
    console.log('  Iniciando grabación de 3 segundos...');

    const startResult = await AudioRecorder.startRecording({
      sampleRate: 16000,
      channels: 1,
      format: 'wav'
    });

    console.log('  Resultado:', startResult);

    if (startResult.success) {
      console.log('  ✓ Grabación iniciada correctamente');
      console.log('  Archivo de salida:', startResult.outputPath);
    } else {
      console.log('  ✗ Error al iniciar grabación');
      return;
    }

    // Test 3: Verificar estado durante grabación
    console.log('\nTest 3: Estado durante grabación');
    const recordingStatus = AudioRecorder.getStatus();
    console.log('  Estado:', recordingStatus);

    if (recordingStatus.isRecording) {
      console.log('  ✓ Estado correcto durante grabación\n');
    } else {
      console.log('  ✗ Estado incorrecto durante grabación\n');
    }

    // Esperar 3 segundos
    console.log('  ⏱️  Grabando durante 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Detener grabación
    console.log('\nTest 4: Detener grabación');
    const stopResult = await AudioRecorder.stopRecording();
    console.log('  Resultado:', stopResult);

    if (stopResult.success) {
      console.log('  ✓ Grabación detenida correctamente');
      console.log(`  Duración: ${stopResult.duration} segundos`);
      console.log(`  Tamaño: ${(stopResult.size / 1024).toFixed(2)} KB`);
    } else {
      console.log('  ✗ Error al detener grabación');
    }

    // Test 5: Verificar estado final
    console.log('\nTest 5: Estado final');
    const finalStatus = AudioRecorder.getStatus();
    console.log('  Estado:', finalStatus);

    if (!finalStatus.isRecording) {
      console.log('  ✓ Estado final correcto\n');
    } else {
      console.log('  ✗ Estado final incorrecto\n');
    }

    console.log('=== TODOS LOS TESTS COMPLETADOS ===');

  } catch (error) {
    console.error('\n✗ ERROR durante los tests:', error);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar tests
runTests().then(() => {
  console.log('\nTests finalizados. Presiona Ctrl+C para salir.');
  process.exit(0);
}).catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
