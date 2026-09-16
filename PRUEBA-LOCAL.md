# Prueba visual local de ProdeTAFA

URL: http://127.0.0.1:5174/

Preparación del 15/09/2026 (Argentina). D1 local en `.wrangler/state/v3/d1`, `remote: false`, migraciones 0001–0003 aplicadas. No se copiaron datos de producción. El servidor debe permanecer abierto.

## Cuentas ficticias

| Cuenta | Teléfono | Contraseña local |
| --- | --- | --- |
| Admin Prueba Local | 0000000001 | Admin123! |
| Rodrigo Prueba | 0000000101 | Prueba123! |
| Carlos Prueba | 0000000102 | Prueba123! |
| Vero Prueba | 0000000103 | Prueba123! |
| Azul Prueba | 0000000104 | Prueba123! |

Estas contraseñas son públicas de prueba, exclusivas de este entorno. La base almacena sus hashes mediante el flujo normal de la aplicación.

## Estado inicial

Cinco fechas `LOCAL E2E - Fecha 1` a `5`, todas draft, cada una con 12 partidos ficticios: Local 01–12 contra Visitante 01–12. Los partidos 11 y 12 son PENALTIES_ONLY; los demás NORMAL. La primera comienza el 22/09/2026 a las 23:49, hora argentina; las restantes comienzan en días sucesivos. Sin pronósticos, resultados, fechas publicadas ni temporadas creadas.

Los fixtures usan IDs `local-e2e-*` y proveedor `local-test`, excluido de la sincronización API-Football. Para esta prueba cargá resultados con **Corregir**. No uses **Buscar semana**, **Actualizar resultados** ni **Volver a API-Football**: los partidos son ficticios y no tienen resultados oficiales que recuperar.

## 1. Admin: preparar y publicar

1. Ingresá como Admin. En **Participantes**, comprobá las cuatro cuentas activas.
2. En **Liga**, creá la temporada `Liga LOCAL E2E`. Debe incluir a los cuatro participantes.
3. Vinculá las fechas 1, 2, 3, 4 y 5, en ese orden. Deben ocupar los slots 1–5 y mostrar cero puntos inicialmente.
4. En **Fechas**, elegí `LOCAL E2E - Fecha 1`. Comprobá los 12 partidos, los horarios y los dos marcados para penales.
5. Pulsá **Publicar fecha**. Debe quedar abierta. La lista de partidos ya no se puede modificar.
6. Si intentás publicar la Fecha 2 ahora, el backend debe rechazarlo porque ya hay una fecha abierta. Conservá la Fecha 2 en draft.

## 2. Participante: borrador, envío y edición

Usá una ventana privada para Rodrigo y conservá al Admin en la ventana normal. Dos pestañas normales comparten sesión.

1. Entrá como Rodrigo: **Pronósticos** debe mostrar Fecha 1, sin las otras fechas draft.
2. Cargá sólo el primer marcador y esperá el autosave. Recargá: debe conservarse como borrador.
3. Intentá enviar incompleto: debe bloquearse o indicar los partidos faltantes; no debe confirmar un envío.
4. Cargá **1–0 en todos los partidos salvo el 11, donde debés poner 1–1**. En los partidos 11 y 12 elegí al equipo local como ganador de una eventual tanda.
5. Pulsá **Enviar pronóstico**. Debe confirmar el envío.
6. Probá editar un marcador y restauralo al valor anterior. Sigue permitido porque el kickoff aún es futuro. Dejá los valores del paso 4 y volvé a enviar.
7. Antes de cerrar la fecha, Rodrigo no debe acceder al ranking final ni a los pronósticos de los demás. En **Liga**, los puntos siguen en cero mientras no haya resultados definitivos.

Dejá a Carlos, Vero y Azul sin enviar para comprobar que un no-presentado suma cero.

## 3. Admin: resultados manuales y puntos

En Fecha 1, buscá la sección de correcciones de resultados. Pulsá **Corregir** en cada partido y usá el motivo `Prueba E2E local`. Guardá cada corrección.

| Partido | Resultado de 90 minutos | Penales / anulado | Puntos de Rodrigo |
| --- | --- | --- | --- |
| 01 | 1–0 | Sin penales | 3 |
| 02 | 2–0 | Sin penales | 1 |
| 03 | 0–1 | Sin penales | 0 |
| 04 | No necesario | Marcar Partido anulado / sin puntos | 0, sin error |
| 05 a 10 | 1–0 cada uno | Sin penales | 18 en total |
| 11 | 1–1 | Marcar Llegó a penales; ganador Local 11 | 4 |
| 12 | 1–0 | Dejar Llegó a penales desmarcado | 3 |

Resultado esperado: **29 puntos = 28 base + 1 extra**, 9 plenos, 1 parcial, 1 error y 1 anulado. El partido 12 no otorga extra porque no hubo tanda, aunque esté marcado PENALTIES_ONLY.

El ranking Admin y la Liga deben incorporar los definitivos a medida que guardás. Actualizá la vista si todavía no se refrescó. Carlos, Vero y Azul quedan en cero. Volvé a guardar una corrección con los mismos datos y motivo: el total debe permanecer igual, sin duplicarse. Debe verse la auditoría de correcciones.

No cambies los pronósticos durante esta etapa: los horarios son futuros para facilitar la prueba y siguen abiertos hasta el cierre de la fecha. Esta preparación no simula el transcurso del reloj.

## 4. Cerrar fecha y consultar historial

1. Antes de completar todos los resultados, **Cerrar fecha** debe rechazar el cierre.
2. Con los 12 resultados definitivos/anulados, pulsá **Cerrar fecha**: debe quedar finalizada.
3. Como Rodrigo, recargá y revisá **Historial**: debe aparecer la fecha, su ranking final y los pronósticos enviados revelados. Ya no debe poder editarlos.
4. La Liga debe conservar los 29 puntos de Rodrigo.

## 5. Completar Liga y comprobar alta tardía

1. Tras cerrar Fecha 1, creá desde Admin un participante adicional `Tarde Prueba`, teléfono ficticio `0000000105`, contraseña local `Prueba123!`.
2. Como Fecha 2 está vinculada y no finalizada, debe incorporarse con elegibilidad desde el slot 2, sin puntos de Fecha 1.
3. Publicá Fecha 2. Repetí pronóstico, envío, correcciones y cierre. Continuá con fechas 3, 4 y 5, una abierta por vez.
4. Si Rodrigo repite exactamente el escenario en las cinco fechas, termina con **145 puntos**. Si el participante tardío repite el escenario sólo desde Fecha 2, termina con **116 puntos**, sin retroactividad.
5. Una Liga con alguna fecha no finalizada no debe poder cerrarse. Tras finalizar las cinco, en **Liga** pulsá **Finalizar Liga**: queda histórica e inmutable.
6. Opcional: desactivá a Carlos. Su login debe fallar y su registro de Liga debe conservarse. Reactivalo: vuelve a poder ingresar sin reescribir historia.

## Alcance de la verificación

La preparación verificó credenciales, estructura local, 39 tests y build. Los pasos visuales de publicación, envío, correcciones y cierre quedan intencionalmente pendientes para que los ejecutes. No se validó la integración real con API-Football ni el bloqueo por reloj: los fixtures son ficticios y futuros. Esto tampoco reemplaza la validación de producción exigida en AGENTS.md antes de iniciar Copas.

El script `scripts/seed-local.mjs` conserva cuentas y partidos existentes y no publica fechas. No modifica reglas funcionales ni incorpora endpoints de prueba. No necesitás ejecutar comandos para esta sesión.
