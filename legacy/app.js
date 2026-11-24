// ---- Config (prototipo) ----------------------------------------------
// Códigos válidos de 5 letras. En producción esto se valida en un servidor.
const VALID_CODES = ['JUANA', 'PALAB'];

const TRACKS = [
  { title: 'Palabras',    src: 'audio/01.wav' },
  { title: 'Preguntas',   src: 'audio/02.wav' },
  { title: 'Otro mundo',  src: 'audio/03.wav' },
  { title: 'Tomika',      src: 'audio/04.wav' },
  { title: 'Voz y coros', src: 'audio/05.wav' },
  { title: 'Evolución',   src: 'audio/06.wav' },
  { title: 'Diciembre',   src: 'audio/07.wav' },
]; // 7 canciones — nombres y audios son placeholders

// ---- Helpers -----------------------------------------------------------
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const fmt = (s) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};
const nn = (i) => String(i + 1).padStart(2, '0');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const gate = $('gate'), identity = $('identity'), player = $('player'), tab = $('tab');
const input = $('codeInput'), cells = $$('.code__cells i');
const errorEl = $('error'), codeBox = $('code');
const audio = $('audio');
let current = -1, codeOk = false, user = null;

try { user = JSON.parse(store.get('juana-user')); } catch {}

// ---- Pantallas: gate → identity → player --------------------------------
function show(which) {
  gate.hidden = which !== 'gate';
  identity.hidden = which !== 'identity';
  player.hidden = which !== 'player';
  tab.hidden = which !== 'tab';
}
const stage = () => (user ? 'player' : codeOk ? 'identity' : 'gate');

// ---- Paso 1: código -------------------------------------------------------
function renderCode() {
  const v = input.value;
  cells.forEach((c, i) => {
    c.textContent = v[i] || '';
    c.classList.toggle('filled', !!v[i]);
    c.classList.toggle('on', i === Math.min(v.length, 4));
  });
}

function submit() {
  const code = input.value.toUpperCase();
  if (code.length < 5) { fail('Faltan letras: son 5.'); return; }
  if (!VALID_CODES.includes(code)) { fail('Código incorrecto. Probá de nuevo.'); return; }
  codeOk = true;
  show('identity');
  $('idName').focus();
}

function fail(msg) {
  errorEl.style.color = '';
  errorEl.textContent = msg;
  codeBox.classList.remove('shake'); void codeBox.offsetWidth; codeBox.classList.add('shake');
}

input.addEventListener('input', () => {
  input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5);
  errorEl.textContent = '';
  renderCode();
  if (input.value.length === 5) submit(); // avanza al escribir la 5ª letra
});
input.addEventListener('focus', renderCode);
input.addEventListener('blur', () => cells.forEach(c => c.classList.remove('on')));
$('form').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
$('help').addEventListener('click', (e) => {
  e.preventDefault();
  errorEl.style.color = '#9b9ba0';
  errorEl.textContent = 'Prototipo: probá con JUANA.';
});

// ---- Paso 2: nombre y email ----------------------------------------------
const idError = $('idError');
['idName', 'idEmail'].forEach((id) => $(id).addEventListener('input', () => { idError.textContent = ''; }));
$('back').addEventListener('click', () => { codeOk = false; show('gate'); input.focus(); });
$('idForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('idName').value.trim(), email = $('idEmail').value.trim();
  if (!name) { idError.textContent = 'Decinos tu nombre.'; return; }
  if (!EMAIL_RE.test(email)) { idError.textContent = 'Revisá el email: parece incompleto.'; return; }
  user = { name, email };
  store.set('juana-user', JSON.stringify(user));
  show('player');
  if (current < 0) select(0, false);
  renderThread();
});

// ---- Minimizar / abrir (desktop) ------------------------------------------
$('close').addEventListener('click', () => show('tab'));
$('closeIdentity').addEventListener('click', () => show('tab'));
$('minimize').addEventListener('click', () => show('tab'));
tab.addEventListener('click', () => { show(stage()); if (stage() === 'gate') input.focus(); });

// ---- Solapas: canciones / mensajes ----------------------------------------
function setTab(name) {
  const chat = name === 'chat';
  $('viewSongs').hidden = chat;
  $('viewChat').hidden = !chat;
  $('tabSongs').classList.toggle('is-on', !chat);
  $('tabChat').classList.toggle('is-on', chat);
  $('tabSongs').setAttribute('aria-selected', String(!chat));
  $('tabChat').setAttribute('aria-selected', String(chat));
  if (chat) { renderThread(); $('chatInput').focus({ preventScroll: true }); }
}
$('tabSongs').addEventListener('click', () => setTab('songs'));
$('tabChat').addEventListener('click', () => setTab('chat'));

// ---- Reproductor -------------------------------------------------------
const list = $('tracks');
TRACKS.forEach((t, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<span class="n">${nn(i)}</span><span>${t.title}</span><span class="d">–:––</span>`;
  li.addEventListener('click', () => (i === current ? toggle() : select(i, true)));
  list.appendChild(li);
  // duración real de cada audio
  const a = new Audio(); a.preload = 'metadata'; a.src = t.src;
  a.addEventListener('loadedmetadata', () => { li.querySelector('.d').textContent = fmt(a.duration); });
});

function select(i, play) {
  current = (i + TRACKS.length) % TRACKS.length;
  audio.src = TRACKS[current].src;
  const label = `${nn(current)} · ${TRACKS[current].title}`;
  $('nowTitle').textContent = label;
  $('miniTitle').textContent = label;
  [...list.children].forEach((li, k) => li.classList.toggle('active', k === current));
  if (play) audio.play().catch(() => {});
  syncIcon();
}

function toggle() { audio.paused ? audio.play().catch(() => {}) : audio.pause(); }

const ICON_PLAY = 'M8 5l11 7-11 7z';
const ICON_PAUSE = 'M7 5v14M17 5v14';
function syncIcon() {
  $$('.js-toggle').forEach((b) => {
    b.querySelector('path').setAttribute('d', audio.paused ? ICON_PLAY : ICON_PAUSE);
    b.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
  });
  [...list.children].forEach((li, k) => li.classList.toggle('playing', k === current && !audio.paused));
}

$$('.js-toggle').forEach((b) => b.addEventListener('click', toggle));
$$('.js-prev').forEach((b) => b.addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : select(current - 1, !audio.paused))));
$$('.js-next').forEach((b) => b.addEventListener('click', () => select(current + 1, !audio.paused)));
audio.addEventListener('play', syncIcon);
audio.addEventListener('pause', syncIcon);
audio.addEventListener('ended', () => select(current + 1, true));
audio.addEventListener('timeupdate', () => {
  $('nowTime').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  if (audio.duration) $('seek').value = (audio.currentTime / audio.duration) * 1000;
});
$('seek').addEventListener('input', (e) => {
  if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration;
});

// ---- Mensajes ----------------------------------------------------------
const thread = $('thread'), chatInput = $('chatInput'), chatSend = $('chatSend');
const NOTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>';
const hhmm = (ts) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function myMessages() {
  if (!user) return [];
  return JuanaMessages.all().filter((m) => m.email.toLowerCase() === user.email.toLowerCase());
}

function renderThread() {
  const mine = myMessages();
  [...thread.querySelectorAll('.chat__marker,.bubble')].forEach((n) => n.remove());
  let last = -1;
  mine.forEach((m) => {
    if (m.track !== last) {
      thread.insertAdjacentHTML('beforeend', `<div class="chat__marker">${NOTE_ICON}<span>${nn(m.track)} · ${escapeHtml(m.trackTitle)}</span></div>`);
      last = m.track;
    }
    thread.insertAdjacentHTML('beforeend', `<div class="bubble"><span>${escapeHtml(m.text)}</span><time>${hhmm(m.ts)}</time></div>`);
  });
  const count = $('msgCount');
  count.textContent = mine.length;
  count.hidden = mine.length === 0;
  thread.scrollTop = thread.scrollHeight;
}

chatInput.addEventListener('input', () => { chatSend.disabled = !chatInput.value.trim(); });
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !user || current < 0) return;
  JuanaMessages.add({ name: user.name, email: user.email, track: current, trackTitle: TRACKS[current].title, text });
  chatInput.value = ''; chatSend.disabled = true;
  renderThread();
});

// ---- Init --------------------------------------------------------------
renderCode();
if (user) { show('player'); select(0, false); renderThread(); }
