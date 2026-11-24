/**
 * Palabras (pantalla desbloqueada): reproductor, letras, menú y mensaje.
 *
 * Se importa dinámicamente desde palabras-page.ts sólo cuando hay sesión. Canciones y
 * letras: palabras-data.ts. La página declara sus elementos con id/clase `js-*`; lo que
 * no existe en una de las dos presentaciones (mobile/desktop) se ignora. El layout
 * (mobile < 768px) se evalúa en vivo con matchMedia, sin recargar.
 */
import { PALABRAS_TRACKS } from './palabras-data';

let started = false;

export function initPalabras(): void {
  if (started) return;
  started = true;

  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
  const media = window.matchMedia('(max-width: 767.98px)');
  const isMobile = () => media.matches;

  const PLAY = 'M8 5v14l11-7z';
  const PAUSE = 'M7 5h4v14H7zM13 5h4v14h-4z';
  const LIST_ICON = 'M4 7h16M4 12h16M4 17h10';
  const VIDEO_ICON = 'M4 6h16v12H4zM10 9.5v5l4.5-2.5z';
  const N = PALABRAS_TRACKS.length;

  const fmt = (s: number) => (isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');
  const nn = (i: number) => String(i + 1).padStart(2, '0');

  const audio = new Audio();
  audio.preload = 'none';
  const S = { current: -1, playing: false, listView: false, lyricsFull: false };
  const stanzas = (i: number) => (i >= 0 ? PALABRAS_TRACKS[i].lyrics.split('\n\n') : []);

  // ---- Lista de canciones ------------------------------------------------
  function renderTracks() {
    $$('.js-tracks').forEach((ol) => {
      ol.innerHTML = '';
      PALABRAS_TRACKS.forEach((t, i) => {
        const on = i === S.current;
        const playing = on && S.playing;
        const li = document.createElement('li');
        li.classList.toggle('on', on);
        const btn = document.createElement('button');
        btn.className = 'trk';
        btn.setAttribute('aria-label', (playing ? 'Pausar ' : 'Escuchar ') + t.title);
        btn.innerHTML =
          '<span class="trk-ico">' +
          (on
            ? `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="${playing ? PAUSE : PLAY}" fill="currentColor"></path></svg>`
            : `<span class="num">${nn(i)}</span><svg class="ico" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="${PLAY}" fill="currentColor"></path></svg>`) +
          '</span><span class="trk-title"></span>';
        btn.querySelector('.trk-title')!.textContent = t.title;
        btn.addEventListener('click', () => (on ? toggle() : select(i, true)));
        li.appendChild(btn);
        ol.appendChild(li);
      });
    });
  }

  // ---- Letras ------------------------------------------------------------
  function activeStanza() {
    const st = stanzas(S.current);
    const frac = audio.duration ? audio.currentTime / audio.duration : 0;
    return { st, idx: Math.min(st.length - 1, Math.floor(frac * st.length)) };
  }
  function renderLyrics() {
    const { st, idx } = activeStanza();
    const mobile = isMobile();
    $$('.js-lyrics').forEach((box) => {
      box.innerHTML = '';
      // La letra a pantalla completa (sólo mobile) se llena cuando se abre.
      if (box.id === 'lyricsScroll' && !S.lyricsFull) return;
      st.forEach((text, i) => {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.cssText = 'margin:0 0 ' + (mobile ? '.7em' : '.5em') + ';white-space:pre-line' + (mobile ? ';opacity:' + (i === idx ? 1 : 0.6) : '');
        box.appendChild(p);
      });
      snapRows(box);
    });
    renderNowLine();
  }
  let lastIdx = -1;
  function renderNowLine() {
    if (isMobile() && S.current >= 0) {
      const { idx } = activeStanza();
      $$('.js-lyrics').forEach((box) => [...box.children].forEach((p, i) => { (p as HTMLElement).style.opacity = String(i === idx ? 1 : 0.6); }));
      // En la letra a pantalla completa la estrofa activa acompaña a la canción (sólo cuando cambia).
      const big = $('lyricsScroll');
      if (S.lyricsFull && big && big.children[idx] && idx !== lastIdx) {
        big.children[idx].scrollIntoView({ block: 'center', behavior: lastIdx === -1 ? 'auto' : 'smooth' });
      }
      lastIdx = idx;
    }
  }

  // ---- Estado visible ----------------------------------------------------
  function renderStatic() {
    const mobile = isMobile();
    const has = S.current >= 0;
    const t = has ? PALABRAS_TRACKS[S.current] : null;
    $$('[data-has-player]').forEach((el) => { el.hidden = !has; });
    // Elementos que sólo existen en el layout mobile hasta que hay canción.
    $$('[data-has-player-m]').forEach((el) => { el.hidden = mobile && !has; });
    $$('[data-no-song]').forEach((el) => { el.hidden = has; });
    $$('.js-now-title').forEach((el) => { el.textContent = t ? t.title : ''; });
    $$('.js-now-count').forEach((el) => { el.textContent = has ? `Canción ${S.current + 1} de ${N}` : ''; });
    $$<HTMLButtonElement | HTMLInputElement>('.js-prev,.js-next,.js-seek').forEach((el) => { el.disabled = !has; });
    $$('.js-prev,.js-next').forEach((el) => { el.style.opacity = has ? '1' : '0.4'; });
    const list = $('trackList');
    const visual = $('visual');
    if (mobile) {
      if (list) list.hidden = !(!has || S.listView);
      if (visual) visual.hidden = !(has && !S.listView);
      const vb = $('toggleView');
      if (vb) {
        vb.style.visibility = has ? 'visible' : 'hidden';
        vb.setAttribute('aria-label', S.listView ? 'Ver video' : 'Ver lista de canciones');
      }
      $('viewIcon')?.setAttribute('d', S.listView ? VIDEO_ICON : LIST_ICON);
      const lyricsFull = $('lyricsFull');
      if (lyricsFull) lyricsFull.hidden = !(has && S.lyricsFull);
      document.body.style.overflow = has && S.lyricsFull ? 'hidden' : '';
    } else {
      // En desktop la lista y la pantalla siempre se ven.
      if (list) list.hidden = false;
      if (visual) visual.hidden = false;
      const lyricsFull = $('lyricsFull');
      if (lyricsFull) lyricsFull.hidden = true;
      document.body.style.overflow = '';
    }
    renderMedia();
    renderLyrics();
    renderTracks();
    renderPlayState();
  }
  function renderMedia() {
    const t = S.current >= 0 ? PALABRAS_TRACKS[S.current] : null;
    const stars = $('visualStars');
    if (stars) stars.hidden = !!(t && (t.video || t.poster));
    (['visual', 'lyrics'] as const).forEach((p) => {
      const video = $<HTMLVideoElement>(p + 'Video');
      const poster = $<HTMLImageElement>(p + 'Poster');
      if (!video || !poster) return;
      // El video de la letra a pantalla completa sólo se carga mientras está abierta.
      const active = p === 'visual' || S.lyricsFull;
      const hasVideo = !!(t && t.video && active);
      const src = hasVideo && t?.video ? new URL(t.video, location.href).href : '';
      if (video.src !== src) { if (src) video.src = src; else video.removeAttribute('src'); }
      if (hasVideo && t?.poster) video.poster = t.poster;
      video.hidden = !(hasVideo && S.playing);
      poster.hidden = !(hasVideo && !S.playing && t?.poster);
      if (!poster.hidden && t?.poster) poster.src = t.poster;
      if (!video.hidden) video.play().catch(() => {}); else video.pause();
    });
  }
  function renderPlayState() {
    $$('.js-play-path').forEach((p) => p.setAttribute('d', S.playing ? PAUSE : PLAY));
    $$('.js-play').forEach((b) => b.setAttribute('aria-label', S.playing ? 'Pausar' : 'Reproducir'));
  }
  function renderTime() {
    const d = audio.duration || 0;
    $$('.js-time-now').forEach((el) => { el.textContent = fmt(audio.currentTime); });
    $$('.js-time-total').forEach((el) => { el.textContent = fmt(d); });
    $$<HTMLInputElement>('.js-seek').forEach((el) => { el.value = String(d ? Math.round((audio.currentTime / d) * 1000) : 0); });
    if (!document.activeElement || !document.activeElement.classList.contains('js-lyrics')) renderNowLine();
  }

  // ---- Reproducción ------------------------------------------------------
  function select(i: number, play: boolean) {
    S.current = (i + N) % N;
    const t = PALABRAS_TRACKS[S.current];
    S.listView = false;
    audio.pause();
    if (t.audio) { audio.src = t.audio; audio.load(); } else { audio.removeAttribute('src'); audio.load(); }
    S.playing = !!play && !!t.audio;
    if (S.playing) audio.play().catch(() => { S.playing = false; renderStatic(); });
    renderStatic();
    renderTime();
    scrollToVisual();
  }
  // Mobile: al arrancar la reproducción con video, la pantalla del video queda pegada al borde
  // superior del viewport (2px de aire arriba) (la placa del reproductor queda por encima, fuera de vista).
  let scrollFix = 0;
  function scrollToVisual() {
    if (!isMobile() || !S.playing || S.lyricsFull) return;
    const v = $('visual');
    if (!v || v.hidden || !PALABRAS_TRACKS[S.current].video) return;
    const top = () => (v.querySelector('.screen') || v).getBoundingClientRect().top + window.scrollY - 2;
    requestAnimationFrame(() => window.scrollTo({ top: top(), behavior: 'smooth' }));
    // Si el scroll suave se interrumpe (layout que cambia, navegador móvil), se corrige al final.
    clearTimeout(scrollFix);
    scrollFix = window.setTimeout(() => {
      if (Math.abs(top() - window.scrollY) > 1) window.scrollTo({ top: top(), behavior: 'auto' });
    }, 800);
  }
  function toggle() {
    if (S.current < 0) { select(0, true); return; }
    if (!PALABRAS_TRACKS[S.current].audio) return;
    S.playing = !S.playing;
    if (S.playing) audio.play().catch(() => { S.playing = false; renderStatic(); }); else audio.pause();
    renderStatic();
    if (S.playing) scrollToVisual();
  }
  audio.addEventListener('timeupdate', renderTime);
  audio.addEventListener('loadedmetadata', renderTime);
  audio.addEventListener('ended', () => select(S.current + 1, true));

  $$('.js-play').forEach((b) => b.addEventListener('click', toggle));
  $$('.js-prev').forEach((b) => b.addEventListener('click', () => select(S.current - 1, true)));
  $$('.js-next').forEach((b) => b.addEventListener('click', () => select(S.current + 1, true)));
  $$<HTMLInputElement>('.js-seek').forEach((el) => el.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (Number(el.value) / 1000) * audio.duration;
  }));

  // ---- Mobile: lista/video y letra a pantalla completa --------------------
  $('toggleView')?.addEventListener('click', () => { S.listView = !S.listView; renderStatic(); });
  // Letra a pantalla completa: se abre tocando la tarjeta «Letra» y se minimiza con el ícono.
  let lyricsOpener: HTMLElement | null = null;
  $$('.js-open-lyrics').forEach((el) => el.addEventListener('click', () => {
    if (!isMobile()) return;
    lyricsOpener = el.querySelector('button') || el;
    lastIdx = -1; S.lyricsFull = true; renderStatic(); $('closeLyrics')?.focus();
  }));
  const closeLyrics = () => { S.lyricsFull = false; lastIdx = -1; renderStatic(); lyricsOpener?.focus(); };
  $('closeLyrics')?.addEventListener('click', closeLyrics);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.lyricsFull) closeLyrics();
  });
  media.addEventListener('change', () => { if (!isMobile()) S.lyricsFull = false; renderStatic(); });

  // ---- Letras en papel de cuaderno: el fondo de renglones queda fijo y el texto avanza siempre
  // de a renglones enteros, así cada línea de texto coincide con una raya dibujada.
  // - Alto de renglón (px): variable CSS --row de .renglones (48 en desktop, 40 en mobile).
  const rowH = (box: HTMLElement) => parseFloat(getComputedStyle(box).getPropertyValue('--row')) || 48;
  // Puntos de enganche (scroll-snap) cada renglón, para touch, teclado y barra de scroll; y un
  // relleno al final para que el último renglón también quede alineado.
  function snapRows(box: HTMLElement) {
    if (!box.matches('.renglones')) return;
    const LH = rowH(box);
    box.querySelectorAll('i[data-snap]').forEach((n) => n.remove());
    box.style.scrollSnapType = 'y mandatory';
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    const pad = (LH - ((box.scrollHeight - box.clientHeight) % LH)) % LH;
    if (pad) { const sp = document.createElement('i'); sp.dataset.snap = '1'; sp.setAttribute('aria-hidden', 'true'); sp.style.cssText = 'display:block;height:' + pad + 'px'; box.appendChild(sp); }
    const max = Math.max(0, box.scrollHeight - box.clientHeight);
    for (let k = 0; k * LH <= max; k++) {
      const m = document.createElement('i');
      m.dataset.snap = '1';
      m.setAttribute('aria-hidden', 'true');
      m.style.cssText = 'position:absolute;left:0;top:' + k * LH + 'px;width:1px;height:1px;scroll-snap-align:start;pointer-events:none';
      box.appendChild(m);
    }
  }
  // Rueda / trackpad: avanza de a renglones exactos (sin posiciones intermedias). En los extremos
  // deja que la página siga scrolleando.
  $$('.js-lyrics.renglones').forEach((box) => {
    // La caja puede estar oculta al renderizar (alto 0): se recalcula cuando cambia de tamaño.
    if (window.ResizeObserver) new ResizeObserver(() => snapRows(box)).observe(box);
    let acc = 0;
    let idle = 0;
    box.addEventListener('wheel', (e) => {
      const LH = rowH(box);
      if (e.ctrlKey || !e.deltaY) return;
      const dy = e.deltaMode === 1 ? e.deltaY * LH : e.deltaMode === 2 ? e.deltaY * box.clientHeight : e.deltaY;
      const max = box.scrollHeight - box.clientHeight;
      if ((dy < 0 && box.scrollTop <= 0) || (dy > 0 && box.scrollTop >= max - 1)) { acc = 0; return; }
      e.preventDefault();
      acc += dy;
      clearTimeout(idle); idle = window.setTimeout(() => { acc = 0; }, 200);
      const steps = Math.trunc(acc / LH);
      if (!steps) return;
      acc -= steps * LH;
      const to = Math.round(box.scrollTop / LH) * LH + steps * LH;
      box.scrollTo({ top: Math.max(0, Math.min(max, to)), behavior: 'auto' });
    }, { passive: false });
    // Touch: el dedo arrastra la letra de a renglones enteros (igual que la rueda en desktop) y un
    // gesto rápido sigue unos renglones más. En los extremos deja que la página siga scrolleando.
    let ty = 0;
    let tAcc = 0;
    let tOwn: boolean | null = false;
    let tMoved = false;
    let tLast = 0;
    let tV = 0;
    let tT = 0;
    let fling = 0;
    const stepBy = (steps: number) => {
      const LH = rowH(box);
      const max = box.scrollHeight - box.clientHeight;
      const to = Math.round(box.scrollTop / LH) * LH + steps * LH;
      box.scrollTo({ top: Math.max(0, Math.min(max, to)), behavior: 'auto' });
    };
    box.addEventListener('touchstart', (e) => {
      clearTimeout(fling);
      if (e.touches.length !== 1) { tOwn = false; return; }
      ty = tLast = e.touches[0].clientY; tT = e.timeStamp; tV = 0; tAcc = 0; tOwn = null; tMoved = false;
    }, { passive: true });
    box.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1 || tOwn === false) return;
      const LH = rowH(box);
      const y = e.touches[0].clientY;
      const dy = tLast - y;
      const max = box.scrollHeight - box.clientHeight;
      if (tOwn === null) {
        if (Math.abs(ty - y) < 4) return;
        const atEdge = (dy < 0 && box.scrollTop <= 0) || (dy > 0 && box.scrollTop >= max - 1);
        tOwn = !atEdge;
        if (!tOwn) return;
      }
      e.preventDefault();
      tMoved = true;
      const dt = e.timeStamp - tT || 1;
      tV = 0.7 * tV + 0.3 * (dy / dt); tT = e.timeStamp; tLast = y;
      tAcc += dy;
      const steps = Math.trunc(tAcc / LH);
      if (!steps) return;
      tAcc -= steps * LH;
      stepBy(steps);
    }, { passive: false });
    box.addEventListener('touchend', () => {
      if (!tOwn) return;
      const LH = rowH(box);
      let left = Math.max(-8, Math.min(8, Math.round(tV * 220 / LH)));
      const dir = Math.sign(left);
      const tick = () => {
        if (!left) return;
        stepBy(dir); left -= dir;
        fling = window.setTimeout(tick, 40 + 25 * (Math.abs(Math.round(tV * 220 / LH)) - Math.abs(left)));
      };
      tick();
    }, { passive: true });
    // El gesto de arrastre no debe contar como toque (la caja abre la letra a pantalla completa).
    box.addEventListener('click', (e) => { if (tMoved) { e.stopPropagation(); tMoved = false; } }, true);
    // Respaldo (navegadores sin scroll-snap): al terminar el scroll, se acomoda al renglón más cercano.
    let t = 0;
    box.addEventListener('scroll', () => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        const LH = rowH(box);
        const to = Math.round(box.scrollTop / LH) * LH;
        if (Math.abs(to - box.scrollTop) > 0.5) box.scrollTo({ top: to, behavior: 'auto' });
      }, 120);
    }, { passive: true });
  });
  // ---- Animación del reproductor: los cuadros sólo cambian mientras hay scroll ----
  // (página o caja de letras). Se pausa poco después de que el scroll se detiene.
  {
    let t = 0;
    document.addEventListener('scroll', () => {
      document.documentElement.classList.add('is-scrolling');
      clearTimeout(t);
      t = window.setTimeout(() => document.documentElement.classList.remove('is-scrolling'), 180);
    }, { capture: true, passive: true });
  }

  // ---- Menú --------------------------------------------------------------
  const menuBtn = $('menuBtn');
  const menu = $('menu');
  if (menuBtn && menu) {
    const setMenu = (open: boolean) => {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    menuBtn.addEventListener('click', () => setMenu(!!menu.hidden));
    menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  // ---- Mensaje -----------------------------------------------------------
  const form = $<HTMLFormElement>('msgForm');
  const thanks = $('msgThanks');
  const msg = $<HTMLTextAreaElement>('msg');
  if (form && thanks && msg) {
    msg.addEventListener('input', () => { msg.style.height = 'auto'; msg.style.height = msg.scrollHeight + 'px'; });
    // Prototipo: igual que el acceso, todavía no hay backend; sólo se muestra el agradecimiento.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (thanks.hidden === false) return;
      // El agradecimiento reemplaza al textarea dentro del mismo papel, con su altura fija: sin salto de layout.
      const paper = $('msgPaper');
      if (paper) paper.style.minHeight = paper.offsetHeight + 'px';
      msg.hidden = true;
      thanks.hidden = false;
      const abrazo = $('msgAbrazo');
      if (abrazo) abrazo.hidden = false;
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((b) => { b.disabled = true; b.setAttribute('aria-label', 'Enviado'); });
      form.querySelectorAll('.js-send-label').forEach((l) => { l.textContent = 'Enviado'; });
      form.querySelectorAll('.js-send-ico').forEach((svg) => { svg.innerHTML = '<path d="M10 30L25 45L54 11"></path>'; });
      thanks.focus({ preventScroll: true });
    });
  }

  renderStatic();
  renderTime();
}
