const MAX_CONCURRENT_JOBS = 5;
let activeJobsCount = 0;
let currentPlayingAudio = null;
let currentPlayingBtn = null;

const els = {
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),
  textInput: document.getElementById('textInput'),
  charCount: document.getElementById('charCount'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnLabel: document.getElementById('generateBtnLabel'),
  tagEmphasisBtn: document.getElementById('tagEmphasisBtn'),
  voiceSelect: document.getElementById('voiceSelect'),
  errorBox: document.getElementById('errorBox'),

  queueBadge: document.getElementById('queueBadge'),
  audioCardsContainer: document.getElementById('audioCardsContainer'),
  resultsEmpty: document.getElementById('resultsEmpty'),
  audioCountBadge: document.getElementById('audioCountBadge'),

  apiKeyInput: document.getElementById('apiKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  modelSelect: document.getElementById('modelSelect'),
  modelCustomInput: document.getElementById('modelCustomInput'),
  voiceList: document.getElementById('voiceList'),
  newVoiceName: document.getElementById('newVoiceName'),
  newVoiceId: document.getElementById('newVoiceId'),
  addVoiceBtn: document.getElementById('addVoiceBtn'),
  formatSelect: document.getElementById('formatSelect'),
  speedRange: document.getElementById('speedRange'),
  speedVal: document.getElementById('speedVal'),
  volumeRange: document.getElementById('volumeRange'),
  volumeVal: document.getElementById('volumeVal'),
  normalizeToggle: document.getElementById('normalizeToggle'),

  historyEmpty: document.getElementById('historyEmpty'),
  historyList: document.getElementById('historyList'),

  trashCountBadge: document.getElementById('trashCountBadge'),
  trashEmpty: document.getElementById('trashEmpty'),
  trashList: document.getElementById('trashList'),
  emptyTrashBtn: document.getElementById('emptyTrashBtn'),
};

let state = { voices: [], hasApiKey: false };
let totalGeneratedAudios = 0;

// ------------------------------------------------------------------ tabs --
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'historia') loadHistory();
    if (btn.dataset.tab === 'papelera') loadTrash();
  });
});

// -------------------------------------------------------------- char cnt --
els.textInput.addEventListener('input', () => {
  els.charCount.textContent = `${els.textInput.value.length} caracteres`;
});

// ----------------------------------------------------------- emphasis tag --
els.tagEmphasisBtn.addEventListener('click', () => {
  const el = els.textInput;
  const start = el.selectionStart, end = el.selectionEnd;
  const selected = el.value.slice(start, end) || 'texto';
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = `${before}[énfasis]${selected}[/énfasis]${after}`;
  el.focus();
  els.charCount.textContent = `${el.value.length} caracteres`;
});

// ------------------------------------------------------------------ modal --
function showConfirmModal({ title, message, confirmText, isDanger = true, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title || 'Confirmación';
  document.getElementById('confirmModalText').textContent = message;
  const okBtn = document.getElementById('confirmModalOkBtn');
  okBtn.textContent = confirmText || 'Aceptar';
  okBtn.className = `modal-btn ${isDanger ? 'danger-btn' : 'secondary-btn'}`;

  modal.classList.remove('hidden');

  const close = () => modal.classList.add('hidden');

  const handleOk = async () => {
    close();
    cleanup();
    if (onConfirm) await onConfirm();
  };

  const handleCancel = () => {
    close();
    cleanup();
  };

  const cleanup = () => {
    okBtn.removeEventListener('click', handleOk);
    document.getElementById('confirmModalCancelBtn').removeEventListener('click', handleCancel);
    document.getElementById('confirmModalCloseBtn').removeEventListener('click', handleCancel);
  };

  okBtn.addEventListener('click', handleOk);
  document.getElementById('confirmModalCancelBtn').addEventListener('click', handleCancel);
  document.getElementById('confirmModalCloseBtn').addEventListener('click', handleCancel);
}

// ------------------------------------------------------------------ init --
async function init() {
  const cfg = await fetchJSON('/api/config');
  state.hasApiKey = cfg.has_api_key;
  state.voices = cfg.voices || [];
  updateApiStatus();
  renderVoices();
  if (cfg.default_model) {
    const opt = [...els.modelSelect.options].find(o => o.value === cfg.default_model);
    if (opt) els.modelSelect.value = cfg.default_model;
    else {
      els.modelSelect.value = 'custom';
      els.modelCustomInput.classList.remove('hidden');
      els.modelCustomInput.value = cfg.default_model;
    }
  }
  await loadInitialResults();
  await loadTrash();
}

function updateApiStatus() {
  if (state.hasApiKey) {
    els.apiStatusDot.className = 'status-dot status-ok';
    els.apiStatusText.textContent = 'Clave de API configurada';
  } else {
    els.apiStatusDot.className = 'status-dot status-bad';
    els.apiStatusText.textContent = 'Falta clave de API — ve a Ajustes';
  }
}

// --------------------------------------------------------------- voices --
function renderVoices() {
  els.voiceList.innerHTML = '';
  els.voiceSelect.innerHTML = '<option value="">Voz por defecto del modelo</option>';
  state.voices.forEach((v, i) => {
    const chip = document.createElement('div');
    chip.className = 'voice-chip';
    chip.innerHTML = `
      <span><span class="voice-chip-name">${escapeHtml(v.name)}</span> —
      <span class="voice-chip-id">${escapeHtml(v.reference_id)}</span></span>
      <button data-i="${i}" title="Eliminar">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => deleteVoice(i));
    els.voiceList.appendChild(chip);

    const opt = document.createElement('option');
    opt.value = v.reference_id;
    opt.textContent = v.name;
    els.voiceSelect.appendChild(opt);
  });
}

els.addVoiceBtn.addEventListener('click', async () => {
  const name = els.newVoiceName.value.trim();
  const reference_id = els.newVoiceId.value.trim();
  if (!name || !reference_id) return;
  const voices = await fetchJSON('/api/voices', 'POST', { name, reference_id });
  state.voices = voices;
  els.newVoiceName.value = '';
  els.newVoiceId.value = '';
  renderVoices();
});

async function deleteVoice(i) {
  const voices = await fetchJSON(`/api/voices/${i}`, 'DELETE');
  state.voices = voices;
  renderVoices();
}

// --------------------------------------------------------------- config --
els.saveKeyBtn.addEventListener('click', async () => {
  const api_key = els.apiKeyInput.value.trim();
  if (!api_key) return;
  await fetchJSON('/api/config', 'POST', { api_key });
  state.hasApiKey = true;
  els.apiKeyInput.value = '';
  els.apiKeyInput.placeholder = 'Clave guardada ✓';
  updateApiStatus();
});

els.modelSelect.addEventListener('change', () => {
  els.modelCustomInput.classList.toggle('hidden', els.modelSelect.value !== 'custom');
});

els.speedRange.addEventListener('input', () => { els.speedVal.textContent = `${els.speedRange.value}x`; });
els.volumeRange.addEventListener('input', () => { els.volumeVal.textContent = els.volumeRange.value; });

function currentModel() {
  return els.modelSelect.value === 'custom' ? els.modelCustomInput.value.trim() : els.modelSelect.value;
}

// --------------------------------------------------------- clone voice --
let cloneVoiceData = null;

els.cloneVoiceToggleBtn = document.getElementById('cloneVoiceToggleBtn');
els.cloneVoicePanel = document.getElementById('cloneVoicePanel');
els.cloneVoicePanelCloseBtn = document.getElementById('cloneVoicePanelCloseBtn');
els.cloneVoiceFile = document.getElementById('cloneVoiceFile');
els.cloneVoiceTranscript = document.getElementById('cloneVoiceTranscript');
els.cloneVoiceReadyBtn = document.getElementById('cloneVoiceReadyBtn');
els.cloneVoiceStatus = document.getElementById('cloneVoiceStatus');

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

// ------------------------------------------------------- queue & badge --
function updateQueueBadge() {
  if (activeJobsCount > 0) {
    els.queueBadge.classList.remove('hidden');
    if (activeJobsCount >= MAX_CONCURRENT_JOBS) {
      els.queueBadge.textContent = `${activeJobsCount}/${MAX_CONCURRENT_JOBS} (máximo alcanzado)`;
      els.queueBadge.classList.add('max-reached');
      els.generateBtn.disabled = true;
    } else {
      els.queueBadge.textContent = `${activeJobsCount}/${MAX_CONCURRENT_JOBS} en curso`;
      els.queueBadge.classList.remove('max-reached');
      els.generateBtn.disabled = false;
    }
  } else {
    els.queueBadge.classList.add('hidden');
    els.queueBadge.classList.remove('max-reached');
    els.generateBtn.disabled = false;
  }
}

function updateAudioCountBadge() {
  if (els.audioCountBadge) {
    els.audioCountBadge.textContent = totalGeneratedAudios;
  }
}

function checkEmptyState() {
  const cards = els.audioCardsContainer.querySelectorAll('.audio-card');
  if (cards.length === 0 && els.resultsEmpty) {
    els.resultsEmpty.classList.remove('hidden');
  }
}

// ------------------------------------------------------------- generate --
async function generate() {
  hideError();
  const text = els.textInput.value.trim();
  if (!text) { showError('Escribe algo de texto primero.'); return; }
  if (!state.hasApiKey) { showError('Agrega tu clave de API en Ajustes antes de generar.'); return; }

  if (activeJobsCount >= MAX_CONCURRENT_JOBS) {
    showError(`Has alcanzado el límite máximo de ${MAX_CONCURRENT_JOBS} solicitudes simultáneas.`);
    return;
  }

  // Obtener etiqueta de voz
  let voiceLabel = 'Voz por defecto';
  if (cloneVoiceData) {
    voiceLabel = '🎙️ Voz clonada';
  } else if (els.voiceSelect.value) {
    const selectedOpt = els.voiceSelect.options[els.voiceSelect.selectedIndex];
    voiceLabel = selectedOpt ? selectedOpt.textContent : 'Voz personalizada';
  }

  const payload = {
    text,
    reference_id: els.voiceSelect.value,
    voice_label: voiceLabel,
    model: currentModel(),
    format: els.formatSelect.value,
    speed: parseFloat(els.speedRange.value),
    volume: parseFloat(els.volumeRange.value),
    normalize: els.normalizeToggle.checked,
  };

  if (cloneVoiceData) {
    payload.reference_audio = { ...cloneVoiceData };
  }

  activeJobsCount++;
  updateQueueBadge();

  if (els.resultsEmpty) els.resultsEmpty.classList.add('hidden');

  // Limpiar caja de texto para permitir redactar el siguiente párrafo inmediatamente
  els.textInput.value = '';
  els.charCount.textContent = '0 caracteres';

  const nextIndexNum = totalGeneratedAudios + 1;
  const cardId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const cardEl = createPendingCard(cardId, payload, nextIndexNum);
  // Se agrega AL FINAL (appendChild) para mantener el orden: 1º arriba, 2º segundo, 3º tercero...
  els.audioCardsContainer.appendChild(cardEl);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      const detail = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || '');
      updateCardToError(cardEl, `${data.error || 'Error al generar audio.'}${detail ? '\n' + detail : ''}`);
    } else {
      updateCardToSuccess(cardEl, data.entry, data.audio_url, payload, nextIndexNum);
      totalGeneratedAudios++;
      updateAudioCountBadge();
      loadHistory();
    }
  } catch (err) {
    updateCardToError(cardEl, `Error de conexión: ${err}`);
  } finally {
    activeJobsCount--;
    updateQueueBadge();
  }
}

els.generateBtn.addEventListener('click', generate);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
});

function showError(msg) { els.errorBox.textContent = msg; els.errorBox.classList.remove('hidden'); }
function hideError() { els.errorBox.classList.add('hidden'); }

// ---------------------------------------------------- card rendering --
function createPendingCard(cardId, payload, indexNum) {
  const card = document.createElement('div');
  card.id = cardId;
  card.className = 'audio-card pending';

  card.innerHTML = `
    <div class="audio-card-header">
      <div class="pending-status">
        <span class="spinner"></span>
        <span>Generando audio (${activeJobsCount}/${MAX_CONCURRENT_JOBS})...</span>
      </div>
      <div class="audio-card-meta">
        <span class="badge-number">#${indexNum}</span>
        <span class="badge-model">${escapeHtml(payload.model)}</span>
        <span class="${payload.reference_audio ? 'badge-clone' : 'badge-voice'}">${escapeHtml(payload.voice_label)}</span>
      </div>
    </div>
    <div class="audio-card-text">${escapeHtml(payload.text)}</div>
  `;
  return card;
}

function updateCardToSuccess(cardEl, entry, audioUrl, payload, indexNum) {
  cardEl.className = 'audio-card';

  const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isClone = Boolean(payload?.reference_audio);
  const voiceLabel = payload?.voice_label || 'Voz';

  cardEl.innerHTML = `
    <div class="audio-card-header">
      <div class="audio-card-meta">
        <span class="badge-number">#${indexNum}</span>
        <span class="badge-model">${escapeHtml(entry.model || payload.model)}</span>
        <span class="${isClone ? 'badge-clone' : 'badge-voice'}">${escapeHtml(voiceLabel)}</span>
        <span class="audio-card-time">${timeStr}</span>
      </div>
      <button class="audio-card-delete-btn" title="Mover a la papelera">🗑</button>
    </div>
    <div class="audio-card-text">${escapeHtml(entry.text)}</div>
    <div class="audio-card-player">
      <button class="card-play-btn">▶</button>
      <input type="range" min="0" max="100" value="0" class="card-player-range">
      <span class="card-player-time">0:00 / 0:00</span>
      <a href="${audioUrl}" download class="card-download-btn" title="Descargar audio">⬇ MP3</a>
      <button class="card-copy-btn" title="Copiar texto">📋 Copiar</button>
    </div>
  `;

  setupCardPlayer(cardEl, entry, audioUrl);
}

function setupCardPlayer(cardEl, entry, audioUrl) {
  const audio = new Audio(audioUrl);
  const playBtn = cardEl.querySelector('.card-play-btn');
  const range = cardEl.querySelector('.card-player-range');
  const timeSpan = cardEl.querySelector('.card-player-time');
  const deleteBtn = cardEl.querySelector('.audio-card-delete-btn');
  const copyBtn = cardEl.querySelector('.card-copy-btn');

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      if (currentPlayingAudio && currentPlayingAudio !== audio) {
        currentPlayingAudio.pause();
        if (currentPlayingBtn) currentPlayingBtn.textContent = '▶';
      }
      audio.play();
      playBtn.textContent = '⏸';
      currentPlayingAudio = audio;
      currentPlayingBtn = playBtn;
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    range.value = (audio.currentTime / audio.duration) * 100;
    timeSpan.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
  });

  audio.addEventListener('loadedmetadata', () => {
    timeSpan.textContent = `0:00 / ${fmtTime(audio.duration)}`;
  });

  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
  });

  range.addEventListener('input', () => {
    if (audio.duration) {
      audio.currentTime = (range.value / 100) * audio.duration;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(entry.text);
      copyBtn.textContent = '✓ Copiado';
      setTimeout(() => { copyBtn.textContent = '📋 Copiar'; }, 2000);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      confirmMoveToTrash(entry.id, audio, cardEl);
    });
  }
}

function updateCardToError(cardEl, errorMsg) {
  cardEl.className = 'audio-card error';
  cardEl.innerHTML = `
    <div class="audio-card-header">
      <div class="error-status">❌ Error al generar</div>
      <button class="audio-card-delete-btn" title="Cerrar">✕</button>
    </div>
    <div class="error-detail">${escapeHtml(errorMsg)}</div>
  `;
  cardEl.querySelector('.audio-card-delete-btn').addEventListener('click', () => {
    cardEl.remove();
    checkEmptyState();
  });
}

// ---------------------------------------------------- initial results --
async function loadInitialResults() {
  const history = await fetchJSON('/api/history');
  els.audioCardsContainer.innerHTML = '';

  if (!history || history.length === 0) {
    if (els.resultsEmpty) els.resultsEmpty.classList.remove('hidden');
    totalGeneratedAudios = 0;
    updateAudioCountBadge();
    return;
  }

  if (els.resultsEmpty) els.resultsEmpty.classList.add('hidden');
  totalGeneratedAudios = history.length;
  updateAudioCountBadge();

  // Renderizar los elementos en el orden recibido (cronológico: 1º de primero, 2º de segundo...)
  history.forEach((item, idx) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'audio-card';
    const audioUrl = `/static/audio/${item.filename}`;
    const date = new Date((item.timestamp || Date.now() / 1000) * 1000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    cardEl.innerHTML = `
      <div class="audio-card-header">
        <div class="audio-card-meta">
          <span class="badge-number">#${idx + 1}</span>
          <span class="badge-model">${escapeHtml(item.model)}</span>
          <span class="badge-voice">${escapeHtml(item.reference_id ? 'Voz guardada' : 'Voz por defecto')}</span>
          <span class="audio-card-time">${timeStr}</span>
        </div>
        <button class="audio-card-delete-btn" title="Mover a la papelera">🗑</button>
      </div>
      <div class="audio-card-text">${escapeHtml(item.text)}</div>
      <div class="audio-card-player">
        <button class="card-play-btn">▶</button>
        <input type="range" min="0" max="100" value="0" class="card-player-range">
        <span class="card-player-time">0:00 / 0:00</span>
        <a href="${audioUrl}" download class="card-download-btn" title="Descargar audio">⬇ MP3</a>
        <button class="card-copy-btn" title="Copiar texto">📋 Copiar</button>
      </div>
    `;

    setupCardPlayer(cardEl, item, audioUrl);
    els.audioCardsContainer.appendChild(cardEl);
  });
}

// --------------------------------------------------------------- history --
async function loadHistory() {
  const history = await fetchJSON('/api/history');
  els.historyList.innerHTML = '';
  els.historyEmpty.classList.toggle('hidden', history.length > 0);

  history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(item.timestamp * 1000);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const timeLabel = isToday
      ? `Hoy ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      : date.toLocaleDateString();

    div.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-time">#${idx + 1} · ${timeLabel} · ${escapeHtml(item.model)}</span>
      </div>
      <div class="history-item-text">${escapeHtml(item.text)}</div>
      <div class="history-item-actions">
        <button class="play-hist-btn">▶ Escuchar</button>
        <a href="/static/audio/${item.filename}" download>⬇ Descargar</a>
        <button class="delete-btn">🗑 Papelera</button>
      </div>`;

    div.querySelector('.play-hist-btn').addEventListener('click', () => playAudioGlobal(`/static/audio/${item.filename}`));
    div.querySelector('.delete-btn').addEventListener('click', () => {
      confirmMoveToTrash(item.id);
    });

    els.historyList.appendChild(div);
  });
}

// --------------------------------------------------------------- trash --
async function loadTrash() {
  const trash = await fetchJSON('/api/trash');
  if (els.trashCountBadge) els.trashCountBadge.textContent = trash.length;
  if (els.emptyTrashBtn) els.emptyTrashBtn.classList.toggle('hidden', trash.length === 0);

  els.trashList.innerHTML = '';
  els.trashEmpty.classList.toggle('hidden', trash.length > 0);

  trash.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date((item.trashed_at || item.timestamp) * 1000);
    const dateStr = date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    div.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-time">Eliminado: ${dateStr} · ${escapeHtml(item.model)}</span>
      </div>
      <div class="history-item-text">${escapeHtml(item.text)}</div>
      <div class="history-item-actions">
        <button class="play-hist-btn">▶ Escuchar</button>
        <button class="restore-btn">🔄 Restaurar</button>
        <button class="delete-btn danger-btn">✕ Eliminar</button>
      </div>`;

    div.querySelector('.play-hist-btn').addEventListener('click', () => playAudioGlobal(`/static/audio/${item.filename}`));

    div.querySelector('.restore-btn').addEventListener('click', async () => {
      await fetchJSON(`/api/trash/${item.id}/restore`, 'POST');
      await loadInitialResults();
      await loadHistory();
      await loadTrash();
    });

    div.querySelector('.delete-btn').addEventListener('click', () => {
      showConfirmModal({
        title: '⚠️ Eliminar permanentemente',
        message: '¿Estás seguro de que deseas eliminar este audio PERMANENTEMENTE? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar definitivamente',
        isDanger: true,
        onConfirm: async () => {
          await fetchJSON(`/api/trash/${item.id}`, 'DELETE');
          await loadTrash();
        }
      });
    });

    els.trashList.appendChild(div);
  });
}

els.emptyTrashBtn.addEventListener('click', () => {
  showConfirmModal({
    title: '⚠️ Vaciar papelera',
    message: '¿Estás seguro de vaciar la papelera? Todos los audios eliminados se borrarán permanentemente.',
    confirmText: 'Vaciar papelera',
    isDanger: true,
    onConfirm: async () => {
      await fetchJSON('/api/trash/empty', 'POST');
      await loadTrash();
    }
  });
});

function confirmMoveToTrash(entryId, audioObj, cardEl) {
  showConfirmModal({
    title: '🗑️ Mover a la papelera',
    message: '¿Estás seguro de que quieres mover este audio a la papelera?',
    confirmText: 'Mover a la papelera',
    isDanger: true,
    onConfirm: async () => {
      if (audioObj && currentPlayingAudio === audioObj) {
        audioObj.pause();
        currentPlayingAudio = null;
        currentPlayingBtn = null;
      }
      await fetchJSON(`/api/history/${entryId}/trash`, 'POST');
      await loadInitialResults();
      await loadHistory();
      await loadTrash();
    }
  });
}

function playAudioGlobal(url) {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    if (currentPlayingBtn) currentPlayingBtn.textContent = '▶';
  }
  const audio = new Audio(url);
  currentPlayingAudio = audio;
  audio.play();
}

// ---------------------------------------------------------------- utils --
async function fetchJSON(url, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function fmtTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

init();
