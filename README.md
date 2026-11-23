# Prelanzamiento

Web pública y escucha del prelanzamiento de su álbum, mediante invitación.

**DEMO:** https://libasoles.github.io/prelanzamiento-juana/

![Captura de la web](assets/internal/screenshot.png)

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

- `sampleo/` – herramienta interna para probar las cuatro tipografías sobre cartón y cuaderno. Acceso directo, sin enlaces desde la web y con `noindex, nofollow, noarchive`; no requiere autenticación y es accesible a quien conozca la URL. Incluye sus fuentes y reutiliza la imagen de cartón de `assets/home/`.
