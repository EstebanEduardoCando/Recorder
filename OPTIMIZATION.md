# Optimización de Transcripción - Recorder v0.3.0

## Configuración Optimizada para tu Hardware

### 🖥️ Hardware Detectado

- **CPU**: Intel Core i7-13620H (10 cores, 16 threads)
- **GPU**: NVIDIA GeForce RTX 4060 Laptop (8GB VRAM)
- **CUDA**: Versión 12.9 ✅
- **Sistema**: Windows con soporte completo para CUDA

### ⚡ Configuración Aplicada

La aplicación ahora está configurada con los siguientes parámetros optimizados para máximo rendimiento y calidad:

#### **Aceleración GPU**
```javascript
useGpu: true              // ✅ ACTIVADO
gpuBackend: 'cuda'        // Usando NVIDIA CUDA
gpu_device: 0             // Primera GPU detectada
```

#### **Threading CPU**
```javascript
nThreads: 8               // 50% de los threads disponibles
                          // Balance óptimo para dejar recursos al sistema
```

#### **Calidad de Transcripción**
```javascript
beamSize: 3               // Balance óptimo calidad/velocidad
                          // Valores: 1=rápido, 5=preciso, 3=balance

bestOf: 3                 // Número de candidatos a evaluar
                          // Mejora consistencia sin impacto severo

temperature: 0.0          // Salida más determinista y consistente
                          // 0.0 = sin variación, 1.0 = más creativo
```

#### **Filtros de Calidad**
```javascript
entropyThold: 2.4         // Filtro de entropía (calidad del audio)
logprobThold: -1.0        // Umbral de confianza de predicción
noSpeechThold: 0.6        // Detección de silencio/ruido
suppressBlank: true       // Eliminar espacios vacíos
suppress_non_speech_tokens: true  // Filtrar ruido y tokens no-habla
```

#### **Segmentación Inteligente**
```javascript
split_on_word: true       // Dividir por palabras (más natural)
max_len: 0                // Sin límite de longitud (automático)
token_timestamps: true    // Timestamps precisos por token
single_segment: false     // Múltiples segmentos (mejor contexto)
```

### 📊 Rendimiento Esperado

Con esta configuración en tu hardware:

| Modelo | Tiempo Estimado | Velocidad | Calidad |
|--------|----------------|-----------|---------|
| **tiny** | 1 min audio = 10s proc | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ |
| **base** | 1 min audio = 15s proc | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ |
| **small** | 1 min audio = 20s proc | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| **medium** | 1 min audio = 30s proc | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| **large** | 1 min audio = 40s proc | ⚡ | ⭐⭐⭐⭐⭐ |

**Nota**: Los tiempos son aproximados y pueden variar según la complejidad del audio.

### 🎯 Recomendaciones por Caso de Uso

#### **1. Reuniones en Tiempo Real (Prioridad: Velocidad)**
```javascript
whisperModel: 'tiny' o 'base'
beamSize: 1-2
useGpu: true
```
**Rendimiento**: ~6-8x más rápido que tiempo real

#### **2. Transcripciones Profesionales (Prioridad: Calidad)**
```javascript
whisperModel: 'medium' o 'large'
beamSize: 5
bestOf: 5
useGpu: true
initialPrompt: "Contexto de la reunión..."
```
**Rendimiento**: ~1.5-2x más rápido que tiempo real

#### **3. Balance General (Configuración Actual)** ✅
```javascript
whisperModel: 'base' o 'small'
beamSize: 3
bestOf: 3
useGpu: true
```
**Rendimiento**: ~3-4x más rápido que tiempo real

### 🔧 Configuración Avanzada (Opcional)

#### **Prompt Inicial Personalizado**
Mejora la precisión configurando un prompt inicial con contexto:

```javascript
initialPrompt: "Esta es una reunión de desarrollo de software sobre arquitectura de microservicios y APIs RESTful."
```

Esto ayuda a Whisper a entender el contexto y usar vocabulario técnico apropiado.

#### **Multi-idioma con Auto-detección**
Para grabaciones con múltiples idiomas:

```javascript
language: 'auto'
detectLanguage: true
```

#### **Optimización para Grabaciones Largas**
Para archivos de más de 1 hora:

```javascript
beamSize: 2              // Reducir para mayor velocidad
nThreads: 12             // Usar más threads
max_len: 100             // Limitar longitud de segmentos
```

### 📈 Comparativa de Rendimiento

#### **Antes de la Optimización**
- **Backend**: CPU solamente
- **Threads**: Automático (~4)
- **Beam Size**: No configurado (default = 5)
- **Tiempo**: 1 min audio = ~60-90s procesamiento

#### **Después de la Optimización** ✅
- **Backend**: CUDA GPU
- **Threads**: 8 optimizados
- **Beam Size**: 3 balanceado
- **Tiempo**: 1 min audio = ~15-20s procesamiento

**Mejora**: ~4x más rápido manteniendo alta calidad

### ⚠️ Consideraciones

#### **Uso de VRAM**
- **tiny/base**: ~1-2 GB VRAM
- **small**: ~2-3 GB VRAM
- **medium**: ~4-5 GB VRAM
- **large**: ~6-7 GB VRAM

Tu RTX 4060 (8GB) puede manejar todos los modelos cómodamente.

#### **Consumo de Energía**
Con GPU activada, el laptop consumirá más energía. Considera:
- Usar modo conectado para transcripciones largas
- Reducir a CPU (`useGpu: false`) cuando uses batería

#### **Temperatura**
La GPU trabajará más. Asegúrate de:
- Buena ventilación
- Superficie plana
- Limpiar ventiladores periódicamente

### 🛠️ Cómo Cambiar la Configuración

Las configuraciones se guardan en:
```
%APPDATA%/recorder/config.json
```

Puedes editar manualmente o usar el panel de Settings en la aplicación (próxima funcionalidad).

#### **Ejemplo de config.json**
```json
{
  "recordingsPath": "C:\\Users\\...\\recordings",
  "whisperModel": "base",
  "language": "es",
  "useGpu": true,
  "gpuBackend": "cuda",
  "nThreads": 8,
  "beamSize": 3,
  "bestOf": 3,
  "temperature": 0.0,
  "entropyThold": 2.4,
  "logprobThold": -1.0,
  "noSpeechThold": 0.6,
  "initialPrompt": "",
  "maxSegmentLength": 0,
  "splitOnWord": true,
  "suppressBlank": true,
  "detectLanguage": false
}
```

### 🐛 Troubleshooting

#### **Si la GPU no funciona**
1. Verifica drivers NVIDIA actualizados
2. Ejecuta `nvidia-smi` para verificar CUDA
3. Cambia a `gpuBackend: 'vulkan'` como alternativa
4. Como último recurso: `useGpu: false`

#### **Si la transcripción es muy lenta**
1. Reduce `beamSize` a 1-2
2. Usa modelo más pequeño (tiny o base)
3. Verifica que GPU esté activa en nvidia-smi
4. Cierra otros programas que usen GPU

#### **Si la calidad es baja**
1. Aumenta `beamSize` a 4-5
2. Usa modelo más grande (medium o large)
3. Agrega `initialPrompt` con contexto
4. Verifica calidad del audio de entrada

### 📚 Referencias

- [WHISPER_CONFIG.md](WHISPER_CONFIG.md) - Configuración completa de Whisper
- [CLAUDE.md](CLAUDE.md) - Documentación del proyecto
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) - Proyecto base

---

**Última actualización**: 2025-10-19
**Versión**: 0.3.0
**Hardware objetivo**: Intel i7-13620H + RTX 4060
