# Prelanzamiento

Web de prelanzamiento del álbum de una artista joven: pase de escucha con código, datos del oyente, reproductor y mensajes asociados a cada canción.

**DEMO:** https://libasoles.github.io/prelanzamiento-juana/

![Captura de la web](assets/internal/screenshot.png)

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

Códigos de prueba: ver `VALID_CODES` en `app.js`.
