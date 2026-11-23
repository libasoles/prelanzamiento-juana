# Prelanzamiento

Web pública y escucha del prelanzamiento de su álbum, mediante invitación.

**DEMO:** https://libasoles.github.io/prelanzamiento-juana/

![Captura de la web](assets/internal/screenshot.png)

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `palabras-escucha-desktop.html` / `palabras-escucha-mobile.html` – Palabras con acceso (pantalla desbloqueada, diseño «Palabras (con acceso)»). Lógica en `palabras.js`, canciones y letras en `palabras-data.js`. Se ven sólo con `palabras-desktop.html?preview` (o `palabras-mobile.html?preview`); sin el parámetro redirigen al acceso. Es temporal: no es una protección real. Audios: masters de `JUANA audios/MIX 1` en MP3 (`audio/01..05.mp3`); faltan las canciones 6 a 8.
  - Reproductor analógico/vintage (diseño «Palabras · reproductor vintage»): cuerpo de cartón rasgado (`assets/palabras/carton-liso.jpg`, recorte liso de `assets/home/papel-cinta-a.webp` sin la cinta), pantalla Super 8 para el video, lista como carátula de casete, teclas mecánicas y letra mecanografiada en papel de cuaderno. Las fotos (`pistas/02.webp`, `pistas/03.webp`) y las cintas rectas van detrás del contenido y sólo asoman por los bordes. Todo se adapta con HTML/CSS de las páginas: `palabras.js` no sabe nada del estilo; depende de las clases `js-*` y de los ids `visual`, `trackList`, `toggleView`, etc. Para que el reproductor se vea parejo con las teclas deshabilitadas, el CSS usa `!important` sobre la opacidad y el margen/opacidad de las estrofas que escribe el JS en línea.
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

- `sampleo/` – herramienta interna para probar las cinco tipografías sobre cartón y cuaderno. Acceso directo, sin enlaces desde la web y con `noindex, nofollow, noarchive`; no requiere autenticación y es accesible a quien conozca la URL. Incluye sus fuentes y reutiliza la imagen de cartón de `assets/home/`.

## Animaciones manuales de Palabras

Excepción autorizada al artifact de diseño: el reproductor de `palabras-escucha-desktop.html` muestra al caballo corriendo y a las estrellas danzando mediante dibujos distintos cuadro a cuadro. Al reimportar o reimplementar el diseño, conservar las clases `.deco-stars` y `.deco-horse`, el ID `visualStars` (usado por `palabras.js`), los sprites `assets/palabras/caballo-galope-6fps.png` y `assets/palabras/estrellas-danza-6fps.png`, los keyframes `deco-frames` y la regla `prefers-reduced-motion` que deja quieto el primer cuadro. Cada sprite transparente mide 1536 × 1024 y contiene seis cuadros de 512 × 512 en una grilla de 3 columnas y 2 filas, en orden de lectura. Se reproduce un ciclo de un segundo con `steps(1,end)`: 6 fps. Los cuadros sólo avanzan mientras hay scroll (página o caja de letras): `palabras.js` marca `html.is-scrolling` y el CSS pasa `animation-play-state` de `paused` a `running`. Preservar esta animación aunque el artifact tenga figuras estáticas; cambiarla sólo por pedido explícito del usuario. El pedido es animar las poses y formas, no desplazar o rotar el asset estático. Las imágenes originales se conservan para las otras apariciones.

Generación: herramienta integrada `imagegen`, usando los dibujos originales como referencia de estilo. Prompts: seis poses sucesivas de galope hacia la izquierda, con patas que se recogen y extienden y cola articulada; seis poses de cuatro estrellas irregulares que danzan con contornos y conexiones cambiantes. Planchas 3 × 2, escala y centro estables, siluetas negras sin halos sobre transparencia real. El CSS las convierte a blanco y mantiene la opacidad del reproductor.
