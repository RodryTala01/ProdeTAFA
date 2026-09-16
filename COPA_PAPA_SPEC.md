# ProdeTAFA — Especificación Copa Papa

Estado: formato confirmado.

## Identidad

- `Copa Papa` es el nombre general de la competición.
- Cada edición puede adoptar un nombre homenaje distinto según un fallecido relevante; por ejemplo, una edición puede llamarse `Copa Miguel Ángel Russo`.
- A nivel de modelo conviene conservar una identidad estable de competición (`Copa Papa`) y un `display_name`/nombre de edición configurable.

## Participación

- Participan todos los participantes activos de ambas divisiones.
- No se usan bombos ni tabla IFFHS.
- La llave se arma según la posición final de la temporada anterior.
- Regla base de emparejamiento inicial: mejores posiciones de Liga A contra peores posiciones de Liga B, por ejemplo `1.º Liga A vs último Liga B`, continuando en espejo según el orden disponible.
- Si la cantidad total de participantes no encaja exactamente en una llave estándar, el Admin ajusta libres/byes manualmente preservando el criterio general por posiciones.
- Si hay 33 o más participantes, la copa puede comenzar en `32avos`; si hay menos, puede comenzar más adelante según corresponda.

## Llave

- Es una copa clásica de eliminación directa.
- No hay sorteos posteriores.
- Toda la llave queda determinada desde el inicio por el cuadro.
- El campeón vigente no recibe cabeza de serie especial por ser campeón; su posición depende únicamente de la clasificación de la temporada anterior.
- Una vez publicada/iniciada la fase, los cruces quedan bloqueados para participantes y flujo normal; el Admin conserva corrección excepcional con trazabilidad.

## Rondas

- Cada ronda se juega sobre una Fecha Copa completa de 12 partidos.
- Posibles fases, según cantidad de participantes:
  - 32avos
  - 16avos
  - 8vos
  - Cuartos
  - Semifinal
  - Final
  - Tercer puesto
- Si una edición empieza en una ronda posterior, las fases inexistentes simplemente no se crean.

## Puntaje y desempate

- Cada cruce compara los puntos obtenidos por ambos participantes en la Fecha Copa de esa ronda.
- Si quedan empatados, se aplica la regla general de desempate de Copas:
  1. siguiente fecha cronológica;
  2. comparación día por día;
  3. si siguen iguales al último día, partido por partido;
  4. si persiste, decisión administrativa sobre Fecha Desempate o continuación posterior.
- No se usan plenos, parciales, errores ni extras como desempate de la llave.

## Tercer puesto

- Copa Papa sí tiene partido por tercer puesto.
- El tercer puesto se resuelve como un cruce normal de Copa y puede compartir la misma Fecha Copa que la Final si así lo decide el Admin.

## Premio

- El campeón obtiene título/palmarés.
- No obtiene un beneficio deportivo adicional específico por ganar Copa Papa, aunque su condición de campeón puede servir como cupo para otra competición, como Copa Campeones.

## Administración

El Admin debe poder:

- definir el nombre homenaje de la edición;
- seleccionar participantes de la edición;
- cargar/confirmar el orden de posiciones de la temporada anterior;
- generar o ajustar la llave inicial;
- asignar byes/libres cuando la cantidad no cierre exactamente;
- confirmar manualmente clasificados;
- corregir cruces excepcionalmente con auditoría;
- gestionar tercer puesto y Final.

## Vista participante

- Mostrar nombre homenaje de la edición.
- Mostrar ronda actual y rival.
- Mostrar progresión de llave completa.
- Mostrar estado del cruce: pendiente / empatado / clasificado / eliminado.
