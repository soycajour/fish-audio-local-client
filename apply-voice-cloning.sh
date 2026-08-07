#!/usr/bin/env bash
# Apply voice cloning feature to Fish Audio Local
set -e

cd "$(dirname "$0")"

echo "=== Aplicando feature de clonación de voz ==="
echo ""

# --- patch app.py ---
echo "📝 Parchando app.py..."
python3 << 'PYTHON_PATCH'
import re

with open("app.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find and replace the /api/generate endpoint
old_generate = r'''@app\.route\("/api/generate", methods=\["POST"\]\)
def generate\(\):
    cfg = load_config\(\)
    api_key = cfg\.get\("api_key"\)
    if not api_key:
        return jsonify\(\{"error": "Falta la clave de API\. Agrégala en Ajustes\."\}\), 400

    data = request\.get_json\(force=True\) or \{\}
    text = \(data\.get\("text"\) or ""\)\.strip\(\)
    if not text:
        return jsonify\(\{"error": "El texto está vacío\."\}\), 400

    reference_id = data\.get\("reference_id"\) or ""
    model = data\.get\("model"\) or cfg\.get\("default_model", "s2\.1-pro-free"\)
    audio_format = data\.get\("format"\) or "mp3"
    speed = float\(data\.get\("speed", 1\.0\) or 1\.0\)
    volume = float\(data\.get\("volume", 0\) or 0\)
    normalize = bool\(data\.get\("normalize", True\)\)

    body = \{
        "text": text,
        "format": audio_format,
        "normalize": normalize,
        "prosody": \{"speed": speed, "volume": volume\},
    \}
    if reference_id:
        body\["reference_id"\] = reference_id'''

new_generate = '''@app.route("/api/generate", methods=["POST"])
def generate():
    cfg = load_config()
    api_key = cfg.get("api_key")
    if not api_key:
        return jsonify({"error": "Falta la clave de API. Agrégala en Ajustes."}), 400

    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "El texto está vacío."}), 400

    reference_id = data.get("reference_id") or ""
    reference_audio = data.get("reference_audio")  # base64 + mime type: {"data": "...", "text": "..."}
    model = data.get("model") or cfg.get("default_model", "s2.1-pro-free")
    audio_format = data.get("format") or "mp3"
    speed = float(data.get("speed", 1.0) or 1.0)
    volume = float(data.get("volume", 0) or 0)
    normalize = bool(data.get("normalize", True))

    body = {
        "text": text,
        "format": audio_format,
        "normalize": normalize,
        "prosody": {"speed": speed, "volume": volume},
    }
    
    # Si mandas reference_id, usa eso (voz guardada)
    if reference_id:
        body["reference_id"] = reference_id
    # Si mandas reference_audio (instant clone), úsalo
    elif reference_audio and isinstance(reference_audio, dict):
        body["references"] = [{
            "audio": reference_audio.get("data", ""),
            "text": reference_audio.get("text", ""),
        }]'''

if re.search(old_generate, content):
    content = re.sub(old_generate, new_generate, content)
    print("✓ app.py actualizado (endpoint /api/generate)")
else:
    print("⚠ No se encontró el patrón exacto, intentando reemplazo manual...")
    if "reference_audio = data.get" not in content:
        # Buscar la línea de reference_id y agregar reference_audio después
        content = content.replace(
            'reference_id = data.get("reference_id") or ""',
            'reference_id = data.get("reference_id") or ""\n    reference_audio = data.get("reference_audio")  # base64 + mime type: {"data": "...", "text": "..."}'
        )
        # Reemplazar la lógica de body
        content = content.replace(
            '''    if reference_id:
        body["reference_id"] = reference_id''',
            '''    # Si mandas reference_id, usa eso (voz guardada)
    if reference_id:
        body["reference_id"] = reference_id
    # Si mandas reference_audio (instant clone), úsalo
    elif reference_audio and isinstance(reference_audio, dict):
        body["references"] = [{
            "audio": reference_audio.get("data", ""),
            "text": reference_audio.get("text", ""),
        }]'''
        )
        print("✓ app.py actualizado (reemplazo manual)")

with open("app.py", "w", encoding="utf-8") as f:
    f.write(content)

PYTHON_PATCH

# --- patch templates/index.html ---
echo "📝 Parchando templates/index.html..."
python3 << 'PYTHON_PATCH'
import re

with open("templates/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Agregar botón de clonar voz después de tagEmphasisBtn
if "cloneVoiceToggleBtn" not in content:
    content = content.replace(
        '        </button>\n      </div>\n\n      <textarea id="textInput"',
        '''        </button>
        <button id="cloneVoiceToggleBtn" class="tag-btn" title="Clonar una voz al vuelo (sin guardarla)">
          🎙️ clonar voz
        </button>
      </div>

      <!-- Panel de clonación (hidden por defecto) -->
      <div id="cloneVoicePanel" class="clone-panel hidden">
        <div class="clone-header">
          <span>Clonar voz al vuelo</span>
          <button id="cloneVoicePanelCloseBtn" class="clone-close">✕</button>
        </div>
        <p class="clone-hint">Sube una muestra de audio (10-30 seg) para que Fish Audio la use como referencia en esta generación.</p>
        <input id="cloneVoiceFile" type="file" accept="audio/wav,audio/mp3,audio/m4a,audio/opus,.wav,.mp3,.m4a,.opus" />
        <input id="cloneVoiceTranscript" type="text" placeholder="(Opcional) Qué se dice en el audio" />
        <button id="cloneVoiceReadyBtn" class="mini-btn">Listo</button>
        <div id="cloneVoiceStatus" class="clone-status"></div>
      </div>

      <textarea id="textInput"'''
    )
    print("✓ templates/index.html actualizado (panel de clonación agregado)")

# Agregar label de voz clonada al playerBar
if "cloneVoiceUsedLabel" not in content:
    content = content.replace(
        '      <a id="downloadLink" class="download-btn" download title="Descargar audio">⬇</a>\n    </div>',
        '      <a id="downloadLink" class="download-btn" download title="Descargar audio">⬇</a>\n      <span id="cloneVoiceUsedLabel" class="clone-used-label hidden">🎙️ voz clonada</span>\n    </div>'
    )
    print("✓ templates/index.html actualizado (label de voz clonada agregado)")

with open("templates/index.html", "w", encoding="utf-8") as f:
    f.write(content)

PYTHON_PATCH

# --- patch static/css/style.css ---
echo "📝 Parchando static/css/style.css..."
if ! grep -q "clone-panel" static/css/style.css; then
cat >> static/css/style.css << 'CSS_PATCH'

/* --------------------------------------------------------- clone panel -- */
.clone-panel {
  background: #fffaf0;
  border: 1px solid #ffd6ad;
  border-radius: var(--radius-sm);
  margin-top: 12px;
  padding: 12px;
}
.clone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13.5px;
  margin-bottom: 8px;
}
.clone-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
}
.clone-close:hover { color: var(--text); }
.clone-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.4; }
.clone-panel input[type="file"],
.clone-panel input[type="text"] {
  width: 100%;
  margin-bottom: 8px;
  border: 1px solid #ffc988;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-size: 12.5px;
}
.clone-status { font-size: 11.5px; color: var(--text-muted); margin-top: 6px; }
.clone-used-label { font-size: 11px; color: #d97757; font-weight: 600; }
CSS_PATCH
  echo "✓ static/css/style.css actualizado (estilos de clonación agregados)"
else
  echo "⚠ static/css/style.css ya tiene estilos de clonación, saltando..."
fi

# --- patch static/js/app.js ---
echo "📝 Parchando static/js/app.js..."
if ! grep -q "cloneVoiceData" static/js/app.js; then
cat > /tmp/js_patch.js << 'JS_PATCH'
// --------------------------------------------------------- clone voice --
let cloneVoiceData = null;

els.cloneVoiceToggleBtn = document.getElementById('cloneVoiceToggleBtn');
els.cloneVoicePanel = document.getElementById('cloneVoicePanel');
els.cloneVoicePanelCloseBtn = document.getElementById('cloneVoicePanelCloseBtn');
els.cloneVoiceFile = document.getElementById('cloneVoiceFile');
els.cloneVoiceTranscript = document.getElementById('cloneVoiceTranscript');
els.cloneVoiceReadyBtn = document.getElementById('cloneVoiceReadyBtn');
els.cloneVoiceStatus = document.getElementById('cloneVoiceStatus');
els.cloneVoiceUsedLabel = document.getElementById('cloneVoiceUsedLabel');

els.cloneVoiceToggleBtn.addEventListener('click', () => {
  els.cloneVoicePanel.classList.toggle('hidden');
  if (!els.cloneVoicePanel.classList.contains('hidden')) {
    els.cloneVoiceFile.focus();
  }
});

els.cloneVoicePanelCloseBtn.addEventListener('click', () => {
  els.cloneVoicePanel.classList.add('hidden');
});

els.cloneVoiceReadyBtn.addEventListener('click', async () => {
  const file = els.cloneVoiceFile.files[0];
  if (!file) { els.cloneVoiceStatus.textContent = 'Selecciona un archivo de audio.'; return; }
  
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    cloneVoiceData = {
      data: base64,
      text: els.cloneVoiceTranscript.value.trim(),
    };
    els.cloneVoiceStatus.textContent = `✓ Audio cargado (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    els.cloneVoicePanel.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});
JS_PATCH

  python3 << 'PYTHON_PATCH'
# Insertar el código de clonación antes de generate()
with open("static/js/app.js", "r", encoding="utf-8") as f:
    content = f.read()

with open("/tmp/js_patch.js", "r") as f:
    clone_code = f.read()

# Buscar la función generate() e insertar antes
if "async function generate()" in content:
    content = content.replace(
        "async function generate()",
        clone_code + "\n\n// ------------------------------------------------------------- generate --\nasync function generate()"
    )
    
    # Reemplazar la lógica de payload en generate()
    old_payload = '''    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        reference_id: els.voiceSelect.value,
        model: currentModel(),
        format: els.formatSelect.value,
        speed: parseFloat(els.speedRange.value),
        volume: parseFloat(els.volumeRange.value),
        normalize: els.normalizeToggle.checked,
      }),
    });'''
    
    new_payload = '''    const payload = {
      text,
      reference_id: els.voiceSelect.value,
      model: currentModel(),
      format: els.formatSelect.value,
      speed: parseFloat(els.speedRange.value),
      volume: parseFloat(els.volumeRange.value),
      normalize: els.normalizeToggle.checked,
    };
    if (cloneVoiceData) {
      payload.reference_audio = cloneVoiceData;
    }

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });'''
    
    content = content.replace(old_payload, new_payload)
    
    # Actualizar playAudio para mostrar el label
    old_play = '''function playAudio(url) {
  els.audioPlayer.src = url;
  els.downloadLink.href = url;
  els.playerBar.classList.remove('hidden');
  els.audioPlayer.play();
  els.playBtn.textContent = '⏸';
}'''
    
    new_play = '''function playAudio(url) {
  els.audioPlayer.src = url;
  els.downloadLink.href = url;
  els.playerBar.classList.remove('hidden');
  
  // Mostrar si se usó voz clonada
  if (cloneVoiceData) {
    els.cloneVoiceUsedLabel.classList.remove('hidden');
  } else {
    els.cloneVoiceUsedLabel.classList.add('hidden');
  }
  
  els.audioPlayer.play();
  els.playBtn.textContent = '⏸';
}'''
    
    content = content.replace(old_play, new_play)
    
    with open("static/js/app.js", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✓ static/js/app.js actualizado (lógica de clonación agregada)")
else:
    print("⚠ No se encontró generate(), saltando...")

PYTHON_PATCH
else
  echo "⚠ static/js/app.js ya tiene clonación, saltando..."
fi

echo ""
echo "✅ Clonación de voz aplicada exitosamente"
echo ""
echo "Ahora podes:"
echo "  1. Click en 🎙️ clonar voz"
echo "  2. Subir un audio (10-30 seg)"
echo "  3. Generar texto con esa voz clonada"
echo ""
echo "Para correr la app: ./start.sh"
