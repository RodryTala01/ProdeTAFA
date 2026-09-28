# ProdeTAFA — Especificación Copa Dúos

Estado: formato funcional confirmado a nivel de reglas generales. Los valores concretos de bonus por posición se configuran por etapa/fecha y no deben quedar hardcodeados.

## Participación y formación

- La Copa Dúos se disputa en parejas de 2 participantes.
- Las parejas se forman de manera totalmente aleatoria.
- El sorteo puede realizarse dentro o fuera de la app. Admin debe poder cargar manualmente las parejas resultantes, con validación de elegibilidad, sin integrantes duplicados y con auditoría. El sorteo automático es una opción asistida, nunca la única vía.
- La pareja se considera estable durante la competencia, salvo cambio excepcional administrado manualmente.
- El sistema debe permitir que, en una edición futura o ante una situación excepcional, el admin cambie un integrante del dúo sin perder la historia previa.
- Un cambio de integrante debe tener vigencia desde una fecha/fase concreta hacia adelante; los resultados anteriores siguen asociados a la composición que realmente disputó esas jornadas.
- El puntaje del dúo en cada fecha es la suma de los puntos obtenidos por sus dos integrantes en el mismo Prode de 12 partidos.

## Formato general

- Durante la mayor parte de la competencia NO hay enfrentamientos directos entre dúos.
- Se utiliza una tabla general de dúos para cada jornada/fase.
- Cada nueva jornada comienza con **0 puntos de juego**; no se acumulan los puntos obtenidos en jornadas anteriores.
- Lo único que puede arrastrarse de una jornada a la siguiente es el **bonus por posición** obtenido en la jornada anterior.
- Al terminar cada fecha, se eliminan los últimos dúos de la tabla.
- La cantidad de dúos eliminados por fecha depende de cuántos dúos haya en esa edición y la decide/configura el admin.
- Según la posición conseguida por un dúo en una fecha, puede recibir un bonus de puntos para la fecha siguiente.
- La escala de bonus puede cambiar según la etapa, por lo que debe configurarse por fecha/fase y no quedar fija en código.
- La tabla y la eliminación deben soportar cantidades variables de participantes.

## Empates en fase de tabla

- Si existe un empate que afecta una clasificación o eliminación, no se resuelve mediante plenos/parciales u otros criterios secundarios.
- El desempate se continúa en la siguiente Fecha Liga usando la regla general de desempates de Copa documentada para ProdeTAFA.
- Si hay tres o más dúos empatados, todos se comparan en la misma Fecha Liga posterior con TAFA. No usar orden alfabético ni estadísticas secundarias para decidir el corte. También deben quedar definidos los puestos 1–4 antes de construir semifinales.
- El admin conserva la confirmación final de clasificados/eliminados cuando corresponda.

## Llegada a semifinales

- La fase históricamente llamada `Cuartos` continúa funcionando como tabla general, no como cruces directos.
- Al finalizar esa etapa deben quedar 4 dúos clasificados.
- Recién entonces se arman semifinales directas:
  - 1.º vs 4.º
  - 2.º vs 3.º
- En semifinales, el 1.º y el 2.º comienzan con **+2 puntos extra** respecto de sus rivales.
- El resultado de cada semifinal se calcula con la suma de puntos de los dos integrantes del dúo, más el bonus inicial cuando corresponda.
- Si una semifinal termina empatada, se aplica la regla general de desempate de Copa en la siguiente Fecha Liga.

## Final y tercer puesto

- Los ganadores de semifinales disputan la final.
- La final utiliza la suma de puntos de ambos integrantes del dúo, con los bonus que se hayan definido para esa fase si correspondieran.
- Si la final termina empatada, se aplica la regla general de desempate de Copa.
- Copa Dúos NO tiene partido por tercer puesto.
- El campeón es el dúo ganador de la final.

## Puntos y ausencias

- El puntaje base del dúo es siempre la suma de los puntos individuales de ambos integrantes en esa fecha.
- Si uno de los integrantes no presenta pronóstico, aporta **0 puntos** y el compañero sigue aportando sus puntos normalmente.
- Si ambos no presentan, el dúo obtiene 0 puntos antes de cualquier bonus aplicable.
- Una ausencia no rompe automáticamente el dúo.

## Bonus por posición

- Existe un sistema de puntos extra para la fecha siguiente según la posición conseguida en la tabla.
- La escala exacta de bonus **cambia según la etapa**.
- El admin debe poder definir los bonus de cada posición para cada jornada/fase.
- El bonus debe persistirse de forma explícita y visible; no inferirse retroactivamente.
- Al comenzar la fecha siguiente, el puntaje del dúo es: `bonus de arrastre + suma de puntos obtenidos por los dos integrantes en esa fecha`.

## Cambios de integrante

- El sistema debe permitir sustituir excepcionalmente un integrante de un dúo.
- La sustitución es una acción administrativa.
- Debe registrarse quién salió, quién ingresó, desde qué fecha/fase rige y cuándo se realizó el cambio.
- No recalcular ni reatribuir resultados históricos anteriores al cambio.
- Después del cambio, el nuevo integrante aporta puntos al dúo a partir de la fecha de vigencia indicada.

## Administración

El Admin deberá poder:

- generar/cargar las parejas aleatorias;
- ver y editar excepcionalmente la composición de un dúo con vigencia temporal y auditoría;
- definir cuántos dúos se eliminan en cada fecha;
- ver tabla general y puntajes calculados automáticamente;
- configurar/aplicar los bonus de la fecha siguiente por posición y etapa;
- identificar empates pendientes que deban resolverse en la siguiente Fecha Liga;
- confirmar qué 4 dúos avanzan a semifinales;
- generar automáticamente los cruces 1.º vs 4.º y 2.º vs 3.º, permitiendo corrección administrativa con auditoría;
- gestionar semifinales y final.

## Vista participante

- Mostrar el nombre/identidad del dúo y su compañero vigente.
- Mostrar posición actual de la pareja.
- Mostrar puntaje obtenido por cada integrante y total del dúo en la fecha.
- Mostrar cualquier bonus que arrastre a la siguiente fecha.
- Desde semifinales, mostrar el rival y el bonus inicial de +2 si corresponde.
- Si hubo una sustitución histórica, las vistas de fechas pasadas deben seguir mostrando la composición que existía en esa fecha.

## Implementación Admin

Ver [ADMIN-COPA-DUOS.md](ADMIN-COPA-DUOS.md). La vigencia de salida es exclusiva: el integrante saliente ya no suma en esa Fecha y el entrante sí. Los snapshots confirmados conservan integrantes y puntajes.
