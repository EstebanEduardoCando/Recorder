# Recorder

Aplicación de escritorio para grabar y transcribir reuniones de forma local y privada usando Whisper AI.

## Características

- 🎙️ Grabación de audio del micrófono
- 📝 Transcripción automática local con Whisper AI
- 🎵 Reproductor de audio integrado
- ⚙️ Panel de configuración completo
- 🤖 Selección de modelo Whisper (tiny a large)
- 🌍 Configuración de idioma para transcripción
- ⏱️ Timestamps para cada segmento
- 📄 Exportar a TXT, SRT, VTT y JSON
- 💾 100% offline y privado

## Requisitos

- **Node.js 18+** (descargar desde [nodejs.org](https://nodejs.org/))

**Eso es todo.** No necesitas CMake ni compiladores C++. Usa binarios precompilados de `@fugood/whisper.node`.

## Instalación

```bash
git clone <repository-url>
cd Recorder
npm install
```

**Primera transcripción:** Descargará automáticamente el modelo Whisper (~142MB para "base").

## Uso

```bash
npm run dev  # Iniciar aplicación
```

### 1. Configuración Inicial (⚙️)
- **Carpeta de grabaciones:** Selecciona dónde guardar tus grabaciones
- **Modelo Whisper:** Elige según velocidad/precisión:
  - `tiny`: ~75MB - Rápido, menor precisión
  - `base`: ~142MB - Buen balance (predeterminado)
  - `small`: ~466MB - Mejor precisión
  - `medium`: ~1.5GB - Alta precisión
  - `large`: ~2.9GB - Máxima precisión
- **Idioma:** auto-detección o manual
- **Formato exportación:** TXT, SRT, VTT, JSON

### 2. Grabar
- ⏺ Grabar → Habla al micrófono → ⏹ Detener
- Usa ⏸ Pausar si necesitas interrumpir

### 3. Reproducir y Transcribir
- **Reproductor** aparece automáticamente después de grabar
- **Transcripción** inicia automáticamente al detener
- Espera mientras Whisper procesa (primera vez descarga modelo)

### 4. Exportar
- Haz clic en "Exportar TXT" o "Exportar SRT"
- El formato depende de tu configuración

## Archivos de Salida

Por defecto se guardan en:
- **Windows:** `C:\Users\<usuario>\AppData\Roaming\recorder\recordings\`
- **macOS:** `~/Library/Application Support/recorder/recordings/`
- **Linux:** `~/.config/recorder/recordings/`

Puedes cambiar esta ubicación en Configuración (⚙️).

## Construcción

```bash
npm run build         # Build frontend
npm run build:electron  # Build app
```

Instalador en `dist-electron/`.

## Estado del Proyecto

**v0.2.0 - MVP Completado**

✅ Implementado:
- Grabación de audio
- Transcripción local con Whisper
- Reproductor de audio integrado
- Panel de configuración
- Exportación múltiple formatos

🚧 Próximas funcionalidades:
- Dashboard con historial
- Captura de audio del sistema (requiere Stereo Mix o VB-Cable)
- Visualizador de onda
- Reproducción sincronizada con transcripción
- Tema oscuro

## Transcripción: Local vs API

### Whisper Local (Predeterminado) - 100% Offline
- Usa `@fugood/whisper.node` con binarios precompilados
- Sin compilación necesaria
- 100% privado y gratuito
- **Config:** Archivo `.env` sin API key

### OpenAI Whisper API (Opcional) - Más Rápido
- Requiere API key (~$0.006 USD/minuto)
- Más rápido y preciso
- **Config:**
  1. API key en https://platform.openai.com/api-keys
  2. Editar `.env`: `OPENAI_API_KEY=sk-tu-key`
  3. `npm install form-data`

Detecta automáticamente qué método usar según presencia de API key.

## Solución de Problemas

### La transcripción tarda mucho
- Normal en primera ejecución (descarga modelo ~142MB)
- Usa modelo más pequeño (`tiny` en lugar de `base`)
- Transcripciones posteriores serán más rápidas

### No se graba audio
- Verifica que el micrófono esté conectado y con permisos
- Windows: Settings → Privacy → Microphone

### Audio del sistema no disponible
- Windows: Habilita "Stereo Mix" en Configuración de Sonido
- Si no aparece, instala [VB-Audio Cable](https://vb-audio.com/Cable/)
- Ver panel de Configuración (⚙️) para instrucciones detalladas

## Licencia

MIT
