# Fish Audio Local

Interfaz de escritorio (corre en tu navegador, servida desde tu propia PC) para generar
voz con la API de Fish Audio. Nada de créditos ni límite de caracteres — usa tu propia
clave de API directo contra `api.fish.audio`.

## Primer uso

```bash
./start.sh
```

Eso crea un entorno virtual, instala Flask/requests, y abre `http://127.0.0.1:5050`
en tu navegador automáticamente. Las siguientes veces es igual de rápido: solo
`./start.sh` de nuevo.

Si el navegador no abre solo, entra manualmente a esa URL.

## Configurar tu clave

1. Ve a [fish.audio](https://fish.audio) → API Keys, copia tu clave.
2. En la app, pestaña **Ajustes** → pega la clave en "Clave de API" → **Guardar**.
   Se guarda en `config.json` local, nunca sale de tu PC salvo hacia Fish Audio.
3. (Opcional) Agrega tus voces: cada voz clonada o de la biblioteca tiene un
   `reference_id` en el dashboard de Fish Audio. Ponle un nombre y pégalo en
   "Mis voces" para que aparezca en el selector del editor.

## Uso

Escribe el texto, elige voz y modelo, `Ctrl + Enter` o clic en **Generar discurso**.
El audio se reproduce solo y queda guardado en la pestaña **Historia** (con
descarga individual). Todo se guarda localmente en `static/audio/` +
`history.json` — nada se sube a ningún lado más que a Fish Audio para generar
el audio.

El botón **+ énfasis** envuelve el texto que selecciones en `[énfasis]...[/énfasis]`
para las etiquetas de prosodia de Fish Audio.

## Importante: ventana gratuita de S2.1 Pro

Según la documentación de Fish Audio, el modelo `s2.1-pro-free` es gratis e
ilimitado (bajo Fair Use) **hasta el 31 de julio de 2026**. Hoy es 21 de julio,
o sea quedan ~10 días de esa ventana confirmada. Fish Audio dice que avisará
antes de cualquier cambio, pero si vas a construir algo para un cliente sobre
este modelo, vale la pena tener un plan B (plan de pago) por si el gratuito
no se extiende de nuevo.

## Windows / WSL

Si corres `./start.sh` con `bash` desde PowerShell, en realidad se ejecuta
dentro de tu WSL (Ubuntu/Debian). Si ves un error de `ensurepip`/`venv` la
primera vez, es porque a esa distro le falta el paquete del módulo venv.
El script ahora lo detecta solo e intenta arreglarlo automáticamente con
`apt` (te va a pedir tu contraseña de sudo, escríbela ahí mismo en la
terminal). Si aun así falla, corre esto dentro de la terminal de WSL
(no en PowerShell) y vuelve a intentar:

```bash
sudo apt update && sudo apt install python3-venv
```

## Estructura del proyecto

```
fish-audio-local/
  app.py              # backend Flask, hace de proxy hacia api.fish.audio
  templates/index.html
  static/css/style.css
  static/js/app.js
  static/audio/        # mp3/wav generados (se crea solo)
  config.json           # tu API key + voces guardadas (se crea al usar la app)
  history.json          # historial de generaciones (se crea al usar la app)
  start.sh
```

## Notas técnicas

- El header `model` (ej. `s2.1-pro-free`) y el body `{text, reference_id, format}`
  siguen exactamente el ejemplo de la documentación oficial de Fish Audio.
- Los campos `prosody.speed`, `prosody.volume` y `normalize` reflejan los
  controles que se ven en el playground web de Fish Audio (velocidad, volumen,
  normalización). Si Fish Audio cambia los nombres de estos parámetros en su
  API, la app te va a mostrar el error exacto que devuelva el servidor en el
  panel rojo debajo del editor — con eso ajustamos `app.py` en dos minutos.
- Sin base de datos, sin Docker, sin Node. Solo Python 3 + venv.
