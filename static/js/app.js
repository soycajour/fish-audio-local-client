import { animate } from "https://esm.sh/motion@11.11.13";

const MAX_CONCURRENT_JOBS = 5;
let activeJobsCount = 0;
let currentPlayingAudio = null;
let currentPlayingBtn = null;
let pollingInterval = null;

const els = {
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),

  // Proyecto y Partes
  projectSelect: document.getElementById('projectSelect'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  partSelect: document.getElementById('partSelect'),
  newPartBtn: document.getElementById('newPartBtn'),
  currentScopeBadge: document.getElementById('currentScopeBadge'),

  textInput: document.getElementById('textInput'),
  charCount: document.getElementById('charCount'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnLabel: document.getElementById('generateBtnLabel'),
  voiceSelect: document.getElementById('voiceSelect'),
  errorBox: document.getElementById('errorBox'),

  queueBadge: document.getElementById('queueBadge'),
  audioCardsContainer: document.getElementById('audioCardsContainer'),
  resultsEmpty: document.getElementById('resultsEmpty'),
  audioCountBadge: document.getElementById('audioCountBadge'),

  apiKeyInput: document.getElementById('apiKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  voiceList: document.getElementById('libraryList'),
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

  // Modales
  confirmModal: document.getElementById('confirmModal'),
  detailsModal: document.getElementById('detailsModal'),
  detailsModalCloseBtn: document.getElementById('detailsModalCloseBtn'),
  detailProjectValue: document.getElementById('detailProjectValue'),
  detailOrderValue: document.getElementById('detailOrderValue'),
  detailModelValue: document.getElementById('detailModelValue'),
  detailVoiceValue: document.getElementById('detailVoiceValue'),
  detailDateValue: document.getElementById('detailDateValue'),
  detailConfigValue: document.getElementById('detailConfigValue'),
  detailTextValue: document.getElementById('detailTextValue'),
  detailPlayBtn: document.getElementById('detailPlayBtn'),
  detailSlider: document.getElementById('detailSlider'),
  detailTime: document.getElementById('detailTime'),
  detailCopyBtn: document.getElementById('detailCopyBtn'),
  detailDownloadBtn: document.getElementById('detailDownloadBtn'),
  detailDeleteBtn: document.getElementById('detailDeleteBtn'),

  // Modales de Proyectos y Partes
  projectModal: document.getElementById('projectModal'),
  newProjectNameInput: document.getElementById('newProjectNameInput'),
  projectModalSaveBtn: document.getElementById('projectModalSaveBtn'),
  projectModalCancelBtn: document.getElementById('projectModalCancelBtn'),
  projectModalCloseBtn: document.getElementById('projectModalCloseBtn'),

  partModal: document.getElementById('partModal'),
  newPartNameInput: document.getElementById('newPartNameInput'),
  partModalSaveBtn: document.getElementById('partModalSaveBtn'),
  partModalCancelBtn: document.getElementById('partModalCancelBtn'),
  partModalCloseBtn: document.getElementById('partModalCloseBtn'),
};

let state = {
  voices: [],
  hasApiKey: false,
  config: {},
  projects: [],
  activeProjectId: 'default',
  activePartId: 'part-1',
};

let totalGeneratedAudios = 0;
let modalAudio = null;
let cardAudios = {};

// ------------------------------------------------------------------ tabs --
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const newContent = document.getElementById(`tab-${btn.dataset.tab}`);
    if (newContent) {
      newContent.classList.add('active');
      animate(newContent,
        { opacity: [0, 1], y: [10, 0] },
        { type: 'spring', bounce: 0, duration: 0.3 }
      );
    }

    if (btn.dataset.tab === 'historia') loadHistory();
    if (btn.dataset.tab === 'papelera') loadTrash();
  });
});

// -------------------------------------------------------------- char cnt --
els.textInput.addEventListener('input', () => {
  els.charCount.textContent = `${els.textInput.value.length} caracteres`;
});

els.textInput.addEventListener('focus', () => {
  animate(els.textInput, 
    { boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)' },
    { type: 'spring', duration: 0.4 }
  );
});

els.textInput.addEventListener('blur', () => {
  animate(els.textInput, 
    { boxShadow: '0 0 0 0px rgba(99, 102, 241, 0)' },
    { type: 'spring', duration: 0.3 }
  );
});

// ----------------------------------------------------------- modal generic --
function setupModalClosing(modalEl, closeFunction) {
  // Clic en el fondo oscuro (backdrop)
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      closeFunction();
    }
  });

  // Evitar que clics dentro de la tarjeta se propaguen al backdrop
  const card = modalEl.querySelector('.modal-card, .detail-modal-card');
  if (card) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

// Cierre global con la tecla Escape (Esc)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeActiveModals();
  }
});

function closeActiveModals() {
  if (els.confirmModal && !els.confirmModal.classList.contains('hidden')) {
    closeConfirmModal();
  }
  if (els.detailsModal && !els.detailsModal.classList.contains('hidden')) {
    closeDetailsModal();
  }
  if (els.projectModal && !els.projectModal.classList.contains('hidden')) {
    closeProjectModal();
  }
  if (els.partModal && !els.partModal.classList.contains('hidden')) {
    closePartModal();
  }
}

// ----------------------------------------------------------- confirm modal --
let confirmModalCleanup = null;

function closeConfirmModal() {
  const modal = els.confirmModal;
  const modalBox = modal.querySelector('.modal-card');
  animate(modal, { opacity: 0 }, { duration: 0.2 });
  animate(modalBox, { y: 12, opacity: 0 }, { 
    type: "spring", bounce: 0, duration: 0.3,
    onComplete: () => modal.classList.add('hidden')
  });
  if (confirmModalCleanup) {
    confirmModalCleanup();
    confirmModalCleanup = null;
  }
}

function showConfirmModal({ title, message, confirmText, isDanger = true, onConfirm }) {
  const modal = els.confirmModal;
  document.getElementById('confirmModalTitle').textContent = title || 'Confirmación';
  document.getElementById('confirmModalText').textContent = message;
  const okBtn = document.getElementById('confirmModalOkBtn');
  okBtn.textContent = confirmText || 'Aceptar';
  okBtn.className = `modal-btn ${isDanger ? 'danger-btn' : 'secondary-btn'}`;

  modal.classList.remove('hidden');
  const modalBox = modal.querySelector('.modal-card');
  animate(modal, { opacity: [0, 1] }, { duration: 0.2 });
  animate(modalBox, { y: [12, 0], opacity: [0, 1] }, { type: "spring", bounce: 0, duration: 0.3 });

  const handleOk = async () => {
    closeConfirmModal();
    if (onConfirm) await onConfirm();
  };

  const handleCancel = () => {
    closeConfirmModal();
  };

  okBtn.addEventListener('click', handleOk);
  document.getElementById('confirmModalCancelBtn').addEventListener('click', handleCancel);
  document.getElementById('confirmModalCloseBtn').addEventListener('click', handleCancel);

  confirmModalCleanup = () => {
    okBtn.removeEventListener('click', handleOk);
    document.getElementById('confirmModalCancelBtn').removeEventListener('click', handleCancel);
    document.getElementById('confirmModalCloseBtn').removeEventListener('click', handleCancel);
  };
}

setupModalClosing(els.confirmModal, closeConfirmModal);

// ----------------------------------------------------------- details modal --
function closeDetailsModal() {
  const detailsBox = els.detailsModal.querySelector('.detail-modal-card');
  animate(els.detailsModal, { opacity: 0 }, { duration: 0.2 });
  animate(detailsBox, { y: 12, opacity: 0 }, { 
    type: "spring", bounce: 0, duration: 0.3,
    onComplete: () => els.detailsModal.classList.add('hidden')
  });
  if (modalAudio) {
    modalAudio.pause();
    modalAudio = null;
  }
}

function openDetailsModal(entry) {
  if (modalAudio) {
    modalAudio.pause();
    modalAudio = null;
  }

  // Nombre de proyecto y parte
  const proj = state.projects.find(p => p.id === (entry.project_id || 'default'));
  const projName = proj ? proj.name : 'General';
  const part = proj && proj.parts ? proj.parts.find(p => p.id === (entry.part_id || 'part-1')) : null;
  const partName = part ? part.name : 'Parte 1';

  if (els.detailProjectValue) els.detailProjectValue.textContent = `${projName} / ${partName}`;
  if (els.detailOrderValue) els.detailOrderValue.textContent = `#${entry.order_index || 1}`;
  
  els.detailModelValue.textContent = entry.model;
  
  const voice = state.voices.find(v => v.reference_id === entry.reference_id);
  const voiceName = voice ? voice.name : 'Voz guardada';
  els.detailVoiceValue.textContent = voiceName;
  
  const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
  els.detailDateValue.textContent = date.toLocaleString();
  
  const configText = `Formato: ${entry.format.toUpperCase()} · Vel: ${entry.speed || '1.0'}x · Vol: ${entry.volume || '0'} · Normalización: ${entry.normalize !== false ? 'Sí' : 'No'}`;
  els.detailConfigValue.textContent = configText;
  
  els.detailTextValue.textContent = entry.text;
  
  const audioUrl = `/static/audio/${entry.filename}`;
  modalAudio = new Audio(audioUrl);
  
  els.detailPlayBtn.textContent = '▶';
  els.detailSlider.value = 0;
  els.detailTime.textContent = '0:00 / 0:00';
  
  const togglePlay = () => {
    if (modalAudio.paused) {
      if (currentPlayingAudio) currentPlayingAudio.pause();
      modalAudio.play();
      els.detailPlayBtn.textContent = '⏸';
    } else {
      modalAudio.pause();
      els.detailPlayBtn.textContent = '▶';
    }
  };
  
  const handleTimeUpdate = () => {
    if (!modalAudio.duration) return;
    els.detailSlider.value = (modalAudio.currentTime / modalAudio.duration) * 100;
    els.detailTime.textContent = `${fmtTime(modalAudio.currentTime)} / ${fmtTime(modalAudio.duration)}`;
  };
  
  const handleLoadedMetadata = () => {
    els.detailTime.textContent = `0:00 / ${fmtTime(modalAudio.duration)}`;
  };
  
  const handleEnded = () => {
    els.detailPlayBtn.textContent = '▶';
  };
  
  const handleSliderInput = () => {
    if (modalAudio.duration) {
      modalAudio.currentTime = (els.detailSlider.value / 100) * modalAudio.duration;
    }
  };
  
  modalAudio.addEventListener('timeupdate', handleTimeUpdate);
  modalAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
  modalAudio.addEventListener('ended', handleEnded);
  els.detailSlider.addEventListener('input', handleSliderInput);
  els.detailPlayBtn.onclick = togglePlay;
  
  // Acciones
  els.detailCopyBtn.onclick = () => {
    navigator.clipboard.writeText(entry.text);
    els.detailCopyBtn.textContent = '✓ Copiado';
    setTimeout(() => { els.detailCopyBtn.textContent = '📋 Copiar texto'; }, 2000);
  };
  
  els.detailDownloadBtn.href = audioUrl;
  els.detailDownloadBtn.download = entry.filename;
  
  els.detailDeleteBtn.onclick = () => {
    closeDetailsModal();
    confirmMoveToTrash(entry.id, modalAudio);
  };
  
  els.detailsModal.classList.remove('hidden');
  const detailsBox = els.detailsModal.querySelector('.detail-modal-card');
  animate(els.detailsModal, { opacity: [0, 1] }, { duration: 0.2 });
  animate(detailsBox, { y: [12, 0], opacity: [0, 1] }, { type: "spring", bounce: 0, duration: 0.3 });
}

els.detailsModalCloseBtn.addEventListener('click', closeDetailsModal);
setupModalClosing(els.detailsModal, closeDetailsModal);

// -------------------------------------------------- project & part modals --
function openProjectModal() {
  els.newProjectNameInput.value = '';
  els.projectModal.classList.remove('hidden');
  const card = els.projectModal.querySelector('.modal-card');
  animate(els.projectModal, { opacity: [0, 1] }, { duration: 0.2 });
  animate(card, { y: [12, 0], opacity: [0, 1] }, { type: "spring", bounce: 0, duration: 0.3 });
  setTimeout(() => els.newProjectNameInput.focus(), 50);
}

function closeProjectModal() {
  const card = els.projectModal.querySelector('.modal-card');
  animate(els.projectModal, { opacity: 0 }, { duration: 0.2 });
  animate(card, { y: 12, opacity: 0 }, { 
    type: "spring", bounce: 0, duration: 0.3,
    onComplete: () => els.projectModal.classList.add('hidden')
  });
}

function openPartModal() {
  const proj = state.projects.find(p => p.id === state.activeProjectId);
  const nextPartNum = proj && proj.parts ? proj.parts.length + 1 : 2;
  els.newPartNameInput.value = `Parte ${nextPartNum}`;
  els.partModal.classList.remove('hidden');
  const card = els.partModal.querySelector('.modal-card');
  animate(els.partModal, { opacity: [0, 1] }, { duration: 0.2 });
  animate(card, { y: [12, 0], opacity: [0, 1] }, { type: "spring", bounce: 0, duration: 0.3 });
  setTimeout(() => {
    els.newPartNameInput.focus();
    els.newPartNameInput.select();
  }, 50);
}

function closePartModal() {
  const card = els.partModal.querySelector('.modal-card');
  animate(els.partModal, { opacity: 0 }, { duration: 0.2 });
  animate(card, { y: 12, opacity: 0 }, { 
    type: "spring", bounce: 0, duration: 0.3,
    onComplete: () => els.partModal.classList.add('hidden')
  });
}

els.newProjectBtn.addEventListener('click', openProjectModal);
els.projectModalCloseBtn.addEventListener('click', closeProjectModal);
els.projectModalCancelBtn.addEventListener('click', closeProjectModal);
setupModalClosing(els.projectModal, closeProjectModal);

els.newPartBtn.addEventListener('click', openPartModal);
els.partModalCloseBtn.addEventListener('click', closePartModal);
els.partModalCancelBtn.addEventListener('click', closePartModal);
setupModalClosing(els.partModal, closePartModal);

els.projectModalSaveBtn.addEventListener('click', async () => {
  const name = els.newProjectNameInput.value.trim();
  if (!name) return;
  const res = await fetchJSON('/api/projects', 'POST', { name });
  if (res && res.project) {
    state.projects = res.projects;
    state.activeProjectId = res.project.id;
    state.activePartId = res.project.parts[0].id;
    renderProjects();
    await saveActiveProjectScope();
    await loadInitialResults();
    closeProjectModal();
  }
});

els.newProjectNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.projectModalSaveBtn.click();
});

els.partModalSaveBtn.addEventListener('click', async () => {
  const name = els.newPartNameInput.value.trim();
  const res = await fetchJSON(`/api/projects/${state.activeProjectId}/parts`, 'POST', { name });
  if (res && res.part) {
    state.projects = res.projects;
    state.activePartId = res.part.id;
    renderParts();
    updateScopeBadge();
    await saveActiveProjectScope();
    await loadInitialResults();
    closePartModal();
  }
});

els.newPartNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.partModalSaveBtn.click();
});

// ------------------------------------------------- projects & parts logic --
function renderProjects() {
  els.projectSelect.innerHTML = '';
  state.projects.forEach(proj => {
    const opt = document.createElement('option');
    opt.value = proj.id;
    opt.textContent = proj.name;
    els.projectSelect.appendChild(opt);
  });

  // Asegurar selección válida
  if (!state.projects.some(p => p.id === state.activeProjectId) && state.projects.length > 0) {
    state.activeProjectId = state.projects[0].id;
  }
  els.projectSelect.value = state.activeProjectId;
  renderParts();
  updateScopeBadge();
}

function renderParts() {
  els.partSelect.innerHTML = '';
  const currentProj = state.projects.find(p => p.id === state.activeProjectId);
  const parts = currentProj ? currentProj.parts : [{ id: 'part-1', name: 'Parte 1' }];

  parts.forEach(part => {
    const opt = document.createElement('option');
    opt.value = part.id;
    opt.textContent = part.name;
    els.partSelect.appendChild(opt);
  });

  if (!parts.some(p => p.id === state.activePartId) && parts.length > 0) {
    state.activePartId = parts[0].id;
  }
  els.partSelect.value = state.activePartId;
  updateScopeBadge();
}

function updateScopeBadge() {
  const currentProj = state.projects.find(p => p.id === state.activeProjectId);
  const projName = currentProj ? currentProj.name : 'General';
  const currentPart = currentProj && currentProj.parts ? currentProj.parts.find(p => p.id === state.activePartId) : null;
  const partName = currentPart ? currentPart.name : 'Parte 1';
  if (els.currentScopeBadge) {
    els.currentScopeBadge.textContent = `${projName} / ${partName}`;
  }
}

async function saveActiveProjectScope() {
  await fetchJSON('/api/config', 'POST', {
    active_project_id: state.activeProjectId,
    active_part_id: state.activePartId
  });
}

els.projectSelect.addEventListener('change', async (e) => {
  state.activeProjectId = e.target.value;
  const proj = state.projects.find(p => p.id === state.activeProjectId);
  if (proj && proj.parts && proj.parts.length > 0) {
    state.activePartId = proj.parts[0].id;
  } else {
    state.activePartId = 'part-1';
  }
  renderParts();
  updateScopeBadge();
  await saveActiveProjectScope();
  await loadInitialResults();
});

els.partSelect.addEventListener('change', async (e) => {
  state.activePartId = e.target.value;
  updateScopeBadge();
  await saveActiveProjectScope();
  await loadInitialResults();
});

// ------------------------------------------------------------------ init --
async function init() {
  const [cfg, projects] = await Promise.all([
    fetchJSON('/api/config'),
    fetchJSON('/api/projects')
  ]);

  state.hasApiKey = cfg.has_api_key;
  state.voices = cfg.voices || [];
  state.config = cfg;
  state.projects = projects && projects.length > 0 ? projects : [
    { id: 'default', name: 'General', parts: [{ id: 'part-1', name: 'Parte 1' }] }
  ];

  state.activeProjectId = cfg.active_project_id || (state.projects[0] ? state.projects[0].id : 'default');
  state.activePartId = cfg.active_part_id || 'part-1';

  updateApiStatus();
  renderVoices();
  renderProjects();

  if (cfg.format) els.formatSelect.value = cfg.format;
  if (cfg.speed) {
    els.speedRange.value = cfg.speed;
    els.speedVal.textContent = `${cfg.speed}x`;
  }
  if (cfg.volume !== undefined) {
    els.volumeRange.value = cfg.volume;
    els.volumeVal.textContent = cfg.volume;
  }
  if (cfg.normalize !== undefined) els.normalizeToggle.checked = cfg.normalize;

  await loadInitialResults();
  await loadTrash();
  setupAutoSave();
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

// ------------------------------------------------------------- voices --
function renderVoices() {
  els.voiceList.innerHTML = '';
  els.voiceSelect.innerHTML = '';
  
  state.voices.forEach((v, i) => {
    const initials = v.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const isFemale = v.name.toLowerCase().includes('narradora') || v.name.toLowerCase().includes('marly') || v.name.toLowerCase().includes('sakura');
    const tagColor = isFemale ? '🎀 femenino' : '👔 masculino';
    const description = isFemale ? 'Una voz femenina joven y persuasiva, ideal para presentar temas sociales con claridad y convicción.'
                                 : 'Una voz masculina joven y segura, ideal para narrar conceptos creativos y educativos con un tono inspirador.';

    const libraryCard = document.createElement('div');
    libraryCard.className = 'library-item';
    libraryCard.innerHTML = `
      <div class="library-item-avatar">${initials}</div>
      <div class="library-item-content">
        <div class="library-item-header">
          <span class="library-item-name">${escapeHtml(v.name)}</span>
          <span class="library-item-ref">· ${escapeHtml(v.reference_id)}</span>
        </div>
        <p class="library-item-desc">${description}</p>
        <div class="library-item-tags">
          <span class="library-tag">🇪🇸 Spanish</span>
          <span class="library-tag">${tagColor}</span>
          <span class="library-tag">young</span>
        </div>
      </div>
      <button class="library-item-delete" title="Eliminar voz">✕</button>
    `;
    libraryCard.querySelector('.library-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteVoice(i);
    });
    els.voiceList.appendChild(libraryCard);

    const opt = document.createElement('option');
    opt.value = v.reference_id;
    opt.textContent = v.name;
    els.voiceSelect.appendChild(opt);
  });
  
  if (state.voices.length > 0 && !els.voiceSelect.value) {
    els.voiceSelect.value = state.voices[0].reference_id;
  }
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

function setupAutoSave() {
  const saveFunc = async () => {
    const format = els.formatSelect.value;
    const speed = parseFloat(els.speedRange.value);
    const volume = parseFloat(els.volumeRange.value);
    const normalize = els.normalizeToggle.checked;
    
    await fetchJSON('/api/config', 'POST', {
      format,
      speed,
      volume,
      normalize
    });
  };
  
  els.formatSelect.addEventListener('change', saveFunc);
  els.speedRange.addEventListener('change', saveFunc);
  els.volumeRange.addEventListener('change', saveFunc);
  els.normalizeToggle.addEventListener('change', saveFunc);
  
  els.speedRange.addEventListener('input', (e) => { 
    els.speedVal.textContent = `${e.target.value}x`; 
    if (currentPlayingAudio) currentPlayingAudio.playbackRate = parseFloat(e.target.value);
    if (modalAudio) modalAudio.playbackRate = parseFloat(e.target.value);
  });
  els.volumeRange.addEventListener('input', (e) => { 
    els.volumeVal.textContent = e.target.value; 
  });
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

  const payload = {
    text,
    reference_id: els.voiceSelect.value,
    format: els.formatSelect.value,
    speed: parseFloat(els.speedRange.value),
    volume: parseFloat(els.volumeRange.value),
    normalize: els.normalizeToggle.checked,
    project_id: state.activeProjectId,
    part_id: state.activePartId,
  };

  activeJobsCount++;
  if (els.resultsEmpty) els.resultsEmpty.classList.add('hidden');

  els.textInput.value = '';
  els.charCount.textContent = '0 caracteres';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Error al enviar petición al servidor.');
      activeJobsCount--;
    } else {
      startPolling();
    }
  } catch (err) {
    showError(`Error de conexión: ${err}`);
    activeJobsCount--;
  }
}

els.generateBtn.addEventListener('click', generate);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
});

function showError(msg) { els.errorBox.textContent = msg; els.errorBox.classList.remove('hidden'); }
function hideError() { els.errorBox.classList.add('hidden'); }

// ---------------------------------------------------- card rendering --
function createPendingCard(entry) {
  const card = document.createElement('div');
  card.id = `card-${entry.id}`;
  card.className = 'audio-card pending';

  card.innerHTML = `
    <div class="audio-card-header">
      <div class="pending-status">
        <span class="spinner"></span>
        <span>Generando audio...</span>
      </div>
      <div class="audio-card-meta" style="display:flex; gap:10px; align-items:center;">
        <span class="audio-card-time">${fmtTime(0)}</span>
        <button class="audio-card-btn icon-only cancel-btn" title="Cancelar generación" style="color:var(--danger)">⏹</button>
      </div>
    </div>
    <div class="audio-card-text">${escapeHtml(entry.text)}</div>
  `;

  const cancelBtn = card.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    animate(cancelBtn, { scale: 0.9 }, { type: "spring", duration: 0.2 });
    try {
      await fetch(`/api/generate/${entry.id}/cancel`, { method: 'POST' });
      cancelBtn.textContent = '⏳';
    } catch (err) {
      console.error('Error al cancelar:', err);
    }
  });

  return card;
}

function renderAudioCard(entry) {
  const card = document.createElement('div');
  card.id = `card-${entry.id}`;
  card.className = 'audio-card';
  
  if (entry.status === 'pending') {
    return createPendingCard(entry);
  }
  
  if (entry.status === 'failed') {
    card.className = 'audio-card error';
    card.innerHTML = `
      <div class="audio-card-header">
        <div class="error-status">❌ Error al generar</div>
        <button class="audio-card-btn icon-only details-delete-btn" title="Eliminar permanentemente">🗑</button>
      </div>
      <div class="audio-card-text">${escapeHtml(entry.text)}</div>
      <div class="error-detail">${escapeHtml(entry.error || 'Detalle desconocido')}</div>
    `;
    card.querySelector('.details-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      permanentDelete(entry.id);
    });
    return card;
  }

  const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const audioUrl = `/static/audio/${entry.filename}`;
  
  const voice = state.voices.find(v => v.reference_id === entry.reference_id);
  const voiceName = voice ? voice.name : 'Voz guardada';
  const initials = voiceName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const orderNum = entry.order_index || 1;

  card.innerHTML = `
    <div class="audio-card-header">
      <div class="audio-card-meta">
        <span class="audio-card-badge-order">#${orderNum}</span>
        <div class="audio-card-avatar">${initials}</div>
        <span class="audio-card-voice">${escapeHtml(voiceName)}</span>
        <span class="audio-card-time">${timeStr}</span>
      </div>
      <div class="audio-card-actions">
        <button class="audio-card-btn card-play-btn">▶ Reproducir</button>
        <button class="audio-card-btn card-download-btn">⬇ Descargar</button>
        <button class="audio-card-btn icon-only card-delete-btn" title="Mover a la papelera">🗑</button>
      </div>
    </div>
    <div class="audio-card-text">${escapeHtml(entry.text)}</div>
  `;

  card.addEventListener('click', () => {
    openDetailsModal(entry);
  });

  card.addEventListener('pointerenter', () => {
    animate(card, { y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }, { type: 'spring', bounce: 0.1, duration: 0.3 });
  });

  card.addEventListener('pointerleave', () => {
    animate(card, { y: 0, boxShadow: 'var(--shadow)' }, { type: 'spring', bounce: 0.1, duration: 0.3 });
  });

  const playBtn = card.querySelector('.card-play-btn');
  const downloadBtn = card.querySelector('.card-download-btn');
  const deleteBtn = card.querySelector('.card-delete-btn');

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayCard(entry, playBtn);
  });

  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = entry.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmMoveToTrash(entry.id);
  });

  return card;
}

function togglePlayCard(entry, btn) {
  const url = `/static/audio/${entry.filename}`;
  if (!cardAudios[entry.id]) {
    cardAudios[entry.id] = new Audio(url);
    cardAudios[entry.id].addEventListener('ended', () => {
      btn.textContent = '▶ Reproducir';
    });
  }
  
  const audio = cardAudios[entry.id];
  if (audio.paused) {
    if (currentPlayingAudio && currentPlayingAudio !== audio) {
      currentPlayingAudio.pause();
      if (currentPlayingBtn) currentPlayingBtn.textContent = '▶ Reproducir';
    }
    if (modalAudio) modalAudio.pause();
    
    audio.play();
    btn.textContent = '⏸ Pausar';
    currentPlayingAudio = audio;
    currentPlayingBtn = btn;
  } else {
    audio.pause();
    btn.textContent = '▶ Reproducir';
  }
}

// ---------------------------------------------------- results loader --
async function loadInitialResults() {
  const history = await fetchJSON('/api/history');
  els.audioCardsContainer.innerHTML = '';

  // Filtrar exclusivamente para el proyecto y parte actualmente activos
  const activeHistory = history.filter(item => 
    !item.trashed_at && 
    (item.project_id || 'default') === state.activeProjectId &&
    (item.part_id || 'part-1') === state.activePartId
  );

  if (!activeHistory || activeHistory.length === 0) {
    if (els.resultsEmpty) els.resultsEmpty.classList.remove('hidden');
    totalGeneratedAudios = 0;
    updateAudioCountBadge();
    return;
  }

  if (els.resultsEmpty) els.resultsEmpty.classList.add('hidden');
  totalGeneratedAudios = activeHistory.length;
  updateAudioCountBadge();

  // Renderizar de más nuevo a más viejo para que aparezca arriba el último generado
  activeHistory.slice().reverse().forEach((item) => {
    const cardEl = renderAudioCard(item);
    els.audioCardsContainer.appendChild(cardEl);
  });

  const hasPending = activeHistory.some(h => h.status === 'pending');
  if (hasPending) {
    startPolling();
  }
}

// ----------------------------------------------------------- polling --
function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(async () => {
    const history = await fetchJSON('/api/history');
    const activeHistory = history.filter(item => 
      !item.trashed_at && 
      (item.project_id || 'default') === state.activeProjectId &&
      (item.part_id || 'part-1') === state.activePartId
    );
    
    const pendingJobs = activeHistory.filter(h => h.status === 'pending');
    activeJobsCount = pendingJobs.length;
    updateQueueBadge();

    els.audioCardsContainer.innerHTML = '';
    activeHistory.slice().reverse().forEach((item) => {
      const cardEl = renderAudioCard(item);
      els.audioCardsContainer.appendChild(cardEl);
    });

    totalGeneratedAudios = activeHistory.length;
    updateAudioCountBadge();

    if (activeJobsCount === 0) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }, 2000);
}

function updateQueueBadge() {
  if (activeJobsCount > 0) {
    els.queueBadge.classList.remove('hidden');
    els.queueBadge.textContent = `${activeJobsCount} en curso`;
    if (!els.queueBadge.dataset.animating) {
      els.queueBadge.dataset.animating = "true";
      animate(els.queueBadge,
        { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] },
        { type: 'spring', bounce: 0.4, duration: 2, repeat: Infinity }
      );
    }
  } else {
    els.queueBadge.classList.add('hidden');
    els.queueBadge.dataset.animating = "";
  }
}

function updateAudioCountBadge() {
  if (els.audioCountBadge) {
    els.audioCountBadge.textContent = totalGeneratedAudios;
  }
}

// --------------------------------------------------------------- history --
async function loadHistory() {
  const history = await fetchJSON('/api/history');
  const activeHistory = history.filter(item => !item.trashed_at && item.status !== 'pending');
  els.historyList.innerHTML = '';
  els.historyEmpty.classList.toggle('hidden', activeHistory.length > 0);

  activeHistory.slice().reverse().forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(item.timestamp * 1000);
    const timeLabel = date.toLocaleString();

    const proj = state.projects.find(p => p.id === (item.project_id || 'default'));
    const projName = proj ? proj.name : 'General';
    const part = proj && proj.parts ? proj.parts.find(p => p.id === (item.part_id || 'part-1')) : null;
    const partName = part ? part.name : 'Parte 1';

    div.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-time">#${item.order_index || activeHistory.length - idx} · ${projName} (${partName}) · ${timeLabel}</span>
      </div>
      <div class="history-item-text">${escapeHtml(item.text)}</div>
      <div class="history-item-actions">
        <button class="play-hist-btn">▶ Escuchar</button>
        <a href="/static/audio/${item.filename}" download="${item.filename}">⬇ Descargar</a>
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

  trash.slice().reverse().forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date((item.trashed_at || item.timestamp) * 1000);
    const dateStr = date.toLocaleString();

    div.innerHTML = `
      <div class="history-item-top">
        <span class="history-item-time">Eliminado: ${dateStr}</span>
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
      permanentDelete(item.id);
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

function confirmMoveToTrash(entryId, audioObj) {
  showConfirmModal({
    title: '🗑️ Mover a la papelera',
    message: '¿Estás seguro de que quieres mover este audio a la papelera?',
    confirmText: 'Mover a la papelera',
    isDanger: true,
    onConfirm: async () => {
      if (audioObj) audioObj.pause();
      if (currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio = null;
      }
      await fetchJSON(`/api/history/${entryId}/trash`, 'POST');
      await loadInitialResults();
      await loadHistory();
      await loadTrash();
    }
  });
}

function permanentDelete(entryId) {
  showConfirmModal({
    title: '⚠️ Eliminar permanentemente',
    message: '¿Estás seguro de que deseas eliminar este audio PERMANENTEMENTE? Esta acción no se puede deshacer.',
    confirmText: 'Eliminar definitivamente',
    isDanger: true,
    onConfirm: async () => {
      await fetchJSON(`/api/trash/${entryId}`, 'DELETE');
      await loadTrash();
      await loadInitialResults();
    }
  });
}

function playAudioGlobal(url) {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    if (currentPlayingBtn) currentPlayingBtn.textContent = '▶ Reproducir';
  }
  if (modalAudio) modalAudio.pause();
  
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
