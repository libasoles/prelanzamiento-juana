/**
 * Sesión de /palabras con magic link.
 *
 * Flujo: formulario → POST /auth/request (el Worker manda el mail) →
 * el link llega a /palabras?token=… → POST /auth/verify devuelve una sesión
 * firmada que se guarda en localStorage. Con sesión vigente /palabras muestra
 * la pantalla desbloqueada; sin ella, la lock screen.
 *
 * Límite conocido: el cliente sólo lee el vencimiento de la sesión; la firma
 * la verifica el Worker. Es una barrera de acceso, no protección de los audios
 * (decisión pendiente en el issue #3).
 */

const KEY = 'juana.session';
const API = (import.meta.env.PUBLIC_AUTH_API as string | undefined) ?? '';

export type RequestError =
  | 'email_invalido'
  | 'codigo_invalido'
  | 'espera_un_minuto'
  | 'red'
  | 'interno';

export type Session = { token: string; email: string; exp: number };

function decodePayload(token: string): { email: string; exp: number } | null {
  try {
    const [payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return typeof data.exp === 'number' && typeof data.email === 'string' ? data : null;
  } catch {
    return null;
  }
}

export function getSession(now = Date.now()): Session | null {
  try {
    const token = localStorage.getItem(KEY);
    const data = token && decodePayload(token);
    if (!token || !data || data.exp <= now) {
      localStorage.removeItem(KEY);
      return null;
    }
    return { token, email: data.email, exp: data.exp };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin storage: no hay nada que borrar */
  }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'red' } };
  }
}

export async function requestLink(input: {
  code: string;
  email: string;
  novedades: boolean;
}): Promise<{ ok: true } | { ok: false; error: RequestError }> {
  const { ok, data } = await post('/auth/request', input);
  return ok ? { ok: true } : { ok: false, error: (data.error as RequestError) ?? 'interno' };
}

/** Canjea el token del mail. Guarda la sesión si sale bien. */
export async function verifyToken(token: string): Promise<boolean> {
  const { ok, data } = await post('/auth/verify', { token });
  if (!ok || typeof data.session !== 'string') return false;
  try {
    localStorage.setItem(KEY, data.session);
  } catch {
    return false;
  }
  return true;
}

export type AdminMessage = { id: number; email: string; body: string; created_at: string };
export type AdminError = 'sesion_invalida' | 'no_autorizado' | 'red' | 'interno';

/** Mensajes para /mensajes. Sólo responde a los emails de la lista blanca del Worker (ADMIN_EMAILS). */
export async function fetchAdminMessages(): Promise<{ ok: true; messages: AdminMessage[] } | { ok: false; error: AdminError }> {
  const session = getSession();
  if (!session) return { ok: false, error: 'sesion_invalida' };
  const { ok, data } = await post('/admin/messages', {}, { authorization: `Bearer ${session.token}` });
  if (ok && Array.isArray(data.messages)) return { ok: true, messages: data.messages };
  return { ok: false, error: (data.error as AdminError) ?? 'interno' };
}

export type SendError = 'sesion_invalida' | 'demasiados_mensajes' | 'mensaje_invalido' | 'red' | 'interno';

/** Guarda un mensaje de la persona logueada. Si el Worker rechaza la sesión, la borra para que la próxima visita pida el link. */
export async function sendMessage(body: string): Promise<{ ok: true } | { ok: false; error: SendError }> {
  const session = getSession();
  if (!session) return { ok: false, error: 'sesion_invalida' };
  const { ok, data } = await post('/messages', { body }, { authorization: `Bearer ${session.token}` });
  if (ok) return { ok: true };
  const error = (data.error as SendError) ?? 'interno';
  if (error === 'sesion_invalida') clearSession();
  return { ok: false, error };
}
