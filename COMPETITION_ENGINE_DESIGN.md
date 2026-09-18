# ProdeTAFA — Diseño del motor general de competiciones

Estado: **borrador de arquitectura**. No crear migraciones ni implementar todavía hasta validar este diseño con el usuario.

## Principio principal

El Prode de 12 partidos sigue siendo la unidad deportiva base.

`rounds -> matches -> predictions -> prediction_scores`

Las competiciones no deben duplicar pronósticos. Una misma Fecha y un mismo pronóstico pueden alimentar simultáneamente:

- Liga A;
- Liga B;
- una o varias Copas;
- un desempate pendiente;
- estadísticas históricas.

El motor de competiciones se construye por encima de la capa actual.

## 1. Temporada TAFA

La próxima temporada real a crear en la app es **T32**.

Crear un concepto superior de temporada real, por ejemplo `T32`.

Una temporada contiene:

- divisiones vigentes;
- participantes de cada división;
- Liga A;
- Liga B;
- Copa A;
- Copa B;
- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa (con nombre visible variable por edición);
- Promoción;
- tabla IFFHS generada al cierre.

Liga C/Copa C no se activan ahora, pero el diseño no debe impedir agregarlas en el futuro.

## 2. Divisiones

Separar la pertenencia deportiva a una división de la competición Liga en sí.

Conceptos propuestos:

- `season_divisions`: A, B y, si alguna vez vuelve, C.
- `season_division_members`: participante + división + temporada.

Esto permite que Copa A tome a todos los miembros de A y Copa B a todos los de B sin depender de posiciones actuales de la tabla.

Al terminar una temporada se puede generar una **propuesta** de divisiones para la siguiente según:

- ascenso directo;
- descenso directo;
- campeón Copa A con permanencia;
- campeón Copa B con ascenso;
- Promoción;
- correcciones manuales del admin.

La composición final de la temporada siguiente siempre queda confirmada por Admin.

## 3. Competición genérica

Cada torneo es una fila de `competitions` asociada a una temporada.

Campos conceptuales:

- temporada;
- código estable (`LIGA_A`, `COPA_TOTAL`, etc.);
- nombre canónico;
- nombre visible de la edición;
- familia (`LEAGUE`, `CUP`, `PROMOTION`);
- estado (`draft`, `active`, `finished`, `archived`);
- orden de visualización.

Ejemplo Copa Papa:

- código: `COPA_PAPA`;
- nombre canónico: `Copa Papa`;
- nombre visible T30: `Copa Miguel Ángel Russo`.

## 3A. Configuración manual como regla transversal

El motor debe tratar el armado manual por Admin como una capacidad de primera clase.

Los criterios de cada competición pueden determinar:

- participantes elegibles;
- bombos;
- cabezas de serie;
- restricciones de cruce;
- posiciones clasificatorias;
- formato de grupos o llaves.

Pero esos criterios **no obligan a ejecutar un sorteo automático dentro de la app**.

El sistema debe permitir dos flujos:

1. **Asistido**: calcular una propuesta o ejecutar un sorteo automático reproducible/auditable.
2. **Manual**: el Admin realiza el sorteo o designación por su cuenta y carga el resultado final en grupos, parejas o cruces.

La modalidad manual debe existir para:

- Copa A/B: grupos y cruces de eliminación;
- Copa Total: grupos y cruces;
- Copa Dúos: composición de parejas, además del sorteo aleatorio opcional;
- Copa Campeones: reemplazos/correcciones y armado de posiciones cuando corresponda;
- Copa Papa: ubicación manual si el Admin necesita corregir el armado derivado del ranking;
- Promoción: corrección administrativa excepcional de participantes.

Toda acción manual debe preservar las validaciones de elegibilidad y quedar auditada. El randomizador interno nunca debe ser la única vía posible.

## 4. Etapas

Una competición se compone de `competition_stages`.

No hardcodear una tabla por cada Copa. Usar unos pocos tipos de etapa reutilizables:

### `LEAGUE_TABLE`

Para Liga A/B.

Acumula las Fechas vinculadas y ordena con los criterios actuales del Prode.

### `ACCUMULATIVE_GROUPS`

Para grupos de Copa A/B.

- grupos;
- varias Fechas completas;
- se acumulan puntos de Prode;
- ranking tipo Liga;
- luego el Admin confirma los clasificados según la regla de la Copa.

### `ROUND_ROBIN_GROUPS`

Para Copa Total.

- grupos de 3/4/5;
- encuentros A vs B;
- cada encuentro usa un subconjunto de partidos reales de la Fecha;
- 3 victoria / 1 empate / 0 derrota;
- PJ, PG, PE, PP, GF, GC, DG, PTS.

### `SURVIVAL_TABLE`

Para Copa Dúos.

- puntaje de la jornada = suma de los integrantes + bonus;
- cada jornada se vuelve a calcular desde cero salvo bonus arrastrado;
- Admin define cuántos eliminados hay por etapa;
- permite empates pendientes de desempate.

### `KNOCKOUT`

Para:

- octavos/cuartos/semis/final de A/B/Total;
- Copa Papa;
- Copa Campeones;
- semifinal/final Dúos;
- Promoción.

El sistema calcula el marcador con los puntos del Prode, pero el clasificado se confirma administrativamente cuando la competición así lo requiere.

Debe soportar:

- llave normal;
- byes/libres;
- llave escalonada, como Copa Campeones;
- tercer puesto;
- cruces fijados por sorteo o manualmente.

## 5. Entradas de competición

No modelar una competición directamente con `user_id`, porque Copa Dúos necesita parejas.

Crear `competition_entries` y `competition_entry_members`.

Una entrada puede representar:

- un participante individual;
- un dúo.

Ejemplos:

- Copa A: entrada `Rodrigo`, con un miembro.
- Copa Dúos: entrada `Rodrigo + Azul`, con dos miembros.

La membresía debe admitir vigencia temporal para permitir una sustitución excepcional de integrante del dúo sin reescribir resultados históricos.

## 6. Vincular Fechas a competiciones

La relación entre una Fecha del Prode y las competiciones debe ser **muchos a muchos**.

Crear un equivalente general a `competition_round_links`:

- competición;
- etapa;
- `round_id`;
- secuencia dentro de la etapa;
- propósito normal o desempate.

Ejemplo de una única Fecha Copa:

`Fecha Copa 3`

puede estar vinculada al mismo tiempo a:

- Copa A · Octavos;
- Copa B · Octavos;
- Copa Total · Octavos;
- Copa Dúos · Fase 3;
- Copa Campeones · determinada ronda.

Una Fecha Liga puede estar vinculada simultáneamente a:

- Liga A · Fecha 2;
- Liga B · Fecha 2;
- uno o varios desempates pendientes de Copa.

El campo visual principal de la Fecha puede seguir siendo `Liga`, `Copa`, `Desempate` o `Amistoso`; los vínculos determinan todos sus usos deportivos reales.

## 7. Segmentos de una Fecha

Para Copa Total hace falta poder dividir los 12 partidos reales.

Crear `competition_round_segments` + miembros explícitos del segmento.

Ejemplo:

- segmento 1 = partidos 1–4;
- segmento 2 = partidos 5–8;
- segmento 3 = partidos 9–12.

No depender únicamente de un rango de índices: guardar explícitamente qué `match_id` pertenece a cada segmento para que el historial no cambie si el orden visual se modifica.

Para una llave normal se puede usar un único segmento que representa los 12 partidos completos.

## 8. Encuentros

Crear un concepto general `competition_encounters` para cualquier A vs B.

Puede representar:

- un partido de grupo de Copa Total;
- un cruce de eliminación directa;
- una semifinal de Dúos;
- una Promoción.

Datos conceptuales:

- etapa;
- grupo opcional;
- segmento/Fecha usado;
- entrada A;
- entrada B;
- puntos calculados A/B;
- estado;
- clasificado/ganador confirmado;
- forma de resolución (`normal`, `bye`, `tiebreak`, `admin`).

Los puntos se derivan de los `prediction_scores` oficiales de los miembros de cada entrada.

## 9. Grupos

Usar:

- `competition_groups`;
- `competition_group_entries`.

Esto permite tanto:

- grupos A/B donde sólo se acumula puntaje;
- grupos de Copa Total con fixture entre participantes.

Las reglas de clasificación quedan en la definición de cada etapa/competición y el Admin conserva confirmación cuando corresponda.

## 10. Bonus

Crear bonus explícitos y auditables, no valores escondidos en fórmulas.

`competition_entry_bonuses` debe poder guardar:

- competición;
- etapa/Fecha destino;
- entrada;
- puntos extra;
- motivo.

Sirve para:

- bonus variable por posición en Copa Dúos;
- +2 para 1.º y 2.º en las semifinales de Dúos.

## 11. Desempates

Modelar el desempate como objeto propio y no como una modificación del marcador original.

Un `competition_tiebreak` puede estar asociado a:

- un cruce directo;
- un empate por un lugar de clasificación/eliminación de tabla.

Debe admitir uno o más participantes/entradas y una o más Fechas usadas para resolverlo.

Regla TAFA actual:

1. usar siguiente Fecha cronológica indicada;
2. comparar por día local `America/Argentina/Buenos_Aires`;
3. si un día termina con diferencia, queda resuelto;
4. si llegan empatados al último día, pasar a partido por partido;
5. si termina toda la Fecha empatado, el Admin decide cómo continuar.

La Fecha usada puede seguir sumando normalmente para Liga mientras también resuelve el desempate.

## 12. Resultados históricos y clasificados

Guardar explícitamente por etapa/competición:

- eliminado;
- clasificado;
- puesto final;
- campeón/subcampeón/tercero cuando aplique;
- motivo de acceso/bye/cupo;
- confirmación administrativa.

Esto permite reconstruir:

- palmarés;
- Copa Campeones de la temporada siguiente;
- IFFHS;
- estadísticas históricas.

## 13. Ascensos, descensos y permanencias

Crear movimientos de división explícitos al cierre de temporada.

Concepto: `season_division_movements`.

Guardar:

- participante;
- división origen;
- división destino;
- razón;
- estado propuesto/confirmado.

Razones posibles:

- campeón/posición Liga B;
- descenso Liga A;
- Copa B;
- permanencia Copa A;
- Promoción;
- ajuste manual.

El motor puede proponer la composición de la siguiente temporada, pero el Admin la confirma antes de activarla.

## 14. IFFHS

No guardar sólo un total opaco.

Usar dos niveles:

### Componentes por temporada

`iffhs_season_components`

- temporada;
- participante;
- competición;
- componente (`league_points`, `plenos`, `league_position`, `cup_stage`, etc.);
- valor base;
- multiplicador;
- puntos IFFHS resultantes.

Guardar los puntos como entero escalado (por ejemplo ×100) para evitar errores de coma flotante con coeficientes 1,3 / 2,25 / 0,75 / 3,5.

### Ranking histórico

Sumar las últimas cinco temporadas completas.

En igualdad exacta de puntos IFFHS, ambos participantes comparten puesto; no aplicar un desempate artificial.

## 15. Pronóstico oficial vs borrador

Antes de que las competiciones nuevas consuman puntajes, hay que cerrar la mejora ya acordada de pronósticos:

- `predictions` puede seguir siendo el borrador autosave;
- debe existir un estado oficial enviado/re-enviado por partido;
- los puntos y competiciones deben consumir la versión oficialmente presentada, no un cambio de borrador posterior que todavía no fue reenviado;
- el historial de cambios queda auditado.

Esto es requisito previo para que una misma predicción alimente de forma fiable Liga y múltiples Copas.

## 16. Compatibilidad con la Liga actual

Hoy existen:

- `league_seasons`;
- `league_rounds`;
- `league_participants`.

No borrarlos de golpe.

Plan de transición recomendado:

1. crear temporada general + motor genérico;
2. mantener el flujo actual de Liga funcionando;
3. enlazar/migrar progresivamente Liga A/B al nuevo concepto de competición;
4. sólo después retirar o convertir las tablas antiguas en compatibilidad interna.

Importante: la restricción actual `league_rounds.round_id UNIQUE` no sirve para el modelo final porque una misma Fecha debe poder utilizarse en más de una competición.

## 17. Diseño de Admin propuesto

Navegación conceptual:

`Inicio | Fechas | Competiciones | Participantes`

### Inicio

- temporada activa;
- próxima Fecha;
- competiciones activas;
- desempates pendientes;
- acciones que requieren confirmación.

### Fechas

Cada Fecha muestra:

- tipo principal;
- 12 partidos;
- competiciones/etapas que utilizan esa Fecha;
- desempates que se están resolviendo.

### Competiciones

Listado por temporada:

- Liga A;
- Liga B;
- Copa A;
- Copa B;
- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa;
- Promoción.

Al entrar se ve su formato natural: tabla, grupos o llave.

## 18. Diseño Participante propuesto

Mantener el pronóstico como centro.

En una Fecha, arriba de los 12 partidos mostrar todos los contextos activos del usuario, por ejemplo:

- `Liga A · Fecha 2`;
- `Copa A · Octavos · vs Carlos`;
- `Copa Total · Grupo C · vs Azul`;
- `Copa Papa · 16avos · vs Vero`;
- `Desempate Copa B · vs Nico`.

El usuario completa **un solo pronóstico**.

## 19. Orden de implementación sugerido

1. Pronóstico oficial/reenvío + auditoría.
2. Temporada general + divisiones.
3. Competición, entradas, etapas y vínculos con Fechas.
4. Liga A/B sobre la nueva capa sin romper Liga actual.
5. Motor de grupos acumulativos y knockout -> Copa A/B.
6. Segmentos + round-robin -> Copa Total.
7. Entradas multi-miembro + bonus + survival -> Copa Dúos.
8. Llave escalonada -> Copa Campeones.
9. Llave fija por ranking previo -> Copa Papa.
10. Promoción + movimientos de división.
11. Desempates genéricos.
12. IFFHS de cinco temporadas.
13. Historial/palmarés/estadísticas.

## Decisiones que todavía deben validarse antes de implementar

- Confirmar si Liga A y Liga B usan siempre la misma Fecha de 12 partidos en cada jornada.
- La próxima temporada real a crear es **T32** y la numeración de temporada es global para todas las competiciones de esa edición.
- Definir si el Admin crea todas las competiciones de una temporada manualmente o si al crear `T32` la app ofrece una plantilla que crea automáticamente Liga A/B + Copas habituales.
