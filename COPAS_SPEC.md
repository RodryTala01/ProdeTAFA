# ProdeTAFA — Especificación de Copas y Desempates

Estado: reglas funcionales parcialmente confirmadas. **No implementar estructura definitiva de Copas hasta revisar el Excel histórico del usuario**, porque allí se definen las competiciones reales, formatos, divisiones y participantes aproximados.

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

Revisar el Excel histórico que enviará el usuario y relevar por hoja/competición:

- nombre de cada Copa;
- divisiones o condiciones de acceso;
- participantes aproximados;
- formato (grupos, eliminación, mixto, etc.);
- cantidad y nombres de fases;
- si hay ida/vuelta;
- tercer puesto;
- final;
- criterios particulares;
- cómo se representaban cruces y desempates anteriormente.

Después de ese relevamiento se definirá un modelo suficientemente flexible para soportar varias Copas sin hardcodear una tabla distinta por competición.
