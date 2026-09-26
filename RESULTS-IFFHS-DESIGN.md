# Diseño — resultados finales, palmarés e IFFHS

Estado: contrato previo a UI Admin.

## Objetivo

`competition_results` es la fuente explícita de resultados finales de cada competición.

Se usa para:

- palmarés;
- IFFHS;
- Copa Campeones de la temporada siguiente;
- Copa Papa de la temporada siguiente;
- transición/histórico.

No depender de inferencias invisibles ni de llamadas manuales fuera de la UI.

## Endpoint existente

Lectura:

`GET /api/competition-engine/competitions/:id/results`

Confirmación Admin:

`PUT /api/admin/competition-engine/competitions/:id/results`

El PUT reemplaza el snapshot completo de resultados de la competición y queda auditado.

## Regla general de UI

Cada pantalla deportiva específica debe poder terminar en un paso:

**Confirmar resultados finales**

Antes de guardar mostrar propuesta calculada desde:

- tabla final;
- encounters confirmados;
- grupos;
- fase alcanzada.

Admin revisa y confirma.

No adivinar ganadores no confirmados.

## Liga A/B

Para cada entrada:

- `resultCode: POSITION`
- `finalPosition: posición final`

El IFFHS de Liga deriva campeón/subcampeón desde `final_position`, además de puntos/plenos/errores deportivos.

Todas las entradas deben tener resultado final.

## Copa A/B

Una fila por entrada.

Códigos posibles:

- CHAMPION
- RUNNER_UP
- SEMIFINAL
- QUARTERFINAL
- ROUND_OF_16
- GROUP_STAGE

`finalPosition` puede usarse donde exista una posición deportiva inequívoca, pero el IFFHS de Copa se basa principalmente en `resultCode`.

No otorgar código de una fase superior a alguien cuyo encuentro no fue confirmado.

## Copa Total

Códigos:

- CHAMPION
- RUNNER_UP
- THIRD
- SEMIFINAL
- QUARTERFINAL
- ROUND_OF_16
- GROUP_STAGE

El ganador del tercer puesto usa:

- `resultCode: THIRD`
- `finalPosition: 3`

El cuarto puede usar:

- `resultCode: SEMIFINAL`
- `finalPosition: 4`

IFFHS:

- THIRD = valor de semifinalista (60).
- SEMIFINAL = 60.

Esto preserva el reconocimiento del tercer puesto sin perder el aporte IFFHS por haber alcanzado semifinal.

## Copa Papa

Códigos:

- CHAMPION
- RUNNER_UP
- THIRD
- SEMIFINAL
- QUARTERFINAL
- ROUND_OF_16
- fases anteriores sin aporte específico pueden usar ROUND_OF_32 / ROUND_OF_64 según corresponda, con 0 IFFHS si no existe valor definido.

IFFHS:

- THIRD = valor de semifinalista (45).
- SEMIFINAL = 45.

## Copa Campeones

Códigos IFFHS:

- CHAMPION = 100
- RUNNER_UP = 75
- SEMIFINAL = 50
- QUARTERFINAL = 40
- ROUND_OF_16 = 25
- ROUND_OF_32 = 15
- ROUND_OF_64 = 10

Nota de nomenclatura histórica:

- ROUND_OF_64 representa el aporte documentado como 32avos;
- ROUND_OF_32 representa 16avos;
- ROUND_OF_16 representa Octavos.

Mantener la convención que ya usa el calculador/test existente.

No hay tercer puesto.

## Copa Dúos

Resultados son por `competition_entry` de tipo DUO.

Códigos:

- CHAMPION = 50
- RUNNER_UP = 30
- PHASE_5 = 20
- PHASE_4 = 15
- PHASE_3 = 10
- PHASE_2 = 5

Cada integrante que corresponde recibe el aporte.

### Sustituciones

Si el Dúo tuvo más de dos integrantes históricos, no asumir automáticamente quién recibe IFFHS.

El resultado debe incluir:

```json
{
  "iffhsUserIds": ["usuario-1", "usuario-2"]
}
```

dentro de `detail`.

La UI debe mostrar la composición histórica y exigir una elección explícita cuando el backend detecte sustituciones.

No hay tercer puesto.

## Promoción

Promoción no aporta IFFHS como Copa en el cálculo actual.

Sus resultados sí deben conservarse mediante:

- encounters;
- movimientos de división;
- auditoría.

No hace falta inventar un componente IFFHS de Promoción.

## Estado de competición

Antes de calcular IFFHS:

- las competiciones con entradas deben estar `finished`;
- cada entrada debe tener exactamente un resultado final confirmado.

La UI de cierre de temporada debe mostrar qué competición está incompleta.

## UI Admin propuesta

Dentro de cada competición:

`Resultados finales`

Mostrar:

| Participante/entrada | Resultado sugerido | Posición | Estado |
| --- | --- | --- | --- |

Botón:

`Confirmar resultados`

Si ya hay snapshot:
- mostrar quién/cuándo lo confirmó;
- permitir reemplazar mientras la competición no esté archivada;
- advertir que afecta IFFHS/histórico.

## Palmarés

La vista histórica puede derivarse directamente de `competition_results`.

No crear otra tabla de campeones si no hace falta.

Mostrar por temporada:

- campeón;
- subcampeón;
- tercero donde aplique;
- nombre visible de la edición;
- código canónico;
- integrantes del Dúo si corresponde.

## IFFHS

La UI de IFFHS debe bloquear o explicar el cálculo si faltan resultados.

Flujo Admin:

1. cerrar/confirmar resultados de todas las competiciones;
2. calcular IFFHS de la temporada;
3. revisar componentes;
4. revisar total;
5. usar ranking resultante para próxima temporada.

## Tests necesarios

1. Liga completa guarda una fila por entrada.
2. Copa A/B asigna fase correcta.
3. Copa Total tercer puesto guarda THIRD/3 y recibe 60 IFFHS.
4. Copa Total cuarto recibe SEMIFINAL/4 y 60 IFFHS.
5. Papa tercer puesto recibe 45 IFFHS.
6. Campeones respeta códigos por fase.
7. Dúos sin sustitución reparte a sus dos miembros.
8. Dúos con sustitución exige `iffhsUserIds`.
9. IFFHS rechaza competición finalizada con resultados incompletos.
10. reemplazo de resultados queda auditado.
