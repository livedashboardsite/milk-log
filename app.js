// ── Constants ───────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const SHORT_MONTHS= ['Jan','Feb','Mar','Apr','May','Jun',
                     'Jul','Aug','Sep','Oct','Nov','Dec'];

// Reminder times (24h). Last slot = auto-skip if still unlogged.
const REMINDER_HOURS = [19, 20, 21]; // 7 PM, 8 PM, 9 PM

const today      = new Date();
const YEAR       = today.getFullYear();
const MONTH      = today.getMonth();   // 0-based
const TODAY_DATE = today.getDate();

// ── State ───────────────────────────────────────────────────────────────────
let selectedQty = 0.5;
let entries     = [];
let rateHalf    = 30;
let rateFull    = 60;

// ── Storage ─────────────────────────────────────────────────────────────────
function storageKey(y, m) { return `milklog-${y}-${m}`; }          // m = 1-based
function ratesKey(y, m)   { return `milklog-rates-${y}-${m}`; }

function dateKey(d, y = YEAR, m = MONTH) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function load() {
  try {
    const raw = localStorage.getItem(storageKey(YEAR, MONTH + 1));
    if (raw) entries = JSON.parse(raw);
    const r = JSON.parse(localStorage.getItem('milklog-rates') || '{}');
    rateHalf = r.half ?? 30;
    rateFull = r.full ?? 60;
    document.getElementById('rate-half').value = rateHalf;
    document.getElementById('rate-full').value = rateFull;
  } catch(e) {}
}

function save() {
  localStorage.setItem(storageKey(YEAR, MONTH + 1), JSON.stringify(entries));
  const robj = { half: rateHalf, full: rateFull };
  localStorage.setItem('milklog-rates', JSON.stringify(robj));
  localStorage.setItem(ratesKey(YEAR, MONTH + 1), JSON.stringify(robj));
}

// ── Stats ────────────────────────────────────────────────────────────────────
function calcStats(ents, rh, rf) {
  let days=0, litres=0, halfDays=0, fullDays=0, skipDays=0;
  ents.forEach(e => {
    if (e.type === 'got') {
      days++; litres += e.qty;
      e.qty === 0.5 ? halfDays++ : fullDays++;
    } else skipDays++;
  });
  return { days, litres, halfDays, fullDays, skipDays,
           bill: Math.round(halfDays * rh + fullDays * rf) };
}

// ── Render home ──────────────────────────────────────────────────────────────
function render() {
  document.getElementById('header-month').textContent = MONTH_NAMES[MONTH] + ' ' + YEAR;
  document.getElementById('today-date').textContent =
    DAY_NAMES[today.getDay()] + ', ' + TODAY_DATE + ' ' + MONTH_NAMES[MONTH];

  const s = calcStats(entries, rateHalf, rateFull);
  document.getElementById('s-days').textContent   = s.days;
  document.getElementById('s-litres').textContent = s.litres.toFixed(1);
  document.getElementById('s-bill').textContent   = '₹' + s.bill;

  document.getElementById('b-half-days').textContent = s.halfDays + ' day'+(s.halfDays!==1?'s':'')+' × ₹'+rateHalf;
  document.getElementById('b-full-days').textContent = s.fullDays + ' day'+(s.fullDays!==1?'s':'')+' × ₹'+rateFull;
  document.getElementById('b-skip-days').textContent = s.skipDays + ' day'+(s.skipDays!==1?'s':'');
  document.getElementById('b-total').textContent     = '₹' + s.bill;
}

// ── Log today ────────────────────────────────────────────────────────────────
function logEntry(type) {
  const key = dateKey(TODAY_DATE);
  const idx = entries.findIndex(e => e.date === key);
  const ne  = { date: key, type, qty: type === 'skip' ? 0 : selectedQty };
  if (idx >= 0) entries[idx] = ne; else entries.push(ne);
  save(); render();
  showToast(type === 'got'
    ? `Logged ${selectedQty === 0.5 ? '½' : '1'} litre for today ✓`
    : 'Marked as skipped today');
}

document.querySelectorAll('.qty-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.qty-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedQty = parseFloat(btn.dataset.qty);
  });
});
document.getElementById('btn-got').addEventListener('click',  () => logEntry('got'));
document.getElementById('btn-skip').addEventListener('click', () => logEntry('skip'));

// ── Rates ────────────────────────────────────────────────────────────────────
document.getElementById('rate-half').addEventListener('input', e => {
  rateHalf = parseFloat(e.target.value)||0; save(); render();
});
document.getElementById('rate-full').addEventListener('input', e => {
  rateFull = parseFloat(e.target.value)||0; save(); render();
});

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ════════════════════════════════════════════════════════════════════════════
// VIEW LOGS SCREEN
// ════════════════════════════════════════════════════════════════════════════
let lvYear  = YEAR;
let lvMonth = MONTH; // 0-based

function getAvailableMonths() {
  const months = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const m = key && key.match(/^milklog-(\d{4})-(\d{1,2})$/);
    if (m) months.push({ y: parseInt(m[1]), m: parseInt(m[2]) - 1 });
  }
  if (!months.find(x => x.y === YEAR && x.m === MONTH))
    months.push({ y: YEAR, m: MONTH });
  return months.sort((a,b) => b.y - a.y || b.m - a.m);
}

function openLogs() {
  lvYear = YEAR; lvMonth = MONTH;
  renderLogs();
  document.getElementById('logs-screen').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLogs() {
  document.getElementById('logs-screen').classList.remove('open');
  document.body.style.overflow = '';
}

function renderLogs() {
  // Populate dropdown
  const sel = document.getElementById('logs-month-select');
  sel.innerHTML = '';
  getAvailableMonths().forEach(({y, m}) => {
    const o = document.createElement('option');
    o.value = `${y}-${m}`;
    o.textContent = MONTH_NAMES[m] + ' ' + y;
    if (y === lvYear && m === lvMonth) o.selected = true;
    sel.appendChild(o);
  });
  renderLogsContent();
}

function renderLogsContent() {
  const y = lvYear, m = lvMonth;
  let ents = [];
  try { const r = localStorage.getItem(storageKey(y, m+1)); if (r) ents = JSON.parse(r); } catch(e) {}

  // Historical rates for that month
  let rh = rateHalf, rf = rateFull;
  try { const r = JSON.parse(localStorage.getItem(ratesKey(y, m+1))||'{}'); if(r.half) { rh=r.half; rf=r.full; } } catch(e) {}

  const isNow = y === YEAR && m === MONTH;
  const s = calcStats(ents, rh, rf);

  document.getElementById('lv-days').textContent   = s.days;
  document.getElementById('lv-litres').textContent = s.litres.toFixed(1);
  document.getElementById('lv-bill').textContent   = '₹' + s.bill;
  document.getElementById('lv-b-half').textContent  = s.halfDays+' day'+(s.halfDays!==1?'s':'')+' × ₹'+rh;
  document.getElementById('lv-b-full').textContent  = s.fullDays+' day'+(s.fullDays!==1?'s':'')+' × ₹'+rf;
  document.getElementById('lv-b-skip').textContent  = s.skipDays+' day'+(s.skipDays!==1?'s':'');
  document.getElementById('lv-b-total').textContent = '₹' + s.bill;

  // Day list
  const list = document.getElementById('lv-list');
  list.innerHTML = '';
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const lastDay = isNow ? Math.min(TODAY_DATE, daysInMonth) : daysInMonth;

  for (let d = lastDay; d >= 1; d--) {
    const key   = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry = ents.find(e => e.date === key) || null;
    const date  = new Date(y, m, d);

    const row = document.createElement('div');
    row.className = 'lv-entry';

    row.innerHTML = `
      <div class="entry-day">
        <div class="entry-day-num">${d}</div>
        <div class="entry-day-name">${DAY_NAMES[date.getDay()]}</div>
      </div>
      <div class="lv-entry-info">
        <div class="entry-info-date">${SHORT_MONTHS[m]} ${d}</div>
        <div class="entry-info-meta">${entry ? 'logged' : 'not logged'}</div>
      </div>
      <span class="badge ${entry ? entry.type : 'empty'}">
        ${entry
          ? (entry.type === 'got' ? (entry.qty === 0.5 ? '½ L' : '1 L') : 'skipped')
          : '—'}
      </span>
      <button class="edit-btn" title="Edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>`;

    row.querySelector('.edit-btn').addEventListener('click', () =>
      openEditModal(d, y, m, ents));
    list.appendChild(row);
  }
}

document.getElementById('logs-month-select').addEventListener('change', e => {
  const [y, m] = e.target.value.split('-').map(Number);
  lvYear = y; lvMonth = m;
  renderLogsContent();
});
document.getElementById('btn-view-logs').addEventListener('click', openLogs);
document.getElementById('lv-close').addEventListener('click', closeLogs);

// ════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ════════════════════════════════════════════════════════════════════════════
let editCtx = null;

function openEditModal(d, y, m, ents) {
  editCtx = { d, y, m };
  const key   = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const entry = ents.find(e => e.date === key);
  const date  = new Date(y, m, d);
  document.getElementById('edit-title').textContent =
    DAY_NAMES[date.getDay()] + ', ' + d + ' ' + MONTH_NAMES[m];

  const qty = (entry && entry.type === 'got') ? entry.qty : 0.5;
  document.querySelectorAll('.edit-qty-pill').forEach(b =>
    b.classList.toggle('active', parseFloat(b.dataset.qty) === qty));

  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editCtx = null;
}

document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
document.getElementById('edit-modal-overlay').addEventListener('click', closeEditModal);

document.querySelectorAll('.edit-qty-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.edit-qty-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function applyEdit(type) {
  if (!editCtx) return;
  const { d, y, m } = editCtx;
  const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const qty = type === 'skip' ? 0
    : parseFloat(document.querySelector('.edit-qty-pill.active').dataset.qty);

  let ents = [];
  try { const r = localStorage.getItem(storageKey(y, m+1)); if(r) ents = JSON.parse(r); } catch(e){}
  const idx = ents.findIndex(e => e.date === key);
  const ne = { date: key, type, qty };
  if (idx >= 0) ents[idx] = ne; else ents.push(ne);
  localStorage.setItem(storageKey(y, m+1), JSON.stringify(ents));
  if (y === YEAR && m === MONTH) { entries = ents; render(); }
  closeEditModal(); renderLogsContent();
  showToast(`Updated ${SHORT_MONTHS[m]} ${d} ✓`);
}

function clearEdit() {
  if (!editCtx) return;
  const { d, y, m } = editCtx;
  const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  let ents = [];
  try { const r = localStorage.getItem(storageKey(y, m+1)); if(r) ents = JSON.parse(r); } catch(e){}
  ents = ents.filter(e => e.date !== key);
  localStorage.setItem(storageKey(y, m+1), JSON.stringify(ents));
  if (y === YEAR && m === MONTH) { entries = ents; render(); }
  closeEditModal(); renderLogsContent();
  showToast(`Cleared ${SHORT_MONTHS[m]} ${d}`);
}

document.getElementById('edit-btn-got').addEventListener('click',  () => applyEdit('got'));
document.getElementById('edit-btn-skip').addEventListener('click', () => applyEdit('skip'));
document.getElementById('edit-btn-clear').addEventListener('click', clearEdit);

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════
const notifBtn   = document.getElementById('notif-btn');
const notifLabel = document.getElementById('notif-label');

function updateNotifBtn(on) {
  notifBtn.classList.toggle('enabled', on);
  notifLabel.textContent = on ? 'Reminder on' : 'Enable reminder';
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const path = new URL('./sw.js', window.location.href).pathname;
    await navigator.serviceWorker.register(path);
  } catch(e) { console.warn('SW:', e); }
}

function scheduleReminders() {
  const now     = new Date();
  const nowSecs = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
  REMINDER_HOURS.forEach((hour, idx) => {
    const isLast = idx === REMINDER_HOURS.length - 1;
    let ms = (hour * 3600 - nowSecs) * 1000;
    if (ms <= 0) ms += 86400000;
    setTimeout(function fire() {
      if (Notification.permission !== 'granted') return;
      if (localStorage.getItem('milklog-reminder') !== 'on') return;
      try { const r = localStorage.getItem(storageKey(YEAR, MONTH+1)); if(r) entries = JSON.parse(r); } catch(e){}
      const entry = entries.find(e => e.date === dateKey(TODAY_DATE));
      if (entry) {
        const label = entry.type==='got' ? (entry.qty===0.5?'½ litre':'1 litre') : 'skipped';
        new Notification('🥛 Milk Log', { body:`Already marked: ${label} ✅`, icon:'./icon.svg', tag:'milk-reminder' });
      } else if (isLast) {
        const key = dateKey(TODAY_DATE);
        const i2 = entries.findIndex(e=>e.date===key);
        const sk = { date:key, type:'skip', qty:0 };
        if (i2>=0) entries[i2]=sk; else entries.push(sk);
        save(); render();
        new Notification('🥛 Milk Log', { body:'No entry — auto-marked as skipped.', icon:'./icon.svg', tag:'milk-reminder' });
      } else {
        new Notification('🥛 Milk Log', { body:"Did the milk come? Don't forget to log!", icon:'./icon.svg', tag:'milk-reminder' });
      }
      setTimeout(fire, 86400000);
    }, ms);
  });
}

async function enableReminders() {
  if (!('Notification' in window)) { showToast('Notifications not supported'); return; }
  if (Notification.permission === 'denied') { showToast('Notifications blocked — check browser settings'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { showToast('Permission not granted'); return; }
  localStorage.setItem('milklog-reminder', 'on');
  updateNotifBtn(true);
  showToast('Reminders on! 7, 8 & 9 PM daily 🔔');
  scheduleReminders();
}

notifBtn.addEventListener('click', async () => {
  if (Notification.permission === 'granted' && localStorage.getItem('milklog-reminder') === 'on') {
    localStorage.removeItem('milklog-reminder');
    updateNotifBtn(false);
    showToast('Reminders turned off');
    return;
  }
  await enableReminders();
});

// ── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  load(); render();
  await registerSW();
  if (Notification.permission === 'granted' && localStorage.getItem('milklog-reminder') === 'on') {
    updateNotifBtn(true); scheduleReminders();
  }
})();
