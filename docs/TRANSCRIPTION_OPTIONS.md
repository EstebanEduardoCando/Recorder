# Opciones de Transcripción

Este documento explica las diferentes opciones para habilitar la transcripción en la aplicación Recorder.

## Opción 1: Whisper Local (nodejs-whisper) - RECOMENDADO

✅ **Ventajas:**
- 100% privado - ningún dato sale de tu computadora
- Gratis - sin costos recurrentes
- Funciona offline
- Soporte para múltiples idiomas

❌ **Desventajas:**
- Requiere compilar C++ (Visual Studio Build Tools)
- Descarga inicial del modelo (~142MB para 'base')
- Más lento en computadoras antiguas

### Pasos de Instalación:

#### Windows:

1. **Instalar Visual Studio Build Tools 2022:**
   - Descarga: https://visualstudio.microsoft.com/downloads/
   - Instala "Build Tools for Visual Studio 2022"
   - Selecciona "Desktop development with C++"
   - Tamaño: ~7GB
   - Tiempo: 20-30 minutos

2. **Reiniciar la terminal/VSCode**

3. **Compilar whisper.cpp:**
   ```bash
   cd node_modules/nodejs-whisper/cpp/whisper.cpp
   mkdir build
   cd build
   cmake ..
   cmake --build . --config Release
   ```

4. **Verificar:**
   ```bash
   npm run test:transcription
   ```

#### macOS:

```bash
# Instalar herramientas de desarrollo
xcode-select --install

# Compilar whisper.cpp
cd node_modules/nodejs-whisper/cpp/whisper.cpp
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

#### Linux:

```bash
# Instalar dependencias
sudo apt-get install build-essential cmake

# Compilar whisper.cpp
cd node_modules/nodejs-whisper/cpp/whisper.cpp
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

---

## Opción 2: OpenAI Whisper API - MÁS FÁCIL

✅ **Ventajas:**
- Sin compilación necesaria
- Funciona inmediatamente
- Más rápido y preciso
- Sin requisitos de hardware

❌ **Desventajas:**
- Requiere API key de OpenAI
- Costo: ~$0.006 USD por minuto de audio
- Requiere internet
- Los archivos se envían a OpenAI

### Pasos de Instalación:

1. **Obtener API Key:**
   - Ve a: https://platform.openai.com/api-keys
   - Crea una cuenta si no tienes
   - Genera una nueva API key
   - Copia la key (empieza con `sk-...`)

2. **Instalar dependencia:**
   ```bash
   npm install form-data
   ```

3. **Configurar la aplicación:**

   Edita `electron/main.js` y cambia la línea:
   ```javascript
   const transcriptionService = require('./services/transcriptionService');
   ```

   Por:
   ```javascript
   const transcriptionService = require('./services/transcriptionServiceOpenAI');

   // Configurar API key
   transcriptionService.setApiKey('tu-api-key-aqui');
   // O usar variable de entorno:
   // transcriptionService.setApiKey(process.env.OPENAI_API_KEY);
   ```

4. **Probar:**
   ```bash
   npm run dev
   ```

### Usar Variable de Entorno (Más Seguro):

1. Crea un archivo `.env` en la raíz del proyecto:
   ```
   OPENAI_API_KEY=sk-tu-api-key-aqui
   ```

2. Instala dotenv:
   ```bash
   npm install dotenv
   ```

3. En `electron/main.js`, al inicio:
   ```javascript
   require('dotenv').config();
   const transcriptionService = require('./services/transcriptionServiceOpenAI');
   ```

---

## Opción 3: Usar Servicio Externo (Manual)

Si prefieres no configurar ninguna de las opciones anteriores:

1. **Graba el audio** con la aplicación (esto funciona perfectamente)

2. **Encuentra el archivo** en:
   - Windows: `C:\Users\<TU_USUARIO>\AppData\Roaming\recorder\recordings\`
   - macOS: `~/Library/Application Support/recorder/recordings/`
   - Linux: `~/.config/recorder/recordings/`

3. **Transcribe con servicios online:**
   - [OpenAI Whisper Playground](https://platform.openai.com/playground)
   - [Happy Scribe](https://www.happyscribe.com/)
   - [Otter.ai](https://otter.ai/)
   - [Trint](https://trint.com/)

---

## Comparación Rápida

| Característica | nodejs-whisper (Local) | OpenAI API | Manual |
|---|---|---|---|
| **Privacidad** | ✅ Total | ❌ Se envía a OpenAI | ⚠️ Depende del servicio |
| **Costo** | ✅ Gratis | ⚠️ ~$0.006/min | ⚠️ Varía |
| **Offline** | ✅ Sí | ❌ No | ❌ No |
| **Setup** | ❌ Complejo | ✅ Fácil | ✅ Muy fácil |
| **Velocidad** | ⚠️ Media | ✅ Rápida | ⚠️ Manual |
| **Precisión** | ✅ Buena | ✅ Excelente | ✅ Varía |

---

## Recomendación

- **Para uso personal/privado:** Opción 1 (nodejs-whisper local)
- **Para pruebas rápidas:** Opción 2 (OpenAI API)
- **Para uso ocasional:** Opción 3 (Manual)

---

## Verificar que la Transcripción Funciona

Después de configurar cualquier opción:

```bash
# Ejecutar test de transcripción
npm run test:transcription

# O ejecutar la aplicación completa
npm run dev
```

Graba algo, detén la grabación y la transcripción debería iniciarse automáticamente.
