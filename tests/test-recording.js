/**
 * Test para probar la grabación de audio
 * Graba 5 segundos de audio y verifica que el archivo se cree correctamente
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

console.log('=== TEST: Grabación de Audio ===\n');

// Configuración
const DEVICE_NAME = 'Micrófono (NVIDIA Broadcast)'; // Cambiar si es necesario
const DURATION = 5; // segundos
const OUTPUT_DIR = path.join(__dirname, '../test-recordings');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `test-recording-${Date.now()}.wav`);

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✓ Directorio de pruebas creado:', OUTPUT_DIR);
}

console.log('Configuración:');
console.log(`  Dispositivo: "${DEVICE_NAME}"`);
console.log(`  Duración: ${DURATION} segundos`);
console.log(`  Archivo de salida: ${OUTPUT_FILE}`);
console.log('\nIniciando grabación...\n');

let startTime = Date.now();
let ffmpegCommand;

try {
  ffmpegCommand = ffmpeg()
    .input(`audio=${DEVICE_NAME}`)
    .inputFormat('dshow')
    .audioCodec('pcm_s16le')
    .audioChannels(1)
    .audioFrequency(16000)
    .format('wav')
    .duration(DURATION) // Limitar a 5 segundos
    .on('start', (commandLine) => {
      console.log('✓ FFmpeg iniciado');
      console.log('  Comando:', commandLine);
      console.log(`\n⏱️  Grabando durante ${DURATION} segundos...`);
      console.log('  (Habla cerca del micrófono)\n');
    })
    .on('progress', (progress) => {
      if (progress.timemark) {
        process.stdout.write(`\r  Progreso: ${progress.timemark}`);
      }
    })
    .on('error', (err, stdout, stderr) => {
      console.error('\n\n✗ ERROR en FFmpeg:', err.message);
      console.error('\nDetalles stderr:', stderr);
      process.exit(1);
    })
    .on('end', () => {
      const duration = Date.now() - startTime;
      console.log('\n\n✓ Grabación finalizada');

      // Verificar que el archivo existe
      if (fs.existsSync(OUTPUT_FILE)) {
        const stats = fs.statSync(OUTPUT_FILE);
        console.log('\n=== Resultado ===');
        console.log(`  Archivo creado: ${OUTPUT_FILE}`);
        console.log(`  Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  Duración real: ${(duration / 1000).toFixed(2)} segundos`);

        if (stats.size > 0) {
          console.log('\n✓ TEST EXITOSO - Archivo de audio creado correctamente');
        } else {
          console.log('\n✗ TEST FALLIDO - El archivo está vacío');
        }
      } else {
        console.log('\n✗ TEST FALLIDO - El archivo no se creó');
      }
    })
    .save(OUTPUT_FILE);

} catch (error) {
  console.error('\n✗ ERROR al iniciar grabación:', error);
  process.exit(1);
}

// Timeout de seguridad
setTimeout(() => {
  console.log('\n\n⚠️  Timeout alcanzado, deteniendo grabación...');
  if (ffmpegCommand) {
    ffmpegCommand.kill('SIGINT');
  }
}, (DURATION + 2) * 1000);
