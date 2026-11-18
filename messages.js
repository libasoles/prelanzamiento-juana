// ---- Almacenamiento de mensajes (prototipo) -----------------------------
// Hoy se guarda en localStorage: el admin solo ve lo enviado desde el mismo
// navegador. Para producción, reemplazar estas funciones por llamadas a un
// backend (misma interfaz: all / add) y el resto de la web no cambia.
const JuanaMessages = (() => {
  const KEY = 'juana-messages';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  }

  // msg: { name, email, track (índice), trackTitle, text }
  function add(msg) {
    const list = all();
    const item = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), ts: Date.now(), ...msg };
    list.push(item);
    save(list);
    return item;
  }

  function clear() { save([]); }

  return { all, add, save, clear };
})();
