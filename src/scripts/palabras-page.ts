/**
 * Acceso a /palabras: decide entre la lock screen y la pantalla desbloqueada.
 *
 * El <head> ya puso `data-auth="in|out"` en <html> antes del primer paint (script inline en
 * palabras.astro); acá se maneja el formulario, el canje del token del mail y, sólo si hay
 * sesión, la carga del reproductor (import dinámico).
 */
import { getSession, requestLink, verifyToken, type RequestError } from './auth';

const html = document.documentElement;
const form = document.getElementById('lockForm') as HTMLFormElement | null;
const status = document.getElementById('lockStatus');

const MESSAGES: Record<string, string> = {
  enviado: 'Te mandamos un link a tu mail.',
  codigo_invalido: 'Ese código no es válido.',
  email_invalido: 'Revisá tu email.',
  espera_un_minuto: 'Esperá un minuto y probá de nuevo.',
  red: 'No pudimos conectarnos. Probá de nuevo.',
  interno: 'Algo salió mal. Probá de nuevo.',
  token_invalido: 'Link vencido o usado.',
};

function setStatus(key: keyof typeof MESSAGES | null) {
  if (!status) return;
  status.textContent = key ? MESSAGES[key] : '';
  status.dataset.state = key === 'enviado' ? 'ok' : key ? 'error' : '';
}

let playerLoaded = false;
async function loadPlayer() {
  if (playerLoaded) return;
  playerLoaded = true;
  const { initPalabras } = await import('./palabras');
  initPalabras();
}

function showUnlocked() {
  html.dataset.auth = 'in';
  void loadPlayer();
}

function showLock(error?: keyof typeof MESSAGES) {
  html.dataset.auth = 'out';
  setStatus(error ?? null);
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = true;
  setStatus(null);
  const result = await requestLink({
    code: String(data.get('codigo') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    novedades: data.get('novedades') === 'on',
  });
  if (button) button.disabled = false;
  if (result.ok) {
    setStatus('enviado');
    return;
  }
  const known: RequestError[] = ['codigo_invalido', 'email_invalido', 'espera_un_minuto', 'red'];
  setStatus(known.includes(result.error) ? result.error : 'interno');
});

async function boot() {
  const url = new URL(location.href);
  // Temporal: ?preview se saltea la autenticación y muestra la página.
  if (url.searchParams.has('preview')) {
    showUnlocked();
    return;
  }
  const token = url.searchParams.get('token');
  if (token) {
    const ok = await verifyToken(token);
    // El token es de un solo uso: se saca de la URL pase lo que pase.
    url.searchParams.delete('token');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (ok) showUnlocked();
    else showLock('token_invalido');
    return;
  }
  if (getSession()) showUnlocked();
  else showLock();
}

void boot();
