"""
Fish Audio Local — interfaz de escritorio para la API de Fish Audio (S2.1 Pro).
Corre un servidor Flask local en tu PC. La clave de API nunca sale de tu máquina,
salvo hacia api.fish.audio para generar el audio.
"""
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path
import logging
from collections import defaultdict

from flask import Flask, jsonify, request, send_from_directory, render_template
import requests
from werkzeug.utils import secure_filename
import io
from pydub import AudioSegment

import threading

# Determinar rutas base compatibles con desarrollo y con PyInstaller (.exe)
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = Path(sys._MEIPASS)
    APP_DIR = Path(sys.executable).resolve().parent
else:
    BUNDLE_DIR = Path(__file__).resolve().parent
    APP_DIR = BUNDLE_DIR

TEMPLATE_DIR = BUNDLE_DIR / "templates"
STATIC_DIR = BUNDLE_DIR / "static"

DATA_DIR = APP_DIR / "data"
AUDIO_DIR = APP_DIR / "static" / "audio"
CONFIG_PATH = DATA_DIR / "config.json"
HISTORY_PATH = DATA_DIR / "history.json"
TRASH_PATH = DATA_DIR / "trash.json"
PROJECTS_PATH = DATA_DIR / "projects.json"
LOG_PATH = APP_DIR / "app.log"

FISH_TTS_URL = "https://api.fish.audio/v1/tts"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

rate_limit_store = defaultdict(list)
cancel_events = {}
RATE_LIMIT = 15
RATE_LIMIT_WINDOW = 60

file_lock = threading.Lock()

DEFAULT_CONFIG = {
    "api_key": "",
    "api_keys": [],        # ["fs_...", "fs_..."] Pool de múltiples claves
    "voices": [],          # [{ "name": "Narrador v2", "reference_id": "xxxx" }]
    "default_model": "s2.1-pro-free",
    "format": "mp3",
    "speed": 1.0,
    "volume": 0.0,
    "normalize": True,
    "active_project_id": "default",
    "active_part_id": "part-1"
}

DEFAULT_PROJECTS = [
    {
        "id": "default",
        "name": "General",
        "parts": [
            { "id": "part-1", "name": "Parte 1" }
        ],
        "created_at": 1725140000
    }
]

app = Flask(
    __name__,
    template_folder=str(TEMPLATE_DIR),
    static_folder=str(STATIC_DIR)
)

# Gestor de concurrencia y balanceo de carga para pool de API keys
key_in_flight = defaultdict(int)
key_lock = threading.Lock()


def acquire_api_key(cfg, exclude_keys=None):
    if exclude_keys is None:
        exclude_keys = set()
    with key_lock:
        keys = [k.strip() for k in cfg.get("api_keys", []) if isinstance(k, str) and k.strip() and k not in exclude_keys]
        if not keys and cfg.get("api_key") and cfg["api_key"].strip() not in exclude_keys:
            keys = [cfg["api_key"].strip()]
        if not keys:
            return None
        # Balanceo least-connections: selecciona la clave con menos peticiones activas
        chosen_key = min(keys, key=lambda k: key_in_flight[k])
        key_in_flight[chosen_key] += 1
        return chosen_key


def release_api_key(key):
    if not key:
        return
    with key_lock:
        key_in_flight[key] = max(0, key_in_flight[key] - 1)


# ---------------------------------------------------------------- helpers --
def get_file_duration(filename: str) -> float:
    """Calcula la duración real de un archivo de audio en segundos."""
    audio_path = AUDIO_DIR / filename
    if not audio_path.exists():
        return 0.0
    try:
        seg = AudioSegment.from_file(audio_path)
        return round(seg.duration_seconds, 1)
    except Exception:
        return 0.0


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        with file_lock:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def save_json(path: Path, data):
    with file_lock:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def load_config():
    cfg = load_json(CONFIG_PATH, dict(DEFAULT_CONFIG))
    for key, value in DEFAULT_CONFIG.items():
        cfg.setdefault(key, value)
    
    # Asegurar y sincronizar api_keys y api_key
    if not isinstance(cfg.get("api_keys"), list):
        cfg["api_keys"] = []
    if cfg.get("api_key") and cfg["api_key"] not in cfg["api_keys"]:
        cfg["api_keys"].insert(0, cfg["api_key"])
    if not cfg.get("api_key") and cfg["api_keys"]:
        cfg["api_key"] = cfg["api_keys"][0]
    return cfg


def load_projects():
    projects = load_json(PROJECTS_PATH, list(DEFAULT_PROJECTS))
    if not projects:
        projects = list(DEFAULT_PROJECTS)
        save_projects(projects)
    return projects


def save_projects(data):
    save_json(PROJECTS_PATH, data)


def load_history():
    items = load_json(HISTORY_PATH, [])
    updated = False
    for item in items:
        if "project_id" not in item:
            item["project_id"] = "default"
            updated = True
        if "part_id" not in item:
            item["part_id"] = "part-1"
            updated = True
        if "order_index" not in item:
            item["order_index"] = 1
            updated = True
        # Auto-migrar duración para audios generados previamente
        if ("duration" not in item or not item["duration"]) and item.get("status") == "success" and item.get("filename"):
            dur = get_file_duration(item["filename"])
            if dur > 0:
                item["duration"] = dur
                updated = True
    if updated:
        save_json(HISTORY_PATH, items)
    return items


def load_trash():
    return load_json(TRASH_PATH, [])


def save_trash(data):
    save_json(TRASH_PATH, data)


# ------------------------------------------------------------------ pages --
@app.route("/")
def index():
    return render_template("index.html")


# ----------------------------------------------------------------- config --
@app.route("/api/config", methods=["GET"])
def get_config():
    cfg = load_config()
    safe = dict(cfg)
    keys = [k for k in cfg.get("api_keys", []) if k]
    safe["has_api_key"] = bool(keys or cfg.get("api_key"))
    safe["api_keys_count"] = len(keys)
    safe["max_concurrent_jobs"] = max(5, len(keys) * 5)
    safe["api_keys_list"] = [
        {"index": idx, "preview": f"{k[:6]}...{k[-4:]}" if len(k) > 12 else "fs_***"}
        for idx, k in enumerate(keys)
    ]
    safe.pop("api_key", None)
    safe.pop("api_keys", None)
    return jsonify(safe)


@app.route("/api/config", methods=["POST"])
def update_config():
    cfg = load_config()
    data = request.get_json(force=True) or {}

    if "api_key" in data and data["api_key"] is not None:
        key = data["api_key"].strip()
        if key:
            if key not in cfg["api_keys"]:
                cfg["api_keys"].append(key)
            cfg["api_key"] = key

    if "api_keys" in data and isinstance(data["api_keys"], list):
        cfg["api_keys"] = [k.strip() for k in data["api_keys"] if isinstance(k, str) and k.strip()]
        cfg["api_key"] = cfg["api_keys"][0] if cfg["api_keys"] else ""

    if "default_model" in data and data["default_model"]:
        cfg["default_model"] = data["default_model"].strip()
    if "voices" in data and isinstance(data["voices"], list):
        cfg["voices"] = data["voices"]

    for field in ["format", "speed", "volume", "normalize", "active_project_id", "active_part_id"]:
        if field in data:
            cfg[field] = data[field]

    save_json(CONFIG_PATH, cfg)
    return get_config()


@app.route("/api/config/keys", methods=["POST"])
def add_api_key():
    cfg = load_config()
    data = request.get_json(force=True) or {}
    key = (data.get("api_key") or "").strip()
    if not key:
        return jsonify({"error": "La clave de API no puede estar vacía."}), 400
    if key not in cfg["api_keys"]:
        cfg["api_keys"].append(key)
    cfg["api_key"] = cfg["api_keys"][0]
    save_json(CONFIG_PATH, cfg)
    return get_config()


@app.route("/api/config/keys/<int:key_index>", methods=["DELETE"])
def delete_api_key(key_index):
    cfg = load_config()
    if 0 <= key_index < len(cfg["api_keys"]):
        removed = cfg["api_keys"].pop(key_index)
        release_api_key(removed)
        cfg["api_key"] = cfg["api_keys"][0] if cfg["api_keys"] else ""
        save_json(CONFIG_PATH, cfg)
    return get_config()


@app.route("/api/voices", methods=["POST"])
def add_voice():
    cfg = load_config()
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    reference_id = (data.get("reference_id") or "").strip()
    if not name or not reference_id:
        return jsonify({"error": "Nombre y reference_id son obligatorios."}), 400

    cfg["voices"].append({"name": name, "reference_id": reference_id})
    save_json(CONFIG_PATH, cfg)
    return jsonify(cfg["voices"])


@app.route("/api/voices/<int:index>", methods=["DELETE"])
def delete_voice(index):
    cfg = load_config()
    if 0 <= index < len(cfg["voices"]):
        cfg["voices"].pop(index)
        save_json(CONFIG_PATH, cfg)
    return jsonify(cfg["voices"])


# --------------------------------------------------------------- projects --
@app.route("/api/projects", methods=["GET"])
def get_projects():
    projects = load_projects()
    return jsonify(projects)


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "El nombre del proyecto no puede estar vacío."}), 400

    projects = load_projects()
    proj_id = f"proj-{uuid.uuid4().hex[:8]}"
    new_project = {
        "id": proj_id,
        "name": name,
        "parts": [
            {"id": "part-1", "name": "Parte 1"}
        ],
        "created_at": time.time()
    }
    projects.append(new_project)
    save_projects(projects)
    return jsonify({"project": new_project, "projects": projects})


@app.route("/api/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    projects = load_projects()
    proj = next((p for p in projects if p["id"] == project_id), None)
    if not proj:
        return jsonify({"error": "Proyecto no encontrado."}), 404

    if name:
        proj["name"] = name
    save_projects(projects)
    return jsonify({"project": proj, "projects": projects})


@app.route("/api/projects/<project_id>/parts", methods=["POST"])
def add_project_part(project_id):
    data = request.get_json(force=True) or {}
    projects = load_projects()
    proj = next((p for p in projects if p["id"] == project_id), None)
    if not proj:
        return jsonify({"error": "Proyecto no encontrado."}), 404

    part_number = len(proj["parts"]) + 1
    default_name = f"Parte {part_number}"
    name = (data.get("name") or "").strip() or default_name
    part_id = f"part-{uuid.uuid4().hex[:8]}"

    new_part = {"id": part_id, "name": name}
    proj["parts"].append(new_part)
    save_projects(projects)
    return jsonify({"part": new_part, "project": proj, "projects": projects})


@app.route("/api/projects/<project_id>/parts/<part_id>", methods=["DELETE"])
def delete_project_part(project_id, part_id):
    projects = load_projects()
    proj = next((p for p in projects if p["id"] == project_id), None)
    if not proj:
        return jsonify({"error": "Proyecto no encontrado."}), 404

    if len(proj["parts"]) <= 1:
        return jsonify({"error": "No puedes eliminar la única parte de un proyecto."}), 400

    proj["parts"] = [p for p in proj["parts"] if p["id"] != part_id]
    save_projects(projects)
    return jsonify({"project": proj, "projects": projects})


@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    projects = load_projects()
    if len(projects) <= 1:
        return jsonify({"error": "No puedes eliminar el único proyecto disponible."}), 400

    projects = [p for p in projects if p["id"] != project_id]
    save_projects(projects)
    return jsonify({"projects": projects})


# ---------------------------------------------------------------- history & trash --
@app.route("/api/history", methods=["GET"])
def get_history():
    history = load_history()
    project_id = request.args.get("project_id")
    part_id = request.args.get("part_id")

    if project_id:
        history = [h for h in history if h.get("project_id", "default") == project_id]
    if part_id:
        history = [h for h in history if h.get("part_id", "part-1") == part_id]

    return jsonify(history)


@app.route("/api/history/<entry_id>/trash", methods=["POST"])
@app.route("/api/history/<entry_id>", methods=["DELETE"])
def move_to_trash(entry_id):
    history = load_history()
    trash = load_trash()
    entry = next((h for h in history if h["id"] == entry_id), None)
    if entry:
        history = [h for h in history if h["id"] != entry_id]
        entry["trashed_at"] = time.time()
        trash.append(entry)
        save_json(HISTORY_PATH, history)
        save_json(TRASH_PATH, trash)
    return jsonify({"ok": True})


@app.route("/api/trash", methods=["GET"])
def get_trash():
    trash = load_trash()
    return jsonify(trash)


@app.route("/api/trash/<entry_id>/restore", methods=["POST"])
def restore_from_trash(entry_id):
    history = load_history()
    trash = load_trash()
    entry = next((t for t in trash if t["id"] == entry_id), None)
    if entry:
        trash = [t for t in trash if t["id"] != entry_id]
        entry.pop("trashed_at", None)
        history.append(entry)
        history.sort(key=lambda x: x.get("timestamp", 0))
        save_json(HISTORY_PATH, history)
        save_json(TRASH_PATH, trash)
    return jsonify({"ok": True})


@app.route("/api/trash/<entry_id>", methods=["DELETE"])
def permanent_delete(entry_id):
    trash = load_trash()
    entry = next((t for t in trash if t["id"] == entry_id), None)
    
    if entry:
        audio_path = AUDIO_DIR / entry["filename"]
        if audio_path.exists():
            try:
                audio_path.unlink()
            except OSError:
                pass
        trash = [t for t in trash if t["id"] != entry_id]
        save_json(TRASH_PATH, trash)
    else:
        history = load_history()
        entry_hist = next((h for h in history if h["id"] == entry_id), None)
        if entry_hist:
            audio_path = AUDIO_DIR / entry_hist["filename"]
            if audio_path.exists():
                try:
                    audio_path.unlink()
                except OSError:
                    pass
            history = [h for h in history if h["id"] != entry_id]
            save_json(HISTORY_PATH, history)

    return jsonify({"ok": True})


@app.route("/api/trash/empty", methods=["POST"])
def empty_trash():
    trash = load_trash()
    for entry in trash:
        audio_path = AUDIO_DIR / entry["filename"]
        if audio_path.exists():
            try:
                audio_path.unlink()
            except OSError:
                pass
    save_json(TRASH_PATH, [])
    return jsonify({"ok": True})


# ------------------------------------------------------------- chunking --
def split_text_into_chunks(text: str, max_chars: int = 220) -> list:
    text = text.strip()
    if not text or len(text) <= max_chars:
        return [text] if text else []

    paragraphs = [p.strip() for p in re.split(r'\n+', text) if p.strip()]
    chunks = []

    for para in paragraphs:
        if len(para) <= max_chars:
            chunks.append(para)
            continue

        sentences = re.split(r'(?<=[.!?;\n])\s+', para)
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            if not current_chunk:
                current_chunk = sentence
            elif len(current_chunk) + 1 + len(sentence) <= max_chars:
                current_chunk += " " + sentence
            else:
                chunks.append(current_chunk)
                current_chunk = sentence

            while len(current_chunk) > max_chars:
                sub_parts = re.split(r'(?<=[,;])\s+', current_chunk)
                if len(sub_parts) > 1:
                    sub_chunk = ""
                    leftover = []
                    for part in sub_parts:
                        if not sub_chunk or (len(sub_chunk) + 1 + len(part) <= max_chars):
                            sub_chunk = (sub_chunk + " " + part).strip() if sub_chunk else part
                        else:
                            leftover.append(part)
                    if sub_chunk:
                        chunks.append(sub_chunk)
                    current_chunk = " ".join(leftover).strip()
                else:
                    space_idx = current_chunk.rfind(" ", 0, max_chars)
                    if space_idx > 0:
                        chunks.append(current_chunk[:space_idx].strip())
                        current_chunk = current_chunk[space_idx:].strip()
                    else:
                        chunks.append(current_chunk[:max_chars])
                        current_chunk = current_chunk[max_chars:]

        if current_chunk:
            chunks.append(current_chunk)

    return chunks


# --------------------------------------------------------------- generate --
@app.route("/api/generate", methods=["POST"])
def generate():
    cfg = load_config()
    api_key = cfg.get("api_key")
    api_keys = [k for k in cfg.get("api_keys", []) if k]
    if not api_key and not api_keys:
        return jsonify({"error": "Falta la clave de API. Agrégala en Ajustes."}), 400

    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "El texto está vacío."}), 400

    reference_id = data.get("reference_id") or ""
    model = "s2.1-pro-free"  # Modelo gratuito de Fish Audio

    client_ip = request.remote_addr
    now = time.time()
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    effective_rate_limit = max(15, len(api_keys) * 15)
    if len(rate_limit_store[client_ip]) >= effective_rate_limit:
        logger.warning(f"Rate limit excedido para IP: {client_ip}")
        return jsonify({"error": "Demasiadas peticiones. Intenta de nuevo en un minuto."}), 429
    rate_limit_store[client_ip].append(now)

    audio_format = data.get("format") or "mp3"
    speed = float(data.get("speed", 1.0) or 1.0)
    volume = float(data.get("volume", 0) or 0)
    normalize = bool(data.get("normalize", True))

    project_id = data.get("project_id") or cfg.get("active_project_id") or "default"
    part_id = data.get("part_id") or cfg.get("active_part_id") or "part-1"

    entry_id = uuid.uuid4().hex
    filename = f"{entry_id}.{audio_format}"

    history = load_history()
    # Calcular orden consecutivo dentro de este proyecto y parte
    part_items = [h for h in history if h.get("project_id", "default") == project_id and h.get("part_id", "part-1") == part_id]
    order_index = len(part_items) + 1

    # Crear entrada en historial con estado "pending"
    entry = {
        "id": entry_id,
        "text": text,
        "reference_id": reference_id,
        "model": model,
        "format": audio_format,
        "filename": filename,
        "timestamp": now,
        "status": "pending",
        "speed": speed,
        "volume": volume,
        "normalize": normalize,
        "project_id": project_id,
        "part_id": part_id,
        "order_index": order_index
    }

    history.append(entry)
    save_json(HISTORY_PATH, history)

    def perform_generation():
        failed_keys = set()
        active_key = acquire_api_key(cfg, failed_keys) or api_key

        text_chunks = split_text_into_chunks(text, max_chars=220)
        audio_bytes_list = []
        audio_segments = []
        success = True
        error_msg = ""

        try:
            for chunk in text_chunks:
                if cancel_events[entry_id].is_set():
                    success = False
                    error_msg = "Cancelado por el usuario"
                    break
                body = {
                    "text": chunk,
                    "format": audio_format,
                    "normalize": normalize,
                    "prosody": {"speed": speed, "volume": volume},
                }
                if reference_id:
                    body["reference_id"] = reference_id

                chunk_ok = False
                max_attempts = max(1, len(api_keys))
                for attempt in range(max_attempts):
                    headers = {
                        "Authorization": f"Bearer {active_key}",
                        "Content-Type": "application/json",
                        "model": model,
                    }
                    try:
                        resp = requests.post(FISH_TTS_URL, headers=headers, json=body, timeout=120)
                        if resp.status_code == 429 and len(api_keys) > 1:
                            logger.warning(f"Clave {active_key[:6]}... alcanzó límite 429. Rotando a otra clave...")
                            failed_keys.add(active_key)
                            release_api_key(active_key)
                            active_key = acquire_api_key(cfg, failed_keys)
                            if not active_key:
                                error_msg = "Límite de cuota excedido (429) en todas las claves de API."
                                break
                            continue

                        if not resp.ok:
                            success = False
                            try:
                                detail = resp.json()
                                error_msg = detail.get("detail", resp.text)
                            except ValueError:
                                error_msg = resp.text
                            break

                        audio_bytes_list.append(resp.content)
                        try:
                            segment = AudioSegment.from_file(io.BytesIO(resp.content), format=audio_format)
                            audio_segments.append(segment)
                        except Exception as e:
                            logger.error(f"Error procesando chunk con pydub: {e}")
                        chunk_ok = True
                        break
                    except Exception as exc:
                        success = False
                        error_msg = str(exc)
                        break

                if not chunk_ok:
                    success = False
                    break
        finally:
            release_api_key(active_key)

        calc_duration = 0.0
        if success:
            if len(audio_segments) == len(text_chunks) and len(audio_segments) > 0:
                try:
                    final_segment = audio_segments[0]
                    for seg in audio_segments[1:]:
                        final_segment += seg
                    out_f = io.BytesIO()
                    final_segment.export(out_f, format=audio_format)
                    final_audio = out_f.getvalue()
                    calc_duration = round(final_segment.duration_seconds, 1)
                except Exception as e:
                    logger.error(f"Fallo export pydub. Concatenando en crudo. Error: {e}")
                    final_audio = b"".join(audio_bytes_list)
            else:
                final_audio = b"".join(audio_bytes_list)

            try:
                with open(AUDIO_DIR / filename, "wb") as f:
                    f.write(final_audio)
                if calc_duration <= 0:
                    calc_duration = get_file_duration(filename)
            except Exception as e:
                success = False
                error_msg = f"No se pudo guardar el archivo final: {e}"

        # Actualizar historial
        hist = load_history()
        for idx, item in enumerate(hist):
            if item["id"] == entry_id:
                hist[idx]["status"] = "success" if success else "failed"
                if success:
                    hist[idx]["duration"] = calc_duration
                else:
                    hist[idx]["error"] = error_msg
                break
        save_json(HISTORY_PATH, hist)
        cancel_events.pop(entry_id, None)

    cancel_events[entry_id] = threading.Event()
    threading.Thread(target=perform_generation, daemon=True).start()

    return jsonify({"entry": entry, "audio_url": f"/static/audio/{filename}"})


@app.route("/api/generate/<entry_id>/cancel", methods=["POST"])
def cancel_generation(entry_id):
    if entry_id in cancel_events:
        cancel_events[entry_id].set()
        return jsonify({"success": True, "message": "Cancelación solicitada."})
    return jsonify({"error": "Proceso no encontrado o ya terminó."}), 404


@app.route("/static/audio/<path:filename>")
def serve_audio(filename):
    safe_name = secure_filename(filename)
    if not safe_name or safe_name != filename:
        return "Invalid filename", 400
    return send_from_directory(AUDIO_DIR, safe_name)


def startup_cleanup():
    hist = load_history()
    changed = False
    for item in hist:
        if item.get("status") == "pending":
            item["status"] = "failed"
            item["error"] = "Cancelado (Servidor reiniciado)"
            changed = True
    if changed:
        save_json(HISTORY_PATH, hist)
        logger.info("Limpiados procesos zombis en el historial.")


import webbrowser


def open_browser(port):
    time.sleep(1.2)
    try:
        webbrowser.open(f"http://127.0.0.1:{port}")
    except Exception:
        pass


if __name__ == "__main__":
    startup_cleanup()
    port = int(os.environ.get("PORT", 5050))
    logger.info(f"Iniciando Fish Audio Local en puerto {port}")
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    app.run(host="127.0.0.1", port=port, debug=False)
