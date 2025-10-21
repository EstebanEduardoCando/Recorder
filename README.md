# Recorder

Aplicación de escritorio para grabar y transcribir reuniones de forma local y privada usando Whisper AI.

## Características

- 🎙️ **Grabación de audio** del micrófono con filtros profesionales
- 📝 **Transcripción automática** local con Whisper AI (100% offline)
- ⏱️ **Contador regresivo 3-2-1** al iniciar/detener grabación (no pierdes segundos valiosos)
- 🎵 **Reproductor de audio** integrado con controles completos
- 📋 **Copiar transcripción** al portapapeles con un clic
- 🗂️ **Gestor de grabaciones** con selección múltiple y eliminación
- 🤖 **Gestión de modelos Whisper** (descargar, validar, eliminar)
- ⚙️ **Panel de configuración** completo con opciones avanzadas
- 🌍 **Idiomas**: Auto-detección o selección manual
- ⏱️ **Timestamps** detallados para cada segmento
- 📊 **Estimación de tiempo** de transcripción con contador en tiempo real
- 📄 **Exportar** a TXT, SRT, VTT y JSON
- 💾 **100% offline y privado** - tus datos nunca salen de tu PC

## Requisitos Previos (Windows)

### 1. Node.js (Requerido)
- **Versión:** Node.js 18 o superior
- **Descarga:** [nodejs.org](https://nodejs.org/)
- **Instalación:**
  1. Descarga el instalador LTS para Windows (.msi)
  2. Ejecuta el instalador y sigue las instrucciones
  3. **IMPORTANTE:** Marca la opción "Automatically install the necessary tools" si aparece
  4. Verifica instalación abriendo CMD/PowerShell:
     ```bash
     node --version    # Debe mostrar v18.x.x o superior
     npm --version     # Debe mostrar 9.x.x o superior
     ```

### 2. Git (Requerido para clonar)
- **Descarga:** [git-scm.com](https://git-scm.com/download/win)
- **Instalación:** Usar opciones por defecto
- **Verificar:**
  ```bash
  git --version
  ```

### 3. Micrófono (Requerido)
- Micrófono conectado y funcionando
- **Configurar permisos:**
  1. `Configuración de Windows` → `Privacidad` → `Micrófono`
  2. Activar "Permitir que las aplicaciones accedan al micrófono"

### 4. FFmpeg (Se instala automáticamente)
- La aplicación instala FFmpeg automáticamente vía npm
- No requiere instalación manual

## Instalación Paso a Paso (Windows)

### Paso 1: Clonar el Repositorio
Abre **PowerShell** o **CMD** y ejecuta:

```bash
# Navegar a donde quieres clonar el proyecto
cd C:\Desarrollos    # O la carpeta que prefieras

# Clonar el repositorio
git clone <url-del-repositorio>
cd Recorder
```

### Paso 2: Instalar Dependencias
```bash
npm install
```

**Esto instalará:**
- Electron (framework de aplicación de escritorio)
- React + Vite (interfaz de usuario)
- @fugood/whisper.node (transcripción AI con binarios precompilados)
- @ffmpeg-installer/ffmpeg (grabación de audio)
- Y todas las demás dependencias necesarias

**Tiempo estimado:** 2-5 minutos dependiendo de tu conexión a internet

### Paso 3: Iniciar la Aplicación (Modo Desarrollo)
```bash
npm run dev
```

**Lo que sucede:**
1. Vite inicia el servidor de desarrollo en `http://localhost:5173`
2. Electron abre la ventana de la aplicación
3. La aplicación está lista para usar

**Primera vez:**
- La primera transcripción descargará automáticamente el modelo Whisper seleccionado
- Modelo `base` (predeterminado): ~142MB
- Solo se descarga una vez, se guarda en tu PC

## Guía de Uso

### Comandos Disponibles

```bash
npm run dev              # Iniciar en modo desarrollo
npm run build            # Compilar frontend (producción)
npm run build:electron   # Crear instalador ejecutable
npm run type-check       # Verificar tipos TypeScript
npm run lint             # Ejecutar linter
```

### Primer Uso - Configuración Inicial

#### 1. Abrir Configuración (⚙️)
Haz clic en el ícono de engranaje en la esquina superior derecha.

#### 2. Configurar Carpeta de Grabaciones (Opcional)
- **Por defecto:** `C:\Users\<TuUsuario>\AppData\Roaming\recorder\recordings\`
- **Personalizar:**
  1. En Settings, sección "Carpeta de Grabaciones"
  2. Clic en "Seleccionar Carpeta"
  3. Elige una ubicación fácil de acceder (ej: `C:\Users\<TuUsuario>\Documents\Grabaciones\`)

#### 3. Seleccionar Modelo Whisper
Elige según tu hardware y necesidades:

| Modelo | Tamaño | Velocidad | Precisión | Recomendado Para |
|--------|--------|-----------|-----------|------------------|
| `tiny` | ~75MB | ⚡⚡⚡⚡⚡ | ⭐⭐ | Pruebas rápidas, PC lentas |
| `base` | ~142MB | ⚡⚡⚡⚡ | ⭐⭐⭐ | **Uso general** (predeterminado) |
| `small` | ~466MB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Mejor calidad, PC medias |
| `medium` | ~1.5GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Alta calidad, PC potentes |
| `large` | ~2.9GB | ⚡ | ⭐⭐⭐⭐⭐ | Máxima calidad, GPU recomendada |

**Nota:** El modelo se descarga automáticamente en la primera transcripción.

#### 4. Configurar Idioma
- **Auto-detección:** Whisper detecta automáticamente (recomendado)
- **Manual:** Selecciona tu idioma si siempre usas el mismo

#### 5. Formatos de Exportación
- **TXT:** Texto plano sin timestamps
- **SRT:** Subtítulos con timestamps (compatible con videos)
- **VTT:** Subtítulos web
- **JSON:** Datos estructurados con metadata

### Grabar Audio

#### Paso a Paso:
1. **Haz clic en "⏺ Grabar"**
   - Aparecerá un contador regresivo: **3... 2... 1...**
   - Esto te da tiempo para prepararte

2. **Habla al micrófono**
   - El botón cambiará a "⏹ Detener" con efecto pulsante
   - Puedes usar "⏸ Pausar" si necesitas interrumpir temporalmente

3. **Haz clic en "⏹ Detener"**
   - Aparecerá otro contador: **3... 2... 1...**
   - Esto captura tus últimas palabras sin cortarlas

4. **Nombra tu grabación** (opcional)
   - Aparecerá un prompt para dar un nombre personalizado
   - Si lo dejas vacío, usará el nombre automático `recording-YYYY-MM-DD...`

5. **Espera la transcripción automática**
   - La transcripción inicia automáticamente
   - Verás una estimación del tiempo que tomará
   - **Primera vez:** Descargará el modelo Whisper (~142MB)

### Reproducir y Ver Transcripción

#### Reproductor de Audio
- **Play/Pause:** Clic en ▶️/⏸️
- **Seek:** Arrastra la barra de progreso
- **Volumen:** Ajusta con el control deslizante
- **Abrir en reproductor externo:** Clic en 📂

#### Visualizar Transcripción
Cuando termina la transcripción verás:
- **Texto completo** en un cuadro grande
- **Botón "📋 Copiar todo"** - copia al portapapeles
- **Botones de exportar** - guarda como TXT o SRT
- **Segmentos con timestamps** - cada frase con su tiempo exacto
- **Resumen de tiempo** - tiempo real vs tiempo estimado

### Gestionar Grabaciones (Tab 📁 Grabaciones)

#### Listar Grabaciones
- Ve al tab "📁 Grabaciones"
- Verás todas tus grabaciones con:
  - Nombre del archivo
  - Tamaño (MB)
  - Fecha de modificación

#### Acciones Disponibles:

**Por grabación individual:**
- **"Ver texto"** - Carga la transcripción guardada (si existe)
- **"Transcribir"** - Inicia nueva transcripción del archivo
- **"Renombrar"** - Cambia el nombre del archivo
- **"🗑️"** - Elimina la grabación y sus archivos relacionados

**Acciones múltiples:**
- **Checkbox** - Selecciona múltiples grabaciones
- **"Seleccionar todo"** - Marca/desmarca todas
- **"Eliminar (N)"** - Borra las seleccionadas (pide confirmación)

**Cargar archivo externo:**
- **"Abrir archivo..."** - Transcribe un archivo de audio existente
- Formatos soportados: WAV, MP3, M4A, FLAC, OGG

### Gestionar Modelos Whisper (Tab 🤖 Modelos Whisper)

#### Ver Modelos Instalados
- Muestra qué modelos tienes descargados
- Indica si están completos o corruptos
- Muestra el tamaño actual vs esperado

#### Acciones:
- **"Descargar"** - Descarga un modelo nuevo
- **"Re-descargar"** - Fuerza descarga si está corrupto
- **"Eliminar"** - Borra el modelo para liberar espacio

**Tip:** Solo necesitas tener descargado el modelo que usas habitualmente.

## Ubicación de Archivos (Windows)

### Grabaciones de Audio
**Por defecto:** `C:\Users\<TuUsuario>\AppData\Roaming\recorder\recordings\`

**Archivos generados por grabación:**
- `nombre.wav` - Audio grabado
- `nombre.txt` - Transcripción en texto plano
- `nombre.srt` - Subtítulos con timestamps (si exportas)
- `nombre.json` - Metadata completa (si exportas)

**Cambiar ubicación:**
1. Abrir Configuración (⚙️)
2. Sección "Carpeta de Grabaciones"
3. Clic en "Seleccionar Carpeta"

### Modelos Whisper
`C:\Users\<TuUsuario>\AppData\Roaming\recorder\models\`

Archivos:
- `ggml-tiny.bin` (~75MB)
- `ggml-base.bin` (~142MB)
- `ggml-small.bin` (~466MB)
- `ggml-medium.bin` (~1.5GB)
- `ggml-large.bin` (~2.9GB)

### Configuración
`C:\Users\<TuUsuario>\AppData\Roaming\recorder\config.json`

Almacena todas tus preferencias (modelo, idioma, paths, etc.)

## Crear Instalador Ejecutable (Windows)

Si quieres distribuir la aplicación o instalarla sin `npm run dev`:

### Paso 1: Compilar el Proyecto
```bash
npm run build            # Compila el frontend React
npm run build:electron   # Crea el instalador
```

### Paso 2: Ubicar el Instalador
El archivo `.exe` estará en:
```
Recorder/dist-electron/
└── Recorder Setup 0.3.0.exe    # Instalador NSIS
```

### Paso 3: Instalar
1. Ejecuta `Recorder Setup 0.3.0.exe`
2. Sigue el asistente de instalación
3. La app se instalará en `C:\Users\<TuUsuario>\AppData\Local\Programs\recorder`
4. Se creará un acceso directo en el menú de inicio

**Nota:** El instalador incluye todas las dependencias necesarias (Electron, FFmpeg, binarios de Whisper)

## Solución de Problemas (Windows)

### Error: "electronAPI no está disponible"
**Causa:** Electron no se cargó correctamente

**Solución:**
```bash
# Limpiar caché y reinstalar
rd /s /q node_modules
del package-lock.json
npm install
npm run dev
```

### Error: "No se encontró ningún micrófono"
**Causa 1:** Micrófono no conectado
- Conecta un micrófono USB o verifica el micrófono integrado

**Causa 2:** Permisos de Windows
1. `Configuración` → `Privacidad` → `Micrófono`
2. Activar "Permitir que las aplicaciones accedan al micrófono"
3. Reiniciar la aplicación

**Causa 3:** Drivers desactualizados
1. `Administrador de dispositivos` → `Entradas y salidas de audio`
2. Clic derecho en tu micrófono → "Actualizar controlador"

### La transcripción tarda mucho tiempo
**Primera vez:** Normal, está descargando el modelo (~142MB)
- Espera a que termine la descarga
- Verás el progreso en la consola

**Siguientes veces:**
- **PC lenta:** Usa modelo `tiny` en lugar de `base`
- **Audio largo:** Un audio de 30min puede tardar 5-15min según tu PC
- **Estimación imprecisa:** Es normal, depende del hardware

**Acelerar transcripción:**
1. Usar modelo más pequeño (`tiny` o `base`)
2. Configuración → Activar GPU si tienes tarjeta gráfica NVIDIA
3. Cerrar otras aplicaciones pesadas

### Error: "Failed to fetch" o problemas de red
**Causa:** Firewall o antivirus bloqueando la descarga de modelos

**Solución:**
1. Agregar excepción en Windows Defender:
   - `Configuración` → `Privacidad y seguridad` → `Seguridad de Windows` → `Firewall`
   - Permitir aplicación: `node.exe` y `electron.exe`
2. Descargar modelo manualmente:
   - Ir a [huggingface.co/ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)
   - Descargar `ggml-base.bin`
   - Copiarlo a `C:\Users\<TuUsuario>\AppData\Roaming\recorder\models\`

### El reproductor de audio no funciona
**Causa:** Archivo de audio corrupto o formato no soportado

**Solución:**
1. Verifica que el archivo existe y tiene tamaño > 0KB
2. Intenta abrir el archivo en el reproductor de Windows
3. Si no abre, la grabación puede haberse corrompido
4. Graba de nuevo

### Error: "EPERM: operation not permitted"
**Causa:** Archivo en uso o permisos insuficientes

**Solución:**
1. Cierra todos los reproductores de audio
2. Cierra otras instancias de la aplicación
3. Ejecuta PowerShell/CMD como Administrador
4. Ejecuta `npm run dev`

### Aplicación muy lenta o se congela
**Causa 1:** Modelo muy grande para tu PC
- Usa modelo más pequeño (`tiny` o `base`)

**Causa 2:** Poco espacio en disco
- Libera espacio (los modelos ocupan hasta 2.9GB)

**Causa 3:** RAM insuficiente
- Cierra otras aplicaciones
- Modelo `large` requiere 8GB+ RAM

### Los números de versión no coinciden
```bash
# Verificar versiones instaladas
node --version    # Debe ser v18+
npm --version     # Debe ser v9+
```

Si son menores, reinstala Node.js desde [nodejs.org](https://nodejs.org/)

## Estado del Proyecto

**v0.3.0 - Gestor de Grabaciones + Contador Regresivo**

✅ **Completado:**
- ✅ Grabación de audio con filtros profesionales
- ✅ Contador regresivo 3-2-1 (inicio/detención)
- ✅ Transcripción local con Whisper AI
- ✅ Reproductor de audio funcional
- ✅ Gestor de grabaciones (listar, renombrar, eliminar)
- ✅ Gestor de modelos Whisper
- ✅ Estimación de tiempo de transcripción
- ✅ Copiar transcripción al portapapeles
- ✅ Exportación múltiple formatos (TXT, SRT, VTT, JSON)
- ✅ Panel de configuración completo
- ✅ Selección y eliminación múltiple de grabaciones
- ✅ Cargar y visualizar transcripciones existentes

🚧 **Próximas funcionalidades:**
- 🔄 Sincronización de reproducción con transcripción (highlighting)
- 🎨 Tema oscuro/claro
- 📊 Visualizador de forma de onda en tiempo real
- 🔊 Captura de audio del sistema (Stereo Mix/VB-Cable)
- 🗄️ Base de datos SQLite para búsqueda full-text
- 📈 Dashboard con estadísticas de uso
- 🌐 Traducción de transcripciones

## Transcripción: Local vs API (Opcional)

### Opción 1: Whisper Local (Predeterminado) - 100% Offline ✅
**Recomendado para la mayoría de usuarios**

✅ **Ventajas:**
- 100% privado - tus datos nunca salen de tu PC
- Gratuito - sin costos por uso
- No requiere internet después de descargar modelos
- Sin límites de uso

❌ **Desventajas:**
- Más lento que la API (depende de tu PC)
- Primera transcripción descarga el modelo (~142MB)
- Requiere espacio en disco (75MB - 2.9GB según modelo)

**Configuración:** No requiere configuración adicional, funciona de inmediato.

---

### Opción 2: OpenAI Whisper API (Opcional) - Más Rápido ⚡
**Para usuarios que necesitan velocidad máxima**

✅ **Ventajas:**
- Muy rápido (procesa en la nube de OpenAI)
- No consume recursos de tu PC
- Mayor precisión en algunos idiomas

❌ **Desventajas:**
- Requiere internet
- Costo: ~$0.006 USD por minuto de audio
- Tus audios se envían a OpenAI (menos privado)
- Requiere cuenta y API key de OpenAI

**Configuración:**
1. Crear cuenta en [platform.openai.com](https://platform.openai.com/)
2. Generar API key en [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Crear archivo `.env` en la raíz del proyecto:
   ```bash
   OPENAI_API_KEY=sk-tu-api-key-aqui
   ```
4. Instalar dependencia adicional:
   ```bash
   npm install form-data
   ```
5. Reiniciar la aplicación

**La app detecta automáticamente** qué método usar según la presencia de la API key.

---

## Stack Tecnológico

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- CSS3 con animaciones

**Desktop:**
- Electron 31
- IPC para comunicación segura (preload + contextBridge)

**Audio:**
- FFmpeg (grabación)
- DirectShow (Windows)
- Filtros profesionales: reducción de ruido, normalización, compresión

**Transcripción AI:**
- @fugood/whisper.node (binarios precompilados de Whisper.cpp)
- Modelos: tiny, base, small, medium, large
- Soporte GPU (CUDA, Vulkan)

**Almacenamiento:**
- JSON para configuración
- Sistema de archivos local
- (Pendiente: SQLite para metadata)

---

## Estructura del Proyecto

```
Recorder/
├── electron/
│   ├── main.js                              # Proceso principal de Electron
│   ├── preload.js                          # Bridge IPC seguro
│   └── services/
│       ├── audioRecorder.js                # Grabación con FFmpeg
│       ├── configService.js                # Gestión de config
│       ├── transcriptionServiceLocal.js    # Whisper local
│       ├── transcriptionServiceOpenAI.js   # API OpenAI (opcional)
│       └── transcriptionEstimator.js       # Estimación de tiempos
├── src/
│   ├── App.tsx                             # Componente principal
│   ├── App.css                             # Estilos globales
│   ├── components/
│   │   ├── AudioPlayer.tsx                 # Reproductor de audio
│   │   ├── Settings.tsx                    # Panel de configuración
│   │   ├── ModelManager.tsx                # Gestor de modelos Whisper
│   │   └── RecordingsManager.tsx           # Gestor de grabaciones
│   └── vite-env.d.ts                       # Definiciones TypeScript
├── package.json
├── vite.config.ts
├── electron.vite.config.js
├── CLAUDE.md                               # Instrucciones para IA
└── README.md                               # Este archivo
```

---

## Contribuir

¿Quieres mejorar Recorder? ¡Las contribuciones son bienvenidas!

### Reportar Bugs
1. Verifica que el bug no esté ya reportado en [Issues](../../issues)
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducirlo
   - Tu sistema operativo y versión de Node.js
   - Screenshots si es posible

### Sugerir Funcionalidades
1. Abre un issue con la etiqueta "enhancement"
2. Describe la funcionalidad y por qué sería útil
3. Si tienes diseños/mockups, compártelos

### Pull Requests
1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz tus cambios siguiendo el estilo del proyecto
4. Commit: `git commit -m "Descripción clara"`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Abre un Pull Request

---

## Licencia

MIT License - ver archivo LICENSE para detalles

Copyright (c) 2025 Recorder

Se concede permiso, de forma gratuita, para usar, copiar, modificar y distribuir este software.

---

## Contacto y Soporte

- **Issues:** [GitHub Issues](../../issues)
- **Documentación:** Este README + [CLAUDE.md](CLAUDE.md) para desarrollo

---

## Agradecimientos

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) por los modelos optimizados
- [@fugood/whisper.node](https://www.npmjs.com/package/@fugood/whisper.node) por los binarios precompilados
- [OpenAI](https://openai.com/) por el modelo original Whisper
- [Electron](https://www.electronjs.org/) por el framework de escritorio
- La comunidad open source ❤️
