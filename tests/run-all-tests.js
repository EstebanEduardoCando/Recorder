/**
 * Script maestro para ejecutar todos los tests
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Dispositivos de Audio',
    script: 'test-audio-devices.js',
    description: 'Verifica que FFmpeg puede detectar dispositivos de audio'
  },
  {
    name: 'Grabación de Audio',
    script: 'test-recording.js',
    description: 'Graba 5 segundos de audio y verifica el archivo'
  },
  {
    name: 'Servicio AudioRecorder',
    script: 'test-audiorecorder-service.js',
    description: 'Prueba el servicio completo de grabación'
  },
  {
    name: 'Servicio de Transcripción',
    script: 'test-transcription.js',
    description: 'Prueba el servicio de transcripción con Whisper',
    optional: true
  }
];

let currentTest = 0;
const results = [];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║       SUITE DE TESTS - APLICACIÓN RECORDER                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

function runTest(testIndex) {
  if (testIndex >= tests.length) {
    showResults();
    return;
  }

  const test = tests[testIndex];

  console.log('\n' + '─'.repeat(66));
  console.log(`TEST ${testIndex + 1}/${tests.length}: ${test.name}`);
  console.log(`Descripción: ${test.description}`);
  if (test.optional) {
    console.log('(Opcional - puede tardar varios minutos)');
  }
  console.log('─'.repeat(66) + '\n');

  const startTime = Date.now();
  const testProcess = spawn('node', [path.join(__dirname, test.script)], {
    stdio: 'inherit',
    shell: true
  });

  testProcess.on('close', (code) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passed = code === 0;

    results.push({
      name: test.name,
      passed,
      duration,
      optional: test.optional || false
    });

    console.log(`\n⏱️  Duración: ${duration}s`);

    if (passed) {
      console.log(`✅ ${test.name} - PASÓ`);
    } else {
      console.log(`❌ ${test.name} - FALLÓ (código: ${code})`);
    }

    // Continuar con el siguiente test
    runTest(testIndex + 1);
  });

  testProcess.on('error', (error) => {
    console.error(`\n❌ Error ejecutando test: ${error.message}`);
    results.push({
      name: test.name,
      passed: false,
      duration: 0,
      optional: test.optional || false
    });
    runTest(testIndex + 1);
  });
}

function showResults() {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN DE RESULTADOS                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  let optionalFailed = 0;

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASÓ' : 'FALLÓ';
    const optional = result.optional ? ' (Opcional)' : '';

    console.log(`${index + 1}. ${icon} ${result.name}${optional} - ${status} (${result.duration}s)`);

    if (result.passed) {
      passed++;
    } else {
      if (result.optional) {
        optionalFailed++;
      } else {
        failed++;
      }
    }
  });

  console.log('\n' + '─'.repeat(66));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Pasados: ${passed}`);
  console.log(`❌ Fallados: ${failed}`);
  if (optionalFailed > 0) {
    console.log(`⚠️  Opcionales fallados: ${optionalFailed}`);
  }
  console.log('─'.repeat(66) + '\n');

  if (failed === 0) {
    console.log('🎉 ¡TODOS LOS TESTS CRÍTICOS PASARON!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisa los errores arriba.\n');
    process.exit(1);
  }
}

// Iniciar la suite de tests
runTest(0);
