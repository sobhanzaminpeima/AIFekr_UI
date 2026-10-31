"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import { Button } from "./ui";
import {
  LiveModuleFrame,
  LiveLoad,
  LiveTable,
  LiveForm,
  useLiveData,
  liveRequest,
  liveRows,
  field,
  type LiveRow,
} from "./live-module-kit";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  initializeGame,
  stepGame,
  type EngineState,
  type GameSlug,
  type PlayInput,
  type ReplayEvent,
} from "@/lib/play-engine";

const names: Record<string, [string, string]> = {
  tower: ["برج", "Tower"],
  snake: ["مار", "Snake"],
  "2048": ["۲۰۴۸", "2048"],
  "speed-run": ["مسابقه سرعت", "Speed Run"],
  "fiko-fly": ["پرواز فیکو", "FIKO Fly"],
  brain: ["چالش ذهن", "Brain Challenge"],
};
export function LivePlay({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa } = useApp(),
    data = useLiveData("/api/play");
  const [game, setGame] = useState<GameSlug>("tower"),
    [tournament, setTournament] = useState<string | undefined>(),
    [period, setPeriod] = useState("all");
  const rankings = useLiveData(
      view.id === "rankings" ? "/api/play/leaderboard?period=" + period : null,
    ),
    competitions = useLiveData(
      view.id === "competitions" ? "/api/play/competitions" : null,
    );
  const [error, setError] = useState("");
  const profile = (data.data?.profile ?? {}) as LiveRow;
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...data} />
      <p className="inline-banner">
        {fa
          ? "بازی رایگان است و کردیت هوش مصنوعی مصرف نمی‌کند. امتیاز نهایی را سرور بررسی می‌کند."
          : "Games are free and use no AI credits. Final scores are verified by the server."}
      </p>
      {error && <p role="alert">{error}</p>}
      {data.data && view.id === "arcade" && (
        <>
          <div className="module-tabs">
            {liveRows(data.data.games).map((g) => (
              <Button
                key={String(g.slug)}
                disabled={g.status !== "ENABLED"}
                onClick={() => {
                  setGame(g.slug as GameSlug);
                  setTournament(undefined);
                }}
              >
                {names[String(g.slug)]?.[fa ? 0 : 1] ?? String(g.slug)}
              </Button>
            ))}
          </div>
          <Game
            key={game + (tournament ?? "")}
            game={game}
            tournamentId={tournament}
            enabled={liveRows(data.data.games).some(
              (g) => g.slug === game && g.status === "ENABLED",
            )}
            onSaved={data.reload}
          />
        </>
      )}
      {data.data && view.id === "profile" && (
        <section className="panel">
          <LiveTable
            items={[profile]}
            columns={[
              field("level", "سطح", "Level"),
              field("xp", "تجربه", "XP"),
              field("points", "امتیاز", "Points"),
              field("sessions", "بازی‌های ثبت‌شده", "Verified sessions"),
            ]}
          />
          <LiveForm
            title={fa ? "حریم خصوصی رتبه‌بندی" : "Leaderboard privacy"}
            url="/api/play/profile"
            initial={{ publicName: profile.publicName === true }}
            fields={[
              field(
                "publicName",
                "نمایش نام من در رتبه‌بندی",
                "Show my name in rankings",
                "checkbox",
                true,
              ),
            ]}
            onDone={data.reload}
          />
        </section>
      )}
      {view.id === "rankings" && (
        <section className="panel">
          <select
            aria-label={fa ? "بازه رتبه‌بندی" : "Ranking period"}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {["all", "weekly", "monthly"].map((v) => (
              <option key={v} value={v}>
                {v === "all"
                  ? fa
                    ? "همه زمان‌ها"
                    : "All time"
                  : v === "weekly"
                    ? fa
                      ? "هفتگی"
                      : "Weekly"
                    : fa
                      ? "ماهانه"
                      : "Monthly"}
              </option>
            ))}
          </select>
          <LiveLoad {...rankings} />
          {rankings.data && (
            <LiveTable
              items={liveRows(rankings.data.rankings)}
              columns={[
                field("rank", "رتبه", "Rank"),
                field("name", "بازیکن", "Player"),
                field("points", "امتیاز", "Points"),
                field("level", "سطح", "Level"),
              ]}
            />
          )}
        </section>
      )}
      {data.data && view.id === "history" && (
        <LiveTable
          items={liveRows(data.data.history).map((x) => ({
            ...x,
            gameName: names[String(x.gameSlug)]?.[fa ? 0 : 1] ?? x.gameSlug,
          }))}
          columns={[
            field("gameName", "بازی", "Game"),
            field("score", "امتیاز", "Score"),
            field("xp", "تجربه", "XP"),
            field("completedAt", "زمان ثبت", "Completed"),
          ]}
        />
      )}
      {data.data && view.id === "achievements" && (
        <LiveTable
          items={liveRows(data.data.achievements)}
          columns={[
            field("code", "دستاورد ثبت‌شده", "Earned achievement"),
            field("createdAt", "تاریخ", "Date"),
          ]}
        />
      )}
      {view.id === "competitions" && (
        <>
          <LiveLoad {...competitions} />
          {competitions.data && (
            <>
              <div className="tool-grid">
                {liveRows(competitions.data.tournaments).map((t) => (
                  <section className="panel" key={String(t.id)}>
                    <h3>{String(t.title)}</h3>
                    <p>{String(t.description ?? "")}</p>
                    <p>{String(t.rewardTitle ?? "")}</p>
                    <p>
                      {String(t.startsAt)} — {String(t.endsAt)}
                    </p>
                    <details>
                      <summary>
                        {fa ? "قوانین و شرایط" : "Rules & terms"}
                      </summary>
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {String(t.terms ?? "")}
                      </p>
                    </details>
                    <Button
                      disabled={
                        t.status !== "PUBLISHED" ||
                        Date.parse(String(t.startsAt)) > Date.now() ||
                        Date.parse(String(t.endsAt)) <= Date.now()
                      }
                      onClick={() => {
                        setGame(t.gameSlug as GameSlug);
                        setTournament(String(t.id));
                      }}
                    >
                      {fa ? "انتخاب مسابقه رایگان" : "Select free competition"}
                    </Button>
                  </section>
                ))}
              </div>
              {tournament && (
                <Game
                  key={tournament}
                  game={game}
                  tournamentId={tournament}
                  enabled
                  onSaved={() => {
                    data.reload();
                    competitions.reload();
                  }}
                />
              )}
              <h3>{fa ? "پاداش‌های من" : "My rewards"}</h3>
              <LiveTable
                items={liveRows(competitions.data.rewards)}
                columns={[
                  field("title", "پاداش", "Reward"),
                  field("status", "وضعیت", "Status"),
                  field("packageChoice", "پکیج انتخاب‌شده", "Package choice"),
                ]}
                actions={(r) =>
                  r.status === "APPROVED" &&
                  r.title === "MONTHLY_PACKAGE_CHOICE" &&
                  !r.packageChoice ? (
                    <LiveForm
                      title={fa ? "انتخاب پکیج پاداش" : "Choose reward package"}
                      url="/api/play/rewards"
                      fields={[
                        {
                          ...field("packageChoice", "پکیج", "Package"),
                          choices: ["BUSINESS", "FITNESS", "STUDENT"].map(
                            (value) => ({ value, label: value }),
                          ),
                        },
                      ]}
                      map={(b) => ({ choice: b.packageChoice, id: r.id })}
                      onDone={competitions.reload}
                    />
                  ) : null
                }
              />
            </>
          )}
        </>
      )}
    </LiveModuleFrame>
  );
}
function Game({
  game,
  tournamentId,
  enabled,
  onSaved,
}: {
  game: GameSlug;
  tournamentId?: string;
  enabled: boolean;
  onSaved: () => void;
}) {
  const { fa, locale } = useApp();
  const [state, setState] = useState<EngineState | null>(null),
    [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<LiveRow | null>(null),
    [brain, setBrain] = useState<LiveRow | null>(null);
  const current = useRef<EngineState | null>(null),
    input = useRef<PlayInput>("none"),
    events = useRef<ReplayEvent[]>([]),
    session = useRef(""),
    lock = useRef(false),
    board = useRef<SVGSVGElement>(null),
    touch = useRef<{ x: number; y: number } | null>(null);
  const finish = useCallback(async () => {
    if (lock.current || !session.current || !current.current?.frame) return;
    lock.current = true;
    setBusy(true);
    setRunning(false);
    setError("");
    try {
      const d = await liveRequest("/api/play/sessions", "POST", {
        action: "finish",
        id: session.current,
        frames: current.current.frame,
        events: events.current,
      });
      setResult(d.result as LiveRow);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [onSaved]);
  useEffect(() => {
    if (!running || paused) return;
    const timer = setInterval(() => {
      const prior = current.current;
      if (!prior || prior.over) return;
      const action = input.current;
      input.current = "none";
      if (action !== "none")
        events.current.push({ frame: prior.frame + 1, input: action });
      const next = stepGame(prior, action);
      current.current = next;
      setState(next);
      if (next.over) void finish();
    }, 50);
    return () => clearInterval(timer);
  }, [running, paused, finish]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (session.current && !result)
        await liveRequest("/api/play/sessions", "POST", {
          action: "abandon",
          id: session.current,
        });
      const d = await liveRequest("/api/play/sessions", "POST", {
        action: "start",
        game,
        language: locale,
        ...(tournamentId ? { tournamentId } : {}),
      });
      const s = d.session as LiveRow;
      session.current = String(s.id);
      events.current = [];
      input.current = "none";
      current.current = initializeGame(game, Number(s.seed), s.configuration);
      setState(current.current);
      setResult(null);
      setPaused(false);
      if (game === "brain") {
        setBrain(await liveRequest("/api/play/brain", "POST", { id: s.id }));
        setRunning(false);
      } else {
        setBrain(null);
        setRunning(true);
        board.current?.focus();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function answer(answer: number) {
    if (lock.current || !brain?.question) return;
    lock.current = true;
    setBusy(true);
    try {
      const d = await liveRequest("/api/play/brain", "POST", {
        id: session.current,
        index: (brain.question as LiveRow).index,
        answer,
      });
      setBrain(d);
      if (d.done) {
        setResult({ score: d.score, xp: d.xp });
        onSaved();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const question = brain?.question as LiveRow | undefined;
  return (
    <section className="panel live-game">
      <h2>{names[game][fa ? 0 : 1]}</h2>
      <p>
        {fa
          ? "با دکمه‌ها، کلیدهای جهت یا کشیدن روی زمین بازی حرکت کنید. برای برج و پرواز ضربه بزنید."
          : "Use buttons, arrow keys or swipe on the board. Tap for Tower and Fly."}
      </p>
      {error && <p role="alert">{error}</p>}
      {question ? (
        <div>
          <h3>{String(question.prompt)}</h3>
          {(question.options as string[]).map((v, i) => (
            <Button key={i} disabled={busy} onClick={() => void answer(i)}>
              {v}
            </Button>
          ))}
        </div>
      ) : (
        <svg
          ref={board}
          className="live-game-board"
          viewBox="0 0 400 400"
          role="application"
          aria-label={names[game][fa ? 0 : 1]}
          tabIndex={0}
          onKeyDown={(e) => {
            const m: Record<string, PlayInput> = {
              ArrowLeft: "left",
              ArrowRight: "right",
              ArrowUp: "up",
              ArrowDown: "down",
              " ": "tap",
            };
            if (running && !paused && m[e.key]) {
              e.preventDefault();
              input.current = m[e.key];
            }
          }}
          onPointerDown={(e) => {
            touch.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerUp={(e) => {
            if (!touch.current || !running || paused) return;
            const dx = e.clientX - touch.current.x,
              dy = e.clientY - touch.current.y;
            input.current =
              Math.max(Math.abs(dx), Math.abs(dy)) < 20
                ? "tap"
                : Math.abs(dx) > Math.abs(dy)
                  ? dx > 0
                    ? "right"
                    : "left"
                  : dy > 0
                    ? "down"
                    : "up";
            touch.current = null;
          }}
        >
          <rect width="400" height="400" rx="18" fill="var(--bg)" />
          {state &&
            game === "2048" &&
            state.board.map((n, i) => (
              <g key={i}>
                <rect
                  x={(i % 4) * 100 + 5}
                  y={Math.floor(i / 4) * 100 + 5}
                  width="90"
                  height="90"
                  rx="12"
                  fill={n ? "#c75b15" : "#30333a"}
                />
                <text
                  x={(i % 4) * 100 + 50}
                  y={Math.floor(i / 4) * 100 + 60}
                  textAnchor="middle"
                  fill="white"
                  fontSize="24"
                >
                  {n || ""}
                </text>
              </g>
            ))}
          {state && game === "snake" && (
            <>
              {state.snake.map((n, i) => (
                <rect
                  key={i}
                  x={(n % 20) * 20}
                  y={Math.floor(n / 20) * 20}
                  width="18"
                  height="18"
                  rx="4"
                  fill="#83c68a"
                />
              ))}
              <circle
                cx={(state.food % 20) * 20 + 9}
                cy={Math.floor(state.food / 20) * 20 + 9}
                r="8"
                fill="#ff813b"
              />
            </>
          )}
          {state && game === "tower" && (
            <>
              {state.layers.slice(-10).map((l, i) => (
                <rect
                  key={i}
                  x={l.x * 4}
                  width={l.width * 4}
                  y={372 - i * 28}
                  height="24"
                  rx="4"
                  fill="#b1a3e5"
                />
              ))}
              <rect
                x={state.x * 4}
                width={state.width * 4}
                y={372 - Math.min(state.layers.length, 10) * 28}
                height="24"
                fill="#ff813b"
              />
            </>
          )}
          {state && game === "speed-run" && (
            <>
              <path
                d="M133 0V400 M266 0V400"
                stroke="#888"
                strokeDasharray="18"
              />
              {state.obstacles.map((o, i) => (
                <rect
                  key={i}
                  x={o.x * 133 + 32}
                  y={o.y * 4}
                  width="65"
                  height="40"
                  rx="8"
                  fill="#cd6280"
                />
              ))}
              <rect
                x={state.lane * 133 + 32}
                y="320"
                width="65"
                height="60"
                rx="12"
                fill="#ff813b"
              />
            </>
          )}
          {state && game === "fiko-fly" && (
            <>
              <circle cx="80" cy={state.y * 4} r="14" fill="#ff813b" />
              {state.obstacles.map((o, i) => (
                <g key={i}>
                  <rect
                    x={o.x * 4}
                    y="0"
                    width="28"
                    height={Math.max(0, (o.y - 18) * 4)}
                    fill="#83c68a"
                  />
                  <rect
                    x={o.x * 4}
                    y={(o.y + 18) * 4}
                    width="28"
                    height={Math.max(0, (100 - o.y - 18) * 4)}
                    fill="#83c68a"
                  />
                </g>
              ))}
            </>
          )}
          {(!state || paused) && (
            <text
              x="200"
              y="200"
              textAnchor="middle"
              fill="white"
              fontSize="22"
            >
              {paused ? (fa ? "متوقف" : "Paused") : fa ? "آماده‌ای؟" : "Ready?"}
            </text>
          )}
        </svg>
      )}
      <p aria-live="polite">
        {fa ? "امتیاز فعلی: " : "Current score: "}
        {state?.score ?? 0}
      </p>
      <div className="domain-actions">
        {!running ? (
          <Button disabled={busy || !enabled} onClick={() => void start()}>
            {fa ? "شروع بازی" : "Start game"}
          </Button>
        ) : (
          <>
            <Button onClick={() => setPaused((v) => !v)}>
              {paused ? (fa ? "ادامه" : "Resume") : fa ? "توقف" : "Pause"}
            </Button>
            <Button disabled={busy} onClick={() => void finish()}>
              {fa ? "ثبت نتیجه" : "Save result"}
            </Button>
          </>
        )}
        {!running && !result && state?.frame && game !== "brain" ? (
          <Button disabled={busy} onClick={() => void finish()}>
            {fa ? "ارسال دوباره همان نتیجه" : "Retry same result"}
          </Button>
        ) : null}
      </div>
      {running && !paused && (
        <div className="domain-actions" dir="ltr">
          {(["left", "up", "down", "right", "tap"] as PlayInput[]).map(
            (v, i) => (
              <Button
                key={v}
                onClick={() => {
                  input.current = v;
                }}
                aria-label={v}
              >
                {["←", "↑", "↓", "→", "●"][i]}
              </Button>
            ),
          )}
        </div>
      )}
      {busy && (
        <p role="status">
          {fa ? "در حال بررسی سرور…" : "Checking with server…"}
        </p>
      )}
      {result && (
        <p role="status">
          {fa ? "نتیجه ثبت شد: " : "Result saved: "}
          {String(result.score)} · XP {String(result.xp)}
        </p>
      )}
    </section>
  );
}
