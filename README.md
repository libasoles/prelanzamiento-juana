# Prelanzamiento

Web pública y escucha del prelanzamiento de su álbum, mediante invitación.

**DEMO:** https://libasoles.github.io/prelanzamiento-juana/

![Captura de la web](assets/internal/screenshot.png)

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `palabras-escucha-desktop.html` / `palabras-escucha-mobile.html` – Palabras con acceso (pantalla desbloqueada, diseño «Palabras (con acceso)»). Lógica en `palabras.js`, canciones y letras en `palabras-data.js`. Se ven sólo con `palabras-desktop.html?preview` (o `palabras-mobile.html?preview`); sin el parámetro redirigen al acceso. Es temporal: no es una protección real. Audios: masters de `JUANA audios/MSTER` en MP3 (`audio/01..05.mp3`); faltan las canciones 6 a 8.
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

- `sampleo/` – herramienta interna para probar las cinco tipografías sobre cartón y cuaderno. Acceso directo, sin enlaces desde la web y con `noindex, nofollow, noarchive`; no requiere autenticación y es accesible a quien conozca la URL. Incluye sus fuentes y reutiliza la imagen de cartón de `assets/home/`.
