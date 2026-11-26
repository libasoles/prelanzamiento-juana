/**
 * Panel /mensajes: lo que le dejaron a Juana.
 *
 * Los datos sólo los entrega el Worker a los emails de ADMIN_EMAILS; esta página
 * es un cascarón sin datos. `?preview` muestra mensajes de ejemplo (nunca reales)
 * para ver el diseño sin iniciar sesión.
 */
import { fetchAdminMessages, type AdminMessage } from './auth';

const DAY = 864e5;
const ejemplo: [string, number, string][] = [
  ['ana@example.com', 0, 'Escuché el disco entero en el colectivo. «Palabras» me dejó llorando. Gracias por tanto.'],
  ['beto@example.com', 1, 'Me hizo acordar a mi abuela.\nCuándo tocás en Rosario?'],
  ['caro@example.com', 1, 'Hermoso todo. Un abrazo grande.'],
  ['dani@example.com', 2, 'La canción del final no me la saco de la cabeza hace días.'],
  ['eli@example.com', 3, 'Se lo mandé a mi mamá y me llamó para decirme que lloró en la cocina.'],
  ['fede@example.com', 4, 'Gracias por las letras escritas a mano. Las imprimí y las puse en la heladera.'],
  ['gabi@example.com', 5, 'Qué voz.'],
  ['hugo@example.com', 6, 'Te escuché en Corrientes hace años y no me olvido más. Ahora el disco me devolvió esa noche.'],
  ['ine@example.com', 8, 'Lo escucho todas las mañanas antes de salir a trabajar.'],
  ['juli@example.com', 12, 'Feliz por vos. Se nota que cada palabra tiene su lugar.'],
  ['karen@example.com', 16, 'Mi hija de 6 años pide «la de Juana» en el auto.'],
  ['lucho@example.com', 33, 'Esperé mucho este disco y valió cada día. Gracias.'],
  ['mica@example.com', 40, 'Gracias por animarte a mostrar el proceso. Se siente cerca.'],
  ['nico@example.com', 70, 'Las letras me acompañaron todo el verano.'],
];
const SAMPLE: AdminMessage[] = ejemplo.map(([email, dias, body], i) => ({
  id: ejemplo.length - i,
  email,
  body,
  created_at: new Date(Date.now() - dias * DAY).toISOString(),
}));

const root = document.getElementById('msgRoot') as HTMLElement;
const list = document.getElementById('msgList') as HTMLOListElement;
const count = document.getElementById('msgCount') as HTMLElement;
const notice = document.getElementById('msgNotice') as HTMLElement;
const more = document.getElementById('msgMore') as HTMLElement;
const moreBtn = document.getElementById('msgMoreBtn') as HTMLButtonElement;
const shown = document.getElementById('msgShown') as HTMLElement;
const pdf = document.getElementById('msgPdf') as HTMLButtonElement;

const PAGE_SIZE = 12;
const GIROS = [-0.8, 0.7, 0.5, -0.6];
const CINTAS = [-4, 5, -6, 3];

const setState = (state: string, text = '') => {
  root.dataset.state = state;
  notice.textContent = text;
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** «hoy», «ayer», «hace 4 días», «hace 2 semanas», «hace 3 meses»… Cuenta días de calendario, sin hora. */
function timeAgo(iso: string, now = new Date()): string {
  const days = Math.max(0, Math.round((dayStart(now) - dayStart(new Date(iso))) / 864e5));
  if (days < 1) return 'hoy';
  if (days < 2) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return 'hace 1 semana';
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  if (days < 60) return 'hace 1 mes';
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'hace 1 año' : `hace ${years} años`;
}

const fullDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function updateMore(total: number, visible: number) {
  more.hidden = visible >= total;
  shown.textContent = `Mostrando ${visible} de ${total}`;
}

function render(messages: AdminMessage[], preview: boolean) {
  list.replaceChildren(
    ...messages.map((m, i) => {
      const li = document.createElement('li');
      li.className = 'ms-item';
      li.style.setProperty('--giro', `${GIROS[i % GIROS.length]}deg`);
      li.style.setProperty('--cinta-giro', `${CINTAS[i % CINTAS.length]}deg`);
      li.hidden = i >= PAGE_SIZE;
      const head = document.createElement('div');
      head.className = 'ms-head';
      const who = document.createElement('span');
      who.className = 'ms-who';
      who.textContent = m.email;
      const when = document.createElement('time');
      when.dateTime = m.created_at;
      when.title = fullDate.format(new Date(m.created_at));
      when.dataset.fecha = shortDate.format(new Date(m.created_at)); // la hoja de impresion muestra esta fecha en vez del hace-n-dias
      when.textContent = timeAgo(m.created_at);
      head.append(who, when);
      const body = document.createElement('p'); // textContent: el mensaje nunca se interpreta como HTML
      body.className = 'ms-body';
      body.textContent = m.body;
      li.append(head, body);
      return li;
    }),
  );
  count.textContent = messages.length === 1 ? '1 mensaje' : `${messages.length} mensajes`;
  pdf.hidden = messages.length === 0;
  updateMore(messages.length, Math.min(PAGE_SIZE, messages.length));
  setState(messages.length ? 'list' : 'empty', preview ? 'Vista previa con mensajes de ejemplo.' : '');
}

moreBtn.addEventListener('click', () => {
  const hidden = [...list.querySelectorAll<HTMLElement>('.ms-item[hidden]')];
  hidden.slice(0, PAGE_SIZE).forEach((li) => (li.hidden = false));
  updateMore(list.children.length, list.children.length - Math.max(0, hidden.length - PAGE_SIZE));
});

// «Descargar PDF»: abre el diálogo de impresión; la hoja de estilos de impresión incluye todos los mensajes.
pdf.addEventListener('click', () => window.print());
// Safari y otros no respetan @page { margin: 0 }: el titulo de la pestana no debe salir impreso.
const title = document.title;
window.addEventListener('beforeprint', () => (document.title = ' '));
window.addEventListener('afterprint', () => (document.title = title));

async function init() {
  if (/[?&]preview(=|&|$)/.test(location.search)) return render(SAMPLE, true);
  const res = await fetchAdminMessages();
  if (res.ok) return render(res.messages, false);
  if (res.error === 'invalid_session') return setState('login');
  if (res.error === 'forbidden') return setState('denied');
  setState('error');
}

init();
