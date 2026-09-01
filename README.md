# Fish Audio Local 🐟

Interfaz web moderna y de escritorio (ejecutada 100% de forma local en tu navegador y servida desde tu máquina) para generar voz y síntesis de audio de alta calidad utilizando la API de **Fish Audio**.

Sin suscripciones intermedias ni límites de plataforma: utiliza directamente tu propia clave de API contra `api.fish.audio`.

---

## ✨ Características principales

- 🚀 **Ejecución en 1 solo clic:** Scripts de inicio automático para Windows (`iniciar.bat`) y Linux/macOS (`start.sh`).
- ⚡ **Generación asíncrona y por lotes:** Procesa múltiples solicitudes en segundo plano con soporte para cancelación y límites concurrentes.
- 🧩 **Smart Chunking:** Divide automáticamente textos largos en párrafos y oraciones respetando la prosodia y concatenando el audio final con `pydub`.
- 🎙️ **Gestor de Biblioteca de Voces:** Agrega y administra tus voces clonadas o predeterminadas mediante su `reference_id`.
- 🎛️ **Controles de Prosodia:** Ajusta formato (`MP3`, `WAV`, `OPUS`), velocidad de habla, volumen y normalización de texto.
- 🗂️ **Historial y Papelera:** Historial cronológico con reproductor integrado, descarga directa, modal de detalles extendido y papelera con soporte de restauración.
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

## ⚙️ Configuración

1. **Obtener API Key:** Ve a [fish.audio](https://fish.audio) → sección **API Keys** y copia tu clave.
2. **Guardar en la App:** Abre la pestaña **Ajustes** en la aplicación, pega tu clave y haz clic en **Guardar**. Se almacenará en `data/config.json` de forma segura en tu disco local.
3. **Agregar Voces:** Copia el `reference_id` de cualquier voz (clonada o pública del dashboard de Fish Audio), asígnale un nombre y agrégala en la pestaña Ajustes. Aparecerá inmediatamente en el selector del editor.

---

## ⌨️ Atajos de Teclado

- `Ctrl + Enter` (o `Cmd + Enter` en Mac): Genera el discurso del texto actual inmediatamente.

---

## 📁 Estructura del Proyecto

```text
fish-audio-local/
├── app.py                     # Servidor backend Flask y proxy a la API de Fish Audio
├── requirements.txt           # Dependencias de Python (Flask, requests, pydub)
├── iniciar.bat                # Lanzador automatizado para Windows
├── start.sh                   # Lanzador automatizado para Linux/macOS/WSL
├── templates/
│   └── index.html             # Interfaz web principal
├── static/
│   ├── css/
│   │   └── style.css          # Estilos modernos y responsivos
│   ├── js/
│   │   └── app.js             # Lógica cliente, reproductor, llamadas API y animaciones
│   └── audio/                 # Directorio de salida para los audios generados
├── data/                      # Datos locales (ignorado por Git por seguridad)
│   ├── config.json            # Clave de API y configuración de voces
│   ├── history.json           # Registro del historial de generaciones
│   └── trash.json             # Elementos en papelera
└── docs/                      # Documentación y guías de diseño
```

---

## 🛠️ Requisitos Previos

- **Python 3.10 o superior**.
- (Opcional recomendado) **FFmpeg** instalado en el sistema para permitir conversiones avanzadas de formatos de audio con `pydub`.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
