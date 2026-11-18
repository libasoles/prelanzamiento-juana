// Admin de solo lectura: lista los mensajes de los oyentes, sin respuesta posible.
const TITLES = ['Palabras', 'Preguntas', 'Otro mundo', 'Tomika', 'Voz y coros', 'Evolución', 'Diciembre'];
const nn = (i) => String(i + 1).padStart(2, '0');
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PALETTE = [
  ['#0a4fc4', '#fff'], ['#d9cbb2', '#111'], ['#111', '#f3f0e8'],
  ['#9fbdf5', '#111'], ['#073a94', '#fff'], ['#b4b4ba', '#111'],
];
const colorFor = (key) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const avatar = (p, size) => {
  const [bg, fg] = colorFor(p.email.toLowerCase());
  return `<span class="avatar avatar--${size}" style="background:${bg};color:${fg}" aria-hidden="true">${esc(initials(p.name))}</span>`;
};

function when(ts) {
  const d = new Date(ts), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const hm = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diff === 0) return `Hoy · ${hm}`;
  if (diff === 1) return `Ayer · ${hm}`;
  return `${d.toLocaleDateString('es', { day: 'numeric', month: 'short' })} · ${hm}`;
}

const state = { person: 'all', track: -1 };

function render() {
  const msgs = JuanaMessages.all().sort((a, b) => b.ts - a.ts);
  $('seed').hidden = msgs.length > 0;

  const byTrack = msgs.filter((m) => state.track < 0 || m.track === state.track);
  const people = new Map();
  byTrack.forEach((m) => {
    const k = m.email.toLowerCase();
    if (!people.has(k)) people.set(k, { name: m.name, email: m.email, n: 0 });
    people.get(k).n++;
  });
  if (state.person !== 'all' && !people.has(state.person)) state.person = 'all';
  const visible = byTrack.filter((m) => state.person === 'all' || m.email.toLowerCase() === state.person);

  $('summary').textContent = msgs.length
    ? `${byTrack.length} mensajes de ${people.size} oyentes${state.track >= 0 ? ` en ${nn(state.track)} · ${TITLES[state.track]}` : ''}`
    : 'Todavía no hay mensajes.';

  // filtro por canción
  $('chips').innerHTML = [{ i: -1, label: 'Todas las canciones' }]
    .concat(TITLES.map((t, i) => ({ i, label: `${nn(i)} · ${t}` })))
    .map((c) => `<button class="chip" data-track="${c.i}" aria-pressed="${state.track === c.i}">${esc(c.label)}</button>`).join('');

  // personas
  const all = `<button class="person" data-person="all" aria-pressed="${state.person === 'all'}">
    <span class="avatar avatar--40" style="background:#e4ebfb;color:#073a94" aria-hidden="true">∗</span>
    <span class="person__txt"><span class="person__name">Todas las personas</span><span class="person__sub">${people.size} oyentes</span></span>
    <span class="person__n">${byTrack.length}</span></button>`;
  $('people').innerHTML = all + [...people].map(([k, p]) => `<button class="person" data-person="${esc(k)}" aria-pressed="${state.person === k}">
    ${avatar(p, 40)}
    <span class="person__txt"><span class="person__name">${esc(p.name)}</span><span class="person__sub">${esc(p.email)}</span></span>
    <span class="person__n">${p.n}</span></button>`).join('');

  // feed
  $('feed').innerHTML = visible.length ? visible.map((m) => `<article class="msg">
    ${avatar(m, 48)}
    <div class="msg__body">
      <div class="msg__top">
        <span class="msg__name">${esc(m.name)}</span>
        <span class="msg__email">${esc(m.email)}</span>
        <span class="msg__track"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>${nn(m.track)} · ${esc(m.trackTitle)}</span>
        <span class="msg__when">${when(m.ts)}</span>
      </div>
      <p class="msg__text">${esc(m.text)}</p>
    </div></article>`).join('') : '<div class="empty">No hay mensajes con este filtro.</div>';
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip'), person = e.target.closest('.person');
  if (chip) { state.track = Number(chip.dataset.track); render(); }
  if (person) { state.person = person.dataset.person; render(); }
});

// Datos de ejemplo para ver el diseño (se guardan como mensajes normales).
$('seed').addEventListener('click', () => {
  const now = Date.now(), H = 3600000;
  const rows = [
    ['Valentina Gómez', 'valentina@ejemplo.com', 6, 'Diciembre me hizo llorar en el colectivo. Gracias por esto.', 0.3],
    ['Camila Ríos', 'camila@ejemplo.com', 1, 'Quiero que la toques en vivo, por favor.', 1.5],
    ['Camila Ríos', 'camila@ejemplo.com', 1, 'El estribillo me dejó sin palabras.', 1.6],
    ['Camila Ríos', 'camila@ejemplo.com', 0, 'Ya la escuché tres veces seguidas.', 1.7],
    ['Matías Ferreyra', 'matias@ejemplo.com', 3, '¿Tomika es sobre alguien en particular? Me encantó el final.', 2.2],
    ['Lucía Benítez', 'lucia@ejemplo.com', 2, 'Otro mundo tiene un clima increíble, ¿se grabó de noche?', 3],
    ['Santiago Ocampo', 'santiago@ejemplo.com', 4, 'Los coros del segundo estribillo están buenísimos.', 26],
    ['Tomás Aguirre', 'tomas@ejemplo.com', 5, 'Evolución es mi favorita hasta ahora.', 30],
  ];
  JuanaMessages.save(rows.map(([name, email, track, text, hAgo], i) => ({
    id: `demo-${i}`, ts: now - hAgo * H, name, email, track, trackTitle: TITLES[track], text,
  })));
  render();
});

render();
