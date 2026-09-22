import { useEffect, useState } from "react";
import { statusLabel } from "./competition-presentation";
import {
  cupAdmin,
  cupApi,
  type CupCompetition,
  type CupStage,
  type CupRound,
  type Entry,
  type Encounter,
} from "./cup-ab-api";

import EncounterCard from "./CupEncounter";

export default function CupAbKnockout({
  competition,
  groupStage,
  rounds,
  action,
  label,
  disabled,
}: {
  competition: CupCompetition;
  groupStage: CupStage;
  rounds: CupRound[];
  action: "r16" | "quarterfinals" | "semifinals" | "final";
  label: string;
  disabled: boolean;
}) {
  const knockouts = competition.stages
    .filter((s) => s.stageType === "KNOCKOUT")
    .sort((a, b) => a.sequence - b.sequence);
  const index = ["r16", "quarterfinals", "semifinals", "final"].indexOf(action);
  const [target, setTarget] = useState(String(knockouts[index]?.id ?? ""));
  const [source, setSource] = useState(
    String(index === 0 ? groupStage.id : (knockouts[index - 1]?.id ?? "")),
  );
  const [link, setLink] = useState(""),
    [mode, setMode] = useState<"MANUAL" | "AUTOMATIC">("MANUAL");
  const [pool, setPool] = useState<Entry[]>([]),
    [pairs, setPairs] = useState<string[][]>([]),
    [encounters, setEncounters] = useState<Encounter[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reason, setReason] = useState("");
  const links = competition.roundLinks.filter(
    (l) => l.stageId === Number(target) && l.purpose === "NORMAL",
  );
  const targetStage = competition.stages.find((s) => s.id === Number(target));
  const locked = disabled || busy;
  async function loadEncounters() {
    if (target) {
      const data = await cupApi<{ encounters: Encounter[] }>(
        `/api/competition-engine/stages/${target}/knockout`,
      );
      setEncounters(data.encounters);
    }
  }
  useEffect(() => {
    let alive = true;
    setEncounters([]);
    setPool([]);
    setPairs([]);
    setMessage("");
    setError("");
    setLink("");
    if (target)
      cupApi<{ encounters: Encounter[] }>(
        `/api/competition-engine/stages/${target}/knockout`,
      )
        .then((d) => {
          if (alive) setEncounters(d.encounters);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [target]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const payload = {
    targetStageId: Number(target),
    roundLinkId: Number(link),
    groupStageId: groupStage.id,
  };
  const path = `${cupAdmin}/stages/${source}/cup-ab-progression/${action}`;
  async function preview() {
    await run(async () => {
      const query = new URLSearchParams(
        Object.entries(payload).map(([k, v]) => [k, String(v)]),
      );
      const data = await cupApi<{ pool: Entry[] }>(`${path}?${query}`);
      setPool(data.pool);
      const existing = encounters.map((e) => [
        String(e.entryA?.id ?? ""),
        String(e.entryB?.id ?? ""),
      ]);
      setPairs(
        existing.length
          ? existing
          : Array.from({ length: data.pool.length / 2 }, () => ["", ""]),
      );
    });
  }
  async function save() {
    await run(async () => {
      const result = await cupApi<{
        randomSeed?: number;
        configurationMode: string;
      }>(path, "POST", {
        ...payload,
        mode,
        ...(mode === "MANUAL"
          ? { pairs: pairs.map((p) => p.map(Number)) }
          : {}),
        replace: encounters.length > 0,
        reason,
      });
      setMessage(
        `Cruces guardados · ${result.configurationMode === "MANUAL" ? "Manual" : "Automático"}${result.randomSeed == null ? "" : ` · Semilla ${result.randomSeed}`}`,
      );
      setPool([]);
      await loadEncounters();
    });
  }
  return (
    <section className="form-stack">
      <h3>{label}</h3>
      <p>
        {targetStage
          ? `${targetStage.name} · ${statusLabel(targetStage.status)}`
          : "Creá la etapa eliminatoria desde la configuración general."}
      </p>
      <label className="field">
        Etapa de {label}
        <select
          aria-label={`Etapa de ${label}`}
          disabled={locked}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Elegir etapa</option>
          {knockouts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Etapa origen
        <select
          aria-label={`Origen de ${label}`}
          disabled={locked}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPool([]);
          }}
        >
          <option value="">Elegir origen</option>
          {(index === 0
            ? [groupStage]
            : knockouts.filter((s) => s.id !== Number(target))
          ).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Fecha de {label}
        <select
          aria-label={`Fecha de ${label}`}
          disabled={locked}
          value={link}
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
      <p>
        Vinculá la Fecha a esta etapa con los controles generales. Los ganadores
        anteriores deben estar confirmados por Admin.
      </p>
      <button
        className="button button--secondary"
        disabled={locked || !target || !source || !link}
        onClick={() => void preview()}
      >
        Consultar clasificados para {label}
      </button>
      {pool.length > 0 && (
        <>
          <ul>
            {pool.map((e) => (
              <li key={e.entryId}>
                {e.displayName}
                {e.position ? ` · ${e.position}.º grupo ${e.groupCode}` : ""}
              </li>
            ))}
          </ul>
          {action === "r16" && (
            <p>Restricción obligatoria: segundo contra tercero.</p>
          )}
          <div className="topbar-actions">
            <button
              className="button button--primary"
              aria-pressed={mode === "MANUAL"}
              disabled={locked}
              onClick={() => setMode("MANUAL")}
            >
              Armar cruces manualmente
            </button>
            <button
              className="button button--secondary"
              aria-pressed={mode === "AUTOMATIC"}
              disabled={locked}
              onClick={() => setMode("AUTOMATIC")}
            >
              {action === "final"
                ? "Construir final"
                : "Sortear automáticamente"}
            </button>
          </div>
          {mode === "MANUAL" &&
            pairs.map((pair, i) => (
              <fieldset key={i}>
                <legend>Cruce {i + 1}</legend>
                {pair.map((value, side) => (
                  <label className="field" key={side}>
                    {action === "r16"
                      ? side === 0
                        ? "Segundo"
                        : "Tercero"
                      : side === 0
                        ? "Participante A"
                        : "Participante B"}
                    <select
                      aria-label={`${label} cruce ${i + 1} lado ${side + 1}`}
                      disabled={locked}
                      value={value}
                      onChange={(e) =>
                        setPairs((p) =>
                          p.map((row, j) =>
                            j === i
                              ? row.map((v, k) =>
                                  k === side ? e.target.value : v,
                                )
                              : row,
                          ),
                        )
                      }
                    >
                      <option value="">Elegir clasificado</option>
                      {pool
                        .filter(
                          (e) =>
                            action !== "r16" ||
                            e.position === (side === 0 ? 2 : 3),
                        )
                        .map((e) => (
                          <option
                            key={e.entryId}
                            value={e.entryId}
                            disabled={
                              pairs.flat().includes(String(e.entryId)) &&
                              value !== String(e.entryId)
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
              (mode === "MANUAL" && pairs.some((p) => p.some((v) => !v))) ||
              (encounters.length > 0 && !reason.trim())
            }
            onClick={() => void save()}
          >
            {mode === "MANUAL"
              ? "Guardar cruces manuales"
              : action === "final"
                ? "Confirmar armado de final"
                : "Ejecutar sorteo de cruces"}
          </button>
        </>
      )}
      {message && (
        <p role="status" className="alert alert--success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      <button
        className="button button--ghost"
        disabled={locked || !target}
        onClick={() => void run(loadEncounters)}
      >
        Actualizar puntajes
      </button>
      {encounters.map((e) => (
        <EncounterCard
          key={e.id}
          encounter={e}
          rounds={rounds}
          disabled={locked}
          onChanged={loadEncounters}
        />
      ))}
      {target && encounters.length === 0 && <p>Sin cruces configurados.</p>}
    </section>
  );
}
