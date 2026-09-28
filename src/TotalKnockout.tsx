import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
  type Encounter,
  type Entry,
} from './cup-ab-api';
import EncounterCard from './CupEncounter';
import { statusLabel } from './competition-presentation';
export default function TotalKnockout({
  competition,
  rounds,
  sourceId,
  targetId,
  kind,
  label,
  disabled,
}: {
  competition: CupCompetition;
  rounds: CupRound[];
  sourceId: number;
  targetId: number;
  kind: 'qualified' | 'winners' | 'third-place';
  label: string;
  disabled: boolean;
}) {
  const links = competition.roundLinks.filter(
    (l) => l.stageId === targetId && l.purpose === 'NORMAL',
  );
  const [link, setLink] = useState(String(links[0]?.id ?? '')),
    [encounters, setEncounters] = useState<Encounter[]>([]),
    [pool, setPool] = useState<Entry[]>([]),
    [pairs, setPairs] = useState<string[][]>([]),
    [mode, setMode] = useState('MANUAL'),
    [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const path = `${cupAdmin}/stages/${sourceId}/total-progression/${kind}`;
  async function refresh() {
    const d = await cupApi<{ encounters: Encounter[] }>(
      `/api/competition-engine/stages/${targetId}/knockout`,
    );
    setEncounters(d.encounters);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [targetId]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy;
  async function preview() {
    await run(async () => {
      const data = await cupApi<{ pool: Entry[] }>(
        `${path}?targetStageId=${targetId}&roundLinkId=${link}`,
      );
      setPool(data.pool);
      setPairs(
        encounters.length
          ? encounters.map((e) => [
              String(e.entryA?.id ?? ''),
              String(e.entryB?.id ?? ''),
            ])
          : Array.from({ length: Math.ceil(data.pool.length / 2) }, () => [
              '',
              '',
            ]),
      );
    });
  }
  async function save() {
    await run(async () => {
      const data = await cupApi<{
        configurationMode: string;
        randomSeed?: number;
      }>(path, 'POST', {
        targetStageId: targetId,
        roundLinkId: Number(link),
        ...(mode === 'MANUAL'
          ? {
              pairs: pairs.map((p) => ({
                entryAId: Number(p[0]),
                entryBId: p[1] ? Number(p[1]) : null,
              })),
            }
          : { random: true }),
        replace: encounters.length > 0,
        reason,
      });
      await refresh();
      setPool([]);
      setMessage(
        `Cruces guardados · ${data.configurationMode === 'MANUAL' ? 'Manual' : 'Automático'}${data.randomSeed == null ? '' : ` · Semilla ${data.randomSeed}`}`,
      );
    });
  }
  return (
    <section className="form-stack">
      <h3>{label}</h3>
      <p>
        {competition.stages.find((s) => s.id === targetId)?.name} ·{' '}
        {statusLabel(
          competition.stages.find((s) => s.id === targetId)?.status ?? 'draft',
        )}
      </p>
      <label className="field">
        Fecha de {label}
        <select
          aria-label={`Fecha de ${label}`}
          value={link}
          disabled={locked}
          onChange={(e) => {
            setLink(e.target.value);
            setPool([]);
          }}
        >
          <option value="">Elegir Fecha vinculada</option>
          {links.map((l) => (
            <option key={l.id} value={l.id}>
              {l.roundName} · {statusLabel(l.roundStatus)}
            </option>
          ))}
        </select>
      </label>
      {!links.length && (
        <p>
          Vinculá una Fecha a esta etapa desde Configuración general, etapas y
          Fechas.
        </p>
      )}
      <button
        className="button button--secondary"
        disabled={locked || !link}
        onClick={() => void preview()}
      >
        Consultar clasificados para {label}
      </button>
      {pool.length > 0 && (
        <>
          <ul>
            {pool.map((p) => (
              <li key={p.entryId}>{p.displayName}</li>
            ))}
          </ul>
          {kind === 'third-place' ? (
            <p>
              Los dos perdedores confirmados de Semifinal disputan el tercer
              puesto.
            </p>
          ) : (
            <>
              <div className="topbar-actions">
                <button
                  className="button button--primary"
                  aria-pressed={mode === 'MANUAL'}
                  disabled={locked}
                  onClick={() => setMode('MANUAL')}
                >
                  Armar manualmente
                </button>
                <button
                  className="button button--secondary"
                  aria-pressed={mode === 'AUTOMATIC'}
                  disabled={locked}
                  onClick={() => setMode('AUTOMATIC')}
                >
                  Sortear automáticamente
                </button>
              </div>
              {mode === 'MANUAL' &&
                pairs.map((p, i) => (
                  <fieldset key={i}>
                    <legend>
                      {label} · Cruce {i + 1}
                    </legend>
                    {p.map((v, j) => (
                      <label key={j} className="field">
                        Participante {j + 1}
                        <select
                          aria-label={`${label} cruce ${i + 1} lado ${j + 1}`}
                          value={v}
                          disabled={locked}
                          onChange={(e) =>
                            setPairs((ps) =>
                              ps.map((row, k) =>
                                k === i
                                  ? row.map((value, l) =>
                                      l === j ? e.target.value : value,
                                    )
                                  : row,
                              ),
                            )
                          }
                        >
                          <option value="">
                            {j === 1 && pool.length % 2
                              ? 'Libre / elegir'
                              : 'Elegir'}
                          </option>
                          {pool.map((e) => (
                            <option
                              key={e.entryId}
                              value={e.entryId}
                              disabled={
                                pairs.flat().includes(String(e.entryId)) &&
                                v !== String(e.entryId)
                              }
                            >
                              {e.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </fieldset>
                ))}
            </>
          )}
          {encounters.length > 0 && (
            <label className="field">
              Motivo de corrección
              <input
                value={reason}
                disabled={locked}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <button
            className="button button--primary"
            disabled={
              locked ||
              (encounters.length > 0 && !reason.trim()) ||
              (kind !== 'third-place' &&
                mode === 'MANUAL' &&
                pairs.some((p) => !p[0] || (!p[1] && pool.length % 2 === 0)))
            }
            onClick={() => void save()}
          >
            {kind === 'third-place'
              ? 'Construir tercer puesto'
              : mode === 'MANUAL'
                ? 'Guardar cruces manuales'
                : 'Ejecutar sorteo de cruces'}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      <button
        className="button button--ghost"
        disabled={locked}
        onClick={() => void run(refresh)}
      >
        Actualizar puntajes
      </button>
      {encounters.map((e) => (
        <EncounterCard
          key={e.id}
          encounter={e}
          rounds={rounds}
          disabled={locked}
          onChanged={refresh}
        />
      ))}
      {!encounters.length && <p>Sin cruces configurados.</p>}
    </section>
  );
}
