# ProdeTAFA — Copa Total

Estado: formato funcional confirmado a partir del Excel histórico y aclaraciones del usuario.

## Importancia

- La Copa Total es considerada por el usuario la **copa más importante de todas**.
- Debe tener una presentación destacada dentro de la UI futura, sin que eso altere las reglas de puntuación.

## Participación

- Participan **todos los participantes activos**, sin importar si pertenecen a Primera o Segunda División.
- Se intenta distribuirlos en grupos de entre **3 y 5 participantes**.
- Formato ideal: **8 grupos de 4 participantes**.
- La cantidad real de grupos y clasificados puede adaptarse según el total de participantes.

## Sorteo y bombos

- Los grupos se sortean con lógica de bombos basada en la **tabla IFFHS**, igual que en Copa A/B.
- El campeón vigente de Copa Total ocupa la posición **A1** como cabeza de serie del Grupo A.
- La lógica exacta de la tabla IFFHS se documentará por separado.
- El Admin conserva el control del sorteo y armado final.

## Fase de grupos

La fase de grupos dura exactamente **2 Fechas Copa completas**, históricamente identificadas como `32avos` y `16avos`.

### División interna de cada Fecha Copa

Cada Fecha Copa contiene 12 partidos reales del Prode.

Para Copa Total, esos 12 partidos se dividen cronológicamente en **3 bloques de 4 partidos**.

Cada bloque de 4 partidos funciona como una **mini-jornada** de la fase de grupos.

Por lo tanto:

- Fecha Copa 1 = mini-jornadas 1, 2 y 3.
- Fecha Copa 2 = mini-jornadas 4, 5 y 6.
- Total fase de grupos = **6 mini-jornadas**.

El puntaje que obtiene cada participante en los 4 partidos reales de un bloque es su marcador para el enfrentamiento de grupo correspondiente.

Ejemplo conceptual:

- Rodrigo suma 5 puntos en los 4 partidos del bloque.
- Carlos suma 3 puntos.
- Resultado del cruce de grupo: `Rodrigo 5 - 3 Carlos`.
- Rodrigo obtiene 3 puntos de tabla.

Si ambos obtienen la misma cantidad de puntos de Prode en el bloque, el enfrentamiento termina empatado y ambos reciben 1 punto de tabla.

No se aplica el mecanismo de desempate de eliminación directa durante la fase de grupos.

## Fixture según tamaño del grupo

### Grupos de 3 participantes

- Se enfrentan entre sí **dos veces**.
- Funciona conceptualmente como ida y vuelta, aunque cada enfrentamiento usa bloques distintos de partidos reales.
- Las 6 mini-jornadas disponibles permiten completar el fixture con fechas libres según corresponda.

### Grupos de 4 participantes

- Se enfrentan entre sí **dos veces**.
- Ida y vuelta conceptual, usando distintos bloques de partidos reales.
- Las 6 mini-jornadas permiten completar exactamente el fixture de doble rueda.

### Grupos de 5 participantes

- Se enfrentan entre sí **una sola vez**.
- El sistema debe soportar la rueda única y las fechas libres necesarias dentro del esquema de 6 mini-jornadas disponibles.

## Puntuación de tabla de grupo

Por cada enfrentamiento de grupo:

- Victoria: **3 puntos**.
- Empate: **1 punto** para cada participante.
- Derrota: **0 puntos**.

La tabla se ordena por:

1. puntos de tabla;
2. diferencia de gol;
3. goles a favor;
4. victorias.

Pendiente de confirmación semántica final: `goles a favor` y `diferencia de gol` parecen corresponder a los puntos de Prode anotados y recibidos en los enfrentamientos de los bloques; confirmar antes de implementar la fórmula definitiva.

## Clasificación desde grupos

Formato ideal con 8 grupos de 4:

- clasifican normalmente **1.º y 2.º de cada grupo** a Octavos de Final.

Si la cantidad de grupos/participantes cambia:

- el Admin puede ajustar la clasificación;
- se pueden utilizar **mejores terceros** para completar el cuadro de Octavos.

El sistema debe permitir configurar cuántos primeros/segundos/terceros clasifican sin hardcodear solamente el caso ideal.

## Eliminación directa

Después de la fase de grupos:

- Octavos de Final: una Fecha Copa.
- Cuartos de Final: una Fecha Copa.
- Semifinales: una Fecha Copa.
- Final: una Fecha Copa.
- Existe **partido por tercer puesto**.

Los cruces/el cuadro son administrados por el Admin según las reglas/sorteos de la edición.

## Empates en eliminación directa

Desde Octavos en adelante se usa la regla general de desempate de Copas:

- si el puntaje total del cruce queda igualado, no se desempata por plenos/parciales;
- el cruce continúa usando la siguiente fecha cronológica;
- primero se compara día por día;
- si llega empatado al último día, se continúa partido por partido;
- si aun así no se resuelve, el Admin decide si usa Fecha Desempate o arrastra el desempate junto con la siguiente fase.

## Relación con Liga y estadísticas

- Los puntos obtenidos en Copa Total **no suman a la Liga**.
- Sí deben quedar guardados para la futura tabla general e historial estadístico.
- Una misma Fecha Copa puede servir simultáneamente para Copa Total y otras Copas activas.
- Cada participante completa un único pronóstico de 12 partidos por Fecha Copa.