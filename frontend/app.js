// Use Azure deployed API
const API_URL = 'http://todotaskmanager-erivela21.northeurope.azurecontainer.io:5000/tasks';
let currentFilter = 'all';
let lastTasksCache = [];
// Offline support state
let offlineQueue = [];        // queued operations while offline
let tempIdCounter = -1;       // negative IDs for offline-created tasks

// LocalStorage keys
const LS_TASKS = 'tasksLocal';
const LS_QUEUE = 'offlineQueue';
const LS_TEMPID = 'tempIdCounter';
const LS_ACHIEVEMENTS = 'achievementsUnlocked';

// Achievement definitions (ordered by unlock threshold of completed tasks)
// Image file assumptions (place in project root or adjust path):
// bumblebee.png, lockdown.png, ironhide.png, ratchet.png, shockwave.png,
// starscream.png, soundwave.png, megatron.png, jetfire.png, optimus.png
const ACHIEVEMENTS = [
  { id:1, name:'Bumblebee', threshold:1, desc:'First task completed. Small but brave!', icon:'BB', img:'assets/BUMBLEBEE.png' },
  { id:2, name:'Lockdown', threshold:3, desc:'You are becoming a relentless hunter of tasks.', icon:'LD', img:'assets/LOCKDOWN.png' },
  { id:3, name:'Ironhide', threshold:5, desc:'Sturdy dedication forged.', icon:'IH', img:'assets/IRONHIDE.png' },
  { id:4, name:'Ratchet', threshold:8, desc:'A healer of backlog wounds.', icon:'RT', img:'assets/RATCHET.png' },
  { id:5, name:'Shockwave', threshold:12, desc:'Cold logic drives your output.', icon:'SH', img:'assets/SCHOCKWAVE.png' },
  { id:6, name:'Starscream', threshold:17, desc:'Ambition rising high (watch your ego).', icon:'SS', img:'assets/STARSCREAM.png' },
  { id:7, name:'Soundwave', threshold:23, desc:'Efficient data execution—superior.', icon:'SW', img:'assets/SOUNDWAVE.png' },
  { id:8, name:'Megatron', threshold:30, desc:'Relentless drive achieved.', icon:'MG', img:'assets/MEGATRON.png' },
  { id:9, name:'Jetfire', threshold:40, desc:'Ancient wisdom + velocity unlocked.', icon:'JF', img:'assets/JETFIRE.png' },
  { id:10, name:'Optimus Prime', threshold:55, desc:'Leadership through unwavering productivity.', icon:'OP', img:'assets/OPTIMUSPRIME.png' }
];
let unlockedAchievementIds = [];
// Intel activity feed state
let intelFeed = [];

// ---- SOUND SYSTEM (Web Audio API) ----
class SFXManager {
  constructor(){
    this.ctx = null; // lazy init on first play (user gesture requirement)
    this.masterGain = null;
    this.enabled = JSON.parse(localStorage.getItem('sfxEnabled') || 'true');
    this.decay = 0.0025; // global envelope decay fallback
  }
  _ensure(){
    if(!this.ctx){
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);
    }
  }
  toggle(){ this.enabled = !this.enabled; localStorage.setItem('sfxEnabled', JSON.stringify(this.enabled)); return this.enabled; }
  play(type, opts={}){ if(!this.enabled) return; this._ensure(); switch(type){
    case 'add': return this.sequence([ { f:740, d:0.08 }, { f:880, d:0.11 } ], { curve:'up' });
    case 'complete': return this.sequence([ { f:520, d:0.07 }, { f:660, d:0.09 }, { f:880, d:0.13 } ], { curve:'ease' });
    case 'delete': return this.noiseHit({ duration:0.12, lowpass:900 });
    case 'unlock': return this.sequence([ { f:392, d:0.09 }, { f:523, d:0.09 }, { f:659, d:0.1 }, { f:784, d:0.4 } ], { shimmer:true });
    case 'bulk': return this.sequence([ { f:360, d:0.05 }, { f:420, d:0.05 }, { f:480, d:0.06 }, { f:600, d:0.12 } ], { curve:'rise' });
    case 'tab': return this.sequence([ { f:440, d:0.05 }, { f:660, d:0.07 } ], { curve:'quick' });
    case 'focus-open': return this.sequence([ { f:300, d:0.04 }, { f:520, d:0.09 } ], { curve:'up' });
    case 'focus-close': return this.sequence([ { f:520, d:0.05 }, { f:300, d:0.07 } ], { reverse:true });
    default: return; }
  }
  sequence(notes, options={}){
    const now = this.ctx.currentTime;
    let t = now;
    notes.forEach((n,i)=>{
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      if(options.shimmer){
        // add a subtle high sine layer
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type='sine'; osc2.frequency.setValueAtTime(n.f*2, t);
        g2.gain.setValueAtTime(0.15, t);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
        osc2.connect(g2).connect(this.masterGain);
        osc2.start(t); osc2.stop(t + n.d + 0.02);
      }
      osc.connect(gain).connect(this.masterGain);
      osc.start(t); osc.stop(t + n.d + 0.02);
      t += n.d * 0.72; // slight overlap
    });
  }
  noiseHit({ duration=0.15, lowpass=1200 }={}){
    const now = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){ data[i] = (Math.random()*2 -1) * (1 - (i/data.length)); }
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(lowpass, now);
    const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(lp).connect(gain).connect(this.masterGain);
    src.start(now); src.stop(now + duration + 0.05);
  }
}
const SFX = new SFXManager();

// ---- WAV AUDIO INTEGRATION ----
// Provided WAV assets mapped to key events. We preload lazily on first play.
// Files now in assets folder for local hosting compatibility.
const WAV_SOURCES = {
  delete: 'assets/DELETE2.wav',       // task deletion
  edited: 'assets/EDITED.wav',        // add task or edit/save task
  unlock: 'assets/UNLOCKEDCHARACTER.wav' // achievement unlock
};
const _wavElems = {};
function _getWav(name){
  if(!_wavElems[name]){
    const a = new Audio(WAV_SOURCES[name]);
    a.preload = 'auto';
    _wavElems[name] = a;
  }
  return _wavElems[name];
}
function playWav(name, fallbackSfx){
  if(!SFX.enabled) return; // reuse SFX enable toggle
  try {
    const a = _getWav(name);
    a.currentTime = 0; // rewind so rapid successive plays work
    const p = a.play();
    if(p && p.catch){
      p.catch(()=>{ if(fallbackSfx) SFX.play(fallbackSfx); });
    }
  } catch(e){
    if(fallbackSfx) SFX.play(fallbackSfx);
  }
}

function refreshSfxButton(){
  const img=document.getElementById('sfx-icon');
  if(img){
    if(SFX.enabled){ img.src='../VOLUME.png'; img.alt='Sound On'; }
    else { img.src='../MUTEICON.png'; img.alt='Sound Off'; }
  }
}
function toggleSFX(){
  SFX.toggle();
  refreshSfxButton();
  if(SFX.enabled) SFX.play('tab'); // small confirmation blip
}

function loadOfflineState(){
  try {
    offlineQueue = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]');
    lastTasksCache = lastTasksCache.length ? lastTasksCache : JSON.parse(localStorage.getItem(LS_TASKS) || '[]');
    const storedTemp = parseInt(localStorage.getItem(LS_TEMPID),10);
    if(!isNaN(storedTemp)) tempIdCounter = storedTemp;
    unlockedAchievementIds = JSON.parse(localStorage.getItem(LS_ACHIEVEMENTS) || '[]');
  } catch(e){ console.warn('Offline state load error', e); }
}
function persistOfflineState(){
  localStorage.setItem(LS_QUEUE, JSON.stringify(offlineQueue));
  localStorage.setItem(LS_TASKS, JSON.stringify(lastTasksCache));
  localStorage.setItem(LS_TEMPID, String(tempIdCounter));
  localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(unlockedAchievementIds));
}

function queueOp(op){ offlineQueue.push(op); persistOfflineState(); }

// Success GIF overlay logic restored
function showSuccessGif(){
  const o=document.getElementById('success-overlay');
  if(!o) return;
  o.style.display='flex';
  clearTimeout(showSuccessGif._t);
  // Force restart of GIF by cloning image (ensures full playback each trigger)
  const img = o.querySelector('img.success-gif');
  if(img){
    const clone = img.cloneNode(true);
    img.parentNode.replaceChild(clone, img);
  }
  // Longer visibility (4s) so animation can complete
  showSuccessGif._t = setTimeout(()=>{ o.style.display='none'; }, 4000);
}

function showDeleteGif(){
  const o=document.getElementById('success-overlay');
  if(!o) return;
  o.style.display='flex';
  clearTimeout(showDeleteGif._t);
  // Force restart of GIF by cloning image (ensures full playback each trigger)
  const img = o.querySelector('img.success-gif');
  if(img){
    // Change to secondgif.gif for delete operations
    const clone = img.cloneNode(true);
    clone.src = '../secondgif.gif';
    clone.alt = 'Deleted!';
    img.parentNode.replaceChild(clone, img);
  }
  // Longer visibility (4s) so full animation can complete, then restore original gif
  showDeleteGif._t = setTimeout(()=>{ 
    o.style.display='none'; 
    // Restore original gif after hiding so next operations show correct gif
    const currentImg = o.querySelector('img.success-gif');
    if(currentImg) {
      currentImg.src = '../ddqjc5n-91719424-5624-4b58-bd4b-8cfa1647e1cb.gif';
      currentImg.alt = 'Success!';
    }
  }, 4000);
}

function showSection(name){
  localStorage.setItem('lastTab', name);
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById(name); if(panel) panel.classList.add('active');
  document.querySelectorAll(`.nav-btn[data-section="${name}"]`).forEach(b=>b.classList.add('active'));
  // Body tab state classes for layout adjustments (raise progress/soon panels)
  document.body.classList.remove('tab-tasks','tab-progress','tab-soon');
  document.body.classList.add(`tab-${name}`);
  if(name==='tasks') { fetchTasks(); }
  else { hideOffline(); }
  runSweep();
  applyBackgroundForTab(name);
  triggerCharacterSlide(name);
  SFX.play('tab');
}

async function fetchTasks(){
  loadOfflineState(); hideOffline();
  for(let attempt=1; attempt<=2; attempt++){
    try {
      const r=await fetch(API_URL);
      if(!r.ok) throw new Error('Bad status');
      let tasks=await r.json();
      if(offlineQueue.length){ tasks = await syncOfflineOps(tasks); }
      lastTasksCache = tasks;
      persistOfflineState();
      renderTasks(tasks); updateStats(tasks); updateEmptyHint(tasks);
      return;
    } catch(err){
      if(attempt===2){
        loadOfflineState();
        renderTasks(lastTasksCache); updateStats(lastTasksCache); updateEmptyHint(lastTasksCache);
        if(localStorage.getItem('lastTab')==='tasks') showOffline();
      }
    }
  }
}

function updateStats(tasks){
  const completed=tasks.filter(t=>t.status==='completed').length;
  updateAchievements(completed);
  updateIntel(tasks, completed);
}

function updateEmptyHint(tasks){
  const hint=document.getElementById('empty-hint');
  if(!tasks.length) hint.style.display='block'; else hint.style.display='none';
}

function updateAchievements(completedCount){
  // Determine new unlocks
  let changed = false;
  ACHIEVEMENTS.forEach(a=>{
    if(completedCount >= a.threshold && !unlockedAchievementIds.includes(a.id)){
      unlockedAchievementIds.push(a.id);
      changed = true;
    }
  });
  if(changed){
    showSuccessGif(); // single celebration even if multiple unlocks triggered together
    playWav('unlock', 'unlock');
    // Log unlocked achievements to intel feed
    ACHIEVEMENTS.forEach(a=>{
      if(unlockedAchievementIds.includes(a.id) && !intelFeed.some(f=>f.type==='ach' && f.id===a.id)){
        pushIntel({ type:'ach', id:a.id, ts:Date.now(), msg:`Unlocked: ${a.name}` });
      }
    });
  }
  if(changed) persistOfflineState();
  renderAchievements(completedCount);
  if(changed) flagProgressBadge();
}

function renderAchievements(completedCount){
  const list = document.getElementById('achievements-strip') || document.getElementById('achievements-list');
  if(!list) return;
  const unlockedSet = new Set(unlockedAchievementIds);
  list.innerHTML = ACHIEVEMENTS.map(a=>{
    const unlocked = unlockedSet.has(a.id);
    // Image filenames now expected uppercase by user (they said images are ALL CAPS)
    const imgFile = a.img ? a.img.toUpperCase() : '';
    return `<li class="ach-card ${unlocked?'unlocked':'locked'}" data-icon="${a.icon}" data-ach-id="${a.id}" onclick="achievementCardClick(${a.id})">
      <div class="ach-basic">
        <div class="ach-rank">${a.id}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-threshold">${unlocked? 'Unlocked' : 'Complete '+a.threshold+' tasks'}</div>
        <div class="ach-thumb" style="background-image:url('../${imgFile}')"></div>
      </div>
      <div class="ach-expanded">
        <button class="ach-close-btn" onclick="closeAchievementDetail(event)" aria-label="Close">×</button>
        <div class="ach-expanded-image-wrap"><img src="../${imgFile}" alt="${a.name}" class="ach-expanded-image" /></div>
          <p class="ach-expanded-desc">${a.desc}${unlocked? '' : ' (Locked)'}</p>
      </div>
    </li>`;
  }).join('');
  const progress = document.getElementById('achievement-progress');
  const counter = document.getElementById('achievement-counter');
  const globalProgress = document.getElementById('global-achievement-progress');
  const globalCounter = document.getElementById('global-achievement-counter');
  const unlockedCount = unlockedAchievementIds.length;
  const pct = (unlockedCount / ACHIEVEMENTS.length) * 100;
  if(progress){
    progress.style.width = pct + '%';
    if(counter) counter.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} unlocked (Completed: ${completedCount})`;
  }
  if(globalProgress){ globalProgress.style.width = pct + '%'; }
  if(globalCounter){ globalCounter.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} unlocked`; }
}

function setFilter(f){ currentFilter = f; document.querySelectorAll('.filter-btn').forEach(b=> b.classList.toggle('active', b.dataset.filter===f)); renderTasks(lastTasksCache); }

function isOverdue(task){ if(!task.due_date || task.status==='completed') return false; const today = new Date(); const d = new Date(task.due_date + 'T00:00:00'); return d < new Date(today.getFullYear(), today.getMonth(), today.getDate()); }

function renderTasks(tasks){
  const list=document.getElementById('tasks-list'); if(!list) return;
  let filtered = tasks.filter(t=> currentFilter==='all' ? true : t.status===currentFilter);
  if(!filtered.length){ list.innerHTML='<li class="empty">No tasks in this view.</li>'; return; }
  list.innerHTML=filtered.map(t=>{
    const due=t.due_date||'N/A';
    const overdueClass = isOverdue(t)?'overdue':'';
    const cls = [t.status==='completed'?'task-status-completed':'', overdueClass].join(' ').trim();
    return `<li class="${cls}" data-id="${t.id}">
      <div class="task-meta">${inlineOrMeta(t)}</div>
      <div class="task-actions">
        <button type="button" class="task-btn toggle-btn" data-id="${t.id}" data-status="${t.status}">${t.status==='completed'?'Undo':'Done'}</button>
        <button type="button" class="task-btn edit-btn" data-id="${t.id}">Edit</button>
        <button type="button" class="task-btn delete delete-btn" data-id="${t.id}">Delete</button>
      </div>
    </li>`;
  }).join('');
  
  // Re-attach event listeners after rendering
  attachTaskButtonListeners();
}

// Ensure task buttons always work with proper event listeners
function attachTaskButtonListeners() {
  // More robust listener attachment with error handling
  try {
    // Remove any existing listeners first by cloning elements
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Add fresh event listeners with error handling
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        const status = this.dataset.status;
        if (id && status) {
          toggleStatus(id, status);
        }
      }, { passive: false });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        if (id) {
          startInlineEdit(id);
        }
      }, { passive: false });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        if (id) {
          deleteTask(id);
        }
      }, { passive: false });
    });
  } catch (error) {
    console.warn('Error attaching button listeners:', error);
    // Fallback: try again in 1 second
    setTimeout(attachTaskButtonListeners, 1000);
  }
}

function inlineOrMeta(t){
  const due=t.due_date||'N/A';
  return `<span class="task-title">${escapeHtml(t.title)}</span>
    ${t.description?`<span class="task-desc">${escapeHtml(t.description)}</span>`:''}
    <span class="task-extra">Due: ${due}</span>`;
}

function startInlineEdit(id){
  const li=document.querySelector(`li[data-id="${id}"]`); if(!li) return;
  const t = lastTasksCache.find(x=>x.id===id); if(!t) return;
  li.querySelector('.task-meta').innerHTML = `<div class="inline-edit">
    <input id="edit-title-${id}" type="text" placeholder="Title" value="${escapeHtml(t.title)}" />
    <input id="edit-desc-${id}" type="text" placeholder="Description" value="${escapeHtml(t.description || '')}" />
    <input id="edit-date-${id}" type="date" value="${t.due_date || ''}" />
    <button type="button" class="task-btn save-edit-btn" data-id="${id}">Save</button>
    <button type="button" class="task-btn delete cancel-edit-btn" data-id="${id}">Cancel</button>
  </div>`;
  
  // Attach listeners for the inline edit buttons
  const saveBtn = li.querySelector('.save-edit-btn');
  const cancelBtn = li.querySelector('.cancel-edit-btn');
  
  if(saveBtn) {
    saveBtn.addEventListener('click', function() {
      commitInlineEdit(id);
    });
  }
  
  if(cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      cancelInlineEdit(id);
    });
  }
}
function cancelInlineEdit(id){ renderTasks(lastTasksCache); }
async function commitInlineEdit(id){
  const titleInput=document.getElementById(`edit-title-${id}`);
  const descInput=document.getElementById(`edit-desc-${id}`);
  const dateInput=document.getElementById(`edit-date-${id}`);
  
  if(!titleInput || !descInput || !dateInput) return;
  
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const due_date = dateInput.value || null;
  
  if(!title) return alert('Title required');
  
  const updateData = { title, description, due_date };
  
  try {
    await fetch(`${API_URL}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(updateData) });
    showSuccessGif();
    // No sound for edit operations - should be silent
    fetchTasks();
    pushIntel({ type:'edit', id, ts:Date.now(), msg:`Edited task #${id}` });
  } catch(e){
    console.warn('Offline edit queued', e);
    // Update locally and queue op
    const t = lastTasksCache.find(t=>t.id===id);
    if(t){
      t.title = title;
      t.description = description;
      t.due_date = due_date;
      queueOp({ type:'update', id, fields: updateData });
      persistOfflineState();
      renderTasks(lastTasksCache);
      updateStats(lastTasksCache);
      updateEmptyHint(lastTasksCache);
      // No sound for edit operations - should be silent
      pushIntel({ type:'edit', id, ts:Date.now(), msg:`(Offline) Edited task #${id}` });
    }
  }
}

// Status toggle should not trigger success gif per request
async function toggleStatus(id,current){ 
  const newStatus=current==='completed'?'pending':'completed'; 
  try { 
    await fetch(`${API_URL}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:newStatus }) }); 
    fetchTasks(); 
    pushIntel({ type:'toggle', id, ts:Date.now(), msg:`Toggled task #${id} to ${newStatus}` });
  } catch(e){ 
    console.warn('Offline toggle queued', e);
    showOffline();
    // Update locally and queue op
    const t = lastTasksCache.find(t=>t.id===id);
    if(t){
      t.status = newStatus;
      queueOp({ type:'update', id, fields:{ status: newStatus }});
      persistOfflineState();
      renderTasks(lastTasksCache);
      updateStats(lastTasksCache);
      updateEmptyHint(lastTasksCache);
      pushIntel({ type:'toggle', id, ts:Date.now(), msg:`(Offline) Toggled task #${id} to ${newStatus}` });
    }
  } 
}
// Enhanced to support offline queueing + GIF when marking completed
async function toggleStatus(id,current){
  const newStatus=current==='completed'?'pending':'completed';
  const willBeCompleted = newStatus === 'completed';
  try {
    await fetch(`${API_URL}/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:newStatus }) });
    if(willBeCompleted){ showSuccessGif(); SFX.play('complete'); }
    fetchTasks();
    pushIntel({ type:'status', id, ts:Date.now(), msg:`Task #${id} -> ${newStatus}` });
  } catch(e){
    console.warn('Offline status toggle queued', e);
    showOffline();
    const t= lastTasksCache.find(t=>t.id===id); if(t){ t.status=newStatus; queueOp({ type:'update', id, fields:{ status:newStatus }}); persistOfflineState(); if(willBeCompleted){ showSuccessGif(); SFX.play('complete'); } renderTasks(lastTasksCache); updateStats(lastTasksCache); pushIntel({ type:'status', id, ts:Date.now(), msg:`(Offline) Task #${id} -> ${newStatus}` }); }
  }
}

// Bulk actions also skip success gif (only create/edit/delete show it)
async function markAllCompleted(){ if(!lastTasksCache.length) return; const pending=lastTasksCache.filter(t=>t.status!=='completed'); for(const t of pending){ await fetch(`${API_URL}/${t.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'completed' }) }); } fetchTasks(); }
async function markAllCompleted(){
  if(!lastTasksCache.length) return;
  const pending=lastTasksCache.filter(t=>t.status!=='completed');
  if(!pending.length) return; // nothing to do
  try {
    for(const t of pending){ await fetch(`${API_URL}/${t.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'completed' }) }); }
    showSuccessGif(); SFX.play('bulk');
    fetchTasks();
    pushIntel({ type:'bulk', ts:Date.now(), msg:`Bulk completed ${pending.length} tasks` });
  } catch(e){
    console.warn('Offline bulk mark queued', e);
    showOffline();
    pending.forEach(t=>{ t.status='completed'; queueOp({ type:'update', id:t.id, fields:{ status:'completed' }}); });
    persistOfflineState(); showSuccessGif(); SFX.play('bulk'); renderTasks(lastTasksCache); updateStats(lastTasksCache); pushIntel({ type:'bulk', ts:Date.now(), msg:`(Offline) Bulk completed ${pending.length} tasks` });
  }
}
async function clearCompleted(){ const completed=lastTasksCache.filter(t=>t.status==='completed'); if(!completed.length) return; if(!confirm('Clear all completed tasks?')) return; for(const t of completed){ await fetch(`${API_URL}/${t.id}`, { method:'DELETE' }); } showSuccessGif(); fetchTasks(); }
async function clearCompleted(){
  const completed=lastTasksCache.filter(t=>t.status==='completed'); if(!completed.length) return; if(!confirm('Clear all completed tasks?')) return;
  try {
    for(const t of completed){ await fetch(`${API_URL}/${t.id}`, { method:'DELETE' }); }
    showSuccessGif(); SFX.play('bulk'); fetchTasks(); pushIntel({ type:'clear', ts:Date.now(), msg:`Cleared ${completed.length} completed` });
  } catch(e){
    console.warn('Offline clear completed queued', e);
    showOffline();
    completed.forEach(t=> queueOp({ type:'delete', id:t.id }));
    lastTasksCache = lastTasksCache.filter(t=>t.status!=='completed');
    persistOfflineState(); renderTasks(lastTasksCache); updateStats(lastTasksCache); updateEmptyHint(lastTasksCache); pushIntel({ type:'clear', ts:Date.now(), msg:`(Offline) Cleared ${completed.length} completed` });
  }
}

function showOffline(){ const b=document.getElementById('offline-banner'); if(b) b.style.display='flex'; }
function hideOffline(){ const b=document.getElementById('offline-banner'); if(b) b.style.display='none'; }
function retryConnection(){ fetchTasks(); }

// Basic HTML escape to prevent injection when rendering titles/descriptions
function escapeHtml(str){
  if(str==null) return '';
  return str.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}

// Create a new task via form submission
// Enhanced addTask with offline create queueing
async function addTask(e){
  e.preventDefault();
  const title=document.getElementById('title').value.trim();
  const description=document.getElementById('description').value.trim();
  const due_date=document.getElementById('due_date').value||null;
  const status='pending'; // Default all new tasks to pending (active)
  if(!title) return alert('Title is required');
  try {
    const res = await fetch(API_URL,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title, description, due_date, status })});
    if(!res.ok) throw new Error('Failed to create');
    document.getElementById('task-form').reset();
    showSuccessGif();
    playWav('unlock','unlock');
    fetchTasks();
    pushIntel({ type:'create', id:'?', ts:Date.now(), msg:'Created new task' });
  } catch(err){
    console.warn('Offline create queued', err);
    showOffline();
    const offlineTask = { id: tempIdCounter--, title, description, due_date, status };
    lastTasksCache.push(offlineTask);
    queueOp({ type:'create', task: offlineTask });
    persistOfflineState();
    document.getElementById('task-form').reset();
    renderTasks(lastTasksCache); updateStats(lastTasksCache); updateEmptyHint(lastTasksCache);
    playWav('edited','add');
    pushIntel({ type:'create', id:offlineTask.id, ts:Date.now(), msg:`(Offline) Created task #${offlineTask.id}` });
  }
}

// Delete task
async function deleteTask(id){
  if(!confirm('Delete this task?')) return;
  try {
    await fetch(`${API_URL}/${id}`, { method:'DELETE' });
    showDeleteGif();
    playWav('delete','delete');
    fetchTasks();
    pushIntel({ type:'delete', id, ts:Date.now(), msg:`Deleted task #${id}` });
  }
  catch(e){
    console.warn('Offline delete queued', e);
    showOffline();
    lastTasksCache = lastTasksCache.filter(t=>t.id!==id);
    queueOp({ type:'delete', id });
    persistOfflineState();
    renderTasks(lastTasksCache); 
    updateStats(lastTasksCache); 
    updateEmptyHint(lastTasksCache);
    playWav('delete','delete');
    pushIntel({ type:'delete', id, ts:Date.now(), msg:`(Offline) Deleted task #${id}` });
  }
}

// Smoke generation (unchanged minimal)
function initSmoke(){ let layer=document.querySelector('.smoke-layer'); if(!layer){ layer=document.createElement('div'); layer.className='smoke-layer'; document.body.appendChild(layer);} for(let i=0;i<10;i++) spawnPuff(layer); setInterval(()=>spawnPuff(layer), 3500); }
function spawnPuff(layer){ const d=document.createElement('div'); d.className='smoke-puff'; const size=120+Math.random()*220; d.style.width=d.style.height=size+'px'; d.style.left=Math.random()*100+'%'; d.style.top=Math.random()*100+'%'; d.style.setProperty('--sx', (Math.random()*400-200)+'px'); d.style.setProperty('--sy', (Math.random()*240-120)+'px'); layer.appendChild(d); setTimeout(()=>d.remove(), 18000); }

// Sync queued offline operations once back online
async function syncOfflineOps(serverTasks){
  if(!offlineQueue.length) return serverTasks;
  const idMap = {}; // negative -> new positive
  let tasks = [...serverTasks];
  for(const op of offlineQueue){
    try {
      if(op.type==='create'){
        const { title, description, due_date, status, id } = op.task;
        const res = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title, description, due_date, status }) });
        if(!res.ok) throw new Error('create failed');
        const created = await res.json();
        idMap[id] = created.id;
        tasks.push(created);
      } else if(op.type==='update'){
        const realId = idMap[op.id] || op.id;
        await fetch(`${API_URL}/${realId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(op.fields) });
        // update local representation
        const t = tasks.find(t=>t.id===realId); if(t) Object.assign(t, op.fields);
      } else if(op.type==='delete'){
        const realId = idMap[op.id] || op.id;
        await fetch(`${API_URL}/${realId}`, { method:'DELETE' });
        tasks = tasks.filter(t=>t.id!==realId);
      }
    } catch(e){
      console.error('Sync op failed, keeping in queue', op, e);
      // Keep remaining ops (including current) for next attempt
      const remaining = offlineQueue.slice(offlineQueue.indexOf(op));
      offlineQueue = remaining; persistOfflineState();
      return tasks; // partial sync
    }
  }
  // All ops succeeded
  offlineQueue = []; persistOfflineState();
  return tasks;
}

window.addEventListener('load', ()=>{
  // Preload any cached tasks so progress tab isn't empty if user switches early
  try {
    const cached = JSON.parse(localStorage.getItem(LS_TASKS)||'[]');
    if(cached.length){ lastTasksCache = cached; updateStats(lastTasksCache); }
  } catch(e){ /* ignore */ }
  // Ensure achievements list renders at least locked state even with zero tasks
  if(!unlockedAchievementIds.length){ renderAchievements( (lastTasksCache.filter(t=>t.status==='completed').length) ); }
  const last = localStorage.getItem('lastTab') || 'tasks';
  showSection(last);
  initSmoke();
  refreshSfxButton();
  // Kick off a fetch to refresh (will repaint achievements/stats when done)
  fetchTasks();
});
// Insert sweep element
const sweepEl = document.createElement('div');
sweepEl.className='bg-sweep';
document.body.appendChild(sweepEl);
const glitchEl = document.createElement('div');
glitchEl.className='glitch-overlay';
document.body.appendChild(glitchEl);
function runSweep(){
  if(!sweepEl) return;
  sweepEl.classList.remove('run');
  // force reflow to restart animation
  void sweepEl.offsetWidth;
  sweepEl.classList.add('run');
  // trigger glitch effect
  if(glitchEl){
    glitchEl.classList.remove('active');
    void glitchEl.offsetWidth;
    glitchEl.classList.add('active');
  }
}

// Progress tab badge logic
function flagProgressBadge(){
  if(localStorage.getItem('lastTab') === 'progress') return; // already viewing
  const b = document.getElementById('progress-badge'); if(b) b.style.display='inline-block';
}
function clearProgressBadge(){ const b=document.getElementById('progress-badge'); if(b) b.style.display='none'; }

// Hook into showSection to clear badge when visiting progress
const _origShowSection = showSection;
showSection = function(name){
  // For 'soon' tab, skip the original SFX.play('tab') and only play EDITED.wav
  if(name === 'soon') {
    localStorage.setItem('lastTab', name);
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const panel=document.getElementById(name); if(panel) panel.classList.add('active');
    document.querySelectorAll(`.nav-btn[data-section="${name}"]`).forEach(b=>b.classList.add('active'));
    document.body.classList.remove('tab-tasks','tab-progress','tab-soon');
    document.body.classList.add(`tab-${name}`);
    hideOffline();
    runSweep();
    applyBackgroundForTab(name);
    triggerCharacterSlide(name);
    // Play EDITED.wav when entering Coming Soon tab (no SFX tab sound)
    playWav('edited','add');
    return;
  }
  
  _origShowSection(name);
  
  if(name==='progress') {
    clearProgressBadge();
    // Always render using current cache (may be empty but progress bar & counter will still show 0 state)
    const completed = lastTasksCache.filter(t=>t.status==='completed').length;
    updateStats(lastTasksCache);
    // If nothing loaded yet, fetch (async) but keep placeholder visible
    if(!lastTasksCache.length) fetchTasks();
  }
  
  // CRITICAL FIX: Re-attach button listeners when returning to tasks tab
  if(name === 'tasks') {
    // Multiple strategies to ensure buttons work
    setTimeout(() => {
      renderTasks(lastTasksCache);
    }, 50);
    setTimeout(() => {
      attachTaskButtonListeners();
    }, 150);
    setTimeout(() => {
      attachTaskButtonListeners();
    }, 300);
    // Force a final re-render to ensure everything is working
    setTimeout(() => {
      if(document.body.classList.contains('tab-tasks')) {
        const tasksList = document.getElementById('tasks-list');
        if(tasksList && tasksList.children.length > 0) {
          attachTaskButtonListeners();
        }
      }
    }, 500);
  }
};

// Dynamic background switching per tab
function applyBackgroundForTab(tab){
  const body=document.body; body.classList.remove('bg-optimus','bg-shockwave','bg-megatron');
  if(tab==='tasks') body.classList.add('bg-optimus');
  else if(tab==='progress') body.classList.add('bg-shockwave');
  else if(tab==='soon') body.classList.add('bg-megatron');
  // Attempt preload to detect missing uppercase names and fallback
  const map = {
    'bg-optimus':['optimusprimephoto.jpg','OPTIMUSPRIMEPHOTO.JPG'],
    'bg-shockwave':['shockwavephoto.jpg','SHOCKWAVEPHOTO.JPG'],
    'bg-megatron':['megatronphoto.jpg','MEGATRONPHOTO.JPG']
  };
  const active = [...body.classList].find(c=>map[c]);
  if(active){
    const candidates = map[active];
    const testImg = new Image();
    let idx=0;
    testImg.onerror = ()=>{ idx++; if(idx < candidates.length){ testImg.src = '../'+candidates[idx]; body.style.setProperty('--dyn-bg','url(../'+candidates[idx]+')'); } };
    testImg.onload = ()=>{ body.style.setProperty('--dyn-bg','url(../'+candidates[idx]+')'); };
    testImg.src = '../'+candidates[0];
  }
}

// Character slide feature
let characterSlideEl = document.createElement('div');
characterSlideEl.className='character-slide';
document.body.appendChild(characterSlideEl);
function triggerCharacterSlide(tab){
  let img='';
  if(tab==='tasks') img='optimus.png';
  else if(tab==='progress') img='shockwave.png';
  else if(tab==='soon') img='megatron.png';
  if(!img){ characterSlideEl.style.backgroundImage='none'; return; }
  characterSlideEl.style.backgroundImage=`url('../${img}')`;
  characterSlideEl.classList.remove('show');
  void characterSlideEl.offsetWidth;
  characterSlideEl.classList.add('show');
}

// Achievement detail interactions
let focusedAchId = null;
let achBackdropEl = null;
let achModalEl = null;
function ensureAchBackdrop(){
  if(!achBackdropEl){
    achBackdropEl = document.createElement('div');
    achBackdropEl.className='ach-focus-backdrop';
    achBackdropEl.addEventListener('click', closeAchievementDetail);
    document.body.appendChild(achBackdropEl);
  }
  return achBackdropEl;
}
function ensureAchModal(){
  if(!achModalEl){
    achModalEl = document.createElement('div');
    achModalEl.className='ach-modal';
    achModalEl.innerHTML = `
      <button class="ach-modal-close" onclick="closeAchievementDetail(event)">×</button>
      <div class="ach-modal-img-wrap"><img class="ach-modal-img" alt="" /></div>
      <div class="ach-modal-text">
        <h3 class="ach-modal-name"></h3>
        <p class="ach-modal-desc"></p>
        <p class="ach-modal-threshold"></p>
      </div>`;
    document.body.appendChild(achModalEl);
  }
  return achModalEl;
}
function achievementCardClick(id){
  const card = document.querySelector(`.ach-card[data-ach-id="${id}"]`); if(!card) return;
  focusedAchId = id; // no toggle; always open modal anew
  ensureAchBackdrop(); ensureAchModal();
  achBackdropEl.classList.add('show');
  achModalEl.classList.add('show');
  const unlocked = unlockedAchievementIds.includes(id);
  const imgEl = achModalEl.querySelector('.ach-modal-img');
  const nameEl = achModalEl.querySelector('.ach-modal-name');
  const descEl = achModalEl.querySelector('.ach-modal-desc');
  const thrEl = achModalEl.querySelector('.ach-modal-threshold');
  const ach = ACHIEVEMENTS.find(a=>a.id===id);
  if(ach){
    const imgFile = ach.img.toUpperCase();
    imgEl.src = '../'+imgFile;
    imgEl.alt = ach.name;
    nameEl.textContent = ach.name;
    descEl.textContent = ach.desc + (unlocked? '' : ' (Locked)');
    thrEl.textContent = unlocked? `Unlocked at ${ach.threshold}` : `Requires ${ach.threshold} completed tasks`;
    achModalEl.setAttribute('data-ach-id', id);
  }
  SFX.play('focus-open');
  document.body.classList.add('no-scroll');
  document.addEventListener('keydown', escCloseAch, { once:true });
}
function escCloseAch(e){ if(e.key==='Escape') closeAchievementDetail(); }
function closeAchievementDetail(ev){
  if(ev){ ev.stopPropagation && ev.stopPropagation(); }
  focusedAchId = null;
  if(achBackdropEl){ achBackdropEl.classList.remove('show'); }
  if(achModalEl){ achModalEl.classList.remove('show'); }
  document.body.classList.remove('no-scroll');
  SFX.play('focus-close');
}

// ---- INTEL PANEL FUNCTIONS ----
function pushIntel(entry){
  intelFeed.unshift(entry);
  if(intelFeed.length>50) intelFeed.length=50; // cap
  renderIntelFeed();
}
function updateIntel(tasks, completed){
  const total = tasks.length;
  const pending = tasks.filter(t=>t.status!=='completed').length;
  const unlocked = unlockedAchievementIds.length;
  const next = ACHIEVEMENTS.find(a=>!unlockedAchievementIds.includes(a.id));
  const nextVal = next? `${next.name} @ ${next.threshold}` : 'All Unlocked';
  setText('intel-total', total);
  setText('intel-completed', completed);
  setText('intel-pending', pending);
  setText('intel-unlocked', unlocked);
  setText('intel-next', nextVal);
}
function renderIntelFeed(){
  const ul=document.getElementById('intel-feed'); if(!ul) return;
  ul.innerHTML = intelFeed.map(e=>`<li class="${e.type==='ach'?'new-ach':''}">${formatIntelEntry(e)}</li>`).join('');
}
function formatIntelEntry(e){
  const d=new Date(e.ts);
  const time = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  return `[${time}] ${escapeHtml(e.msg)}`;
}
function setText(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }

// Ensure UI stays responsive and buttons work
function ensureUIResponsive() {
  // Force a re-render if we're on the tasks tab to keep buttons working
  if(document.body.classList.contains('tab-tasks')) {
    renderTasks(lastTasksCache);
  }
}

// Set up frequent UI refresh to ensure buttons always work
setInterval(ensureUIResponsive, 3000); // Every 3 seconds (even more frequent)

// Additional aggressive button checking
setInterval(() => {
  if(document.body.classList.contains('tab-tasks')) {
    const taskButtons = document.querySelectorAll('.toggle-btn, .edit-btn, .delete-btn');
    if(taskButtons.length > 0) {
      // Check if buttons are responding by testing event listeners
      attachTaskButtonListeners();
    }
  }
}, 2000); // Every 2 seconds when on tasks tab

// Additional protection: MutationObserver to re-attach listeners when DOM changes
const taskListObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.target.id === 'tasks-list') {
      // Tasks list changed, re-attach listeners
      setTimeout(attachTaskButtonListeners, 100);
    }
    // Also watch for when the tasks panel becomes visible again
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      if (mutation.target.id === 'tasks' && mutation.target.classList.contains('active')) {
        // Tasks panel became active, ensure buttons work
        setTimeout(() => {
          attachTaskButtonListeners();
        }, 200);
      }
    }
  });
});

// Start observing the tasks list and tasks panel for changes
const tasksList = document.getElementById('tasks-list');
const tasksPanel = document.getElementById('tasks');
if (tasksList) {
  taskListObserver.observe(tasksList, { childList: true, subtree: true });
}
if (tasksPanel) {
  taskListObserver.observe(tasksPanel, { attributes: true, attributeFilter: ['class'] });
}

// Ultra-robust global event delegation - multiple event types
['click', 'mousedown', 'touchstart'].forEach(eventType => {
  document.addEventListener(eventType, function(e) {
    // Only handle click events for actual button actions
    if(eventType !== 'click') return;
    
    // Prevent any event bubbling issues
    let target = e.target;
    
    // Handle toggle button clicks
    if(target.classList.contains('toggle-btn') || target.closest('.toggle-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (!target.classList.contains('toggle-btn')) target = target.closest('.toggle-btn');
      const id = parseInt(target.dataset.id);
      const status = target.dataset.status;
      if(id && status) {
        console.log('Global delegation: toggle', id, status);
        toggleStatus(id, status);
      }
      return false;
    }
    
    // Handle edit button clicks  
    if(target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (!target.classList.contains('edit-btn')) target = target.closest('.edit-btn');
      const id = parseInt(target.dataset.id);
      if(id) {
        console.log('Global delegation: edit', id);
        startInlineEdit(id);
      }
      return false;
    }
    
    // Handle delete button clicks
    if(target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (!target.classList.contains('delete-btn')) target = target.closest('.delete-btn');
      const id = parseInt(target.dataset.id);
      if(id) {
        console.log('Global delegation: delete', id);
        deleteTask(id);
      }
      return false;
    }
    
    // Handle inline edit save/cancel buttons
    if(target.classList.contains('save-edit-btn') || target.closest('.save-edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (!target.classList.contains('save-edit-btn')) target = target.closest('.save-edit-btn');
      const id = parseInt(target.dataset.id);
      if(id) {
        console.log('Global delegation: save edit', id);
        commitInlineEdit(id);
      }
      return false;
    }
    
    if(target.classList.contains('cancel-edit-btn') || target.closest('.cancel-edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (!target.classList.contains('cancel-edit-btn')) target = target.closest('.cancel-edit-btn');
      const id = parseInt(target.dataset.id);
      if(id) {
        console.log('Global delegation: cancel edit', id);
        cancelInlineEdit(id);
      }
      return false;
    }
  }, true); // Use capture phase for even more reliability
});

// Re-attach listeners when window gains focus (user comes back to tab)
window.addEventListener('focus', function() {
  setTimeout(attachTaskButtonListeners, 200);
});

// Re-attach listeners on page visibility change
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    setTimeout(attachTaskButtonListeners, 200);
  }
});
