import { useEffect, useState } from "react";
import CupAbKnockout from "./CupAbKnockout";
import {
  cupApi,
  cupAdmin,
  type CupCompetition,
  type CupRound,
} from "./cup-ab-api";
import { statusLabel } from "./competition-presentation";
import "./cup-ab.css";

type Person = { userId: string; fullName: string };
type Group = { code: string; name: string; userIds: string[] };
type Context = {
  eligible: Person[];
  defendingChampionUserId: string | null;
  championKnown: boolean;
  assignments: { code: string; name: string; userId: string }[];
  lastConfiguration: null | { configurationMode: string; randomSeed?: number };
};
type Ranking = {
  ranking: { userId: string; position: number; totalPoints: number }[];
  missingSeasons: number[];
};
type Table = {
  provisional: boolean;
  groups: {
    code: string;
    name: string;
    standings: {
      userId: string;
      fullName: string;
      position: number;
      points: number;
      fulls: number;
      partials: number;
      errors: number;
      extras: number;
      destination: string;
    }[];
  }[];
};
const phases = [
  { key: "summary", label: "Resumen" },
  { key: "groups", label: "Grupos" },
  { key: "r16", label: "Octavos" },
  { key: "quarterfinals", label: "Cuartos" },
  { key: "semifinals", label: "Semifinal" },
  { key: "final", label: "Final" },
] as const;

export default function AdminCupAb({
  competition,
  seasonNumber,
  rounds,
  disabled,
}: {
  competition: CupCompetition;
  seasonNumber: number;
  rounds: CupRound[];
  disabled: boolean;
}) {
  const stage = competition.stages.find(
    (s) => s.stageType === "ACCUMULATIVE_GROUPS",
  )!;
  const [tab, setTab] = useState<string>("summary"),
    [context, setContext] = useState<Context | null>(null),
    [ranking, setRanking] = useState<Ranking | null>(null),
    [table, setTable] = useState<Table | null>(null);
  const [groups, setGroups] = useState<Group[]>([]),
    [count, setCount] = useState(4),
    [champion, setChampion] = useState("");
  const [mode, setMode] = useState<"MANUAL" | "AUTOMATIC">("MANUAL"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reason, setReason] = useState("");
  const dates = competition.roundLinks
    .filter((l) => l.stageId === stage.id && l.purpose === "NORMAL")
    .sort((a, b) => a.sequence - b.sequence);
  const locked =
    disabled || busy || ["finished", "archived"].includes(competition.status);
  const groupLocked = locked || stage.status !== "draft" || dates.length > 0;
  function emptyGroups(n: number, people: Person[], champ: string) {
    return Array.from({ length: n }, (_, i) => ({
      code: String.fromCharCode(65 + i),
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      userIds: Array.from(
        {
          length:
            Math.floor(people.length / n) + (i < people.length % n ? 1 : 0),
        },
        (_, j) => (i === 0 && j === 0 ? champ : ""),
      ),
    }));
  }
  async function load() {
    const [c, r, t] = await Promise.all([
      cupApi<Context>(`${cupAdmin}/stages/${stage.id}/groups`),
      cupApi<Ranking>(
        `/api/competition-engine/iffhs/ranking?throughSeason=${seasonNumber - 1}`,
      ),
      cupApi<Table>(
        `/api/competition-engine/cups/${competition.code}/groups?season=${seasonNumber}`,
      ),
    ]);
    setContext(c);
    setRanking(r);
    setTable(t);
    setChampion(c.defendingChampionUserId ?? "");
    const saved: Group[] = [];
    for (const a of c.assignments) {
      let g = saved.find((g) => g.code === a.code);
      if (!g) {
        g = { code: a.code, name: a.name, userIds: [] };
        saved.push(g);
      }
      g.userIds.push(a.userId);
    }
    const n =
      saved.length ||
      (c.eligible.length === 16
        ? 4
        : Math.max(2, Math.min(4, c.eligible.length)));
    setCount(n);
    setGroups(
      saved.length
        ? saved
        : emptyGroups(n, c.eligible, c.defendingChampionUserId ?? ""),
    );
  }
  useEffect(() => {
    setBusy(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [stage.id, competition.roundLinks.length]);
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
  const eligible = context?.eligible ?? [];
  const reference = [...eligible].sort(
    (a, b) =>
      (ranking?.ranking.find((r) => r.userId === a.userId)?.position ??
        Infinity) -
      (ranking?.ranking.find((r) => r.userId === b.userId)?.position ??
        Infinity),
  );
  const seeds = [
    ...reference.filter((p) => p.userId === champion),
    ...reference.filter((p) => p.userId !== champion),
  ];
  const selected = groups.flatMap((g) => g.userIds);
  async function save() {
    await run(async () => {
      const result = await cupApi<{ randomSeed?: number }>(
        `${cupAdmin}/stages/${stage.id}/groups${mode === "AUTOMATIC" ? "/draw" : ""}`,
        "POST",
        mode === "MANUAL"
          ? { groups, defendingChampionUserId: champion || null, reason }
          : {
              rankingUserIds: reference.map((p) => p.userId),
              groupCount: count,
              defendingChampionUserId: champion || null,
              reason,
            },
      );
      await load();
      setMessage(
        `Grupos guardados · ${mode === "MANUAL" ? "Manual" : "Automático"}${result.randomSeed == null ? "" : ` · Semilla ${result.randomSeed}`}`,
      );
    });
  }
  return (
    <section
      className="cup-ab form-stack"
      aria-label={`Administración deportiva ${competition.displayName}`}
    >
      <h2>
        {competition.displayName} · División {competition.divisionCode}
      </h2>
      <nav className="cup-tabs" aria-label="Fases de Copa">
        {phases.map((p) => (
          <button
            key={p.key}
            className={`button button--${tab === p.key ? "primary" : "ghost"}`}
            aria-pressed={tab === p.key}
            onClick={() => setTab(p.key)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="alert alert--success">
          {message}
        </p>
      )}
      {busy && <p role="status">Cargando…</p>}
      {(tab === "summary" || tab === "groups") && (
        <>
          <p>
            {eligible.length} participantes elegibles · División{" "}
            {competition.divisionCode}. Los puntos de estas Fechas se usan en
            esta Copa; vincularlas aquí no las incorpora a Liga.
          </p>
          {[0, 1].map((i) => (
            <p key={i}>
              <strong>Fecha de grupos {i + 1}:</strong>{" "}
              {dates[i]
                ? `${dates[i].roundName} · ${statusLabel(dates[i].roundStatus)}`
                : "Sin vincular"}
            </p>
          ))}
          <p>
            Configurá los grupos antes de vincular las dos Fechas con los
            controles generales de abajo.
          </p>
          {tab === "summary" && (
            <>
              <ul>
                {competition.stages.map((s) => (
                  <li key={s.id}>
                    {s.name}: {statusLabel(s.status)}
                  </li>
                ))}
              </ul>
              <p>
                Octavos: segundos contra terceros. Cuartos: primeros de grupo y
                ganadores confirmados de octavos. Semifinal y final: ganadores
                confirmados. Sin tercer puesto.
              </p>
            </>
          )}
          <details open={tab === "groups"}>
            <summary>Elegibles, IFFHS y bombos de referencia</summary>
            <p>
              IFFHS hasta T{seasonNumber - 1}.{" "}
              {ranking?.missingSeasons?.length
                ? `Historia incompleta: faltan temporadas ${ranking.missingSeasons.join(", ")}.`
                : ""}{" "}
              Los bombos orientan el armado; no imponen un sorteo interno. Si
              hay empate IFFHS, el orden mostrado es sólo una referencia: podés
              cargar el sorteo externo manualmente.
            </p>
            <div className="cup-grid">
              {Array.from(
                { length: Math.ceil(seeds.length / count) },
                (_, pot) => (
                  <div key={pot} className="competition-stage">
                    <h4>Bombo {pot + 1}</h4>
                    <ol>
                      {seeds.slice(pot * count, (pot + 1) * count).map((p) => {
                        const rank = ranking?.ranking.find(
                          (r) => r.userId === p.userId,
                        );
                        return (
                          <li key={p.userId}>
                            {p.fullName}
                            {p.userId === champion ? " · Campeón · A1" : ""}
                            <small>
                              {" "}
                              IFFHS:{" "}
                              {rank
                                ? `${rank.totalPoints} pts · puesto ${rank.position}`
                                : "sin referencia"}
                            </small>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ),
              )}
            </div>
          </details>
        </>
      )}
      {tab === "groups" && (
        <>
          <h3>Armado de grupos</h3>
          {context?.lastConfiguration && (
            <p>
              Última configuración:{" "}
              {context.lastConfiguration.configurationMode === "MANUAL"
                ? "Manual"
                : "Automática"}
              {context.lastConfiguration.randomSeed != null
                ? ` · Semilla ${context.lastConfiguration.randomSeed}`
                : ""}
              . Asignación auditada.
            </p>
          )}
          {groupLocked && !busy && (
            <p>
              Armado bloqueado: los grupos sólo pueden cambiar en borrador y sin
              Fechas vinculadas.
            </p>
          )}
          <div className="topbar-actions">
            <button
              className="button button--primary"
              disabled={groupLocked}
              aria-pressed={mode === "MANUAL"}
              onClick={() => setMode("MANUAL")}
            >
              Armar manualmente
            </button>
            <button
              className="button button--secondary"
              disabled={groupLocked}
              aria-pressed={mode === "AUTOMATIC"}
              onClick={() => setMode("AUTOMATIC")}
            >
              Sorteo automático
            </button>
          </div>
          <label className="field">
            Cantidad de grupos
            <input
              type="number"
              min="2"
              max={Math.min(26, eligible.length)}
              value={count}
              disabled={groupLocked}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 2 && n <= Math.min(26, eligible.length)) {
                  setCount(n);
                  setGroups(emptyGroups(n, eligible, champion));
                }
              }}
            />
          </label>
          <label className="field">
            Campeón vigente
            <select
              value={champion}
              disabled={groupLocked || context?.championKnown}
              onChange={(e) => {
                const id = e.target.value;
                setChampion(id);
                setGroups((gs) =>
                  gs.map((g, i) => ({
                    ...g,
                    userIds: g.userIds.map((v, j) =>
                      i === 0 && j === 0 ? id : v === id ? "" : v,
                    ),
                  })),
                );
              }}
            >
              <option value="">Sin campeón elegible registrado</option>
              {eligible.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          {!context?.championKnown && (
            <p>
              Sin campeón histórico registrado: podés indicar el vigente. La
              designación quedará auditada.
            </p>
          )}
          {mode === "MANUAL" ? (
            <div className="cup-grid">
              {groups.map((g, i) => (
                <fieldset key={g.code}>
                  <legend>{g.name}</legend>
                  <label className="field">
                    Plazas de {g.name}
                    <input
                      type="number"
                      min="1"
                      max={eligible.length}
                      value={g.userIds.length}
                      disabled={groupLocked}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (
                          Number.isInteger(n) &&
                          n >= 1 &&
                          n <= eligible.length
                        )
                          setGroups((gs) =>
                            gs.map((row, k) =>
                              k === i
                                ? {
                                    ...row,
                                    userIds: Array.from(
                                      { length: n },
                                      (_, j) => row.userIds[j] ?? "",
                                    ),
                                  }
                                : row,
                            ),
                          );
                      }}
                    />
                  </label>
                  {g.userIds.map((value, j) => (
                    <label className="field" key={j}>
                      {g.code}
                      {j + 1}
                      <select
                        aria-label={`Grupo ${g.code} posición ${j + 1}`}
                        value={value}
                        disabled={
                          groupLocked || (i === 0 && j === 0 && !!champion)
                        }
                        onChange={(e) =>
                          setGroups((gs) =>
                            gs.map((row, k) =>
                              k === i
                                ? {
                                    ...row,
                                    userIds: row.userIds.map((v, l) =>
                                      l === j ? e.target.value : v,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="">Elegir participante</option>
                        {eligible.map((p) => (
                          <option
                            key={p.userId}
                            value={p.userId}
                            disabled={
                              selected.includes(p.userId) && value !== p.userId
                            }
                          >
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          ) : (
            <p>
              Se sortearán {eligible.length} participantes en {count} grupos,
              usando el orden IFFHS y los bombos mostrados arriba.{" "}
              {champion
                ? `Cabeza A1: ${eligible.find((p) => p.userId === champion)?.fullName}.`
                : "Sin cabeza A1 designada."}
            </p>
          )}
          <label className="field">
            Motivo / referencia del sorteo externo
            <input
              value={reason}
              disabled={groupLocked}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="button button--primary"
            disabled={
              groupLocked ||
              !eligible.length ||
              (mode === "MANUAL" && selected.some((v) => !v))
            }
            onClick={() => void save()}
          >
            {mode === "MANUAL"
              ? "Guardar grupos manuales"
              : "Ejecutar sorteo de grupos"}
          </button>
          <h3>Tabla {table?.provisional ? "provisional" : "final"}</h3>
          <button
            className="button button--ghost"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Actualizar tablas
          </button>
          {table?.groups.map((g) => (
            <article key={g.code}>
              <h4>{g.name}</h4>
              <div
                className="cup-table-scroll"
                tabIndex={0}
                role="region"
                aria-label={`Tabla ${g.name}`}
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Pos",
                        "Participante",
                        "PTS",
                        "Plenos",
                        "Parciales",
                        "Errores",
                        "Extras",
                        "Destino",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((p) => (
                      <tr key={p.userId}>
                        <td>{p.position}</td>
                        <td>{p.fullName}</td>
                        <td>
                          <strong>{p.points}</strong>
                        </td>
                        <td>{p.fulls}</td>
                        <td>{p.partials}</td>
                        <td>{p.errors}</td>
                        <td>{p.extras}</td>
                        <td>
                          {{
                            QUARTERFINAL: "Cuartos",
                            ROUND_OF_16: "Octavos",
                            ELIMINATED: "Eliminado",
                          }[p.destination] ?? p.destination}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
          {!table?.groups.length && <p>Todavía no hay grupos guardados.</p>}
        </>
      )}
      {tab !== "summary" && tab !== "groups" && (
        <CupAbKnockout
          key={`${competition.id}-${tab}-${competition.stages.map((s) => s.id).join("-")}`}
          competition={competition}
          groupStage={stage}
          rounds={rounds}
          action={tab as "r16" | "quarterfinals" | "semifinals" | "final"}
          label={phases.find((p) => p.key === tab)!.label}
          disabled={locked}
        />
      )}
    </section>
  );
}
