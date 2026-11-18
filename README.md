# prelanzamiento-juana

Web de prelanzamiento del álbum *Palabras* de Juana: pase de escucha con código, datos del oyente, reproductor y mensajes asociados a cada canción.

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

Códigos de prueba: `JUANA`, `PALAB`.
