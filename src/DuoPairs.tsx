import { useState } from 'react';
import { cupApi, cupAdmin, type CupCompetition } from './cup-ab-api';
import type { DuoContext, DuoMember } from './AdminCupDuos';
export default function DuoPairs({
  competition: c,
  context,
  disabled,
  onChanged,
}: {
  competition: CupCompetition;
  context: DuoContext;
  disabled: boolean;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState('MANUAL'),
    [pairs, setPairs] = useState<string[][]>(
      Array.from({ length: Math.floor(context.eligible.length / 2) }, () => [
        '',
        '',
      ]),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      const d = await cupApi<{ randomSeed?: number }>(
        `${cupAdmin}/competitions/${c.id}/duos/${mode === 'MANUAL' ? 'pairs' : 'draw'}`,
        'POST',
        mode === 'MANUAL' ? { pairs } : {},
      );
      setMessage(
        `Parejas guardadas · ${mode === 'MANUAL' ? 'Manual' : `Automático · Semilla ${d.randomSeed}`}`,
      );
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy;
  const odd = context.eligible.length % 2 !== 0;
  return (
    <section className="form-stack">
      <h3>Parejas</h3>
      {!context.pairs.length && (
        <>
          <div className="topbar-actions">
            <button
              className="button button--primary"
              aria-pressed={mode === 'MANUAL'}
              onClick={() => setMode('MANUAL')}
            >
              Armar parejas manualmente
            </button>
            <button
              className="button button--secondary"
              aria-pressed={mode === 'AUTOMATIC'}
              onClick={() => setMode('AUTOMATIC')}
            >
              Sortear automáticamente
            </button>
          </div>
          <p>
            {context.eligible.length} participantes activos de esta temporada.
            Todos deben formar una pareja.
          </p>
          {odd && (
            <p role="alert">
              Cantidad impar: no pueden formarse todas las parejas. Resolvé
              explícitamente la composición de la temporada antes de continuar.
            </p>
          )}
          {mode === 'MANUAL' ? (
            pairs.map((pair, i) => (
              <fieldset key={i}>
                <legend>Dúo {i + 1}</legend>
                {pair.map((id, j) => (
                  <label className="field" key={j}>
                    Integrante {j + 1}
                    <select
                      aria-label={`Dúo ${i + 1} integrante ${j + 1}`}
                      value={id}
                      disabled={locked}
                      onChange={(e) =>
                        setPairs((ps) =>
                          ps.map((p, k) =>
                            k === i
                              ? p.map((v, n) => (n === j ? e.target.value : v))
                              : p,
                          ),
                        )
                      }
                    >
                      <option value="">Elegir participante</option>
                      {context.eligible.map((p) => (
                        <option
                          key={p.userId}
                          value={p.userId}
                          disabled={
                            pairs.flat().includes(p.userId) && id !== p.userId
                          }
                        >
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </fieldset>
            ))
          ) : (
            <>
              <p>
                El sorteo usa a todos los elegibles y guarda semilla y
                auditoría.
              </p>
              <ul>
                {context.eligible.map((p) => (
                  <li key={p.userId}>{p.fullName}</li>
                ))}
              </ul>
            </>
          )}
          <button
            className="button button--primary"
            disabled={
              locked ||
              odd ||
              context.eligible.length < 2 ||
              (mode === 'MANUAL' && pairs.flat().some((v) => !v))
            }
            onClick={() => void save()}
          >
            {mode === 'MANUAL'
              ? 'Guardar parejas manuales'
              : 'Ejecutar sorteo de parejas'}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {context.pairs.map((p) => (
        <article className="competition-stage" key={p.id}>
          <h4>{p.displayName}</h4>
          <p>
            {p.status === 'eliminated'
              ? 'Eliminado'
              : p.status === 'qualified'
                ? 'Clasificado'
                : 'Activo'}{' '}
            ·{' '}
            {p.configuration.configurationMode === 'MANUAL'
              ? 'Manual'
              : 'Automático'}
            {p.configuration.randomSeed != null
              ? ` · Semilla ${p.configuration.randomSeed}`
              : ''}
          </p>
          <p>
            Composición más reciente:{' '}
            {p.members
              .filter((m) => m.validUntilBeforeRoundId === null)
              .map((m) => m.fullName)
              .join(' + ')}
          </p>
          <MemberHistory entryId={p.id} />
          <details>
            <summary>Cambiar integrante</summary>
            <Substitution
              entryId={p.id}
              members={p.members}
              context={context}
              competition={c}
              disabled={locked}
              onChanged={onChanged}
            />
          </details>
        </article>
      ))}
    </section>
  );
}
function MemberHistory({ entryId }: { entryId: number }) {
  const [members, setMembers] = useState<DuoMember[]>([]),
    [error, setError] = useState('');
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open)
          cupApi<{ members: DuoMember[] }>(
            `/api/competition-engine/entries/${entryId}/duos/members`,
          )
            .then((d) => setMembers(d.members))
            .catch((e) => setError(e.message));
      }}
    >
      <summary>Historial de integrantes</summary>
      {members.map((m, i) => (
        <p key={i}>
          {m.fullName}: {m.validFromRoundName ?? 'Desde inicio'} →{' '}
          {m.validUntilBeforeRoundName
            ? `hasta antes de ${m.validUntilBeforeRoundName}`
            : 'vigente en adelante'}
        </p>
      ))}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
function Substitution({
  entryId,
  members,
  context,
  competition: c,
  disabled,
  onChanged,
}: {
  entryId: number;
  members: DuoMember[];
  context: DuoContext;
  competition: CupCompetition;
  disabled: boolean;
  onChanged: () => Promise<void>;
}) {
  const [out, setOut] = useState(''),
    [incoming, setIncoming] = useState(''),
    [round, setRound] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  return (
    <div className="form-stack">
      <p>
        El cambio rige desde esta Fecha hacia adelante. Los resultados
        anteriores no se modifican.
      </p>
      <label className="field">
        Quién sale
        <select
          value={out}
          disabled={disabled || busy}
          onChange={(e) => setOut(e.target.value)}
        >
          <option value="">Elegir integrante</option>
          {members.map((m, i) => (
            <option key={i} value={m.userId}>
              {m.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Quién entra
        <select
          value={incoming}
          disabled={disabled || busy}
          onChange={(e) => setIncoming(e.target.value)}
        >
          <option value="">Elegir participante activo</option>
          {context.eligible.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Desde qué Fecha
        <select
          value={round}
          disabled={disabled || busy}
          onChange={(e) => setRound(e.target.value)}
        >
          <option value="">Elegir Fecha</option>
          {c.roundLinks
            .filter((l) => l.purpose === 'NORMAL')
            .map((l) => (
              <option key={l.id} value={l.roundId}>
                {l.roundName}
              </option>
            ))}
        </select>
      </label>
      <button
        className="button button--secondary"
        disabled={disabled || busy || !out || !incoming || !round}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await cupApi(
              `${cupAdmin}/entries/${entryId}/duos/substitute`,
              'POST',
              {
                outgoingUserId: out,
                incomingUserId: incoming,
                effectiveRoundId: Number(round),
              },
            );
            await onChanged();
            setMessage('Sustitución guardada y auditada.');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Guardar sustitución
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
