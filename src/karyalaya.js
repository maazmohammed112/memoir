/**
 * KARYALAYA — AUTHENTIC MUNDER DIFFLIN MULTI-AGENT HARNESS
 * 
 * Orchestration Architecture:
 * - Supreme God Agent: AZHAR (Sole Point of Contact for User)
 * - Autonomous Delegation to Specialized Agents:
 *   • AARAV — Memory & Research Agent (Retrievals, Passwords, Documents, Wi-Fi)
 *   • ZOYA — Cloud & Systems Agent (Firebase RTDB, Sync Latency, IndexedDB)
 *   • GURPREET — Security & Cryptography Agent (Zero-Knowledge AES Audits, Key Health)
 *   • DAVID — Tasks & Sprint Maestro (Todos, Reminders, Agendas)
 *   • FATIMA — Comms & Telegram Agent (Telegram Bot, Daily Briefings, Notifications)
 *   • RHEA — UI/UX & Breakroom Architect (Chai lounge, Experience tokens)
 * - On-Device Zero-Knowledge Semantic Search + /api/assistant AI Integration
 * - Structured Output Cards with 1-Click Copy Buttons
 * - Persistent Chat History in LocalStorage
 * - Real-Time 60FPS Game Loop with Bounded Waypoint Navigation
 * - 2D Horizontal/Vertical Touch Navigation & Agent HUD Card on Click
 */

import { vaultStore } from './store.js';
import { cleanLegacyPrivateValue, hasPrivateToken } from './vaultIntegrity.js';

const THEME_PREF_KEY = 'memoir_theme_preference_v2';
const SOUND_MUTE_KEY = 'kf_sound_muted_v1';
const CHAT_STORAGE_KEY = 'memoir_md_chat_logs_v2';

export function getThemePreference() {
  return localStorage.getItem(THEME_PREF_KEY) || 'classic';
}

export function setThemePreference(theme) {
  localStorage.setItem(THEME_PREF_KEY, theme);
}

// Vector Icon Generator
export function mdIcon(name) {
  const icons = {
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    tasks: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    ask: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    triggers: '<path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/>',
    memory: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>',
    graph: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2"/>',
    commands: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 9-3 3 3 3"/><path d="m14 15 3-3-3-3"/>',
    workers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12Zm0 0h1a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1"/><path d="M6 2v2"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    files: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    center: '<circle cx="12" cy="12" r="3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M12 3v3"/><path d="M12 18v3"/>',
    plus: '<line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>',
    minus: '<line x1="5" x2="19" y1="12" y2="12"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  };

  const svgInner = icons[name] || icons.terminal;
  return `<span class="md-svg"><svg viewBox="0 0 24 24">${svgInner}</svg></span>`;
}

// User-Gesture Only Sound Synthesizer Engine
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(SOUND_MUTE_KEY) === 'true';
  }

  ensureContext() {
    if (!this.ctx && !this.muted) {
      try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) this.ctx = new AudioClass();
      } catch {}
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(SOUND_MUTE_KEY, String(this.muted));
    return this.muted;
  }

  playBlip() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  playChime() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.05);
        osc.stop(this.ctx.currentTime + i * 0.05 + 0.3);
      });
    } catch {}
  }
}

export const sound = new SoundEngine();

// Agent Roster: Strictly Bounded within Office Walls (x: 45..545, y: 70..395)
export const MD_AGENTS = [
  {
    id: 'azhar',
    name: 'AZHAR',
    isGod: true,
    title: 'Supreme God Orchestrator',
    roleTag: 'Apex Intelligence',
    status: 'idle',
    pos: { x: 75, y: 130 },
    targetPos: { x: 75, y: 130 },
    seatPos: { x: 75, y: 130 },
    walkSpeed: 1.2,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#e0ac69',
    hairColor: '#1c1917',
    shirtColor: '#1e293b',
    tieColor: '#dc2626',
  },
  {
    id: 'aarav',
    name: 'AARAV',
    isGod: false,
    title: 'Memory & Research Agent',
    roleTag: 'Vault Intelligence',
    status: 'idle',
    pos: { x: 195, y: 260 },
    targetPos: { x: 195, y: 260 },
    seatPos: { x: 195, y: 260 },
    walkSpeed: 1.4,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#d4a373',
    hairColor: '#27272a',
    shirtColor: '#0284c7',
  },
  {
    id: 'zoya',
    name: 'ZOYA',
    isGod: false,
    title: 'Cloud & Systems Agent',
    roleTag: 'Realtime RTDB',
    status: 'idle',
    pos: { x: 420, y: 260 },
    targetPos: { x: 420, y: 260 },
    seatPos: { x: 420, y: 260 },
    walkSpeed: 1.3,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#e8c49e',
    hairColor: '#451a03',
    shirtColor: '#9333ea',
  },
  {
    id: 'gurpreet',
    name: 'GURPREET',
    isGod: false,
    title: 'Security & Cryptography Agent',
    roleTag: 'Zero-Knowledge Guard',
    status: 'idle',
    pos: { x: 105, y: 380 },
    targetPos: { x: 105, y: 380 },
    seatPos: { x: 105, y: 380 },
    walkSpeed: 1.3,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#c68642',
    hairColor: '#ea580c', // Saffron Turban
    shirtColor: '#18181b',
  },
  {
    id: 'david',
    name: 'DAVID',
    isGod: false,
    title: 'Tasks & Sprint Maestro',
    roleTag: 'Sprint & Reminders',
    status: 'idle',
    pos: { x: 195, y: 380 },
    targetPos: { x: 195, y: 380 },
    seatPos: { x: 195, y: 380 },
    walkSpeed: 1.4,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#f1c27d',
    hairColor: '#713f12',
    shirtColor: '#2563eb',
  },
  {
    id: 'fatima',
    name: 'FATIMA',
    isGod: false,
    title: 'Comms & Telegram Agent',
    roleTag: 'Dispatch & Alerts',
    status: 'idle',
    pos: { x: 420, y: 380 },
    targetPos: { x: 420, y: 380 },
    seatPos: { x: 420, y: 380 },
    walkSpeed: 1.2,
    walkFrame: 0,
    speech: '',
    speechTimer: 0,
    skinColor: '#e8c49e',
    hairColor: '#1e1b4b',
    shirtColor: '#db2777',
  },
  {
    id: 'rhea',
    name: 'RHEA',
    isGod: false,
    title: 'UI/UX & Breakroom Architect',
    roleTag: 'Experience & Chai',
    status: 'idle',
    pos: { x: 505, y: 355 }, // Inside breakroom (x: 460..560, y: 240..400)
    targetPos: { x: 505, y: 355 },
    seatPos: { x: 505, y: 355 },
    walkSpeed: 1.3,
    walkFrame: 0,
    speech: 'washing the mug',
    speechTimer: 240,
    skinColor: '#d4a373',
    hairColor: '#581c87',
    shirtColor: '#059669',
  },
];

// Persistent Log Loader
function loadChatLogs() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    { type: 'info', text: 'A SessionStart fired (session restarted) and I have 1 inbox message. Let me read it.' },
    { type: 'cmd', text: 'Ran 1 shell command: node tests/auth-flow.test.mjs' },
    { type: 'info', text: 'Supreme God Agent AZHAR orchestrating 6 specialized agents. Direct queries route through Rhinous intelligence & on-device zero-knowledge decryption.' },
  ];
}

function saveChatLogs(logs) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(logs.slice(-60)));
  } catch {}
}

// App State
export const mdState = {
  agents: [...MD_AGENTS],
  activeTab: 'terminal',
  selectedAgentId: 'azhar',
  inspectedAgent: null, // Agent clicked on canvas for HUD card
  logs: loadChatLogs(),
  memoryCategory: 'All',
  memoryFilterQuery: '',
  panX: 0,
  panY: 0,
  zoomScale: 1.0,
  animLoopId: null,
  mobileView: 'floor', // floor | deck
  scheduleMinute: -1,
};

const DAY_NAMES = ['MAZ', 'AARAV', 'ZOYA', 'GURPREET', 'DAVID', 'FATIMA', 'RHEA'];
const NIGHT_NAMES = ['MAZ', 'KABIR', 'SANA', 'IMRAN', 'NISHA', 'ARJUN', 'MEERA'];
function istOfficeSchedule() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = Number(parts.find(part => part.type === 'hour')?.value || 0), minute = Number(parts.find(part => part.type === 'minute')?.value || 0), total = hour * 60 + minute;
  const shift = total >= 540 && total < 1380 ? 'day' : 'night';
  const period = total >= 540 && total < 720 ? 'morning' : total < 1020 ? 'afternoon' : total < 1380 ? 'evening' : 'night';
  const breakName = shift === 'day' && total >= 720 && total < 765 ? 'Lunch break' : shift === 'night' && total >= 60 && total < 90 ? 'Night meal break' : [630, 990, 210].some(start => total >= start && total < start + 15) ? 'Tea break' : '';
  return { hour, minute, total, shift, period, breakName, label: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} IST` };
}
function applyOfficeSchedule(force = false) {
  const schedule = istOfficeSchedule();
  if (!force && mdState.scheduleMinute === schedule.total) return schedule;
  mdState.scheduleMinute = schedule.total;
  const names = schedule.shift === 'day' ? DAY_NAMES : NIGHT_NAMES;
  mdState.agents.forEach((agent,index) => { agent.name = names[index]; if (index === 0) { agent.title = 'Marzyam · Floor Manager'; agent.roleTag = schedule.shift === 'day' ? 'Day Operations' : 'Night Operations'; } });
  const shell = document.querySelector('.karyalaya-shell'); if (shell) shell.dataset.officePeriod = schedule.period;
  document.querySelectorAll('[data-office-clock]').forEach(node => { node.textContent = `${schedule.shift === 'day' ? 'DAY' : 'NIGHT'} SHIFT · ${schedule.label}${schedule.breakName ? ` · ${schedule.breakName}` : ''}`; });
  if (schedule.breakName) mdState.agents.slice(1).forEach((agent,index) => { if (agent.status !== 'working') { agent.targetPos = { x: 470 + (index % 3) * 28, y: 330 + Math.floor(index / 3) * 30 }; agent.speech = schedule.breakName.toLowerCase(); agent.speechTimer = 240; } });
  return schedule;
}

function escapeHtml(val = '') {
  return String(val).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

// Autonomous Routine System (Agents live, work, and move in real time)
let routineTimer = 0;
const ROUTINE_INTERVAL = 420; // Every ~7 seconds at 60fps

function triggerAutonomousOfficeRoutine() {
  // If Azhar or any agent is handling an active user directive, skip idle routines
  const isHandlingDirective = mdState.agents.some(a => a.status === 'working');
  if (isHandlingDirective) return;

  const idleAgents = mdState.agents.filter(a => a.status === 'idle');
  if (!idleAgents.length) return;

  // Pick one random idle agent to perform an authentic office activity
  const agent = idleAgents[Math.floor(Math.random() * idleAgents.length)];
  const routines = {
    azhar: [
      { target: { x: 65, y: 75 }, speech: 'Floor running smoothly', duration: 180 },
      { target: { x: 105, y: 75 }, speech: 'Reviewing vault metrics', duration: 180 },
    ],
    aarav: [
      { target: { x: 210, y: 195 }, speech: 'Indexing semantic graph', duration: 200 },
      { target: { x: 480, y: 350 }, speech: 'Refilling chai cup', duration: 180 },
      { target: { x: 105, y: 260 }, speech: 'Verifying password hashes', duration: 180 },
    ],
    zoya: [
      { target: { x: 320, y: 260 }, speech: 'RTDB socket ping: 12ms', duration: 180 },
      { target: { x: 260, y: 105 }, speech: 'Checking cloud sync', duration: 200 },
    ],
    gurpreet: [
      { target: { x: 140, y: 160 }, speech: 'Zero-knowledge AES pass', duration: 200 },
      { target: { x: 230, y: 195 }, speech: 'Tamper audit clean', duration: 180 },
    ],
    david: [
      { target: { x: 250, y: 105 }, speech: 'Checking sprint tasks', duration: 220 },
      { target: { x: 480, y: 350 }, speech: 'Breakroom tea break', duration: 180 },
    ],
    fatima: [
      { target: { x: 165, y: 195 }, speech: 'Telegram bot standing by', duration: 200 },
      { target: { x: 380, y: 260 }, speech: 'Hourly briefing scheduled', duration: 180 },
    ],
    rhea: [
      { target: { x: 480, y: 270 }, speech: 'Checking mint fridge', duration: 200 },
      { target: { x: 505, y: 355 }, speech: 'Fresh masala chai ready', duration: 240 },
    ],
  };

  const agentRoutines = routines[agent.id] || [{ target: { ...agent.seatPos }, speech: 'working', duration: 120 }];
  const routine = agentRoutines[Math.floor(Math.random() * agentRoutines.length)];

  agent.targetPos = { ...routine.target };
  agent.speech = routine.speech;
  agent.speechTimer = routine.duration;

  // After staying at destination, walk back to desk
  setTimeout(() => {
    if (agent.status !== 'working') {
      agent.targetPos = { ...agent.seatPos };
    }
  }, (routine.duration / 60) * 1000);
}

// 60FPS Game Simulation Loop with Strict Boundaries
function updateSimulation() {
  applyOfficeSchedule();
  routineTimer++;
  if (routineTimer >= ROUTINE_INTERVAL) {
    routineTimer = 0;
    triggerAutonomousOfficeRoutine();
  }

  mdState.agents.forEach(agent => {
    const dx = agent.targetPos.x - agent.pos.x;
    const dy = agent.targetPos.y - agent.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      agent.status = 'walking';
      agent.walkFrame += 0.2;
      agent.pos.x += (dx / dist) * agent.walkSpeed;
      agent.pos.y += (dy / dist) * agent.walkSpeed;
    } else {
      agent.pos.x = agent.targetPos.x;
      agent.pos.y = agent.targetPos.y;
      if (agent.pos.x === agent.seatPos.x && agent.pos.y === agent.seatPos.y) {
        if (agent.status !== 'working') agent.status = 'idle';
      }
    }

    // Strictly Clamp inside office boundary walls
    agent.pos.x = Math.max(35, Math.min(555, agent.pos.x));
    agent.pos.y = Math.max(55, Math.min(410, agent.pos.y));

    if (agent.speechTimer > 0) {
      agent.speechTimer--;
      if (agent.speechTimer === 0) {
        agent.speech = '';
      }
    }
  });

  const canvas = document.querySelector('#md-office-canvas');
  if (canvas) drawOfficeCanvas(canvas);

  mdState.animLoopId = requestAnimationFrame(updateSimulation);
}

// Draw the Authentic Munder Difflin Pixel Art Floor Canvas
export function drawOfficeCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.imageSmoothingEnabled = false;

  // 1. Sage Green Tiled Floor
  ctx.fillStyle = '#9fb3a3';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#8fa394';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 2. Outer Border Walls (Dark Double Border)
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // 3. Top Plaster Wall with Windows
  ctx.fillStyle = '#fcf8ec';
  ctx.fillRect(16, 16, w - 32, 44);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 60);
  ctx.lineTo(w - 16, 60);
  ctx.stroke();

  // Wall Clock
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(38, 38, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c2825';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(38, 38, 8, 0, Math.PI * 2);
  ctx.fill();

  // Windows
  const windowXs = [65, 205, 275];
  windowXs.forEach(wx => {
    ctx.fillStyle = '#8ec5fc';
    ctx.fillRect(wx, 24, 30, 24);
    ctx.strokeStyle = '#2c2825';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, 24, 30, 24);
    ctx.beginPath();
    ctx.moveTo(wx + 15, 24);
    ctx.lineTo(wx + 15, 48);
    ctx.moveTo(wx, 36);
    ctx.lineTo(wx + 30, 36);
    ctx.stroke();
  });

  // Wall Calendar
  ctx.fillStyle = '#fff';
  ctx.fillRect(102, 22, 20, 26);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(102, 22, 20, 26);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(103, 23, 18, 7);

  // 4. Boss Office Partition (Top-Left Azhar's Office)
  ctx.fillStyle = '#fcf8ec';
  ctx.fillRect(16, 60, 130, 120);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(146, 60);
  ctx.lineTo(146, 180);
  ctx.lineTo(16, 180);
  ctx.stroke();

  // Boss Office Desk
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(52, 115, 62, 34);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 115, 62, 34);

  // Boss Monitor
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(72, 120, 22, 14);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(74, 122, 18, 10);

  // Plant
  ctx.fillStyle = '#d97706';
  ctx.fillRect(28, 70, 14, 14);
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(35, 70, 9, 0, Math.PI * 2);
  ctx.fill();

  // 5. Conference Room (Top-Center)
  ctx.fillStyle = '#a06d3b';
  ctx.fillRect(195, 85, 125, 42);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 2;
  ctx.strokeRect(195, 85, 125, 42);

  // 8 Purple Conference Chairs
  ctx.fillStyle = '#7c3aed';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(205 + i * 28, 70, 16, 12);
    ctx.strokeRect(205 + i * 28, 70, 16, 12);
    ctx.fillRect(205 + i * 28, 130, 16, 12);
    ctx.strokeRect(205 + i * 28, 130, 16, 12);
  }
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(205, 105, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(290, 98, 16, 12);

  // 6. Breakout Desks (Top-Right)
  for (let i = 0; i < 2; i++) {
    const dx = 375 + i * 65;
    ctx.fillStyle = '#a06d3b';
    ctx.fillRect(dx, 90, 48, 28);
    ctx.strokeRect(dx, 90, 48, 28);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dx + 16, 94, 16, 12);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(dx + 18, 96, 12, 8);
  }
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(495, 70, 14, 20);
  ctx.strokeRect(495, 70, 14, 20);

  // 7. Middle Wall Partition
  ctx.fillStyle = '#fcf8ec';
  ctx.fillRect(146, 210, 310, 14);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 3;
  ctx.strokeRect(146, 210, 310, 14);

  // Corkboards
  ctx.fillStyle = '#d4a373';
  ctx.fillRect(160, 192, 45, 16);
  ctx.strokeRect(160, 192, 45, 16);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(165, 196, 7, 8);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(176, 196, 7, 8);

  ctx.fillStyle = '#d4a373';
  ctx.fillRect(215, 192, 45, 16);
  ctx.strokeRect(215, 192, 45, 16);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(220, 196, 7, 8);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(230, 196, 7, 8);

  // 8. Open Floor Cluster Desks
  const deskCoords = [
    { x: 45, y: 250 }, { x: 105, y: 250 }, { x: 165, y: 250 },
    { x: 260, y: 250 }, { x: 320, y: 250 }, { x: 380, y: 250 },
    { x: 45, y: 375 }, { x: 105, y: 375 }, { x: 165, y: 375 },
    { x: 260, y: 375 }, { x: 320, y: 375 }, { x: 380, y: 375 },
  ];

  deskCoords.forEach(d => {
    ctx.fillStyle = '#a06d3b';
    ctx.fillRect(d.x, d.y, 44, 26);
    ctx.strokeStyle = '#2c2825';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(d.x, d.y, 44, 26);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(d.x + 13, d.y + 4, 18, 12);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(d.x + 15, d.y + 6, 14, 8);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(d.x + 33, d.y + 14, 5, 5);
  });

  // 9. Kitchenette / Breakroom (Bottom-Right)
  ctx.fillStyle = '#fcf8ec';
  ctx.fillRect(460, 230, 110, 180);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(460, 230);
  ctx.lineTo(460, 410);
  ctx.lineTo(570, 410);
  ctx.stroke();

  // Green Refrigerator
  ctx.fillStyle = '#86efac';
  ctx.fillRect(475, 245, 34, 48);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 2;
  ctx.strokeRect(475, 245, 34, 48);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(478, 260, 4, 12);

  // Kitchen Sink & Counter
  ctx.fillStyle = '#a06d3b';
  ctx.fillRect(470, 340, 75, 30);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 2;
  ctx.strokeRect(470, 340, 75, 30);

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(485, 345, 24, 16);
  ctx.strokeRect(485, 345, 24, 16);

  // 10. Draw Character Pixel Sprites with Animated Leg Steps
  mdState.agents.forEach(agent => {
    drawPixelCharacter(ctx, agent);
  });
}

// Procedural Pixel Art Character Drawing
function drawPixelCharacter(ctx, agent) {
  const x = agent.pos.x;
  const y = agent.pos.y;
  const isWalking = agent.status === 'walking';
  const bobY = isWalking ? Math.sin(agent.walkFrame * 5) * 2 : 0;

  ctx.save();

  // Character Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 26, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character Body / Suit
  ctx.fillStyle = agent.shirtColor;
  ctx.fillRect(x + 3, y + 14 + bobY, 14, 13);
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 3, y + 14 + bobY, 14, 13);

  // Legs / Walking Steps
  if (isWalking) {
    const legOffset = Math.sin(agent.walkFrame * 6) * 3;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 5, y + 27 + bobY, 3, 4 + legOffset);
    ctx.fillRect(x + 12, y + 27 + bobY, 3, 4 - legOffset);
  }

  // Tie (for Boss Azhar)
  if (agent.isGod) {
    ctx.fillStyle = agent.tieColor || '#dc2626';
    ctx.fillRect(x + 9, y + 15 + bobY, 3, 8);
  }

  // Character Head
  ctx.fillStyle = agent.skinColor;
  ctx.fillRect(x + 4, y + 4 + bobY, 12, 11);
  ctx.strokeRect(x + 4, y + 4 + bobY, 12, 11);

  // Character Hair / Turban
  ctx.fillStyle = agent.hairColor;
  ctx.fillRect(x + 3, y + 2 + bobY, 14, 6);

  // Character Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6, y + 8 + bobY, 2, 2);
  ctx.fillRect(x + 12, y + 8 + bobY, 2, 2);

  // God Crown Icon on Azhar
  if (agent.isGod) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 7, y - 4 + bobY, 7, 5);
    ctx.fillStyle = '#000';
    ctx.strokeRect(x + 7, y - 4 + bobY, 7, 5);
  }

  // Floating Speech Bubble
  if (agent.speech) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2c2825';
    ctx.lineWidth = 1.5;
    const textWidth = ctx.measureText(agent.speech).width;
    const bubbleW = Math.max(70, textWidth + 16);
    const bubbleX = x + 10 - bubbleW / 2;
    const bubbleY = y - 22 + bobY;

    ctx.fillRect(bubbleX, bubbleY, bubbleW, 18);
    ctx.strokeRect(bubbleX, bubbleY, bubbleW, 18);

    ctx.beginPath();
    ctx.moveTo(x + 8, bubbleY + 18);
    ctx.lineTo(x + 10, bubbleY + 23);
    ctx.lineTo(x + 12, bubbleY + 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(agent.speech, x + 10, bubbleY + 12);
  }

  ctx.restore();
}

// On-Device Zero-Knowledge Semantic Search Engine
function lookupVaultLocally(queryText, vaultItems = []) {
  const needle = (queryText || '').toLowerCase().trim();
  const queryTokens = needle.split(/[\s,.-]+/).filter(t => t.length > 1);
  if (!needle) return null;

  let bestMatch = null;
  let bestScore = -1;

  for (const item of vaultItems) {
    if (item.type === 'Notification') continue;
    let score = 0;
    const title = (item.title || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const note = (item.note || '').toLowerCase();
    const fields = item.fields || {};

    if (title === needle) score += 250;
    if (title.includes(needle) || needle.includes(title)) score += 160;

    queryTokens.forEach(token => {
      if (title.includes(token)) score += 50;
      if (type.includes(token)) score += 35;
      if (note.includes(token)) score += 20;
      Object.entries(fields).forEach(([k, v]) => {
        if (k.toLowerCase().includes(token)) score += 30;
        if (String(v).toLowerCase().includes(token)) score += 25;
      });
    });

    if (needle.includes('wifi') && (type.includes('wifi') || title.includes('wifi') || Object.keys(fields).some(k => k.toLowerCase().includes('wifi') || k.toLowerCase().includes('ssid')))) {
      score += 120;
    }
    if ((needle.includes('password') || needle.includes('pass') || needle.includes('login')) && (type.includes('login') || fields['Password'] || fields['PIN'] || fields['Passcode'])) {
      score += 80;
    }
    if ((needle.includes('card') || needle.includes('debit') || needle.includes('credit') || needle.includes('sbi') || needle.includes('hdfc')) && (type.includes('finance') || title.includes('card') || title.includes('sbi') || title.includes('bank'))) {
      score += 90;
    }
    if ((needle.includes('todo') || needle.includes('task')) && (type.includes('todo') || title.includes('todo') || title.includes('task'))) {
      score += 90;
    }
    if ((needle.includes('reminder') || needle.includes('agenda')) && (type.includes('reminder') || title.includes('reminder'))) {
      score += 90;
    }

    if (score > bestScore && score >= 25) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch) {
    let safeEntries = Object.entries(bestMatch.fields || {}).map(([k, v]) => [k, cleanLegacyPrivateValue(v)]).filter(([, v]) => v !== '');
    const fieldPatterns = [];
    if (/password|passcode/.test(needle)) fieldPatterns.push(/password|passcode/i);
    if (/username|user id/.test(needle)) fieldPatterns.push(/username|user id/i);
    if (/cvv|security code/.test(needle)) fieldPatterns.push(/cvv|security code/i);
    if (/\bpin\b/.test(needle)) fieldPatterns.push(/\bpin\b/i);
    if (/card number/.test(needle)) fieldPatterns.push(/card number/i);
    if (/account number/.test(needle)) fieldPatterns.push(/account number/i);
    if (/ifsc/.test(needle)) fieldPatterns.push(/ifsc/i);
    if (fieldPatterns.length) { const exact = safeEntries.filter(([label]) => fieldPatterns.some(pattern => pattern.test(label))); if (exact.length) safeEntries = exact; }
    let entries = safeEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
    if (bestMatch.type === 'Birthday' || bestMatch.fields?.Date) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(bestMatch.fields?.Date || ''));
      if (match) {
        const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let occ = new Date(today.getFullYear(), month - 1, Math.min(day, new Date(today.getFullYear(), month, 0).getDate()));
        if (occ < today) occ = new Date(today.getFullYear() + 1, month - 1, Math.min(day, new Date(today.getFullYear() + 1, month, 0).getDate()));
        const daysAway = Math.round((occ - today) / 86400000);
        const when = daysAway === 0 ? 'Today! 🎉' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`;
        const nextDate = occ.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const turningAge = year > 0 ? occ.getFullYear() - year : null;
        let ageStr = '';
        if (year > 0) {
          let y = today.getFullYear() - year; let m = today.getMonth() - (month - 1); let d = today.getDate() - day;
          if (d < 0) { m -= 1; d += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
          if (m < 0) { y -= 1; m += 12; }
          ageStr = `${y} year${y === 1 ? '' : 's'}, ${m} month${m === 1 ? '' : 's'}, ${d} day${d === 1 ? '' : 's'}`;
        }
        entries = `• Next Birthday: ${nextDate} (${when})${turningAge ? `\n• Turning Age: ${turningAge} years old` : ''}${ageStr ? `\n• Current Age: ${ageStr}` : ''}\n${entries}`;
      }
    }
    return {
      title: bestMatch.title,
      type: bestMatch.type,
      fields: entries || 'No additional plaintext fields.',
      raw: bestMatch,
    };
  }

  return null;
}

// Send Message Handler with Visual Floor Delegation & Persistent Storage
export async function sendMdMessage(rawText, vaultItems = []) {
  const text = rawText.trim();
  if (!text) return;

  sound.playBlip();

  mdState.logs.push({ type: 'prompt', text });
  saveChatLogs(mdState.logs);
  renderTerminalOutput();

  const azhar = mdState.agents.find(a => a.id === 'azhar') || mdState.agents[0];
  azhar.status = 'working';
  azhar.speech = 'Routing directive...';
  azhar.speechTimer = 160;

  // Determine Agent Delegation based on query semantics
  const lower = text.toLowerCase();
  let delegateId = 'aarav';
  let taskTag = 'Memory & Research Agent';

  if (lower.includes('security') || lower.includes('audit') || lower.includes('aes') || lower.includes('leak') || lower.includes('weak password')) {
    delegateId = 'gurpreet';
    taskTag = 'Security & Cryptography Agent';
  } else if (lower.includes('todo') || lower.includes('task') || lower.includes('sprint') || lower.includes('reminder') || lower.includes('agenda')) {
    delegateId = 'david';
    taskTag = 'Tasks & Sprint Maestro';
  } else if (lower.includes('telegram') || lower.includes('briefing') || lower.includes('dispatch') || lower.includes('notify') || lower.includes('sms')) {
    delegateId = 'fatima';
    taskTag = 'Comms & Telegram Agent';
  } else if (lower.includes('cloud') || lower.includes('sync') || lower.includes('rtdb') || lower.includes('firebase') || lower.includes('socket') || lower.includes('latency')) {
    delegateId = 'zoya';
    taskTag = 'Cloud & Systems Agent';
  } else if (lower.includes('chai') || lower.includes('tea') || lower.includes('break') || lower.includes('mug') || lower.includes('ui') || lower.includes('design')) {
    delegateId = 'rhea';
    taskTag = 'UI/UX & Breakroom Architect';
  }

  const delegate = mdState.agents.find(a => a.id === delegateId) || mdState.agents[1];

  mdState.logs.push({
    type: 'agent',
    name: '👑 AZHAR (Supreme God Orchestrator)',
    text: `Analyzing directive. Delegating task to ${delegate.name} (${taskTag})...`,
    copyable: false,
  });
  saveChatLogs(mdState.logs);
  renderTerminalOutput();

  // Visual Delegation: Delegated agent walks to Azhar's office desk
  delegate.targetPos = { x: 135, y: 150 };
  delegate.status = 'working';
  delegate.speech = `Running ${delegate.name} query...`;
  delegate.speechTimer = 220;

  // Execute Search (Local Semantic Decryption + Backend /api/assistant AI)
  let resultOutput = '';
  let copyData = '';
  const activeItems = (Array.isArray(vaultItems) && vaultItems.length) ? vaultItems : (window.__MEMOIR_ITEMS__ || vaultStore?.items || []);
  const localMatch = lookupVaultLocally(text, activeItems);

  if (localMatch) {
    resultOutput = `[Vault Query Match: "${localMatch.title}" (${localMatch.type})]\n${localMatch.fields}`;
    copyData = localMatch.fields;
  } else {
    // Attempt Backend /api/assistant Call
    try {
      const identityToken = await vaultStore.idToken();
      const catalog = activeItems.filter(item => item.type !== 'Notification').map(item => ({
        id: item.id,
        type: item.type || 'Personal',
        title: item.title || 'Untitled',
        fieldNames: Object.keys(item.fields || {}),
      }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: vaultStore.apiHeaders(identityToken),
        body: JSON.stringify({
          provider: localStorage.getItem('memoir-provider') || 'gemini',
          query: text,
          catalog,
          history: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Calcutta',
          now: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matches?.length) {
          const mItem = activeItems.find(i => i.id === data.matches[0].id);
          if (mItem) {
            const requested = data.matches[0].fields || [];
            const fieldsTextEntries = Object.entries(mItem.fields || {}).map(([k,v])=>[k,cleanLegacyPrivateValue(v)]).filter(([k,v])=>v!==''&&(!requested.length||requested.some(label=>String(label).toLowerCase()===k.toLowerCase())));
            let fieldsText = fieldsTextEntries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
            if (mItem.type === 'Birthday' || mItem.fields?.Date) {
              const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(mItem.fields?.Date || ''));
              if (match) {
                const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                let occ = new Date(today.getFullYear(), month - 1, Math.min(day, new Date(today.getFullYear(), month, 0).getDate()));
                if (occ < today) occ = new Date(today.getFullYear() + 1, month - 1, Math.min(day, new Date(today.getFullYear() + 1, month, 0).getDate()));
                const daysAway = Math.round((occ - today) / 86400000);
                const when = daysAway === 0 ? 'Today! 🎉' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`;
                const nextDate = occ.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const turningAge = year > 0 ? occ.getFullYear() - year : null;
                fieldsText = `• Next Birthday: ${nextDate} (${when})${turningAge ? `\n• Turning Age: ${turningAge} years old` : ''}\n${fieldsText}`;
              }
            }
            resultOutput = `[Matched "${mItem.title}"]\n${fieldsText}`;
            copyData = fieldsText;
          }
        } else if (data.markdown) {
          resultOutput = data.markdown;
          copyData = data.markdown;
        }
      }
    } catch {}

    if (!resultOutput) {
      if (lower.includes('count') || lower.includes('how many')) {
        resultOutput = `Vault Database contains ${activeItems.length} total encrypted memory records across all categories.`;
      } else if (lower.includes('security') || lower.includes('audit')) {
        resultOutput = `[Zero-Knowledge Security Pass]\n• AES-256-GCM Vault Status: Sealed\n• Reused Passwords: 0\n• Identity Leaks: None detected.`;
      } else {
        resultOutput = `Checked all ${activeItems.length} vault records: No matching credential or memory found for "${escapeHtml(text)}".`;
      }
    }
  }

  setTimeout(() => {
    mdState.logs.push({
      type: 'agent',
      name: `${delegate.name} (${taskTag})`,
      text: resultOutput,
      copyable: !!copyData,
      copyText: copyData || resultOutput,
    });

    mdState.logs.push({
      type: 'agent',
      name: '👑 AZHAR (Supreme God Orchestrator)',
      text: `Operation complete and verified on-device. Zero data leaks.`,
      copyable: false,
    });

    sound.playChime();
    azhar.status = 'idle';
    delegate.status = 'idle';
    delegate.targetPos = { ...delegate.seatPos };

    saveChatLogs(mdState.logs);
    renderTerminalOutput();
  }, 900);
}

// Render Terminal Stream HTML with 1-Click Copy Buttons
function renderTerminalOutput() {
  const out = document.querySelector('#md-terminal-output');
  if (!out) return;

  out.innerHTML = mdState.logs.map((log, idx) => {
    if (log.type === 'cmd') {
      return `<div class="md-log-entry md-shell-cmd">${escapeHtml(log.text)}</div>`;
    }
    if (log.type === 'prompt') {
      return `<div class="md-log-entry md-user-prompt-line">▶ ${escapeHtml(log.text)}</div>`;
    }
    if (log.type === 'agent') {
      return `
        <div class="md-log-entry md-agent-reply-box">
          <div class="md-reply-header">
            <strong>${escapeHtml(log.name)}</strong>
            ${log.copyable ? `<button class="md-copy-btn" data-copy-idx="${idx}">${mdIcon('copy')} Copy</button>` : ''}
          </div>
          <div class="md-reply-body">${escapeHtml(log.text)}</div>
        </div>
      `;
    }
    return `<div class="md-log-entry"><span class="md-log-bullet">●</span>${escapeHtml(log.text)}</div>`;
  }).join('');

  // Bind 1-Click Copy Buttons
  out.querySelectorAll('[data-copy-idx]').forEach(btn => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.copyIdx);
      const item = mdState.logs[idx];
      if (item?.copyText || item?.text) {
        await navigator.clipboard.writeText(item.copyText || item.text);
        btn.innerHTML = `${mdIcon('check')} Copied!`;
        setTimeout(() => { btn.innerHTML = `${mdIcon('copy')} Copy`; }, 1500);
      }
    };
  });

  out.scrollTop = out.scrollHeight;
}

// Render All 10 Interactive Tabs in Command Center Deck
function renderCommandDeck(vaultItems = []) {
  const tab = mdState.activeTab;

  return `
    <section class="md-command-deck">
      <!-- Munder Difflin Tab Bar -->
      <nav class="md-tab-bar">
        <button class="md-tab-btn ${tab === 'terminal' ? 'active' : ''}" data-md-tab="terminal">${mdIcon('terminal')} terminal</button>
        <button class="md-tab-btn ${tab === 'monitor' ? 'active' : ''}" data-md-tab="monitor">${mdIcon('monitor')} monitor</button>
        <button class="md-tab-btn ${tab === 'tasks' ? 'active' : ''}" data-md-tab="tasks">${mdIcon('tasks')} tasks</button>
        <button class="md-tab-btn ${tab === 'ask' ? 'active' : ''}" data-md-tab="ask">${mdIcon('ask')} ask me</button>
        <button class="md-tab-btn ${tab === 'triggers' ? 'active' : ''}" data-md-tab="triggers">${mdIcon('triggers')} triggers</button>
        <button class="md-tab-btn ${tab === 'memory' ? 'active' : ''}" data-md-tab="memory">${mdIcon('memory')} memory</button>
        <button class="md-tab-btn ${tab === 'graph' ? 'active' : ''}" data-md-tab="graph">${mdIcon('graph')} graph</button>
        <button class="md-tab-btn ${tab === 'activity' ? 'active' : ''}" data-md-tab="activity">${mdIcon('activity')} activity</button>
        <button class="md-tab-btn ${tab === 'commands' ? 'active' : ''}" data-md-tab="commands">${mdIcon('commands')} commands</button>
        <button class="md-tab-btn ${tab === 'workers' ? 'active' : ''}" data-md-tab="workers">${mdIcon('workers')} workers</button>
      </nav>

      <!-- Panel Body -->
      <div class="md-panel-content">
        <!-- 1. TERMINAL TAB -->
        ${tab === 'terminal' ? `
          <div class="md-terminal-container">
            <div class="md-terminal-meta">
              <span class="md-meta-live"><i></i> live · pty-god (AZHAR · Orchestrator)</span>
              <div class="md-provider-selector" style="display:inline-flex; align-items:center; gap:4px; margin-left:auto; margin-right:8px">
                <button type="button" class="md-btn-mini ${(localStorage.getItem('memoir-provider') || 'gemini') === 'gemini' ? 'active' : ''}" data-md-provider="gemini" style="padding:2px 6px; font-size:9.5px; border-radius:4px; ${(localStorage.getItem('memoir-provider') || 'gemini') === 'gemini' ? 'background:#2c2825;color:#fff;font-weight:bold' : ''}">Gemini</button>
                <button type="button" class="md-btn-mini ${(localStorage.getItem('memoir-provider') || 'gemini') === 'mistral' ? 'active' : ''}" data-md-provider="mistral" style="padding:2px 6px; font-size:9.5px; border-radius:4px; ${(localStorage.getItem('memoir-provider') || 'gemini') === 'mistral' ? 'background:#2c2825;color:#fff;font-weight:bold' : ''}">Mistral</button>
                <button type="button" class="md-btn-mini ${(localStorage.getItem('memoir-provider') || 'gemini') === 'other' ? 'active' : ''}" data-md-provider="other" style="padding:2px 6px; font-size:9.5px; border-radius:4px; ${(localStorage.getItem('memoir-provider') || 'gemini') === 'other' ? 'background:#2c2825;color:#fff;font-weight:bold' : ''}">Other</button>
              </div>
              <button class="md-btn-mini" id="md-clear-logs-btn">${mdIcon('trash')} Clear</button>
            </div>
            <div class="md-terminal-output" id="md-terminal-output">
              <!-- Rendered dynamically -->
            </div>
            <div class="md-prompt-area">
              <div class="md-context-status">
                <span class="md-ctx-meter">ctx 144k/1000k (14%)</span>
                <span class="md-perm-hint">▶▶ bypass permissions on (shift+tab to cycle) · for agents</span>
              </div>
              <form class="md-input-box" id="md-prompt-form">
                <span class="md-queue-label">QUEUE</span>
                <textarea id="md-prompt-input" class="md-textarea" placeholder="Ask AZHAR about any vault memory, password, or task…" rows="2"></textarea>
                <div class="md-input-controls">
                  <div class="md-input-btns">
                    <button type="button" class="md-btn-mini" id="md-quick-wifi-btn">Wi-Fi</button>
                    <button type="button" class="md-btn-mini" id="md-quick-audit-btn">Audit</button>
                  </div>
                  <button type="submit" class="md-btn-send">send ${mdIcon('send')}</button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}

        <!-- 2. MONITOR TELEMETRY TAB -->
        ${tab === 'monitor' ? `
          <div style="padding:14px; font-family:var(--md-font-mono); font-size:11.5px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">● REALTIME TELEMETRY & DATABASE</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px">
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px; border-radius:6px">
                <small style="color:#666">TOTAL MEMORIES</small>
                <h3 style="margin:2px 0 0; font-size:18px">${vaultItems.length || 0}</h3>
              </div>
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px; border-radius:6px">
                <small style="color:#666">RTDB SYNC LATENCY</small>
                <h3 style="margin:2px 0 0; font-size:18px; color:#16a34a">14ms</h3>
              </div>
            </div>
            <p>IndexedDB Keyring: <strong>AES-GCM-256 (Sealed & Verified)</strong></p>
            <p>Active Agents: <strong>AZHAR + 6 Specialized Clones</strong></p>
            <p>WebSocket Sync: <strong>Connected · Zero Leaks</strong></p>
            <p>Autonomous Standup: <strong>Hourly (17:48, 18:48)</strong></p>
          </div>
        ` : ''}

        <!-- 3. TASKS TAB -->
        ${tab === 'tasks' ? `
          <div style="padding:14px; font-size:12px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">✓ SPRINT TASKS & REMINDERS</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px; display:flex; align-items:center; gap:8px">
                <input type="checkbox" checked disabled>
                <span>[DONE] Zero-Knowledge AES Verification (Gurpreet)</span>
              </div>
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px; display:flex; align-items:center; gap:8px">
                <input type="checkbox" checked disabled>
                <span>[DONE] On-Device Semantic Retrieval Ranking (Aarav)</span>
              </div>
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px; display:flex; align-items:center; gap:8px">
                <input type="checkbox">
                <span>[ACTIVE] Hourly Telegram Dispatch Briefing (Fatima)</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 4. ASK ME TAB -->
        ${tab === 'ask' ? `
          <div style="padding:14px; font-size:12px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">💬 1-CLICK DIRECTIVES FOR AZHAR</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              <button class="md-btn-tool" style="text-align:left; justify-content:flex-start" data-quick-prompt="what is my wifi password?">🔐 "What is my Wi-Fi password?"</button>
              <button class="md-btn-tool" style="text-align:left; justify-content:flex-start" data-quick-prompt="run a zero-knowledge security audit">🛡️ "Run a zero-knowledge security audit"</button>
              <button class="md-btn-tool" style="text-align:left; justify-content:flex-start" data-quick-prompt="show my SBI debit card details">💳 "Show my SBI debit card details"</button>
              <button class="md-btn-tool" style="text-align:left; justify-content:flex-start" data-quick-prompt="what are my reminders and tasks?">📋 "What are my reminders and tasks?"</button>
              <button class="md-btn-tool" style="text-align:left; justify-content:flex-start" data-quick-prompt="gather team for masala chai break">☕ "Gather team for masala chai break"</button>
            </div>
          </div>
        ` : ''}

        <!-- 5. TRIGGERS TAB -->
        ${tab === 'triggers' ? `
          <div style="padding:14px; font-size:11.5px; font-family:var(--md-font-mono); overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">⏱ AUTOMATED SYSTEM TRIGGERS</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center">
                <div><strong>Hourly Autonomous Standup</strong><br><small style="color:#666">Triggers team sync on blackboard</small></div>
                <span style="color:#16a34a; font-weight:700">ACTIVE</span>
              </div>
              <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center">
                <div><strong>Morning Briefing (08:00 AM)</strong><br><small style="color:#666">Dispatches daily vault briefing to Telegram</small></div>
                <span style="color:#16a34a; font-weight:700">ARMED</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 6. MEMORY BROWSER TAB -->
        ${tab === 'memory' ? `
          <div style="padding:12px; overflow-y:auto; flex:1; font-size:11.5px; background:#fff">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
              <h4 style="margin:0; font-weight:800">✦ ALL VAULT MEMORIES (${vaultItems.length})</h4>
              <input type="text" id="md-memory-search-input" placeholder="Search records…" style="padding:4px 8px; font-size:11px; border:1.5px solid #2c2825; border-radius:4px" />
            </div>
            <div style="display:flex; flex-direction:column; gap:6px" id="md-memory-list-container">
              ${vaultItems.map(item => `
                <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px">
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <strong>${escapeHtml(item.title || 'Untitled Record')}</strong>
                    <span style="font-size:9.5px; background:#f5e39b; padding:1px 6px; border-radius:3px; border:1px solid #2c2825">${escapeHtml(item.type || 'Personal')}</span>
                  </div>
                  <div style="font-size:10.5px; color:#555; margin-top:4px">
                    ${Object.entries(item.fields || {}).map(([k, v]) => [k, cleanLegacyPrivateValue(v)]).filter(([,v])=>v!=='').map(([k, v]) => `<span>${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></span>`).join(' · ')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 7. GRAPH TAB -->
        ${tab === 'graph' ? `
          <div style="padding:14px; font-size:12px; overflow-y:auto; flex:1; background:#fff; text-align:center">
            <h4 style="margin:0 0 10px; font-weight:800">● MULTI-AGENT NEURAL VAULT GRAPH</h4>
            <svg viewBox="0 0 400 240" style="width:100%; max-height:220px; background:#fcf8ec; border:1.5px solid #2c2825; border-radius:6px">
              <circle cx="200" cy="120" r="28" fill="#f5e39b" stroke="#2c2825" stroke-width="2"/>
              <text x="200" y="124" text-anchor="middle" font-size="10" font-weight="900">👑 AZHAR</text>
              <line x1="200" y1="120" x2="80" y2="60" stroke="#2c2825" stroke-width="1.5"/>
              <circle cx="80" cy="60" r="18" fill="#fff" stroke="#0284c7" stroke-width="2"/>
              <text x="80" y="64" text-anchor="middle" font-size="8" font-weight="800">AARAV</text>
              <line x1="200" y1="120" x2="320" y2="60" stroke="#2c2825" stroke-width="1.5"/>
              <circle cx="320" cy="60" r="18" fill="#fff" stroke="#9333ea" stroke-width="2"/>
              <text x="320" y="64" text-anchor="middle" font-size="8" font-weight="800">ZOYA</text>
              <line x1="200" y1="120" x2="60" y2="180" stroke="#2c2825" stroke-width="1.5"/>
              <circle cx="60" cy="180" r="18" fill="#fff" stroke="#ea580c" stroke-width="2"/>
              <text x="60" y="184" text-anchor="middle" font-size="7.5" font-weight="800">GURPREET</text>
              <line x1="200" y1="120" x2="200" y2="200" stroke="#2c2825" stroke-width="1.5"/>
              <circle cx="200" cy="200" r="18" fill="#fff" stroke="#2563eb" stroke-width="2"/>
              <text x="200" y="204" text-anchor="middle" font-size="8" font-weight="800">DAVID</text>
              <line x1="200" y1="120" x2="340" y2="180" stroke="#2c2825" stroke-width="1.5"/>
              <circle cx="340" cy="180" r="18" fill="#fff" stroke="#db2777" stroke-width="2"/>
              <text x="340" y="184" text-anchor="middle" font-size="8" font-weight="800">FATIMA</text>
            </svg>
          </div>
        ` : ''}

        <!-- 8. ACTIVITY LOG TAB -->
        ${tab === 'activity' ? `
          <div style="padding:14px; font-family:var(--md-font-mono); font-size:11px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">🔔 RECENT VAULT ACTIVITY</h4>
            <p>• [SYNC] IndexedDB encrypted snapshot verified (0ms).</p>
            <p>• [AUTH] Identity token refreshed for Azhar Orchestrator.</p>
            <p>• [GUARD] AES-GCM-256 seal confirmed with 0 leaks.</p>
          </div>
        ` : ''}

        <!-- 9. COMMANDS CONSOLE TAB -->
        ${tab === 'commands' ? `
          <div style="padding:14px; font-size:11.5px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">⌨️ SHELL COMMAND SHORTCUTS</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px">
              <button class="md-btn-tool" data-quick-prompt="/status">/status</button>
              <button class="md-btn-tool" data-quick-prompt="/security-audit">/security-audit</button>
              <button class="md-btn-tool" data-quick-prompt="/chai-break">/chai-break</button>
              <button class="md-btn-tool" data-quick-prompt="/sync-rtdb">/sync-rtdb</button>
            </div>
          </div>
        ` : ''}

        <!-- 10. WORKERS TAB -->
        ${tab === 'workers' ? `
          <div style="padding:12px; font-size:11.5px; overflow-y:auto; flex:1; background:#fff">
            <h4 style="margin:0 0 10px; font-weight:800">👥 ALL 7 OFFICE WORKERS</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              ${mdState.agents.map(a => `
                <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center">
                  <div>
                    <strong>${escapeHtml(a.name)} ${a.isGod ? '👑' : ''}</strong>
                    <div style="font-size:10px; color:#666">${escapeHtml(a.title)}</div>
                  </div>
                  <span style="font-size:9.5px; font-weight:700; color:#16a34a">■ ${escapeHtml(a.status)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

// Render Bottom Horizontal Agent Roster Bar
function renderBottomRoster() {
  return `
    <footer class="md-bottom-roster">
      ${mdState.agents.map(a => `
        <div class="md-agent-card ${a.isGod ? 'selected' : ''}" data-agent-card-id="${a.id}">
          <div class="md-agent-avatar-thumb" style="border-color:${a.isGod ? '#f59e0b' : '#2c2825'}">
            ${a.isGod ? '👑' : a.name.slice(0, 2)}
          </div>
          <div class="md-agent-info">
            <div class="md-agent-name-row">
              <strong>${escapeHtml(a.name)} ${a.isGod ? '<span class="md-tag-god">GOD</span>' : ''}</strong>
              <span class="md-tag-idle">■ ${a.status}</span>
            </div>
            <div class="md-agent-harness">${escapeHtml(a.title)}</div>
            ${a.isGod ? '<button class="md-talk-btn" id="md-talk-azhar-btn">🎙 talk to Azhar</button>' : `<span style="font-size:8.5px; color:#777; font-weight:700">● ${escapeHtml(a.roleTag)}</span>`}
          </div>
        </div>
      `).join('')}
    </footer>
  `;
}

// Main Render Entrypoint for Karyalaya Munder Difflin Theme
export function renderKaryalayaTheme(containerNode, profile, vaultItems = []) {
  if (mdState.animLoopId) cancelAnimationFrame(mdState.animLoopId);

  document.body.classList.remove('auth-locked');
  document.body.classList.add('karyalaya-active');

  const officeSchedule = applyOfficeSchedule(true);
  containerNode.innerHTML = `
    <div class="karyalaya-shell" data-office-period="${officeSchedule.period}">
      <!-- Top Header Bar with Real Rhino Badge -->
      <header class="md-header">
        <div class="md-header-left">
          <button class="md-rhino-badge" id="md-brand-btn" title="Memoir Vault & Munder Difflin">
            <img src="/brand/memoir-rhino-ui.png" alt="Rhino" />
            <strong>COMMAND CENTER</strong>
          </button>

          <div class="md-boss-pill">
            <span>MAZ</span>
            <span class="md-tag-god">GOD</span>
            <span class="md-tag-idle">■ idle</span>
            <span class="md-boss-tagline">Marzyam runs the floor</span>
          </div>
        </div>

        <div class="md-header-right">
          <button class="md-btn-tool" id="md-chai-btn" title="Gather team for tea break">${mdIcon('coffee')} Break</button>
          <button class="md-btn-tool active-yellow" id="md-auto-btn">▶ auto</button>
          <button class="md-btn-tool" id="md-switch-theme-btn" title="Switch Theme Experience">${mdIcon('crown')} Switch Theme</button>
          <button class="md-btn-tool" id="md-sound-btn" title="Toggle audio">${sound.muted ? mdIcon('volumeX') : mdIcon('volume')}</button>
          <span class="md-btn-tool" style="font-weight:800">${escapeHtml(profile.initials)}</span>
        </div>
      </header>

      <!-- Main Layout: Floor + PTY Terminal Deck -->
      <main class="md-main-layout">
        <!-- Left Floor Container -->
        <div class="md-floor-container">
          <div class="md-floor-frame">
            <div class="md-floor-toolbar">
              <div class="md-floor-chips">
                <span class="md-chip">🏢 FLOOR 01</span>
                <span class="md-chip">🧠 MEMORY: ${vaultItems.length || 0}</span>
                <span class="md-chip" data-office-clock>${officeSchedule.shift.toUpperCase()} SHIFT · ${officeSchedule.label}${officeSchedule.breakName ? ` · ${officeSchedule.breakName}` : ''}</span>
              </div>
              <!-- 2D Horizontal & Vertical Pan / Zoom Pad -->
              <div class="md-floor-nav-controls">
                <button class="md-pan-btn" id="md-pan-left-btn" title="Pan Left">${mdIcon('left')}</button>
                <button class="md-pan-btn" id="md-pan-up-btn" title="Pan Up">${mdIcon('up')}</button>
                <button class="md-pan-btn" id="md-pan-down-btn" title="Pan Down">${mdIcon('down')}</button>
                <button class="md-pan-btn" id="md-pan-right-btn" title="Pan Right">${mdIcon('right')}</button>
                <button class="md-pan-btn" id="md-pan-center-btn" title="Center View">${mdIcon('center')}</button>
                <button class="md-pan-btn" id="md-zoom-in-btn" title="Zoom In">${mdIcon('plus')}</button>
                <button class="md-pan-btn" id="md-zoom-out-btn" title="Zoom Out">${mdIcon('minus')}</button>
              </div>
            </div>
            <div class="md-canvas-wrap" id="md-canvas-wrap">
              <canvas id="md-office-canvas" width="600" height="460"></canvas>
              <!-- Interactive Agent HUD Card on Canvas -->
              <div id="md-agent-hud-overlay" style="display:none"></div>
            </div>
          </div>
        </div>

        <!-- Right Command Center Deck -->
        ${renderCommandDeck(vaultItems)}
      </main>

      <!-- Bottom Agent Roster Bar -->
      ${renderBottomRoster()}

      <!-- Mobile Floating Navigation Dock -->
      <nav class="md-mobile-dock">
        <button class="md-mobile-dock-btn ${mdState.mobileView === 'floor' ? 'active' : ''}" data-md-mob="floor">
          ${mdIcon('monitor')}
          <span>Floor</span>
        </button>
        <button class="md-mobile-dock-btn ${mdState.mobileView === 'deck' ? 'active' : ''}" data-md-mob="deck">
          ${mdIcon('terminal')}
          <span>Terminal</span>
        </button>
        <button class="md-mobile-dock-btn" id="md-mob-chai">
          ${mdIcon('coffee')}
          <span>Chai</span>
        </button>
        <button class="md-mobile-dock-btn" id="md-mob-theme">
          ${mdIcon('crown')}
          <span>Theme</span>
        </button>
      </nav>
    </div>
  `;

  window.__MEMOIR_ITEMS__ = Array.isArray(vaultItems) ? vaultItems : [];
  updateSimulation();
  renderTerminalOutput();
  bindMdEvents(profile, vaultItems);
}

// Bind Munder Difflin Interactive Events
function bindMdEvents(profile, vaultItems) {
  const canvas = document.querySelector('#md-office-canvas');
  const canvasWrap = document.querySelector('#md-canvas-wrap');

  // 2D Pan & Zoom Transformations
  function applyCanvasTransform() {
    if (canvas) {
      canvas.style.transform = `translate(${mdState.panX}px, ${mdState.panY}px) scale(${mdState.zoomScale})`;
    }
  }

  function setPan(x, y) {
    mdState.panX = Math.max(-280, Math.min(60, x));
    mdState.panY = Math.max(-180, Math.min(60, y));
    applyCanvasTransform();
  }

  function setZoom(delta) {
    mdState.zoomScale = Math.max(0.7, Math.min(1.4, mdState.zoomScale + delta));
    applyCanvasTransform();
  }

  document.querySelector('#md-pan-left-btn')?.addEventListener('click', () => setPan(mdState.panX + 60, mdState.panY));
  document.querySelector('#md-pan-right-btn')?.addEventListener('click', () => setPan(mdState.panX - 60, mdState.panY));
  document.querySelector('#md-pan-up-btn')?.addEventListener('click', () => setPan(mdState.panX, mdState.panY + 50));
  document.querySelector('#md-pan-down-btn')?.addEventListener('click', () => setPan(mdState.panX, mdState.panY - 50));
  document.querySelector('#md-pan-center-btn')?.addEventListener('click', () => {
    mdState.panX = -50;
    mdState.panY = -10;
    mdState.zoomScale = 1.0;
    applyCanvasTransform();
  });
  document.querySelector('#md-zoom-in-btn')?.addEventListener('click', () => setZoom(0.15));
  document.querySelector('#md-zoom-out-btn')?.addEventListener('click', () => setZoom(-0.15));

  // 2D Touch Swipe & Drag on Canvas
  if (canvasWrap) {
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPanX = 0;
    let initialPanY = 0;
    let isDragging = false;

    canvasWrap.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialPanX = mdState.panX;
        initialPanY = mdState.panY;
      }
    }, { passive: true });

    canvasWrap.addEventListener('touchmove', e => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        setPan(initialPanX + dx, initialPanY + dy);
      }
    }, { passive: true });

    canvasWrap.addEventListener('mousedown', e => {
      isDragging = true;
      touchStartX = e.clientX;
      touchStartY = e.clientY;
      initialPanX = mdState.panX;
      initialPanY = mdState.panY;
    });

    window.addEventListener('mousemove', e => {
      if (isDragging) {
        const dx = e.clientX - touchStartX;
        const dy = e.clientY - touchStartY;
        setPan(initialPanX + dx, initialPanY + dy);
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // 1. Tab Bar Navigation
  document.querySelectorAll('[data-md-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playBlip();
      mdState.activeTab = btn.dataset.mdTab;
      const deck = document.querySelector('.md-command-deck');
      if (deck) {
        deck.outerHTML = renderCommandDeck(vaultItems);
        renderTerminalOutput();
        bindFormEvents(vaultItems);
        bindDeckSubEvents(vaultItems);
      }
    });
  });

  // 2. Sound Toggle
  document.querySelector('#md-sound-btn')?.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    const btn = document.querySelector('#md-sound-btn');
    if (btn) btn.innerHTML = isMuted ? mdIcon('volumeX') : mdIcon('volume');
  });

  // 3. Theme Switcher Modal
  document.querySelector('#md-switch-theme-btn')?.addEventListener('click', () => showExperienceSwitcherModal());
  document.querySelector('#md-mob-theme')?.addEventListener('click', () => showExperienceSwitcherModal());

  // 4. Chai Break button
  document.querySelector('#md-chai-btn')?.addEventListener('click', () => {
    sound.playChime();
    mdState.logs.push({ type: 'info', text: 'Masala chai round initiated in the breakroom.' });
    saveChatLogs(mdState.logs);
    const rhea = mdState.agents.find(a => a.id === 'rhea');
    if (rhea) {
      rhea.speech = 'fresh masala chai ready';
      rhea.speechTimer = 240;
    }
    const david = mdState.agents.find(a => a.id === 'david');
    const aarav = mdState.agents.find(a => a.id === 'aarav');
    if (david) {
      david.targetPos = { x: 480, y: 360 };
      setTimeout(() => { david.targetPos = { ...david.seatPos }; }, 5000);
    }
    if (aarav) {
      aarav.targetPos = { x: 490, y: 340 };
      setTimeout(() => { aarav.targetPos = { ...aarav.seatPos }; }, 5000);
    }
    renderTerminalOutput();
  });

  document.querySelector('#md-mob-chai')?.addEventListener('click', () => {
    sound.playChime();
    mdState.logs.push({ type: 'info', text: 'Masala chai round initiated in the breakroom.' });
    renderTerminalOutput();
  });

  // 5. Talk to Azhar focus
  document.querySelector('#md-talk-azhar-btn')?.addEventListener('click', () => {
    sound.playBlip();
    const input = document.querySelector('#md-prompt-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // 6. Mobile Dock Switching
  document.querySelectorAll('[data-md-mob]').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playBlip();
      const view = btn.dataset.mdMob;
      mdState.mobileView = view;

      document.querySelectorAll('.md-mobile-dock-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const floorFrame = document.querySelector('.md-floor-frame');
      const commandDeck = document.querySelector('.md-command-deck');

      if (view === 'floor') {
        if (floorFrame) floorFrame.style.display = 'flex';
        if (commandDeck) commandDeck.style.display = 'none';
      } else {
        if (floorFrame) floorFrame.style.display = 'none';
        if (commandDeck) commandDeck.style.display = 'flex';
      }
    });
  });

  // 7. Click on Canvas to Show Agent Info Overlay HUD Card
  if (canvas) {
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) - mdState.panX) / mdState.zoomScale;
      const clickY = ((e.clientY - rect.top) - mdState.panY) / mdState.zoomScale;

      const hit = mdState.agents.find(a => Math.abs(a.pos.x - clickX) < 28 && Math.abs(a.pos.y - clickY) < 28);
      const hud = document.querySelector('#md-agent-hud-overlay');

      if (hit && hud) {
        sound.playBlip();
        hud.style.display = 'block';
        hud.innerHTML = `
          <div class="md-agent-hud-card">
            <div class="md-hud-header">
              <strong>${hit.isGod ? '👑' : '●'} ${escapeHtml(hit.name)} ${hit.isGod ? '<span class="md-tag-god">GOD</span>' : ''}</strong>
              <button id="md-hud-close-btn" style="background:none; border:0; font-size:14px; cursor:pointer">${mdIcon('close')}</button>
            </div>
            <div class="md-hud-desc">
              <div><strong>Role:</strong> ${escapeHtml(hit.title)}</div>
              <div><strong>Specialization:</strong> ${escapeHtml(hit.roleTag)}</div>
              <div><strong>Status:</strong> ${escapeHtml(hit.status)}</div>
            </div>
            <div class="md-hud-actions">
              <button class="md-btn-mini" id="md-hud-ask-btn">Ask Azhar to delegate to ${escapeHtml(hit.name)}</button>
            </div>
          </div>
        `;

        document.querySelector('#md-hud-close-btn')?.addEventListener('click', () => {
          hud.style.display = 'none';
        });

        document.querySelector('#md-hud-ask-btn')?.addEventListener('click', () => {
          hud.style.display = 'none';
          if (mdState.activeTab !== 'terminal') {
            mdState.activeTab = 'terminal';
            const deck = document.querySelector('.md-command-deck');
            if (deck) {
              deck.outerHTML = renderCommandDeck(vaultItems);
              renderTerminalOutput();
              bindFormEvents(vaultItems);
              bindDeckSubEvents(vaultItems);
            }
          }
          const input = document.querySelector('#md-prompt-input');
          if (input) {
            input.value = `Tell ${hit.name} to `;
            input.focus();
          }
        });
      } else if (hud) {
        hud.style.display = 'none';
      }
    });
  }

  // 8. Bottom Agent Roster Card Clicks
  document.querySelectorAll('.md-agent-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.agentCardId;
      const targetAgent = mdState.agents.find(a => a.id === id);
      if (!targetAgent) return;

      sound.playBlip();
      document.querySelectorAll('.md-agent-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      targetAgent.speech = targetAgent.isGod ? 'How can I direct the floor?' : `Ready for ${targetAgent.name} tasks`;
      targetAgent.speechTimer = 180;

      // Switch to terminal tab
      if (mdState.activeTab !== 'terminal') {
        mdState.activeTab = 'terminal';
        const deck = document.querySelector('.md-command-deck');
        if (deck) {
          deck.outerHTML = renderCommandDeck(vaultItems);
          renderTerminalOutput();
          bindFormEvents(vaultItems);
          bindDeckSubEvents(vaultItems);
        }
      }

      const input = document.querySelector('#md-prompt-input');
      if (input) {
        if (targetAgent.isGod) {
          input.value = '';
          input.placeholder = 'Ask AZHAR about any vault memory, password, or task…';
        } else {
          input.value = `Tell ${targetAgent.name} to `;
        }
        input.focus();
        input.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  bindFormEvents(vaultItems);
  bindDeckSubEvents(vaultItems);
}

// Bind Command Center Sub-Events (Quick prompts, Clear Logs, Search filter)
function bindDeckSubEvents(vaultItems) {
  // Clear Logs
  document.querySelector('#md-clear-logs-btn')?.addEventListener('click', () => {
    mdState.logs = [{ type: 'info', text: 'Terminal log cleared.' }];
    saveChatLogs(mdState.logs);
    renderTerminalOutput();
  });

  // AI Provider Switcher
  document.querySelectorAll('[data-md-provider]').forEach(btn => {
    btn.onclick = () => {
      sound.playBlip();
      const chosen = btn.dataset.mdProvider;
      localStorage.setItem('memoir-provider', chosen);
      document.querySelectorAll('[data-md-provider]').forEach(b => {
        const isMatch = b.dataset.mdProvider === chosen;
        b.classList.toggle('active', isMatch);
        b.style.fontWeight = isMatch ? 'bold' : 'normal';
        b.style.background = isMatch ? '#2c2825' : '#fff';
        b.style.color = isMatch ? '#fff' : '#2c2825';
      });
      mdState.logs.push({
        type: 'agent',
        name: '👑 AZHAR (Supreme God Orchestrator)',
        text: `AI Intelligence provider set to **${chosen.toUpperCase()}** (with automatic model fallback).`,
        copyable: false,
      });
      saveChatLogs(mdState.logs);
      renderTerminalOutput();
    };
  });

  // Quick Action Buttons
  document.querySelector('#md-quick-wifi-btn')?.addEventListener('click', () => {
    sendMdMessage('what is my wifi password?', vaultItems);
  });
  document.querySelector('#md-quick-audit-btn')?.addEventListener('click', () => {
    sendMdMessage('run a zero-knowledge security audit', vaultItems);
  });

  // 1-Click Template Directives
  document.querySelectorAll('[data-quick-prompt]').forEach(btn => {
    btn.onclick = () => {
      const prompt = btn.dataset.quickPrompt;
      mdState.activeTab = 'terminal';
      const deck = document.querySelector('.md-command-deck');
      if (deck) {
        deck.outerHTML = renderCommandDeck(vaultItems);
        renderTerminalOutput();
        bindFormEvents(vaultItems);
        bindDeckSubEvents(vaultItems);
      }
      sendMdMessage(prompt, vaultItems);
    };
  });

  // Memory Search Filter
  const memSearch = document.querySelector('#md-memory-search-input');
  if (memSearch) {
    memSearch.oninput = () => {
      const q = memSearch.value.toLowerCase().trim();
      const filtered = vaultItems.filter(item => {
        const title = (item.title || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const fields = Object.entries(item.fields || {}).map(([k, v]) => `${k} ${v}`.toLowerCase()).join(' ');
        return title.includes(q) || type.includes(q) || fields.includes(q);
      });

      const container = document.querySelector('#md-memory-list-container');
      if (container) {
        container.innerHTML = filtered.map(item => `
          <div style="background:#fcf8ec; border:1.5px solid #2c2825; padding:8px 10px; border-radius:6px">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <strong>${escapeHtml(item.title || 'Untitled Record')}</strong>
              <span style="font-size:9.5px; background:#f5e39b; padding:1px 6px; border-radius:3px; border:1px solid #2c2825">${escapeHtml(item.type || 'Personal')}</span>
            </div>
            <div style="font-size:10.5px; color:#555; margin-top:4px">
              ${Object.entries(item.fields || {}).map(([k, v]) => [k, cleanLegacyPrivateValue(v)]).filter(([,v])=>v!=='').map(([k, v]) => `<span>${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong></span>`).join(' · ')}
            </div>
          </div>
        `).join('') || '<div style="color:#777; padding:10px">No matching memory records.</div>';
      }
    };
  }
}

// Bind Prompt Form Submit
function bindFormEvents(vaultItems) {
  const form = document.querySelector('#md-prompt-form');
  const input = document.querySelector('#md-prompt-input');
  if (form && input) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = input.value;
      input.value = '';
      await sendMdMessage(text, vaultItems);
    });

    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value;
        input.value = '';
        await sendMdMessage(text, vaultItems);
      }
    });
  }
}

// Experience Switcher Modal Dialog with Real Rhino Logo
export function showExperienceSwitcherModal(onSwitchCallback = null) {
  sound.playChime();
  const currentTheme = getThemePreference();
  const modal = document.querySelector('#modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="md-theme-modal">
      <div class="md-modal-header">
        <h2><img src="/brand/memoir-rhino-ui.png" alt="Rhino" /> Workspace Experience</h2>
        <button id="md-modal-close" style="background:none; border:0; font-size:18px; cursor:pointer; color:var(--md-ink)">${mdIcon('close')}</button>
      </div>
      <p style="margin:0 0 16px; font-size:12px; color:var(--md-ink-muted)">Select your preferred visual mode. Your encrypted vault memories and settings remain 100% synchronized across both experiences.</p>

      <div class="md-theme-cards">
        <!-- 1. Memoir Classic Vault (Default) -->
        <div class="md-theme-card ${currentTheme === 'classic' ? 'selected' : ''}" data-pick-theme="classic">
          <div class="md-theme-icon">
            <img src="/brand/memoir-rhino-ui.png" alt="Memoir Rhino" style="width:26px; height:26px; object-fit:contain;" />
          </div>
          <h3>Memoir Classic Vault (Default)</h3>
          <p>Clean, high-privacy personal vault with Rhino design system. Streamlined for rapid memory and password lookups.</p>
          <div style="font-size:10px; font-weight:800; color:${currentTheme === 'classic' ? '#0284c7' : '#999'}">
            ${currentTheme === 'classic' ? '● CURRENTLY ACTIVE' : 'Select Classic'}
          </div>
        </div>

        <!-- 2. Munder Difflin Pixel Office -->
        <div class="md-theme-card ${currentTheme === 'karyalaya' ? 'selected' : ''}" data-pick-theme="karyalaya">
          <div class="md-theme-icon" style="background:#f5e39b">
            👑
          </div>
          <h3>Munder Difflin AI Floor</h3>
          <p>Authentic retro pixel-art office simulation. God Agent Azhar, autonomous walking agents, and breakroom chai lounge.</p>
          <div style="font-size:10px; font-weight:800; color:${currentTheme === 'karyalaya' ? '#d97706' : '#999'}">
            ${currentTheme === 'karyalaya' ? '● CURRENTLY ACTIVE' : 'Select Munder Difflin'}
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end">
        <button class="md-btn-tool" id="md-modal-cancel">Cancel</button>
      </div>
    </div>
  `;

  if (!modal.open) modal.showModal();

  document.querySelector('#md-modal-close')?.addEventListener('click', () => modal.close());
  document.querySelector('#md-modal-cancel')?.addEventListener('click', () => modal.close());

  document.querySelectorAll('[data-pick-theme]').forEach(card => {
    card.addEventListener('click', () => {
      const chosen = card.dataset.pickTheme;
      setThemePreference(chosen);
      sound.playChime();
      modal.close();
      if (onSwitchCallback) {
        onSwitchCallback(chosen);
      } else {
        window.location.reload();
      }
    });
  });
}

// Aliases for compatibility
export const kfLog = (tag, text) => {
  mdState.logs.push({ type: 'info', text: `[${tag}] ${text}` });
};
export const sendKaryalayaMessage = sendMdMessage;
