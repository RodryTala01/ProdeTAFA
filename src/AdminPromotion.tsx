import { useEffect, useState } from 'react';
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
} from './cup-ab-api';
import CupEncounter from './CupEncounter';
import {
  loadPromotion,
  promotionChoices,
  promotionErrors,
  promotionPreview,
  type PromotionPerson,
  type PromotionSlot,
  type PromotionChoice,
  type PromotionMovement,
} from './promotion-admin';
import './cup-ab.css';
export default function AdminPromotion({
  competition: c,
  rounds,
  eligible,
  disabled,
}: {
  competition: CupCompetition;
  rounds: CupRound[];
  eligible: PromotionPerson[];
  disabled: boolean;
}) {
  const [data, setData] = useState<Awaited<
      ReturnType<typeof loadPromotion>
    > | null>(null),
    [choices, setChoices] = useState<PromotionChoice[]>([]),
    [tab, setTab] = useState('Cupos'),
    [stage, setStage] = useState(''),
    [link, setLink] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const base = `${cupAdmin}/competitions/${c.id}/promotion`,
    locked = disabled || busy || ['finished', 'archived'].includes(c.status);
  async function load() {
    const d = await loadPromotion(c);
    setData(d);
    setChoices(promotionChoices(d.slots));
  }
  useEffect(() => {
    let active = true;
    loadPromotion(c)
      .then((d) => {
        if (active) {
          setData(d);
          setChoices(promotionChoices(d.slots));
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
  const started = !!data?.encounters.length,
    dirty =
      !!data &&
      JSON.stringify(choices) !== JSON.stringify(promotionChoices(data.slots));
  const confirmed =
    data?.slots.length === 4 &&
    data.slots.every(
      (s) => s.confirmedEntryId && ['confirmed', 'replaced'].includes(s.status),
    );
  const stages = c.stages.filter(
      (s) =>
        s.stageType === 'KNOCKOUT' &&
        !['finished', 'archived'].includes(s.status),
    ),
    links = c.roundLinks.filter(
      (l) => l.stageId === Number(stage) && l.purpose === 'NORMAL',
    );
  const preview = promotionPreview(data?.encounters ?? []),
    sourceStage = data?.stages.find((s) => s.encounters.length === 2)?.stageId;
  const fixed = [
    ['B_HIGH_PROMO', 'A_LOW_PROMO'],
    ['B_LOW_PROMO', 'A_HIGH_PROMO'],
  ];
  return (
    <section
      className="form-stack cup-ab"
      aria-label="Administración deportiva Promoción"
    >
      <h3>{c.displayName}</h3>
      <nav className="cup-tabs" aria-label="Secciones Promoción">
        {['Cupos', 'Cruces', 'Movimientos'].map((t) => (
          <button
            className="button button--secondary"
            key={t}
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
        <p>Cargando Promoción…</p>
      ) : (
        <>
          <button
            className="button button--secondary"
            disabled={locked || dirty}
            onClick={() => void run(async () => {}, 'Datos actualizados.')}
          >
            Actualizar puntajes y propuesta
          </button>
          {tab === 'Cupos' && (
            <>
              <p>
                Base: A N−3 y N−2; B 2.º y 3.º. Los dos últimos de Liga A quedan
                fuera de Promoción.
              </p>
              <p>
                Los corrimientos por Copa A/B requieren corrección Admin con
                motivo. No se resuelven automáticamente.
              </p>
              <button
                className="button button--secondary"
                disabled={locked || started || dirty}
                onClick={() =>
                  void run(
                    () => cupApi(base + '/prefill', 'POST', {}),
                    'Propuesta base generada.',
                  )
                }
              >
                Generar propuesta de los 4 cupos
              </button>
              <p>
                Regenerar reemplaza las selecciones guardadas mientras todavía
                no existan cruces.
              </p>
              <PromotionSlots
                slots={data.slots}
                choices={choices}
                eligible={eligible}
                disabled={locked || started}
                onChange={setChoices}
              />
              {dirty && (
                <p>
                  Cambios pendientes: confirmá los cupos antes de crear cruces.
                </p>
              )}
              <button
                className="button button--primary"
                disabled={
                  locked ||
                  started ||
                  promotionErrors(data.slots, choices, eligible).length > 0
                }
                onClick={() =>
                  void run(
                    () => cupApi(base + '/slots', 'PUT', { slots: choices }),
                    'Cuatro cupos confirmados y auditados.',
                  )
                }
              >
                Confirmar los 4 cupos
              </button>
              {started && (
                <p>
                  Los cupos están bloqueados porque los cruces ya fueron
                  creados.
                </p>
              )}
            </>
          )}
          {tab === 'Cruces' && (
            <>
              <p>Dos cruces fijos en la misma Fecha. No hay armado libre.</p>
              {fixed.map((pair, i) => (
                <p key={i}>
                  Promoción {i + 1}:{' '}
                  {pair
                    .map(
                      (code) =>
                        data.slots.find((s) => s.slotCode === code)
                          ?.confirmedUser?.name ??
                        data.slots.find((s) => s.slotCode === code)?.slotName ??
                        code.replaceAll('_', ' '),
                    )
                    .join(' vs ')}
                </p>
              ))}
              {!started && (
                <>
                  <label className="field">
                    Etapa eliminatoria
                    <select
                      value={stage}
                      disabled={locked || !confirmed || dirty}
                      onChange={(e) => {
                        setStage(e.target.value);
                        setLink('');
                      }}
                    >
                      <option value="">Elegir etapa</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Fecha compartida para ambos cruces
                    <select
                      value={link}
                      disabled={locked || !stage || dirty}
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
                  <p>
                    Creá la etapa y vinculá la Fecha desde Configuración
                    general.
                  </p>
                  <button
                    className="button button--primary"
                    disabled={
                      locked ||
                      !confirmed ||
                      dirty ||
                      !stages.some((s) => s.id === Number(stage)) ||
                      !links.some((l) => l.id === Number(link))
                    }
                    onClick={() =>
                      void run(
                        () =>
                          cupApi(base + '/matches', 'POST', {
                            stageId: Number(stage),
                            roundLinkId: Number(link),
                          }),
                        'Los dos cruces fijos fueron creados en la misma Fecha.',
                      )
                    }
                  >
                    Crear los 2 cruces fijos
                  </button>
                </>
              )}
              {data.encounters.map((e) => (
                <CupEncounter
                  key={e.id}
                  encounter={e}
                  rounds={rounds}
                  disabled={locked}
                  allowExceptional={false}
                  onChanged={() =>
                    run(async () => {}, 'Ganadores actualizados.')
                  }
                />
              ))}
            </>
          )}
          {tab === 'Movimientos' && (
            <>
              <h4>Vista previa según ganadores confirmados</h4>
              {preview.length === 4 ? (
                <ul>
                  {preview.map((m, i) => (
                    <li key={i}>
                      {m.name} · {m.result} → Liga {m.toDivision}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Los dos cruces deben tener ganadores confirmados antes de
                  generar movimientos.
                </p>
              )}
              <p>
                Se guarda una propuesta de movimientos; esta pantalla no aplica
                cambios de división ni crea una temporada nueva.
              </p>
              <button
                className="button button--primary"
                disabled={
                  locked ||
                  preview.length !== 4 ||
                  !sourceStage ||
                  data.movements.some((m) => m.status !== 'proposed')
                }
                onClick={() =>
                  void run(
                    () =>
                      cupApi(
                        `${base}/stages/${sourceStage}/finalize`,
                        'POST',
                        {},
                      ),
                    'Propuesta de cuatro movimientos guardada.',
                  )
                }
              >
                {data.movements.length
                  ? 'Regenerar propuesta de movimientos'
                  : 'Generar propuesta final de movimientos'}
              </button>
              <PromotionMovements movements={data.movements} />
            </>
          )}
        </>
      )}
    </section>
  );
}
export function PromotionSlots({
  slots,
  choices,
  eligible,
  disabled,
  onChange,
}: {
  slots: PromotionSlot[];
  choices: PromotionChoice[];
  eligible: PromotionPerson[];
  disabled: boolean;
  onChange: (v: PromotionChoice[]) => void;
}) {
  return (
    <div className="form-stack">
      {slots.map((s) => {
        const choice = choices.find((c) => c.slotCode === s.slotCode);
        return (
          <article className="competition-stage form-stack" key={s.slotCode}>
            <h4>{s.slotName}</h4>
            <p>
              Posición base:{' '}
              {s.source?.competitionCode === 'LIGA_A' ? 'Liga A' : 'Liga B'} ·{' '}
              {s.source?.position
                ? `${s.source.position}.º`
                : 'Sin posición disponible'}
            </p>
            <p>Propuesto: {s.proposedUser?.name ?? 'Vacante'}</p>
            <p>Confirmado: {s.confirmedUser?.name ?? 'Pendiente'}</p>
            {s.replacementReason && (
              <p>Motivo guardado: {s.replacementReason}</p>
            )}
            <label className="field">
              Participante · {s.slotName}
              <select
                value={choice?.userId ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    choices.map((c) =>
                      c.slotCode === s.slotCode
                        ? { ...c, userId: e.target.value }
                        : c,
                    ),
                  )
                }
              >
                <option value="">Elegir participante activo</option>
                {choice?.userId &&
                  !eligible.some((p) => p.id === choice.userId) && (
                    <option value={choice.userId}>
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
                disabled={disabled}
                value={choice?.reason ?? ''}
                onChange={(e) =>
                  onChange(
                    choices.map((c) =>
                      c.slotCode === s.slotCode
                        ? { ...c, reason: e.target.value }
                        : c,
                    ),
                  )
                }
              />
            </label>
          </article>
        );
      })}
      {!disabled && (
        <ul aria-label="Cupos por resolver">
          {promotionErrors(slots, choices, eligible).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function PromotionMovements({
  movements,
}: {
  movements: PromotionMovement[];
}) {
  return (
    <section>
      <h4>Movimientos guardados</h4>
      {!movements.length ? (
        <p>Todavía no se generó la propuesta.</p>
      ) : (
        <ul>
          {movements.map((m) => (
            <li key={m.id}>
              {m.fullName} ·{' '}
              {m.fromDivision ? `Liga ${m.fromDivision}` : 'Sin división'} →
              Liga {m.toDivision} ·{' '}
              {(
                {
                  proposed: 'Propuesto',
                  confirmed: 'Confirmado',
                  applied: 'Aplicado',
                  cancelled: 'Cancelado',
                } as Record<string, string>
              )[m.status] ?? m.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
