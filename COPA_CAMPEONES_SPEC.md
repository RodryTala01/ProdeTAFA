# ProdeTAFA — Especificación Copa Campeones

Estado: formato base confirmado a partir del esquema visual de la temporada anterior. Faltan resolver únicamente reglas de cupos duplicados/ausencias y confirmar la identidad exacta de los dos cupos provenientes de Copa Dúos.

## Principio general

- La Copa Campeones se define exclusivamente con logros y posiciones de la **temporada inmediatamente anterior**.
- No tiene fase de grupos.
- No se sortean los cruces: la estructura es una **llave escalonada fija**, donde determinados méritos ingresan en rondas más avanzadas.
- Cada enfrentamiento directo utiliza una Fecha Copa normal de 12 partidos.
- Los empates de una llave siguen la regla general de desempate de Copas: no se resuelven por plenos/parciales; continúan en la siguiente fecha cronológica según la lógica día por día y luego partido por partido.
- No hay tercer puesto salvo que una edición futura se redefina explícitamente.

## Cupos detectados en el formato compartido

La edición ilustrada utiliza 14 cupos:

- Campeón de Liga A / 1.º de Liga A.
- 2.º de Liga A.
- 3.º de Liga A.
- 4.º de Liga A.
- 5.º de Liga A.
- 6.º de Liga A.
- 7.º de Liga A.
- Campeón de Liga B.
- Campeón de Copa A.
- Campeón de Copa B.
- Campeón de Copa Papa.
- Campeón de Copa Total.
- Dos cupos provenientes de Copa Dúos, etiquetados en el esquema como `Dúo 1` y `Dúo 2`.

## Llave escalonada observada

### Rama superior

1. `7.º Liga A vs 3.º Liga A`.
2. El ganador enfrenta al `Campeón Liga B`.
3. El ganador enfrenta al `Campeón Copa A`.
4. El ganador enfrenta al `Campeón Copa Papa`.
5. El ganador enfrenta al `Campeón Copa Total`.
6. El vencedor de esta rama accede a la Final.

### Rama inferior

Primera zona:

- `5.º Liga A vs Campeón Copa B`.
- `4.º Liga A vs 6.º Liga A`.
- Los ganadores de esos dos cruces se enfrentan.
- El ganador enfrenta al cupo `Dúo 2`.

Segunda zona:

- `2.º Liga A vs Dúo 1`.

Convergencia:

- El ganador de la primera zona enfrenta al ganador de `2.º Liga A vs Dúo 1`.
- El ganador de ese cruce enfrenta al `Campeón Liga A / 1.º Liga A`.
- El vencedor de esta rama accede a la Final.

### Final

- Ganador de la rama superior vs ganador de la rama inferior.
- Una Fecha Copa normal define la Final, salvo que haya empate y se active la regla general de desempate.

## Implicancias de diseño

- No modelar Copa Campeones como una llave estándar de 16 con posiciones vacías genéricas: su valor está en los **byes deportivos predefinidos por mérito**.
- La app debe permitir representar una llave donde distintos cupos ingresan en distintas rondas.
- La fuente de cada cupo debe guardarse explícitamente (`league_position`, `competition_champion`, `duo_slot`, etc.) para poder generar la edición siguiente desde los resultados de la temporada previa.
- El admin debe conservar capacidad de corregir excepcionalmente un cupo o clasificado con auditoría.
- Si una misma persona ocupa más de un mérito/cupo, la regla de reasignación todavía debe definirse antes de automatizar la creación de la llave.
- Si un clasificado de la temporada anterior ya no participa, la regla de reemplazo también queda pendiente.

## Pendientes

- Confirmar si `Dúo 1` y `Dúo 2` son exactamente los dos integrantes del dúo campeón de la Copa Dúos anterior o representan otra clasificación.
- Definir qué ocurre si una misma persona obtiene dos o más cupos de clasificación.
- Definir qué ocurre si un clasificado ya no está activo al comenzar la Copa Campeones.
- Confirmar premio deportivo del campeón, si existe alguno además del título/palmarés.
