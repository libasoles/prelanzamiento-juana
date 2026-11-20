# prelanzamiento-juana

Web de prelanzamiento del álbum *Palabras* de Juana: pase de escucha con código, datos del oyente, reproductor y mensajes asociados a cada canción.

- `index.html` – sitio público (código → nombre y email → reproductor + mensajes)
- `admin.html` – vista de solo lectura de los mensajes (sin respuestas)
- `messages.js` – capa de almacenamiento. **Prototipo:** usa `localStorage`, así que el admin solo ve mensajes enviados desde el mismo navegador. Para producción hay que reemplazarla por un backend.

Códigos de prueba: `JUANA`, `PALAB`.

## Hero líquido de `home-desktop.html` (reaplicar al reimportar diseños)

`home-desktop.html` viene de un diseño fijo de 1440×720; el hero se hizo líquido a mano para que la imagen de Juana crezca con el alto del viewport y todo (hasta los iconos de redes) entre sin scroll. Si se reimporta el diseño, este cambio se pierde y hay que reaplicarlo.

- `<section>` del hero: `style="--ih:clamp(420px,calc(100vh - 340px),800px);position:relative;height:calc(var(--ih) + 80px);overflow:hidden"`.
  - `--ih` es el alto de la imagen de Juana. `340px` es lo que ocupan header + título + subtítulo + iconos debajo del hero; si cambia ese bloque, ajustar. Mínimo 420px, tope 800px (en pantallas grandes no se usa todo el espacio).
- Todo lo del hero escala con `--ih` (valores originales de 1440×720 entre paréntesis):
  - `juana-cuerpo-a.webp`: `height:var(--ih)` (640px), `top:70px`.
  - `estrella-blanca-a.webp`: `margin-left:calc(var(--ih) * -.625)` (-400px), `top:calc(70px + var(--ih) * .094)` (130px), `width:calc(var(--ih) * .172)` (110px).
  - `trazos-a.webp`: `margin-left:calc(var(--ih) * -.531)` (-340px), `top:calc(70px + var(--ih) * .516)` (400px), `width:calc(var(--ih) * .969)` (620px).
  - `logo-blanco-crop.webp`: `margin-left:calc(var(--ih) * .234)` (150px), `bottom:30px`, `width:calc(var(--ih) * .4375)` (280px).
- Los px originales dividen por 640 para dar los factores. Cualquier elemento nuevo del hero debe expresarse igual (px original / 640 × `--ih`).
