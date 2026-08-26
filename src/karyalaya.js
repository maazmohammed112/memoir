import DOMPurify from 'dompurify';
import { marked } from 'marked';

const THEME_PREF_KEY = 'memoir_theme_preference_v2';
const THEME_WELCOME_KEY = 'memoir_theme_welcome_v1';
let liveItems = [];
let liveStatus = 'loading';
let activeProfile = { name: 'Owner', initials: 'O' };
let assistantHandler = null;
let themeOfferScheduled = false;

export const getThemePreference = () => localStorage.getItem(THEME_PREF_KEY) || 'classic';
export const setThemePreference = theme => localStorage.setItem(THEME_PREF_KEY, theme === 'karyalaya' ? 'karyalaya' : 'classic');
export const configureKaryalaya = ({ ask } = {}) => { assistantHandler = typeof ask === 'function' ? ask : null; };

const AGENT_DEFS = [
  ['azhar', 'Azhar', 'Lead Orchestrator', 'Coordinates every request and returns one clear answer.', '#345e91', '#f0bb91', '#292124', [120, 120]],
  ['aarav', 'Aarav', 'Vault Intelligence', 'Finds saved records and resolves exact fields on this device.', '#36779c', '#c98259', '#1e1717', [214, 304]],
  ['zoya', 'Zoya', 'Realtime Systems', 'Monitors RTDB sync and Firestore recovery.', '#8a568d', '#d5a07b', '#4a2926', [306, 304]],
  ['gurpreet', 'Gurpreet', 'Security Review', 'Reviews access, encryption, and sensitive output.', '#795046', '#b66e45', '#19191b', [398, 304]],
  ['david', 'David', 'Planner Operations', 'Coordinates reminders, todos, birthdays, and recurring work.', '#b26742', '#e0ad88', '#4c2b1e', [490, 304]],
  ['fatima', 'Fatima', 'Communications', 'Coordinates Telegram delivery and briefings.', '#467563', '#9c5f41', '#201917', [582, 304]],
  ['rhea', 'Rhea', 'Experience Quality', 'Checks clarity, layout, and response presentation.', '#985366', '#e1aa82', '#6d3a29', [674, 304]],
];

const AGENTS = AGENT_DEFS.map(([id, name, title, role, shirt, skin, hair, seat]) => ({
  id, name, title, role, shirt, skin, hair, seat, pos: [...seat], target: [...seat], status: 'idle',
  activity: 'at desk', nextRoutineAt: performance.now() + 4000 + Math.random() * 8000,
}));
const BREAK_SPOTS = [[592, 376], [630, 376], [668, 376], [696, 410], [646, 422], [604, 422], [570, 390]];
const IDLE_SPOTS = [
  { pos: [662, 350], label: 'getting coffee' }, { pos: [710, 350], label: 'choosing a snack' },
  { pos: [558, 410], label: 'getting water' }, { pos: [638, 406], label: 'taking a break' },
  { pos: [354, 198], label: 'checking the board' },
];
const state = {
  activeSection: 'overview', panX: 0, panY: 0, zoom: 1, selectedAgent: 'azhar', busy: false,
  animation: 0, breakMode: false,
  logs: [{ role: 'assistant', title: 'Azhar is ready', markdown: 'Ask about your vault, reminders, documents, audio memories, or request a change. I will coordinate the right specialist.' }],
};
marked.setOptions({ gfm: true, breaks: true });

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const safeMarkdown = (value = '') => DOMPurify.sanitize(marked.parse(String(value || '')), { USE_PROFILES: { html: true } });
const currentItems = () => Array.isArray(liveItems) ? liveItems : [];
const category = item => String(item?.type || item?.kind || 'Personal');
const isSensitive = label => /password|passcode|pin|cvv|secret|token|card number|account number|imei|eid/i.test(label || '');
const maskValue = value => { const text = String(value ?? ''); return text.length <= 4 ? '••••' : `${'•'.repeat(Math.min(8, text.length - 4))} ${text.slice(-4)}`; };
const statusText = () => liveStatus === 'synced' ? 'Realtime synced' : liveStatus === 'offline' ? 'Offline · changes queued' : liveStatus === 'error' ? 'Recovery available' : 'Connecting securely';

function recordCounts() {
  return currentItems().reduce((acc, item) => { const key = category(item); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
}
function delegatedAgent(text) {
  const q = String(text).toLowerCase();
  if (/security|audit|encrypt|password health|weak|leak/.test(q)) return AGENTS[3];
  if (/todo|task|remind|agenda|birthday|schedule|due/.test(q)) return AGENTS[4];
  if (/telegram|brief|notify|message|dispatch/.test(q)) return AGENTS[5];
  if (/sync|database|rtdb|firestore|offline|cloud/.test(q)) return AGENTS[2];
  if (/design|layout|screen|ui|experience/.test(q)) return AGENTS[6];
  return AGENTS[1];
}

function rect(ctx, x, y, w, h, fill, stroke = null, line = 1) {
  ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(w) - 1, Math.round(h) - 1); }
}
function pixelText(ctx, text, x, y, size = 10, color = '#241c26', align = 'left') {
  ctx.fillStyle = color; ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Consolas, monospace`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(text, Math.round(x), Math.round(y));
}
function drawTiles(ctx, x, y, w, h) {
  rect(ctx, x, y, w, h, '#8ea7a0'); ctx.strokeStyle = '#78958d'; ctx.lineWidth = 1;
  for (let gx = x; gx <= x + w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  for (let gy = y; gy <= y + h; gy += 32) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(50,83,75,.22)';
  for (let gx = x + 14; gx < x + w; gx += 32) for (let gy = y + 14; gy < y + h; gy += 32) ctx.fillRect(gx, gy, 4, 4);
}
function drawWall(ctx, x, y, w, h) { rect(ctx, x, y, w, h, '#f5f1ea', '#2a232c', 3); rect(ctx, x, y, w, 5, '#fffdf6'); }
function drawWindow(ctx, x, y) { rect(ctx, x, y, 38, 23, '#51636b', '#29252e', 2); rect(ctx, x + 4, y + 4, 13, 13, '#a8c6d2'); rect(ctx, x + 21, y + 4, 13, 13, '#a8c6d2'); rect(ctx, x + 2, y + 20, 34, 4, '#ded8ce'); }
function drawPlant(ctx, x, y) { rect(ctx, x + 4, y + 12, 10, 9, '#9c6a49', '#392f2d'); rect(ctx, x + 8, y + 3, 3, 11, '#315f3f'); rect(ctx, x + 2, y + 3, 7, 4, '#4a8556'); rect(ctx, x + 10, y, 7, 5, '#4a8556'); }
function drawDesk(ctx, x, y) {
  rect(ctx, x, y, 64, 25, '#936e4f', '#3d302b', 2); rect(ctx, x + 5, y + 5, 54, 5, '#b78f69');
  rect(ctx, x + 22, y - 14, 25, 17, '#403b46', '#241f27'); rect(ctx, x + 25, y - 11, 19, 10, '#6d8e9c');
  rect(ctx, x + 32, y + 3, 4, 7, '#342d31'); rect(ctx, x + 26, y + 28, 13, 10, '#9b7658', '#3d302b'); rect(ctx, x + 30, y + 37, 5, 5, '#4e4039');
}
function drawMeetingTable(ctx, x, y) {
  rect(ctx, x, y, 120, 48, '#a77854', '#44322d', 2); rect(ctx, x + 7, y + 7, 106, 34, '#b98e66');
  [[8,-13],[40,-13],[72,-13],[104,-13],[8,51],[40,51],[72,51],[104,51]].forEach(([dx,dy]) => rect(ctx, x + dx, y + dy, 15, 10, '#8f5570', '#3c2f35'));
}
function drawCoffeeArea(ctx) {
  rect(ctx, 548, 282, 188, 164, '#94aaa2', '#29232c', 3); drawTiles(ctx, 550, 284, 184, 160);
  rect(ctx, 688, 300, 34, 62, '#b8d58f', '#29232c', 2); rect(ctx, 693, 306, 24, 22, '#38505c'); rect(ctx, 696, 311, 18, 4, '#e1d976'); pixelText(ctx, 'SNACK', 705, 333, 7, '#31452d', 'center');
  rect(ctx, 646, 302, 34, 40, '#d9dedc', '#29232c', 2); rect(ctx, 651, 309, 24, 13, '#4c5960'); rect(ctx, 657, 325, 12, 6, '#372a2e');
  rect(ctx, 554, 300, 70, 24, '#867060', '#29232c', 2); rect(ctx, 561, 306, 12, 9, '#d7dbde', '#3c3535'); rect(ctx, 578, 306, 12, 9, '#d7dbde', '#3c3535'); rect(ctx, 598, 303, 18, 16, '#5b5454', '#2c2628'); pixelText(ctx, 'COFFEE', 589, 286, 7, '#342b31', 'center');
  rect(ctx, 562, 372, 68, 26, '#a97b58', '#3e312e', 2); rect(ctx, 646, 388, 68, 26, '#a97b58', '#3e312e', 2);
  [[572,402],[609,402],[657,418],[694,418]].forEach(([x,y]) => rect(ctx, x, y, 12, 9, '#906f55', '#3d302b')); drawPlant(ctx, 716, 422);
}
function drawOffice(ctx) {
  rect(ctx, 0, 0, 768, 480, '#19121f'); rect(ctx, 12, 12, 744, 456, '#f9f0dd', '#2a202a', 4); drawTiles(ctx, 28, 72, 712, 376); drawWall(ctx, 28, 28, 712, 44);
  [72,284,344,662].forEach(x => drawWindow(ctx, x, 42)); drawPlant(ctx, 112, 48); drawPlant(ctx, 430, 48);
  [[28,146,168,16],[196,72,16,134],[500,72,16,150],[516,146,224,16],[28,226,172,16],[516,222,224,16],[532,238,16,210],[28,340,160,16]].forEach(args => drawWall(ctx, ...args));
  rect(ctx, 78, 94, 70, 34, '#956e50', '#3d302b', 2); rect(ctx, 98, 77, 27, 19, '#403b46', '#241f27'); rect(ctx, 102, 81, 19, 11, '#6d8e9c'); rect(ctx, 103, 131, 16, 11, '#8c6c54', '#3d302b'); pixelText(ctx, 'AZHAR', 113, 166, 8, '#51434c', 'center');
  drawMeetingTable(ctx, 275, 96); drawDesk(ctx, 555, 100); drawDesk(ctx, 654, 100);
  [[70,278],[162,278],[254,278],[346,278],[438,278],[70,388],[162,388],[254,388],[346,388],[438,388]].forEach(([x,y]) => drawDesk(ctx,x,y));
  rect(ctx, 250, 185, 190, 30, '#eee9df', '#42383d', 2); rect(ctx, 266, 191, 42, 18, '#d9869f', '#4b3a43'); rect(ctx, 320, 191, 42, 18, '#e3c35a', '#4b3a43'); rect(ctx, 374, 191, 42, 18, '#76b78c', '#4b3a43');
  drawCoffeeArea(ctx); drawPlant(ctx, 34, 420); drawPlant(ctx, 512, 418); pixelText(ctx, 'MEMOIR OPERATIONS', 42, 246, 8, '#48625a'); pixelText(ctx, 'BREAK ROOM', 557, 246, 8, '#48625a');
}
function drawAgent(ctx, agent, now) {
  const x = Math.round(agent.pos[0]), y = Math.round(agent.pos[1]);
  const moving = Math.hypot(agent.target[0] - x, agent.target[1] - y) > 2; const step = moving && Math.floor(now / 180) % 2 ? 1 : 0;
  if (state.selectedAgent === agent.id) { ctx.fillStyle = 'rgba(255,236,116,.38)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 17, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  rect(ctx,x-7,y-21,14,10,agent.hair,'#231d22'); rect(ctx,x-6,y-17,12,10,agent.skin,'#5b3a2e'); rect(ctx,x-4,y-14,2,2,'#19151a'); rect(ctx,x+2,y-14,2,2,'#19151a');
  rect(ctx,x-7,y-7,14,16,agent.shirt,'#2d252b'); rect(ctx,x-10,y-4,3,12,agent.skin,'#5b3a2e'); rect(ctx,x+7,y-4,3,12,agent.skin,'#5b3a2e'); rect(ctx,x-6,y+9,5,9+step,'#303741','#211b21'); rect(ctx,x+1,y+9+step,5,9-step,'#303741','#211b21');
  if (agent.activity !== 'at desk') { ctx.font = '700 8px ui-monospace, monospace'; const width = Math.max(42, ctx.measureText(agent.activity).width + 12); rect(ctx,x-width/2,y-39,width,14,'#fffdf5','#30262d'); pixelText(ctx,agent.activity,x,y-36,7,'#2c2429','center'); }
}
function drawFloor(canvas, now = performance.now()) { if (!canvas) return; const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; drawOffice(ctx); [...AGENTS].sort((a,b)=>a.pos[1]-b.pos[1]).forEach(agent => drawAgent(ctx,agent,now)); }
function setAgentTarget(agent, target, activity, status='idle') { agent.target=[...target]; agent.activity=activity; agent.status=status; updateAgentUi(); }
function sendAgentHome(agent) { setAgentTarget(agent, agent.seat, 'returning to desk'); agent.nextRoutineAt=performance.now()+7000+Math.random()*12000; }
function advanceIdleRoutines(now) {
  if (state.busy || state.breakMode) return;
  AGENTS.slice(1).forEach(agent => { const d=Math.hypot(agent.target[0]-agent.pos[0],agent.target[1]-agent.pos[1]); if(d>3||now<agent.nextRoutineAt)return; if(agent.activity==='at desk'||agent.activity==='returning to desk'){const routine=IDLE_SPOTS[Math.floor(Math.random()*IDLE_SPOTS.length)];setAgentTarget(agent,routine.pos,routine.label,'away');agent.nextRoutineAt=now+6500+Math.random()*5000;}else sendAgentHome(agent); });
}
function animateFloor(now=performance.now()) {
  advanceIdleRoutines(now); AGENTS.forEach(agent=>{const dx=agent.target[0]-agent.pos[0],dy=agent.target[1]-agent.pos[1],d=Math.hypot(dx,dy);if(d>1.2){const speed=Math.min(1.25,d);agent.pos[0]+=dx/d*speed;agent.pos[1]+=dy/d*speed;}else if(agent.activity==='returning to desk')agent.activity='at desk';}); drawFloor(document.querySelector('#md-office-canvas'),now); state.animation=requestAnimationFrame(animateFloor);
}

function paintPortrait(canvas, agent, scale=3) {
  if(!canvas||!agent)return; const ctx=canvas.getContext('2d'); canvas.width=18*scale;canvas.height=28*scale;ctx.imageSmoothingEnabled=false;ctx.scale(scale,scale);
  rect(ctx,4,1,10,8,agent.hair);rect(ctx,3,4,12,4,agent.hair);rect(ctx,4,6,10,8,agent.skin);rect(ctx,6,9,2,2,'#1e171a');rect(ctx,11,9,2,2,'#1e171a');rect(ctx,7,13,5,1,'#7b4a42');rect(ctx,3,15,12,11,agent.shirt);rect(ctx,1,17,3,8,agent.skin);rect(ctx,14,17,3,8,agent.skin);rect(ctx,5,26,4,2,'#303741');rect(ctx,10,26,4,2,'#303741');
}
function paintAllPortraits(root=document){root.querySelectorAll('canvas[data-agent-portrait]').forEach(canvas=>paintPortrait(canvas,AGENTS.find(a=>a.id===canvas.dataset.agentPortrait)));}
const renderPortrait=(agent,cls='')=>`<canvas class="md-pixel-portrait ${cls}" data-agent-portrait="${agent.id}" aria-label="${escapeHtml(agent.name)} pixel portrait"></canvas>`;

function renderMessage(message,index){
  if(message.role==='user')return `<article class="md-message user"><p>${escapeHtml(message.text)}</p></article>`;
  const fields=Array.isArray(message.fields)?message.fields:[];
  return `<article class="md-message assistant"><div class="md-message-source">${renderPortrait(AGENTS[0])}<span><strong>Azhar</strong><small>Coordinated response</small></span></div>${message.title?`<h3>${escapeHtml(message.title)}</h3>`:''}${message.markdown?`<div class="md-markdown">${safeMarkdown(message.markdown)}</div>`:''}${fields.length?`<div class="md-field-table">${fields.map((field,fi)=>{const sensitive=isSensitive(field.label);return `<div class="md-field-row"><span>${escapeHtml(field.label)}</span><strong data-field-value>${escapeHtml(sensitive?maskValue(field.value):field.value)}</strong><span>${sensitive?`<button data-reveal-field="${index}:${fi}">Reveal</button>`:''}<button data-copy-field="${index}:${fi}">Copy</button></span></div>`;}).join('')}</div>`:''}</article>`;
}
function renderChat(){return `<section class="md-chat-panel" id="md-chat-panel"><header class="md-chat-head"><div class="md-message-source">${renderPortrait(AGENTS[0])}<span><strong>Azhar</strong><small>Lead orchestrator · your only contact point</small></span></div><span class="md-private-pill">On-device resolution</span></header><div class="md-chat-stream" id="md-chat-stream">${state.logs.map(renderMessage).join('')}</div><form class="md-compose" id="md-prompt-form"><textarea id="md-prompt-input" rows="1" placeholder="Ask Azhar about your vault or request a change…"></textarea><button type="submit" ${state.busy?'disabled':''}>${state.busy?'Working…':'Send'}</button></form></section>`;}
function renderRoster(){return `<section class="md-roster-shell"><div class="md-roster-heading"><span>Agent floor</span><small>Azhar coordinates every specialist</small></div><div class="md-bottom-roster">${AGENTS.map(agent=>`<button class="md-agent-card ${agent.id===state.selectedAgent?'selected':''}" data-agent-info="${agent.id}">${renderPortrait(agent,'md-roster-avatar')}<span><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.title)}</small></span><i data-agent-status="${agent.id}" data-state="${agent.status}">${agent.status}</i></button>`).join('')}</div></section>`;}
function renderOverview(){const c=recordCounts();return `<section class="md-section-panel"><div class="md-section-heading"><div><small>LIVE WORKSPACE</small><h2>Operational overview</h2></div><span data-sync-state>${statusText()}</span></div><div class="md-metric-grid"><article><strong data-live-count>${currentItems().length}</strong><small>Vault records</small></article><article><strong>${c.Reminder||0}</strong><small>Reminders</small></article><article><strong>${c.Todo||0}</strong><small>Todo lists</small></article><article><strong>${c.Audio||0}</strong><small>Audio memories</small></article></div><div class="md-architecture-card"><strong>Realtime Database primary</strong><p>Live encrypted records update this floor immediately. Firestore remains the recovery archive.</p></div></section>`;}
function renderVaultRows(items){if(!items.length)return `<div class="md-empty"><strong>No records loaded</strong><p>Memoir is waiting for your encrypted RTDB vault. Firestore recovery runs automatically when required.</p></div>`;return items.map(item=>`<article class="md-vault-card"><div><span>${escapeHtml(category(item))}</span><h3>${escapeHtml(item.title||'Untitled record')}</h3><p>${Object.keys(item.fields||{}).length} encrypted fields${item.note?` · ${escapeHtml(item.note.slice(0,90))}`:''}</p></div><button data-open-record-id="${escapeHtml(item.id)}">Open</button></article>`).join('');}
function renderVault(){return `<section class="md-section-panel"><div class="md-section-heading"><div><small>ENCRYPTED RECORDS</small><h2>Your vault</h2></div><label class="md-panel-search">Search<input id="md-vault-search" placeholder="Titles and fields"></label></div><div class="md-vault-list" id="md-vault-list">${renderVaultRows(currentItems())}</div></section>`;}
function renderPlanner(){const items=currentItems().filter(item=>['Reminder','Todo','Birthday'].includes(category(item)));return `<section class="md-section-panel"><div class="md-section-heading"><div><small>REAL VAULT SCHEDULES</small><h2>Planner</h2></div><span>${items.length} items</span></div><div class="md-planner-list">${items.length?items.map(item=>`<article><small>${escapeHtml(category(item))}</small><strong>${escapeHtml(item.title||'Untitled')}</strong><p>${escapeHtml(item.fields?.['Due at']||item.fields?.Date||item.fields?.Status||item.note||'Saved in your vault')}</p></article>`).join(''):`<div class="md-empty"><strong>No planner records yet</strong><p>Create reminders, todos, or birthdays through Azhar or Rhino.</p></div>`}</div></section>`;}
function renderAgents(){return `<section class="md-section-panel"><div class="md-section-heading"><div><small>AZHAR-MANAGED SPECIALISTS</small><h2>Agent directory</h2></div><span>7 connected</span></div><div class="md-agent-directory">${AGENTS.map(agent=>`<button data-agent-info="${agent.id}">${renderPortrait(agent)}<span><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.title)}</small><em>${escapeHtml(agent.role)}</em></span><i data-agent-status="${agent.id}" data-state="${agent.status}">${agent.status}</i></button>`).join('')}</div></section>`;}
function renderActiveSection(){return state.activeSection==='vault'?renderVault():state.activeSection==='planner'?renderPlanner():state.activeSection==='agents'?renderAgents():renderOverview();}
function renderSectionDeck(){return `<section class="md-section-deck"><nav class="md-section-tabs">${[['overview','Overview'],['vault','Vault'],['planner','Planner'],['agents','Agents']].map(([id,label])=>`<button data-md-section="${id}" class="${state.activeSection===id?'active':''}">${label}</button>`).join('')}</nav><div id="md-section-content">${renderActiveSection()}</div></section>`;}

export function renderKaryalayaTheme(containerNode,profile,items=[]){
  activeProfile=profile||activeProfile;liveItems=Array.isArray(items)?items:[];if(state.animation)cancelAnimationFrame(state.animation);document.body.classList.remove('auth-locked','dark');document.body.classList.add('karyalaya-active');
  containerNode.innerHTML=`<div class="karyalaya-shell"><header class="md-header"><button class="md-brand"><span>KARYALAYA</span><strong>Memoir agent floor</strong></button><div class="md-header-status"><span></span><b data-sync-state>${statusText()}</b><small data-live-count>${liveItems.length} records</small></div><div class="md-header-actions"><button id="md-switch-theme-btn">Change theme</button><span class="md-profile">${escapeHtml(activeProfile.initials||'O')}</span></div></header><main class="md-workspace"><section class="md-floor-container"><div class="md-floor-heading"><div><small>LIVE COORDINATION MAP</small><h1>Azhar runs the floor</h1></div><div class="md-floor-controls"><button id="md-break-floor">Take a break</button><button id="md-center-floor">Center</button><button id="md-zoom-out">−</button><button id="md-zoom-in">+</button></div></div><div class="md-canvas-wrap" id="md-canvas-wrap"><canvas id="md-office-canvas" width="768" height="480"></canvas><p>Drag in any direction to explore</p></div></section>${renderRoster()}${renderChat()}${renderSectionDeck()}</main></div>`;
  bindEvents();paintAllPortraits();requestAnimationFrame(()=>{centerFloor(true);drawFloor(document.querySelector('#md-office-canvas'));animateFloor();scrollChat();});
}
export function updateKaryalayaVault(items=[],status='synced'){liveItems=Array.isArray(items)?items:[];liveStatus=status;document.querySelectorAll('[data-live-count]').forEach(n=>{n.textContent=n.closest('.md-header-status')?`${liveItems.length} records`:String(liveItems.length);});document.querySelectorAll('[data-sync-state]').forEach(n=>n.textContent=statusText());const section=document.querySelector('#md-section-content');if(section){section.innerHTML=renderActiveSection();bindSectionEvents();paintAllPortraits(section);}}

function updateAgentUi(){AGENTS.forEach(agent=>document.querySelectorAll(`[data-agent-status="${agent.id}"]`).forEach(n=>{n.textContent=agent.status;n.dataset.state=agent.status;}));}
function activateAgent(agent){state.breakMode=false;setAgentTarget(AGENTS[0],[348,254],'coordinating','working');setAgentTarget(agent,[382,254],'working with Azhar','working');}
function releaseAgents(){AGENTS.forEach(sendAgentHome);updateAgentUi();}
function toggleBreak(){state.breakMode=!state.breakMode;AGENTS.forEach((agent,index)=>state.breakMode?setAgentTarget(agent,BREAK_SPOTS[index],'on break','away'):sendAgentHome(agent));const b=document.querySelector('#md-break-floor');if(b)b.textContent=state.breakMode?'Return to work':'Take a break';}
function bindEvents(){bindChatEvents();bindSectionEvents();bindFloorEvents();bindAgentEvents();document.querySelector('#md-break-floor')?.addEventListener('click',toggleBreak);document.querySelector('#md-switch-theme-btn')?.addEventListener('click',()=>showExperienceSwitcherModal());}
function bindChatEvents(){
  const form=document.querySelector('#md-prompt-form'),input=document.querySelector('#md-prompt-input');if(form&&input){form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';sendMdMessage(text);};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}};}
  document.querySelectorAll('[data-reveal-field]').forEach(button=>button.onclick=()=>{const[mi,fi]=button.dataset.revealField.split(':').map(Number),field=state.logs[mi]?.fields?.[fi],row=button.closest('.md-field-row');if(!field||!row)return;const shown=button.dataset.shown==='true';row.querySelector('[data-field-value]').textContent=shown?maskValue(field.value):field.value;button.dataset.shown=String(!shown);button.textContent=shown?'Reveal':'Hide';});
  document.querySelectorAll('[data-copy-field]').forEach(button=>button.onclick=async()=>{const[mi,fi]=button.dataset.copyField.split(':').map(Number),field=state.logs[mi]?.fields?.[fi];if(!field)return;await navigator.clipboard.writeText(String(field.value));button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1200);});
}
function bindSectionEvents(){
  document.querySelectorAll('[data-md-section]').forEach(button=>button.onclick=()=>{state.activeSection=button.dataset.mdSection;document.querySelectorAll('[data-md-section]').forEach(tab=>tab.classList.toggle('active',tab.dataset.mdSection===state.activeSection));const section=document.querySelector('#md-section-content');if(section){section.innerHTML=renderActiveSection();bindSectionEvents();paintAllPortraits(section);}});
  const search=document.querySelector('#md-vault-search');if(search)search.oninput=()=>{const q=search.value.toLowerCase().trim(),filtered=currentItems().filter(item=>`${item.title} ${item.type} ${item.note} ${Object.keys(item.fields||{}).join(' ')}`.toLowerCase().includes(q)),list=document.querySelector('#md-vault-list');if(list)list.innerHTML=renderVaultRows(filtered);bindSectionEvents();};
  document.querySelectorAll('[data-open-record-id]').forEach(button=>button.onclick=()=>showRecordDialog(currentItems().find(item=>item.id===button.dataset.openRecordId)));bindAgentEvents();
}
function applyCanvasTransform(){const canvas=document.querySelector('#md-office-canvas');if(canvas)canvas.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;}
function centerFloor(force=false){const wrap=document.querySelector('#md-canvas-wrap');if(!wrap)return;const fit=Math.min((wrap.clientWidth-12)/768,(wrap.clientHeight-12)/480,1);if(force)state.zoom=Math.max(.56,fit);state.panX=Math.max(0,(wrap.clientWidth-768*state.zoom)/2);state.panY=Math.max(0,(wrap.clientHeight-480*state.zoom)/2);applyCanvasTransform();}
function bindFloorEvents(){const wrap=document.querySelector('#md-canvas-wrap'),canvas=document.querySelector('#md-office-canvas');if(!wrap||!canvas)return;let dragging=false,moved=false,startX=0,startY=0,baseX=0,baseY=0;wrap.onpointerdown=e=>{dragging=true;moved=false;startX=e.clientX;startY=e.clientY;baseX=state.panX;baseY=state.panY;wrap.setPointerCapture(e.pointerId);};wrap.onpointermove=e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;moved=moved||Math.abs(dx)+Math.abs(dy)>5;const minX=Math.min(18,wrap.clientWidth-768*state.zoom-18),minY=Math.min(18,wrap.clientHeight-480*state.zoom-18);state.panX=Math.max(minX,Math.min(18,baseX+dx));state.panY=Math.max(minY,Math.min(18,baseY+dy));applyCanvasTransform();};wrap.onpointerup=e=>{dragging=false;wrap.releasePointerCapture(e.pointerId);};document.querySelector('#md-center-floor').onclick=()=>centerFloor(true);document.querySelector('#md-zoom-in').onclick=()=>{state.zoom=Math.min(1.5,state.zoom+.12);applyCanvasTransform();};document.querySelector('#md-zoom-out').onclick=()=>{state.zoom=Math.max(.5,state.zoom-.12);applyCanvasTransform();};canvas.onclick=e=>{if(moved)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/state.zoom,y=(e.clientY-r.top)/state.zoom,hit=AGENTS.find(agent=>Math.hypot(agent.pos[0]-x,agent.pos[1]-y)<25);if(hit)showAgentDialog(hit);};}
function bindAgentEvents(){document.querySelectorAll('[data-agent-info]').forEach(button=>button.onclick=()=>showAgentDialog(AGENTS.find(agent=>agent.id===button.dataset.agentInfo)));}
function showAgentDialog(agent){if(!agent)return;state.selectedAgent=agent.id;const modal=document.querySelector('#modal');if(!modal)return;modal.className='modal md-dialog-host';modal.innerHTML=`<div class="md-info-dialog"><button class="md-dialog-close">Close</button>${renderPortrait(agent,'md-dialog-avatar')}<small>${agent.id==='azhar'?'LEAD ORCHESTRATION':'AZHAR-MANAGED SPECIALIST'}</small><h2>${escapeHtml(agent.name)}</h2><strong>${escapeHtml(agent.title)}</strong><p>${escapeHtml(agent.role)}</p><div class="md-dialog-status"><span data-agent-status="${agent.id}" data-state="${agent.status}">${agent.status}</span><em>${escapeHtml(agent.activity)}</em></div><button class="md-dialog-primary" id="md-dialog-ask">${agent.id==='azhar'?'Talk to Azhar':`Ask Azhar to involve ${escapeHtml(agent.name)}`}</button></div>`;if(!modal.open)modal.showModal();paintAllPortraits(modal);modal.querySelector('.md-dialog-close').onclick=()=>modal.close();modal.querySelector('#md-dialog-ask').onclick=()=>{modal.close();const input=document.querySelector('#md-prompt-input');document.querySelector('#md-chat-panel')?.scrollIntoView({behavior:'smooth',block:'center'});if(input){if(agent.id!=='azhar')input.value=`Ask ${agent.name} to help with `;input.focus();}};}
function showRecordDialog(item){if(!item)return;const fields=Object.entries(item.fields||{}),modal=document.querySelector('#modal');if(!modal)return;modal.className='modal md-dialog-host';modal.innerHTML=`<div class="md-record-dialog"><button class="md-dialog-close">Close</button><small>${escapeHtml(category(item))}</small><h2>${escapeHtml(item.title||'Untitled record')}</h2>${item.note?`<p>${escapeHtml(item.note)}</p>`:''}<div class="md-dialog-fields">${fields.map(([label,value],index)=>`<div><span>${escapeHtml(label)}</span><strong data-dialog-value="${index}">${escapeHtml(isSensitive(label)?maskValue(value):value)}</strong><span>${isSensitive(label)?`<button data-dialog-reveal="${index}">Reveal</button>`:''}<button data-dialog-copy="${index}">Copy</button></span></div>`).join('')||'<p>No additional fields.</p>'}</div></div>`;if(!modal.open)modal.showModal();modal.querySelector('.md-dialog-close').onclick=()=>modal.close();modal.querySelectorAll('[data-dialog-reveal]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.dialogReveal),[,value]=fields[index],shown=button.dataset.shown==='true';modal.querySelector(`[data-dialog-value="${index}"]`).textContent=shown?maskValue(value):value;button.dataset.shown=String(!shown);button.textContent=shown?'Reveal':'Hide';});modal.querySelectorAll('[data-dialog-copy]').forEach(button=>button.onclick=async()=>{const[,value]=fields[Number(button.dataset.dialogCopy)];await navigator.clipboard.writeText(String(value));button.textContent='Copied';});}
function refreshChat(){const panel=document.querySelector('#md-chat-panel');if(!panel)return;panel.outerHTML=renderChat();bindChatEvents();paintAllPortraits(document.querySelector('#md-chat-panel'));scrollChat();}
function scrollChat(){const stream=document.querySelector('#md-chat-stream');if(stream)stream.scrollTop=stream.scrollHeight;}
export async function sendMdMessage(rawText){const text=String(rawText||'').trim();if(!text||state.busy)return;state.logs.push({role:'user',text});state.busy=true;const agent=delegatedAgent(text);activateAgent(agent);state.logs.push({role:'assistant',title:'Delegating securely',markdown:`Azhar has assigned this request to **${agent.name} · ${agent.title}**. The final response will return here.`});refreshChat();try{if(!assistantHandler)throw new Error('Azhar is reconnecting to Memoir intelligence.');const response=await assistantHandler(text,state.logs.slice(-10));state.logs.pop();state.logs.push({role:'assistant',title:response?.title||'Azhar',markdown:response?.markdown||response?.message||'The request completed.',fields:response?.fields||[]});}catch(error){state.logs.pop();state.logs.push({role:'assistant',title:'Azhar could not complete this request',markdown:String(error?.message||'Please try again.')});}finally{state.busy=false;releaseAgents();refreshChat();}}

export function showExperienceSwitcherModal(onSwitchCallback=null,{firstRun=false}={}){const modal=document.querySelector('#modal');if(!modal)return;const current=getThemePreference();modal.className='modal md-theme-dialog-host';modal.innerHTML=`<div class="md-theme-dialog"><header><div><small>${firstRun?'WELCOME TO MEMOIR':'WORKSPACE APPEARANCE'}</small><h2>Choose your workspace</h2><p>Both presentations use the same encrypted RTDB vault and Firestore recovery archive.</p></div>${firstRun?'':'<button class="md-dialog-close">Close</button>'}</header><div class="md-theme-options"><button data-pick-theme="classic" class="${current==='classic'?'selected':''}"><span class="md-theme-preview classic"><img src="/brand/memoir-rhino-ui.png" alt=""></span><span><small>FOCUSED VAULT</small><strong>Rhino</strong><em>Fast, minimal, and private by design.</em></span><b>${current==='classic'?'Current':'Choose'}</b></button><button data-pick-theme="karyalaya" class="${current==='karyalaya'?'selected':''}"><span class="md-theme-preview office"><i></i><i></i><i></i><i></i></span><span><small>AGENT WORKSPACE</small><strong>Karyalaya</strong><em>A live pixel office coordinated by Azhar.</em></span><b>${current==='karyalaya'?'Current':'Choose'}</b></button></div><p class="md-theme-foot">Presentation changes only. Records, encryption, and permissions remain identical.</p></div>`;if(!modal.open)modal.showModal();modal.querySelector('.md-dialog-close')?.addEventListener('click',()=>modal.close());modal.querySelectorAll('[data-pick-theme]').forEach(button=>button.onclick=()=>{const choice=button.dataset.pickTheme;setThemePreference(choice);localStorage.setItem(THEME_WELCOME_KEY,'true');modal.close();if(onSwitchCallback)onSwitchCallback(choice);else window.location.reload();});}
export function offerThemeChoiceOnce(onSwitchCallback){if(themeOfferScheduled||localStorage.getItem(THEME_WELCOME_KEY)==='true')return;themeOfferScheduled=true;setTimeout(()=>showExperienceSwitcherModal(onSwitchCallback,{firstRun:true}),500);}
export const kfLog=(tag,text)=>{if(!text)return;state.logs.push({role:'assistant',title:String(tag||'Activity').replace(/_/g,' '),markdown:String(text)});if(state.logs.length>30)state.logs.splice(0,state.logs.length-30);};
export const sendKaryalayaMessage=sendMdMessage;
