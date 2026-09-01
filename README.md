# Fish Audio Local 🐟

Interfaz web moderna y de escritorio (ejecutada 100% de forma local en tu navegador y servida desde tu máquina) para generar voz y síntesis de audio de alta calidad utilizando la API de **Fish Audio**.

Sin suscripciones intermedias ni límites de plataforma: utiliza directamente tu propia clave de API contra `api.fish.audio`.

---

## ✨ Características principales

- 🚀 **Ejecución en 1 solo clic:** Scripts de inicio automático para Windows (`iniciar.bat`) y Linux/macOS (`start.sh`).
- 📁 **Organización por Proyectos y Partes:** Estructura tus audios en proyectos (ej. *Audiolibro 1*, *Video YouTube*) y subsecciones/partes (*Parte 1*, *Parte 2*...).
- 🔢 **Numeración Consecutiva Automática:** Cada audio generado dentro de una parte se numera ordenadamente (`#1`, `#2`, `#3`...) facilitando el ensamblaje posterior.
- ⚡ **Generación asíncrona y por lotes:** Procesa múltiples solicitudes en segundo plano con soporte para cancelación y límites concurrentes.
- 🧩 **Smart Chunking:** Divide automáticamente textos largos en párrafos y oraciones respetando la prosodia y concatenando el audio final con `pydub`.
- 🎙️ **Gestor de Biblioteca de Voces:** Agrega y administra tus voces clonadas o predeterminadas mediante su `reference_id`.
- 🎛️ **Controles de Prosodia:** Ajusta formato (`MP3`, `WAV`, `OPUS`), velocidad de habla, volumen y normalización de texto.
- 🗂️ **Historial y Papelera:** Historial ordenado con reproductor integrado, scrubbing con barra de tiempo, descarga directa, modal de detalles y papelera con restauración.
- 📦 **Compilación a `.EXE`:** Script `build_exe.bat` incluido para compilar un ejecutable independiente de Windows con ícono personalizado.
- 🔒 **Privacidad Total:** Tu clave de API y archivos generados se almacenan únicamente en tu máquina local (`data/` y `static/audio/`).

---

## 🚀 Inicio Rápido

### En Windows
Haz doble clic en el archivo:
```bat
iniciar.bat
```
*(El script detectará tu instalación de Python, creará el entorno virtual si es necesario, instalará las dependencias y abrirá la aplicación en tu navegador en `http://127.0.0.1:5050`)*.

### En Linux / macOS / WSL
Ejecuta en tu terminal:
```bash
chmod +x start.sh
./start.sh
```

---

## 📦 Compilar a archivo ejecutable `.EXE` (Windows)

Para generar una versión independiente (`FishAudioLocal.exe`) que no requiere Python en la máquina destino:

1. Ejecuta:
   ```bat
   build_exe.bat
   ```
2. Al finalizar, tu aplicación compilada estará lista en la carpeta:
   ```text
   dist/FishAudioLocal/FishAudioLocal.exe
   ```

---

## ⚙️ Configuración

1. **Obtener API Key:** Ve a [fish.audio](https://fish.audio) → sección **API Keys** y copia tu clave.
2. **Guardar en la App:** Abre la pestaña **Ajustes** en la aplicación, pega tu clave y haz clic en **Guardar**. Se almacenará en `data/config.json` de forma segura en tu disco local.
3. **Agregar Voces:** Copia el `reference_id` de cualquier voz (clonada o pública del dashboard de Fish Audio), asígnale un nombre y agrégala en la pestaña Ajustes. Aparecerá inmediatamente en el selector del editor.

---

## ⌨️ Atajos de Teclado

- `Ctrl + Enter` (o `Cmd + Enter` en Mac): Genera el discurso del texto actual inmediatamente.
- `Escape`: Cierra rápidamente cualquier ventana modal o menú emergente.

---

## 📁 Estructura del Proyecto

```text
fish-audio-local/
├── app.py                     # Servidor backend Flask y proxy a la API de Fish Audio
├── requirements.txt           # Dependencias de Python (Flask, requests, pydub)
├── iniciar.bat                # Lanzador automatizado para Windows
├── start.sh                   # Lanzador automatizado para Linux/macOS/WSL
├── build_exe.bat              # Script de compilación a ejecutable EXE (PyInstaller)
├── app_icon.ico               # Ícono oficial de la aplicación
├── templates/
│   └── index.html             # Interfaz web principal
├── static/
│   ├── css/
│   │   └── style.css          # Estilos modernos y fluidos
│   ├── js/
│   │   └── app.js             # Lógica cliente, proyectos, partes, reproductor y modales
│   └── audio/                 # Directorio de salida para los audios generados
├── data/                      # Datos locales (ignorado por Git por seguridad)
│   ├── config.json            # Clave de API y configuración
│   ├── projects.json          # Proyectos y partes
│   ├── history.json           # Registro del historial de generaciones
│   └── trash.json             # Elementos en papelera
└── docs/                      # Documentación y guías
```

---

## 🛠️ Requisitos Previos

- **Python 3.10 o superior**.
- (Opcional recomendado) **FFmpeg** instalado en el sistema para permitir conversiones avanzadas de formatos de audio con `pydub`.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
