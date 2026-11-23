# Juana Notas — v4

Fuente basada en el collage de notas manuscritas suministrado el 23 de noviembre de 2026. Familia nueva: **Juana Notas**, estilo Regular. No reemplaza ni renombra v2/v3.

## Archivos

- `JuanaNotas-Regular.ttf`: instalación en macOS, Windows y programas de diseño.
- `JuanaNotas-Regular.woff` y `.woff2`: web.
- `muestra.png`: prueba de texto con variantes contextuales activadas.

## Procedencia y cobertura

102 recortes revisados. Minúsculas extraídas de la imagen: **a b c d e f g h i j l m n o p q r s t u v y**. Mayúsculas extraídas: **A H L P T**. La L y la P conservan el gesto de los títulos de las notas.

**k, x, z** y las demás mayúsculas se adaptaron de Juana Mano Suave LC (v3, misma autora). **w** combina dos v de esta muestra. Los números, la puntuación y los acentos se dibujaron para completar el juego: no hay muestras numéricas originales en la foto. Los acentos y la ñ se componen sobre las letras; incluye ü/Ü.

111 puntos Unicode y 375 glifos, incluido espacio y espacio inseparable. Cinco variantes por letra. Cuando hay menos de cinco muestras válidas, se completan con deformaciones suaves; no equivalen a cinco muestras originales. `calt` alterna las formas en secuencias de letras; los espacios reinician la secuencia.

La foto se enderezó por página. La tinta azul se separó del papel, se descartaron uniones ambiguas, se retiró el halo fotográfico y se vectorizaron los contornos. Las proporciones y los descendentes se ajustaron para uso tipográfico. Es una interpretación de la caligrafía, con caracteres completados explícitamente documentados.

## Uso web

```css
@font-face {
  font-family: "Juana Notas";
  src: url("JuanaNotas-Regular.woff2") format("woff2"),
       url("JuanaNotas-Regular.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
.notas {
  font-family: "Juana Notas", sans-serif;
  font-feature-settings: "calt" 1;
}
```

## Reconstrucción

Desde la raíz de `juana`:

```sh
uv run --with opencv-python --with numpy --with fonttools --with brotli --with pillow --with potracer --with uharfbuzz python referencias/tipografia/fuente-src/scripts/notas/build_notas.py
```

El generador toma `fuente-src/fuentes/notas/muestra.png` y la fuente v3, guarda recortes, selección y lámina de glifos en `fuente-src/fuentes/notas/` y exporta los tres formatos y la prueba a `v4/`.

## Verificación

Se reabrieron los tres formatos y se comprobó que comparten el mapa de caracteres. Se validaron contornos, márgenes verticales y ausencia de glifos faltantes en abecedarios, español y cifras. HarfBuzz comprobó que `aaaaa` usa cinco variantes diferentes. `muestra.png` se compuso con HarfBuzz y se revisó visualmente.
