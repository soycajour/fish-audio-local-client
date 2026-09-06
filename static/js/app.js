import { animate } from "https://esm.sh/motion@11.11.13";

const MAX_CONCURRENT_JOBS = 5;
let activeJobsCount = 0;
let currentPlayingAudio = null;
let currentPlayingCardId = null;
let pollingInterval = null;

// Referencias del DOM
const els = {
  // Topbar
  apiStatusContainer: document.getElementById('apiStatusContainer'),
  apiStatusPing: document.getElementById('apiStatusPing'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText'),

  // Proyecto y Partes
  projectSelect: document.getElementById('projectSelect'),
  projectOptionsBtn: document.getElementById('projectOptionsBtn'),
  projectContextMenu: document.getElementById('projectContextMenu'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  partSelect: document.getElementById('partSelect'),
  newPartBtn: document.getElementById('newPartBtn'),
  batchImportBtn: document.getElementById('batchImportBtn'),
  currentScopeBadge: document.getElementById('currentScopeBadge'),

  // Editor TTS
  textInput: document.getElementById('textInput'),
  quickUploadTxtBtn: document.getElementById('quickUploadTxtBtn'),
  charCount: document.getElementById('charCount'),
  estimatedDuration: document.getElementById('estimatedDuration'),
  generateBtn: document.getElementById('generateBtn'),
  generateBtnLabel: document.getElementById('generateBtnLabel'),
  queueBadge: document.getElementById('queueBadge'),
  voiceSelect: document.getElementById('voiceSelect'),
  errorBox: document.getElementById('errorBox'),
  errorBoxText: document.getElementById('errorBoxText'),

  // Resultados / Historial Central
  audioCardsContainer: document.getElementById('audioCardsContainer'),
  resultsEmpty: document.getElementById('resultsEmpty'),
  audioCountBadge: document.getElementById('audioCountBadge'),

  // Biblioteca de voces
  openAddVoiceBtn: document.getElementById('openAddVoiceBtn'),
  voiceList: document.getElementById('libraryList'),

  // Sidebar - Ajustes
  apiKeyInput: document.getElementById('apiKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  newVoiceName: document.getElementById('newVoiceName'),
  newVoiceId: document.getElementById('newVoiceId'),
  addVoiceBtn: document.getElementById('addVoiceBtn'),
  formatSelect: document.getElementById('formatSelect'),
  speedRange: document.getElementById('speedRange'),
  speedVal: document.getElementById('speedVal'),
  volumeRange: document.getElementById('volumeRange'),
  volumeVal: document.getElementById('volumeVal'),
  normalizeToggle: document.getElementById('normalizeToggle'),

  // Sidebar - Historial y Papelera
  historyEmpty: document.getElementById('historyEmpty'),
  historyList: document.getElementById('historyList'),
  trashCountBadge: document.getElementById('trashCountBadge'),
  trashEmpty: document.getElementById('trashEmpty'),
  trashList: document.getElementById('trashList'),
  emptyTrashBtn: document.getElementById('emptyTrashBtn'),

  // Modal: Nuevo Proyecto / Parte
  projectModal: document.getElementById('projectModal'),
  projectModalTitle: document.getElementById('projectModalTitle'),
  tabNewProjectToggle: document.getElementById('tabNewProjectToggle'),
  tabNewPartToggle: document.getElementById('tabNewPartToggle'),
  projectInputContainer: document.getElementById('projectInputContainer'),
  newProjectNameInput: document.getElementById('newProjectNameInput'),
  partInputLabel: document.getElementById('partInputLabel'),
  newPartNameInput: document.getElementById('newPartNameInput'),
  projectNotesInput: document.getElementById('projectNotesInput'),
  projectModalSaveBtn: document.getElementById('projectModalSaveBtn'),
  projectModalSaveBtnText: document.getElementById('projectModalSaveBtnText'),
  projectModalCancelBtn: document.getElementById('projectModalCancelBtn'),
  projectModalCloseBtn: document.getElementById('projectModalCloseBtn'),

  // Opciones de Proyecto (Popover)
  menuActionRename: document.getElementById('menuActionRename'),
  menuActionNewPart: document.getElementById('menuActionNewPart'),
  menuActionDelete: document.getElementById('menuActionDelete'),

  // Modal: Renombrar Proyecto
  renameProjectModal: document.getElementById('renameProjectModal'),
  renameProjectCloseBtn: document.getElementById('renameProjectCloseBtn'),
  renameCurrentDisplay: document.getElementById('renameCurrentDisplay'),
  renameProjectInput: document.getElementById('renameProjectInput'),
  renameProjectCancelBtn: document.getElementById('renameProjectCancelBtn'),
  renameProjectSaveBtn: document.getElementById('renameProjectSaveBtn'),

  // Modal: Eliminar Proyecto
  deleteProjectModal: document.getElementById('deleteProjectModal'),
  deleteProjectCloseBtn: document.getElementById('deleteProjectCloseBtn'),
  deleteProjectTargetName: document.getElementById('deleteProjectTargetName'),
  deleteProjectPartsCount: document.getElementById('deleteProjectPartsCount'),
  deleteProjectAudiosCount: document.getElementById('deleteProjectAudiosCount'),
  deleteProjectCancelBtn: document.getElementById('deleteProjectCancelBtn'),
  deleteProjectConfirmBtn: document.getElementById('deleteProjectConfirmBtn'),

  // Modal: Importar .txt
  batchImportModal: document.getElementById('batchImportModal'),
  batchImportCloseBtn: document.getElementById('batchImportCloseBtn'),
  txtFileInput: document.getElementById('txtFileInput'),
  txtDropzone: document.getElementById('txtDropzone'),
  txtFilesQueueSection: document.getElementById('txtFilesQueueSection'),
  txtFilesCountBadge: document.getElementById('txtFilesCountBadge'),
  txtClearQueueBtn: document.getElementById('txtClearQueueBtn'),
  txtFilesList: document.getElementById('txtFilesList'),
  batchImportCancelBtn: document.getElementById('batchImportCancelBtn'),
  batchImportConfirmBtn: document.getElementById('batchImportConfirmBtn'),

  // Modal: Previsualizar y Editar .txt
  txtEditorModal: document.getElementById('txtEditorModal'),
  txtEditorFileName: document.getElementById('txtEditorFileName'),
  txtEditorFileSize: document.getElementById('txtEditorFileSize'),
  txtEditorCharHeader: document.getElementById('txtEditorCharHeader'),
  txtEditorEstHeader: document.getElementById('txtEditorEstHeader'),
  txtEditorCloseBtn: document.getElementById('txtEditorCloseBtn'),
  txtEditorFileTabs: document.getElementById('txtEditorFileTabs'),
  cleanToolDashes: document.getElementById('cleanToolDashes'),
  cleanToolQuotes: document.getElementById('cleanToolQuotes'),
  cleanToolBlankLines: document.getElementById('cleanToolBlankLines'),
  cleanToolPauseTags: document.getElementById('cleanToolPauseTags'),
  txtSearchInput: document.getElementById('txtSearchInput'),
  txtResetOriginalBtn: document.getElementById('txtResetOriginalBtn'),
  txtLineNumbersGutter: document.getElementById('txtLineNumbersGutter'),
  txtEditorContent: document.getElementById('txtEditorContent'),
  txtTelemetryChars: document.getElementById('txtTelemetryChars'),
  txtTelemetryWords: document.getElementById('txtTelemetryWords'),
  txtTelemetryParagraphs: document.getElementById('txtTelemetryParagraphs'),
  txtTelemetryEstDuration: document.getElementById('txtTelemetryEstDuration'),
  txtEditorDiscardBtn: document.getElementById('txtEditorDiscardBtn'),
  txtEditorSaveBtn: document.getElementById('txtEditorSaveBtn'),

  // Modal: Detalles y Reproductor Toma
  detailsModal: document.getElementById('detailsModal'),
  detailsModalCloseBtn: document.getElementById('detailsModalCloseBtn'),
  detailCloseBottomBtn: document.getElementById('detailCloseBottomBtn'),
  detailOrderBadge: document.getElementById('detailOrderBadge'),
  detailHeaderTitle: document.getElementById('detailHeaderTitle'),
  detailScopeBreadcrumb: document.getElementById('detailScopeBreadcrumb'),
  detailPlayerStatus: document.getElementById('detailPlayerStatus'),
  detailFormatBadge: document.getElementById('detailFormatBadge'),
  soundwaveContainer: document.getElementById('soundwaveContainer'),
  detailSlider: document.getElementById('detailSlider'),
  detailCurrentTime: document.getElementById('detailCurrentTime'),
  detailTotalTime: document.getElementById('detailTotalTime'),
  detailPlayBtn: document.getElementById('detailPlayBtn'),
  detailPlayIcon: document.getElementById('detailPlayIcon'),
  detailSeekBackBtn: document.getElementById('detailSeekBackBtn'),
  detailSeekFwdBtn: document.getElementById('detailSeekFwdBtn'),
  detailSpeedPill: document.getElementById('detailSpeedPill'),
  detailDownloadBtn: document.getElementById('detailDownloadBtn'),
  detailCopyBtn: document.getElementById('detailCopyBtn'),
  detailDeleteBtn: document.getElementById('detailDeleteBtn'),
  detailEditPrompterBtn: document.getElementById('detailEditPrompterBtn'),
  detailVoiceName: document.getElementById('detailVoiceName'),
  detailVoiceRef: document.getElementById('detailVoiceRef'),
  detailModelBadge: document.getElementById('detailModelBadge'),
  detailSpeedVal: document.getElementById('detailSpeedVal'),
  detailVolumeVal: document.getElementById('detailVolumeVal'),
  detailNormVal: document.getElementById('detailNormVal'),
  detailFormatVal: document.getElementById('detailFormatVal'),
  detailOrderVal: document.getElementById('detailOrderVal'),
  detailDateVal: document.getElementById('detailDateVal'),
  detailTextValue: document.getElementById('detailTextValue'),

  // Modal: Confirmación Genérica
  confirmModal: document.getElementById('confirmModal'),
  confirmModalTitle: document.getElementById('confirmModalTitle'),
  confirmModalText: document.getElementById('confirmModalText'),
  confirmModalCancelBtn: document.getElementById('confirmModalCancelBtn'),
  confirmModalOkBtn: document.getElementById('confirmModalOkBtn'),
  confirmModalCloseBtn: document.getElementById('confirmModalCloseBtn'),
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
let importedFilesData = [];
let projectModalMode = 'project';

// ------------------------------------------------------------------ tabs --
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'border-brand-500', 'text-white', 'bg-surface-panel/20');
      b.classList.add('border-transparent', 'text-slate-400');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    btn.classList.add('active', 'border-brand-500', 'text-white', 'bg-surface-panel/20');
    btn.classList.remove('border-transparent', 'text-slate-400');

    const newContent = document.getElementById(`tab-${btn.dataset.tab}`);
    if (newContent) {
      newContent.classList.remove('hidden');
      animate(newContent,
        { opacity: [0, 1], y: [6, 0] },
        { type: 'spring', bounce: 0, duration: 0.25 }
      );
    }

    if (btn.dataset.tab === 'historia') loadHistory();
    if (btn.dataset.tab === 'papelera') loadTrash();
  });
});

// -------------------------------------------------------------- char cnt --
function updateCharAndEstimate() {
  const len = els.textInput.value.length;
  els.charCount.textContent = `${len} caracteres`;
  const estimatedSec = (len / 14).toFixed(1);
  els.estimatedDuration.textContent = `Estimado: ~${estimatedSec}s`;
}

els.textInput.addEventListener('input', updateCharAndEstimate);

// ----------------------------------------------------------- modal generic --
function setupModalClosing(modalEl, closeFunction) {
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      closeFunction();
    }
  });

  const innerBox = modalEl.firstElementChild;
  if (innerBox) {
    innerBox.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeActiveModals();
  }
  if (e.key === 'F2') {
    e.preventDefault();
    openRenameProjectModal();
  }
});

function closeActiveModals() {
  if (els.confirmModal && !els.confirmModal.classList.contains('hidden')) closeConfirmModal();
  if (els.detailsModal && !els.detailsModal.classList.contains('hidden')) closeDetailsModal();
  if (els.projectModal && !els.projectModal.classList.contains('hidden')) closeProjectModal();
  if (els.projectMenuModal && !els.projectMenuModal.classList.contains('hidden')) closeProjectMenuModal();
  if (els.renameProjectModal && !els.renameProjectModal.classList.contains('hidden')) closeRenameProjectModal();
  if (els.deleteProjectModal && !els.deleteProjectModal.classList.contains('hidden')) closeDeleteProjectModal();
  if (els.batchImportModal && !els.batchImportModal.classList.contains('hidden')) closeBatchImportModal();
}

// ----------------------------------------------------------- confirm modal --
let confirmModalCleanup = null;

function closeConfirmModal() {
  const modal = els.confirmModal;
  animate(modal, { opacity: 0 }, { duration: 0.15, onComplete: () => modal.classList.add('hidden') });
  if (confirmModalCleanup) {
    confirmModalCleanup();
    confirmModalCleanup = null;
  }
}

function showConfirmModal({ title, message, confirmText, isDanger = true, onConfirm }) {
  const modal = els.confirmModal;
  els.confirmModalTitle.textContent = title || 'Confirmación';
  els.confirmModalText.textContent = message;
  els.confirmModalOkBtn.textContent = confirmText || 'Aceptar';
  els.confirmModalOkBtn.className = `px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all ${isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-brand-500 hover:bg-brand-600'}`;

  modal.classList.remove('hidden');
  animate(modal, { opacity: [0, 1] }, { duration: 0.15 });

  const handleOk = async () => {
    closeConfirmModal();
    if (onConfirm) await onConfirm();
  };

  const handleCancel = () => closeConfirmModal();

  els.confirmModalOkBtn.addEventListener('click', handleOk);
  els.confirmModalCancelBtn.addEventListener('click', handleCancel);
  els.confirmModalCloseBtn.addEventListener('click', handleCancel);

  confirmModalCleanup = () => {
    els.confirmModalOkBtn.removeEventListener('click', handleOk);
    els.confirmModalCancelBtn.removeEventListener('click', handleCancel);
    els.confirmModalCloseBtn.removeEventListener('click', handleCancel);
  };
}

setupModalClosing(els.confirmModal, closeConfirmModal);

// ----------------------------------------------------------- details modal --
let soundwaveAnimationTimer = null;

function closeDetailsModal() {
  animate(els.detailsModal, { opacity: 0 }, { 
    duration: 0.15, 
    onComplete: () => els.detailsModal.classList.add('hidden') 
  });
  if (modalAudio) {
    modalAudio.pause();
    modalAudio = null;
  }
  clearInterval(soundwaveAnimationTimer);
}

function animateSoundwave(isPlaying) {
  const bars = els.soundwaveContainer.querySelectorAll('span');
  if (!isPlaying) {
    clearInterval(soundwaveAnimationTimer);
    return;
  }
  clearInterval(soundwaveAnimationTimer);
  soundwaveAnimationTimer = setInterval(() => {
    bars.forEach(bar => {
      const randomH = Math.floor(Math.random() * 45) + 8;
      bar.style.height = `${randomH}px`;
    });
  }, 100);
}

function openDetailsModal(entry) {
  if (modalAudio) {
    modalAudio.pause();
    modalAudio = null;
  }

  const proj = state.projects.find(p => p.id === (entry.project_id || 'default'));
  const projName = proj ? proj.name : 'General';
  const part = proj && proj.parts ? proj.parts.find(p => p.id === (entry.part_id || 'part-1')) : null;
  const partName = part ? part.name : 'Parte 1';
  const orderNum = entry.order_index || 1;

  els.detailOrderBadge.textContent = `#${orderNum}`;
  els.detailHeaderTitle.textContent = `Detalles de la Toma — Toma #${orderNum}`;
  els.detailScopeBreadcrumb.textContent = `${projName} / ${partName}`;
  els.detailFormatBadge.textContent = `${(entry.format || 'mp3').toUpperCase()} (44.1 kHz)`;

  const voice = state.voices.find(v => v.reference_id === entry.reference_id);
  const voiceName = voice ? voice.name : 'Voz guardada';
  els.detailVoiceName.textContent = voiceName;
  els.detailVoiceRef.textContent = `ID: ${entry.reference_id ? entry.reference_id.slice(0, 16) + '...' : 'Defecto'}`;
  els.detailVoiceRef.title = entry.reference_id || '';
  els.detailModelBadge.textContent = entry.model || 's2.1-pro-free';

  els.detailSpeedVal.textContent = `${entry.speed || '1.0'}x`;
  els.detailVolumeVal.textContent = `${entry.volume || '0'} dB`;
  els.detailNormVal.textContent = entry.normalize !== false ? 'Activada' : 'Desactivada';

  els.detailFormatVal.textContent = (entry.format || 'mp3').toUpperCase();
  els.detailOrderVal.textContent = `#${orderNum}`;
  const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
  els.detailDateVal.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  els.detailTextValue.textContent = entry.text;
  els.detailSpeedPill.textContent = `${entry.speed || '1.0'}x`;

  const audioUrl = `/static/audio/${entry.filename}`;
  modalAudio = new Audio(audioUrl);
  modalAudio.playbackRate = parseFloat(entry.speed || 1.0);

  els.detailPlayIcon.textContent = '▶';
  els.detailSlider.value = 0;
  els.detailCurrentTime.textContent = '00:00.0';
  els.detailTotalTime.textContent = '00:00.0';

  const togglePlay = () => {
    if (modalAudio.paused) {
      if (currentPlayingAudio) currentPlayingAudio.pause();
      modalAudio.play();
      els.detailPlayIcon.textContent = '⏸';
      els.detailPlayerStatus.textContent = 'Reproduciendo toma...';
      animateSoundwave(true);
    } else {
      modalAudio.pause();
      els.detailPlayIcon.textContent = '▶';
      els.detailPlayerStatus.textContent = 'En pausa';
      animateSoundwave(false);
    }
  };

  modalAudio.ontimeupdate = () => {
    if (!modalAudio.duration) return;
    els.detailSlider.value = (modalAudio.currentTime / modalAudio.duration) * 100;
    els.detailCurrentTime.textContent = fmtDetailedTime(modalAudio.currentTime);
    els.detailTotalTime.textContent = fmtDetailedTime(modalAudio.duration);
  };

  modalAudio.onloadedmetadata = () => {
    els.detailTotalTime.textContent = fmtDetailedTime(modalAudio.duration);
  };

  modalAudio.onended = () => {
    els.detailPlayIcon.textContent = '▶';
    els.detailPlayerStatus.textContent = 'Reproducción terminada';
    animateSoundwave(false);
  };

  els.detailPlayBtn.onclick = togglePlay;

  els.detailSlider.oninput = () => {
    if (modalAudio.duration) {
      modalAudio.currentTime = (els.detailSlider.value / 100) * modalAudio.duration;
    }
  };

  els.detailSeekBackBtn.onclick = () => {
    if (modalAudio) modalAudio.currentTime = Math.max(0, modalAudio.currentTime - 5);
  };

  els.detailSeekFwdBtn.onclick = () => {
    if (modalAudio && modalAudio.duration) modalAudio.currentTime = Math.min(modalAudio.duration, modalAudio.currentTime + 5);
  };

  els.detailCopyBtn.onclick = () => {
    navigator.clipboard.writeText(entry.text);
    const span = els.detailCopyBtn.querySelector('span:last-child');
    if (span) span.textContent = '¡Copiado!';
    setTimeout(() => { if (span) span.textContent = 'Copiar texto'; }, 2000);
  };

  els.detailDownloadBtn.href = audioUrl;
  els.detailDownloadBtn.download = entry.filename;

  els.detailDeleteBtn.onclick = () => {
    closeDetailsModal();
    confirmMoveToTrash(entry.id, modalAudio);
  };

  els.detailEditPrompterBtn.onclick = () => {
    els.textInput.value = entry.text;
    updateCharAndEstimate();
    closeDetailsModal();
    els.textInput.focus();
  };

  els.detailsModal.classList.remove('hidden');
  animate(els.detailsModal, { opacity: [0, 1] }, { duration: 0.15 });
}

els.detailsModalCloseBtn.addEventListener('click', closeDetailsModal);
els.detailCloseBottomBtn.addEventListener('click', closeDetailsModal);
setupModalClosing(els.detailsModal, closeDetailsModal);

// -------------------------------------------------- project modal --
function setProjectModalMode(mode) {
  projectModalMode = mode;
  if (mode === 'project') {
    els.projectModalTitle.textContent = 'Crear Nuevo Proyecto';
    els.projectInputContainer.classList.remove('hidden');
    els.partInputLabel.textContent = 'Primera Parte';
    els.projectModalSaveBtnText.textContent = 'Crear Proyecto';
    els.tabNewProjectToggle.className = 'flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1e2230] text-blue-400 font-bold shadow-sm border border-blue-500/30 transition-all';
    els.tabNewPartToggle.className = 'flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors';
    setTimeout(() => els.newProjectNameInput.focus(), 50);
  } else {
    els.projectModalTitle.textContent = 'Crear Nueva Parte';
    els.projectInputContainer.classList.add('hidden');
    els.partInputLabel.textContent = 'Nombre de la nueva Parte';
    els.projectModalSaveBtnText.textContent = 'Crear Parte';
    els.tabNewPartToggle.className = 'flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1e2230] text-blue-400 font-bold shadow-sm border border-blue-500/30 transition-all';
    els.tabNewProjectToggle.className = 'flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors';
    
    const proj = state.projects.find(p => p.id === state.activeProjectId);
    const nextNum = proj && proj.parts ? proj.parts.length + 1 : 2;
    els.newPartNameInput.value = `Parte ${nextNum}`;
    setTimeout(() => {
      els.newPartNameInput.focus();
      els.newPartNameInput.select();
    }, 50);
  }
}

function openProjectModal(initialMode = 'project') {
  els.newProjectNameInput.value = '';
  els.projectNotesInput.value = '';
  els.newPartNameInput.value = 'Parte 1';
  setProjectModalMode(initialMode);

  els.projectModal.classList.remove('hidden');
  animate(els.projectModal, { opacity: [0, 1] }, { duration: 0.15 });
}

function closeProjectModal() {
  animate(els.projectModal, { opacity: 0 }, { 
    duration: 0.15, 
    onComplete: () => els.projectModal.classList.add('hidden') 
  });
}

els.tabNewProjectToggle.addEventListener('click', () => setProjectModalMode('project'));
els.tabNewPartToggle.addEventListener('click', () => setProjectModalMode('part'));
els.newProjectBtn.addEventListener('click', () => openProjectModal('project'));
els.newPartBtn.addEventListener('click', () => openProjectModal('part'));
els.projectModalCloseBtn.addEventListener('click', closeProjectModal);
els.projectModalCancelBtn.addEventListener('click', closeProjectModal);
setupModalClosing(els.projectModal, closeProjectModal);

els.projectModalSaveBtn.addEventListener('click', async () => {
  if (projectModalMode === 'project') {
    const name = els.newProjectNameInput.value.trim();
    if (!name) return;
    const firstPartName = els.newPartNameInput.value.trim() || 'Parte 1';
    
    const res = await fetchJSON('/api/projects', 'POST', { name });
    if (res && res.project) {
      state.projects = res.projects;
      state.activeProjectId = res.project.id;
      state.activePartId = res.project.parts[0].id;

      if (firstPartName !== 'Parte 1') {
        res.project.parts[0].name = firstPartName;
        await fetchJSON(`/api/projects`, 'GET');
      }

      renderProjects();
      await saveActiveProjectScope();
      await loadInitialResults();
      closeProjectModal();
    }
  } else {
    const name = els.newPartNameInput.value.trim() || 'Nueva Parte';
    const res = await fetchJSON(`/api/projects/${state.activeProjectId}/parts`, 'POST', { name });
    if (res && res.part) {
      state.projects = res.projects;
      state.activePartId = res.part.id;
      renderParts();
      updateScopeBadge();
      await saveActiveProjectScope();
      await loadInitialResults();
      closeProjectModal();
    }
  }
});

// -------------------------------------------------- project context popover --
function toggleProjectContextMenu(e) {
  if (e) e.stopPropagation();
  const isHidden = els.projectContextMenu.classList.contains('hidden');
  if (isHidden) {
    els.projectContextMenu.classList.remove('hidden');
    animate(els.projectContextMenu, { opacity: [0, 1], scale: [0.95, 1], y: [-4, 0] }, { duration: 0.12 });
  } else {
    closeProjectContextMenu();
  }
}

function closeProjectContextMenu() {
  if (!els.projectContextMenu || els.projectContextMenu.classList.contains('hidden')) return;
  animate(els.projectContextMenu, { opacity: [1, 0], scale: [1, 0.95] }, {
    duration: 0.1,
    onComplete: () => els.projectContextMenu.classList.add('hidden')
  });
}

els.projectOptionsBtn.addEventListener('click', toggleProjectContextMenu);

document.addEventListener('click', (e) => {
  if (els.projectContextMenu && !els.projectContextMenu.contains(e.target) && !els.projectOptionsBtn.contains(e.target)) {
    closeProjectContextMenu();
  }
});

els.menuActionRename.addEventListener('click', () => {
  closeProjectContextMenu();
  openRenameProjectModal();
});

els.menuActionNewPart.addEventListener('click', () => {
  closeProjectContextMenu();
  openProjectModal('part');
});

els.menuActionDelete.addEventListener('click', () => {
  closeProjectContextMenu();
  openDeleteProjectModal();
});

// -------------------------------------------------- rename project modal --
function openRenameProjectModal() {
  const currentProj = state.projects.find(p => p.id === state.activeProjectId);
  if (!currentProj) return;
  els.renameCurrentDisplay.textContent = currentProj.name;
  els.renameProjectInput.value = currentProj.name;

  els.renameProjectModal.classList.remove('hidden');
  animate(els.renameProjectModal, { opacity: [0, 1] }, { duration: 0.15 });
  setTimeout(() => {
    els.renameProjectInput.focus();
    els.renameProjectInput.select();
  }, 50);
}

function closeRenameProjectModal() {
  animate(els.renameProjectModal, { opacity: 0 }, { 
    duration: 0.15, 
    onComplete: () => els.renameProjectModal.classList.add('hidden') 
  });
}

els.renameProjectCloseBtn.addEventListener('click', closeRenameProjectModal);
els.renameProjectCancelBtn.addEventListener('click', closeRenameProjectModal);
setupModalClosing(els.renameProjectModal, closeRenameProjectModal);

els.renameProjectSaveBtn.addEventListener('click', async () => {
  const newName = els.renameProjectInput.value.trim();
  if (!newName) return;

  const res = await fetchJSON(`/api/projects/${state.activeProjectId}`, 'PUT', { name: newName });
  if (res && res.projects) {
    state.projects = res.projects;
    renderProjects();
    updateScopeBadge();
    closeRenameProjectModal();
  }
});

els.renameProjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.renameProjectSaveBtn.click();
});

// -------------------------------------------------- delete project modal --
async function openDeleteProjectModal() {
  const currentProj = state.projects.find(p => p.id === state.activeProjectId);
  if (!currentProj) return;

  if (state.projects.length <= 1) {
    showError('No se puede eliminar el único proyecto disponible.');
    return;
  }

  els.deleteProjectTargetName.textContent = `«${currentProj.name}»`;
  const partsCount = currentProj.parts ? currentProj.parts.length : 1;
  els.deleteProjectPartsCount.innerHTML = `<span class="text-blue-400">📄</span> ${partsCount} ${partsCount === 1 ? 'Parte' : 'Partes'}`;

  const history = await fetchJSON('/api/history');
  const projAudios = history.filter(h => h.project_id === state.activeProjectId && !h.trashed_at);
  els.deleteProjectAudiosCount.innerHTML = `<span class="text-emerald-400">🎵</span> ${projAudios.length} ${projAudios.length === 1 ? 'Toma' : 'Tomas'}`;

  els.deleteProjectModal.classList.remove('hidden');
  animate(els.deleteProjectModal, { opacity: [0, 1] }, { duration: 0.15 });
}

function closeDeleteProjectModal() {
  animate(els.deleteProjectModal, { opacity: 0 }, { 
    duration: 0.15, 
    onComplete: () => els.deleteProjectModal.classList.add('hidden') 
  });
}

els.deleteProjectCloseBtn.addEventListener('click', closeDeleteProjectModal);
els.deleteProjectCancelBtn.addEventListener('click', closeDeleteProjectModal);
setupModalClosing(els.deleteProjectModal, closeDeleteProjectModal);

els.deleteProjectConfirmBtn.addEventListener('click', async () => {
  const res = await fetchJSON(`/api/projects/${state.activeProjectId}`, 'DELETE');
  if (res && res.projects) {
    state.projects = res.projects;
    state.activeProjectId = state.projects[0].id;
    state.activePartId = state.projects[0].parts[0].id;
    renderProjects();
    await saveActiveProjectScope();
    await loadInitialResults();
    closeDeleteProjectModal();
  }
});

// -------------------------------------------------- batch import modal --
function openBatchImportModal() {
  importedFilesData = [];
  renderImportedFiles();
  els.batchImportModal.classList.remove('hidden');
  animate(els.batchImportModal, { opacity: [0, 1] }, { duration: 0.15 });
}

function closeBatchImportModal() {
  animate(els.batchImportModal, { opacity: 0 }, { 
    duration: 0.15, 
    onComplete: () => els.batchImportModal.classList.add('hidden') 
  });
}

els.batchImportBtn.addEventListener('click', openBatchImportModal);
els.batchImportCloseBtn.addEventListener('click', closeBatchImportModal);
els.batchImportCancelBtn.addEventListener('click', closeBatchImportModal);
setupModalClosing(els.batchImportModal, closeBatchImportModal);

els.txtDropzone.addEventListener('click', () => {
  els.txtFileInput.click();
});

els.txtDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.txtDropzone.classList.add('border-brand-500', 'bg-surface-panel');
});

els.txtDropzone.addEventListener('dragleave', () => {
  els.txtDropzone.classList.remove('border-brand-500', 'bg-surface-panel');
});

els.txtDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.txtDropzone.classList.remove('border-brand-500', 'bg-surface-panel');
  if (e.dataTransfer.files) {
    handleFiles(Array.from(e.dataTransfer.files));
  }
});

els.txtFileInput.addEventListener('change', (e) => {
  if (e.target.files) {
    handleFiles(Array.from(e.target.files));
  }
});

function handleFiles(files) {
  const txtFiles = files.filter(f => f.name.endsWith('.txt'));
  if (txtFiles.length === 0) return;

  txtFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      importedFilesData.push({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        chars: content.length,
        content: content
      });
      renderImportedFiles();
    };
    reader.readAsText(file);
  });
}

function renderImportedFiles() {
  if (importedFilesData.length === 0) {
    els.txtFilesQueueSection.classList.add('hidden');
    return;
  }
  els.txtFilesQueueSection.classList.remove('hidden');
  els.txtFilesCountBadge.textContent = `${importedFilesData.length} ${importedFilesData.length === 1 ? 'archivo' : 'archivos'}`;
  els.txtFilesList.innerHTML = '';

  importedFilesData.forEach((f, idx) => {
    const est = (f.chars / 14).toFixed(0);
    const estStr = est > 60 ? `~${(est / 60).toFixed(1)} min` : `~${est}s`;

    const div = document.createElement('div');
    div.className = 'bg-surface-panel border border-surface-borderLight/40 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-surface-borderLight transition-all';
    div.innerHTML = `
      <div class="flex items-center space-x-3 min-w-0 flex-1">
        <span class="font-mono text-[11px] text-brand-400 bg-surface-card border border-surface-borderLight/40 px-2.5 py-1 rounded-lg font-bold">${String(idx + 1).padStart(2, '0')}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-semibold text-white truncate font-mono">${escapeHtml(f.name)}</span>
            <span class="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded">Listo</span>
          </div>
          <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
            <span>${f.size}</span>
            <span>·</span>
            <span>${f.chars.toLocaleString()} caracteres</span>
            <span>·</span>
            <span class="text-slate-300">${estStr}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-1 shrink-0">
        <button class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-card transition-colors preview-file-btn" title="Previsualizar y editar texto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
        <button class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-surface-card transition-colors delete-file-btn" title="Quitar de la lista">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      </div>
    `;

    div.querySelector('.preview-file-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openTxtEditorModal(idx);
    });

    div.querySelector('.delete-file-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      importedFilesData.splice(idx, 1);
      renderImportedFiles();
    });

    els.txtFilesList.appendChild(div);
  });
}

els.txtClearQueueBtn.addEventListener('click', () => {
  importedFilesData = [];
  renderImportedFiles();
});

if (els.quickUploadTxtBtn) {
  els.quickUploadTxtBtn.addEventListener('click', openBatchImportModal);
}

els.batchImportConfirmBtn.addEventListener('click', async () => {
  if (importedFilesData.length === 0) return;

  const dest = document.querySelector('input[name="txtImportDestination"]:checked')?.value || 'parts';

  if (dest === 'parts') {
    for (const f of importedFilesData) {
      const partName = f.name.replace(/\.txt$/i, '');
      await fetchJSON(`/api/projects/${state.activeProjectId}/parts`, 'POST', { name: partName });
    }
    const projects = await fetchJSON('/api/projects');
    state.projects = projects;
    renderParts();
    updateScopeBadge();
  } else {
    const fullText = importedFilesData.map(f => f.content).join('\n\n');
    els.textInput.value = fullText;
    updateCharAndEstimate();
  }

  closeBatchImportModal();
});

// -------------------------------------------------- txt editor & preview modal --
let currentEditingTxtIndex = 0;
let originalTxtContents = {};

function openTxtEditorModal(fileIndex = 0) {
  if (!importedFilesData || importedFilesData.length === 0) return;
  currentEditingTxtIndex = fileIndex;
  
  if (originalTxtContents[fileIndex] === undefined) {
    originalTxtContents[fileIndex] = importedFilesData[fileIndex].content;
  }

  renderTxtEditorTabs();
  loadTxtEditorFile(fileIndex);

  els.txtEditorModal.classList.remove('hidden');
  animate(els.txtEditorModal, { opacity: [0, 1], scale: [0.98, 1] }, { duration: 0.15 });
}

function closeTxtEditorModal() {
  animate(els.txtEditorModal, { opacity: 0, scale: 0.98 }, {
    duration: 0.12,
    onComplete: () => els.txtEditorModal.classList.add('hidden')
  });
}

function renderTxtEditorTabs() {
  els.txtEditorFileTabs.innerHTML = '<span class="text-slate-500 font-medium mr-1 uppercase text-[10px] tracking-wider">Archivos en cola:</span>';
  importedFilesData.forEach((f, idx) => {
    const isActive = idx === currentEditingTxtIndex;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isActive 
      ? 'relative py-2.5 px-3.5 flex items-center gap-2 text-slate-100 font-medium border-b-2 border-blue-500 bg-blue-500/5 transition'
      : 'py-2.5 px-3.5 flex items-center gap-2 text-slate-400 hover:text-slate-200 border-b-2 border-transparent hover:border-slate-700 transition';
    
    const charsK = (f.chars / 1000).toFixed(1) + 'k car.';
    btn.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-400' : 'bg-slate-600'}"></span>
      <span class="truncate max-w-[190px]">${escapeHtml(f.name)}</span>
      <span class="ml-1 text-[10px] font-mono ${isActive ? 'text-blue-300/80 bg-blue-500/20' : 'text-slate-500 bg-slate-800'} px-1.5 py-0.5 rounded">${charsK}</span>
    `;
    btn.addEventListener('click', () => {
      saveCurrentTxtContent();
      currentEditingTxtIndex = idx;
      if (originalTxtContents[idx] === undefined) {
        originalTxtContents[idx] = importedFilesData[idx].content;
      }
      renderTxtEditorTabs();
      loadTxtEditorFile(idx);
    });
    els.txtEditorFileTabs.appendChild(btn);
  });
}

function loadTxtEditorFile(idx) {
  const f = importedFilesData[idx];
  if (!f) return;
  els.txtEditorFileName.textContent = f.name;
  els.txtEditorFileSize.textContent = f.size;
  els.txtEditorContent.value = f.content;
  updateTxtTelemetry();
  updateTxtLineNumbers();
}

function saveCurrentTxtContent() {
  if (importedFilesData[currentEditingTxtIndex]) {
    const content = els.txtEditorContent.value;
    importedFilesData[currentEditingTxtIndex].content = content;
    importedFilesData[currentEditingTxtIndex].chars = content.length;
  }
}

function updateTxtTelemetry() {
  const text = els.txtEditorContent.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const estSeconds = Math.round(chars / 14);
  const estStr = estSeconds > 60 ? `~${(estSeconds / 60).toFixed(1)} min` : `~${estSeconds}s`;

  els.txtEditorCharHeader.textContent = `${chars.toLocaleString()} caracteres`;
  els.txtEditorEstHeader.textContent = `${estStr} estimados`;

  els.txtTelemetryChars.textContent = chars.toLocaleString();
  els.txtTelemetryWords.textContent = words.toLocaleString();
  els.txtTelemetryParagraphs.textContent = `${paragraphs} ${paragraphs === 1 ? 'bloque' : 'bloques'}`;
  els.txtTelemetryEstDuration.textContent = estStr;
}

function updateTxtLineNumbers() {
  const text = els.txtEditorContent.value;
  const linesCount = text.split('\n').length;
  let gutterHtml = '';
  for (let i = 1; i <= Math.max(linesCount, 20); i++) {
    gutterHtml += `<div>${String(i).padStart(3, '0')}</div>`;
  }
  els.txtLineNumbersGutter.innerHTML = gutterHtml;
}

// Cleaning tools logic
els.cleanToolDashes.addEventListener('click', () => {
  const val = els.txtEditorContent.value;
  const cleaned = val.replace(/^[\t ]*[-–—]{1,2}\s*/gm, '— ').replace(/\s+--\s+/g, ' — ');
  els.txtEditorContent.value = cleaned;
  updateTxtTelemetry();
  updateTxtLineNumbers();
});

els.cleanToolQuotes.addEventListener('click', () => {
  const val = els.txtEditorContent.value;
  const cleaned = val.replace(/"([^"]+)"/g, '«$1»').replace(/'([^']+)'/g, '«$1»');
  els.txtEditorContent.value = cleaned;
  updateTxtTelemetry();
  updateTxtLineNumbers();
});

els.cleanToolBlankLines.addEventListener('click', () => {
  const val = els.txtEditorContent.value;
  const cleaned = val.replace(/\n{3,}/g, '\n\n');
  els.txtEditorContent.value = cleaned;
  updateTxtTelemetry();
  updateTxtLineNumbers();
});

els.cleanToolPauseTags.addEventListener('click', () => {
  const textarea = els.txtEditorContent;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + ' [pause:500ms] ' + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + 16;
  textarea.focus();
  updateTxtTelemetry();
  updateTxtLineNumbers();
});

els.txtSearchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  if (!query) return;
  const val = els.txtEditorContent.value;
  const idx = val.toLowerCase().indexOf(query.toLowerCase());
  if (idx !== -1) {
    els.txtEditorContent.focus();
    els.txtEditorContent.setSelectionRange(idx, idx + query.length);
  }
});

els.txtResetOriginalBtn.addEventListener('click', () => {
  if (originalTxtContents[currentEditingTxtIndex] !== undefined) {
    els.txtEditorContent.value = originalTxtContents[currentEditingTxtIndex];
    updateTxtTelemetry();
    updateTxtLineNumbers();
  }
});

els.txtEditorContent.addEventListener('input', () => {
  updateTxtTelemetry();
  updateTxtLineNumbers();
});

els.txtEditorContent.addEventListener('scroll', () => {
  els.txtLineNumbersGutter.scrollTop = els.txtEditorContent.scrollTop;
});

els.txtEditorCloseBtn.addEventListener('click', closeTxtEditorModal);
els.txtEditorDiscardBtn.addEventListener('click', closeTxtEditorModal);
setupModalClosing(els.txtEditorModal, closeTxtEditorModal);

els.txtEditorSaveBtn.addEventListener('click', () => {
  saveCurrentTxtContent();
  renderImportedFiles();
  closeTxtEditorModal();
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
    els.apiStatusContainer.className = 'flex items-center space-x-2.5 bg-surface-panel/90 border border-emerald-950/70 text-emerald-400 text-xs px-3.5 py-1.5 rounded-full shadow-inner-subtle';
    els.apiStatusDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-glow-emerald';
    els.apiStatusPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
    els.apiStatusPing.classList.remove('hidden');
    els.apiStatusText.textContent = 'Clave de API configurada';
  } else {
    els.apiStatusContainer.className = 'flex items-center space-x-2.5 bg-surface-panel/90 border border-rose-950/70 text-rose-400 text-xs px-3.5 py-1.5 rounded-full shadow-inner-subtle';
    els.apiStatusDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
    els.apiStatusPing.classList.add('hidden');
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
    const tagGender = isFemale ? '🎀 femenino' : '👔 masculino';
    const description = isFemale ? 'Una voz femenina joven y persuasiva, ideal para presentar temas sociales con claridad y convicción.'
                                 : 'Una voz masculina joven y segura, ideal para narrar conceptos creativos y educativos con un tono inspirador.';

    const card = document.createElement('article');
    card.className = 'bg-surface-card border border-surface-border hover:border-brand-500/50 rounded-2xl p-4 flex items-start space-x-4 transition-all group hover:shadow-lg hover:shadow-brand-500/5';
    card.innerHTML = `
      <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1c202d] to-[#151722] border border-surface-borderLight/60 flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 shadow-inner group-hover:border-brand-400 transition-colors">
        ${initials}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline space-x-2.5 flex-wrap">
          <h3 class="text-sm font-bold text-white tracking-tight truncate">${escapeHtml(v.name)}</h3>
          <span class="text-[11px] font-mono text-slate-400 truncate max-w-[220px]" title="${escapeHtml(v.reference_id)}">${escapeHtml(v.reference_id)}</span>
        </div>
        <p class="text-xs text-slate-400 mt-1 leading-relaxed">${description}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="inline-flex items-center text-[11px] bg-surface-panel border border-surface-borderLight/40 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
            <span class="mr-1.5 text-slate-400">🌐</span> es Spanish
          </span>
          <span class="inline-flex items-center text-[11px] bg-surface-panel border border-surface-borderLight/40 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
            ${tagGender}
          </span>
          <span class="inline-flex items-center text-[11px] bg-surface-panel border border-surface-borderLight/40 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
            young
          </span>
        </div>
      </div>
      <div class="shrink-0 flex items-center space-x-2">
        <button class="activate-voice-btn text-xs bg-surface-panel hover:bg-brand-500 hover:text-white text-slate-200 border border-surface-borderLight/50 px-3.5 py-1.5 rounded-xl transition-all font-semibold shadow-sm" title="Usar esta voz">
          Activar
        </button>
        <button class="delete-voice-btn text-xs text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors" title="Eliminar voz">
          ✕
        </button>
      </div>
    `;

    card.querySelector('.activate-voice-btn').addEventListener('click', () => {
      els.voiceSelect.value = v.reference_id;
      animate(els.voiceSelect.parentElement, { scale: [1, 1.03, 1] }, { duration: 0.2 });
    });

    card.querySelector('.delete-voice-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteVoice(i);
    });

    els.voiceList.appendChild(card);

    const opt = document.createElement('option');
    opt.value = v.reference_id;
    opt.textContent = v.name;
    els.voiceSelect.appendChild(opt);
  });
  
  if (state.voices.length > 0 && !els.voiceSelect.value) {
    els.voiceSelect.value = state.voices[0].reference_id;
  }
}

els.openAddVoiceBtn?.addEventListener('click', () => {
  const ajustesTab = document.querySelector('.tab-btn[data-tab="ajustes"]');
  if (ajustesTab) ajustesTab.click();
  setTimeout(() => els.newVoiceName.focus(), 100);
});

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
  updateCharAndEstimate();

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

function showError(msg) {
  els.errorBoxText.textContent = msg;
  els.errorBox.classList.remove('hidden');
}

function hideError() {
  els.errorBox.classList.add('hidden');
}

// ---------------------------------------------------- card rendering --
function createPendingCard(entry) {
  const card = document.createElement('div');
  card.id = `card-${entry.id}`;
  card.className = 'bg-surface-card border border-brand-500/50 rounded-2xl p-4 space-y-3 shadow-lg shadow-brand-500/10 transition-all';

  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2.5 text-xs text-brand-400 font-semibold">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-brand-400 animate-ping"></span>
        <span>Generando audio en el motor local...</span>
      </div>
      <button class="cancel-btn text-xs text-rose-400 hover:text-rose-300 font-mono px-2.5 py-1 rounded-lg bg-surface-input border border-surface-border transition-colors">
        ⏹ Cancelar
      </button>
    </div>
    <div class="text-xs text-slate-300 leading-relaxed font-mono line-clamp-2">${escapeHtml(entry.text)}</div>
  `;

  const cancelBtn = card.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/generate/${entry.id}/cancel`, { method: 'POST' });
      cancelBtn.textContent = '⏳ Cancelando...';
    } catch (err) {
      console.error('Error al cancelar:', err);
    }
  });

  return card;
}

function renderAudioCard(entry) {
  if (entry.status === 'pending') {
    return createPendingCard(entry);
  }

  if (entry.status === 'failed') {
    const errCard = document.createElement('div');
    errCard.id = `card-${entry.id}`;
    errCard.className = 'bg-surface-card border border-rose-900/60 rounded-2xl p-4 space-y-2.5';
    errCard.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="text-rose-400 font-semibold">❌ Error al generar: ${escapeHtml(entry.error || 'Fallo desconocido')}</span>
        <button class="delete-failed-btn text-slate-500 hover:text-rose-400 p-1">🗑</button>
      </div>
      <div class="text-xs text-slate-400 line-clamp-2 font-mono">${escapeHtml(entry.text)}</div>
    `;
    errCard.querySelector('.delete-failed-btn').addEventListener('click', () => permanentDelete(entry.id));
    return errCard;
  }

  const date = new Date((entry.timestamp || Date.now() / 1000) * 1000);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const audioUrl = `/static/audio/${entry.filename}`;

  const voice = state.voices.find(v => v.reference_id === entry.reference_id);
  const voiceName = voice ? voice.name : 'Voz guardada';
  const orderNum = entry.order_index || 1;
  const formatStr = (entry.format || 'mp3').toUpperCase();
  const speedStr = `${entry.speed || '1.0'}x`;

  const card = document.createElement('div');
  card.id = `card-${entry.id}`;
  card.className = 'bg-surface-card border border-surface-border hover:border-surface-borderLight rounded-2xl p-4 space-y-3.5 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:shadow-brand-500/5';

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center space-x-3.5 min-w-0">
        <span class="flex items-center justify-center w-8 h-8 rounded-xl bg-surface-input border border-surface-border text-xs font-mono font-bold text-brand-400 shrink-0 shadow-inner-subtle">#${orderNum}</span>
        <div class="min-w-0">
          <div class="flex items-center space-x-2.5">
            <span class="text-xs font-bold text-white truncate">${escapeHtml(voiceName)}</span>
            <span class="text-[11px] text-slate-500 font-mono shrink-0">${timeStr} · ${formatStr}</span>
          </div>
          <p class="text-xs text-slate-400 line-clamp-1 mt-0.5 leading-relaxed">${escapeHtml(entry.text)}</p>
        </div>
      </div>
      <div class="flex items-center space-x-1 shrink-0">
        <button class="card-download-btn p-2 text-slate-400 hover:text-white rounded-xl hover:bg-surface-input transition-all" title="Descargar audio">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
        </button>
        <button class="card-delete-btn p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-surface-input transition-all" title="Mover a la papelera">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mini Audio Player Track con Onda Dinámica -->
    <div class="bg-surface-panel/90 rounded-xl p-3 flex items-center space-x-3.5 border border-surface-border/70 shadow-inner-subtle">
      <button class="card-play-btn w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all">
        <span class="card-play-icon text-xs font-bold">▶</span>
      </button>

      <!-- Mini soundwave visualizer -->
      <div class="card-mini-wave hidden flex items-center gap-1 shrink-0 px-1">
        <span class="w-1 bg-brand-400 rounded-full h-3"></span>
        <span class="w-1 bg-brand-400 rounded-full h-5"></span>
        <span class="w-1 bg-brand-400 rounded-full h-2"></span>
        <span class="w-1 bg-brand-400 rounded-full h-4"></span>
      </div>

      <div class="flex-1 flex flex-col justify-center space-y-1.5">
        <div class="card-scrubber-track w-full bg-surface-border h-1.5 rounded-full overflow-hidden cursor-pointer relative">
          <div class="card-scrubber-progress bg-gradient-to-r from-brand-600 to-brand-400 h-full w-0 rounded-full transition-all duration-75"></div>
        </div>
        <div class="flex justify-between text-[10px] font-mono text-slate-400">
          <span class="card-cur-time font-medium text-brand-400">00:00.0</span>
          <span class="card-tot-time">00:00.0</span>
        </div>
      </div>
      <span class="text-[10px] font-mono text-slate-400 bg-surface-card px-2 py-0.5 rounded-md border border-surface-borderLight/40">${speedStr}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    openDetailsModal(entry);
  });

  const playBtn = card.querySelector('.card-play-btn');
  const playIcon = card.querySelector('.card-play-icon');
  const miniWave = card.querySelector('.card-mini-wave');
  const progressEl = card.querySelector('.card-scrubber-progress');
  const curTimeEl = card.querySelector('.card-cur-time');
  const totTimeEl = card.querySelector('.card-tot-time');
  const scrubberTrack = card.querySelector('.card-scrubber-track');
  const downloadBtn = card.querySelector('.card-download-btn');
  const deleteBtn = card.querySelector('.card-delete-btn');

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayCard(entry, card.id, playIcon, miniWave, progressEl, curTimeEl, totTimeEl);
  });

  scrubberTrack.addEventListener('click', (e) => {
    e.stopPropagation();
    const audio = cardAudios[entry.id];
    if (audio && audio.duration) {
      const rect = scrubberTrack.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pos * audio.duration;
    }
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

function togglePlayCard(entry, cardId, iconEl, miniWaveEl, progressEl, curTimeEl, totTimeEl) {
  const url = `/static/audio/${entry.filename}`;
  if (!cardAudios[entry.id]) {
    const audio = new Audio(url);
    audio.playbackRate = parseFloat(entry.speed || 1.0);
    
    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      progressEl.style.width = `${pct}%`;
      curTimeEl.textContent = fmtDetailedTime(audio.currentTime);
      totTimeEl.textContent = fmtDetailedTime(audio.duration);
    };

    audio.onloadedmetadata = () => {
      totTimeEl.textContent = fmtDetailedTime(audio.duration);
    };

    audio.onended = () => {
      iconEl.textContent = '▶';
      progressEl.style.width = '0%';
      miniWaveEl.classList.add('hidden');
    };

    cardAudios[entry.id] = audio;
  }
  
  const audio = cardAudios[entry.id];
  if (audio.paused) {
    if (currentPlayingAudio && currentPlayingAudio !== audio) {
      currentPlayingAudio.pause();
      if (currentPlayingCardId) {
        const oldCard = document.getElementById(currentPlayingCardId);
        if (oldCard) {
          const oldIcon = oldCard.querySelector('.card-play-icon');
          const oldWave = oldCard.querySelector('.card-mini-wave');
          if (oldIcon) oldIcon.textContent = '▶';
          if (oldWave) oldWave.classList.add('hidden');
        }
      }
    }
    if (modalAudio) modalAudio.pause();
    
    audio.play();
    iconEl.textContent = '⏸';
    miniWaveEl.classList.remove('hidden');
    miniWaveEl.classList.add('wave-animated');
    currentPlayingAudio = audio;
    currentPlayingCardId = cardId;
  } else {
    audio.pause();
    iconEl.textContent = '▶';
    miniWaveEl.classList.add('hidden');
  }
}

// ---------------------------------------------------- results loader --
async function loadInitialResults() {
  const history = await fetchJSON('/api/history');
  els.audioCardsContainer.innerHTML = '';

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
    const span = els.queueBadge.querySelector('span:last-child');
    if (span) span.textContent = `${activeJobsCount} en curso`;
  } else {
    els.queueBadge.classList.add('hidden');
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
    div.className = 'bg-surface-panel/80 border border-surface-borderLight/50 rounded-xl p-3.5 space-y-2.5 shadow-sm';
    const date = new Date(item.timestamp * 1000);
    const timeLabel = date.toLocaleString();

    const proj = state.projects.find(p => p.id === (item.project_id || 'default'));
    const projName = proj ? proj.name : 'General';
    const part = proj && proj.parts ? proj.parts.find(p => p.id === (item.part_id || 'part-1')) : null;
    const partName = part ? part.name : 'Parte 1';

    div.innerHTML = `
      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="text-brand-400 font-bold">#${item.order_index || activeHistory.length - idx}</span>
        <span class="truncate max-w-[170px]">${escapeHtml(projName)} (${escapeHtml(partName)})</span>
        <span>${timeLabel}</span>
      </div>
      <div class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${escapeHtml(item.text)}</div>
      <div class="flex items-center justify-end space-x-2 pt-2 border-t border-surface-border/50">
        <button class="play-hist-btn text-xs text-slate-200 hover:text-white px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">▶ Escuchar</button>
        <a href="/static/audio/${item.filename}" download="${item.filename}" class="text-xs text-slate-200 hover:text-white px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">⬇ Descargar</a>
        <button class="delete-btn text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">🗑 Papelera</button>
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
    div.className = 'bg-surface-panel/80 border border-surface-borderLight/50 rounded-xl p-3.5 space-y-2.5 shadow-sm';
    const date = new Date((item.trashed_at || item.timestamp) * 1000);
    const dateStr = date.toLocaleString();

    div.innerHTML = `
      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="text-rose-400 font-semibold">Eliminado: ${dateStr}</span>
      </div>
      <div class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${escapeHtml(item.text)}</div>
      <div class="flex items-center justify-end space-x-2 pt-2 border-t border-surface-border/50">
        <button class="play-hist-btn text-xs text-slate-200 hover:text-white px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">▶ Escuchar</button>
        <button class="restore-btn text-xs text-brand-400 hover:text-brand-300 px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">🔄 Restaurar</button>
        <button class="delete-btn text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-surface-input border border-surface-borderLight/30 transition-colors">✕ Eliminar</button>
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
    message: '¿Estás seguro de vaciar la papelera? Todos los audios eliminados se borrarán permanentemente de tu disco duro.',
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
    message: '¿Estás seguro de que quieres mover este audio a la papelera local?',
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
    message: '¿Estás seguro de que deseas eliminar este archivo de audio PERMANENTEMENTE? Esta acción no se puede deshacer.',
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
    if (currentPlayingCardId) {
      const oldCard = document.getElementById(currentPlayingCardId);
      if (oldCard) {
        const oldIcon = oldCard.querySelector('.card-play-icon');
        const oldWave = oldCard.querySelector('.card-mini-wave');
        if (oldIcon) oldIcon.textContent = '▶';
        if (oldWave) oldWave.classList.add('hidden');
      }
    }
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

function fmtDetailedTime(s) {
  if (isNaN(s)) return '00:00.0';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
}

init();
