# Recorder

Aplicación de escritorio para grabar y transcribir reuniones de forma local y privada usando Whisper AI.

## Características

- 🎙️ Grabación de audio del micrófono
- ⏸️ Pausar y reanudar grabaciones
- 📝 Transcripción automática local usando Whisper AI
- 🎵 **Reproductor de audio integrado** con controles completos
- ⚙️ **Panel de configuración** para personalizar la aplicación
- 📁 **Directorio de grabaciones configurable**
- 🤖 **Selección de modelo Whisper** (tiny, base, small, medium, large)
- 🌍 **Configuración de idioma** para transcripción
- ⏱️ Timestamps para cada segmento de la transcripción
- 📄 Exportar transcripciones a TXT, SRT, VTT y JSON
- 💾 Almacenamiento completamente offline
- 🔒 Privacidad total - ningún dato sale de tu equipo

## Requisitos del Sistema

### Software Necesario

1. **Node.js 18 o superior** ✅ REQUERIDO
   - Descargar desde [nodejs.org](https://nodejs.org/)

**Eso es todo.** No necesitas instalar CMake, compiladores de C++, ni Visual Studio Build Tools. La aplicación usa `@fugood/whisper.node` con binarios precompilados.

## Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd Recorder

# Instalar dependencias (esto puede tardar varios minutos)
npm install
```

**Nota:** La primera vez que transcribas, Whisper descargará automáticamente el modelo (~142MB para el modelo "base"). @fugood/whisper.node también convertirá automáticamente el audio al formato requerido (WAV 16kHz).

## Desarrollo

```bash
# Iniciar la aplicación en modo desarrollo
npm run dev

# Verificar tipos TypeScript
npm run type-check

# Ejecutar linter
npm run lint
```

## Uso

### 1. Configuración Inicial (Recomendado)
   - Haz clic en el botón de configuración (⚙️) en la esquina superior derecha
   - **Carpeta de grabaciones:** Selecciona dónde quieres guardar tus grabaciones
   - **Modelo de Whisper:** Elige el modelo según tu balance velocidad/precisión:
     - `tiny`: ~75MB - Más rápido, menor precisión
     - `base`: ~142MB - Buen balance (predeterminado)
     - `small`: ~466MB - Mejor precisión
     - `medium`: ~1.5GB - Alta precisión
     - `large`: ~2.9GB - Máxima precisión
   - **Idioma:** Selecciona el idioma de transcripción o déjalo en "auto"
   - **Formato de exportación:** Elige entre TXT, SRT, VTT o JSON
   - Haz clic en "💾 Guardar cambios"

### 2. Grabar una Reunión
   - Haz clic en "⏺ Grabar"
   - Habla al micrófono
   - Usa "⏸ Pausar" si necesitas interrumpir temporalmente
   - Haz clic en "⏹ Detener" cuando termines

### 3. Reproducir la Grabación
   - Aparecerá automáticamente un reproductor de audio después de detener
   - Controles disponibles:
     - ▶️/⏸️ Reproducir/Pausar
     - Barra de progreso para navegar
     - Control de volumen
     - 📂 Abrir en reproductor externo

### 4. Transcripción Automática
   - La transcripción comenzará automáticamente al detener la grabación
   - Espera mientras Whisper procesa el audio
   - Primera vez: descargará el modelo (~142MB para "base")
   - Verás el progreso en la barra de estado

### 5. Exportar Transcripción
   - Haz clic en "Exportar TXT" para obtener el texto plano
   - Haz clic en "Exportar SRT" para obtener subtítulos con timestamps
   - El formato exportado depende de tu configuración

## Archivos de Salida

Por defecto, los archivos se guardan en:
- **Windows:** `C:\Users\<usuario>\AppData\Roaming\recorder\recordings\`
- **macOS:** `~/Library/Application Support/recorder/recordings/`
- **Linux:** `~/.config/recorder/recordings/`

Puedes cambiar esta ubicación en el **panel de configuración** (⚙️).

## Construcción

```bash
# Construir la aplicación para producción
npm run build
npm run build:electron
```

El instalador se generará en la carpeta `dist-electron/`.

## Estado del Proyecto

✅ **v0.2.0 - MVP con Reproductor y Configuración**

Funcionalidades implementadas:
- ✅ Grabación de audio del micrófono
- ✅ Pausar/reanudar grabaciones
- ✅ Transcripción local con Whisper AI
- ✅ **Reproductor de audio integrado**
- ✅ **Panel de configuración completo**
- ✅ **Directorio de grabaciones configurable**
- ✅ **Selección de modelo Whisper desde la UI**
- ✅ **Configuración de idioma**
- ✅ Exportación a TXT, SRT, VTT y JSON
- ✅ Interfaz de usuario intuitiva

Próximas funcionalidades:
- 🚧 Dashboard con historial de grabaciones
- 🚧 Base de datos para gestión de reuniones
- 🚧 Captura de audio del sistema
- 🚧 Visualizador de forma de onda
- 🚧 Reproducción sincronizada con transcripción
- 🚧 Tema oscuro/claro

## Solución de Problemas

### Transcripción Local vs OpenAI API

La aplicación soporta dos métodos de transcripción:

**1. Whisper Local (Predeterminado) - 100% Offline y Privado**
- Usa `@fugood/whisper.node` con binarios precompilados
- No requiere instalación de compiladores
- Ningún dato sale de tu computadora
- Gratis, sin límites
- **Configuración:** Deja el archivo `.env` sin la API key de OpenAI (comentada con `#`)

**2. OpenAI Whisper API (Opcional) - Más rápido**
- Requiere API key de OpenAI (~$0.006 USD por minuto)
- Más rápido y preciso
- **Configuración:**
  1. Obtén una API key en: https://platform.openai.com/api-keys
  2. Edita `.env` y descomenta: `OPENAI_API_KEY=sk-tu-key-aqui`
  3. Instala la dependencia: `npm install form-data`

La aplicación detecta automáticamente qué método usar según la presencia de la API key.

**Ubicación de archivos grabados:**
```
Windows: C:\Users\<TU_USUARIO>\AppData\Roaming\recorder\recordings\
macOS: ~/Library/Application Support/recorder/recordings/
Linux: ~/.config/recorder/recordings/
```

### La transcripción tarda mucho
- Es normal en la primera ejecución (descarga del modelo ~142MB)
- Considera usar un modelo más pequeño (`tiny` en lugar de `base`)
- Las transcripciones posteriores serán más rápidas

### No se graba audio / "ffmpeg was killed"
- Verifica que el micrófono esté conectado
- Otorga permisos de micrófono a la aplicación
- En Windows: Settings → Privacy → Microphone
- Verifica el nombre del dispositivo en `electron/services/audioRecorder.js` línea 50

### Ejecutar tests
```bash
npm test                          # Ejecutar todos los tests
npm run test:devices              # Solo listar dispositivos de audio
npm run test:recording            # Probar grabación de 5 segundos
npm run test:service              # Probar servicio completo
npm run test:transcription-local  # Probar transcripción local con @fugood/whisper.node
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue antes de hacer cambios importantes.

## Licencia

MIT
