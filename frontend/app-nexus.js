/**
 * NEXUS TASK MANAGER - Enhanced JavaScript
 * Professional productivity app with XP system, drag-drop, and advanced features
 */

// ============================================
// API CONFIGURATION
// ============================================
const resolvedHost = (typeof location !== 'undefined' && location.hostname && location.hostname !== 'localhost') ? location.hostname : '127.0.0.1';
const API_URL = `http://${resolvedHost}:5000/tasks`;

// ============================================
// STATE MANAGEMENT
// ============================================
let currentFilter = 'all';
let currentView = 'list';
let currentSection = 'tasks';
let lastTasksCache = [];
let offlineQueue = [];
let tempIdCounter = -1;
let unlockedAchievementIds = [];
let currentTags = [];
let draggedTaskId = null;

// User progression
let userXP = parseInt(localStorage.getItem('userXP') || '0');
let userLevel = parseInt(localStorage.getItem('userLevel') || '1');

// LocalStorage keys
const LS_TASKS = 'tasksLocal';
const LS_QUEUE = 'offlineQueue';
const LS_TEMPID = 'tempIdCounter';
const LS_ACHIEVEMENTS = 'achievementsUnlocked';
const LS_XP = 'userXP';
const LS_LEVEL = 'userLevel';
const LS_TAGS = 'currentTags';

// Achievement definitions
const ACHIEVEMENTS = [
  { id:1, name:'Bumblebee', threshold:1, desc:'First task completed. Small but brave!', icon:'🐝', img:'assets/BUMBLEBEE.png' },
  { id:2, name:'Lockdown', threshold:3, desc:'You are becoming a relentless hunter of tasks.', icon:'🔒', img:'assets/LOCKDOWN.png' },
  { id:3, name:'Ironhide', threshold:5, desc:'Sturdy dedication forged.', icon:'🛡️', img:'assets/IRONHIDE.png' },
  { id:4, name:'Ratchet', threshold:8, desc:'A healer of backlog wounds.', icon:'🔧', img:'assets/RATCHET.png' },
  { id:5, name:'Shockwave', threshold:12, desc:'Cold logic drives your output.', icon:'⚡', img:'assets/SCHOCKWAVE.png' },
  { id:6, name:'Starscream', threshold:17, desc:'Ambition rising high (watch your ego).', icon:'✈️', img:'assets/STARSCREAM.png' },
  { id:7, name:'Soundwave', threshold:23, desc:'Efficient data execution—superior.', icon:'📻', img:'assets/SOUNDWAVE.png' },
  { id:8, name:'Megatron', threshold:30, desc:'Relentless drive achieved.', icon:'👑', img:'assets/MEGATRON.png' },
  { id:9, name:'Jetfire', threshold:40, desc:'Ancient wisdom + velocity unlocked.', icon:'🚀', img:'assets/JETFIRE.png' },
  { id:10, name:'Optimus Prime', threshold:55, desc:'Leadership through unwavering productivity.', icon:'🤖', img:'assets/OPTIMUSPRIME.png' }
];

// XP and Level system
const XP_PER_LEVEL = 100;
const XP_REWARDS = {
  taskComplete: 10,
  taskCreate: 5,
  achievementUnlock: 50
};

// Rank titles by level
const RANKS = [
  { level: 1, name: 'Recruit' },
  { level: 5, name: 'Scout' },
  { level: 10, name: 'Warrior' },
  { level: 15, name: 'Commander' },
  { level: 20, name: 'Elite' },
  { level: 25, name: 'Prime' },
  { level: 30, name: 'Legend' }
];

// ============================================
// SOUND SYSTEM
// ============================================
class SFXManager {
  constructor(){
    this.ctx = null;
    this.masterGain = null;
    this.enabled = JSON.parse(localStorage.getItem('sfxEnabled') || 'true');
  }
  
  _ensure(){
    if(!this.ctx){
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);
    }
  }
  
  toggle(){ 
    this.enabled = !this.enabled; 
    localStorage.setItem('sfxEnabled', JSON.stringify(this.enabled)); 
    return this.enabled; 
  }
  
  setVolume(value) {
    this._ensure();
    this.masterGain.gain.value = value / 100;
  }
  
  play(type){
    if(!this.enabled) return;
    this._ensure();
    
    switch(type){
      case 'add':
        return this.sequence([{ f:740, d:0.08 }, { f:880, d:0.11 }]);
      case 'complete':
        return this.sequence([{ f:520, d:0.07 }, { f:660, d:0.09 }, { f:880, d:0.13 }]);
      case 'delete':
        return this.noiseHit({ duration:0.12, lowpass:900 });
      case 'unlock':
        return this.sequence([{ f:392, d:0.09 }, { f:523, d:0.09 }, { f:659, d:0.1 }, { f:784, d:0.4 }]);
      case 'levelup':
        return this.sequence([{ f:440, d:0.1 }, { f:554, d:0.1 }, { f:659, d:0.1 }, { f:880, d:0.3 }]);
      case 'tab':
        return this.sequence([{ f:440, d:0.05 }, { f:660, d:0.07 }]);
    }
  }
  
  sequence(notes){
    const now = this.ctx.currentTime;
    let t = now;
    notes.forEach(n=>{
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t); osc.stop(t + n.d + 0.02);
      t += n.d * 0.72;
    });
  }
  
  noiseHit({ duration=0.15, lowpass=1200 }){
    const now = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){ 
      data[i] = (Math.random()*2 -1) * (1 - (i/data.length)); 
    }
    const src = this.ctx.createBufferSource(); 
    src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter(); 
    lp.type='lowpass'; 
    lp.frequency.setValueAtTime(lowpass, now);
    const gain = this.ctx.createGain(); 
    gain.gain.setValueAtTime(0.8, now); 
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(lp).connect(gain).connect(this.masterGain);
    src.start(now); 
    src.stop(now + duration + 0.05);
  }
}

const SFX = new SFXManager();

// ============================================
// NAVIGATION & SECTION MANAGEMENT
// ============================================
function showSection(sectionName) {
  // Update state
  currentSection = sectionName;
  localStorage.setItem('lastSection', sectionName);
  
  // Update UI
  document.querySelectorAll('.section-panel').forEach(panel => {
    panel.classList.remove('active');
    panel.style.display = 'none';
  });
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const targetSection = document.getElementById(sectionName);
  const targetTab = document.querySelector(`.nav-tab[data-section="${sectionName}"]`);
  
  if(targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  }
  
  if(targetTab) {
    targetTab.classList.add('active');
  }
  
  // Load section-specific data
  switch(sectionName) {
    case 'dashboard':
      updateDashboard();
      break;
    case 'tasks':
      fetchTasks();
      break;
    case 'achievements':
      renderAchievements();
      break;
  }
  
  SFX.play('tab');
}

// ============================================
// TASK MANAGEMENT
// ============================================
async function fetchTasks() {
  try {
    const response = await fetch(API_URL);
    if(!response.ok) throw new Error('Failed to fetch');
    
    const tasks = await response.json();
    lastTasksCache = tasks;
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
    
    renderTasks(tasks);
    updateStats(tasks);
    updateDashboard();
  } catch(error) {
    console.warn('Fetch failed, using cached data', error);
    const cached = JSON.parse(localStorage.getItem(LS_TASKS) || '[]');
    lastTasksCache = cached;
    renderTasks(cached);
    updateStats(cached);
    showNotification('Working offline', 'info');
  }
}

function renderTasks(tasks) {
  const list = document.getElementById('tasks-list');
  if(!list) return;
  
  let filtered = tasks.filter(t => {
    if(currentFilter === 'all') return true;
    return t.status === currentFilter;
  });
  
  const emptyHint = document.getElementById('empty-hint');
  if(filtered.length === 0) {
    list.innerHTML = '';
    if(emptyHint) emptyHint.style.display = 'flex';
    return;
  }
  
  if(emptyHint) emptyHint.style.display = 'none';
  
  list.innerHTML = filtered.map(task => createTaskHTML(task)).join('');
  attachTaskListeners();
}

function createTaskHTML(task) {
  const priority = task.priority || 'medium';
  const tags = task.tags || [];
  const isCompleted = task.status === 'completed';
  
  return `
    <li class="task-item ${isCompleted ? 'completed' : ''}" 
        data-id="${task.id}" 
        draggable="true">
      <div class="task-header">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <span class="task-priority ${priority}">${priority}</span>
      </div>
      ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
      ${task.due_date ? `<div class="task-meta">📅 ${task.due_date}</div>` : ''}
      ${tags.length > 0 ? `
        <div class="task-tags">
          ${tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="task-actions">
        <button class="task-btn complete" onclick="toggleTaskStatus(${task.id}, '${task.status}')">
          ${isCompleted ? '↶ Undo' : '✓ Done'}
        </button>
        <button class="task-btn" onclick="editTask(${task.id})">Edit</button>
        <button class="task-btn delete" onclick="deleteTask(${task.id})">Delete</button>
      </div>
    </li>
  `;
}

function attachTaskListeners() {
  document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// ============================================
// DRAG AND DROP
// ============================================
function handleDragStart(e) {
  draggedTaskId = e.target.dataset.id;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.currentTarget;
  if(item.dataset.id !== draggedTaskId) {
    item.classList.add('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  
  if(draggedTaskId && targetId && draggedTaskId !== targetId) {
    reorderTasks(draggedTaskId, targetId);
  }
  
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedTaskId = null;
}

function reorderTasks(fromId, toId) {
  const fromIndex = lastTasksCache.findIndex(t => t.id == fromId);
  const toIndex = lastTasksCache.findIndex(t => t.id == toId);
  
  if(fromIndex !== -1 && toIndex !== -1) {
    const [movedTask] = lastTasksCache.splice(fromIndex, 1);
    lastTasksCache.splice(toIndex, 0, movedTask);
    renderTasks(lastTasksCache);
    showNotification('Task reordered', 'success');
  }
}

// ============================================
// TASK CRUD OPERATIONS
// ============================================
async function addTask(e) {
  e.preventDefault();
  
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const due_date = document.getElementById('due_date').value || null;
  const due_time = document.getElementById('due_time')?.value || null;
  const priority = document.getElementById('task_priority')?.value || 'medium';
  const tags = currentTags;
  
  if(!title) {
    showNotification('Title is required', 'error');
    return;
  }
  
  // Combine date and time if both provided
  let due_datetime = due_date;
  if(due_date && due_time) {
    due_datetime = `${due_date} ${due_time}`;
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, due_date: due_datetime, priority, tags, status: 'pending' })
    });
    
    if(!response.ok) throw new Error('Failed to create');
    
    document.getElementById('task-form').reset();
    currentTags = [];
    updateTagsDisplay();
    
    await fetchTasks();
    addXP(XP_REWARDS.taskCreate);
    showNotification('Task created!', 'success');
    SFX.play('add');
    
  } catch(error) {
    console.error('Create task error:', error);
    showNotification('Failed to create task', 'error');
  }
}

async function toggleTaskStatus(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if(!response.ok) throw new Error('Failed to update');
    
    if(newStatus === 'completed') {
      addXP(XP_REWARDS.taskComplete);
      SFX.play('complete');
      showSuccessAnimation();
    }
    
    await fetchTasks();
    
  } catch(error) {
    console.error('Toggle status error:', error);
    showNotification('Failed to update task', 'error');
  }
}

async function deleteTask(id) {
  if(!confirm('Delete this task?')) return;
  
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if(!response.ok) throw new Error('Failed to delete');
    
    await fetchTasks();
    showNotification('Task deleted', 'success');
    SFX.play('delete');
    
  } catch(error) {
    console.error('Delete task error:', error);
    showNotification('Failed to delete task', 'error');
  }
}

function editTask(id) {
  const task = lastTasksCache.find(t => t.id == id);
  if(!task) return;
  
  // Populate form
  document.getElementById('title').value = task.title;
  document.getElementById('description').value = task.description || '';
  document.getElementById('due_date').value = task.due_date || '';
  if(document.getElementById('task_priority')) {
    document.getElementById('task_priority').value = task.priority || 'medium';
  }
  currentTags = task.tags || [];
  updateTagsDisplay();
  
  // Scroll to form
  document.getElementById('task-form').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('title').focus();
  
  // Delete old task after edit
  deleteTask(id);
}

// ============================================
// TAGS MANAGEMENT
// ============================================
function addTagFromSuggestion(tag) {
  if(!currentTags.includes(tag)) {
    currentTags.push(tag);
    updateTagsDisplay();
  }
}

function updateTagsDisplay() {
  const display = document.getElementById('tags-display');
  if(!display) return;
  
  display.innerHTML = currentTags.map(tag => `
    <span class="tag-chip">
      ${escapeHtml(tag)}
      <span class="tag-remove" onclick="removeTag('${tag}')">×</span>
    </span>
  `).join('');
}

function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  updateTagsDisplay();
}

// Setup tags input
document.addEventListener('DOMContentLoaded', () => {
  const tagsInput = document.getElementById('task_tags');
  if(tagsInput) {
    tagsInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') {
        e.preventDefault();
        const tag = e.target.value.trim();
        if(tag && !currentTags.includes(tag)) {
          currentTags.push(tag);
          updateTagsDisplay();
          e.target.value = '';
        }
      }
    });
  }
});

// ============================================
// FILTERS & SEARCH
// ============================================
function setFilter(filter) {
  currentFilter = filter;
  
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  renderTasks(lastTasksCache);
}

function setTaskView(view) {
  currentView = view;
  const list = document.getElementById('tasks-list');
  if(list) {
    list.dataset.view = view;
  }
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function searchTasks(query) {
  if(!query) {
    renderTasks(lastTasksCache);
    return;
  }
  
  const filtered = lastTasksCache.filter(task => {
    return task.title.toLowerCase().includes(query.toLowerCase()) ||
           (task.description && task.description.toLowerCase().includes(query.toLowerCase()));
  });
  
  renderTasks(filtered);
}

function filterTasksByTag(tag) {
  showSection('tasks');
  setTimeout(() => {
    const filtered = lastTasksCache.filter(task => {
      return task.tags && task.tags.includes(tag);
    });
    renderTasks(filtered);
  }, 100);
}

// ============================================
// XP & LEVELING SYSTEM
// ============================================
function addXP(amount) {
  userXP += amount;
  
  // Check for level up
  const xpNeeded = userLevel * XP_PER_LEVEL;
  if(userXP >= xpNeeded) {
    userXP -= xpNeeded;
    userLevel++;
    localStorage.setItem(LS_LEVEL, userLevel);
    showLevelUpNotification();
    SFX.play('levelup');
  }
  
  localStorage.setItem(LS_XP, userXP);
  updateXPDisplay();
  updateDashboard();
}

function updateXPDisplay() {
  const levelDisplay = document.getElementById('user-level');
  if(levelDisplay) {
    levelDisplay.textContent = userLevel;
  }
}

function showLevelUpNotification() {
  const rank = getRankName(userLevel);
  showNotification(`Level Up! You are now Level ${userLevel} - ${rank}`, 'success');
}

function getRankName(level) {
  for(let i = RANKS.length - 1; i >= 0; i--) {
    if(level >= RANKS[i].level) {
      return RANKS[i].name;
    }
  }
  return 'Recruit';
}

// ============================================
// DASHBOARD UPDATES
// ============================================
function updateDashboard() {
  const total = lastTasksCache.length;
  const completed = lastTasksCache.filter(t => t.status === 'completed').length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Update stats
  setText('dash-total', total);
  setText('dash-completed', completed);
  setText('dash-pending', pending);
  setText('dash-streak', '0'); // TODO: Implement streak tracking
  
  // Update progress circle
  const progressCircle = document.getElementById('dash-progress-circle');
  if(progressCircle) {
    const circumference = 2 * Math.PI * 85;
    const offset = circumference - (completionRate / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }
  setText('dash-progress-value', `${completionRate}%`);
  
  // Update XP
  const xpNeeded = userLevel * XP_PER_LEVEL;
  const xpPercent = (userXP / xpNeeded) * 100;
  setText('dash-level', userLevel);
  setText('dash-xp-current', userXP);
  setText('dash-xp-next', xpNeeded);
  setText('dash-rank', getRankName(userLevel));
  
  const xpBar = document.getElementById('dash-xp-bar');
  if(xpBar) {
    xpBar.style.width = `${xpPercent}%`;
  }
  
  // Update upcoming tasks
  updateUpcomingTasks();
}

function updateUpcomingTasks() {
  const list = document.getElementById('dash-upcoming');
  if(!list) return;
  
  const upcoming = lastTasksCache
    .filter(t => t.status === 'pending' && t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);
  
  if(upcoming.length === 0) {
    list.innerHTML = '<li class="upcoming-item empty">No upcoming tasks</li>';
    return;
  }
  
  list.innerHTML = upcoming.map(t => `
    <li class="upcoming-item">
      <div>${escapeHtml(t.title)}</div>
      <div class="task-meta">📅 ${t.due_date}</div>
    </li>
  `).join('');
}

// ============================================
// ACHIEVEMENTS
// ============================================
function updateStats(tasks) {
  const completed = tasks.filter(t => t.status === 'completed').length;
  console.log('📊 Stats updated:', completed, 'tasks completed');
  checkAchievements(completed);
}

function checkAchievements(completedCount) {
  console.log('🏆 Checking achievements for', completedCount, 'completed tasks');
  console.log('🏆 Currently unlocked:', unlockedAchievementIds);
  
  let newUnlocks = false;
  
  ACHIEVEMENTS.forEach(ach => {
    if(completedCount >= ach.threshold && !unlockedAchievementIds.includes(ach.id)) {
      console.log('🎉 NEW ACHIEVEMENT UNLOCKED:', ach.name, 'at', ach.threshold, 'tasks!');
      unlockedAchievementIds.push(ach.id);
      newUnlocks = true;
      addXP(XP_REWARDS.achievementUnlock);
      showAchievementModal(ach);
    }
  });
  
  if(newUnlocks) {
    localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(unlockedAchievementIds));
    renderAchievements();
    updateAchievementBadge();
  } else {
    console.log('ℹ️ No new achievements to unlock');
  }
}

function showAchievementModal(achievement) {
  const modal = document.getElementById('achievement-modal');
  const img = document.getElementById('achievement-modal-img');
  const title = document.getElementById('achievement-modal-title');
  const desc = document.getElementById('achievement-modal-desc');
  const modalContent = document.querySelector('.achievement-modal-content');
  
  console.log('🎬 Showing achievement modal for:', achievement.name);
  console.log('📁 Image path:', achievement.img);
  
  if(!modal || !img || !title || !desc || !modalContent) {
    console.error('❌ Modal elements not found');
    return;
  }
  
  // Reset animation state
  modalContent.classList.remove('reveal-complete');
  title.style.opacity = '0';
  desc.style.opacity = '0';
  
  // Set content
  title.textContent = `${achievement.icon} ${achievement.name} UNLOCKED!`;
  desc.textContent = achievement.desc;
  
  // Set the image source immediately with absolute path
  const imagePath = achievement.img.startsWith('assets/') ? achievement.img : `assets/${achievement.img}`;
  img.src = imagePath;
  img.alt = achievement.name;
  img.style.display = 'block';
  img.style.opacity = '0';
  img.style.filter = 'blur(30px) brightness(0.3)';
  
  console.log('🖼️ Achievement img value:', achievement.img);
  console.log('🖼️ Setting image source to:', imagePath);
  console.log('🖼️ Full image URL:', new URL(imagePath, window.location.href).href);
  console.log('🖼️ Image element src attribute:', img.src);
  
  // Show modal immediately
  modal.classList.add('show');
  modal.style.zIndex = '10000';
  
  // Wait a moment for image to start loading, then start animation
  setTimeout(() => {
    console.log('🎬 Starting reveal animation...');
    
    // Start epic reveal sequence - sound starts immediately
    playAchievementSound();
    
    console.log('🎵 Starting 5-second epic reveal sequence...');
    
    // Phase 1: Fade in blurred silhouette (0-1.5s) - Building tension
    setTimeout(() => {
      console.log('⚡ Phase 1: Dark silhouette emerging...');
      img.style.transition = 'opacity 1.5s ease, filter 1.5s ease';
      img.style.opacity = '0.3';
      img.style.filter = 'blur(25px) brightness(0.4)';
    }, 100);
    
    // Continue with rest of animation phases...
    startRevealPhases(img, modalContent, title, desc);
  }, 200);
  
  // Add error handler
  img.onerror = () => {
    console.error('❌ Failed to load image:', achievement.img);
    console.error('🔍 Check if file exists at:', new URL(achievement.img, window.location.href).href);
  };
  
  img.onload = () => {
    console.log('✅ Image loaded successfully!', img.width, 'x', img.height);
  };
}

// Separate function for the reveal animation phases
function startRevealPhases(img, modalContent, title, desc) {
  
  // Phase 2: Intensify and clarify (1.5-3s) - Tension rising
  setTimeout(() => {
    console.log('⚡ Phase 2: Form becoming clearer...');
    img.style.transition = 'opacity 1.5s ease, filter 1.5s ease';
    img.style.opacity = '0.7';
    img.style.filter = 'blur(10px) brightness(0.8)';
  }, 1600);
  
  // Phase 3: Full reveal with explosion effect (3-4s) - EPIC REVEAL!
  setTimeout(() => {
    console.log('💥 Phase 3: FULL REVEAL! Explosion effect!');
    img.style.transition = 'opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    img.style.opacity = '1';
    img.style.filter = 'blur(0px) brightness(1.2)';
    img.style.transform = 'scale(1.1)';
    modalContent.classList.add('reveal-complete');
    
    // Settle to normal (4-4.5s)
    setTimeout(() => {
      img.style.transition = 'transform 0.3s ease, filter 0.3s ease';
      img.style.transform = 'scale(1)';
      img.style.filter = 'blur(0px) brightness(1)';
    }, 400);
  }, 3100);
  
  // Phase 4: Show title with epic entrance (3.5s)
  setTimeout(() => {
    console.log('📛 Phase 4: Title appears!');
    title.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    title.style.opacity = '1';
    title.style.transform = 'scale(1)';
  }, 3500);
  
  // Phase 5: Show description (4.2s)
  setTimeout(() => {
    console.log('📝 Phase 5: Description revealed!');
    desc.style.transition = 'opacity 0.5s ease';
    desc.style.opacity = '1';
  }, 4200);
  
  // Auto-close after full experience (8 seconds total)
  setTimeout(() => {
    closeAchievementModal();
  }, 8000);
}

function closeAchievementModal() {
  console.log('✅ Closing achievement modal');
  const modal = document.getElementById('achievement-modal');
  const modalContent = document.querySelector('.achievement-modal-content');
  
  if(modal) {
    modal.classList.remove('show');
  }
  
  if(modalContent) {
    modalContent.classList.remove('reveal-complete');
  }
}

function playAchievementSound() {
  if(!SFX.enabled) {
    console.log('🔇 SFX disabled, skipping sound');
    return;
  }
  
  try {
    const audio = new Audio('assets/EDITED.wav');
    audio.volume = 0.8;
    audio.preload = 'auto';
    
    // Ensure audio context is resumed (browser autoplay policy)
    if(SFX.ctx && SFX.ctx.state === 'suspended') {
      SFX.ctx.resume().then(() => {
        console.log('🎵 Audio context resumed');
      });
    }
    
    // Add load event listener
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ Audio loaded and ready');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('❌ Audio load error:', e);
      console.error('Audio error details:', audio.error);
    });
    
    const playPromise = audio.play();
    if(playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('🎵 Achievement sound playing - EDITED.wav');
        })
        .catch(err => {
          console.error('❌ Audio play failed:', err);
          console.log('Trying to enable audio on next user interaction...');
          // Try alternative method
          const playOnClick = () => {
            audio.play()
              .then(() => console.log('🎵 Audio playing after click'))
              .catch(e => console.error('Retry failed:', e));
          };
          document.addEventListener('click', playOnClick, { once: true });
        });
    }
  } catch(error) {
    console.error('❌ Could not create audio object:', error);
  }
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if(!grid) return;
  
  const unlocked = unlockedAchievementIds.length;
  const total = ACHIEVEMENTS.length;
  const percent = Math.round((unlocked / total) * 100);
  
  // Update progress bar
  setText('ach-unlocked', unlocked);
  setText('ach-total', total);
  const progressBar = document.getElementById('ach-progress-bar');
  if(progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  
  // Render cards
  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const isUnlocked = unlockedAchievementIds.includes(ach.id);
    return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" 
           onclick="toggleAchievementCard(this)">
        <div class="achievement-card-inner">
          <div class="achievement-card-front">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-threshold">
              ${isUnlocked ? '✓ Unlocked' : `Complete ${ach.threshold} tasks`}
            </div>
          </div>
          <div class="achievement-card-back">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleAchievementCard(card) {
  if(card.classList.contains('locked')) return;
  
  // Get achievement ID from the card
  const achievementName = card.querySelector('.achievement-name').textContent;
  const achievement = ACHIEVEMENTS.find(ach => ach.name === achievementName);
  
  if(achievement) {
    showAchievementModal(achievement);
  }
}

function updateAchievementBadge() {
  const badge = document.getElementById('achievement-badge');
  if(badge) {
    badge.style.display = 'inline-block';
    setTimeout(() => {
      badge.style.display = 'none';
    }, 5000);
  }
}

// ============================================
// SETTINGS
// ============================================
function changeTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  
  // Update the select dropdown
  const themeSelect = document.getElementById('theme-select');
  if(themeSelect) {
    themeSelect.value = theme;
  }
  
  const themeNames = {
    'default': 'Default (Dark)',
    'cyberpunk': 'Cyberpunk',
    'matrix': 'Matrix',
    'transformers': 'Transformers'
  };
  
  showNotification(`Theme changed to ${themeNames[theme] || theme}`, 'info');
  SFX.play('tab');
}

function toggleAnimations(enabled) {
  document.body.classList.toggle('no-animations', !enabled);
  localStorage.setItem('animations', enabled);
}

function toggleSound(enabled) {
  SFX.enabled = enabled;
  localStorage.setItem('sfxEnabled', enabled);
  updateSFXIcon();
}

function setVolume(value) {
  SFX.setVolume(value);
  localStorage.setItem('volume', value);
}

function toggleSFX() {
  const enabled = SFX.toggle();
  updateSFXIcon();
  if(enabled) SFX.play('tab');
}

function updateSFXIcon() {
  const icon = document.getElementById('sfx-icon');
  if(icon) {
    icon.src = SFX.enabled ? 'assets/VOLUME.png' : 'assets/MUTEICON.png';
  }
}

function toggleSuggestions(enabled) {
  localStorage.setItem('suggestions', enabled);
  showNotification(`Smart suggestions ${enabled ? 'enabled' : 'disabled'}`, 'info');
}

function syncCalendar() {
  showNotification('Calendar sync coming soon!', 'info');
}

function exportData() {
  const data = {
    tasks: lastTasksCache,
    achievements: unlockedAchievementIds,
    xp: userXP,
    level: userLevel
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexus-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully', 'success');
}

async function resetAllData() {
  if(!confirm('This will delete ALL your tasks, progress, and achievements. Are you sure?')) return;
  if(!confirm('Really sure? This action CANNOT be undone!')) return;
  
  console.log('🗑️ Starting complete data reset...');
  
  try {
    // Fetch current tasks
    const response = await fetch(API_URL);
    const tasks = await response.json();
    console.log('📋 Found', tasks.length, 'tasks to delete');
    
    // Delete all tasks from backend one by one
    for(const task of tasks) {
      try {
        const delResponse = await fetch(`${API_URL}/${task.id}`, { method: 'DELETE' });
        console.log('✅ Deleted task:', task.id);
      } catch(error) {
        console.error('❌ Error deleting task:', task.id, error);
      }
    }
  } catch(error) {
    console.error('❌ Error fetching tasks:', error);
  }
  
  // Clear all localStorage
  console.log('🧹 Clearing localStorage...');
  localStorage.clear();
  
  // Reset all global variables
  userXP = 0;
  userLevel = 1;
  currentTags = [];
  unlockedAchievementIds = [];
  lastTasksCache = [];
  offlineQueue = [];
  
  console.log('✅ All data deleted successfully!');
  showNotification('All data deleted. Reloading...', 'success');
  
  // Reload the page after a short delay
  setTimeout(() => {
    location.reload(true); // Force reload from server
  }, 1500);
}

// ============================================
// BULK OPERATIONS
// ============================================
async function markAllCompleted() {
  const pending = lastTasksCache.filter(t => t.status === 'pending');
  if(pending.length === 0) return;
  
  if(!confirm(`Mark ${pending.length} tasks as completed?`)) return;
  
  for(const task of pending) {
    try {
      await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch(error) {
      console.error('Bulk complete error:', error);
    }
  }
  
  addXP(XP_REWARDS.taskComplete * pending.length);
  await fetchTasks();
  showNotification(`${pending.length} tasks completed!`, 'success');
  SFX.play('complete');
}

async function clearCompleted() {
  const completed = lastTasksCache.filter(t => t.status === 'completed');
  if(completed.length === 0) return;
  
  if(!confirm(`Delete ${completed.length} completed tasks?`)) return;
  
  for(const task of completed) {
    try {
      await fetch(`${API_URL}/${task.id}`, { method: 'DELETE' });
    } catch(error) {
      console.error('Clear completed error:', error);
    }
  }
  
  await fetchTasks();
  showNotification(`${completed.length} tasks cleared`, 'success');
  SFX.play('delete');
}

// ============================================
// UI HELPERS
// ============================================
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if(!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showSuccessAnimation() {
  const overlay = document.getElementById('success-overlay');
  if(overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 2000);
  }
}

function focusTaskInput() {
  const input = document.getElementById('title');
  if(input) input.focus();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function escapeHtml(str) {
  if(!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Prime Task Manager initializing...');
  console.log('📁 Current location:', window.location.href);
  console.log('📁 Base path:', window.location.origin);
  
  // Load saved state
  unlockedAchievementIds = JSON.parse(localStorage.getItem(LS_ACHIEVEMENTS) || '[]');
  userXP = parseInt(localStorage.getItem(LS_XP) || '0');
  userLevel = parseInt(localStorage.getItem(LS_LEVEL) || '1');
  
  console.log('💾 Loaded state:', { unlockedAchievementIds, userXP, userLevel });
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'default';
  document.body.dataset.theme = savedTheme;
  const themeSelect = document.getElementById('theme-select');
  if(themeSelect) {
    themeSelect.value = savedTheme;
  }
  
  console.log('🎨 Theme loaded:', savedTheme);
  
  // Test asset loading
  console.log('🧪 Testing asset paths...');
  const testImg = new Image();
  testImg.onload = () => console.log('✅ Test image loaded successfully:', testImg.src);
  testImg.onerror = () => console.error('❌ Test image failed:', testImg.src);
  testImg.src = 'assets/autobotlogo.png';
  
  // Initialize UI
  updateXPDisplay();
  updateSFXIcon();
  
  // Load last section or default to tasks
  const lastSection = localStorage.getItem('lastSection') || 'tasks';
  showSection(lastSection);
  
  // Setup form submission
  const form = document.getElementById('task-form');
  if(form) {
    form.addEventListener('submit', addTask);
  }
  
  // Setup keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if(e.altKey) {
      switch(e.key) {
        case '1': showSection('dashboard'); break;
        case '2': showSection('tasks'); break;
        case '3': showSection('achievements'); break;
        case '4': showSection('settings'); break;
      }
    }
  });
  
  // Close achievement modal on click outside
  const modal = document.getElementById('achievement-modal');
  if(modal) {
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        closeAchievementModal();
      }
    });
  }
  
  console.log('🚀 Prime Task Manager initialized');
  
  // Add global test function for debugging (remove in production)
  window.testAchievement = () => {
    console.log('🧪 Manually triggering Bumblebee achievement...');
    showAchievementModal(ACHIEVEMENTS[0]);
  };
  console.log('💡 Tip: Type testAchievement() in console to test the achievement modal');
});
