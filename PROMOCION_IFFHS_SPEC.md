# ProdeTAFA — Promoción, zonas de Liga e IFFHS

Estado: Promoción, zonas de tabla e IFFHS confirmadas en su estructura y criterios actuales. Los criterios IFFHS toman como fuente directa `TABLA IFFHS.xlsx`. Liga C/Copa C quedan únicamente como formato histórico/futuro potencial y no deben activarse ni implementarse ahora salvo nueva definición del usuario.

## Promoción A/B

### Estructura base

Para una Liga A de 16 participantes:

- 1.º: campeón.
- 2.º a 7.º: clasificación por posición a Copa Campeones de la temporada siguiente, sujeto a reemplazos por cupos duplicados según las reglas de esa copa.
- 13.º y 14.º: Promoción.
- 15.º y 16.º: descenso directo a Liga B.

Regla general para una Liga A de `N` participantes:

- los dos últimos descienden directamente;
- los dos inmediatamente superiores disputan Promoción.

Para Liga B:

- 1.º: ascenso directo a Liga A por Liga.
- 2.º y 3.º: Promoción en el escenario base.
- El campeón de Copa B obtiene además ascenso asegurado a Liga A y puede desplazar/correr los cupos normales si ya ocupaba una posición de ascenso/promoción.

### Cruces de Promoción

En el escenario base de 16 participantes:

- 2.º Liga B vs 14.º Liga A.
- 3.º Liga B vs 13.º Liga A.

Los dos cruces se disputan simultáneamente usando una única Fecha de 12 partidos, del mismo modo que dos finales paralelas.

- Ganador del cruce: jugará Liga A la temporada siguiente.
- Perdedor del cruce: jugará Liga B la temporada siguiente.
- Los puntos del enfrentamiento se calculan automáticamente con el Prode de esa fecha.
- Si hay empate se usa la regla general de desempate de cruces. Como Promoción suele ser la última fecha deportiva de la temporada, puede crearse una Fecha Desempate específica.
- El clasificado/ganador definitivo conserva confirmación administrativa y trazabilidad.

## Efectos de Copa A y Copa B sobre la movilidad

### Copa B

- El campeón de Copa B asciende a Liga A.
- Si el campeón de Copa B ya ocupa un lugar que normalmente daría ascenso/promoción, se libera un cupo y las posiciones siguientes se corren.
- Ejemplo confirmado: si el 2.º de Liga B gana Copa B, su ascenso queda asegurado por la Copa; entonces el 3.º pasa a ocupar funcionalmente el lugar de 2.º para Promoción y el 4.º entra como siguiente cupo de Promoción.

### Copa A

- El campeón de Copa A tiene permanencia asegurada en Liga A.
- Si termina en una posición de Promoción o descenso, su permanencia altera/corre los cupos de descenso/promoción.

## Colores y zonas visuales en tablas de Liga

### Liga A

Para 16 participantes:

- 1.º: verde fuerte, campeón.
- 2.º–7.º: zona de clasificación por Liga a Copa Campeones.
- 13.º–14.º: zona de Promoción.
- 15.º–16.º: descenso directo.

La UI debe diferenciar claramente estas zonas.

### Liga B

- 1.º: ascenso directo.
- 2.º–3.º: Promoción.
- Si Copa B libera/corre cupos, la interfaz debe mostrar los cupos efectivos resultantes.

La lógica inferior debe calcularse desde el final de la tabla si cambia el número de participantes.

## Copa Total — tabla de grupos

- Los “goles” son los puntos de Prode conseguidos en cada enfrentamiento de mini-fecha.
- Ejemplo: `7-4` aporta al ganador +3 puntos de tabla, +7 GF, +4 GC y +3 DG.
- La tabla debe mostrar:
  - PJ;
  - PG;
  - PE;
  - PP;
  - GF;
  - GC;
  - DG;
  - PTS.
- Orden: PTS → DG → GF → victorias.

# IFFHS

## Concepto general

- Ranking histórico/mundial de participantes.
- Considera las **últimas 5 temporadas**.
- Cada temporada aporta un total calculado con resultados de Liga y Copas.
- Al cerrar una nueva temporada entra esa temporada y sale por completo la que pasa a ser la sexta más antigua.
- No hay depreciación progresiva: las cinco temporadas vigentes valen completas.
- La tabla se recalcula al finalizar cada temporada.
- Se usa para formar bombos de Copa A, Copa B y Copa Total.
- Los bombos se arman entre los participantes elegibles para esa competición, no tomando mecánicamente los primeros N de la tabla global.
- El campeón vigente de la competición mantiene su privilegio/cabeza de serie cuando la regla de esa Copa así lo dispone.
- Si dos o más participantes terminan con exactamente el mismo total IFFHS, **comparten el mismo puesto**. No se aplica ningún criterio adicional de desempate.

## Liga C / Copa C

- Liga C y Copa C existieron como formato histórico y sus criterios IFFHS se conservan para poder interpretar temporadas antiguas.
- No están activas en la estructura actual.
- No deben implementarse ahora como una tercera división operativa.
- Si la cantidad de participantes crece y vuelve a ser necesaria una Liga C, el usuario definirá junto con el sistema sus reglas actuales, ascensos/descensos, clasificación a copas y relación con Liga A/B antes de activarla.
- Los coeficientes IFFHS históricos de Liga C/Copa C quedan disponibles como referencia, pero no deben forzar automáticamente el formato futuro si este cambia.

## Criterios de puntuación — Ligas

Criterios exactos del archivo `TABLA IFFHS.xlsx`:

### Liga A

- Campeón Liga A: **100 pts**.
- Subcampeón Liga A: **75 pts**.
- Posición en Liga A: **1 punto por posición de abajo hacia arriba + cantidad de participantes de Liga B y Liga C**. El campeón no suma este componente de posición.
- Puntos deportivos conseguidos en Liga A: **× 1,3**.
- Plenos conseguidos en Liga A: **× 2,25**.
- Posición en ranking de errores Liga A: **2 pts por posición de abajo hacia arriba**.

### Liga B

- Campeón Liga B: **30 pts**.
- Subcampeón Liga B: **20 pts**.
- Posición en Liga B: **1 punto por posición de abajo hacia arriba + cantidad de participantes de Liga C**. El campeón no suma este componente de posición.
- Puntos deportivos conseguidos en Liga B: **× 0,75**.
- Plenos conseguidos en Liga B: **× 1,5**.
- Posición en ranking de errores Liga B: **1 pt por posición de abajo hacia arriba**.

### Liga C

Histórico/futuro potencial, no activo actualmente:

- Campeón Liga C: **25 pts**.
- Posición en Liga C: **1 punto por posición de abajo hacia arriba**. El campeón no suma este componente de posición.
- Puntos deportivos conseguidos en Liga C: **× 0,5**.
- Plenos conseguidos en Liga C: **× 0,75**.
- Posición en ranking de errores Liga C: **0,5 pts por posición de abajo hacia arriba**.

## Criterios de puntuación — Copas

### Copa A

- Campeón: **75 pts**.
- Posición alcanzada:
  - Octavos: **10 pts**.
  - Cuartos: **15 pts**.
  - Semifinales: **25 pts**.
  - Subcampeón: **40 pts**.
- Puntos conseguidos en fase de grupos de Copa A: **× 1,3**.

### Copa B

- Campeón: **25 pts**.
- Posición alcanzada:
  - Octavos: **4 pts**.
  - Cuartos: **8 pts**.
  - Semifinales: **12 pts**.
  - Subcampeón: **18 pts**.
- Puntos conseguidos en fase de grupos de Copa B: **× 0,75**.

### Copa C

Histórica/futura potencial, no activa actualmente:

- Campeón: **30 pts**.
- Posición alcanzada:
  - Octavos: **2 pts**.
  - Cuartos: **5 pts**.
  - Semifinales: **8 pts**.
  - Subcampeón: **15 pts**.
- Puntos conseguidos en fase de grupos de Copa C: **× 0,5**.

### Copa Campeones

- Campeón: **100 pts**.
- Posición alcanzada:
  - 32avos: **10 pts**.
  - 16avos: **15 pts**.
  - Octavos: **25 pts**.
  - Cuartos: **40 pts**.
  - Semifinales: **50 pts**.
  - Subcampeón: **75 pts**.

### Copa Total

- Campeón: **100 pts**.
- Posición alcanzada:
  - Octavos: **30 pts**.
  - Cuartos: **45 pts**.
  - Semifinales: **60 pts**.
  - Subcampeón: **75 pts**.
- Puntos conseguidos en fase de grupos de Copa Total: **× 3,5**.

### Copa Dúos

- Campeón: **50 pts** para cada integrante del dúo campeón.
- Posición/fase alcanzada:
  - Fase 2: **5 pts**.
  - Fase 3: **10 pts**.
  - Fase 4: **15 pts**.
  - Fase 5: **20 pts**.
  - Subcampeón: **30 pts**.
- Los dos integrantes del dúo reciben el mismo aporte correspondiente a la fase alcanzada por la pareja.

### Copa Papa

- Campeón: **100 pts**.
- Posición alcanzada:
  - Octavos: **22 pts**.
  - Cuartos: **30 pts**.
  - Semifinales: **45 pts**.
  - Subcampeón: **75 pts**.

## Cálculo por temporada y ventana histórica

La contribución IFFHS de una temporada es la suma de todos los componentes aplicables de Liga y Copas para cada participante.

El ranking histórico IFFHS es la suma de las contribuciones de las últimas cinco temporadas completas.

Al finalizar una temporada nueva:

1. calcular la contribución IFFHS individual de esa temporada;
2. agregarla al historial;
3. eliminar del cómputo la temporada que pasa a quedar fuera de las últimas cinco;
4. recalcular el ranking global;
5. asignar el mismo puesto a totales idénticos;
6. usar la tabla resultante para los próximos sorteos/bombos que correspondan.

## Pendientes

Los criterios deportivos e IFFHS actuales ya están suficientemente definidos para diseñar el modelo de datos.

Antes de automatizar el cierre completo de temporada todavía conviene cerrar por separado las reglas generales de corrimiento de cupos cuando Copa A/Copa B alteran permanencias/ascensos en casos extremos. La importación de temporadas antiguas incompletas también puede resolverse más adelante si finalmente se desea cargar historia previa en la app.
