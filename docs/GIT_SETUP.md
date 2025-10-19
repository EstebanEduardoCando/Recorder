# Git Setup - Guía de Configuración

## ✅ Configuración Completada

El repositorio está listo para ser subido a GitHub. Los siguientes archivos han sido configurados:

### Archivos de Configuración Git

1. **`.gitignore`** - Ignora archivos sensibles y temporales:
   - `node_modules/` - Dependencias (se reinstalan con `npm install`)
   - `dist/`, `dist-electron/`, `build/` - Archivos compilados
   - `.env` - Variables de entorno (contiene configuración sensible)
   - `recordings/`, `test-recordings/` - Grabaciones de usuario
   - `models/`, `ggml-*.bin` - Modelos de Whisper (grandes, ~140MB+)
   - `*.wav`, `*.mp3`, `*.db` - Archivos de audio y bases de datos
   - Archivos del sistema (`.DS_Store`, `Thumbs.db`, etc.)

2. **`.gitattributes`** - Normalización de archivos:
   - Archivos de texto usan LF (Unix) line endings
   - Scripts de Windows (.bat, .cmd) usan CRLF
   - Archivos binarios marcados correctamente

3. **`.env.example`** - Plantilla de variables de entorno:
   - Muestra qué variables configurar
   - No contiene valores sensibles
   - Documenta las opciones de transcripción

4. **`LICENSE`** - Licencia MIT

## 📋 Checklist Pre-Commit

Antes de hacer el primer commit, verifica:

- [x] `.gitignore` configurado correctamente
- [x] `.env` NO está siendo rastreado por git
- [x] `.env.example` SÍ está incluido (sin valores sensibles)
- [x] `node_modules/` está ignorado
- [x] Archivos de audio (`.wav`, `.mp3`) están ignorados
- [x] Modelos de Whisper (`.bin`) están ignorados
- [x] `LICENSE` está presente
- [x] `README.md` está actualizado
- [x] `.gitattributes` configurado para normalización

## 🚀 Comandos para Subir a GitHub

### 1. Verificar Estado

```bash
# Ver qué archivos serán incluidos en el commit
git status

# Ver archivos ignorados (NO deberían aparecer)
git status --ignored
```

### 2. Crear Repositorio Local (si no existe)

```bash
# Inicializar git (si no se hizo antes)
git init

# Configurar tu información
git config user.name "Tu Nombre"
git config user.email "tu-email@ejemplo.com"
```

### 3. Primer Commit

```bash
# Agregar todos los archivos
git add .

# Verificar qué se agregó
git status

# Crear el commit inicial
git commit -m "Initial commit: Recorder app with local Whisper transcription

Features:
- Audio recording with FFmpeg
- Local transcription using @fugood/whisper.node
- Pause/resume recording
- Export to TXT and SRT formats
- 100% offline and private
- Comprehensive test suite"
```

### 4. Conectar con GitHub

```bash
# Crear repositorio en GitHub primero, luego:
git remote add origin https://github.com/TU_USUARIO/recorder.git

# Verificar remote
git remote -v

# Subir al repositorio
git push -u origin master
```

## ⚠️ Archivos que NO deben subirse

Estos archivos están correctamente ignorados por `.gitignore`:

### Variables de Entorno
- `.env` - Puede contener API keys

### Grabaciones y Datos de Usuario
- `recordings/` - Grabaciones de audio de usuarios
- `test-recordings/` - Grabaciones de prueba
- `*.wav`, `*.mp3`, `*.ogg` - Archivos de audio
- `*.srt`, `*.vtt`, `*.txt` - Transcripciones generadas

### Modelos de IA (muy grandes)
- `models/` - Directorio de modelos
- `ggml-*.bin` - Modelos de Whisper (~75MB - 2.9GB)
- `whisper-*.bin` - Otros modelos

### Dependencias y Build
- `node_modules/` - Dependencias de npm (~500MB)
- `dist/`, `dist-electron/` - Archivos compilados
- `.cache/` - Archivos de cache

### Bases de Datos
- `*.db`, `*.sqlite` - Bases de datos locales

## ✅ Archivos que SÍ deben subirse

- Código fuente (`src/`, `electron/`, `tests/`)
- Archivos de configuración (`package.json`, `tsconfig.json`, `vite.config.ts`)
- Documentación (`README.md`, `CLAUDE.md`, `docs/`)
- Plantillas (`.env.example`)
- Scripts de desarrollo (`scripts/`)
- Archivos de proyecto (`.eslintrc.cjs`, `.gitignore`, `.gitattributes`)
- Licencia (`LICENSE`)

## 🔍 Verificación Final

Ejecuta estos comandos para verificar que todo está correcto:

```bash
# Ver tamaño del repositorio (debería ser < 10MB sin node_modules)
du -sh .git

# Contar archivos que se subirán
git ls-files | wc -l

# Verificar que .env NO está rastreado
git ls-files | grep ".env$"
# (no debería mostrar nada)

# Verificar que .env.example SÍ está rastreado
git ls-files | grep ".env.example"
# (debería mostrar: .env.example)
```

## 📝 Notas Adicionales

### package-lock.json
Por defecto está incluido en `.gitignore` (línea comentada). Puedes decidir:
- **Incluirlo:** Garantiza versiones exactas de dependencias (recomendado para producción)
- **Excluirlo:** Permite flexibilidad en versiones (común en librerías)

Para incluirlo, edita `.gitignore` y elimina/comenta la línea:
```
# package-lock.json  # Comentar esta línea para incluir el archivo
```

### Modelos de Whisper
Los modelos se descargan automáticamente la primera vez que transcribes.
No es necesario subirlos al repositorio porque:
1. Son muy grandes (75MB - 2.9GB)
2. Se descargan de Hugging Face automáticamente
3. Cada usuario puede elegir qué modelo usar

## 🔐 Seguridad

**IMPORTANTE:** Nunca subas archivos con información sensible:
- API keys (OpenAI, etc.)
- Contraseñas
- Tokens de autenticación
- Grabaciones personales
- Bases de datos con información privada

Si accidentalmente subes un archivo sensible:
1. NO solo elimines el archivo y hagas commit
2. Debes limpiar el historial de git:
   ```bash
   # Opción 1: BFG Repo Cleaner
   bfg --delete-files .env

   # Opción 2: git filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Forzar push: `git push origin --force --all`
4. **Rotar/invalidar** cualquier API key o secreto expuesto

## 📚 Recursos

- [GitHub - Create a repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Git Best Practices](https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project)
- [Gitignore Templates](https://github.com/github/gitignore)
