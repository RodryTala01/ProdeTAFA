# ProdeTAFA — Especificación Copa Dúos

Estado: formato parcialmente confirmado. No implementar lógica definitiva hasta cerrar los valores de bonus por posición y reglas de desempate/ausencias.

## Participación y formación

- La Copa Dúos se disputa en parejas de 2 participantes.
- Las parejas se forman de manera totalmente aleatoria.
- Cada pareja permanece fija durante toda la competencia.
- El puntaje del dúo en cada fecha es la suma de los puntos obtenidos por sus dos integrantes en el mismo Prode de 12 partidos.

## Formato general

- Durante la mayor parte de la competencia NO hay enfrentamientos directos entre dúos.
- Se utiliza una tabla general de dúos ordenada por el puntaje acumulado/criterio vigente de la fase.
- Al terminar cada fecha, se eliminan los últimos dúos de la tabla.
- La cantidad de dúos eliminados por fecha depende de cuántos participantes/dúos haya en esa edición y la decide el admin.
- Según la posición conseguida por un dúo en una fecha, puede recibir un bonus de puntos para la fecha siguiente.
- La tabla y la eliminación deben poder configurarse sin hardcodear una cantidad fija de participantes.

## Llegada a semifinales

- La fase históricamente llamada `Cuartos` continúa funcionando como tabla general, no como cruces directos.
- Al finalizar esa etapa deben quedar 4 dúos clasificados.
- Recién entonces se arman semifinales directas:
  - 1.º vs 4.º
  - 2.º vs 3.º
- En semifinales, el 1.º y el 2.º comienzan con **+2 puntos extra** respecto de sus rivales.
- El resultado de cada semifinal se calcula con la suma de puntos de los dos integrantes del dúo, más el bonus de salida cuando corresponda.

## Final y tercer puesto

- Los ganadores de semifinales disputan la final.
- Copa Dúos NO tiene partido por tercer puesto.
- El campeón es el dúo ganador de la final.

## Puntos y ausencias

- El puntaje base del dúo es siempre la suma de los puntos individuales de ambos integrantes en esa fecha.
- No se confirmó todavía una regla especial de sustitución si un integrante se da de baja o deja de presentar; queda pendiente de definición.

## Bonus por posición

- Existe un sistema de puntos extra para la fecha siguiente según la posición conseguida en la tabla.
- La escala exacta de bonus por posición todavía debe definirse.
- Este bonus debe persistirse de forma explícita por fecha/fase y no inferirse retroactivamente.

## Administración

El Admin deberá poder:

- generar o cargar las parejas aleatorias;
- mantenerlas fijas durante toda la competencia;
- definir cuántos dúos se eliminan en cada fecha;
- ver tabla general y puntajes calculados automáticamente;
- configurar/aplicar los bonus de la fecha siguiente;
- confirmar qué 4 dúos avanzan a semifinales;
- generar automáticamente los cruces 1.º vs 4.º y 2.º vs 3.º, permitiendo corrección administrativa con auditoría si fuera necesario;
- gestionar la final.

## Vista participante

- Mostrar el nombre/identidad del dúo y su compañero.
- Mostrar posición actual de la pareja.
- Mostrar puntaje total del dúo en la fecha y acumulado de la fase cuando corresponda.
- Mostrar cualquier bonus que arrastre a la siguiente fecha.
- Desde semifinales, mostrar el rival y el bonus inicial de +2 si corresponde.

## Pendientes de definición

- Escala exacta de bonus por posición durante la fase de tabla.
- Si los puntos de tabla se acumulan de una fecha a otra o si cada fecha actúa como corte/eliminación con ranking nuevo más bonus de arrastre.
- Regla de empate en la tabla para decidir quién queda eliminado.
- Regla de empate en semifinal/final.
- Qué ocurre si un integrante del dúo no presenta.
- Qué ocurre si uno abandona/se da de baja en medio de la Copa.
