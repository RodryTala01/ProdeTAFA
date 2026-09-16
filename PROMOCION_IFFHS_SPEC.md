# ProdeTAFA — Promoción, zonas de Liga e IFFHS

Estado: Promoción y zonas de tabla casi confirmadas. IFFHS parcialmente reconstruida a partir del archivo histórico `ayuda para iffhs.xlsx`; faltan confirmar las fórmulas exactas de tres bloques variables y las reglas generales de corrimiento cuando Copa A/Copa B alteran ascensos/permanencias.

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
- Si hay empate se usa la regla general de desempate de cruces. Como Promoción suele ser la última fecha deportiva de la temporada, es probable que se cree una Fecha Desempate específica.
- El clasificado/ganador definitivo conserva confirmación administrativa y trazabilidad.

## Efectos de Copa A y Copa B sobre la movilidad

### Copa B

- El campeón de Copa B asciende a Liga A.
- Si el campeón de Copa B ya ocupa un lugar que normalmente daría ascenso/promoción, se libera un cupo y las posiciones siguientes se corren.
- Ejemplo confirmado: si el 2.º de Liga B gana Copa B, su ascenso queda asegurado por la Copa; entonces el 3.º pasa a ocupar funcionalmente el lugar de 2.º para Promoción y el 4.º entra como el siguiente cupo de Promoción.

La regla general exacta de corrimiento para cualquier posición del campeón de Copa B debe quedar explícita antes de automatizar la composición final de divisiones.

### Copa A

- El campeón de Copa A tiene permanencia asegurada en Liga A.
- Si termina en una posición de Promoción o descenso, su permanencia altera/corre los cupos de descenso/promoción.
- La regla general exacta de corrimiento debe confirmarse antes de automatizar el cierre de temporada.

## Colores y zonas visuales en tablas de Liga

La tabla debe diferenciar visualmente las zonas deportivas.

### Liga A

- 1.º: verde fuerte para campeón.
- 2.º a 7.º: color de clasificación a Copa Campeones.
- Dos posiciones de Promoción: color propio.
- Dos posiciones de descenso directo: color propio más fuerte/alerta.

Para 16 participantes, las zonas base son:

- 1.º campeón.
- 2.º–7.º Copa Campeones.
- 13.º–14.º Promoción.
- 15.º–16.º descenso directo.

### Liga B

- 1.º: color de ascenso directo.
- 2.º–3.º: color de Promoción.
- Cuando Copa B modifica los cupos efectivos, la UI debe poder reflejar el corrimiento real y/o señalar el ascenso asegurado del campeón de Copa B.

La lógica de colores no debe quedar hardcodeada únicamente para 16 si la cantidad de participantes puede variar; las zonas inferiores se calculan desde el final de la tabla.

## Copa Total — tabla de grupos

Confirmación adicional:

- Los “goles” de la tabla de Copa Total son los puntos de Prode obtenidos en cada enfrentamiento de mini-fecha.
- Ejemplo: un enfrentamiento `7-4` aporta al ganador +3 puntos de tabla, +7 GF, +4 GC y +3 DG.
- La tabla de grupo debe mostrar como mínimo:
  - PJ;
  - PG;
  - PE;
  - PP;
  - GF;
  - GC;
  - DG;
  - PTS.
- Orden: PTS → DG → GF → victorias.

## IFFHS — concepto general

- Es un ranking histórico/mundial de participantes.
- Considera las **últimas 5 temporadas**.
- Cada temporada genera una contribución de puntos según Liga y Copas.
- Al cerrar una nueva temporada se recalcula la tabla: entra la temporada nueva y sale completamente la que queda a 6 temporadas de distancia.
- No hay depreciación porcentual intermedia: cada una de las cinco temporadas vigentes conserva sus puntos completos mientras esté dentro de la ventana.
- La tabla IFFHS se vuelve a armar al finalizar cada temporada.
- Se utiliza para formar bombos de Copa A, Copa B y Copa Total.
- La pertenencia a un bombo se calcula **sólo entre los participantes habilitados para esa competición**. Por ejemplo, en Copa A no se toman simplemente los puestos 1–16 de la IFFHS global si alguno pertenece a Liga B.
- El campeón vigente de la competición correspondiente ocupa el lugar privilegiado/cabeza de serie definido por la Copa, y el resto se distribuye respetando la IFFHS entre los participantes elegibles.

## Reconstrucción del archivo `ayuda para iffhs.xlsx`

El archivo histórico contiene en `Hoja1` seis bloques de aportes individuales que luego se suman en una tabla dinámica/resumen. La comparación con los resultados T29 del Excel principal permite identificar con alta confianza:

1. **Liga T29** — 33 participantes, puntos variables.
2. **Copa A + Copa B T29** — 33 participantes, puntos variables y distinto peso según competición/división.
3. **Copa Total T29** — 33 participantes, puntos variables; es la Copa de mayor peso.
4. **Copa Papa T29** — 16 participantes puntuados desde los últimos 16 en adelante.
5. **Copa Dúos T29** — 26 participantes (13 dúos) con puntos iguales para los dos integrantes según la instancia/posición del dúo.
6. **Copa Campeones T29** — 14 participantes, con escalones de puntos según la instancia alcanzada en la llave escalonada.

El resumen de `Hoja1` suma todos esos aportes por participante para obtener la contribución/ranking de esa temporada de referencia.

### Copa Papa — escala visible en el archivo

La escala T29 se reconstruye de forma directa:

- campeón: 100;
- subcampeón: 75;
- eliminado en semifinal: 45;
- eliminado en cuartos: 30;
- eliminado en octavos / últimos 16: 22;
- eliminados antes de esa instancia: no aparecen en ese bloque y, por lo tanto, no reciben puntos de ese tramo.

### Copa Dúos — escala visible

El archivo muestra escalones individuales de:

- 5;
- 10;
- 15;
- 20;
- 30;
- 50.

Los dos integrantes de un dúo deben recibir el mismo aporte IFFHS correspondiente al resultado de la pareja. Falta confirmar la asociación exacta de cada escalón con cada ronda/corte de eliminación de la edición.

### Copa Campeones — escala visible

El archivo T29 muestra escalones:

- 10;
- 15;
- 25;
- 40;
- 50;
- 75;
- 100.

Son coherentes con la llave escalonada donde distintos clasificados ingresan en etapas diferentes. El campeón recibe 100 y el subcampeón 75; los demás escalones corresponden a la etapa en la que quedan eliminados.

## Pendiente de confirmar para automatizar IFFHS

El archivo histórico conserva los **resultados finales de puntos**, pero no las fórmulas que los originaron para los tres bloques variables:

- Liga;
- Copa A/B;
- Copa Total.

Antes de programar el cálculo automático hay que confirmar qué variables producen esos valores (puntos de Prode, posición, coeficiente de división/competición, bonus por ronda, etc.) y la escala exacta de Copa Dúos.
