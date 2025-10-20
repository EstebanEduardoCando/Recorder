# Whisper Configuration Guide

Guía completa de opciones de configuración para la transcripción con Whisper en Recorder.

## Aceleración por GPU

### Soporte de GPU por Plataforma

La librería `@fugood/whisper.node` soporta aceleración por GPU mediante diferentes backends:

#### **macOS**
- **arm64 (M1/M2/M3)**: Aceleración automática con **Metal GPU**
- **x86_64 (Intel)**: Solo CPU

#### **Windows**
- **CPU**: Siempre disponible
- **Vulkan**: Soporte para GPUs con Vulkan (NVIDIA, AMD, Intel)
- **CUDA**: Solo para NVIDIA (Compute Capability 12.0 en x86_64)

#### **Linux**
- **CPU**: Siempre disponible
- **Vulkan**: Soporte para GPUs con Vulkan
- **CUDA**: NVIDIA (Compute Capability 8.9 en x86_64, 8.7 en arm64)

### Variantes de Librería (libVariant)

```javascript
// Opción 1: CPU o Metal (macOS)
const context = await initWhisper({
  filePath: modelPath,
  useGpu: true  // En macOS usa Metal automáticamente
})

// Opción 2: Vulkan (Windows/Linux)
const context = await initWhisper({
  filePath: modelPath,
  useGpu: true
}, 'vulkan')

// Opción 3: CUDA (Windows/Linux con NVIDIA)
const context = await initWhisper({
  filePath: modelPath,
  useGpu: true,
  gpu_device: 0  // ID de la GPU CUDA
}, 'cuda')
```

**Nota**: Las variantes `vulkan` y `cuda` pueden ser inestables en algunos escenarios.

---

## Opciones de Inicialización (initWhisper)

### Parámetros del Contexto

```typescript
interface WhisperContextParams {
  // Modelo y GPU
  filePath: string;           // Ruta al modelo GGML
  useGpu: boolean;            // Usar aceleración GPU (default: false)
  flash_attn: boolean;        // Flash attention (experimental)
  gpu_device: number;         // ID del dispositivo CUDA (default: 0)

  // Timestamps con DTW (experimental)
  dtw_token_timestamps: boolean;
  dtw_aheads_preset: string;  // Preset de alignment heads
  dtw_n_top: number;
}
```

**Ejemplo básico**:
```javascript
const context = await initWhisper({
  filePath: 'path/to/ggml-base.bin',
  useGpu: true,
  gpu_device: 0
}, 'cuda')
```

---

## Opciones de Transcripción (transcribeFile)

### Parámetros Principales

#### **Idioma y Detección**
```javascript
{
  language: 'es',           // Código de idioma (es, en, fr, etc.)
  detect_language: false,   // Auto-detectar idioma
  translate: false          // Traducir a inglés
}
```

#### **Threading y Rendimiento**
```javascript
{
  n_threads: 4,            // Número de threads (default: automático)
  audio_ctx: 0             // Contexto de audio (0 = default)
}
```

#### **Control de Timestamps**
```javascript
{
  no_timestamps: false,    // No generar timestamps
  single_segment: false,   // Forzar un solo segmento
  token_timestamps: true,  // Timestamps a nivel de token
  thold_pt: 0.01,         // Umbral de probabilidad de timestamp
  thold_ptsum: 0.01,      // Umbral de suma de probabilidad
  max_len: 0,             // Longitud máxima de segmento (caracteres)
  split_on_word: true,    // Dividir por palabra en lugar de token
  max_tokens: 0           // Tokens máximos por segmento
}
```

#### **Parámetros de Decodificación**
```javascript
{
  temperature: 0.0,        // Temperatura inicial (0.0-1.0)
                          // - 0.0: Más determinista
                          // - 1.0: Más variado

  temperature_inc: 0.2,    // Incremento de temperatura en reintentos

  max_initial_ts: 1.0,    // Timestamp inicial máximo
  length_penalty: -1.0,    // Penalización por longitud

  // Umbrales de fallback
  entropy_thold: 2.4,      // Umbral de entropía
  logprob_thold: -1.0,     // Umbral de log-probabilidad
  no_speech_thold: 0.6     // Umbral de no-habla
}
```

#### **Supresión de Tokens**
```javascript
{
  suppress_blank: true,     // Suprimir tokens en blanco
  suppress_nst: false,      // Suprimir tokens no-speech
  suppress_regex: null      // Regex para suprimir tokens
}
```

#### **Prompt Inicial**
```javascript
{
  initial_prompt: 'Hola, esta es una transcripción de una reunión...',
  carry_initial_prompt: false  // Llevar prompt a cada ventana
}
```

#### **Contexto de Texto**
```javascript
{
  n_max_text_ctx: 16384,   // Tokens máximos de contexto
  no_context: false,       // No usar transcripción previa
  offset_ms: 0,            // Offset inicial (ms)
  duration_ms: 0           // Duración a procesar (ms, 0=todo)
}
```

### Estrategias de Sampling

#### **1. Greedy (Más rápido)**
```javascript
{
  strategy: 'greedy',
  greedy: {
    best_of: 5            // Número de candidatos
  }
}
```

#### **2. Beam Search (Más preciso)**
```javascript
{
  strategy: 'beam_search',
  beam_search: {
    beam_size: 5,         // Tamaño del beam
    patience: 1.0         // Paciencia (no implementado aún)
  }
}
```

### Características Experimentales

#### **Voice Activity Detection (VAD)**
```javascript
{
  vad: true,                      // Habilitar VAD
  vad_model_path: 'path/to/vad',  // Modelo VAD
  vad_params: {
    // Parámetros específicos de VAD
  }
}
```

#### **TinyDiarize (Detección de Hablantes)**
```javascript
{
  tdrz_enable: true       // Habilitar detección de turnos
}
```

#### **Debug Mode**
```javascript
{
  debug_mode: true,       // Info extra (dump log_mel)
  print_special: true,    // Imprimir tokens especiales
  print_progress: true,   // Imprimir progreso
  print_realtime: false,  // NO usar (usar callbacks en su lugar)
  print_timestamps: true  // Imprimir timestamps en tiempo real
}
```

---

## Configuración Recomendada por Caso de Uso

### 1. **Máxima Velocidad (Reuniones en Vivo)**
```javascript
const options = {
  language: 'es',
  temperature: 0.0,
  beam_size: 1,
  best_of: 1,
  n_threads: 4,
  audio_ctx: 0,
  single_segment: false,
  token_timestamps: false,
  no_timestamps: false
}
```

### 2. **Máxima Precisión (Transcripciones Profesionales)**
```javascript
const options = {
  language: 'es',
  temperature: 0.0,
  beam_size: 5,
  best_of: 5,
  n_threads: 8,
  token_timestamps: true,
  split_on_word: true,
  initial_prompt: 'Contexto relevante de la reunión...',
  entropy_thold: 2.0,
  logprob_thold: -0.5
}
```

### 3. **Balance (Uso General)**
```javascript
const options = {
  language: 'es',
  temperature: 0.0,
  beam_size: 3,
  n_threads: 4,
  token_timestamps: true,
  split_on_word: true,
  max_len: 0
}
```

### 4. **Multi-idioma con Auto-detección**
```javascript
const options = {
  language: undefined,      // o 'auto'
  detect_language: true,
  temperature: 0.2,
  beam_size: 3,
  n_threads: 4
}
```

### 5. **Traducción a Inglés**
```javascript
const options = {
  language: 'es',
  translate: true,          // Traduce a inglés
  temperature: 0.0,
  beam_size: 5
}
```

---

## Uso de GPU - Guía Práctica

### Verificar Soporte de GPU

#### **Windows - NVIDIA (CUDA)**
```bash
# Verificar driver NVIDIA
nvidia-smi

# Verificar Compute Capability
# Debe ser >= 12.0 para Windows x64
```

#### **Windows/Linux - Vulkan**
```bash
# Verificar soporte Vulkan
vulkaninfo | grep "GPU"
```

#### **macOS - Metal**
Metal está disponible automáticamente en Mac con Apple Silicon (M1/M2/M3).

### Configuración en el Código

```javascript
// transcriptionServiceLocal.js
class TranscriptionServiceLocal {
  async initialize(modelName = 'base', useGpu = false, gpuBackend = 'default') {
    const { initWhisper } = require('@fugood/whisper.node');

    const config = {
      filePath: this.modelPath,
      useGpu: useGpu,
    };

    // Agregar configuración específica de GPU
    if (useGpu && gpuBackend === 'cuda') {
      config.gpu_device = 0; // ID de la GPU
    }

    this.whisperContext = await initWhisper(config, gpuBackend);
  }
}
```

### Rendimiento Esperado

| Modelo | CPU (threads=4) | GPU (CUDA) | GPU (Vulkan) | Metal (M1) |
|--------|----------------|------------|--------------|------------|
| tiny   | 0.5x realtime  | 5x         | 3x           | 4x         |
| base   | 0.3x realtime  | 4x         | 2.5x         | 3.5x       |
| small  | 0.15x realtime | 3x         | 2x           | 3x         |
| medium | 0.08x realtime | 2x         | 1.5x         | 2.5x       |
| large  | 0.04x realtime | 1.5x       | 1x           | 2x         |

*Nota: Los valores son aproximados y varían según el hardware.*

---

## Limitaciones y Consideraciones

### GPU
- ⚠️ **Vulkan y CUDA pueden ser inestables** en algunos escenarios
- ⚠️ **CUDA requiere** NVIDIA GPU con drivers actualizados
- ⚠️ **Vulkan** puede tener problemas con GPUs antiguas
- ✅ **Metal** (macOS) es generalmente estable

### Modelos
- Modelos grandes (large) requieren **~6GB VRAM** para GPU
- Modelos grandes en CPU requieren **~8GB RAM**
- Flash attention solo funciona con GPUs modernas

### Calidad vs Velocidad
- `temperature=0.0` es más consistente pero puede perder variaciones
- `beam_size` alto mejora calidad pero reduce velocidad significativamente
- `token_timestamps` agrega overhead (~10-20%)

---

## Referencias

- [whisper.cpp GitHub](https://github.com/ggml-org/whisper.cpp)
- [@fugood/whisper.node npm](https://www.npmjs.com/package/@fugood/whisper.node)
- [OpenAI Whisper Paper](https://arxiv.org/abs/2212.04356)
- [CUDA Compute Capability](https://developer.nvidia.com/cuda-gpus)
- [Vulkan SDK](https://www.vulkan.org/)
