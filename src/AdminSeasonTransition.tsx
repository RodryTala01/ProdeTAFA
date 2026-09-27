import { useEffect, useState } from 'react';
import {
  transitionApi,
  transitionChoices,
  transitionErrors,
  transitionOrigin,
  type TransitionPlan,
  type TransitionChoice,
  type TransitionTarget,
} from './transition-admin';
export function TransitionAssignments({
  plan,
  choices,
  disabled,
  onChange,
}: {
  plan: TransitionPlan;
  choices: TransitionChoice[];
  disabled: boolean;
  onChange: (rows: TransitionChoice[]) => void;
}) {
  return (
    <div className="form-stack">
      {plan.assignments.map((a) => {
        const row = choices.find((c) => c.userId === a.userId);
        return (
          <article className="competition-stage form-stack" key={a.userId}>
            <h4>
              {a.fullName}
              {!a.isActive ? ' · Inactivo' : ''}
            </h4>
            <p>
              Actual: Liga {a.fromDivisionCode} → Propuesta: Liga{' '}
              {a.proposedDivisionCode}
            </p>
            <p>Origen: {transitionOrigin(a.proposalSource)}</p>
            <p>
              {a.proposalSource === 'PROMOTION_RESULT'
                ? 'Destino según el resultado confirmado de Promoción.'
                : a.proposalReason}
            </p>
            <p>
              {a.requiresReview
                ? 'Requiere revisión Admin'
                : 'Sin revisión individual requerida'}
            </p>
            {a.confirmedDivisionCode && (
              <p>
                Confirmado: Liga {a.confirmedDivisionCode} ·{' '}
                {a.confirmationReason || 'Propuesta aceptada'}
              </p>
            )}
            <label className="field">
              Destino de {a.fullName}
              <select
                disabled={disabled}
                value={row?.divisionCode ?? ''}
                onChange={(e) =>
                  onChange(
                    choices.map((c) =>
                      c.userId === a.userId
                        ? { ...c, divisionCode: e.target.value }
                        : c,
                    ),
                  )
                }
              >
                <option value="A">Liga A</option>
                <option value="B">Liga B</option>
              </select>
            </label>
            <label className="field">
              Motivo para {a.fullName}
              {a.requiresReview || row?.divisionCode !== a.proposedDivisionCode
                ? ' (obligatorio)'
                : ''}
              <input
                disabled={disabled}
                value={row?.reason ?? ''}
                onChange={(e) =>
                  onChange(
                    choices.map((c) =>
                      c.userId === a.userId
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
    </div>
  );
}
export default function AdminSeasonTransition({
  seasonId,
  seasonNumber,
  existingTarget,
  onOpenTarget,
}: {
  seasonId: number;
  seasonNumber: number;
  existingTarget: TransitionTarget | null;
  onOpenTarget: (id: number) => Promise<void>;
}) {
  const [plan, setPlan] = useState<TransitionPlan | null>(null),
    [choices, setChoices] = useState<TransitionChoice[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [reviewed, setReviewed] = useState(false);
  function accept(p: TransitionPlan | null) {
    setPlan(p);
    setChoices(p ? transitionChoices(p) : []);
    setReviewed(false);
  }
  useEffect(() => {
    let active = true;
    transitionApi
      .load(seasonId)
      .then((d) => {
        if (active) accept(d.plan);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [seasonId]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const errors = plan ? transitionErrors(plan, choices) : [],
    dirty =
      !!plan &&
      JSON.stringify(choices) !== JSON.stringify(transitionChoices(plan)),
    target = plan?.targetSeason ?? existingTarget;
  const status = {
    draft: 'Borrador',
    confirmed: 'Confirmado',
    applied: 'Aplicado',
    cancelled: 'Cancelado',
  };
  return (
    <details className="card panel form-stack">
      <summary>
        Transición T{seasonNumber} → T{seasonNumber + 1}
      </summary>
      <p>
        Generar propuesta, revisar destinos, confirmar y aplicar son pasos
        separados. La temporada destino se crea en borrador.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {target && (
        <p>
          T{target.seasonNumber} ya existe · estado:{' '}
          {target.status === 'draft' ? 'Borrador (draft)' : target.status}.{' '}
          {plan?.status === 'applied'
            ? 'Creada mediante este plan.'
            : 'No se creará ni modificará automáticamente.'}
        </p>
      )}
      {!plan ? (
        <button
          className="button button--primary"
          disabled={busy || !!target}
          onClick={() =>
            void run(async () => {
              accept((await transitionApi.generate(seasonId)).plan);
              setNotice(
                'Propuesta generada. Revisá los issues y todos los destinos.',
              );
            })
          }
        >
          Generar plan de transición
        </button>
      ) : (
        <>
          <p>
            Plan: {status[plan.status as keyof typeof status] ?? plan.status} ·{' '}
            {plan.assignments.length} participantes.
          </p>
          <section aria-label="Issues de la propuesta">
            <h4>Issues de la propuesta original</h4>
            {plan.issues.length ? (
              <ul>
                {plan.issues.map((issue, i) => (
                  <li key={i}>
                    {issue.message}
                    {issue.userIds?.length
                      ? ` Participantes: ${issue.userIds.map((id) => plan.assignments.find((a) => a.userId === id)?.fullName ?? 'Participante').join(', ')}.`
                      : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin issues de propuesta.</p>
            )}
            <p>
              Los issues se conservan como referencia histórica; revisá los
              destinos y motivos confirmados.
            </p>
          </section>
          {plan.applicationBlockers.length > 0 && (
            <section role="alert">
              <h4>Aplicación bloqueada</h4>
              <ul>
                {plan.applicationBlockers.map((b, i) => (
                  <li key={i}>{b.message}</li>
                ))}
              </ul>
            </section>
          )}
          <p>
            Destinos seleccionados: Liga A{' '}
            {choices.filter((c) => c.divisionCode === 'A').length} · Liga B{' '}
            {choices.filter((c) => c.divisionCode === 'B').length}. Origen: A{' '}
            {plan.assignments.filter((a) => a.fromDivisionCode === 'A').length}{' '}
            · B{' '}
            {plan.assignments.filter((a) => a.fromDivisionCode === 'B').length}.
          </p>
          <TransitionAssignments
            plan={plan}
            choices={choices}
            disabled={busy || plan.status !== 'draft'}
            onChange={(rows) => {
              setChoices(rows);
              setReviewed(false);
            }}
          />
          {plan.status === 'draft' && (
            <>
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />{' '}
                Revisé los issues, destinos y motivos. Al confirmar se bloquea
                la edición del plan.
              </label>
              <button
                className="button button--primary"
                disabled={busy || !!target || !reviewed || errors.length > 0}
                onClick={() =>
                  void run(async () => {
                    accept(
                      (await transitionApi.confirm(plan.id, choices)).plan,
                    );
                    setNotice(
                      'Plan confirmado y auditado. Todavía no se creó la temporada destino.',
                    );
                  })
                }
              >
                Confirmar plan
              </button>
            </>
          )}
          {plan.status === 'confirmed' && (
            <button
              className="button button--primary"
              disabled={busy || !!target || plan.applicationBlockers.length > 0}
              onClick={() =>
                void run(async () => {
                  const d = await transitionApi.apply(plan.id);
                  accept(d.plan);
                  setNotice(
                    `T${d.targetSeason.seasonNumber} creada en estado draft. Plan aplicado y auditado.`,
                  );
                })
              }
            >
              Aplicar plan y crear T{plan.targetSeasonNumber} en borrador
            </button>
          )}
        </>
      )}
      <button
        className="button button--secondary"
        disabled={busy || dirty}
        onClick={() =>
          void run(async () => {
            accept((await transitionApi.load(seasonId)).plan);
            setNotice('Plan y condiciones de aplicación actualizados.');
          })
        }
      >
        Actualizar plan y bloqueos
      </button>
      {dirty && <p>Hay cambios locales sin confirmar.</p>}
      {target && (
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => void run(() => onOpenTarget(target.id))}
        >
          Abrir T{target.seasonNumber}
        </button>
      )}
    </details>
  );
}
