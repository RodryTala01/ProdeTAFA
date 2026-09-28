import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
  type Encounter,
} from './cup-ab-api';
import CupEncounter from './CupEncounter';
import {
  loadChampions,
  initialChoices,
  choiceErrors,
  type ChampionSlot,
  type ChampionNode,
  type SlotChoice,
  type Person,
} from './champions-admin';
import './cup-ab.css';
export default function AdminCupChampions({
  competition: c,
  rounds,
  eligible,
  disabled,
}: {
  competition: CupCompetition;
  rounds: CupRound[];
  eligible: Person[];
  disabled: boolean;
}) {
  const [data, setData] = useState<Awaited<
      ReturnType<typeof loadChampions>
    > | null>(null),
    [choices, setChoices] = useState<SlotChoice[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [tab, setTab] = useState('Cupos');
  const base = `${cupAdmin}/competitions/${c.id}/champions`;
  const locked =
    disabled || busy || ['finished', 'archived'].includes(c.status);
  async function load() {
    const d = await loadChampions(c.id);
    setData(d);
    setChoices(initialChoices(d.slots));
  }
  useEffect(() => {
    let current = true;
    loadChampions(c.id)
      .then((d) => {
        if (current) {
          setData(d);
          setChoices(initialChoices(d.slots));
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [c.id]);
  async function run(action: () => Promise<unknown>, notice: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await load();
      setMessage(notice);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const started = !!data?.nodes.length;
  const confirmed =
    data?.slots.length === 14 &&
    data.slots.every(
      (s) => s.confirmedEntryId && ['confirmed', 'replaced'].includes(s.status),
    );
  const dirty =
    !!data &&
    JSON.stringify(choices) !== JSON.stringify(initialChoices(data.slots));
  return (
    <section
      className="form-stack cup-ab"
      aria-label="Administración deportiva Copa Campeones"
    >
      <h3>{c.displayName}</h3>
      <p>14 cupos · llave fija · sin tercer puesto.</p>
      <nav className="cup-tabs" aria-label="Secciones Copa Campeones">
        {['Cupos', 'Rama superior', 'Rama inferior', 'Final'].map((t) => (
          <button
            key={t}
            className="button button--secondary"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p>Cargando Campeones…</p>
      ) : (
        <>
          <button
            className="button button--secondary"
            disabled={locked || dirty}
            onClick={() => void run(async () => {}, 'Datos actualizados.')}
          >
            Actualizar puntajes y fuentes
          </button>
          {tab === 'Cupos' ? (
            <>
              <button
                className="button button--secondary"
                disabled={locked || started || dirty}
                onClick={() =>
                  void run(
                    () => cupApi(base + '/prefill', 'POST', {}),
                    'Propuesta generada; revisá vacantes y duplicados.',
                  )
                }
              >
                Generar propuesta desde temporada anterior
              </button>
              {data.slots.length > 0 && (
                <p>
                  Regenerar la propuesta reemplaza la selección confirmada
                  mientras la llave no esté inicializada.
                </p>
              )}
              <ChampionSlots
                slots={data.slots}
                choices={choices}
                eligible={eligible}
                disabled={locked || started}
                onChange={setChoices}
              />
              {dirty && (
                <p>
                  Cambios pendientes de confirmar. La selección guardada sigue
                  visible en cada cupo.
                </p>
              )}
              {!started && (
                <button
                  className="button button--primary"
                  disabled={
                    locked ||
                    choiceErrors(data.slots, choices, eligible).length > 0
                  }
                  onClick={() =>
                    void run(
                      () => cupApi(base + '/slots', 'PUT', { slots: choices }),
                      'Los 14 cupos quedaron confirmados.',
                    )
                  }
                >
                  Confirmar los 14 cupos
                </button>
              )}
              {started ? (
                <p>Llave inicializada: los cupos están bloqueados.</p>
              ) : (
                <button
                  className="button button--primary"
                  disabled={locked || !confirmed || dirty}
                  onClick={() =>
                    void run(
                      () => cupApi(base + '/bracket', 'POST', {}),
                      'Llave fija inicializada: 13 nodos.',
                    )
                  }
                >
                  Inicializar llave fija
                </button>
              )}
            </>
          ) : (
            <>
              {!started && (
                <p>Confirmá los 14 cupos e inicializá la llave desde Cupos.</p>
              )}
              {data.nodes
                .filter(
                  (n) =>
                    n.branch ===
                    (
                      {
                        'Rama superior': 'UPPER',
                        'Rama inferior': 'LOWER',
                        Final: 'FINAL',
                      } as Record<string, string>
                    )[tab],
                )
                .map((n) => (
                  <ChampionNodeCard
                    key={n.code}
                    node={n}
                    competition={c}
                    slots={data.slots}
                    encounter={data.encounters.find(
                      (e) => e.id === n.encounter?.id,
                    )}
                    rounds={rounds}
                    disabled={locked}
                    onChanged={() =>
                      run(async () => {}, 'Fuentes actualizadas.')
                    }
                    onActivate={(stageId, roundLinkId) =>
                      run(
                        () =>
                          cupApi(`${base}/nodes/${n.code}/activate`, 'POST', {
                            stageId,
                            roundLinkId,
                          }),
                        `${n.code} activado.`,
                      )
                    }
                  />
                ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
export function ChampionSlots({
  slots,
  choices,
  eligible,
  disabled,
  onChange,
}: {
  slots: ChampionSlot[];
  choices: SlotChoice[];
  eligible: Person[];
  disabled: boolean;
  onChange: (v: SlotChoice[]) => void;
}) {
  const errors = choiceErrors(slots, choices, eligible);
  return (
    <div className="form-stack">
      {slots.map((s) => {
        const c = choices.find((c) => c.slotCode === s.slotCode);
        return (
          <article className="competition-stage form-stack" key={s.slotCode}>
            <h4>{s.slotName}</h4>
            <p>
              Fuente: temporada {s.source?.previousSeasonNumber ?? 'anterior'} ·{' '}
              {s.slotName}
            </p>
            <p>Propuesto: {s.proposedUser?.name ?? 'Vacante'}</p>
            <p>Confirmado: {s.confirmedUser?.name ?? 'Pendiente'}</p>
            <p>
              Estado:{' '}
              {(
                {
                  proposed: 'Propuesto',
                  vacant: 'Vacante',
                  confirmed: 'Confirmado',
                  replaced: 'Reemplazado',
                } as Record<string, string>
              )[s.status] ?? s.status}
            </p>
            {s.replacementReason && (
              <p>Motivo guardado: {s.replacementReason}</p>
            )}
            <label className="field">
              Participante · {s.slotName}
              <select
                value={c?.userId ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    choices.map((v) =>
                      v.slotCode === s.slotCode
                        ? { ...v, userId: e.target.value }
                        : v,
                    ),
                  )
                }
              >
                <option value="">Elegir participante</option>
                {c?.userId && !eligible.some((p) => p.id === c.userId) && (
                  <option value={c.userId}>
                    {s.confirmedUser?.name ?? s.proposedUser?.name} · no
                    elegible
                  </option>
                )}
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Motivo · {s.slotName}
              <input
                value={c?.reason ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    choices.map((v) =>
                      v.slotCode === s.slotCode
                        ? { ...v, reason: e.target.value }
                        : v,
                    ),
                  )
                }
              />
            </label>
          </article>
        );
      })}
      {!disabled && errors.length > 0 && (
        <ul aria-label="Cupos por resolver">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function ChampionNodeCard({
  node: n,
  competition: c,
  slots,
  encounter,
  rounds,
  disabled,
  onChanged,
  onActivate,
}: {
  node: ChampionNode;
  competition: CupCompetition;
  slots: ChampionSlot[];
  encounter?: Encounter;
  rounds: CupRound[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onActivate: (stage: number, link: number) => Promise<void>;
}) {
  const [stage, setStage] = useState(''),
    [link, setLink] = useState('');
  const stages = c.stages.filter(
    (s) =>
      s.stageType === 'KNOCKOUT' &&
      !['finished', 'archived'].includes(s.status),
  );
  const links = c.roundLinks.filter(
    (l) => l.stageId === Number(stage) && l.purpose === 'NORMAL',
  );
  const source = (s: ChampionNode['sourceA']) =>
    s.displayName ??
    slots.find((v) => v.slotCode === s.source)?.slotName ??
    `Ganador ${s.source} pendiente`;
  return (
    <article className="competition-stage form-stack">
      <h4>
        {n.code} · {n.label}
      </h4>
      <p>
        {source(n.sourceA)} vs {source(n.sourceB)}
      </p>
      {encounter ? (
        <CupEncounter
          encounter={encounter}
          rounds={rounds}
          disabled={disabled}
          allowExceptional={false}
          onChanged={onChanged}
        />
      ) : n.encounter ? (
        <p>No se pudo cargar el encuentro. Actualizá puntajes y fuentes.</p>
      ) : (
        <>
          <p>
            {n.readyToActivate
              ? 'Fuentes listas para activar.'
              : 'Esperando las dos fuentes confirmadas.'}
          </p>
          <label className="field">
            Etapa de {n.code}
            <select
              disabled={disabled || !n.readyToActivate}
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setLink('');
              }}
            >
              <option value="">Elegir etapa eliminatoria</option>
              {stages.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Fecha de {n.code}
            <select
              disabled={disabled || !n.readyToActivate || !stage}
              value={link}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">Elegir Fecha vinculada</option>
              {links.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.roundName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button--primary"
            disabled={
              disabled ||
              !n.readyToActivate ||
              !stages.some((s) => s.id === Number(stage)) ||
              !links.some((l) => l.id === Number(link))
            }
            onClick={() => void onActivate(Number(stage), Number(link))}
          >
            Activar {n.code}
          </button>
          {!stages.length && (
            <p>
              Creá una etapa eliminatoria y vinculá su Fecha en Configuración
              general.
            </p>
          )}
        </>
      )}
    </article>
  );
}
