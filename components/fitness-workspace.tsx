"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Modal, download } from "./ui";
import { Plans } from "./account";
import { toast } from "sonner";
type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
};
type Program = { id: string; name: string; exercises: Exercise[] };
type Session = {
  id: string;
  date: string;
  program: string;
  sets: number;
  volume: number;
};
type Meal = {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
};
type Profile = {
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  target: number;
  limitations: string;
};
const samplePrograms: Program[] = [
  {
    id: "foundation",
    name: "تمرین پایه",
    exercises: [
      { id: "squat", name: "اسکوات", sets: 3, reps: 12, weight: 0 },
      { id: "pushup", name: "شنا", sets: 3, reps: 10, weight: 0 },
      { id: "row", name: "پارویی دمبل", sets: 3, reps: 12, weight: 5 },
    ],
  },
];
export function FitnessWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [profile, saveProfile] = useLocalState<Profile>(
    "aifekr-fit-profile-v2",
    {
      name: "",
      age: 25,
      height: 170,
      weight: 70,
      goal: "strength",
      target: 70,
      limitations: "",
    },
  );
  const [programs, savePrograms] = useLocalState<Program[]>(
    "aifekr-fit-programs-v2",
    samplePrograms,
  );
  const [sessions, saveSessions] = useLocalState<Session[]>(
    "aifekr-fit-sessions-v2",
    [],
  );
  const [meals, saveMeals] = useLocalState<Meal[]>("aifekr-fit-meals-v2", []);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [selected, setSelected] = useState("foundation");
  const [completed, setCompleted] = useState<string[]>([]);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const active = programs.find((p) => p.id === selected) || programs[0];
  const current = draft || profile;
  const totalSets = active?.exercises.reduce((s, e) => s + e.sets, 0) || 0;
  const currentMeals = meals.filter((m) => m.date === date);
  if (view === "profile")
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile(current);
          setDraft(null);
          toast.success(t("save"));
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "نام ورزشکار" : "Athlete name"}
            <input
              required
              value={current.name}
              onChange={(e) => setDraft({ ...current, name: e.target.value })}
            />
          </label>
          {(["age", "height", "weight", "target"] as const).map((key, i) => (
            <label key={key}>
              {
                (fa
                  ? ["سن", "قد (سانتی‌متر)", "وزن (کیلوگرم)", "وزن هدف"]
                  : ["Age", "Height (cm)", "Weight (kg)", "Target weight"])[i]
              }
              <input
                type="number"
                required
                min={key === "age" ? 1 : 20}
                max={key === "age" ? 120 : 400}
                step={key === "weight" || key === "target" ? "0.1" : 1}
                value={current[key]}
                onChange={(e) =>
                  setDraft({ ...current, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label>
            {fa ? "هدف" : "Goal"}
            <select
              value={current.goal}
              onChange={(e) => setDraft({ ...current, goal: e.target.value })}
            >
              {[
                ["strength", "قدرت", "Strength"],
                ["endurance", "استقامت", "Endurance"],
                ["mobility", "انعطاف", "Mobility"],
              ].map(([id, a, b]) => (
                <option key={id} value={id}>
                  {fa ? a : b}
                </option>
              ))}
            </select>
          </label>
          <label>
            {fa ? "محدودیت و یادداشت" : "Limitations and notes"}
            <textarea
              value={current.limitations}
              onChange={(e) =>
                setDraft({ ...current, limitations: e.target.value })
              }
            />
          </label>
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
    );
  if (view === "programs")
    return (
      <>
        <div className="domain-toolbar">
          <Button
            variant="primary"
            onClick={() =>
              setProgram({ id: crypto.randomUUID(), name: "", exercises: [] })
            }
          >
            {fa ? "برنامه تمرینی تازه" : "New workout program"}
          </Button>
        </div>
        <div className="tool-grid">
          {programs.map((p) => (
            <article className="panel" key={p.id}>
              <h3>{p.name}</h3>
              {p.exercises.map((e) => (
                <p key={e.id}>
                  {e.name} · {n(e.sets)} × {n(e.reps)}
                </p>
              ))}
              <Button onClick={() => setProgram(p)}>
                {fa ? "ویرایش تمرین‌ها" : "Edit exercises"}
              </Button>
            </article>
          ))}
        </div>
        {program && (
          <Modal
            title={fa ? "برنامه تمرین" : "Workout program"}
            onClose={() => setProgram(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!program.exercises.length) return;
                savePrograms(
                  programs.some((p) => p.id === program.id)
                    ? programs.map((p) => (p.id === program.id ? program : p))
                    : [...programs, program],
                );
                setProgram(null);
              }}
            >
              <label>
                {fa ? "نام برنامه" : "Program name"}
                <input
                  required
                  value={program.name}
                  onChange={(e) =>
                    setProgram({ ...program, name: e.target.value })
                  }
                />
              </label>
              {program.exercises.map((ex, i) => (
                <div className="domain-card" key={ex.id}>
                  <div className="domain-fields">
                    <label>
                      {fa ? "نام حرکت" : "Exercise name"}
                      <input
                        required
                        value={ex.name}
                        onChange={(e) =>
                          setProgram({
                            ...program,
                            exercises: program.exercises.map((x) =>
                              x.id === ex.id
                                ? { ...x, name: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    {(["sets", "reps", "weight"] as const).map((key, j) => (
                      <label key={key}>
                        {
                          (fa
                            ? ["ست", "تکرار", "وزن (کیلوگرم)"]
                            : ["Sets", "Reps", "Weight (kg)"])[j]
                        }
                        <input
                          type="number"
                          required
                          min={key === "weight" ? 0 : 1}
                          max={key === "weight" ? 500 : 100}
                          value={ex[key]}
                          onChange={(e) =>
                            setProgram({
                              ...program,
                              exercises: program.exercises.map((x) =>
                                x.id === ex.id
                                  ? { ...x, [key]: Number(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() =>
                      setProgram({
                        ...program,
                        exercises: program.exercises.filter(
                          (x) => x.id !== ex.id,
                        ),
                      })
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              ))}
              <div className="domain-actions">
                <Button
                  onClick={() =>
                    setProgram({
                      ...program,
                      exercises: [
                        ...program.exercises,
                        {
                          id: crypto.randomUUID(),
                          name: "",
                          sets: 3,
                          reps: 10,
                          weight: 0,
                        },
                      ],
                    })
                  }
                >
                  {fa ? "افزودن حرکت" : "Add exercise"}
                </Button>
                <Button
                  type="submit"
                  disabled={!program.exercises.length}
                  variant="primary"
                >
                  {t("save")}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </>
    );
  if (view === "gym")
    return (
      <section className="panel">
        <label>
          {fa ? "برنامه امروز" : "Today’s program"}
          <select
            value={active?.id || ""}
            onChange={(e) => {
              setSelected(e.target.value);
              setCompleted([]);
            }}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {!active ? (
          <Empty />
        ) : (
          active.exercises.map((ex) => (
            <article className="domain-card" key={ex.id}>
              <h3>{ex.name}</h3>
              <p>
                {n(ex.reps)} {fa ? "تکرار" : "reps"} · {n(ex.weight)} kg
              </p>
              <div className="chips">
                {Array.from({ length: ex.sets }, (_, i) => {
                  const id = ex.id + ":" + i;
                  return (
                    <button
                      key={id}
                      className={completed.includes(id) ? "selected" : ""}
                      onClick={() =>
                        setCompleted(
                          completed.includes(id)
                            ? completed.filter((x) => x !== id)
                            : [...completed, id],
                        )
                      }
                    >
                      {completed.includes(id) ? "✓ " : ""}
                      {fa ? "ست" : "Set"} {n(i + 1)}
                    </button>
                  );
                })}
              </div>
            </article>
          ))
        )}
        <progress
          className="fitness-progress"
          max={Math.max(totalSets, 1)}
          value={completed.length}
        />
        <p>
          {n(completed.length)} / {n(totalSets)}
        </p>
        <Button
          variant="primary"
          disabled={!completed.length || !active}
          onClick={() => {
            if (!active) return;
            saveSessions([
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                program: active.name,
                sets: completed.length,
                volume: active.exercises.reduce(
                  (s, ex) =>
                    s +
                    completed.filter((id) => id.startsWith(ex.id + ":"))
                      .length *
                      ex.reps *
                      ex.weight,
                  0,
                ),
              },
              ...sessions,
            ]);
            setCompleted([]);
            toast.success(fa ? "جلسه تمرین ذخیره شد" : "Workout session saved");
          }}
        >
          {fa ? "ثبت جلسه تمرین" : "Save workout session"}
        </Button>
      </section>
    );
  if (view === "nutrition")
    return (
      <section className="panel">
        <div className="domain-toolbar">
          <label>
            {fa ? "روز" : "Day"}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <Button
            variant="primary"
            onClick={() =>
              setMeal({
                id: crypto.randomUUID(),
                date,
                name: "",
                calories: 0,
                protein: 0,
              })
            }
          >
            {fa ? "ثبت وعده" : "Log meal"}
          </Button>
        </div>
        <div className="finance-summary">
          <strong>
            {n(currentMeals.reduce((s, m) => s + m.calories, 0))} kcal
          </strong>
          <span>
            {fa ? "پروتئین ثبت‌شده" : "Recorded protein"}:{" "}
            {n(currentMeals.reduce((s, m) => s + m.protein, 0))} g
          </span>
        </div>
        {currentMeals.map((m) => (
          <article className="domain-card row-between" key={m.id}>
            <div>
              <h3>{m.name}</h3>
              <p>
                {n(m.calories)} kcal · {n(m.protein)} g
              </p>
            </div>
            <Button
              onClick={() => saveMeals(meals.filter((x) => x.id !== m.id))}
            >
              {t("delete")}
            </Button>
          </article>
        ))}
        {meal && (
          <Modal
            title={fa ? "ثبت غذای مصرف‌شده" : "Log food"}
            onClose={() => setMeal(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMeals([...meals, meal]);
                setMeal(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "نام وعده" : "Meal name"}
                  <input
                    required
                    value={meal.name}
                    onChange={(e) => setMeal({ ...meal, name: e.target.value })}
                  />
                </label>
                <label>
                  {fa ? "انرژی (کیلوکالری)" : "Energy (kcal)"}
                  <input
                    required
                    type="number"
                    min={0}
                    value={meal.calories}
                    onChange={(e) =>
                      setMeal({ ...meal, calories: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  {fa ? "پروتئین (گرم)" : "Protein (g)"}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={meal.protein}
                    onChange={(e) =>
                      setMeal({ ...meal, protein: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  if (view === "plans") return <Plans />;
  if (view === "athlete-card")
    return (
      <section className="panel athlete-pass">
        <span className="eyebrow">AIFekr FIT</span>
        <h1>{profile.name || (fa ? "ورزشکار ای آی فکر" : "AIFekr athlete")}</h1>
        <p>
          {fa ? "تمرین‌های ثبت‌شده" : "Recorded sessions"}: {n(sessions.length)}
        </p>
        <p>
          {n(profile.height)} cm · {n(profile.weight)} kg
        </p>
        <Button
          onClick={() =>
            download(
              "athlete-card.json",
              JSON.stringify({ profile, sessions: sessions.length }, null, 2),
              "application/json",
            )
          }
        >
          {t("download")}
        </Button>
      </section>
    );
  return (
    <>
      <div className="stats-grid">
        {[
          [fa ? "جلسات تمرین" : "Workout sessions", sessions.length],
          [
            fa ? "ست‌های ثبت‌شده" : "Completed sets",
            sessions.reduce((s, x) => s + x.sets, 0),
          ],
          [
            fa ? "حجم وزنه (کیلوگرم)" : "Weight volume (kg)",
            sessions.reduce((s, x) => s + x.volume, 0),
          ],
          [fa ? "وعده‌های ثبت‌شده" : "Meals logged", meals.length],
        ].map(([label, count]) => (
          <div className="panel stat" key={String(label)}>
            <span>{label}</span>
            <strong>{n(Number(count))}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>{fa ? "تاریخچه تمرین" : "Workout history"}</h3>
        {!sessions.length ? (
          <Empty />
        ) : (
          sessions.map((s) => (
            <article className="domain-card" key={s.id}>
              <div className="row-between">
                <h3>{s.program}</h3>
                <time>{s.date.slice(0, 16).replace("T", " ")}</time>
              </div>
              <p>
                {n(s.sets)} {fa ? "ست" : "sets"} · {n(s.volume)} kg
              </p>
            </article>
          ))
        )}
        <Button
          onClick={() =>
            download(
              "fitness-progress.json",
              JSON.stringify({ profile, sessions, meals }, null, 2),
              "application/json",
            )
          }
        >
          {fa ? "خروجی گزارش پیشرفت" : "Export progress report"}
        </Button>
      </section>
    </>
  );
}
