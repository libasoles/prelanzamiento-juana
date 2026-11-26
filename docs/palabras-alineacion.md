# Alineación de letras de «Palabras»

Tiempos de inicio de cada verso, medidos sobre `public/audio/NN.mp3`. Archivo: `src/scripts/palabras-times.json`.

**Estado: parcial.** Alineación forzada (stable-ts + faster-whisper large-v3, `language="es"`) sobre el stem de voz de demucs (htdemucs). Los versos marcados ⚠ necesitan revisión manual. Nadie escuchó el audio: la verificación fue automática. Se cortaron ~4 s del stem de voz desde el tiempo de 4 versos por canción y se transcribieron con whisper large-v3. Resultado: 01 (4/4), 03 (3/4; el 4.º está marcado ⚠), 04 (4/4, uno con palabras deformadas) y 05 (4/4) coinciden con la letra; en 02, 2/4 coinciden, uno es el 26 (arranca antes de tiempo, marcado ⚠) y otro cae en un verso interpolado. Además se comprobó que el stem tenga energía al inicio de cada verso. Canciones 06 (Alquimista), 07 (Todavía) y 08 (Mentían): sin audio, no alineadas.

## Resumen

- 01: 20 versos, 4 de baja confianza, dura 2:53.73 (173.73 s)
- 02: 50 versos, 19 de baja confianza, dura 3:52.02 (232.02 s)
- 03: 27 versos, 8 de baja confianza, dura 2:53.87 (173.87 s)
- 04: 39 versos, 13 de baja confianza, dura 4:06.74 (246.74 s)
- 05: 43 versos, 2 de baja confianza, dura 3:06.86 (186.86 s)

## 01 · A la deriva — 2:53.73 (173.73 s)

| # | Tiempo | Verso | Confianza |
|--:|--:|---|---|
| 1 | 0:05.63 (5.63) | He perdido los caminos | ok |
| 2 | 0:11.17 (11.17) | por mirarte sin un mapa adivino, | ok |
| 3 | 0:19.23 (19.23) | Me caí en el abismo, | ok |
| 4 | 0:23.89 (23.89) | no te miento | ok |
| 5 | 0:26.67 (26.67) | valió la pena el sentimiento. | ok |
| 6 | 0:31.93 (31.93) | Tengo varias confesiones | ⚠ sin voz detectada en el stem al inicio |
| 7 | 0:36.27 (36.27) | a la deriva, | ok |
| 8 | 0:40.73 (40.73) | pero temo a tu silencio sin salida. | ok |
| 9 | 1:02.83 (62.83) | Me perdido en tu mirar | ⚠ salto de 22.1 s desde el verso anterior |
| 10 | 1:05.40 (65.40) | Parecía calma en el mar | ok |
| 11 | 1:12.16 (72.16) | Y aunque el sol cambie de lado | ok |
| 12 | 1:15.64 (75.64) | Yo en tus aguas me he quedado. | ok |
| 13 | 1:24.00 (84.00) | He perdido los caminos | ⚠ sin voz detectada en el stem al inicio |
| 14 | 1:29.30 (89.30) | por mirarte sin un mapa adivino. | ok |
| 15 | 1:36.46 (96.46) | Me caí en el abismo, | ok |
| 16 | 1:39.74 (99.74) | no te miento | ok |
| 17 | 1:41.20 (101.20) | valió la pena el sentimiento | ok |
| 18 | 1:46.18 (106.18) | Tengo varias confesiones | ok |
| 19 | 1:48.12 (108.12) | A la deriva | ok |
| 20 | 1:50.62 (110.62) | Pero temo a tu silencio sin salida | ⚠ duración 63.1 s > 25 |

## 02 · Palabras — 3:52.02 (232.02 s)

| # | Tiempo | Verso | Confianza |
|--:|--:|---|---|
| 1 | 0:09.41 (9.41) | que pasa | ⚠ duración 0.78 s < 0,8 |
| 2 | 0:10.19 (10.19) | si escucho una melodía | ok |
| 3 | 0:14.63 (14.63) | y me acuerdo de un recuerdo | ok |
| 4 | 0:18.51 (18.51) | que pasa | ok |
| 5 | 0:19.39 (19.39) | si tengo verdades bien guardadas | ok |
| 6 | 0:23.87 (23.87) | que a veces quieren ser pronunciadas | ok |
| 7 | 0:26.97 (26.97) | que pasa si te digo | ok |
| 8 | 0:32.81 (32.81) | que el frío | ok |
| 9 | 0:33.75 (33.75) | se volvió mi enemigo | ok |
| 10 | 0:36.13 (36.13) | y necesito de tu abrigo | ok |
| 11 | 0:41.59 (41.59) | te irás o te quedarás cuando venga mi otoño sin sentido | ok |
| 12 | 0:54.31 (54.31) | no pasa nada si te digo un te amo | ok |
| 13 | 1:01.33 (61.33) | o un te quiero | ⚠ prob. media 0.41 |
| 14 | 1:02.35 (62.35) | es casi igual su significado | ok |
| 15 | 1:05.45 (65.45) | no pasa nada si el tiempo nos gana | ⚠ sin voz detectada en el stem al inicio |
| 16 | 1:10.61 (70.61) | y el amanecer | ok |
| 17 | 1:12.25 (72.25) | aparece en nuestra espalda | ok |
| 18 | 1:15.33 (75.33) | no pasa nada | ok |
| 19 | 1:17.33 (77.33) | si las horas se atrasan | ok |
| 20 | 1:19.89 (79.89) | y seguimos cara a cara | ok |
| 21 | 1:22.29 (82.29) | largando palabras | ok |
| 22 | 1:38.77 (98.77) | que pasa | ⚠ salto de 16.5 s desde el verso anterior; prob. media 0.46 |
| 23 | 1:41.27 (101.27) | si no vi las banderas | ok |
| 24 | 1:45.27 (105.27) | que avisaban | ok |
| 25 | 1:46.47 (106.47) | de las rocas en la marea | ok |
| 26 | 1:53.09 (113.09) | que pasa si tengo pasajes sin destino | ⚠ verificación: en el corte se oye solo «¿Qué pasa?»; el verso completo arranca más tarde, revisar |
| 27 | 2:01.01 (121.01) | pero quiero ir contigo | ok |
| 28 | 2:06.31 (126.31) | te irás o te quedarás | ok |
| 29 | 2:13.95 (133.95) | en la comodidad | ok |
| 30 | 2:15.95 (135.95) | de la arena llana por el mar | ok |
| 31 | 2:23.49 (143.49) | te irás o te quedarás cuando venga mi otoño sin sentido | ok |
| 32 | 2:38.03 (158.03) | no pasa nada si te digo un te amo | ok |
| 33 | 2:54.49 (174.49) | o un te quiero | ⚠ salto de 16.5 s desde el verso anterior |
| 34 | 2:55.43 (175.43) | es casi igual su significado | ok |
| 35 | 2:58.43 (178.43) | no pasa nada si el tiempo nos gana | ⚠ prob. media 0.40; sin voz detectada en el stem al inicio |
| 36 | 2:59.50 (179.50) | y el amanecer | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 37 | 3:00.57 (180.57) | aparece en nuestra espalda | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 38 | 3:01.63 (181.63) | no pasa nada | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 39 | 3:02.70 (182.70) | si las horas se atrasan | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 40 | 3:03.77 (183.77) | y seguimos cara a cara | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 41 | 3:04.84 (184.84) | largando palabras | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 42 | 3:05.91 (185.91) | no pasa nada | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 43 | 3:06.98 (186.98) | si te extraño y te lo digo | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 44 | 3:08.05 (188.05) | y pierda mis sentidos | ok |
| 45 | 3:12.59 (192.59) | no pasa nada | ok |
| 46 | 3:18.01 (198.01) | no pasa nada | ok |
| 47 | 3:20.36 (200.36) | no pasa nada | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 48 | 3:22.71 (202.71) | no pasa nada si te digo un te amo | ⚠ prob. media 0.33 |
| 49 | 3:31.79 (211.79) | o un te quiero | ⚠ prob. media 0.00 |
| 50 | 3:33.67 (213.67) | es casi igual su significado | ⚠ prob. media 0.00 |

## 03 · Hojas guardaditas — 2:53.87 (173.87 s)

| # | Tiempo | Verso | Confianza |
|--:|--:|---|---|
| 1 | 0:04.08 (4.08) | La casa ya no es igual | ok |
| 2 | 0:06.66 (6.66) | como aquella navidad | ok |
| 3 | 0:11.02 (11.02) | las niñas bailaban | ⚠ sin voz detectada en el stem al inicio |
| 4 | 0:13.96 (13.96) | la luna miraba | ok |
| 5 | 0:15.86 (15.86) | las copas apenas sobraban. | ok |
| 6 | 0:21.00 (21.00) | Se nos fue la primavera | ok |
| 7 | 0:25.06 (25.06) | ni una hoja nueva | ok |
| 8 | 0:27.60 (27.60) | se nos acabó el viento | ok |
| 9 | 0:30.32 (30.32) | para reforzar aquello | ok |
| 10 | 0:32.10 (32.10) | y a la brisa del momento. | ok |
| 11 | 0:35.81 (35.81) | Y se nos fue la primavera | ok |
| 12 | 0:50.42 (50.42) | Se acabó el tiempo | ok |
| 13 | 0:54.04 (54.04) | las niñas corren y corren | ok |
| 14 | 0:57.60 (57.60) | se olvidaron del deseo | ok |
| 15 | 0:59.26 (59.26) | brindaron en seco | ok |
| 16 | 1:01.20 (61.20) | y su noche se fue con el viento | ok |
| 17 | 1:05.12 (65.12) | corren y corren | ok |
| 18 | 1:07.50 (67.50) | en las mismas baldosas | ok |
| 19 | 1:11.56 (71.56) | rotas y resbalosas | ok |
| 20 | 1:15.44 (75.44) | y tiran un par de copas | ok |
| 21 | 1:20.18 (80.18) | ya se fue la primavera | ⚠ prob. media 0.42 |
| 22 | 1:25.06 (85.06) | y tengo guardadas un par de hojitas | ⚠ sin voz detectada en el stem al inicio |
| 23 | 1:32.62 (92.62) | siempre guardaditas | ⚠ duración 0.71 s < 0,8; prob. media 0.01; sin voz detectada en el stem al inicio |
| 24 | 1:33.33 (93.33) | siempre guardaditas | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado); duración 0.71 s < 0,8; sin voz detectada en el stem al inicio |
| 25 | 1:34.04 (94.04) | siempre guardaditas | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado); duración 0.70 s < 0,8 |
| 26 | 1:34.74 (94.74) | siempre guardaditas | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado); duración 0.71 s < 0,8 |
| 27 | 1:35.45 (95.45) | en la primavera | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado); duración 78.4 s > 25 |

## 04 · Luciérnagas — 4:06.74 (246.74 s)

| # | Tiempo | Verso | Confianza |
|--:|--:|---|---|
| 1 | 0:20.03 (20.03) | La noche | ok |
| 2 | 0:23.78 (23.78) | parece no acabar | ok |
| 3 | 0:26.89 (26.89) | A veces | ok |
| 4 | 0:31.13 (31.13) | La marea | ⚠ prob. media 0.44; sin voz detectada en el stem al inicio |
| 5 | 0:33.67 (33.67) | se viene | ok |
| 6 | 0:37.01 (37.01) | a la ciudad | ⚠ sin voz detectada en el stem al inicio |
| 7 | 0:48.73 (48.73) | Las raíces trabajan en silencio | ok |
| 8 | 0:55.79 (55.79) | sosteniendo a un bosque | ok |
| 9 | 1:02.09 (62.09) | que a veces se va cayendo | ok |
| 10 | 1:09.79 (69.79) | Que la soledad | ok |
| 11 | 1:13.41 (73.41) | no te deje engañar | ok |
| 12 | 1:19.05 (79.05) | Rodeada estas de | ⚠ prob. media 0.26 |
| 13 | 1:28.24 (88.24) | Luciérnagas | ok |
| 14 | 1:30.16 (90.16) | iluminen nuestro andar | ⚠ prob. media 0.50 |
| 15 | 1:35.32 (95.32) | Luciérnagas | ok |
| 16 | 1:40.18 (100.18) | enséñenos a esperar | ok |
| 17 | 1:45.85 (105.85) | Luciérnagas | ok |
| 18 | 1:48.69 (108.69) | no dejen de brillar | ok |
| 19 | 2:06.47 (126.47) | Todo parece nada | ⚠ salto de 17.8 s desde el verso anterior |
| 20 | 2:08.35 (128.35) | comparado a la nada | ok |
| 21 | 2:15.27 (135.27) | Toda tormenta | ok |
| 22 | 2:20.59 (140.59) | se cansa | ok |
| 23 | 2:24.85 (144.85) | Que la soledad | ok |
| 24 | 2:31.35 (151.35) | no te deje engañar | ok |
| 25 | 2:42.30 (162.30) | Rodeada estas de | ⚠ prob. media 0.26 |
| 26 | 2:47.67 (167.67) | Luciérnagas | ⚠ sin voz detectada en el stem al inicio |
| 27 | 2:55.77 (175.77) | Luciérnagas | ok |
| 28 | 2:59.20 (179.20) | Luciérnagas | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado) |
| 29 | 3:02.62 (182.62) | iluminen nuestro andar | ⚠ prob. media 0.33 |
| 30 | 3:09.15 (189.15) | Luciérnagas | ok |
| 31 | 3:10.73 (190.73) | enséñenos a esperar | ok |
| 32 | 3:17.93 (197.93) | Luciérnagas | ok |
| 33 | 3:20.61 (200.61) | no dejen | ok |
| 34 | 3:24.53 (204.53) | Por favor no dejen de brillar | ok |
| 35 | 3:49.19 (229.19) | Que la soledad | ⚠ salto de 24.7 s desde el verso anterior |
| 36 | 3:53.57 (233.57) | no te deje engañar | ok |
| 37 | 4:01.99 (241.99) | Rodeada estas de | ⚠ prob. media 0.00 |
| 38 | 4:04.22 (244.22) | Luciérnagas | ⚠ interpolado (el aligner lo colapsó; posible verso no cantado); sin voz detectada en el stem al inicio |
| 39 | 4:06.45 (246.45) | Luciérnagas | ⚠ duración 0.29 s < 0,8; sin voz detectada en el stem al inicio |

## 05 · ¿Por qué no volvió el eco? — 3:06.86 (186.86 s)

| # | Tiempo | Verso | Confianza |
|--:|--:|---|---|
| 1 | 0:09.25 (9.25) | tu silencio muy ausente | ok |
| 2 | 0:11.81 (11.81) | hay una voz sin dirección | ok |
| 3 | 0:13.73 (13.73) | que me grita en las paredes | ok |
| 4 | 0:16.31 (16.31) | de mi loca habitación | ok |
| 5 | 0:18.15 (18.15) | tus ojos solo hablaban y los míos escuchaban | ok |
| 6 | 0:22.93 (22.93) | muy tranquila yo estaba | ok |
| 7 | 0:24.69 (24.69) | al recordar tu voz calmada | ok |
| 8 | 0:29.35 (29.35) | aún recuerdo ese otoño | ⚠ sin voz detectada en el stem al inicio |
| 9 | 0:34.01 (34.01) | Donde prometiste todo | ok |
| 10 | 0:36.17 (36.17) | Esas cartas no escritas | ok |
| 11 | 0:39.23 (39.23) | Que las quemaste el día en que te desenamoraste | ok |
| 12 | 0:44.53 (44.53) | Di mi alma sin medida | ok |
| 13 | 0:46.67 (46.67) | Y la dejaste malherida | ok |
| 14 | 0:48.61 (48.61) | Fui un jardín en plena flor | ok |
| 15 | 0:51.31 (51.31) | Y me dejaste sin color | ok |
| 16 | 0:55.57 (55.57) | ¿porque no volvió el eco? | ok |
| 17 | 1:02.35 (62.35) | cuando escribíamos | ok |
| 18 | 1:05.31 (65.31) | esas cartas no escritas por tu ego | ok |
| 19 | 1:11.27 (71.27) | que dejamos rotas en el tiempo | ok |
| 20 | 1:16.27 (76.27) | que optimista tu reacción | ok |
| 21 | 1:18.27 (78.27) | al quitarme el corazón | ok |
| 22 | 1:20.69 (80.69) | vos quisiste ser el centro del mundo de la razón | ok |
| 23 | 1:24.91 (84.91) | yo no guardo aquel rencor, te deseo lo mejor | ok |
| 24 | 1:39.31 (99.31) | alguna vez me miraste, de reojo y te atrapé | ⚠ sin voz detectada en el stem al inicio |
| 25 | 1:44.83 (104.83) | que lejana es tu voz que extraña la sensación | ok |
| 26 | 1:49.39 (109.39) | tu risa, mi alegría | ok |
| 27 | 1:51.85 (111.85) | la borraste en plena vida | ok |
| 28 | 1:54.05 (114.05) | esas cartas no escritas | ok |
| 29 | 1:57.09 (117.09) | que las quemaste el día en que te desenamoraste | ok |
| 30 | 2:02.43 (122.43) | di mi alma sin media | ok |
| 31 | 2:04.43 (124.43) | y la dejaste malherida | ok |
| 32 | 2:06.50 (126.50) | fui un jardín en plena flor | ok |
| 33 | 2:09.07 (129.07) | y me dejaste sin color | ok |
| 34 | 2:12.51 (132.51) | porque no volvió el eco | ok |
| 35 | 2:19.79 (139.79) | cuando escribíamos | ok |
| 36 | 2:23.33 (143.33) | esas cartas no escritas por tu ego | ok |
| 37 | 2:29.59 (149.59) | que dejamos rotas en el tiempo | ok |
| 38 | 2:32.93 (152.93) | que optimista tu reacción | ok |
| 39 | 2:36.11 (156.11) | al romper mi corazón | ok |
| 40 | 2:38.39 (158.39) | vos quisiste ser el centro del mundo de la razón | ok |
| 41 | 2:42.71 (162.71) | yo no guardo aquel rencor, te deseo lo mejor | ok |
| 42 | 2:47.15 (167.15) | vos quisiste ser el centro del mundo de la razón | ok |
| 43 | 2:51.65 (171.65) | yo no guardo aquel rencor, te deseo lo mejor | ok |
