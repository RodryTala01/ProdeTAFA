import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
  type Encounter,
} from './cup-ab-api';
import EncounterCard from './CupEncounter';
import DuoPairs from './DuoPairs';
import DuoTable from './DuoTable';
import { statusLabel } from './competition-presentation';
import './cup-ab.css';
export type DuoMember = {
  userId: string;
  fullName: string;
  validFromRoundId: number | null;
  validFromRoundName: string | null;
  validUntilBeforeRoundId: number | null;
  validUntilBeforeRoundName: string | null;
};
export type DuoContext = {
  eligible: { userId: string; fullName: string }[];
  pairs: {
    id: number;
    displayName: string;
    status: string;
    configuration: { configurationMode?: string; randomSeed?: number };
    members: DuoMember[];
  }[];
};
export default function AdminCupDuos({
  competition: c,
  seasonNumber,
  rounds,
  disabled,
}: {
  competition: CupCompetition;
  seasonNumber: number;
  rounds: CupRound[];
  disabled: boolean;
}) {
  const [tab, setTab] = useState('Resumen'),
    [context, setContext] = useState<DuoContext | null>(null),
    [error, setError] = useState('');
  const survival = c.stages
      .filter((s) => s.stageType === 'SURVIVAL_TABLE')
      .sort((a, b) => a.sequence - b.sequence),
    ko = c.stages
      .filter((s) => s.stageType === 'KNOCKOUT')
      .sort((a, b) => a.sequence - b.sequence);
  const links = c.roundLinks
    .filter(
      (l) => survival.some((s) => s.id === l.stageId) && l.purpose === 'NORMAL',
    )
    .sort(
      (a, b) =>
        survival.findIndex((s) => s.id === a.stageId) -
          survival.findIndex((s) => s.id === b.stageId) ||
        a.sequence - b.sequence,
    );
  const locked = disabled || ['finished', 'archived'].includes(c.status);
  async function load() {
    setContext(
      await cupApi<DuoContext>(`${cupAdmin}/competitions/${c.id}/duos`),
    );
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [c]);
  return (
    <section
      className="form-stack cup-ab"
      aria-label="Administración deportiva Copa Dúos"
    >
      <h3>
        {c.displayName} · T{seasonNumber}
      </h3>
      <div
        className="cup-tabs"
        role="navigation"
        aria-label="Secciones Copa Dúos"
      >
        {['Resumen', 'Parejas', 'Fechas', 'Tabla', 'Semifinales', 'Final'].map(
          (t) => (
            <button
              key={t}
              className="button button--secondary"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {!context ? (
        <p>Cargando Dúos…</p>
      ) : (
        <>
          {tab === 'Resumen' && (
            <>
              <p>
                {statusLabel(c.status)} · {context.pairs.length} dúos ·{' '}
                {context.eligible.length} participantes elegibles
              </p>
              <p>
                Tabla general por Fecha hasta quedar cuatro; luego Semifinales y
                Final. No hay tercer puesto.
              </p>
              <ul>
                {c.stages.map((s) => (
                  <li key={s.id}>
                    {s.name} · {statusLabel(s.status)}
                    <ul>
                      {c.roundLinks
                        .filter((l) => l.stageId === s.id)
                        .map((l) => (
                          <li key={l.id}>
                            {l.roundName} · {statusLabel(l.roundStatus)}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <p>
                {context.pairs.filter((p) => p.status === 'qualified').length}{' '}
                dúos clasificados ·{' '}
                {context.pairs.filter((p) => p.status === 'eliminated').length}{' '}
                eliminados
              </p>
            </>
          )}
          {tab === 'Parejas' && (
            <DuoPairs
              competition={c}
              context={context}
              disabled={locked}
              onChanged={load}
            />
          )}
          {(tab === 'Fechas' || tab === 'Tabla') && (
            <>
              <p>
                Cada jornada empieza de cero. Sólo se suma el bonus explícito.
                La etapa “Cuartos” sigue siendo tabla general.
              </p>
              {links.length ? (
                links.map((l) => (
                  <DuoTable
                    key={l.id}
                    link={l}
                    rounds={rounds}
                    disabled={locked}
                    configure={tab === 'Fechas'}
                    revision={context}
                    onChanged={load}
                  />
                ))
              ) : (
                <p>
                  Creá una etapa Tabla eliminatoria y vinculá sus Fechas en la
                  configuración general.
                </p>
              )}
            </>
          )}
          {(tab === 'Semifinales' || tab === 'Final') && (
            <DuoKnockout
              key={tab}
              competition={c}
              rounds={rounds}
              targetId={ko[tab === 'Semifinales' ? 0 : 1]?.id}
              sourceId={ko[0]?.id}
              survivalLinks={links}
              final={tab === 'Final'}
              disabled={locked}
            />
          )}
        </>
      )}
    </section>
  );
}
function DuoKnockout({
  competition: c,
  rounds,
  targetId,
  sourceId,
  survivalLinks,
  final,
  disabled,
}: {
  competition: CupCompetition;
  rounds: CupRound[];
  targetId?: number;
  sourceId?: number;
  survivalLinks: CupCompetition['roundLinks'];
  final: boolean;
  disabled: boolean;
}) {
  const links = c.roundLinks.filter(
    (l) => l.stageId === targetId && l.purpose === 'NORMAL',
  );
  const [link, setLink] = useState(String(links[0]?.id ?? '')),
    [source, setSource] = useState(String(survivalLinks.at(-1)?.id ?? '')),
    [encounters, setEncounters] = useState<Encounter[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load() {
    if (targetId) {
      const d = await cupApi<{ encounters: Encounter[] }>(
        `/api/competition-engine/stages/${targetId}/knockout`,
      );
      setEncounters(d.encounters);
    }
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [targetId]);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy;
  return (
    <section className="form-stack">
      <h3>{final ? 'Final' : 'Semifinales'}</h3>
      <p>
        {final
          ? 'Dos ganadores confirmados. Sin tercer puesto.'
          : 'Cruces obligatorios: 1.º vs 4.º y 2.º vs 3.º. +2 para 1.º y 2.º únicamente.'}
      </p>
      {!targetId ? (
        <p>
          Creá las etapas eliminatorias en orden Semifinal y Final en la
          configuración general.
        </p>
      ) : (
        <>
          {!encounters.length && (
            <>
              {!final && (
                <label className="field">
                  Tabla confirmada de origen
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    disabled={locked}
                  >
                    <option value="">Elegir Fecha</option>
                    {survivalLinks.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.roundName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                Fecha destino
                <select
                  value={link}
                  disabled={locked}
                  onChange={(e) => setLink(e.target.value)}
                >
                  <option value="">Elegir Fecha vinculada</option>
                  {links.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.roundName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button--primary"
                disabled={
                  locked || !link || (!final && !source) || (final && !sourceId)
                }
                onClick={() =>
                  void run(() =>
                    cupApi(
                      final
                        ? `${cupAdmin}/stages/${sourceId}/duos/final`
                        : `${cupAdmin}/round-links/${source}/duos/semifinals`,
                      'POST',
                      { targetStageId: targetId, roundLinkId: Number(link) },
                    ),
                  )
                }
              >
                {final
                  ? 'Construir final'
                  : 'Construir semifinales 1.º–4.º / 2.º–3.º'}
              </button>
            </>
          )}
          <button
            className="button button--secondary"
            disabled={locked}
            onClick={() => void run(load)}
          >
            Actualizar puntajes
          </button>
          {encounters.map((e, i) => (
            <div key={e.id}>
              {!final && (
                <p>
                  Semifinal {i + 1} · {e.entryA?.name}: bonus +2 ·{' '}
                  {e.entryB?.name}: bonus 0
                </p>
              )}
              <EncounterCard
                encounter={e}
                rounds={rounds.filter((r) => r.category === 'LIGA')}
                allowExceptional={false}
                disabled={locked}
                onChanged={load}
              />
            </div>
          ))}
          {final &&
            encounters
              .filter((e) => e.adminConfirmedAt && e.winner)
              .map((e) => (
                <div className="alert alert--success" key={e.id}>
                  <strong>Campeón: {e.winner?.name}</strong>
                  <p>
                    Ganador deportivo confirmado. Los resultados finales e IFFHS
                    se confirman por separado al cerrar la temporada.
                  </p>
                </div>
              ))}
        </>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
    </section>
  );
}
