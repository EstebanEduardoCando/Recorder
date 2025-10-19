# Recorder

Aplicación de escritorio para grabar y transcribir reuniones de forma local y privada usando Whisper AI.

## Características

- 🎙️ Grabación de audio del micrófono
- ⏸️ Pausar y reanudar grabaciones
- 📝 Transcripción automática local usando Whisper AI
- ⏱️ Timestamps para cada segmento de la transcripción
- 📄 Exportar transcripciones a TXT y SRT
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

1. **Grabar una reunión:**
   - Haz clic en "⏺ Grabar"
   - Habla al micrófono
   - Haz clic en "⏹ Detener" cuando termines

2. **Transcripción automática:**
   - La transcripción comenzará automáticamente al detener la grabación
   - Espera mientras Whisper procesa el audio (puede tardar un poco en la primera vez)

3. **Exportar:**
   - Haz clic en "Exportar TXT" para obtener el texto plano
   - Haz clic en "Exportar SRT" para obtener subtítulos con timestamps

## Archivos de Salida

Los archivos se guardan en:
- **Windows:** `C:\Users\<usuario>\AppData\Roaming\recorder\recordings\`
- **macOS:** `~/Library/Application Support/recorder/recordings/`
- **Linux:** `~/.config/recorder/recordings/`

## Construcción

```bash
# Construir la aplicación para producción
npm run build
npm run build:electron
```

El instalador se generará en la carpeta `dist-electron/`.

## Estado del Proyecto

✅ **MVP Completado**

Funcionalidades implementadas:
- ✅ Grabación de audio del micrófono
- ✅ Pausar/reanudar grabaciones
- ✅ Transcripción local con Whisper AI
- ✅ Exportación a TXT y SRT
- ✅ Interfaz de usuario intuitiva

Próximas funcionalidades:
- 🚧 Dashboard con historial de grabaciones
- 🚧 Base de datos para gestión de reuniones
- 🚧 Captura de audio del sistema
- 🚧 Configuración de modelos Whisper
- 🚧 Visualizador de forma de onda

## Modelos de Whisper Disponibles

Puedes cambiar el modelo en el código (`src/App.tsx`, línea 106):

- `tiny`: ~75MB, más rápido, menor precisión
- `base`: ~142MB, buen balance (predeterminado)
- `small`: ~466MB, mejor precisión
- `medium`: ~1.5GB, alta precisión
- `large`: ~2.9GB, máxima precisión

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
