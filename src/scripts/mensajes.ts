/**
 * Panel /mensajes: lo que le dejaron a Juana.
 *
 * Los datos sólo los entrega el Worker a los emails de ADMIN_EMAILS; esta página
 * es un cascarón sin datos. `?preview` muestra mensajes de ejemplo (nunca reales)
 * para ver el diseño sin iniciar sesión.
 */
import { fetchAdminMessages, type AdminMessage } from './auth';

const HOUR = 36e5;
const SAMPLE: AdminMessage[] = [
  { id: 3, email: 'ana@example.com', body: 'Escuché el disco entero en el colectivo. «Palabras» me dejó llorando. Gracias por tanto.', created_at: new Date(Date.now() - HOUR).toISOString() },
  { id: 2, email: 'beto@example.com', body: 'Me hizo acordar a mi abuela.\nCuándo tocás en Rosario?', created_at: new Date(Date.now() - 26 * HOUR).toISOString() },
  { id: 1, email: 'caro@example.com', body: 'Hermoso todo. Un abrazo grande.', created_at: new Date(Date.now() - 216 * HOUR).toISOString() },
];

const root = document.getElementById('msgRoot') as HTMLElement;
const list = document.getElementById('msgList') as HTMLOListElement;
const count = document.getElementById('msgCount') as HTMLElement;
const notice = document.getElementById('msgNotice') as HTMLElement;

const setState = (state: string, text = '') => {
  root.dataset.state = state;
  notice.textContent = text;
};

const fmt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' });

function render(messages: AdminMessage[], preview: boolean) {
  list.replaceChildren(
    ...messages.map((m) => {
      const li = document.createElement('li');
      li.className = 'ms-item';
      const head = document.createElement('div');
      head.className = 'ms-head';
      const who = document.createElement('span');
      who.className = 'ms-who';
      who.textContent = m.email;
      const when = document.createElement('time');
      when.dateTime = m.created_at;
      when.textContent = fmt.format(new Date(m.created_at));
      head.append(who, when);
      const body = document.createElement('p'); // textContent: el mensaje nunca se interpreta como HTML
      body.className = 'ms-body';
      body.textContent = m.body;
      li.append(head, body);
      return li;
    }),
  );
  count.textContent = messages.length === 1 ? '1 mensaje' : `${messages.length} mensajes`;
  setState(messages.length ? 'list' : 'empty', preview ? 'Vista previa con mensajes de ejemplo.' : '');
}

async function init() {
  if (/[?&]preview(=|&|$)/.test(location.search)) return render(SAMPLE, true);
  const res = await fetchAdminMessages();
  if (res.ok) return render(res.messages, false);
  if (res.error === 'sesion_invalida') return setState('login');
  if (res.error === 'no_autorizado') return setState('denied');
  setState('error');
}

init();
