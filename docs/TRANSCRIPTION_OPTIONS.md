# Opciones de Transcripción

Este documento explica cómo configurar la transcripción en Recorder.

## Opción 1: Whisper Local (Predeterminado) - RECOMENDADO

✅ **Ventajas:**
- 100% privado - ningún dato sale de tu computadora
- Gratis - sin costos recurrentes
- Funciona offline
- Sin compilación necesaria - binarios precompilados
- Soporte para múltiples idiomas

❌ **Desventajas:**
- Descarga inicial del modelo (~142MB para 'base')
- Más lento en computadoras antiguas

### Instalación

**¡Ya está instalado!** El paquete `@fugood/whisper.node` viene con binarios precompilados.

```bash
npm install  # Ya incluye @fugood/whisper.node
```

**Primera transcripción:**
- Descargará automáticamente el modelo seleccionado
- Convierte audio a WAV 16kHz automáticamente
- No requiere configuración adicional

### Modelos Disponibles

| Modelo | Tamaño | Velocidad | Precisión |
|--------|--------|-----------|-----------|
| tiny   | ~75MB  | Rápido    | Básica    |
| base   | ~142MB | Media     | Buena (predeterminado) |
| small  | ~466MB | Lenta     | Muy buena |
| medium | ~1.5GB | Muy lenta | Excelente |
| large  | ~2.9GB | Lentísima | Máxima    |

**Cambiar modelo:**
1. Abre Configuración (⚙️) en la aplicación
2. Selecciona "Modelo de Whisper"
3. Guarda cambios
4. La próxima transcripción usará el nuevo modelo

---

## Opción 2: OpenAI Whisper API - MÁS RÁPIDO

✅ **Ventajas:**
- Más rápido y preciso
- Sin requisitos de hardware
- Sin descarga de modelos

❌ **Desventajas:**
- Requiere API key de OpenAI
- Costo: ~$0.006 USD por minuto de audio
- Requiere internet
- Los archivos se envían a OpenAI

### Instalación

1. **Obtener API Key:**
   - https://platform.openai.com/api-keys
   - Crea una cuenta y genera una API key
   - Copia la key (empieza con `sk-...`)

2. **Instalar dependencia:**
   ```bash
   npm install form-data
   ```

3. **Configurar `.env`:**

   Edita o crea el archivo `.env` en la raíz del proyecto:
   ```
   OPENAI_API_KEY=sk-tu-api-key-aqui
   ```

4. **Reiniciar aplicación:**
   ```bash
   npm run dev
   ```

La aplicación detecta automáticamente la presencia de la API key y usa OpenAI en lugar de Whisper local.

---

## Comparación

| Característica | Whisper Local | OpenAI API |
|---|---|---|
| **Privacidad** | ✅ Total | ❌ Se envía a OpenAI |
| **Costo** | ✅ Gratis | ⚠️ ~$0.006/min |
| **Offline** | ✅ Sí | ❌ No |
| **Setup** | ✅ Fácil (sin compilación) | ✅ Fácil |
| **Velocidad** | ⚠️ Media | ✅ Rápida |
| **Precisión** | ✅ Buena | ✅ Excelente |

---

## Recomendación

- **Para uso personal/privado:** Opción 1 (Whisper local)
- **Para uso profesional con presupuesto:** Opción 2 (OpenAI API)

---

## Verificar que Funciona

1. Ejecuta la aplicación:
   ```bash
   npm run dev
   ```

2. Graba un audio corto (10-15 segundos)

3. Detén la grabación

4. La transcripción debería iniciar automáticamente:
   - **Whisper Local:** Verás "Descargando modelo..." la primera vez
   - **OpenAI API:** Será inmediato

---

## Solución de Problemas

### "Error al transcribir" con Whisper Local
- Verifica conexión a internet (primera vez para descargar modelo)
- Verifica espacio en disco (~142MB mínimo para modelo base)
- Revisa logs en consola del desarrollador

### "API key inválida" con OpenAI
- Verifica que la API key en `.env` sea correcta
- Verifica que empiece con `sk-`
- Verifica saldo en tu cuenta OpenAI

### Transcripción muy lenta
- Usa modelo más pequeño (`tiny` en lugar de `base`)
- Considera usar OpenAI API
- Verifica uso de CPU/RAM durante transcripción
