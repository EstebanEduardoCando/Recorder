# Git Setup - Configuración

## Archivos Configurados

✅ `.gitignore` - Ignora archivos sensibles y temporales
✅ `.gitattributes` - Normalización de line endings
✅ `.env.example` - Plantilla de variables de entorno (sin valores sensibles)
✅ `LICENSE` - Licencia MIT

## Archivos que NO se suben (`.gitignore`)

### Variables de Entorno
- `.env` - Puede contener API keys

### Grabaciones y Datos de Usuario
- `recordings/`, `test-recordings/`
- `*.wav`, `*.mp3`, `*.ogg`
- `*.srt`, `*.vtt`, `*.txt` (transcripciones generadas)

### Modelos de IA (muy grandes)
- `models/`
- `ggml-*.bin` (75MB - 2.9GB cada uno)

### Dependencias y Build
- `node_modules/` (~500MB)
- `dist/`, `dist-electron/`, `.cache/`

### Bases de Datos
- `*.db`, `*.sqlite`

## Archivos que SÍ se suben

- Código fuente (`src/`, `electron/`)
- Configuración (`package.json`, `tsconfig.json`, `vite.config.ts`)
- Documentación (`README.md`, `CLAUDE.md`, `docs/`)
- Plantillas (`.env.example`)
- Archivos de proyecto (`.eslintrc.cjs`, `.gitignore`)

## Subir a GitHub

### Primera vez

```bash
# Crear repositorio en GitHub primero, luego:
git remote add origin https://github.com/TU_USUARIO/recorder.git
git push -u origin master
```

### Commits habituales

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

## Verificación

```bash
# Ver qué archivos se incluirán
git status

# Verificar que .env NO está rastreado
git ls-files | grep "^\.env$"
# (no debería mostrar nada)

# Verificar que .env.example SÍ está rastreado
git ls-files | grep ".env.example"
# (debería mostrar: .env.example)
```

## Seguridad

⚠️ **IMPORTANTE:** Nunca subas archivos con información sensible:
- API keys (OpenAI, etc.)
- Contraseñas
- Tokens de autenticación
- Grabaciones personales

Si accidentalmente subes un archivo sensible:
1. NO solo lo elimines y hagas commit
2. Limpia el historial de git con BFG Repo Cleaner o git filter-branch
3. Forzar push: `git push origin --force --all`
4. **Rotar/invalidar** cualquier API key o secreto expuesto

## Recursos

- [GitHub - Create a repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Gitignore Templates](https://github.com/github/gitignore)
