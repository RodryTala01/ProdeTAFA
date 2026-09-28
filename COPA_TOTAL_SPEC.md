# ProdeTAFA — Copa Total

Estado: formato funcional confirmado a partir del Excel histórico y aclaraciones del usuario.

## Importancia

- La Copa Total es considerada por el usuario la **copa más importante de todas**.
- Debe tener una presentación destacada dentro de la UI futura, sin que eso altere las reglas de puntuación.

## Participación

- Participan **todos los participantes activos pertenecientes a las divisiones de la temporada**, sin importar si pertenecen a Primera o Segunda División.
- Se intenta distribuirlos en grupos de entre **3 y 5 participantes**.
- Formato ideal: **8 grupos de 4 participantes**.
- La cantidad real de grupos y clasificados puede adaptarse según el total de participantes.

## Sorteo y bombos

- El armado manual es la opción principal. El sorteo opcional usa bombos basados en la **tabla IFFHS** de la temporada anterior, igual que en Copa A/B.
- En el sorteo automático, el campeón vigente elegible de Copa Total ocupa **A1**. El armado manual no agrega restricciones deportivas adicionales.
- El ranking IFFHS se toma entre los participantes elegibles para la edición.
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

Los `match_id` concretos de cada bloque deben quedar guardados al configurar la fase para que el historial no dependa de cambios posteriores de orden visual.

El puntaje que obtiene cada participante en los 4 partidos reales de un bloque es su marcador para el enfrentamiento de grupo correspondiente.

Ejemplo:

- Rodrigo suma 7 puntos en los 4 partidos del bloque.
- Carlos suma 4 puntos.
- Resultado del cruce de grupo: `Rodrigo 7 - 4 Carlos`.
- Rodrigo obtiene 3 puntos de tabla.
- Rodrigo registra GF 7, GC 4 y DG +3 en ese mini-partido.

Si ambos obtienen la misma cantidad de puntos de Prode en el bloque, el enfrentamiento termina empatado y ambos reciben 1 punto de tabla.

No se aplica el mecanismo de desempate de eliminación directa durante la fase de grupos.

## Fixture según tamaño del grupo

### Grupos de 3 participantes

- Se enfrentan entre sí **dos veces**.
- Funciona conceptualmente como ida y vuelta, aunque cada enfrentamiento usa bloques distintos de partidos reales.
- Las 6 mini-jornadas disponibles completan el fixture con fechas libres según corresponda.

### Grupos de 4 participantes

- Se enfrentan entre sí **dos veces**.
- Ida y vuelta conceptual, usando distintos bloques de partidos reales.
- Las 6 mini-jornadas permiten completar exactamente el fixture de doble rueda.

### Grupos de 5 participantes

- Se enfrentan entre sí **una sola vez**.
- Se completa la rueda única en 5 mini-jornadas.
- La sexta mini-jornada queda libre para ese grupo.

## Tabla de grupo

La tabla debe mostrar:

- PJ: partidos jugados.
- PG: partidos ganados.
- PE: partidos empatados.
- PP: partidos perdidos.
- GF: suma de los **puntos de Prode anotados** en los mini-partidos.
- GC: suma de los **puntos de Prode recibidos** en los mini-partidos.
- DG: GF - GC.
- PTS: puntos de tabla.

Por cada enfrentamiento de grupo:

- Victoria: **3 puntos**.
- Empate: **1 punto** para cada participante.
- Derrota: **0 puntos**.

La tabla se ordena por:

1. PTS;
2. DG;
3. GF;
4. PG.

Si dos participantes continúan exactamente iguales después de esos cuatro criterios, el sistema conserva el empate deportivo y no inventa un desempate alfabético.

## Clasificación desde grupos

Formato ideal con 8 grupos:

- clasifican **1.º y 2.º de cada grupo**;
- se completa un cuadro de 16 participantes para Octavos de Final.

Si la cantidad de grupos/participantes cambia:

- el Admin puede configurar las posiciones directas que clasifican;
- puede configurar cuántos mejores terceros/comodines se necesitan para completar el cuadro;
- los mejores terceros se comparan con los mismos criterios deportivos de Copa Total: `PTS -> DG -> GF -> PG`;
- si existe igualdad total justo en el corte del último comodín, el sistema **no decide por nombre ni de forma arbitraria** y requiere resolución manual del Admin;
- el Admin también puede confirmar una selección completa manual cuando el formato excepcional de la edición lo requiera.

La clasificación confirmada queda guardada como un snapshot auditable indicando participante, grupo, posición, tipo de clasificación y motivo.

## Eliminación directa

Después de la fase de grupos:

- Octavos de Final: una Fecha Copa.
- Cuartos de Final: una Fecha Copa.
- Semifinales: una Fecha Copa.
- Final: una Fecha Copa.
- Existe **partido por tercer puesto**.

Los cruces son controlados por el Admin. El sistema permite:

- sortear los cruces entre los clasificados disponibles;
- o indicar manualmente los pares de la ronda.

Para construir la ronda siguiente, los ganadores de la ronda anterior deben estar resueltos y **confirmados por el Admin**.

El tercer puesto se arma con los dos perdedores confirmados de semifinales. Puede utilizar la misma Fecha real que la Final mediante un vínculo independiente de etapa.

## Empates en eliminación directa

Desde Octavos en adelante se usa la regla general de desempate de Copas:

- si el puntaje total del cruce queda igualado, no se desempata por plenos/parciales;
- el cruce continúa usando la siguiente fecha cronológica;
- primero se compara día por día usando fecha local de Argentina;
- el primer día completo con diferencia define el ganador;
- si llega empatado al último día, se continúa partido por partido;
- si aun así no se resuelve, el Admin decide si usa Fecha Desempate o arrastra el desempate junto con la siguiente fase.

## Relación con Liga y estadísticas

- Los puntos obtenidos en Copa Total **no suman a la Liga**.
- Sí deben quedar guardados para la futura tabla general e historial estadístico.
- Una misma Fecha Copa puede servir simultáneamente para Copa Total y otras Copas activas.
- Cada participante completa un único pronóstico de 12 partidos por Fecha Copa.

## Administración implementada

La guía de interfaz, endpoints y prueba local está en [ADMIN-COPA-TOTAL.md](ADMIN-COPA-TOTAL.md). Se reutilizan las migraciones existentes, el motor de puntajes y los desempates TAFA.
