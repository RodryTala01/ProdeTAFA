# Codex — próximos bloques después de Copa Dúos

Rama: `dev/t32-competition-engine`

Usar estos bloques en orden. Cada bloque debe partir del HEAD real de la rama, conservar lo ya implementado y terminar con tests/build/CI verdes.

Reglas globales para todos los bloques:

- NO trabajar en `main`.
- NO mergear a `main`.
- NO deploy.
- NO tocar D1 remota.
- D1 y migraciones sólo LOCAL.
- No rehacer Copa A/B ni Copa Total.
- Reutilizar `CupEncounter`, knockout y TAFA cuando corresponda.
- Manual primero cuando exista decisión Admin; automatización sólo como asistencia.
- Validaciones deportivas sensibles siempre en backend.
- Preferir pruebas funcionales SQLite a tests que sólo buscan strings.

---

# BLOQUE A — Hardening + Copa Campeones Admin

## Objetivo

Cerrar invariantes del knockout genérico y construir la UI Admin completa de Copa Campeones.

## 1. Hardening obligatorio antes de UI

Revisar `worker/competition-knockout.ts`.

La configuración genérica directa ya se bloquea para:

- COPA_A
- COPA_B
- COPA_TOTAL

Extender protección para impedir que el configurador genérico saltee reglas propias de:

- COPA_DUOS
- COPA_CAMPEONES
- COPA_PAPA
- PROMOCION

No bloquear lectura/refresco/puntaje compartido.

Bloquear sólo vías capaces de reemplazar o reconfigurar cruces saltándose los endpoints específicos.

Motivo:

- Dúos tiene semifinales fijas.
- Campeones tiene nodos y referencias.
- Papa tiene llave fija.
- Promoción tiene dos cruces obligatorios.

Agregar tests funcionales de que esas competiciones rechazan configuración genérica arbitraria.

## 2. Copa Campeones Admin

Integrar en:

Admin → Competiciones → Copa Campeones → Administrar

Backend existente:

- GET `/api/competition-engine/competitions/:id/champions/slots`
- POST `/api/admin/competition-engine/competitions/:id/champions/prefill`
- PUT `/api/admin/competition-engine/competitions/:id/champions/slots`
- GET `/api/competition-engine/competitions/:id/champions/bracket`
- POST `/api/admin/competition-engine/competitions/:id/champions/bracket`
- POST `/api/admin/competition-engine/competitions/:id/champions/nodes/:code/activate`

Reutilizar knockout y TAFA para encuentros activos.

### Cupos

Mostrar los 14 cupos:

- Liga A 1.º–7.º
- Campeón Liga B
- Campeón Copa A
- Campeón Copa B
- Campeón Copa Papa
- Campeón Copa Total
- los dos integrantes del Dúo campeón

Botón:

`Generar propuesta desde temporada anterior`

Mostrar:

- cupo;
- fuente deportiva;
- propuesto;
- confirmado;
- estado;
- motivo si fue reemplazado.

Duplicados NO se resuelven solos.

Admin debe elegir reemplazo y escribir motivo.

No permitir una misma persona dos veces.

### Llave fija

Después de confirmar los 14 cupos:

`Inicializar llave`

Mostrar claramente rama superior, rama inferior y final.

No transformarla en bracket genérico de 16.

Nodos confirmados:

Superior:
- U1: A7 vs A3
- U2: ganador U1 vs campeón Liga B
- U3: ganador U2 vs campeón Copa A
- U4: ganador U3 vs campeón Copa Papa
- U5: ganador U4 vs campeón Copa Total

Inferior:
- L1: A5 vs campeón Copa B
- L2: A4 vs A6
- L3: ganador L1 vs ganador L2
- L4: ganador L3 vs Dúo 2
- L5: A2 vs Dúo 1
- L6: ganador L4 vs ganador L5
- L7: ganador L6 vs campeón Liga A

Final:
- U5 vs L7

Un nodo sólo puede activarse cuando sus dos fuentes están listas.

Al activar:
- elegir etapa KNOCKOUT correspondiente;
- elegir Fecha ya vinculada;
- crear encuentro mediante endpoint específico.

Usar `CupEncounter` para:
- puntaje;
- confirmar ganador;
- estado;
- TAFA.

No tercer puesto.

### Pruebas

Agregar pruebas SQLite reales de:

- prefill con temporada anterior;
- cupos vacantes;
- duplicados;
- reemplazo con motivo;
- los 14 usuarios únicos;
- inicialización de los 13 nodos;
- U1 y L1/L2/L5 listos al inicio según fuentes;
- nodos de ganador bloqueados hasta confirmación;
- activación con stage/link correctos;
- ganador desbloquea siguiente nodo;
- final sólo después de U5 y L7;
- TAFA;
- bloqueo de configuración genérica;
- móvil.

---

# BLOQUE B — Copa Papa Admin

## Objetivo

Exponer la Copa Papa completa sin modificar su llave fija.

Integrar:

Admin → Competiciones → Copa Papa → Administrar

Backend existente:

- GET `/api/competition-engine/competitions/:id/papa/seeding-proposal`
- POST `/api/admin/competition-engine/competitions/:id/papa/initial-bracket`
- POST `/api/admin/competition-engine/stages/:id/papa/next-round`
- POST `/api/admin/competition-engine/stages/:id/papa/third-place`

Reutilizar knockout / CupEncounter / TAFA.

## Nombre homenaje

Mantener `code=COPA_PAPA`.

Usar `display_name` editable para nombre homenaje.

No crear otra competición.

## Propuesta inicial

Mostrar:

- participantes activos de A+B;
- temporada anterior encontrada/no encontrada;
- mejores Liga A;
- peores Liga B;
- propuesta espejo;
- no emparejados;
- cantidad de byes necesarios;
- ronda inicial sugerida.

La propuesta sólo ayuda.

El Admin puede cargar la llave inicial manualmente.

## Llave inicial

Manual primero.

Cada participante activo exactamente una vez.

Permitir:

- A vs B;
- bye con rival null.

No permitir:
- duplicados;
- participante inexistente;
- omisiones.

No imponer sorteo.

Guardar auditoría.

## Rondas siguientes

NO hay nuevos sorteos.

La ronda siguiente se arma secuencialmente con ganadores confirmados de la ronda anterior.

Mostrar progresión fija.

## Final y tercer puesto

Final: ganadores confirmados de semis.

Tercer puesto: dos perdedores confirmados de semis.

Pueden compartir Fecha real con links independientes.

## Pruebas funcionales

- propuesta espejo;
- 33+ → tamaño 64 / inicio 32avos según especificación;
- menos de 33 → tamaño 32 / inicio posterior;
- participante una sola vez;
- byes;
- ronda siguiente conserva orden;
- no sorteo posterior;
- tercer puesto;
- TAFA;
- corrección excepcional auditada si se implementa;
- bloqueo genérico;
- móvil.

---

# BLOQUE C — Promoción Admin

## Objetivo

Administrar la Promoción A/B completa.

Integrar:

Admin → Competiciones → Promoción → Administrar

Backend existente:

- GET `/api/competition-engine/competitions/:id/promotion/slots`
- POST `/api/admin/competition-engine/competitions/:id/promotion/prefill`
- PUT `/api/admin/competition-engine/competitions/:id/promotion/slots`
- POST `/api/admin/competition-engine/competitions/:id/promotion/matches`
- POST `/api/admin/competition-engine/competitions/:id/promotion/stages/:id/finalize`

Usar knockout / CupEncounter / TAFA.

## Propuesta base

Para Liga A de N:

- dos últimos: descenso directo, fuera de Promoción;
- A N-3 y A N-2: Promoción.

Liga B:
- 2.º
- 3.º

Base de cruces:

- B2 vs A(N-2)
- B3 vs A(N-3)

Mostrar nombres y posiciones.

## Copa A/B y corrimientos

No intentar resolver todos los casos automáticamente.

El backend actual permite reemplazos con motivo.

UI debe mostrar propuesta original y permitir confirmar/corregir los cuatro cupos.

Si se cambia un cupo:
- motivo obligatorio;
- ejemplo: campeón Copa B ya ascendió / campeón Copa A aseguró permanencia.

No permitir usuario duplicado.

## Cruces

Una sola Fecha compartida.

Crear exactamente:

- PROMO-1
- PROMO-2

No permitir armado arbitrario.

Puntaje y empate mediante motor compartido.

## Finalizar movimientos

Después de ambos ganadores confirmados:

- ganador de cada cruce → Liga A;
- perdedor → Liga B.

Mostrar propuesta antes/después y llamar endpoint de finalización.

No aplicar nueva temporada directamente desde esta pantalla.

## Pruebas funcionales

- Liga A variable;
- slots A desde abajo;
- B2/B3;
- reemplazo con motivo;
- duplicado rechazado;
- cruces exactos;
- misma Fecha;
- confirmación requerida;
- TAFA;
- movimientos winner→A loser→B;
- bloqueo genérico;
- móvil.

---

# BLOQUE D — Resultados finales + IFFHS Admin

Hacer después de Campeones/Papa/Promoción para que todas las competiciones puedan cerrar correctamente.

## Resultados deportivos

Verificar que desde UI Admin se pueda dejar `competition_results` completo para:

- Liga A/B;
- Copa A/B;
- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa.

La IFFHS no debe depender de llamadas manuales invisibles.

Permitir revisar y confirmar:

- campeón;
- subcampeón;
- tercero donde aplica;
- fase alcanzada;
- posición final.

Para Dúos con sustituciones, permitir definir explícitamente `detail.iffhsUserIds` cuando sea necesario.

## IFFHS Admin

Crear UI:

- ranking últimas cinco temporadas;
- temporadas incluidas;
- temporadas faltantes;
- empate comparte puesto;
- desglose individual;
- componentes por competición;
- fuente imported/calculated;
- acción calcular temporada;
- importación histórica manual opcional.

No sobrescribir importados.

Agregar pruebas funcionales del cálculo completo con datos SQLite.

---

# BLOQUE E — Transición T32 → T33

Crear UI sólo después de IFFHS.

Flujo:

1. generar plan;
2. mostrar propuesta;
3. destacar issues;
4. corregir destinos A/B con motivo;
5. confirmar;
6. aplicar;
7. mostrar T33 creada en draft.

Antes de aplicar, resolver explícitamente el caso de participantes desactivados:

El backend actual construye el roster desde `season_division_members` sin filtro `users.is_active`.

Definir comportamiento y cubrirlo con tests antes de usar transición real.

---

# BLOQUE F — Contexto participante por Fecha

Este es el último gran bloque funcional antes de la prueba integral.

No duplicar pronóstico.

Cada Fecha debe seguir mostrando un solo formulario de 12 partidos.

Agregar un contexto derivado por `round_id` y usuario que muestre todos sus usos deportivos reales:

- Liga A/B · Fecha;
- Copa A/B grupo/cruce;
- Copa Total;
- Dúos;
- Campeones;
- Papa;
- Promoción;
- desempates TAFA.

Usar `competition_round_links`, entradas, encuentros y grupos.

Para Dúos, respetar vigencia:

- `valid_from_round_id`;
- `valid_to_round_id`.

No usar solamente una unión histórica por `user_id`.

Mostrar esos contextos arriba del formulario de pronóstico.

Después agregar vistas de tablas/llaves necesarias para participante.

---

# BLOQUE FINAL — E2E local T32

No mergear antes de completar una temporada local desde cero:

- temporada;
- divisiones;
- Liga;
- todas las Copas;
- Dúos;
- Campeones;
- Papa;
- Promoción;
- desempates;
- resultados finales;
- IFFHS;
- transición T33;
- participante con un único pronóstico reutilizado.

Validar también móvil.

Sólo después considerar merge a main.
