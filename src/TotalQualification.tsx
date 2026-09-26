import { useState, useEffect } from 'react';
import { cupApi, cupAdmin, CupApiError } from './cup-ab-api';
export type TotalStanding = {
  entryId: number;
  displayName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};
type Qualifier = {
  entryId: number;
  name: string;
  group?: string;
  groupCode?: string;
  position?: number;
  sourcePosition?: number;
  type?: string;
  qualificationType?: string;
  confirmedAt?: string;
  points?: number;
  gd?: number;
  gf?: number;
  won?: number;
};
export default function TotalQualification({
  stageId,
  targetStageId,
  standings,
  disabled,
}: {
  stageId: number;
  targetStageId: number;
  standings: (TotalStanding & { group: string })[];
  disabled: boolean;
}) {
  const [manual, setManual] = useState(false),
    [size, setSize] = useState(16),
    [positions, setPositions] = useState('1,2'),
    [wildPos, setWildPos] = useState(3),
    [wildCount, setWildCount] = useState(0),
    [chosen, setChosen] = useState<number[]>([]),
    [wildChosen, setWildChosen] = useState<number[]>([]),
    [reason, setReason] = useState('');
  const [preview, setPreview] = useState<Qualifier[] | null>(null),
    [snapshot, setSnapshot] = useState<Qualifier[]>([]),
    [candidates, setCandidates] = useState<Qualifier[]>([]),
    [tie, setTie] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const url = `${cupAdmin}/stages/${stageId}/total/qualify`;
  async function load() {
    const d = await cupApi<{ qualifiers: Qualifier[] }>(
      `/api/competition-engine/stages/${stageId}/total/qualifiers?targetStageId=${targetStageId}`,
    );
    setSnapshot(d.qualifiers);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [stageId, targetStageId]);
  const body = {
    targetStageId,
    targetSize: size,
    ...(manual
      ? { manualQualifiedEntryIds: chosen, reason }
      : {
          directPositions: positions.split(',').map((s) => Number(s.trim())),
          wildcardPosition: wildPos,
          wildcardCount: wildCount,
          ...(wildChosen.length ? { manualWildcardEntryIds: wildChosen } : {}),
        }),
  };
  function reset() {
    setPreview(null);
    setError('');
    setMessage('');
  }
  async function submit(confirm: boolean) {
    setBusy(true);
    setError('');
    try {
      const d = await cupApi<{ qualifiers: Qualifier[] }>(
        url + (confirm ? '' : '/preview'),
        'POST',
        body,
      );
      setPreview(d.qualifiers);
      setTie(false);
      if (confirm) {
        await load();
        setMessage('Clasificación confirmada y auditada.');
        setPreview(null);
      }
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
      if (e instanceof CupApiError) {
        setTie(!!e.data.manualResolutionRequired);
        setCandidates(e.data.wildcardCandidates ?? []);
      }
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy;
  const names = (qs: Qualifier[]) => (
    <ul>
      {qs.map((q) => (
        <li key={q.entryId}>
          {q.name} · Grupo {q.group ?? q.groupCode} ·{' '}
          {q.position ?? q.sourcePosition}.º ·{' '}
          {{ DIRECT: 'Directo', WILDCARD: 'Comodín', MANUAL: 'Manual' }[
            q.type ?? q.qualificationType ?? ''
          ] ?? ''}
          {(() => { const row = standings.find(s => s.entryId === q.entryId); return row ? ` · PTS ${row.points} · DG ${row.gd} · GF ${row.gf} · PG ${row.won}` : ''; })()}
          {q.confirmedAt
            ? ` · ${new Date(q.confirmedAt.replace(' ', 'T') + 'Z').toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`
            : ''}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="form-stack">
      <h3>Clasificación</h3>
      <p>
        Confirmá los clasificados antes de armar Octavos. PTS → DG → GF → PG. Un
        empate en el corte requiere decisión del Admin.
      </p>
      <div className="topbar-actions">
        <button
          className="button button--secondary"
          disabled={locked}
          aria-pressed={manual}
          onClick={() => {
            setManual(true);
            reset();
          }}
        >
          Selección completa manual
        </button>
        <button
          className="button button--secondary"
          disabled={locked}
          aria-pressed={!manual}
          onClick={() => {
            setManual(false);
            reset();
          }}
        >
          Asistencia por posiciones
        </button>
      </div>
      <label className="field">
        Tamaño objetivo del cuadro
        <input
          type="number"
          min="2"
          max={standings.length}
          value={size}
          disabled={locked}
          onChange={(e) => {
            setSize(Number(e.target.value));
            reset();
          }}
        />
      </label>
      {manual ? (
        <>
          <p>
            Elegidos: {chosen.length} de {size}
          </p>
          {standings.map((s) => (
            <label className="total-check" key={s.entryId}>
              <input
                type="checkbox"
                checked={chosen.includes(s.entryId)}
                disabled={locked}
                onChange={(e) => {
                  setChosen((ids) =>
                    e.target.checked
                      ? [...ids, s.entryId]
                      : ids.filter((id) => id !== s.entryId),
                  );
                  reset();
                }}
              />
              {s.displayName} · Grupo {s.group} · {s.position}.º
            </label>
          ))}
          <label className="field">
            Motivo excepcional
            <input
              value={reason}
              disabled={locked}
              onChange={(e) => {
                setReason(e.target.value);
                reset();
              }}
            />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            Posiciones directas (separadas por coma)
            <input
              value={positions}
              disabled={locked}
              onChange={(e) => {
                setPositions(e.target.value);
                setWildChosen([]);
                reset();
              }}
            />
          </label>
          <label className="field">
            Posición de comodín
            <input
              type="number"
              min="1"
              value={wildPos}
              disabled={locked}
              onChange={(e) => {
                setWildPos(Number(e.target.value));
                setWildChosen([]);
                reset();
              }}
            />
          </label>
          <label className="field">
            Cantidad de comodines
            <input
              type="number"
              min="0"
              value={wildCount}
              disabled={locked}
              onChange={(e) => {
                setWildCount(Number(e.target.value));
                setWildChosen([]);
                reset();
              }}
            />
          </label>
        </>
      )}
      <button
        className="button button--secondary"
        disabled={locked || !targetStageId}
        onClick={() => void submit(false)}
      >
        Revisar clasificación
      </button>
      {tie && (
        <p role="alert">
          <strong>Resolución manual requerida</strong>. Elegí los comodines o
          usá la selección completa manual si el empate es dentro de un grupo.
        </p>
      )}
      {!manual && candidates.length > 0 && (
        <fieldset>
          <legend>
            Seleccionar comodines ({wildChosen.length}/{wildCount})
          </legend>
          {candidates.map((c) => (
            <label className="total-check" key={c.entryId}>
              <input
                type="checkbox"
                checked={wildChosen.includes(c.entryId)}
                disabled={locked}
                onChange={(e) => {
                  setWildChosen((ids) =>
                    e.target.checked
                      ? [...ids, c.entryId]
                      : ids.filter((id) => id !== c.entryId),
                  );
                  reset();
                }}
              />
              {c.name} · Grupo {c.group} · PTS {c.points} · DG {c.gd} · GF {c.gf} · PG {c.won}
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {preview && (
        <>
          <h4>Propuesta para confirmar</h4>
          <h5>Clasificación directa</h5>
          {names(preview.filter((q) => q.type === 'DIRECT'))}
          <h5>Comodines / selección manual</h5>
          {names(preview.filter((q) => q.type !== 'DIRECT'))}
          <button
            className="button button--primary"
            disabled={locked}
            onClick={() => void submit(true)}
          >
            Confirmar clasificados
          </button>
        </>
      )}
      <h4>Snapshot confirmado</h4>
      {snapshot.length ? (
        names(snapshot)
      ) : (
        <p>Todavía no hay clasificados confirmados.</p>
      )}
    </section>
  );
}
