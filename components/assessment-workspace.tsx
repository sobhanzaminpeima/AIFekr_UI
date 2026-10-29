"use client";
import { useState } from "react";
import Link from 'next/link';
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Assessment = {
  id: string;
  name: string;
  industry: string;
  team: number;
  website?:string;
  revenue?:string;
  customers?:string;
  offer?:string;
  challenge: string;
  goal: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  actions: { id: string; title: string; due: string; done: boolean }[];
  metrics: {
    id: string;
    name: string;
    baseline: number;
    target: number;
    current: number;
    unit: string;
  }[];
  date: string;
};
const axes = [
  ["strengths", "نقاط قوت", "Strengths", "TrendingUp"],
  ["weaknesses", "نقاط قابل‌بهبود", "Weaknesses", "ListChecks"],
  ["opportunities", "فرصت‌ها", "Opportunities", "Lightbulb"],
  ["threats", "ریسک‌ها", "Threats", "CircleAlert"],
] as const;
export function AssessmentWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [records, save] = useLocalState<Assessment[]>(
    "aifekr-business-assessments",
    [],
  );
  const [selected, select] = useLocalState<string>(
    "aifekr-business-assessment-active",
    "",
  );
  const active = records.find((r) => r.id === selected) || records[0];
  const [draft, setDraft] = useState<Assessment | null>(null);
  const [step, setStep] = useState(0);
  const [action, setAction] = useState(""),
    [due, setDue] = useState("");
  const [metric, setMetric] = useState({
    name: "",
    baseline: 0,
    target: 100,
    current: 0,
    unit: "%",
  });
  const [showMetric, setShowMetric] = useState(false);
  function create() {
    setDraft({
      id: crypto.randomUUID(),
      name: "",
      industry: "",
      team: 1,
      challenge: "",
      goal: "",
      strengths: "",
      weaknesses: "",
      opportunities: "",
      threats: "",
      actions: [],
      metrics: [],
      date: new Date().toISOString(),
    });
    setStep(0);
  }
  function update(next: Assessment) {
    save(records.map((r) => (r.id === next.id ? next : r)));
  }
  const toolbar = (
    <div className="domain-toolbar">
      <select
        aria-label={fa ? "ارزیابی فعال" : "Active assessment"}
        value={active?.id || ""}
        onChange={(e) => select(e.target.value)}
      >
        {records.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} · {r.date.slice(0, 10)}
          </option>
        ))}
      </select>
      <Button variant="primary" onClick={create}>
        {fa ? "ارزیابی تازه" : "New assessment"}
      </Button>
    </div>
  );
  const editor = draft && (
    <Modal
      title={fa ? "ارزیابی کسب‌وکار" : "Business assessment"}
      onClose={() => setDraft(null)}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) {
            setStep(step + 1);
            return;
          }
          save(
            records.some((r) => r.id === draft.id)
              ? records.map((r) => (r.id === draft.id ? draft : r))
              : [draft, ...records],
          );
          select(draft.id);
          setDraft(null);
          toast.success(t("save"));
        }}
      >
        <ol className="wizard-steps">
          {(fa
            ? ["شناخت کسب‌وکار", "وضعیت و هدف", "بررسی نهایی"]
            : ["Business context", "Situation & goal", "Review"]
          ).map((a, i) => (
            <li className={step === i ? "selected" : ""} key={a}>
              {a}
            </li>
          ))}
        </ol>
        {step === 0 ? (
          <div className="domain-fields">
            <label>
              {fa ? "نام کسب‌وکار" : "Business name"}
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              {fa ? "حوزه فعالیت" : "Industry"}
              <input
                required
                value={draft.industry}
                onChange={(e) =>
                  setDraft({ ...draft, industry: e.target.value })
                }
              />
            </label>
            <label>
              {fa ? "تعداد اعضا" : "Team size"}
              <input
                required
                type="number"
                min={1}
                value={draft.team}
                onChange={(e) =>
                  setDraft({ ...draft, team: Number(e.target.value) })
                }
              />
            </label>
            <label>{fa?'وب‌سایت (اختیاری)':'Website (optional)'}<input type="url" value={draft.website||''} onChange={e=>setDraft({...draft,website:e.target.value})}/></label>
            <label>{fa?'وضعیت درآمد و مدل درآمدی (اختیاری)':'Revenue context & business model (optional)'}<textarea rows={3} value={draft.revenue||''} onChange={e=>setDraft({...draft,revenue:e.target.value})} placeholder={fa?'عدد را با دوره و واحد پول بنویس؛ مثلاً فروش ماهانه به تومان':'Include the period and currency when entering amounts'}/></label>
          </div>
        ) : step === 1 ? (
          <div className="domain-fields">
            <label>{fa?'محصول یا خدمت اصلی (اختیاری)':'Main product or service (optional)'}<textarea rows={3} value={draft.offer||''} onChange={e=>setDraft({...draft,offer:e.target.value})}/></label>
            <label>{fa?'مشتریان هدف و روش جذب (اختیاری)':'Target customers & acquisition (optional)'}<textarea rows={3} value={draft.customers||''} onChange={e=>setDraft({...draft,customers:e.target.value})}/></label>
            <label>
              {fa ? "چالش اصلی" : "Main challenge"}
              <textarea
                rows={6}
                required
                value={draft.challenge}
                onChange={(e) =>
                  setDraft({ ...draft, challenge: e.target.value })
                }
              />
            </label>
            <label>
              {fa ? "نتیجه مورد انتظار" : "Desired outcome"}
              <textarea
                rows={6}
                required
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              />
            </label>
          </div>
        ) : (
          <dl className="domain-detail">
            {[
              [fa ? "کسب‌وکار" : "Business", draft.name],
              [fa ? "صنعت" : "Industry", draft.industry],
              [fa ? "چالش" : "Challenge", draft.challenge],
              [fa ? "هدف" : "Goal", draft.goal],
              [fa ? "محصول و خدمت" : "Offer", draft.offer||'—'],
              [fa ? "مشتریان" : "Customers", draft.customers||'—'],
              [fa ? "وضعیت درآمد" : "Revenue context", draft.revenue||'—'],
            ].map(([a, b]) => (
              <div key={a}>
                <dt>{a}</dt>
                <dd>{b}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="domain-actions">
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)}>
              {fa ? "قبلی" : "Back"}
            </Button>
          )}
          <Button type="submit" variant="primary">
            {step < 2 ? (fa ? "ادامه" : "Continue") : t("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
  if (view === "assessment")
    return (
      <>
        <section className="panel assessment-intro">
          <span className="icon-chip amber">
            <Icon name="HeartPulse" size={40} />
          </span>
          <span className="eyebrow">AIFekr / BUSINESS DOCTOR</span>
          <h2>
            {fa
              ? "مسئله را روشن کن،\nقدم بعدی را کوچک و مشخص بردار."
              : "Clarify the challenge.\nTake a small, specific next step."}
          </h2>
          <p>
            {fa
              ? "وضعیت کسب‌وکار، قوت‌ها، ریسک‌ها و شاخص‌ها را در یک پرونده قابل‌ویرایش کنار هم قرار بده. این ابزار، تحلیل حرفه‌ای یا خروجی AI زنده ارائه نمی‌کند."
              : "Bring context, strengths, risks and metrics into an editable assessment. This tool does not provide professional analysis or live AI output."}
          </p>
          <Button variant="primary" onClick={create}>
            {fa ? "شروع ارزیابی" : "Start assessment"}
          </Button>
        </section>
        {active && (
          <section className="panel">
            <h3>{fa ? "آخرین ارزیابی" : "Latest assessment"}</h3>
            <h2>{active.name}</h2>
            <p>{active.challenge}</p>
            <span className="badge">{active.date.slice(0, 10)}</span>
            <div className="directory-grid doctor-next-steps">{[
              ['swot','شناخت قوت و ریسک','Strengths & risks',axes.filter(([key])=>active[key]?.trim()).length+' / 4'],
              ['action-plan','برنامهٔ اقدام','Action plan',n(active.actions.filter(a=>a.done).length)+' / '+n(active.actions.length)],
              ['kpis','سنجش نتیجه','Measure outcomes',n(active.metrics.length)],
            ].map(([tab,a,b,count],i)=><Link href={'/business-doctor?tab='+tab} className="panel" key={tab}><small>{fa?'گام':'Step'} {n(i+1)}</small><h3>{fa?a:b}</h3><span className="badge">{count}</span><p className="text-link">{fa?'ادامهٔ این مرحله':'Continue this step'} ←</p></Link>)}</div>
          </section>
        )}
        {editor}
      </>
    );
  if (view === "history")
    return (
      <>
        {toolbar}
        <div className="tool-grid">
          {records.map((r) => (
            <article className="panel" key={r.id}>
              <h3>{r.name}</h3>
              <span className="badge">{r.industry}</span>
              <p>{r.challenge}</p>
              <small>{r.date.slice(0, 10)}</small>
              <div className="domain-actions">
                <Button
                  onClick={() => {
                    select(r.id);
                    setDraft(r);
                    setStep(0);
                  }}
                >
                  {fa ? "بازبینی ارزیابی" : "Review assessment"}
                </Button>
                <Button
                  onClick={() =>
                    download(
                      "assessment-" + r.id + ".json",
                      JSON.stringify(r, null, 2),
                      "application/json",
                    )
                  }
                >
                  {t("export")}
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!records.length && <Empty onAction={create} />}
        {editor}
      </>
    );
  if (!active)
    return (
      <>
        {toolbar}
        <Empty onAction={create} />
        {editor}
      </>
    );
  return (
    <>
      {toolbar}
      {view === "swot" ? (
        <div className="assessment-swot">
          {axes.map(([key, a, b, icon]) => (
            <label className={"panel " + key} key={key}>
              <span className="row-between">
                <strong>{fa ? a : b}</strong>
                <Icon name={icon} size={22} />
              </span>
              <textarea
                rows={8}
                placeholder={
                  fa
                    ? "نکته‌ها و شواهد خودت را ثبت کن…"
                    : "Record your own observations and evidence…"
                }
                value={active[key]}
                onChange={(e) => update({ ...active, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      ) : view === "action-plan" ? (
        <section className="panel">
          <h2>{fa ? "برنامه اقدام" : "Action plan"}</h2>
          <form
            className="domain-fields"
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...active,
                actions: [
                  ...active.actions,
                  { id: crypto.randomUUID(), title: action, due, done: false },
                ],
              });
              setAction("");
              setDue("");
            }}
          >
            <label>
              {fa ? "اقدام مشخص" : "Specific action"}
              <input
                required
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </label>
            <label>
              {fa ? "موعد" : "Due date"}
              <input
                type="date"
                required
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary">
              {t("add")}
            </Button>
          </form>
          {active.actions.map((a) => (
            <label className="toggle-row" key={a.id}>
              <span>
                <strong>{a.title}</strong>
                <small>{a.due}</small>
              </span>
              <input
                type="checkbox"
                checked={a.done}
                onChange={(e) =>
                  update({
                    ...active,
                    actions: active.actions.map((x) =>
                      x.id === a.id ? { ...x, done: e.target.checked } : x,
                    ),
                  })
                }
              />
            </label>
          ))}
        </section>
      ) : (
        <section className="panel">
          <div className="row-between">
            <h2>{fa ? "شاخص‌های قابل‌پیگیری" : "Trackable metrics"}</h2>
            <Button onClick={() => setShowMetric(true)}>
              {fa ? "افزودن شاخص" : "Add metric"}
            </Button>
          </div>
          {active.metrics.map((m) => (
            <article className="domain-card" key={m.id}>
              <h3>{m.name}</h3>
              <div className="row-between">
                <span>
                  {fa ? "مبنای شروع" : "Baseline"}: {n(m.baseline)}
                </span>
                <span>
                  {fa ? "هدف" : "Target"}: {n(m.target)} {m.unit}
                </span>
              </div>
              <label>
                {fa ? "مقدار فعلی" : "Current value"}
                <input
                  type="number"
                  value={m.current}
                  onChange={(e) =>
                    update({
                      ...active,
                      metrics: active.metrics.map((x) =>
                        x.id === m.id
                          ? { ...x, current: Number(e.target.value) }
                          : x,
                      ),
                    })
                  }
                />
              </label>
            </article>
          ))}
          {!active.metrics.length && <Empty />}
          {showMetric && (
            <Modal
              title={fa ? "تعریف شاخص" : "Define metric"}
              onClose={() => setShowMetric(false)}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update({
                    ...active,
                    metrics: [
                      ...active.metrics,
                      { id: crypto.randomUUID(), ...metric },
                    ],
                  });
                  setShowMetric(false);
                }}
              >
                <div className="domain-fields">
                  <label>
                    {fa ? "نام شاخص" : "Metric name"}
                    <input
                      required
                      value={metric.name}
                      onChange={(e) =>
                        setMetric({ ...metric, name: e.target.value })
                      }
                    />
                  </label>
                  {(["baseline", "target"] as const).map((key, i) => (
                    <label key={key}>
                      {(fa ? ["مقدار مبنا", "هدف"] : ["Baseline", "Target"])[i]}
                      <input
                        type="number"
                        required
                        value={metric[key]}
                        onChange={(e) =>
                          setMetric({
                            ...metric,
                            [key]: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    {fa ? "واحد" : "Unit"}
                    <input
                      required
                      value={metric.unit}
                      onChange={(e) =>
                        setMetric({ ...metric, unit: e.target.value })
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
      )}
      {editor}
    </>
  );
}
