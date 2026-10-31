"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import Link from "./site-link";
import { Button } from "./ui";
import { LiveUpload } from "./live-upload";
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
  type LiveField,
} from "./live-module-kit";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
const API = "/api/fitness",
  enc = encodeURIComponent;
const parse = (v: unknown): LiveRow[] => {
  try {
    return liveRows(typeof v === "string" ? JSON.parse(v) : v);
  } catch {
    return [];
  }
};
const choice = (
  key: string,
  fa: string,
  en: string,
  values: string[],
): LiveField => ({
  ...field(key, fa, en),
  choices: values.map((value) => ({ value, label: value })),
});
export function LiveFitness({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa, locale } = useApp(),
    r = useLiveData(API),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState("");
  const profile = (r.data?.profile ?? {}) as LiveRow,
    programs = liveRows(r.data?.programs),
    trainers = liveRows(r.data?.trainers),
    [selected, setSelected] = useState<LiveRow | null>(null);
  const requestId = useRef("");
  useEffect(() => {
    requestId.current = crypto.randomUUID();
  }, []);
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...r} />
      {error && <p role="alert">{error}</p>}
      {r.data && (
        <>
          <p className="inline-banner">
            {r.data.active
              ? fa
                ? "عضویت ورزشی فعال است."
                : "Fitness membership is active."
              : fa
                ? "برای ثبت تمرین و استفاده از مربی، عضویت فیتنس لازم است."
                : "Fitness membership is required to log workouts and use the coach."}
          </p>
          {view.id === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  [
                    fa ? "جلسات ثبت‌شده" : "Recorded sessions",
                    liveRows(r.data.sessions).filter(
                      (s) => s.status === "COMPLETED",
                    ).length,
                  ],
                  [
                    fa ? "برنامه‌های من" : "My programs",
                    programs.filter((p) => p.ownerUserId === r.data?.userId)
                      .length,
                  ],
                  [
                    fa ? "مربی انتخاب‌شده" : "Selected coach",
                    trainers.find((t) => t.id === profile.selectedCoachId)
                      ?.name ?? "—",
                  ],
                ].map(([label, n]) => (
                  <section key={String(label)} className="panel stat">
                    <span>{String(label)}</span>
                    <strong>{String(n)}</strong>
                  </section>
                ))}
              </div>
              <div className="domain-actions">
                <Link className="btn primary" href="/fitness?tab=gym">
                  {fa ? "شروع تمرین امروز" : "Start today’s workout"}
                </Link>
                <Link className="btn" href="/fitness?tab=profile">
                  {fa ? "تکمیل مشخصات" : "Complete profile"}
                </Link>
                <Link className="btn" href="/fitness?tab=reports">
                  {fa ? "بررسی پیشرفت" : "Review progress"}
                </Link>
              </div>
              <FitnessReports />
            </>
          )}
          {view.id === "profile" && (
            <section className="panel">
              <LiveForm
                title={fa ? "ذخیره پروفایل ورزشی" : "Save fitness profile"}
                url={API}
                initial={{
                  ...profile,
                  age: profile.age ?? 18,
                  daysPerWeek: profile.daysPerWeek ?? 3,
                  sessionMinutes: profile.sessionMinutes ?? 45,
                  trainingLocation: profile.trainingLocation ?? "GYM",
                  level: profile.level ?? "BEGINNER",
                  equipment:
                    typeof profile.equipment === "string"
                      ? JSON.parse(profile.equipment).join("\n")
                      : "",
                  limitations: profile.limitations ?? "",
                  dietaryPreferences: profile.dietaryPreferences ?? "",
                  allergens: profile.allergens ?? "",
                  consent: false,
                }}
                fields={[
                  field("age", "سن (۱۸ تا ۱۰۰)", "Age (18–100)", "number"),
                  field(
                    "heightCm",
                    "قد به سانتی‌متر",
                    "Height (cm)",
                    "number",
                    true,
                  ),
                  field(
                    "weightKg",
                    "وزن به کیلوگرم",
                    "Weight (kg)",
                    "number",
                    true,
                  ),
                  field(
                    "targetWeightKg",
                    "وزن هدف به کیلوگرم",
                    "Target weight (kg)",
                    "number",
                    true,
                  ),
                  field("goal", "هدف تمرین", "Training goal", "textarea"),
                  choice("level", "سطح تجربه", "Experience", [
                    "BEGINNER",
                    "INTERMEDIATE",
                    "ADVANCED",
                  ]),
                  field(
                    "daysPerWeek",
                    "روز در هفته (۱ تا ۶)",
                    "Days per week (1–6)",
                    "number",
                  ),
                  field(
                    "sessionMinutes",
                    "مدت جلسه (۱۵ تا ۹۰ دقیقه)",
                    "Session minutes (15–90)",
                    "number",
                  ),
                  choice("trainingLocation", "محل تمرین", "Location", [
                    "GYM",
                    "HOME",
                  ]),
                  field(
                    "equipment",
                    "تجهیزات (هر خط یکی)",
                    "Equipment (one per line)",
                    "textarea",
                    true,
                  ),
                  field(
                    "limitations",
                    "محدودیت‌ها و آسیب‌های اعلام‌شده",
                    "Declared limitations or injuries",
                    "textarea",
                    true,
                  ),
                  field(
                    "dietaryPreferences",
                    "ترجیح غذایی",
                    "Dietary preferences",
                    "textarea",
                    true,
                  ),
                  field("allergens", "آلرژی‌ها", "Allergens", "textarea", true),
                  field(
                    "consent",
                    "موافقم از این اطلاعات برای راهنمایی ورزشی استفاده شود",
                    "I consent to use of this information for fitness guidance",
                    "checkbox",
                  ),
                ]}
                map={(b) => {
                  const x = {
                    ...b,
                    action: "profile",
                    equipment: String(b.equipment ?? "")
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean),
                    limitations: b.limitations ?? "",
                    dietaryPreferences: b.dietaryPreferences ?? "",
                    allergens: b.allergens ?? "",
                  };
                  for (const k of ["heightCm", "weightKg", "targetWeightKg"])
                    if (x[k as keyof typeof x] == null)
                      delete x[k as keyof typeof x];
                  return x;
                }}
                onDone={r.reload}
              />
              <Link className="btn" href="/settings">
                {fa ? "نام و عکس حساب" : "Account name & photo"}
              </Link>
            </section>
          )}
          {view.id === "programs" && (
            <>
              <section className="panel">
                <LiveForm
                  title={
                    fa
                      ? "ساخت برنامه اختصاصی با AI — ۵ کردیت"
                      : "Generate personal AI program — 5 credits"
                  }
                  url={API + "/generate"}
                  caution={
                    fa
                      ? "با تأیید، ۵ کردیت رزرو می‌شود؛ تولید ناموفق طبق پاسخ سرور بازپرداخت می‌شود. مشخصات ورزشی را ابتدا کامل کنید."
                      : "Confirm to reserve 5 credits. Failed generation is refunded by the server. Complete your fitness profile first."
                  }
                  map={() => ({
                    requestId: requestId.current,
                    language: locale,
                  })}
                  onDone={() => {
                    requestId.current = crypto.randomUUID();
                    r.reload();
                  }}
                />
              </section>
              {[false, true].map((own) => (
                <section key={String(own)}>
                  <h2>
                    {own
                      ? fa
                        ? "برنامه‌های اختصاصی AI من"
                        : "My personal AI programs"
                      : fa
                        ? "کتابخانه برنامه‌ها"
                        : "Program library"}
                  </h2>
                  <div className="tool-grid">
                    {programs
                      .filter((p) => Boolean(p.ownerUserId) === own)
                      .map((p) => (
                        <section key={String(p.id)} className="panel">
                          <h3>{String(p.title)}</h3>
                          <p>{String(p.description)}</p>
                          <p>
                            {String(p.level)} · {String(p.minutes)}{" "}
                            {fa ? "دقیقه" : "min"}
                          </p>
                          <LiveForm
                            title={
                              fa ? "انتخاب برنامه من" : "Choose my program"
                            }
                            url={API}
                            map={() => ({
                              action: "preferences",
                              programId: p.id,
                            })}
                            onDone={r.reload}
                          />
                          <Button onClick={() => setSelected(p)}>
                            {fa ? "نمایش تمرین‌ها" : "View exercises"}
                          </Button>
                        </section>
                      ))}
                  </div>
                </section>
              ))}
              {selected && (
                <section className="panel">
                  <h3>{String(selected.title)}</h3>
                  <LiveTable
                    items={parse(selected.content).map((e) => ({
                      ...e,
                      name:
                        liveRows(r.data?.exercises).find(
                          (x) => x.id === e.exerciseId,
                        )?.name ?? e.exerciseId,
                    }))}
                    columns={[
                      field("name", "حرکت", "Exercise"),
                      field("sets", "ست", "Sets"),
                      field("reps", "تکرار", "Reps"),
                      field("rest", "استراحت (ثانیه)", "Rest (seconds)"),
                    ]}
                  />
                </section>
              )}
            </>
          )}
          {view.id === "trainers" && (
            <>
              <div className="tool-grid">
                {trainers.map((t) => (
                  <section className="panel" key={String(t.id)}>
                    {t.image != null && (
                      <img
                        src={String(t.image)}
                        alt=""
                        style={{
                          width: "100%",
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 16,
                        }}
                      />
                    )}
                    <h3>{String(t.name)}</h3>
                    <p>{String(t.biography)}</p>
                    <p>
                      {t.type === "AI"
                        ? fa
                          ? "مربی هوش مصنوعی"
                          : "AI coach"
                        : t.status === "DEMO"
                          ? fa
                            ? "نمایشی؛ قابل رزرو نیست"
                            : "Demo; not bookable"
                          : fa
                            ? "مربی انسانی"
                            : "Human coach"}
                    </p>
                    {t.type === "AI" && t.status === "ACTIVE" ? (
                      <LiveForm
                        title={
                          fa ? "انتخاب به‌عنوان مربی من" : "Choose as my coach"
                        }
                        url={API}
                        map={() => ({ action: "preferences", coachId: t.id })}
                        onDone={r.reload}
                      />
                    ) : (
                      <Link className="btn" href="/fitness/marketplace">
                        {fa ? "بازار مربیان" : "Coach marketplace"}
                      </Link>
                    )}
                  </section>
                ))}
              </div>
              {profile.selectedCoachId && (
                <section className="panel">
                  <LiveForm
                    title={
                      fa
                        ? "پرسش از مربی انتخاب‌شده — حداکثر ۵ کردیت"
                        : "Ask selected coach — up to 5 credits"
                    }
                    url={API + "/coach"}
                    fields={[field("message", "پرسش", "Question", "textarea")]}
                    caution={
                      fa
                        ? "از کردیت شخصی شما کسر می‌شود. پاسخ راهنمای عمومی است."
                        : "Uses personal credits. Responses provide general fitness guidance."
                    }
                    map={(b) => ({
                      ...b,
                      trainerId: profile.selectedCoachId,
                      language: locale,
                    })}
                    onDone={(d) => setAnswer(String(d.answer ?? ""))}
                  />
                  {answer && <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>}
                </section>
              )}
            </>
          )}
          {view.id === "gym" && <Gym data={r.data} reload={r.reload} />}
          {view.id === "nutrition" && (
            <section className="panel">
              <LiveForm
                title={fa ? "ثبت تغذیه و یادداشت" : "Add diary entry"}
                url={API}
                fields={[
                  choice("kind", "نوع", "Type", [
                    "MEAL",
                    "HYDRATION",
                    "RECOVERY",
                    "NOTE",
                  ]),
                  field("content", "یادداشت", "Entry", "textarea"),
                ]}
                map={(b) => ({
                  ...b,
                  action: "diary",
                  day: new Date().toISOString(),
                })}
                onDone={r.reload}
              />
              <LiveTable
                items={liveRows(r.data.diary)}
                columns={[
                  field("day", "روز", "Day"),
                  field("kind", "نوع", "Type"),
                  field("content", "یادداشت", "Entry"),
                ]}
              />
            </section>
          )}
          {view.id === "history" && (
            <LiveTable
              items={liveRows(r.data.sessions).map((s) => ({
                ...s,
                title: (s.program as LiveRow)?.title,
              }))}
              columns={[
                field("title", "برنامه", "Program"),
                field("startedAt", "شروع", "Started"),
                field("completedAt", "پایان", "Completed"),
                field("status", "وضعیت", "Status"),
              ]}
            />
          )}
          {view.id === "reports" && <FitnessReports />}
          {view.id === "plans" && (
            <section className="panel">
              <p>
                {fa
                  ? "قیمت و روش پرداخت از پکیج‌های مدیر خوانده می‌شود."
                  : "Prices and payment options use the administrator’s current packages."}
              </p>
              <Link className="btn primary" href="/fit#pricing">
                {fa ? "مشاهده عضویت و پرداخت" : "View membership & payment"}
              </Link>
              <Link className="btn" href="/fitness/credits">
                {fa ? "اعتبار و مصرف من" : "My credits & usage"}
              </Link>
            </section>
          )}
          {view.id === "athlete-card" && <AthleteCard data={r.data} />}
        </>
      )}
    </LiveModuleFrame>
  );
}
function FitnessReports() {
  const { fa } = useApp(),
    [period, setPeriod] = useState("week"),
    r = useLiveData(API + "/reports?period=" + period);
  const keys = [
    field("sessions", "جلسات", "Sessions"),
    field("sets", "ست‌ها", "Sets"),
    field("repetitions", "تکرارها", "Repetitions"),
    field("volumeKg", "حجم وزنه (کیلوگرم×تکرار)", "Load volume (kg × reps)"),
    field("averageRpe", "میانگین فشار", "Average RPE"),
  ];
  return (
    <section className="panel">
      <select
        aria-label={fa ? "بازه گزارش" : "Report period"}
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
      >
        <option value="week">{fa ? "هفتگی" : "Weekly"}</option>
        <option value="month">{fa ? "ماهانه" : "Monthly"}</option>
      </select>
      <LiveLoad {...r} />
      {r.data && (
        <>
          <h3>{fa ? "بازه فعلی و قبلی" : "Current & previous period"}</h3>
          <LiveTable
            items={[
              {
                ...(r.data.summary as LiveRow),
                period: fa ? "فعلی" : "Current",
              },
              {
                ...(r.data.previous as LiveRow),
                period: fa ? "قبلی" : "Previous",
              },
            ]}
            columns={[field("period", "بازه", "Period"), ...keys]}
          />
          <h3>{fa ? "پیشرفت به تفکیک برنامه" : "Progress by program"}</h3>
          <LiveTable
            items={liveRows(r.data.programs)}
            columns={[field("title", "برنامه", "Program"), ...keys]}
          />
        </>
      )}
    </section>
  );
}
function Gym({ data, reload }: { data: LiveRow; reload: () => void }) {
  const { fa } = useApp(),
    profile = data.profile as LiveRow | null,
    [program, setProgram] = useState(String(profile?.preferredProgramId ?? "")),
    [session, setSession] = useState<LiveRow | null>(null),
    [sets, setSets] = useState<LiveRow[]>([]),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [busy, setBusy] = useState(false),
    [rest, setRest] = useState(0),
    [paused, setPaused] = useState(false);
  const lock = useRef(false),
    clientKey = useRef("");
  useEffect(() => {
    clientKey.current = crypto.randomUUID();
  }, []);
  useEffect(() => {
    if (paused || rest <= 0) return;
    const end = Date.now() + rest * 1000,
      id = setInterval(
        () => setRest(Math.max(0, Math.ceil((end - Date.now()) / 1000))),
        1000,
      );
    return () => clearInterval(id);
  }, [paused, rest]);
  const programs = liveRows(data.programs),
    existing = liveRows(data.sessions).filter((s) => s.status !== "COMPLETED");
  function resume(s: LiveRow) {
    setSession(s);
    setSets(liveRows(s.sets));
    setSaved("");
  }
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await liveRequest(API, "POST", {
        action: "start",
        programId: program,
        clientKey: clientKey.current,
        recovery: 3,
      });
      setSession(d.session as LiveRow);
      setSets([]);
      clientKey.current = crypto.randomUUID();
      setSaved("");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(complete: boolean) {
    if (lock.current || !session) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const canonical = sets.map((s) => ({
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        repetitions: s.repetitions,
        weightGrams: s.weightGrams,
        completed: s.completed,
        ...(s.rpe != null ? { rpe: s.rpe } : {}),
        ...(s.rir != null ? { rir: s.rir } : {}),
      }));
      const d = await liveRequest(API, "POST", {
        action: "sync",
        id: session.id,
        revision: session.revision,
        sets: canonical,
        complete,
      });
      setSession(d.session as LiveRow);
      setSaved(
        complete
          ? fa
            ? "تمرین تکمیل و در گزارش ثبت شد."
            : "Workout completed and included in reports."
          : fa
            ? "ست‌ها روی سرور ذخیره شدند."
            : "Sets saved to server.",
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const workout = parse(session?.programSnapshot);
  return (
    <section className="panel">
      <h2>{fa ? "تمرین امروز" : "Today’s workout"}</h2>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{saved}</p>}
      {!session ? (
        <>
          <label>
            {fa ? "برنامه تمرین" : "Workout program"}
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="">{fa ? "انتخاب کنید" : "Choose"}</option>
              {programs.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.title)}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!program || !data.active || busy}
            onClick={() => void start()}
          >
            {fa ? "شروع تمرین" : "Start workout"}
          </Button>
          {existing.map((s) => (
            <Button key={String(s.id)} onClick={() => resume(s)}>
              {fa ? "ادامه تمرین ذخیره‌شده" : "Resume saved workout"} ·{" "}
              {String(s.startedAt)}
            </Button>
          ))}
        </>
      ) : (
        <>
          <p>
            {fa
              ? "وزنه به کیلوگرم است. تیک ست فقط وضعیت محلی را عوض می‌کند؛ برای ثبت روی سرور «ذخیره» را بزنید."
              : "Weights are in kilograms. Checking a set changes the local log; press Save to persist it."}
          </p>
          {workout.map((ex) => {
            const exercise = liveRows(data.exercises).find(
              (x) => x.id === ex.exerciseId,
            );
            return (
              <section className="panel" key={String(ex.exerciseId)}>
                <h3>{String(exercise?.name ?? ex.exerciseId)}</h3>
                {exercise?.imageUrl != null && (
                  <img
                    src={String(exercise.imageUrl)}
                    alt=""
                    style={{ maxWidth: 220 }}
                  />
                )}
                {Array.from({ length: Number(ex.sets) }, (_, i) => {
                  const old = sets.find(
                    (s) =>
                      s.exerciseId === ex.exerciseId && s.setNumber === i + 1,
                  ) ?? {
                    exerciseId: ex.exerciseId,
                    setNumber: i + 1,
                    repetitions: Number(ex.reps),
                    weightGrams: 0,
                    completed: false,
                  };
                  const update = (patch: LiveRow) =>
                    setSets((prev) => [
                      ...prev.filter(
                        (s) =>
                          !(
                            s.exerciseId === ex.exerciseId &&
                            s.setNumber === i + 1
                          ),
                      ),
                      { ...old, ...patch },
                    ]);
                  return (
                    <div className="form-grid" key={i}>
                      <span>
                        {fa ? "ست " : "Set "}
                        {i + 1}
                      </span>
                      <label>
                        {fa ? "تکرار" : "Reps"}
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={busy || session.status === "COMPLETED"}
                          value={Number(old.repetitions)}
                          onChange={(e) =>
                            update({ repetitions: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        {fa ? "وزنه (kg)" : "Weight (kg)"}
                        <input
                          type="number"
                          min={0}
                          max={500}
                          step="0.25"
                          disabled={busy || session.status === "COMPLETED"}
                          value={Number(old.weightGrams) / 1000}
                          onChange={(e) =>
                            update({
                              weightGrams: Math.round(
                                Number(e.target.value) * 1000,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          disabled={busy || session.status === "COMPLETED"}
                          checked={old.completed === true}
                          onChange={(e) => {
                            update({ completed: e.target.checked });
                            if (e.target.checked) {
                              setRest(Number(ex.rest));
                              setPaused(false);
                            }
                          }}
                        />
                        {fa ? "ست انجام شد" : "Set complete"}
                      </label>
                    </div>
                  );
                })}
              </section>
            );
          })}
          <p role="timer">
            {fa ? "استراحت: " : "Rest: "}
            {rest}s
          </p>
          <div className="domain-actions">
            <Button onClick={() => setPaused((v) => !v)}>
              {paused
                ? fa
                  ? "ادامه تایمر"
                  : "Resume timer"
                : fa
                  ? "توقف تایمر"
                  : "Pause timer"}
            </Button>
            <Button onClick={() => setRest(0)}>
              {fa ? "پایان استراحت" : "End rest"}
            </Button>
            <Button
              disabled={busy || session.status === "COMPLETED"}
              onClick={() => void save(false)}
            >
              {fa ? "ذخیره ست‌ها" : "Save sets"}
            </Button>
            <Button
              disabled={busy || session.status === "COMPLETED"}
              onClick={() => void save(true)}
            >
              {fa
                ? "پایان تمرین و ثبت گزارش"
                : "Finish workout & update report"}
            </Button>
            <Button
              onClick={() => {
                setSession(null);
                setRest(0);
              }}
            >
              {fa ? "بازگشت به انتخاب تمرین" : "Back to workouts"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
function AthleteCard({ data }: { data: LiveRow }) {
  const { fa } = useApp(),
    r = useLiveData("/api/referral/me"),
    [qr, setQr] = useState(""),
    [card, setCard] = useState(""),
    [error, setError] = useState("");
  const code = r.data?.referralCode,
    link = code
      ? `${location.origin}/register?${new URLSearchParams({ ref: String(code), accountType: "FITNESS", plan: "FIT_MONTHLY" })}`
      : "";
  useEffect(() => {
    if (code) setQr("/api/referral/me?qr=1&code=" + enc(String(code)));
  }, [code]);
  useEffect(() => {
    let active = true;
    if (!qr) return;
    void (async () => {
      await document.fonts.ready;
      const c = document.createElement("canvas");
      c.width = 1080;
      c.height = 1350;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, 1080, 1350);
      g.addColorStop(0, "#223956");
      g.addColorStop(0.55, "#11121b");
      g.addColorStop(1, "#b04c16");
      x.fillStyle = g;
      x.fillRect(0, 0, 1080, 1350);
      x.strokeStyle = "#ffffff18";
      for (let i = 0; i < 8; i++) {
        x.beginPath();
        x.arc(1080, 0, 200 + i * 150, 0, Math.PI * 2);
        x.stroke();
      }
      x.fillStyle = "#ff813b";
      x.fillRect(0, 0, 1080, 20);
      x.textAlign = "center";
      x.font = "700 52px Vazirmatn";
      x.fillText(fa ? "فیتنس آی‌فکر" : "AIFekr FIT", 540, 120);
      x.fillStyle = "#fff";
      x.fillText(fa ? "کارت ورزشکار" : "ATHLETE CARD", 540, 220);
      x.font = "700 44px Vazirmatn";
      x.fillText(String(data.name ?? "AIFekr").slice(0, 35), 540, 550);
      if (data.avatar) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = String(data.avatar);
        try {
          await img.decode();
          x.save();
          x.beginPath();
          x.arc(540, 370, 100, 0, Math.PI * 2);
          x.clip();
          x.drawImage(img, 440, 270, 200, 200);
          x.restore();
        } catch {}
      }
      x.font = "400 28px Vazirmatn";
      x.fillStyle = "#b9c7d9";
      x.fillText(
        data.active
          ? fa
            ? "عضویت ورزشی فعال"
            : "Active fitness membership"
          : fa
            ? "جامعه ورزشکاران"
            : "Fitness community",
        540,
        630,
      );
      const image = new Image();
      image.src = qr;
      await image.decode();
      x.drawImage(image, 370, 720, 340, 340);
      x.fillStyle = "#fff";
      x.fillText(
        fa ? "با من شروع کن؛ کد را اسکن کن" : "Train with me. Scan to join.",
        540,
        1150,
      );
      x.fillStyle = "#ff813b";
      x.fillText(String(code), 540, 1220);
      if (active) setCard(c.toDataURL("image/png"));
    })().catch(() => setError("CARD_EXPORT_FAILED"));
    return () => {
      active = false;
    };
  }, [qr, code, data.name, data.avatar, data.active, fa]);
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {error && <p role="alert">{error}</p>}
      {card && (
        <img
          src={card}
          alt={fa ? "کارت ورزشکار من" : "My athlete card"}
          style={{
            display: "block",
            maxWidth: "100%",
            width: 320,
            borderRadius: 24,
            margin: "20px auto",
          }}
        />
      )}
      <div className="domain-actions">
        {card && (
          <a
            className="btn primary"
            href={card}
            download="AIFekr-athlete-card.png"
          >
            {fa ? "دانلود کارت" : "Download card"}
          </a>
        )}
        <Link className="btn" href="/settings">
          {fa ? "ویرایش نام و عکس" : "Edit name & photo"}
        </Link>
        <Link className="btn" href="/referral">
          {fa ? "دعوت‌ها و کمیسیون من" : "My invitations & commission"}
        </Link>
      </div>
      <p>
        <bdi>{link}</bdi>
      </p>
      <p>
        {fa
          ? "کد کارت همان کد رسمی دعوت حساب شماست."
          : "Your card uses your account’s official referral code."}
      </p>
    </section>
  );
}
