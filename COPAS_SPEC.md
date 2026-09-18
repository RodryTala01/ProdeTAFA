# ProdeTAFA — Especificación de Copas y Desempates

Estado: reglas funcionales parcialmente confirmadas. **No implementar estructura definitiva de Copas hasta terminar de relevar el Excel histórico del usuario**, porque allí se definen las competiciones reales, formatos, divisiones y participantes aproximados.

## Relación con la Liga

- Las Copas se juegan intercaladas con las 5 fechas de Liga.
- La Liga sigue teniendo exactamente 5 fechas, independientemente de cuántas fechas de Copa haya entre medio.
- El calendario no debe imponer automáticamente la secuencia: el admin decide el tipo de cada fecha al crearla.
- Patrón típico, no obligatorio desde código: `32avos Copas → Fecha 1 Liga → Fecha Copas → Fecha 2 Liga → ...`.
- Las Copas están calculadas para avanzar aproximadamente en paralelo; no se espera normalmente que una Copa quede una fase atrás de otra, aunque los formatos concretos se terminarán de definir con el Excel.

## Fechas y categorías

Tipos operativos deseados:

- `Liga`
- `Copa`
- `Desempate`
- `Amistoso`

No usar `Test` como categoría de producción.

## Múltiples Copas

- Hay muchas Copas en una misma temporada.
- Una misma **Fecha Copa de 12 partidos** se usa simultáneamente para las Copas activas de esa jornada.
- Un participante puede disputar más de una Copa al mismo tiempo.
- No todos los participantes necesariamente disputan todas las Copas.
- La asignación de participantes depende de división y otras condiciones históricas; por ahora será administrada manualmente por el admin.
- Algunas Copas son de eliminación directa y otras tienen fase de grupos. Los formatos exactos se definirán después de revisar el Excel.
- Nombres de fases como `32avos` pueden mantenerse aunque haya menos cruces reales; no es necesario completar una llave teórica de 64 participantes.

## Regla general de armado manual por Admin

Los criterios deportivos de cada Copa definen **elegibilidad, cabezas de serie, bombos, restricciones y formato**, pero no obligan a que el sistema ejecute el sorteo o la designación final.

- El sistema puede calcular y mostrar una propuesta de bombos, grupos, parejas, cruces o clasificados.
- El Admin puede realizar el sorteo fuera de la app y **cargar manualmente el resultado**.
- El Admin puede asignar manualmente participantes a grupos, llaves, parejas o cruces, respetando las restricciones deportivas que correspondan.
- Ninguna Copa debe depender de un randomizador interno como única vía de configuración.
- Los sorteos automáticos deben ser opcionales y funcionar como asistencia.
- Toda asignación o corrección manual debe quedar auditada.
- Esto también aplica a Copa Dúos: aunque la regla deportiva indique parejas aleatorias, el Admin puede hacer el sorteo por su cuenta y luego cargar manualmente la composición resultante.

## Pronóstico compartido

- El participante completa **un solo pronóstico de 12 partidos por fecha**.
- Ese mismo puntaje sirve simultáneamente para todos los cruces/competiciones de Copa que dispute en esa fecha.
- Los puntos de una Fecha Copa NO suman a la Liga.
- Sí deben quedar disponibles para estadísticas/general histórica futura.
- Si el participante disputa varias Copas, la UI debe mostrar todas sus competiciones/cruces activos, sin pedir varios formularios de pronóstico.
- En fases de grupos también debe poder verse claramente qué Copa/grupo está jugando.

## Cruces de eliminación directa

Ejemplo conceptual: `Rodrigo vs Carlos`.

- Ambos usan el mismo Prode de 12 partidos de la Fecha Copa.
- El puntaje del cruce se calcula automáticamente a partir de los puntos obtenidos por cada participante en esa fecha.
- **No usar plenos, parciales, errores ni extras como criterio de desempate de un cruce de Copa.** Si los puntos quedan iguales, el cruce queda empatado.
- El sistema puede calcular y mostrar automáticamente los puntos, pero el **clasificado final lo selecciona/confirma manualmente el admin**.
- El admin arma los cruces.
- Antes de comenzar una ronda, el admin puede corregir los cruces.
- Una vez publicada/iniciada la Fecha Copa, los cruces quedan bloqueados para participantes y flujo normal, pero el admin conserva capacidad excepcional de edición/corrección con trazabilidad.
- En formatos con llave, mostrar visualmente la progresión (por ejemplo `32avos → 16avos → 8vos → 4tos → Semi → Final`).
- Si un participante queda libre/sin rival, avanza automáticamente.
- Si un participante no presenta, obtiene 0 puntos. El tratamiento del caso donde ambos quedan en 0 lo decide el admin.
- Puede existir tercer puesto en las competiciones que lo requieran.
- Partido único/ida-vuelta y particularidades de finales se definirán por competición luego de revisar el Excel.

## Desempate de un cruce

Regla confirmada principal:

1. Si un cruce de Copa termina igualado en puntos, **no** se aplican los desempates de Liga/ranking.
2. El desempate continúa usando los partidos de la **siguiente fecha cronológica**, normalmente la siguiente Fecha Liga.
3. Durante esa fecha de desempate se compara el rendimiento de ambos participantes **por día calendario**, no por el total de toda la fecha desde el inicio.
4. Ejemplo: si el bloque de partidos del lunes termina `4-4`, el cruce sigue empatado y se pasa a los partidos del martes. En cuanto un día completo deja diferencia entre ambos, gana quien haya obtenido más puntos en ese día.
5. Si llegan todavía empatados al **último día** de la fecha utilizada para desempatar, desde ese momento el criterio pasa a ser **partido por partido**: el primer partido posterior cuyo puntaje genere una diferencia define al ganador del cruce.
6. Si aun así finaliza toda la fecha sin diferencia, el admin podrá optar por una `Fecha Desempate` específica o por continuar el desempate junto con la siguiente fase. Esa decisión final no debe automatizarse todavía.

Consecuencias de implementación futuras:

- El desempate necesita conocer el orden cronológico real de los partidos y su día local en `America/Argentina/Buenos_Aires`.
- Debe poder acumular puntos de desempate por bloques diarios y luego por partido.
- No debe alterar los puntos de Liga: la Fecha Liga sigue puntuando normalmente para Liga y, en paralelo, puede resolver un desempate de Copa.
- Un mismo pronóstico puede servir simultáneamente para Liga y para desempatar uno o varios cruces pendientes.

## Copa A

Formato confirmado tomando como referencia una edición con 16 participantes.

### Participación

- Participan todos los integrantes vigentes de **Primera División**.
- La composición se determina por la división vigente de esa temporada/edición.
- El campeón de Copa A obtiene como premio deportivo **asegurar la permanencia en Liga A/Primera División**.

### Sorteo y bombos

- La fase inicial se divide en **4 grupos**.
- Los grupos se forman por sorteo.
- El **último campeón de Copa A es cabeza de serie del Grupo A**.
- Los bombos se determinan mediante la **tabla IFFHS**, cuya lógica se documentará por separado al final del relevamiento de copas.
- El admin controla el armado/sorteo; el sistema no debe imponer automáticamente cruces definitivos sin confirmación administrativa.

### Fase de grupos

- La fase de grupos dura **2 Fechas Copa completas de 12 partidos cada una**.
- En el calendario histórico esas dos jornadas corresponden conceptualmente a `32avos` y `16avos`, aunque funcionen como acumulación de fase de grupos.
- Los puntos obtenidos en ambas Fechas Copa se acumulan para definir la posición dentro del grupo.
- Al terminar la fase:
  - **1.º de cada grupo → clasifica directamente a Cuartos de Final**.
  - **2.º y 3.º de cada grupo → clasifican a Octavos de Final**.
  - **4.º de cada grupo → eliminado**.

### Octavos

- Participan los segundos y terceros de los cuatro grupos: 8 jugadores.
- Los cruces se designan **por sorteo**.
- Restricción del sorteo: cada cruce debe ser siempre **un 2.º vs un 3.º**.
- Cada llave se define usando una única Fecha Copa de 12 partidos.
- Si queda igualdad de puntos, se aplica la regla general de desempate de Copa; no se usan plenos/parciales como desempate del cruce.

### Cuartos y Semifinales

- A los 4 ganadores de Octavos se suman los 4 primeros de grupo que ya estaban clasificados.
- Los cruces de Cuartos se designan **por sorteo**.
- Cada Cuarto se juega sobre una única Fecha Copa.
- Los cruces de Semifinal también se designan **por sorteo** entre los clasificados.
- Cada Semifinal se juega sobre una única Fecha Copa.

### Final

- Se disputa sobre una Fecha Copa.
- La lógica específica de tercer puesto/final se terminará de confirmar en el relevamiento, pero el campeón es quien obtiene el beneficio de permanencia indicado arriba.

## Copa B

La Copa B usa el **mismo método estructural que Copa A** como formato base.

### Participación

- Participan los integrantes vigentes de **Segunda División/Liga B**.
- Para diseño inicial, asumir **16 participantes**, aunque el formato puede adaptarse si una edición tiene menos jugadores.
- El campeón de Copa B obtiene como premio deportivo **ascenso a Liga A/Primera División**.
- Como consecuencia, en la siguiente edición de Copa B ese campeón ya no participa si para entonces integra Primera División.

### Formato base

- 4 grupos por sorteo.
- Bombos determinados por tabla IFFHS.
- Fase de grupos durante 2 Fechas Copa.
- 1.º de cada grupo a Cuartos.
- 2.º y 3.º a Octavos.
- Octavos sorteados con restricción `2.º vs 3.º`.
- Cuartos por sorteo.
- Semifinales por sorteo.
- Una Fecha Copa por cada ronda de eliminación directa.
- Empates de cruces siguen la regla general de desempate de Copa.
- El formato exacto puede comprimirse/adaptarse manualmente por Admin si la cantidad real de participantes es menor a 16.

## Vista participante

En una Fecha Copa, mostrar de forma clara qué está disputando el participante.

Ejemplo:

- `Copa A · 16avos · vs Carlos`
- `Copa B · Grupo 2`
- `Copa C · 8vos · vs Azul`

Si tiene varios cruces/competiciones activas, mostrarlos todos por encima o junto al formulario único de 12 partidos.

## Vista Admin

Debe permitir, cuando se implemente:

- crear/administrar múltiples Copas;
- asignar participantes manualmente;
- definir formato de cada Copa;
- crear fases/grupos/llaves según corresponda;
- armar y corregir cruces;
- vincular cada jornada de Copa a una Fecha Copa concreta;
- ver puntajes calculados automáticamente de cada cruce;
- ver estado `pendiente / empatado / clasificado`;
- seleccionar manualmente al clasificado;
- visualizar desempates pendientes y qué fecha/partidos los están resolviendo;
- mantener auditoría de correcciones administrativas.

## Liga — movimiento de posición

Para `↑N / ↓N` en la tabla de Liga, comparar contra la **posición al finalizar la fecha de Liga anterior**, no contra el último partido definitivo individual.

## Pendiente antes de diseñar base de datos/migraciones

Continuar relevando el Excel histórico competición por competición:

- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa / Copa Miguel Ángel Russo;
- Promoción;
- tabla IFFHS y su incidencia en sorteos;
- cualquier otra competición/variante detectada.

Para cada una relevar:

- participantes/condiciones de acceso;
- formato (grupos, eliminación, mixto, etc.);
- cantidad y nombres de fases;
- sorteos/cruces;
- si hay ida/vuelta;
- tercer puesto;
- final;
- premios deportivos/ascensos/permanencias;
- criterios particulares.

Después de ese relevamiento se definirá un modelo suficientemente flexible para soportar varias Copas sin hardcodear una tabla distinta por competición.
