import { statusLabel } from './competition-presentation';
import { useEffect, useState } from 'react';
import { cupApi, cupAdmin, type CupCompetition } from './cup-ab-api';
import {
  initialStageCodes,
  loadResultEvidence,
  resultCodes,
  resultLabels,
  resultErrors,
  suggestResults,
  type ResultEvidence,
  type ResultRow,
} from './results-admin';
export default function AdminResults({
  competition: c,
  seasonNumber,
  archived,
}: {
  competition: CupCompetition;
  seasonNumber: number;
  archived: boolean;
}) {
  const [data, setData] = useState<ResultEvidence | null>(null),
    [rows, setRows] = useState<ResultRow[]>([]),
    [phases, setPhases] = useState(initialStageCodes(c)),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [reviewed, setReviewed] = useState(false);
  const locked = busy || archived || c.status === 'archived';
  useEffect(() => {
    let active = true;
    setError('');
    setData(null);
    setReviewed(false);
    loadResultEvidence(c)
      .then((d) => {
        if (active) {
          setData(d);
          setRows(
            d.entries.map((e) => ({
              ...(d.results.find((r) => r.entryId === e.entryId) ?? {
                entryId: e.entryId,
                stageId: null,
                resultCode: '',
                finalPosition: null,
              }),
              detail:
                d.results.find((r) => r.entryId === e.entryId)?.detail ?? {},
            })),
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [c.id, retry]);
  const change = (id: number, patch: Partial<ResultRow>) => {
    setReviewed(false);
    setRows((old) =>
      old.map((r) => (r.entryId === id ? { ...r, ...patch } : r)),
    );
  };
  async function propose() {
    if (!data) return;
    setReviewed(false);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (c.code.startsWith('LIGA_')) await cupApi(`${cupAdmin}/competitions/${c.id}/results`, 'POST', {});
      const d = await loadResultEvidence(c);
      setData(d);
      const league = c.code.startsWith('LIGA_')
        ? await cupApi<any>(
            `/api/competition-engine/leagues/${c.code}/standings?season=${seasonNumber}`,
          )
        : undefined;
      setRows(suggestResults(c, d, phases, league));
      setReviewed(false);
      setNotice(
        'Propuesta preparada: revisá todas las filas antes de confirmar. Las fases ambiguas quedan pendientes.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await cupApi(`${cupAdmin}/competitions/${c.id}/results`, 'PUT', {
        results: rows,
      });
      const d = await loadResultEvidence(c);
      setData(d);
      setRows(d.results);
      setReviewed(false);
      setNotice(
        'Resultados confirmados. Se guardó el historial de la confirmación. Recalculá IFFHS si corresponde.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const errors = data ? resultErrors(c, data, rows) : [];
  return (
    <details className="form-stack">
      <summary>Resultados finales</summary>
      <p>
        Confirmar guarda los resultados de todos los participantes. Si ya había
        resultados confirmados, los reemplaza y afecta el historial e IFFHS.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data ? (
        error ? <button className="button button--secondary" onClick={() => setRetry(n => n + 1)}>Reintentar carga de resultados</button>
          : <p role="status">Cargando resultados…</p>
      ) : (
        <>
          <p>
            {data.results.length} de {data.entries.length} resultados confirmados.
            Estado de competición: {statusLabel(c.status)}. {c.status !== 'finished' && c.status !== 'archived' && 'Finalizá la competición desde Configuración general antes de calcular IFFHS.'}
          </p>
          {data.entries.length === 0 && <p>{c.code.startsWith('LIGA_') ? 'Al cerrar las cinco Fechas, prepará la propuesta para cargar los participantes y sus posiciones.' : 'Todavía no hay participantes en esta competición. Completá primero su configuración deportiva.'}</p>}
          {c.stages
            .filter((s) => s.stageType === 'KNOCKOUT')
            .map((s) => (
              <label className="field" key={s.id}>
                Fase deportiva de {s.name}
                <select
                  disabled={locked}
                  value={phases[s.id] ?? ''}
                  onChange={(e) =>
                    setPhases({ ...phases, [s.id]: e.target.value })
                  }
                >
                  <option value="">Sin inferir: completar manualmente</option>
                  {[
                    'FINAL',
                    ...(['COPA_TOTAL', 'COPA_PAPA'].includes(c.code)
                      ? ['THIRD']
                      : []),
                    ...resultCodes(c.code).filter(
                      (k) =>
                        ![
                          'CHAMPION',
                          'RUNNER_UP',
                          'THIRD',
                          'POSITION',
                          'GROUP_STAGE',
                        ].includes(k),
                    ),
                  ].map((k) => (
                    <option key={k} value={k}>
                      {k === 'FINAL' ? 'Final' : resultLabels[k]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <button
            className="button button--secondary"
            disabled={locked}
            onClick={() => void propose()}
          >
            Preparar propuesta desde resultados deportivos
          </button>
          {data.entries.map((e) => {
            const r = rows.find((r) => r.entryId === e.entryId);
            if (!r) return null;
            const saved = data.results.find((r) => r.entryId === e.entryId);
            const ids = [...new Set(e.members.map((m) => m.userId))];
            return (
              <article className="competition-stage form-stack" key={e.entryId}>
                <h4>{e.entryName}</h4>
                {saved && (
                  <p>
                    Confirmado:{' '}
                    {resultLabels[saved.resultCode] ?? saved.resultCode} ·{' '}
                    {saved.confirmedBy} ·{' '}
                    {new Date(
                      saved.confirmedAt!.replace(' ', 'T') + 'Z',
                    ).toLocaleString('es-AR', {
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </p>
                )}
                <label className="field">
                  Resultado / fase alcanzada
                  <select
                    disabled={locked}
                    value={r.resultCode}
                    onChange={(ev) =>
                      change(e.entryId, { resultCode: ev.target.value })
                    }
                  >
                    <option value="">Pendiente de revisión</option>
                    {resultCodes(c.code).map((k) => (
                      <option key={k} value={k}>
                        {resultLabels[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Posición final (si corresponde)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={locked}
                    value={r.finalPosition ?? ''}
                    onChange={(ev) =>
                      change(e.entryId, {
                        finalPosition: ev.target.value
                          ? Number(ev.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Etapa alcanzada
                  <select
                    disabled={locked}
                    value={r.stageId ?? ''}
                    onChange={(ev) =>
                      change(e.entryId, {
                        stageId: ev.target.value
                          ? Number(ev.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">Sin etapa</option>
                    {c.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {e.entryType === 'DUO' && (
                  <>
                    <p>
                      Composición histórica:{' '}
                      {e.members
                        .map(
                          (m) =>
                            `${m.fullName} (${m.validFrom ? 'desde Fecha vinculada' : 'desde inicio'}${m.validTo ? ', hasta sustitución' : ''})`,
                        )
                        .join('; ')}
                      .
                    </p>
                    {ids.length > 2 && (
                      <fieldset disabled={locked}>
                        <legend>
                          Destinatarios IFFHS: elección explícita obligatoria
                        </legend>
                        {ids.map((id) => (
                          <label key={id} style={{ display: 'block' }}>
                            <input
                              type="checkbox"
                              checked={
                                Array.isArray(r.detail?.iffhsUserIds) &&
                                r.detail.iffhsUserIds.includes(id)
                              }
                              onChange={(ev) => {
                                const current = Array.isArray(
                                  r.detail?.iffhsUserIds,
                                )
                                  ? r.detail.iffhsUserIds
                                  : [];
                                change(e.entryId, {
                                  detail: {
                                    ...r.detail,
                                    iffhsUserIds: ev.target.checked
                                      ? [...current, id]
                                      : current.filter((v) => v !== id),
                                  },
                                });
                              }}
                            />
                            {e.members.find((m) => m.userId === id)?.fullName}
                          </label>
                        ))}
                      </fieldset>
                    )}
                  </>
                )}
              </article>
            );
          })}
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <label>
            <input
              type="checkbox"
              disabled={locked}
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />{' '}
            Revisé todos los resultados y quiénes reciben puntos IFFHS.
          </label>
          <button
            className="button button--primary"
            disabled={locked || !reviewed || errors.length > 0}
            onClick={() => void save()}
          >
            Confirmar resultados finales
          </button>
        </>
      )}
    </details>
  );
}
