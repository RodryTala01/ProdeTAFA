# Diseño — contextos deportivos del participante por Fecha

Estado: diseño previo a implementación.  
Objetivo: que el participante vea todos los usos deportivos de una Fecha sin duplicar el pronóstico.

## Principio

Una Fecha del Prode tiene un único formulario de 12 partidos.

Ese mismo pronóstico puede alimentar simultáneamente:

- Liga;
- una o varias Copas;
- Copa Total;
- Copa Dúos;
- Copa Campeones;
- Copa Papa;
- Promoción;
- uno o varios desempates.

La UI participante debe mostrar los contextos deportivos por encima del formulario, pero NO crear un pronóstico por competición.

## Gap actual

`ParticipantRound` consume:

- `GET /api/participant/rounds`
- `GET /api/participant/round?roundId=...`

Ese payload contiene Fecha, partidos, pronósticos y resultados, pero no explica qué competencias está jugando el usuario en esa Fecha.

`GET /api/competition-engine/current` sólo entrega temporada/división y una lista general de competiciones; no alcanza para saber qué ocurre en una Fecha concreta.

## Endpoint propuesto

Preferencia:

`GET /api/participant/rounds/:roundId/competition-contexts`

Autorización:

- sólo participante autenticado;
- siempre usa `user.id` de sesión;
- nunca aceptar `userId` arbitrario.

Puede implementarse dentro del Competition Engine o de Predictions, pero el contrato debe quedar estable.

## Respuesta propuesta

```ts
type ParticipantRoundContexts = {
  round: {
    id: number;
    name: string;
    status: string;
    category: 'LIGA' | 'COPA' | 'DESEMPATE' | 'AMISTOSO';
  };
  contexts: CompetitionContext[];
};
```

Cada contexto debe tener una base común:

```ts
type ContextBase = {
  kind:
    | 'LEAGUE'
    | 'ACCUMULATIVE_GROUP'
    | 'TOTAL_GROUP'
    | 'DUO_SURVIVAL'
    | 'KNOCKOUT'
    | 'TIEBREAK';

  competition: {
    id: number;
    code: string;
    displayName: string;
    family: string;
  };

  stage: {
    id: number;
    code: string;
    name: string;
    stageType: string;
  };

  roundLink: {
    id: number;
    sequence: number;
    purpose: 'NORMAL' | 'TIEBREAK';
    label: string | null;
  };
};
```

No hace falta devolver campos vacíos de otros tipos; usar unión discriminada.

---

## Liga

Mostrar sólo la Liga correspondiente a la división del participante.

No mostrar Liga B a alguien de A ni viceversa aunque la misma Fecha esté vinculada a ambas.

Payload adicional:

```ts
{
  kind: 'LEAGUE';
  division: { id: number; code: string; name: string };
  position?: number;
  points?: number;
  provisional?: boolean;
}
```

La posición/puntos pueden omitirse en una primera versión si obligan a duplicar la lógica de standings. La información mínima obligatoria es competencia + número/secuencia de Fecha.

---

## Copa A / Copa B — fase de grupos

El participante entra por `competition_group_entries`.

Payload:

```ts
{
  kind: 'ACCUMULATIVE_GROUP';
  entryId: number;
  group: {
    id: number;
    code: string;
    name: string;
  };
}
```

Visual sugerida:

`Copa A · Grupo B · Fecha 2`

No recalcular la tabla en este endpoint.

---

## Copa Total — fase de grupos

La Fecha completa tiene tres mini-fechas.

El contexto debe identificar:

- grupo;
- entrada del participante;
- encuentros de los segmentos pertenecientes a esa Fecha.

Payload:

```ts
{
  kind: 'TOTAL_GROUP';
  entryId: number;
  group: {
    id: number;
    code: string;
    name: string;
  };
  miniFixtures: Array<{
    encounterId: number;
    segmentId: number;
    miniDay: number;
    opponentEntryId: number;
    opponentName: string;
    scoreSelf: number | null;
    scoreOpponent: number | null;
    complete: boolean;
  }>;
}
```

No asumir una sola mini-fecha por Fecha Copa.

Derivar `miniDay` desde los segmentos persistidos.

---

## Copa Dúos — survival/table

La membresía debe evaluarse EN ESA FECHA.

Condición de vigencia:

```sql
(valid_from_round_id IS NULL OR valid_from_round_id <= :roundId)
AND
(valid_to_round_id IS NULL OR valid_to_round_id > :roundId)
```

El límite superior es exclusivo, consistente con sustituciones.

Payload:

```ts
{
  kind: 'DUO_SURVIVAL';
  entryId: number;
  duoName: string;
  partner: {
    userId: string;
    fullName: string;
  } | null;
  bonusPoints: number;
}
```

Opcional si está disponible sin duplicar demasiado:
- posición actual;
- total actual;
- provisional.

No usar membresía histórica sin vigencia.

### Hallazgo actual

`participantCurrent` une `competition_entry_members` sólo por `user_id`.

Después de una sustitución, un ex integrante puede seguir apareciendo en la lista general de competiciones.

Al implementar este bloque:
- corregir la consulta general o
- dejar explícito que la pertenencia de Dúos debe evaluarse por Fecha.

---

## Eliminación directa

Aplicable a:

- Copa A;
- Copa B;
- Copa Total;
- Dúos desde semifinal;
- Copa Campeones;
- Copa Papa;
- Promoción.

La fuente es `competition_encounters` de la etapa vinculada a la Fecha.

El participante pertenece al cruce si su entrada es A o B y su membresía es válida para esa Fecha.

Payload:

```ts
{
  kind: 'KNOCKOUT';
  entryId: number;
  encounter: {
    id: number;
    slotKey: string;
    opponentEntryId: number | null;
    opponentName: string | null;
    scoreSelf: number | null;
    scoreOpponent: number | null;
    status: string;
    winnerEntryId: number | null;
    resolution: string | null;
    adminConfirmedAt: string | null;
  };
  championNode?: {
    code: string;
    label: string;
    branch: string;
  };
}
```

Para Copa Campeones, si el encuentro está asociado a `competition_champions_nodes`, devolver el nodo.

Para un bye, rival puede ser null.

---

## Desempates TAFA

Una Fecha Liga puede al mismo tiempo:

- sumar Liga;
- resolver uno o varios desempates.

No depender sólo de `competition_round_links.purpose`.

El motor TAFA usa:

- `competition_tiebreaks`;
- `competition_tiebreak_entries`;
- `competition_tiebreak_rounds`.

Buscar desempates donde:

1. la Fecha está en `competition_tiebreak_rounds`;
2. una entrada del usuario pertenece a `competition_tiebreak_entries`.

Payload:

```ts
{
  kind: 'TIEBREAK';
  tiebreak: {
    id: number;
    status: string;
    originalEncounterId: number | null;
    competitionId: number;
    opponentEntryId: number | null;
    opponentName: string | null;
    sequence: number;
    winnerEntryId: number | null;
  };
}
```

Visual sugerida:

`Desempate Copa B · vs Nico`

No recalcular el algoritmo TAFA en frontend.

---

## Orden visual recomendado

1. Liga.
2. Copas de grupos.
3. Copa Total.
4. Dúos.
5. Eliminatorias.
6. Desempates.

Dentro del mismo tipo, usar `competition.sort_order`.

No depender del orden accidental de IDs.

---

## UI ParticipantRound

Agregar un bloque sobre los 12 partidos:

### Ejemplo

**Estás jugando esta Fecha en:**

- Liga A · Fecha 2
- Copa A · Octavos · vs Carlos
- Copa Total · Grupo C · 3 mini-fechas
- Desempate Copa B · vs Nico

No duplicar inputs ni botones de Enviar/Reenviar.

La confirmación de pronóstico sigue siendo por Fecha.

---

## Historial

El endpoint también debe funcionar al abrir una Fecha histórica.

Eso permite mostrar:

- qué competición disputaba ese día;
- compañero de Dúos vigente en esa Fecha;
- rival que realmente tuvo;
- desempates que se resolvieron allí.

No usar estado actual para reconstruir el pasado.

---

## Reglas de consulta

### No filtrar por estado actual de entry para historia

Una entrada hoy eliminada puede haber jugado una Fecha anterior.

Para saber si participó:
- grupos: membership de grupo;
- knockout: encounter;
- Dúos: membresía vigente;
- tiebreak: tiebreak_entries.

### No duplicar un contexto por joins

Usar IDs estables y deduplicar.

### No inventar contextos por categoría visual de Fecha

`rounds.category='COPA'` no significa que el usuario juegue todas las Copas vinculadas.

La fuente real son los vínculos y la participación deportiva.

---

## Tests mínimos

Con SQLite y migraciones reales:

1. una Fecha Liga vinculada a A/B muestra sólo la Liga del participante;
2. un usuario puede tener Liga + desempate en la misma Fecha;
3. Copa A grupo muestra grupo correcto;
4. knockout muestra rival correcto;
5. eliminado no aparece en una ronda futura que no disputa;
6. sí aparece en su ronda histórica;
7. Copa Total devuelve tres mini-fixtures de una Fecha cuando corresponda;
8. Dúo muestra compañero vigente;
9. sustitución cambia compañero sólo desde effectiveRoundId;
10. ex integrante no aparece como vigente después de la sustitución;
11. semifinal Dúos usa la entrada colectiva;
12. Campeones devuelve nodeCode/label;
13. Papa devuelve rival;
14. Promoción devuelve rival;
15. tiebreak devuelve competencia original y rival;
16. mismo pronóstico/roundId produce varios contextos sin duplicar partidos;
17. participante no puede consultar contextos de otro usuario.

---

## No hacer en este bloque

- no crear un segundo sistema de puntajes;
- no duplicar standings;
- no crear pronósticos por Copa;
- no implementar notificaciones;
- no rediseñar toda la pantalla;
- no hacer deploy.

Primero entregar el contexto correcto y una presentación clara encima del formulario existente.
