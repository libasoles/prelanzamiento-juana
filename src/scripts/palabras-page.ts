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
  demasiados_pedidos: 'Pediste muchos links seguidos. Probá de nuevo en un rato.',
  captcha_invalido: 'No pudimos verificar que sos una persona. Probá de nuevo.',
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

// Cloudflare Turnstile: widget 'interaction-only' (invisible salvo que Cloudflare pida un desafío).
// Sin site key (dev y tests) no se carga y el pedido sale sin token.
const SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY as string | undefined;
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};
let turnstileId: string | undefined;
let turnstileToken: string | undefined;
let turnstileWaiter: ((t: string | undefined) => void) | undefined;

function loadTurnstile() {
  const box = document.getElementById('lockTurnstile');
  if (!SITEKEY || !box || document.getElementById('turnstile-api')) return;
  const script = document.createElement('script');
  script.id = 'turnstile-api';
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    const ts = (window as unknown as { turnstile: Turnstile }).turnstile;
    turnstileId = ts.render(box, {
      sitekey: SITEKEY,
      appearance: 'interaction-only',
      callback: (t: string) => {
        turnstileToken = t;
        turnstileWaiter?.(t);
      },
      'expired-callback': () => (turnstileToken = undefined),
      'error-callback': () => turnstileWaiter?.(undefined),
    });
  };
  document.head.appendChild(script);
}

/** Token listo, o espera hasta 10 s a que Cloudflare lo resuelva. */
function getTurnstileToken(): Promise<string | undefined> {
  if (!SITEKEY || turnstileToken) return Promise.resolve(turnstileToken);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), 10_000);
    turnstileWaiter = (t) => {
      clearTimeout(timer);
      resolve(t);
    };
  });
}

// Se carga al tocar el formulario, no en cada visita a la lock.
form?.addEventListener('focusin', loadTurnstile, { once: true });

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = true;
  setStatus(null);
  loadTurnstile();
  const turnstile = await getTurnstileToken();
  const result = await requestLink({
    code: String(data.get('codigo') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    novedades: data.get('novedades') === 'on',
    turnstile,
  });
  // El token es de un solo uso: se pide uno nuevo para el próximo intento.
  turnstileToken = undefined;
  if (turnstileId) (window as unknown as { turnstile: Turnstile }).turnstile.reset(turnstileId);
  if (button) button.disabled = false;
  if (result.ok) {
    setStatus('enviado');
    return;
  }
  const known: RequestError[] = ['codigo_invalido', 'email_invalido', 'espera_un_minuto', 'demasiados_pedidos', 'captcha_invalido', 'red'];
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
