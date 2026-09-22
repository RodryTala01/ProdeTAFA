# T32 — Auditoría de trabajo restante

Fecha de auditoría: 2026-09-22  
Rama: `dev/t32-competition-engine`

Esta auditoría se realizó sobre el HEAD `33c0c816d832fe63885c50e4157e5c2b9b2b77f2` (`Add complete manual-first Copa Total administration`).

## Estado general

Ya están terminados y con UI Admin específica:

- Administración general de Competiciones.
- Copa A / Copa B.
- Copa Total.

Ya existen motores backend importantes para:

- Copa Dúos.
- Copa Campeones.
- Copa Papa.
- Promoción.
- IFFHS.
- transición de temporada.

El trabajo pendiente se concentra mayormente en UI, pruebas funcionales completas y hardening de invariantes.

## Prioridad inmediata

### 1. Copa Dúos Admin

Estado: backend avanzado, UI específica pendiente.

Backend ya existente:

- sorteo automático;
- configuración de eliminados y bonus por Fecha;
- tabla por jornada;
- confirmación/snapshot;
- semifinales 1.º vs 4.º y 2.º vs 3.º;
- +2 para 1.º y 2.º;
- final;
- sustitución de integrante con vigencia histórica;
- historial de integrantes;
- knockout y desempate TAFA reutilizables.

Pendiente principal:

- creación manual inicial de parejas;
- UI Admin completa;
- tests funcionales SQLite de punta a punta.

No inventar solución automática para cantidad impar.

## 2. Hardening del knockout genérico

Antes de cerrar las Copas con estructura fija, revisar `worker/competition-knockout.ts`.

Hoy la configuración genérica directa se bloquea específicamente para:

- COPA_A;
- COPA_B;
- COPA_TOTAL.

Pero siguen pudiendo pasar por el configurador genérico competiciones con reglas propias:

- COPA_DUOS;
- COPA_CAMPEONES;
- COPA_PAPA;
- PROMOCION.

Esto puede permitir saltear invariantes deportivos si se llama directamente al endpoint genérico.

Casos especialmente sensibles:

### Copa Campeones

La llave usa `competition_champions_nodes` y referencias entre nodos.

Un reemplazo genérico de encuentros podría desincronizar los nodos y sus `encounter_id`.

### Copa Papa

La llave queda fija desde el inicio y las rondas siguientes deben avanzar secuencialmente sin nuevos sorteos.

El endpoint genérico no debería permitir reconstruir arbitrariamente una fase saltándose esa progresión.

### Promoción

Los cruces deben ser exactamente los dos definidos por los cuatro cupos confirmados.

No debería poder reemplazarse la etapa por cruces genéricos.

### Copa Dúos

Las semifinales tienen reglas fijas 1.º vs 4.º y 2.º vs 3.º, con +2 para los dos mejores.

La configuración genérica no debe permitir eludir esa regla.

Acción recomendada: bloquear configuración genérica directa para estas competiciones y obligar a usar sus endpoints específicos. Mantener sólo correcciones excepcionales explícitas y auditadas donde corresponda.

## 3. Copa Campeones Admin

Estado backend: avanzado. UI específica inexistente.

Backend ya resuelve:

- 14 cupos deportivos;
- propuesta desde temporada anterior;
- cupos vacantes;
- duplicados no resueltos automáticamente;
- reemplazos manuales con motivo;
- entradas individuales;
- llave escalonada fija;
- activación de nodos sólo cuando sus fuentes están confirmadas;
- uso de `competition_encounters` para puntajes y TAFA.

Pendiente:

- UI de cupos;
- visualización de propuesta vs confirmado;
- corrección manual de duplicados/vacantes;
- inicialización de llave;
- representación clara rama superior / inferior / final;
- activación de cada nodo con Fecha vinculada;
- reutilizar CupEncounter para puntaje, confirmación y desempate;
- tests funcionales SQLite.

Los tests actuales de Campeones son mayormente contractuales/lectura de strings. Conviene agregar pruebas funcionales reales.

## 4. Copa Papa Admin

Estado backend: funcional, UI específica inexistente.

Backend existente:

- propuesta de siembra desde temporada anterior;
- mejor Liga A vs peor Liga B;
- todos los participantes activos exactamente una vez;
- byes manuales;
- llave inicial confirmada manualmente;
- rondas siguientes secuenciales;
- ganadores previamente confirmados;
- tercer puesto;
- knockout/TAFA compartidos.

Pendiente:

- UI de propuesta;
- carga/ajuste manual de llave inicial;
- visualización de byes;
- avance secuencial de ronda;
- Final y tercer puesto;
- tests funcionales SQLite.

No agregar sorteos posteriores: la llave debe quedar fija.

## 5. Promoción Admin

Estado backend: avanzado, UI específica inexistente.

Backend existente:

- posiciones de Promoción de Liga A calculadas desde el final;
- base Liga B 2.º y 3.º;
- propuesta de cuatro cupos;
- reemplazos/corrimientos manuales con motivo;
- dos cruces sobre una misma Fecha;
- ganadores a Liga A / perdedores a Liga B;
- movimientos de división propuestos;
- knockout/TAFA compartidos.

Pendiente:

- UI de propuesta de cupos;
- mostrar claramente casos modificados por Copa A / Copa B;
- confirmación manual de corrimientos;
- creación de los dos cruces;
- puntaje / confirmación / desempate;
- propuesta de movimientos finales;
- tests funcionales SQLite.

No automatizar casos extremos de corrimiento que el diseño dejó bajo revisión Admin.

## 6. IFFHS Admin y participante

Estado backend: bastante avanzado. UI inexistente.

Backend existente:

- importación de totales históricos;
- cálculo automático por temporada;
- componentes por competición;
- ranking móvil de cinco temporadas;
- puestos compartidos en empate exacto;
- protección contra sobrescribir históricos importados;
- ajustes manuales preservados;
- desglose seguro por participante;
- tratamiento explícito de sustituciones en Dúos.

Pendiente:

- UI ranking general;
- desglose por temporada;
- desglose por componente;
- acción Admin "Calcular IFFHS";
- importación manual histórica si se desea usar;
- advertencias de temporadas faltantes;
- tests funcionales del cálculo, no sólo contratos de código.

Punto a validar visualmente: el ranking general incluye usuarios participantes sin puntos en la ventana con total 0. Puede ser deseado para histórico, pero la UI debe tratarlo correctamente.

## 7. Transición T32 → T33

Estado backend: implementado. UI inexistente.

Backend existente:

- genera plan;
- usa resultados finales Liga A/B;
- incorpora movimientos de Promoción;
- garantiza Copa A;
- garantiza ascenso Copa B;
- detecta tamaño incorrecto de Liga A;
- marca casos que requieren revisión;
- Admin confirma cada destino;
- exige IFFHS completa antes de aplicar;
- crea nueva temporada en draft;
- crea divisiones, competiciones y etapas base de Liga.

Pendiente:

- UI de generación;
- mostrar propuesta y motivos;
- remarcar filas que requieren revisión;
- permitir corregir A/B con motivo;
- confirmar plan;
- aplicar plan;
- mostrar la nueva temporada creada.

### Punto a revisar antes de producción

La consulta de roster de transición toma miembros de la temporada pero no filtra explícitamente `users.is_active=1`.

Definir si un participante desactivado al cierre debe migrar automáticamente a la temporada siguiente. Si no, corregir antes de usar la transición real.

## 8. Vista participante — principal gap restante

Estado: todavía no existe contexto deportivo completo por Fecha.

`ParticipantRound` hoy carga el Prode de la Fecha y pronósticos.

`/api/competition-engine/current` devuelve:

- temporada;
- división;
- lista general de competiciones del usuario.

Pero NO devuelve los contextos concretos de la Fecha actual.

Para T32 jugable el participante necesita ver, encima del único pronóstico:

- Liga A/B · Fecha N;
- Copa A/B · grupo o cruce;
- Copa Total · grupo/mini-contexto cuando aplique;
- Copa Dúos · pareja/posición/rival desde semifinal;
- Copa Campeones · rival/nodo;
- Copa Papa · rival/ronda;
- Promoción;
- desempates pendientes.

Debe derivarse desde `competition_round_links`, entradas y encuentros reales.

No duplicar formularios: una Fecha sigue teniendo un único pronóstico de 12 partidos.

### Hallazgo de membresía Dúos

La consulta general de competiciones de `participantCurrent` une `competition_entry_members` por `user_id` sin aplicar vigencia temporal.

Un integrante sustituido de un Dúo podría seguir apareciendo como perteneciente a la competición en esa consulta general.

Cuando se construya el contexto participante, usar `valid_from_round_id` / `valid_to_round_id` para la Fecha consultada.

## 9. Resultados finales y palmarés

Existe `competition-results` en backend y es requisito para:

- IFFHS;
- Copa Campeones siguiente;
- Copa Papa siguiente;
- transición/histórico.

Revisar al cerrar cada UI deportiva que exista un flujo Admin claro para registrar:

- campeón;
- subcampeón;
- tercero cuando aplica;
- fase final alcanzada;
- posición final cuando aplica.

No depender de llamadas manuales invisibles a API.

## 10. Liga pendiente secundaria

Antes de cierre final de producto todavía quedan:

- movimiento de posición ↑N / ↓N comparado contra la Fecha Liga anterior;
- validación de una temporada real completa de cinco Fechas;
- historial completo por Fecha/partido;
- diferencias provisionales/definitivas más pulidas.

No bloquean construir las UIs restantes de Copas.

## Orden recomendado desde este punto

1. Terminar Copa Dúos Admin.
2. Hardening del knockout genérico para competiciones con reglas propias.
3. Copa Campeones Admin.
4. Copa Papa Admin.
5. Promoción Admin.
6. Resultados finales/palmarés operativo en Admin.
7. IFFHS Admin.
8. Transición de temporada UI.
9. Contextos de competición en ParticipantRound.
10. Vista participante de Copas / llaves / tablas.
11. Prueba integral T32 desde temporada vacía hasta cierre.
12. Recién después merge a `main`.
13. Diseño/pulido/PWA/APK después de funcionalidad.

## Criterio para declarar "T32 lista para jugar"

No declarar lista hasta poder completar en local, sin SQL manual:

1. crear/configurar T32;
2. cargar divisiones;
3. armar todas las Copas;
4. vincular Fechas;
5. jugar Liga y Copas usando un único pronóstico;
6. administrar desempates;
7. confirmar campeones/resultados;
8. resolver Promoción;
9. calcular IFFHS;
10. generar y confirmar transición T33.

Además:

- tests;
- build;
- CI verde;
- prueba móvil;
- sin usar D1 remota para validación.
