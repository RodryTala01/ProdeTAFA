# ProdeTAFA — Especificación Copa Campeones

Estado: formato funcional confirmado.

## Principio general

- La Copa Campeones se define exclusivamente con logros y posiciones de la **temporada inmediatamente anterior**.
- No tiene fase de grupos.
- No se sortean los cruces: la estructura es una **llave escalonada fija**, donde determinados méritos ingresan en rondas más avanzadas.
- Cada enfrentamiento directo utiliza una Fecha Copa normal de 12 partidos.
- Los empates de una llave siguen la regla general de desempate de Copas: no se resuelven por plenos/parciales; continúan en la siguiente fecha cronológica según la lógica día por día y luego partido por partido.
- No hay tercer puesto.
- El campeón obtiene título/palmarés, sin beneficio deportivo adicional confirmado.

## Cupos del formato

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
- `Dúo 1` y `Dúo 2`: son exactamente los dos integrantes del dúo campeón de la Copa Dúos de la temporada anterior.

## Llave escalonada

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
- El ganador enfrenta a `Dúo 2`.

Segunda zona:

- `2.º Liga A vs Dúo 1`.

Convergencia:

- El ganador de la primera zona enfrenta al ganador de `2.º Liga A vs Dúo 1`.
- El ganador de ese cruce enfrenta al `Campeón Liga A / 1.º Liga A`.
- El vencedor de esta rama accede a la Final.

### Final

- Ganador de la rama superior vs ganador de la rama inferior.
- Una Fecha Copa normal define la Final, salvo empate y aplicación de la regla general de desempate.

## Cupos duplicados y ausencias

- Si una misma persona clasifica por dos o más vías, **no existe una reasignación automática fija**.
- El reemplazo lo decide manualmente el Admin.
- Según el caso, el Admin puede adelantar posiciones de Liga u otorgar el cupo mediante otro criterio deportivo de esa edición.
- Si un clasificado de la temporada anterior ya no participa en la temporada actual, el reemplazo también lo decide manualmente el Admin.
- Estas sustituciones deben quedar auditadas indicando cupo original, participante reemplazado, participante ingresado y motivo.

## Implicancias de diseño

- No modelar Copa Campeones como una llave estándar de 16 con posiciones vacías genéricas: su valor está en los **byes deportivos predefinidos por mérito**.
- La app debe poder representar una llave donde distintos cupos ingresan en distintas rondas.
- La fuente de cada cupo debe guardarse explícitamente (`league_position`, `competition_champion`, `duo_champion_member`, etc.).
- La app puede proponer/prellenar los cupos a partir de los resultados de la temporada anterior, pero los cupos finales deben quedar bajo confirmación administrativa.
- Debe ser posible reemplazar manualmente un cupo duplicado o ausente sin modificar los resultados históricos que originaron la clasificación.
- El Admin conserva capacidad de corregir excepcionalmente un clasificado con auditoría.
