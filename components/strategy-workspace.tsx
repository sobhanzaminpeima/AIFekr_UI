"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Task = {
  id: string;
  title: string;
  owner: string;
  due: string;
  priority: string;
  status: string;
};
type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
};
type Proposal = {
  id: string;
  title: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
};
type Note = { id: string; title: string; body: string; date: string };
type Agent = {
  id: string;
  name: string;
  role: string;
  industry: string;
  instructions: string;
  enabled: boolean;
};
type Run = {
  id: string;
  agentId: string;
  brief: string;
  date: string;
  step: number;
  status: "queued" | "running" | "completed" | "cancelled";
};
type Meeting = {
  id: string;
  topic: string;
  context: string;
  roles: string[];
  notes: string;
  actions: string;
  date: string;
};
const roles = [
  ["strategy", "راهبرد", "Strategy", "BrainCircuit"],
  ["marketing", "بازاریابی", "Marketing", "Megaphone"],
  ["finance", "مالی", "Finance", "Receipt"],
  ["operations", "عملیات", "Operations", "ListChecks"],
];
const agentsSeed: Agent[] = roles.map(([id, a, b]) => ({
  id,
  name: a,
  role: id,
  industry: "general",
  instructions: "",
  enabled: true,
}));
export function StrategyWorkspace({
  module,
  view,
}: {
  module: string;
  view: string;
}) {
  const { fa, t, n } = useApp();
  const [tasks, saveTasks] = useLocalState<Task[]>("aifekr-strategy-tasks", []);
  const [goals, saveGoals] = useLocalState<Goal[]>("aifekr-strategy-goals", []);
  const [proposals, saveProposals] = useLocalState<Proposal[]>(
    "aifekr-strategy-proposals",
    [],
  );
  const [notes, saveNotes] = useLocalState<Note[]>(
    "aifekr-strategy-notes:" + view,
    [],
  );
  const [agents, saveAgents] = useLocalState<Agent[]>(
    "aifekr-strategy-agents",
    agentsSeed,
  );
  const [runs, saveRuns] = useLocalState<Run[]>("aifekr-strategy-runs", []);
  const [meetings, saveMeetings] = useLocalState<Meeting[]>(
    "aifekr-strategy-meetings",
    [],
  );
  const [task, setTask] = useState<Task | null>(null),
    [goal, setGoal] = useState<Goal | null>(null),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [note, setNote] = useState<Note | null>(null),
    [agent, setAgent] = useState<Agent>({
      id: "",
      name: "",
      role: "strategy",
      industry: "general",
      instructions: "",
      enabled: true,
    });
  const [industry, setIndustry] = useState("all");
  const [runAgent, setRunAgent] = useState<Agent | null>(null);
  const [brief, setBrief] = useState("");
  const [topic, setTopic] = useState(""),
    [context, setContext] = useState(""),
    [participants, setParticipants] = useState(["strategy", "finance"]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  if (module === "meeting") {
    if (view === "history")
      return (
        <section className="panel">
          <h2>
            {fa ? "پرونده جلسات و تصمیم‌ها" : "Meeting records & decisions"}
          </h2>
          {meetings.length ? (
            meetings.map((m) => (
              <article className="domain-card row-between" key={m.id}>
                <div>
                  <h3>{m.topic}</h3>
                  <small>
                    {m.date.slice(0, 16).replace("T", " ")} ·{" "}
                    {m.roles
                      .map((id) => roles.find((r) => r[0] === id)?.[fa ? 1 : 2])
                      .join("، ")}
                  </small>
                </div>
                <Button onClick={() => setMeeting(m)}>
                  {fa ? "باز کردن صورت‌جلسه" : "Open minutes"}
                </Button>
              </article>
            ))
          ) : (
            <Empty />
          )}
          {meeting && (
            <MeetingRecord
              meeting={meeting}
              close={() => setMeeting(null)}
              save={(next) => {
                saveMeetings(
                  meetings.map((m) => (m.id === next.id ? next : m)),
                );
                setMeeting(next);
              }}
            />
          )}
        </section>
      );
    return (
      <div className="strategy-meeting-room">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const record: Meeting = {
              id: crypto.randomUUID(),
              topic,
              context,
              roles: participants,
              notes: "",
              actions: "",
              date: new Date().toISOString(),
            };
            saveMeetings([record, ...meetings]);
            setMeeting(record);
          }}
        >
          <span className="eyebrow">AIFekr / ADVISORY ROOM</span>
          <h2>
            {fa
              ? "یک موضوع، چند زاویهٔ نگاه."
              : "One challenge, several perspectives."}
          </h2>
          <div className="domain-fields">
            <label>
              {fa ? "موضوع جلسه" : "Meeting topic"}
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <label>
              {fa ? "اطلاعات و محدودیت‌ها" : "Context & constraints"}
              <textarea
                rows={6}
                required
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </label>
          </div>
          <h3>{fa ? "دیدگاه‌های موردنیاز" : "Perspectives to include"}</h3>
          <div className="strategy-role-grid">
            {roles.map(([id, a, b, icon]) => (
              <button
                type="button"
                className={participants.includes(id) ? "selected" : ""}
                key={id}
                aria-pressed={participants.includes(id)}
                onClick={() =>
                  setParticipants(
                    participants.includes(id)
                      ? participants.filter((x) => x !== id)
                      : [...participants, id],
                  )
                }
              >
                <Icon name={icon} size={25} />
                <strong>{fa ? a : b}</strong>
                <span>{participants.includes(id) ? "✓" : "+"}</span>
              </button>
            ))}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!participants.length}
          >
            {fa ? "ساخت پرونده جلسه" : "Create meeting record"}
          </Button>
          <p className="fine-print">
            {fa
              ? "این فضا برای ثبت و ساختاردهی تصمیم‌هاست؛ پاسخ چند ایجنت زنده تولید نمی‌کند."
              : "This workspace structures meeting decisions; it does not generate live multi-agent advice."}
          </p>
        </form>
        <aside className="panel strategy-agenda">
          <Icon name="MessagesSquare" size={38} />
          <h3>{fa ? "دستور جلسه پیشنهادی" : "Suggested agenda"}</h3>
          {(fa
            ? [
                "هدف و نتیجه مورد انتظار",
                "گزینه‌ها و محدودیت‌ها",
                "ریسک و هزینه هر گزینه",
                "تصمیم، مسئول و موعد",
              ]
            : [
                "Goal and expected outcome",
                "Options and constraints",
                "Risks and costs",
                "Decision, owner and deadline",
              ]
          ).map((a, i) => (
            <p key={a}>
              <span>0{i + 1}</span>
              {a}
            </p>
          ))}
        </aside>
        {meeting && (
          <MeetingRecord
            meeting={meeting}
            close={() => setMeeting(null)}
            save={(next) => {
              saveMeetings(meetings.map((m) => (m.id === next.id ? next : m)));
              setMeeting(next);
            }}
          />
        )}
      </div>
    );
  }
  if (module === "agents") {
    if (view === "create")
      return (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            saveAgents([...agents, { ...agent, id: crypto.randomUUID() }]);
            setAgent({ ...agent, name: "", instructions: "" });
            toast.success(
              fa
                ? "ایجنت در تیم محلی ذخیره شد"
                : "Agent saved to the local team",
            );
          }}
        >
          <h2>
            {fa ? "نقش تازه برای تیم هوشمند" : "A new role for your AI team"}
          </h2>
          <div className="domain-fields">
            <label>
              {fa ? "نام ایجنت" : "Agent name"}
              <input
                required
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              />
            </label>
            <label>
              {fa ? "تخصص" : "Specialty"}
              <select
                value={agent.role}
                onChange={(e) => setAgent({ ...agent, role: e.target.value })}
              >
                {roles.map(([id, a, b]) => (
                  <option key={id} value={id}>
                    {fa ? a : b}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {fa ? "حوزه فعالیت" : "Industry"}
              <select
                value={agent.industry}
                onChange={(e) =>
                  setAgent({ ...agent, industry: e.target.value })
                }
              >
                {[
                  ["general", "عمومی", "General"],
                  ["retail", "فروشگاهی", "Retail"],
                  ["property", "املاک", "Real estate"],
                  ["agency", "آژانس", "Agency"],
                ].map(([id, a, b]) => (
                  <option key={id} value={id}>
                    {fa ? a : b}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {fa
                ? "دستورالعمل و مرز مسئولیت"
                : "Instructions & responsibility boundaries"}
              <textarea
                rows={8}
                required
                value={agent.instructions}
                onChange={(e) =>
                  setAgent({ ...agent, instructions: e.target.value })
                }
              />
            </label>
          </div>
          <Button type="submit" variant="primary">
            {t("save")}
          </Button>
        </form>
      );
    if (view === "runs")
      return (
        <section className="panel">
          <h2>
            {fa ? "اجراهای نمونه و وضعیت مراحل" : "Demo runs & stage status"}
          </h2>
          {runs.length ? (
            runs.map((r) => (
              <article className="domain-card" key={r.id}>
                <div className="row-between">
                  <h3>{agents.find((a) => a.id === r.agentId)?.name}</h3>
                  <span className="badge">{r.status}</span>
                </div>
                <p>{r.brief}</p>
                <div className="agent-run-stages">
                  {(fa
                    ? [
                        "دریافت ورودی",
                        "بررسی دستور",
                        "آماده‌سازی خروجی",
                        "بازبینی انسانی",
                      ]
                    : [
                        "Input received",
                        "Instructions checked",
                        "Output prepared",
                        "Human review",
                      ]
                  ).map((label, i) => (
                    <span className={i <= r.step ? "done" : ""} key={i}>
                      {i <= r.step ? "✓" : "○"} {label}
                    </span>
                  ))}
                </div>
                <div className="domain-actions">
                  <Button
                    disabled={["completed", "cancelled"].includes(r.status)}
                    onClick={() =>
                      saveRuns(
                        runs.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                step: Math.min(3, x.step + 1),
                                status: x.step >= 2 ? "completed" : "running",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {fa ? "ادامه مرحله در شبیه‌ساز" : "Advance simulated stage"}
                  </Button>
                  <Button
                    disabled={["completed", "cancelled"].includes(r.status)}
                    onClick={() =>
                      saveRuns(
                        runs.map((x) =>
                          x.id === r.id ? { ...x, status: "cancelled" } : x,
                        ),
                      )
                    }
                  >
                    {fa ? "لغو اجرا" : "Cancel run"}
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <Empty />
          )}
          <p className="fine-print">
            {fa
              ? "این اجراها گردش مراحل را شبیه‌سازی می‌کنند؛ مدل خارجی فراخوانی نمی‌شود."
              : "These runs simulate workflow stages; no external model is called."}
          </p>
        </section>
      );
    return (
      <>
        <div className="strategy-team-heading">
          <div>
            <span className="eyebrow">AIFekr / AI TEAM</span>
            <h2>
              {fa
                ? "تخصص‌های متفاوت، یک هدف مشترک."
                : "Different specialties. One shared goal."}
            </h2>
          </div>
          <span className="badge">
            {n(agents.filter((a) => a.enabled).length)}{" "}
            {fa ? "نقش فعال" : "enabled roles"}
          </span>
        </div>
        {view === "industry" && (
          <div className="chips">
            {[
              ["all", "همه", "All"],
              ["general", "عمومی", "General"],
              ["retail", "فروشگاهی", "Retail"],
              ["property", "املاک", "Real estate"],
              ["agency", "آژانس", "Agency"],
            ].map(([id, a, b]) => (
              <button
                className={industry === id ? "selected" : ""}
                key={id}
                onClick={() => setIndustry(id)}
              >
                {fa ? a : b}
              </button>
            ))}
          </div>
        )}
        <div className="tool-grid">
          {agents
            .filter((a) => industry === "all" || a.industry === industry)
            .map((a) => (
              <article className="panel strategy-agent-card" key={a.id}>
                <span className="icon-chip purple">
                  <Icon
                    name={roles.find((r) => r[0] === a.role)?.[3] || "Bot"}
                    size={34}
                  />
                </span>
                <h3>{a.name}</h3>
                <span className="badge">
                  {roles.find((r) => r[0] === a.role)?.[fa ? 1 : 2]} ·{" "}
                  {a.industry}
                </span>
                <p>
                  {a.instructions ||
                    (fa
                      ? "نقش نمونه برای سازمان‌دهی کارهای این حوزه."
                      : "Sample role for organizing work in this specialty.")}
                </p>
                <label className="toggle-row">
                  <span>{fa ? "فعال در تیم" : "Enabled in team"}</span>
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) =>
                      saveAgents(
                        agents.map((x) =>
                          x.id === a.id
                            ? { ...x, enabled: e.target.checked }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <Button
                  variant="primary"
                  disabled={!a.enabled}
                  onClick={() => {
                    setRunAgent(a);
                    setBrief("");
                  }}
                >
                  {fa ? "آزمایش گردش‌کار" : "Test workflow"}
                </Button>
              </article>
            ))}
        </div>
        {runAgent && (
          <Modal title={runAgent.name} onClose={() => setRunAgent(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveRuns([
                  {
                    id: crypto.randomUUID(),
                    agentId: runAgent.id,
                    brief,
                    date: new Date().toISOString(),
                    step: 0,
                    status: "queued",
                  },
                  ...runs,
                ]);
                setRunAgent(null);
                toast.success(
                  fa
                    ? "اجرا در تب سوابق ثبت شد"
                    : "Run saved in the Runs section",
                );
              }}
            >
              <label>
                {fa ? "هدف و ورودی کار" : "Task goal & input"}
                <textarea
                  rows={7}
                  required
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </label>
              <Button type="submit" variant="primary">
                {fa ? "ساخت اجرای نمونه" : "Create demo run"}
              </Button>
            </form>
          </Modal>
        )}
      </>
    );
  }
  if (view === "goals")
    return (
      <section className="panel">
        <div className="row-between">
          <h2>
            {fa
              ? "هدف‌ها و نتایج قابل‌اندازه‌گیری"
              : "Goals & measurable outcomes"}
          </h2>
          <Button
            variant="primary"
            onClick={() =>
              setGoal({
                id: crypto.randomUUID(),
                title: "",
                target: 100,
                current: 0,
                unit: "%",
              })
            }
          >
            {fa ? "هدف تازه" : "New goal"}
          </Button>
        </div>
        {goals.map((g) => (
          <article className="domain-card" key={g.id}>
            <div className="row-between">
              <h3>{g.title}</h3>
              <Button onClick={() => setGoal(g)}>
                {fa ? "به‌روزرسانی" : "Update"}
              </Button>
            </div>
            <progress
              max={Math.max(g.target, g.current, 1)}
              value={g.current}
            />
            <p>
              {n(g.current)} / {n(g.target)} {g.unit}
            </p>
          </article>
        ))}
        {!goals.length && <Empty />}
        {goal && (
          <Modal
            title={fa ? "هدف و نتیجه" : "Goal & outcome"}
            onClose={() => setGoal(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveGoals(
                  goals.some((g) => g.id === goal.id)
                    ? goals.map((g) => (g.id === goal.id ? goal : g))
                    : [...goals, goal],
                );
                setGoal(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "عنوان هدف" : "Goal title"}
                  <input
                    required
                    value={goal.title}
                    onChange={(e) =>
                      setGoal({ ...goal, title: e.target.value })
                    }
                  />
                </label>
                {(["target", "current"] as const).map((key, i) => (
                  <label key={key}>
                    {
                      (fa
                        ? ["مقدار هدف", "مقدار فعلی"]
                        : ["Target", "Current value"])[i]
                    }
                    <input
                      required
                      type="number"
                      min={key === "target" ? 1 : 0}
                      value={goal[key]}
                      onChange={(e) =>
                        setGoal({ ...goal, [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <label>
                  {fa ? "واحد" : "Unit"}
                  <input
                    required
                    value={goal.unit}
                    onChange={(e) => setGoal({ ...goal, unit: e.target.value })}
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
  if (view === "approvals")
    return (
      <section className="panel">
        <div className="row-between">
          <h2>
            {fa
              ? "صف تصمیم‌ها و تأیید انسانی"
              : "Decisions & human approval queue"}
          </h2>
          <Button
            onClick={() =>
              setProposal({
                id: crypto.randomUUID(),
                title: "",
                reason: "",
                status: "pending",
              })
            }
          >
            {fa ? "پیشنهاد تصمیم" : "Propose decision"}
          </Button>
        </div>
        {proposals.map((p) => (
          <article className="domain-card" key={p.id}>
            <span className="badge">{p.status}</span>
            <h3>{p.title}</h3>
            <p>{p.reason}</p>
            <div className="domain-actions">
              <Button
                disabled={p.status !== "pending"}
                onClick={() => {
                  saveProposals(
                    proposals.map((x) =>
                      x.id === p.id ? { ...x, status: "approved" } : x,
                    ),
                  );
                  saveTasks([
                    ...tasks,
                    {
                      id: crypto.randomUUID(),
                      title: p.title,
                      owner: "",
                      due: "",
                      priority: "medium",
                      status: "todo",
                    },
                  ]);
                }}
              >
                {fa ? "تأیید و تبدیل به کار" : "Approve & create task"}
              </Button>
              <Button
                disabled={p.status !== "pending"}
                onClick={() =>
                  saveProposals(
                    proposals.map((x) =>
                      x.id === p.id ? { ...x, status: "rejected" } : x,
                    ),
                  )
                }
              >
                {fa ? "رد پیشنهاد" : "Reject"}
              </Button>
            </div>
          </article>
        ))}
        {!proposals.length && <Empty />}
        {proposal && (
          <Modal
            title={fa ? "پیشنهاد تصمیم" : "Decision proposal"}
            onClose={() => setProposal(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProposals([proposal, ...proposals]);
                setProposal(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "عنوان" : "Title"}
                  <input
                    required
                    value={proposal.title}
                    onChange={(e) =>
                      setProposal({ ...proposal, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa
                    ? "دلیل و اثر مورد انتظار"
                    : "Rationale & expected impact"}
                  <textarea
                    required
                    rows={6}
                    value={proposal.reason}
                    onChange={(e) =>
                      setProposal({ ...proposal, reason: e.target.value })
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
  if (["memory", "knowledge"].includes(view))
    return (
      <section className="panel">
        <div className="row-between">
          <h2>
            {view === "memory"
              ? fa
                ? "حافظه تصمیم‌ها"
                : "Decision memory"
              : fa
                ? "دانش و زمینه کسب‌وکار"
                : "Business knowledge & context"}
          </h2>
          <Button
            onClick={() =>
              setNote({
                id: crypto.randomUUID(),
                title: "",
                body: "",
                date: new Date().toISOString(),
              })
            }
          >
            {fa ? "یادداشت تازه" : "New note"}
          </Button>
        </div>
        {notes.map((note) => (
          <article className="domain-card" key={note.id}>
            <h3>{note.title}</h3>
            <p className="strategy-note-body">{note.body}</p>
            <Button onClick={() => setNote(note)}>
              {fa ? "ویرایش" : "Edit"}
            </Button>
            <Button
              onClick={() => saveNotes(notes.filter((x) => x.id !== note.id))}
            >
              {t("delete")}
            </Button>
          </article>
        ))}
        {!notes.length && <Empty />}
        {note && (
          <Modal
            title={fa ? "دانش و یادداشت" : "Knowledge & notes"}
            onClose={() => setNote(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveNotes(
                  notes.some((x) => x.id === note.id)
                    ? notes.map((x) => (x.id === note.id ? note : x))
                    : [note, ...notes],
                );
                setNote(null);
              }}
            >
              <label>
                {fa ? "عنوان" : "Title"}
                <input
                  required
                  value={note.title}
                  onChange={(e) => setNote({ ...note, title: e.target.value })}
                />
              </label>
              <label>
                {fa ? "اطلاعات تأییدشده" : "Verified information"}
                <textarea
                  rows={9}
                  required
                  value={note.body}
                  onChange={(e) => setNote({ ...note, body: e.target.value })}
                />
              </label>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  return (
    <>
      <div className="stats-grid">
        {[
          [
            fa ? "کارهای باز" : "Open tasks",
            tasks.filter((t) => t.status !== "done").length,
          ],
          [
            fa ? "منتظر تأیید" : "Awaiting approval",
            proposals.filter((p) => p.status === "pending").length,
          ],
          [fa ? "هدف‌های ثبت‌شده" : "Recorded goals", goals.length],
        ].map(([a, b]) => (
          <div className="panel stat" key={String(a)}>
            <span>{a}</span>
            <strong>{n(Number(b))}</strong>
          </div>
        ))}
      </div>
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setTask({
              id: crypto.randomUUID(),
              title: "",
              owner: "",
              due: "",
              priority: "medium",
              status: "todo",
            })
          }
        >
          {fa ? "کار راهبردی تازه" : "New strategic task"}
        </Button>
      </div>
      <div className="domain-board">
        {[
          ["todo", "برنامه‌ریزی", "Planned"],
          ["doing", "در حال اجرا", "In progress"],
          ["done", "انجام‌شده", "Completed"],
        ].map(([id, a, b]) => (
          <section className="panel" key={id}>
            <h3>{fa ? a : b}</h3>
            {tasks
              .filter((t) => t.status === id)
              .map((task) => (
                <article className="domain-card" key={task.id}>
                  <button className="text-link" onClick={() => setTask(task)}>
                    {task.title}
                  </button>
                  <p>
                    {task.owner || (fa ? "بدون مسئول" : "Unassigned")} ·{" "}
                    {task.due || "—"}
                  </p>
                  <span className="badge">{task.priority}</span>
                  <select
                    aria-label={
                      (fa ? "وضعیت کار " : "Task status ") + task.title
                    }
                    value={task.status}
                    onChange={(e) =>
                      saveTasks(
                        tasks.map((x) =>
                          x.id === task.id
                            ? { ...x, status: e.target.value }
                            : x,
                        ),
                      )
                    }
                  >
                    {[
                      ["todo", "برنامه‌ریزی", "Planned"],
                      ["doing", "در حال اجرا", "In progress"],
                      ["done", "انجام‌شده", "Completed"],
                    ].map(([id, a, b]) => (
                      <option key={id} value={id}>
                        {fa ? a : b}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
          </section>
        ))}
      </div>
      {task && (
        <Modal
          title={fa ? "کار راهبردی" : "Strategic task"}
          onClose={() => setTask(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTasks(
                tasks.some((x) => x.id === task.id)
                  ? tasks.map((x) => (x.id === task.id ? task : x))
                  : [...tasks, task],
              );
              setTask(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان کار" : "Task title"}
                <input
                  required
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                />
              </label>
              <label>
                {fa ? "مسئول" : "Owner"}
                <input
                  value={task.owner}
                  onChange={(e) => setTask({ ...task, owner: e.target.value })}
                />
              </label>
              <label>
                {fa ? "موعد" : "Due date"}
                <input
                  type="date"
                  value={task.due}
                  onChange={(e) => setTask({ ...task, due: e.target.value })}
                />
              </label>
              <label>
                {fa ? "اولویت" : "Priority"}
                <select
                  value={task.priority}
                  onChange={(e) =>
                    setTask({ ...task, priority: e.target.value })
                  }
                >
                  {["low", "medium", "high"].map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function MeetingRecord({
  meeting,
  close,
  save,
}: {
  meeting: Meeting;
  close: () => void;
  save: (m: Meeting) => void;
}) {
  const { fa, t } = useApp();
  const [draft, setDraft] = useState(meeting);
  return (
    <Modal title={meeting.topic} onClose={close}>
      <p>{meeting.context}</p>
      <div className="chips">
        {meeting.roles.map((id) => (
          <span className="badge" key={id}>
            {roles.find((r) => r[0] === id)?.[fa ? 1 : 2]}
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(draft);
          toast.success(t("save"));
        }}
      >
        <label>
          {fa ? "یادداشت و جمع‌بندی" : "Discussion notes & conclusion"}
          <textarea
            required
            rows={7}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>
        <label>
          {fa ? "اقدام‌ها، مسئول و موعد" : "Actions, owners & deadlines"}
          <textarea
            rows={5}
            value={draft.actions}
            onChange={(e) => setDraft({ ...draft, actions: e.target.value })}
          />
        </label>
        <div className="domain-actions">
          <Button variant="primary" type="submit">
            {t("save")}
          </Button>
          <Button
            onClick={() =>
              download(
                "meeting-minutes.txt",
                [draft.topic, draft.context, draft.notes, draft.actions].join(
                  "\n\n",
                ),
              )
            }
          >
            {fa ? "دریافت صورت‌جلسه" : "Download minutes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
