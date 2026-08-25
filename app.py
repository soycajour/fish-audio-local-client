"""
Fish Audio Local — interfaz de escritorio para la API de Fish Audio (S2.1 Pro).
Corre un servidor Flask local en tu PC. La clave de API nunca sale de tu máquina,
salvo hacia api.fish.audio para generar el audio.
"""
import json
import os
import re
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

BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "static" / "audio"
DATA_DIR = BASE_DIR / "data"
CONFIG_PATH = DATA_DIR / "config.json"
HISTORY_PATH = DATA_DIR / "history.json"
TRASH_PATH = DATA_DIR / "trash.json"
FISH_TTS_URL = "https://api.fish.audio/v1/tts"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=BASE_DIR / 'app.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

rate_limit_store = defaultdict(list)
RATE_LIMIT = 15
RATE_LIMIT_WINDOW = 60

file_lock = threading.Lock()

DEFAULT_CONFIG = {
    "api_key": "",
    "voices": [],          # [{ "name": "Narrador v2", "reference_id": "xxxx" }]
    "default_model": "s2.1-pro-free",
    "format": "mp3",
    "speed": 1.0,
    "volume": 0.0,
    "normalize": True
}

app = Flask(__name__)


# ---------------------------------------------------------------- helpers --
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
    return cfg


def load_history():
    return load_json(HISTORY_PATH, [])


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
    # No mandamos la api_key completa de vuelta al front, solo si existe.
    safe = dict(cfg)
    safe["has_api_key"] = bool(cfg.get("api_key"))
    safe.pop("api_key", None)
    return jsonify(safe)


@app.route("/api/config", methods=["POST"])
def update_config():
    cfg = load_config()
    data = request.get_json(force=True) or {}

    if "api_key" in data and data["api_key"] is not None:
        cfg["api_key"] = data["api_key"].strip()
    if "default_model" in data and data["default_model"]:
        cfg["default_model"] = data["default_model"].strip()
    if "voices" in data and isinstance(data["voices"], list):
        cfg["voices"] = data["voices"]

    for field in ["format", "speed", "volume", "normalize"]:
        if field in data:
            cfg[field] = data[field]

    save_json(CONFIG_PATH, cfg)
    safe = dict(cfg)
    safe["has_api_key"] = bool(cfg.get("api_key"))
    safe.pop("api_key", None)
    return jsonify(safe)


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


# ---------------------------------------------------------------- history & trash --
@app.route("/api/history", methods=["GET"])
def get_history():
    history = load_history()
    # Devolver en orden cronológico (1º de primero, 2º de segundo, 3º de tercero...)
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
    if not api_key:
        return jsonify({"error": "Falta la clave de API. Agrégala en Ajustes."}), 400

    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "El texto está vacío."}), 400

    reference_id = data.get("reference_id") or ""
    model = "s2.1-pro-free"  # Forzado el modelo gratuito

    client_ip = request.remote_addr
    now = time.time()
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
        logger.warning(f"Rate limit excedido para IP: {client_ip}")
        return jsonify({"error": "Demasiadas peticiones. Intenta de nuevo en un minuto."}), 429
    rate_limit_store[client_ip].append(now)

    audio_format = data.get("format") or "mp3"
    speed = float(data.get("speed", 1.0) or 1.0)
    volume = float(data.get("volume", 0) or 0)
    normalize = bool(data.get("normalize", True))

    entry_id = uuid.uuid4().hex
    filename = f"{entry_id}.{audio_format}"

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
        "normalize": normalize
    }

    history = load_history()
    history.append(entry)
    save_json(HISTORY_PATH, history)

    def perform_generation():
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "model": model,
        }
        text_chunks = split_text_into_chunks(text, max_chars=220)
        audio_bytes_list = []
        audio_segments = []
        success = True
        error_msg = ""

        for chunk in text_chunks:
            body = {
                "text": chunk,
                "format": audio_format,
                "normalize": normalize,
                "prosody": {"speed": speed, "volume": volume},
            }
            if reference_id:
                body["reference_id"] = reference_id

            try:
                resp = requests.post(FISH_TTS_URL, headers=headers, json=body, timeout=120)
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
            except Exception as exc:
                success = False
                error_msg = str(exc)
                break

        if success:
            if len(audio_segments) == len(text_chunks) and len(audio_segments) > 0:
                try:
                    final_segment = audio_segments[0]
                    for seg in audio_segments[1:]:
                        final_segment += seg
                    out_f = io.BytesIO()
                    final_segment.export(out_f, format=audio_format)
                    final_audio = out_f.getvalue()
                except Exception as e:
                    logger.error(f"Fallo export pydub. Concatenando en crudo. Error: {e}")
                    final_audio = b"".join(audio_bytes_list)
            else:
                final_audio = b"".join(audio_bytes_list)

            try:
                with open(AUDIO_DIR / filename, "wb") as f:
                    f.write(final_audio)
            except Exception as e:
                success = False
                error_msg = f"No se pudo guardar el archivo final: {e}"

        # Actualizar historial
        hist = load_history()
        for idx, item in enumerate(hist):
            if item["id"] == entry_id:
                hist[idx]["status"] = "success" if success else "failed"
                if not success:
                    hist[idx]["error"] = error_msg
                break
        save_json(HISTORY_PATH, hist)

    # Iniciar hilo de generación
    threading.Thread(target=perform_generation, daemon=True).start()

    return jsonify({"entry": entry, "audio_url": f"/static/audio/{filename}"})


@app.route("/static/audio/<path:filename>")
def serve_audio(filename):
    safe_name = secure_filename(filename)
    if not safe_name or safe_name != filename:
        return "Invalid filename", 400
    return send_from_directory(AUDIO_DIR, safe_name)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    logger.info(f"Iniciando Fish Audio Local en puerto {port}")
    app.run(host="127.0.0.1", port=port, debug=False)

