// ============================================
// MIS IDEAS - App principal
// ============================================

let ideas = JSON.parse(localStorage.getItem('ideas') || '[]');
let folders = JSON.parse(localStorage.getItem('folders') || '[{"id":"general","name":"General","color":"#6c5ce7"}]');
let currentFilter = 'all';

// Audio recording
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordSeconds = 0;
let isRecording = false;

// Speech recognition
let recognition = null;
let transcribedText = '';

// ============================================
// INIT
// ============================================
function init() {
  setupSpeechRecognition();
  renderAll();
}

// ============================================
// SPEECH RECOGNITION
// ============================================
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = 'es-AR';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        final += e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    transcribedText = final + interim;
  };

  recognition.onerror = (e) => {
    console.log('Speech recognition error:', e.error);
  };
}

// ============================================
// AUDIO RECORDING
// ============================================
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    transcribedText = '';

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        openIdeaModal();
        document.getElementById('audioData').value = reader.result;
        document.getElementById('audioPreview').style.display = 'block';
        document.getElementById('audioPlayer').src = reader.result;

        // Put transcribed text in the textarea
        if (transcribedText.trim()) {
          document.getElementById('inputIdea').value = transcribedText.trim();
        }
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    isRecording = true;

    // Start speech recognition alongside recording
    if (recognition) {
      try { recognition.start(); } catch(e) {}
    }

    // UI updates
    document.getElementById('fabMic').classList.add('recording');
    document.getElementById('micIcon').textContent = '\u23F9';
    document.getElementById('recordingBar').classList.add('show');

    // Timer
    recordSeconds = 0;
    recordingTimer = setInterval(() => {
      recordSeconds++;
      const min = Math.floor(recordSeconds / 60);
      const sec = (recordSeconds % 60).toString().padStart(2, '0');
      document.getElementById('recordTime').textContent = `${min}:${sec}`;
    }, 1000);

  } catch (e) {
    alert('No se pudo acceder al microfono. Asegurate de dar permiso.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }

  isRecording = false;
  clearInterval(recordingTimer);

  document.getElementById('fabMic').classList.remove('recording');
  document.getElementById('micIcon').textContent = '\uD83C\uDFA4';
  document.getElementById('recordingBar').classList.remove('show');
}

// ============================================
// FOLDERS
// ============================================
function openFolderModal() {
  document.getElementById('inputFolderName').value = '';
  document.querySelectorAll('.color-btn').forEach((b, i) => {
    b.classList.toggle('selected', i === 0);
  });
  document.getElementById('folderModal').classList.add('open');
}

function selectColor(btn) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function saveFolder() {
  const name = document.getElementById('inputFolderName').value.trim();
  if (!name) {
    document.getElementById('inputFolderName').style.borderColor = '#ff6b6b';
    setTimeout(() => { document.getElementById('inputFolderName').style.borderColor = ''; }, 2000);
    return;
  }

  const color = document.querySelector('.color-btn.selected').dataset.color;
  const id = 'folder_' + Date.now();

  folders.push({ id, name, color });
  localStorage.setItem('folders', JSON.stringify(folders));

  closeModal('folderModal');
  renderAll();
}

function deleteFolder(folderId) {
  if (folderId === 'general') return;
  if (!confirm('Eliminar esta carpeta? Las ideas se moveran a General.')) return;

  // Move ideas to general
  ideas.forEach(idea => {
    if (idea.folder === folderId) idea.folder = 'general';
  });

  folders = folders.filter(f => f.id !== folderId);
  localStorage.setItem('folders', JSON.stringify(folders));
  localStorage.setItem('ideas', JSON.stringify(ideas));
  renderAll();
}

// ============================================
// IDEAS CRUD
// ============================================
function openIdeaModal(id) {
  const modal = document.getElementById('ideaModal');
  const folderSelect = document.getElementById('inputFolder');

  // Populate folder select
  folderSelect.innerHTML = folders.map(f =>
    `<option value="${f.id}">${f.name}</option>`
  ).join('');

  if (id) {
    const idea = ideas.find(i => i.id === id);
    document.getElementById('ideaModalTitle').textContent = 'Editar Idea';
    document.getElementById('inputIdea').value = idea.text;
    document.getElementById('inputFolder').value = idea.folder;
    document.getElementById('editIdeaId').value = id;

    if (idea.audio) {
      document.getElementById('audioPreview').style.display = 'block';
      document.getElementById('audioPlayer').src = idea.audio;
      document.getElementById('audioData').value = idea.audio;
    } else {
      document.getElementById('audioPreview').style.display = 'none';
      document.getElementById('audioData').value = '';
    }
  } else {
    document.getElementById('ideaModalTitle').textContent = 'Nueva Idea';
    if (!document.getElementById('audioData').value) {
      document.getElementById('inputIdea').value = '';
      document.getElementById('audioPreview').style.display = 'none';
      document.getElementById('audioData').value = '';
    }
    document.getElementById('editIdeaId').value = '';
  }

  modal.classList.add('open');
}

function saveIdea() {
  const text = document.getElementById('inputIdea').value.trim();
  const folder = document.getElementById('inputFolder').value;
  const audio = document.getElementById('audioData').value || null;
  const editId = document.getElementById('editIdeaId').value;

  if (!text && !audio) {
    document.getElementById('inputIdea').style.borderColor = '#ff6b6b';
    setTimeout(() => { document.getElementById('inputIdea').style.borderColor = ''; }, 2000);
    return;
  }

  if (editId) {
    const idx = ideas.findIndex(i => i.id === editId);
    ideas[idx] = { ...ideas[idx], text, folder, audio };
  } else {
    ideas.push({
      id: Date.now().toString(),
      text: text || '(Audio sin texto)',
      folder,
      audio,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  localStorage.setItem('ideas', JSON.stringify(ideas));

  // Reset audio state
  document.getElementById('audioData').value = '';
  document.getElementById('audioPreview').style.display = 'none';

  closeModal('ideaModal');
  renderAll();
}

function toggleIdeaStatus(id) {
  const idea = ideas.find(i => i.id === id);
  idea.completed = !idea.completed;
  localStorage.setItem('ideas', JSON.stringify(ideas));
  renderAll();
}

function deleteIdea(id) {
  if (!confirm('Eliminar esta idea?')) return;
  ideas = ideas.filter(i => i.id !== id);
  localStorage.setItem('ideas', JSON.stringify(ideas));
  renderAll();
}

function moveIdea(ideaId, folderId) {
  const idea = ideas.find(i => i.id === ideaId);
  idea.folder = folderId;
  localStorage.setItem('ideas', JSON.stringify(ideas));
  renderAll();
}

// ============================================
// FILTERS
// ============================================
function setFilter(btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderAll();
}

// ============================================
// RENDER
// ============================================
function renderAll() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();
  const content = document.getElementById('content');

  // Filter ideas
  let filtered = ideas.filter(idea => {
    if (currentFilter === 'pending' && idea.completed) return false;
    if (currentFilter === 'completed' && !idea.completed) return false;
    if (search && !idea.text.toLowerCase().includes(search)) return false;
    return true;
  });

  // Update stats
  document.getElementById('totalIdeas').textContent = ideas.length;
  document.getElementById('completedIdeas').textContent = ideas.filter(i => i.completed).length;
  document.getElementById('pendingIdeas').textContent = ideas.filter(i => !i.completed).length;

  if (filtered.length === 0 && ideas.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128161;</div>
        <p>No tenes ideas guardadas todavia.<br>
        Toca &#127908; para grabar o &#9998; para escribir.</p>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128269;</div>
        <p>No se encontraron ideas con ese filtro.</p>
      </div>
    `;
    return;
  }

  // Group by folder
  let html = '';
  folders.forEach(folder => {
    const folderIdeas = filtered.filter(i => i.folder === folder.id);
    if (folderIdeas.length === 0) return;

    const deleteBtn = folder.id !== 'general'
      ? `<button onclick="deleteFolder('${folder.id}')" title="Eliminar carpeta">&#128465;</button>`
      : '';

    html += `
      <div class="folder-section">
        <div class="folder-header">
          <div class="folder-header-left">
            <div class="folder-dot" style="background:${folder.color}"></div>
            <span class="folder-name">${escHtml(folder.name)}</span>
            <span class="folder-count">${folderIdeas.length}</span>
          </div>
          <div class="folder-actions">
            ${deleteBtn}
          </div>
        </div>
        ${folderIdeas.map(idea => renderIdeaCard(idea, folder.color)).join('')}
      </div>
    `;
  });

  // Ideas without valid folder (fallback to general)
  const orphanIdeas = filtered.filter(i => !folders.find(f => f.id === i.folder));
  if (orphanIdeas.length > 0) {
    orphanIdeas.forEach(i => { i.folder = 'general'; });
    localStorage.setItem('ideas', JSON.stringify(ideas));
  }

  content.innerHTML = html;
}

function renderIdeaCard(idea, folderColor) {
  const statusIcon = idea.completed ? '&#9989;' : '&#128336;';
  const completedClass = idea.completed ? 'completed' : '';
  const date = new Date(idea.createdAt);
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const audioHtml = idea.audio ? `
    <div class="idea-audio">
      <audio src="${idea.audio}" controls preload="none"></audio>
    </div>
  ` : '';

  const audioBadge = idea.audio ? '<span class="idea-badge idea-badge-audio">&#127908; Audio</span>' : '';

  // Move dropdown with folder options
  const moveOptions = folders.map(f =>
    `<button onclick="moveIdea('${idea.id}','${f.id}');event.stopPropagation()">
      <span class="move-dot" style="background:${f.color}"></span>
      ${escHtml(f.name)}
    </button>`
  ).join('');

  return `
    <div class="idea-card ${completedClass}" style="border-left-color:${folderColor}">
      <div class="idea-top">
        <div class="idea-status" onclick="toggleIdeaStatus('${idea.id}')">${statusIcon}</div>
        <div class="idea-body">
          <div class="idea-text">${escHtml(idea.text)}</div>
          <div class="idea-meta">
            <span class="idea-date">${dateStr} ${timeStr}</span>
            ${audioBadge}
          </div>
          ${audioHtml}
        </div>
      </div>
      <div class="idea-actions">
        <button class="btn-edit-idea" onclick="openIdeaModal('${idea.id}')">Editar</button>
        <button class="btn-move-idea" onclick="showMoveMenu(this, '${idea.id}')">Mover</button>
        <button class="btn-delete-idea" onclick="deleteIdea('${idea.id}')">Eliminar</button>
      </div>
    </div>
  `;
}

function showMoveMenu(btn, ideaId) {
  // Remove any existing dropdowns
  document.querySelectorAll('.move-dropdown').forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'move-dropdown show';
  dropdown.innerHTML = folders.map(f =>
    `<button onclick="moveIdea('${ideaId}','${f.id}')">
      <span class="move-dot" style="background:${f.color}"></span>
      ${escHtml(f.name)}
    </button>`
  ).join('');

  btn.style.position = 'relative';
  btn.appendChild(dropdown);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      dropdown.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 10);
}

// ============================================
// MODALS
// ============================================
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeModalOutside(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ============================================
// UTILS
// ============================================
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// START
// ============================================
init();
