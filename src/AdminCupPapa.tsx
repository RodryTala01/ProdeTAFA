import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
} from './cup-ab-api';
import CupEncounter from './CupEncounter';
import {
  loadPapa,
  papaEligible,
  papaPairErrors,
  papaReady,
  papaLosers,
  type PapaPair,
  type PapaPerson,
  type PapaProposal,
} from './papa-admin';
import './cup-ab.css';
export default function AdminCupPapa({
  competition: c,
  rounds,
  disabled,
}: {
  competition: CupCompetition;
  rounds: CupRound[];
  disabled: boolean;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPapa>> | null>(
      null,
    ),
    [tab, setTab] = useState('Propuesta'),
    [pairs, setPairs] = useState<PapaPair[]>([]),
    [stage, setStage] = useState(''),
    [link, setLink] = useState(''),
    [source, setSource] = useState(''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const locked =
    disabled || busy || ['finished', 'archived'].includes(c.status);
  const stages = c.stages
    .filter((s) => s.stageType === 'KNOCKOUT')
    .sort((a, b) => a.sequence - b.sequence);
  async function load() {
    const d = await loadPapa(c);
    setData(d);
    setPairs(d.proposal.initial.pairs);
    setStage(
      tab === 'Llave inicial' ? String(d.proposal.initial.stageId ?? '') : '',
    );
    setLink(
      tab === 'Llave inicial'
        ? String(d.proposal.initial.roundLinkId ?? '')
        : '',
    );
  }
  useEffect(() => {
    let active = true;
    loadPapa(c)
      .then((d) => {
        if (active) {
          setData(d);
          setPairs(d.proposal.initial.pairs);
          setStage(String(d.proposal.initial.stageId ?? ''));
          setLink(String(d.proposal.initial.roundLinkId ?? ''));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [c]);
  async function run(fn: () => Promise<unknown>, notice: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
      setMessage(notice);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const people = data ? papaEligible(data.proposal) : [];
  const initial = data?.proposal.initial;
  const initialLocked =
    locked || !!(initial?.hasEncounters && !initial.editable);
  const sourceEncounters =
    data?.stages.find((s) => s.stageId === Number(source))?.encounters ?? [];
  const ready = papaReady(sourceEncounters);
  const emptyStages = stages.filter(
    (s) =>
      !['finished', 'archived'].includes(s.status) &&
      !data?.stages.find((d) => d.stageId === s.id)?.encounters.length,
  );
  return (
    <section
      className="form-stack cup-ab"
      aria-label="Administración deportiva Copa Papa"
    >
      <h3>{c.displayName}</h3>
      <p>
        Nombre homenaje editable en Configuración general. La identidad se
        conserva como COPA_PAPA.
      </p>
      <nav className="cup-tabs" aria-label="Secciones Copa Papa">
        {['Propuesta', 'Llave inicial', 'Rondas', 'Final y tercer puesto'].map(
          (t) => (
            <button
              key={t}
              className="button button--secondary"
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setStage(
                  t === 'Llave inicial' ? String(initial?.stageId ?? '') : '',
                );
                setLink(
                  t === 'Llave inicial'
                    ? String(initial?.roundLinkId ?? '')
                    : '',
                );
              }}
            >
              {t}
            </button>
          ),
        )}
      </nav>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p>Cargando Copa Papa…</p>
      ) : (
        <>
          {tab !== 'Llave inicial' && (
            <button
              className="button button--secondary"
              disabled={locked}
              onClick={() => void run(async () => {}, 'Puntajes actualizados.')}
            >
              Actualizar puntajes
            </button>
          )}
          {tab === 'Propuesta' && <PapaProposalView proposal={data.proposal} />}
          {tab === 'Llave inicial' && (
            <>
              <p>
                El orden de los cruces define la progresión: ganador 1 vs
                ganador 2, y así sucesivamente. No se vuelve a sortear.
              </p>
              <button
                className="button button--secondary"
                disabled={initialLocked}
                onClick={() =>
                  setPairs(
                    Array.from(
                      { length: Math.ceil(people.length / 2) },
                      () => ({ userAId: '', userBId: null }),
                    ),
                  )
                }
              >
                Cargar manualmente
              </button>
              <button
                className="button button--secondary"
                disabled={initialLocked}
                onClick={() =>
                  setPairs(
                    data.proposal.proposedPairs.map((p) => ({
                      userAId: p.userA.id,
                      userBId: p.userB.id,
                    })),
                  )
                }
              >
                Usar propuesta espejo como borrador
              </button>
              <p>
                Los no emparejados deben incorporarse manualmente. Rival libre =
                bye.
              </p>
              <PapaPairEditor
                pairs={pairs}
                people={people}
                disabled={initialLocked}
                onChange={setPairs}
              />
              <PapaTarget
                competition={c}
                stages={
                  initial?.pairs.length
                    ? stages.filter((s) => s.id === initial.stageId)
                    : emptyStages
                }
                stage={stage}
                link={link}
                disabled={initialLocked || !!initial?.pairs.length}
                onStage={(v) => {
                  setStage(v);
                  setLink('');
                }}
                onLink={setLink}
              />
              {!!initial?.pairs.length && (
                <label className="field">
                  Motivo de corrección
                  <input
                    disabled={initialLocked}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
              <button
                className="button button--primary"
                disabled={
                  initialLocked ||
                  !stage ||
                  !link ||
                  papaPairErrors(pairs, people).length > 0 ||
                  (!!initial?.pairs.length && !reason.trim())
                }
                onClick={() =>
                  void run(
                    () =>
                      cupApi(
                        `${cupAdmin}/competitions/${c.id}/papa/initial-bracket`,
                        'POST',
                        {
                          stageId: Number(stage),
                          roundLinkId: Number(link),
                          pairs,
                          reason,
                        },
                      ),
                    'Llave inicial guardada y auditada.',
                  )
                }
              >
                {initial?.pairs.length
                  ? 'Guardar corrección manual'
                  : 'Confirmar llave inicial'}
              </button>
              {initialLocked && !locked && (
                <p>
                  La llave ya tuvo actividad o avance y no puede corregirse.
                </p>
              )}
            </>
          )}
          {(tab === 'Rondas' || tab === 'Final y tercer puesto') && (
            <>
              <label className="field">
                Etapa origen
                <select
                  value={source}
                  disabled={locked}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setStage('');
                    setLink('');
                  }}
                >
                  <option value="">Elegir etapa con cruces</option>
                  {stages
                    .filter((s) => {
                      const es =
                        data.stages.find((d) => d.stageId === s.id)
                          ?.encounters ?? [];
                      return tab === 'Final y tercer puesto'
                        ? es.length === 2
                        : es.length >= 2;
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <p>
                {ready
                  ? 'Ganadores confirmados en orden fijo: ' +
                    sourceEncounters.map((e) => e.winner?.name).join(' → ')
                  : 'Todos los encuentros de origen deben estar resueltos y confirmados.'}
              </p>
              {sourceEncounters.length === 2 && (
                <p>
                  Perdedores para tercer puesto:{' '}
                  {papaLosers(sourceEncounters)
                    .map((p) => p?.name)
                    .join(' · ')}
                </p>
              )}
              <PapaTarget
                competition={c}
                stages={emptyStages.filter(
                  (s) =>
                    s.sequence >
                    (stages.find((v) => v.id === Number(source))?.sequence ??
                      Infinity),
                )}
                stage={stage}
                link={link}
                disabled={locked || !ready}
                onStage={(v) => {
                  setStage(v);
                  setLink('');
                }}
                onLink={setLink}
              />
              <button
                className="button button--primary"
                disabled={locked || !ready || !stage || !link}
                onClick={() =>
                  void run(
                    () =>
                      cupApi(
                        `${cupAdmin}/stages/${source}/papa/next-round`,
                        'POST',
                        {
                          targetStageId: Number(stage),
                          roundLinkId: Number(link),
                        },
                      ),
                    sourceEncounters.length === 2
                      ? 'Final creada.'
                      : 'Ronda siguiente creada en orden fijo.',
                  )
                }
              >
                {sourceEncounters.length === 2
                  ? 'Crear Final'
                  : 'Crear ronda siguiente sin sorteo'}
              </button>
              {tab === 'Final y tercer puesto' && (
                <>
                  <p>
                    Final y tercer puesto requieren etapas y vínculos
                    independientes; pueden compartir la misma Fecha real.
                  </p>
                  <button
                    className="button button--secondary"
                    disabled={
                      locked ||
                      !ready ||
                      sourceEncounters.length !== 2 ||
                      papaLosers(sourceEncounters).length !== 2 ||
                      !stage ||
                      !link
                    }
                    onClick={() =>
                      void run(
                        () =>
                          cupApi(
                            `${cupAdmin}/stages/${source}/papa/third-place`,
                            'POST',
                            {
                              targetStageId: Number(stage),
                              roundLinkId: Number(link),
                            },
                          ),
                        'Tercer puesto creado con los perdedores confirmados.',
                      )
                    }
                  >
                    Crear tercer puesto
                  </button>
                </>
              )}
              {data.stages
                .filter(
                  (s) =>
                    s.encounters.length > 0 &&
                    (tab === 'Rondas' ||
                      s.stageId === Number(source) ||
                      s.encounters.length === 1),
                )
                .map((s) => (
                  <section className="form-stack" key={s.stageId}>
                    <h4>{stages.find((st) => st.id === s.stageId)?.name}</h4>
                    {s.encounters.map((e) => (
                      <div key={e.id}>
                        {!e.entryB && <p>Pase libre (bye): {e.entryA?.name}</p>}
                        <CupEncounter
                          encounter={e}
                          rounds={rounds}
                          disabled={locked}
                          allowExceptional={false}
                          onChanged={() =>
                            run(async () => {}, 'Ganadores actualizados.')
                          }
                        />
                      </div>
                    ))}
                  </section>
                ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
export function PapaProposalView({ proposal: p }: { proposal: PapaProposal }) {
  return (
    <div className="form-stack">
      <p>
        Temporada anterior T{p.previousSeasonNumber}:{' '}
        {p.previousSeasonFound ? 'encontrada' : 'no encontrada'}.{' '}
        {p.participantCount} participantes activos A+B.
      </p>
      <p>
        Inicio sugerido:{' '}
        {p.recommendedStart === 'ROUND_OF_32' ? '32avos' : '16avos'} · tamaño de
        referencia {p.bracketSize} · byes de referencia {p.byesNeeded}. La
        propuesta requiere revisión Admin.
      </p>
      <h4>Mejor Liga A vs peor Liga B</h4>
      {p.proposedPairs.map((x, i) => (
        <p key={i}>
          {i + 1}. {x.userA.name} (A, {x.userA.previousPosition}.º) vs{' '}
          {x.userB.name} (B, {x.userB.previousPosition}.º)
        </p>
      ))}
      <h4>No emparejados</h4>
      <p>{p.unpaired.map((x) => x.name).join(' · ') || 'Ninguno'}</p>
    </div>
  );
}
export function PapaPairEditor({
  pairs,
  people,
  disabled,
  onChange,
}: {
  pairs: PapaPair[];
  people: PapaPerson[];
  disabled: boolean;
  onChange: (p: PapaPair[]) => void;
}) {
  return (
    <div className="form-stack">
      {pairs.map((p, i) => (
        <fieldset key={i}>
          <legend>Cruce {i + 1}</legend>
          {(['userAId', 'userBId'] as const).map((key) => (
            <label className="field" key={key}>
              {key === 'userAId' ? 'Participante' : 'Rival o bye'}
              <select
                disabled={disabled}
                value={p[key] ?? ''}
                onChange={(e) =>
                  onChange(
                    pairs.map((v, j) =>
                      i === j
                        ? {
                            ...v,
                            [key]:
                              key === 'userAId'
                                ? e.target.value
                                : e.target.value || null,
                          }
                        : v,
                    ),
                  )
                }
              >
                <option value="">
                  {key === 'userAId' ? 'Elegir participante' : 'Libre (bye)'}
                </option>
                {people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button
            className="button button--ghost"
            disabled={disabled}
            onClick={() => onChange(pairs.filter((_, j) => j !== i))}
          >
            Quitar cruce {i + 1}
          </button>
        </fieldset>
      ))}
      <button
        className="button button--secondary"
        disabled={disabled}
        onClick={() => onChange([...pairs, { userAId: '', userBId: null }])}
      >
        Agregar cruce
      </button>
      <p>
        Byes cargados: {pairs.filter((p) => p.userAId && !p.userBId).length}
      </p>
      {!disabled && (
        <ul aria-label="Validación de llave">
          {papaPairErrors(pairs, people).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
function PapaTarget({
  competition: c,
  stages,
  stage,
  link,
  disabled,
  onStage,
  onLink,
}: {
  competition: CupCompetition;
  stages: CupCompetition['stages'];
  stage: string;
  link: string;
  disabled: boolean;
  onStage: (v: string) => void;
  onLink: (v: string) => void;
}) {
  return (
    <>
      <label className="field">
        Etapa destino
        <select
          disabled={disabled}
          value={stage}
          onChange={(e) => onStage(e.target.value)}
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
        Fecha destino
        <select
          disabled={disabled || !stage}
          value={link}
          onChange={(e) => onLink(e.target.value)}
        >
          <option value="">Elegir Fecha vinculada</option>
          {c.roundLinks
            .filter(
              (l) => l.stageId === Number(stage) && l.purpose === 'NORMAL',
            )
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.roundName}
              </option>
            ))}
        </select>
      </label>
      <p>Creá etapas y vinculá Fechas desde Configuración general.</p>
    </>
  );
}
