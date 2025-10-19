/**
 * Test para listar dispositivos de audio disponibles
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

console.log('=== TEST: Listar Dispositivos de Audio ===\n');
console.log('Ruta de FFmpeg:', ffmpegPath);
console.log('\nBuscando dispositivos de audio...\n');

// Ejecutar FFmpeg para listar dispositivos
const { spawn } = require('child_process');

const ffmpegProcess = spawn(ffmpegPath, [
  '-list_devices', 'true',
  '-f', 'dshow',
  '-i', 'dummy'
]);

let output = '';
let audioDevices = [];

ffmpegProcess.stderr.on('data', (data) => {
  const line = data.toString();
  output += line;

  // Detectar líneas de dispositivos de audio
  if (line.includes('DirectShow audio devices')) {
    console.log('✓ Dispositivos de audio encontrados:\n');
  }

  // Extraer nombres de dispositivos
  const deviceMatch = line.match(/\[dshow[^\]]*\]\s+"([^"]+)"/);
  if (deviceMatch && line.includes('Alternative name "@device_cm_')) {
    audioDevices.push(deviceMatch[1]);
  }
});

ffmpegProcess.on('close', (code) => {
  console.log('\n=== Resumen ===');
  console.log(`Código de salida: ${code}`);
  console.log(`\nDispositivos de audio detectados: ${audioDevices.length}`);

  if (audioDevices.length > 0) {
    console.log('\nLista de dispositivos:');
    audioDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. "${device}"`);
    });

    console.log('\n✓ TEST EXITOSO - Dispositivos encontrados');
    console.log(`\nDispositivo recomendado para usar: "${audioDevices[0]}"`);
  } else {
    console.log('\n✗ TEST FALLIDO - No se encontraron dispositivos de audio');
  }
});

ffmpegProcess.on('error', (error) => {
  console.error('\n✗ ERROR al ejecutar FFmpeg:', error);
});
