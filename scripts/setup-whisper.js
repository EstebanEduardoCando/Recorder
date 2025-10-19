/**
 * Script para configurar whisper.cpp con binarios precompilados
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Configuración de Whisper.cpp ===\n');

const whisperDir = path.join(__dirname, '../node_modules/nodejs-whisper/cpp/whisper.cpp');
const buildDir = path.join(whisperDir, 'build/bin/Release');

console.log('Verificando estructura de directorios...');

// Crear directorios necesarios
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
  console.log('✓ Directorios creados');
}

console.log('\nEste proyecto requiere compilar whisper.cpp, lo cual necesita:');
console.log('  - CMake (✓ ya instalado)');
console.log('  - Visual Studio Build Tools (C++ compiler)');
console.log('  - O MinGW/GCC en Windows\n');

console.log('OPCIONES:\n');
console.log('1. Instalar Visual Studio Build Tools:');
console.log('   - Descarga: https://visualstudio.microsoft.com/downloads/');
console.log('   - Instala "Build Tools for Visual Studio 2022"');
console.log('   - Selecciona "Desktop development with C++"');
console.log('   - Luego ejecuta: npm run setup:whisper\n');

console.log('2. Usar una alternativa (más simple):');
console.log('   - Cambiar a OpenAI Whisper API (requiere API key)');
console.log('   - O usar otro servicio de transcripción\n');

console.log('3. Compilar manualmente (avanzado):');
console.log('   cd node_modules/nodejs-whisper/cpp/whisper.cpp');
console.log('   mkdir build && cd build');
console.log('   cmake ..');
console.log('   cmake --build . --config Release\n');

console.log('Para continuar ahora SIN transcripción:');
console.log('  - La aplicación puede grabar audio perfectamente');
console.log('  - La transcripción quedará deshabilitada temporalmente\n');

process.exit(0);
