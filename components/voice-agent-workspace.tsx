"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Modal, download } from "./ui";
import { toast } from "sonner";
type Agent = {
  id: string;
  name: string;
  business: string;
  greeting: string;
  voice: string;
  from: string;
  to: string;
  days: string[];
  enabled: boolean;
};
type Knowledge = { id: string; question: string; answer: string };
type Call = {
  id: string;
  agent: string;
  question: string;
  answer: string;
  date: string;
};
type Appointment = {
  id: string;
  name: string;
  phone: string;
  time: string;
  note: string;
  status: string;
};
export function VoiceAgentWorkspace({ view }: { view: string }) {
  const { fa, t } = useApp();
  const [agents, saveAgents] = useLocalState<Agent[]>("aifekr-call-agents", []);
  const [knowledge, saveKnowledge] = useLocalState<Knowledge[]>(
    "aifekr-call-knowledge",
    [],
  );
  const [calls, saveCalls] = useLocalState<Call[]>("aifekr-call-logs", []);
  const [appointments, saveAppointments] = useLocalState<Appointment[]>(
    "aifekr-call-appointments",
    [],
  );
  const [agent, setAgent] = useState<Agent>({
    id: crypto.randomUUID(),
    name: "",
    business: "",
    greeting: "",
    voice: "Nora",
    from: "09:00",
    to: "17:00",
    days: ["sat", "sun", "mon", "tue", "wed"],
    enabled: true,
  });
  const [step, setStep] = useState(0);
  const [faq, setFaq] = useState<Knowledge | null>(null);
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState("");
  const [answer, setAnswer] = useState("");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const active = agents.find((a) => a.id === selected) || agents[0];
  const days = [
    ["sat", "شنبه", "Saturday"],
    ["sun", "یکشنبه", "Sunday"],
    ["mon", "دوشنبه", "Monday"],
    ["tue", "سه‌شنبه", "Tuesday"],
    ["wed", "چهارشنبه", "Wednesday"],
    ["thu", "پنجشنبه", "Thursday"],
    ["fri", "جمعه", "Friday"],
  ];
  if (view === "setup")
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) {
            setStep(step + 1);
            return;
          }
          if (agent.from >= agent.to) {
            toast.error(
              fa
                ? "ساعت پایان باید پس از شروع باشد"
                : "End time must be later than start time",
            );
            return;
          }
          saveAgents(
            agents.some((a) => a.id === agent.id)
              ? agents.map((a) => (a.id === agent.id ? agent : a))
              : [...agents, agent],
          );
          toast.success(
            fa ? "منشی در فضای محلی ذخیره شد" : "Agent saved locally",
          );
        }}
      >
        <ol className="wizard-steps">
          {(fa
            ? ["کسب‌وکار", "صدا و ساعت", "بررسی"]
            : ["Business", "Voice & schedule", "Review"]
          ).map((label, i) => (
            <li className={step === i ? "selected" : ""} key={label}>
              {label}
            </li>
          ))}
        </ol>
        {step === 0 ? (
          <div className="domain-fields">
            <label>
              {fa ? "نام منشی" : "Agent name"}
              <input
                required
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              />
            </label>
            <label>
              {fa ? "کسب‌وکار" : "Business"}
              <input
                required
                value={agent.business}
                onChange={(e) =>
                  setAgent({ ...agent, business: e.target.value })
                }
              />
            </label>
            <label>
              {fa ? "پیام خوش‌آمد" : "Greeting"}
              <textarea
                required
                rows={4}
                value={agent.greeting}
                onChange={(e) =>
                  setAgent({ ...agent, greeting: e.target.value })
                }
              />
            </label>
          </div>
        ) : step === 1 ? (
          <>
            <div className="domain-fields">
              <label>
                {fa ? "صدای منشی" : "Agent voice"}
                <select
                  value={agent.voice}
                  onChange={(e) =>
                    setAgent({ ...agent, voice: e.target.value })
                  }
                >
                  <option>Nora</option>
                  <option>Arman</option>
                  <option>Sara</option>
                </select>
              </label>
              <label>
                {fa ? "شروع پاسخ‌گویی" : "Available from"}
                <input
                  type="time"
                  required
                  value={agent.from}
                  onChange={(e) => setAgent({ ...agent, from: e.target.value })}
                />
              </label>
              <label>
                {fa ? "پایان پاسخ‌گویی" : "Available until"}
                <input
                  type="time"
                  required
                  value={agent.to}
                  onChange={(e) => setAgent({ ...agent, to: e.target.value })}
                />
              </label>
            </div>
            <div className="chips">
              {days.map(([id, a, b]) => (
                <button
                  key={id}
                  className={agent.days.includes(id) ? "selected" : ""}
                  onClick={() =>
                    setAgent({
                      ...agent,
                      days: agent.days.includes(id)
                        ? agent.days.filter((d) => d !== id)
                        : [...agent.days, id],
                    })
                  }
                >
                  {fa ? a : b}
                </button>
              ))}
            </div>
          </>
        ) : (
          <dl className="domain-detail">
            {[
              [fa ? "نام" : "Name", agent.name],
              [fa ? "کسب‌وکار" : "Business", agent.business],
              [fa ? "خوش‌آمد" : "Greeting", agent.greeting],
              [fa ? "ساعت" : "Hours", agent.from + " – " + agent.to],
              [
                fa ? "روزها" : "Days",
                agent.days
                  .map((id) => days.find((d) => d[0] === id)?.[fa ? 1 : 2])
                  .join("، "),
              ],
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
          <Button
            type="submit"
            variant="primary"
            disabled={step === 2 && !agent.days.length}
          >
            {step < 2 ? (fa ? "بعدی" : "Continue") : t("save")}
          </Button>
        </div>
      </form>
    );
  if (view === "knowledge")
    return (
      <section className="panel">
        <Button
          variant="primary"
          onClick={() =>
            setFaq({ id: crypto.randomUUID(), question: "", answer: "" })
          }
        >
          {fa ? "افزودن پرسش و پاسخ" : "Add Q&A"}
        </Button>
        {knowledge.map((k) => (
          <article className="domain-card" key={k.id}>
            <h3>{k.question}</h3>
            <p>{k.answer}</p>
            <Button onClick={() => setFaq(k)}>{fa ? "ویرایش" : "Edit"}</Button>
            <Button
              onClick={() =>
                saveKnowledge(knowledge.filter((x) => x.id !== k.id))
              }
            >
              {t("delete")}
            </Button>
          </article>
        ))}
        {faq && (
          <Modal
            title={fa ? "دانش منشی" : "Agent knowledge"}
            onClose={() => setFaq(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveKnowledge(
                  knowledge.some((k) => k.id === faq.id)
                    ? knowledge.map((k) => (k.id === faq.id ? faq : k))
                    : [...knowledge, faq],
                );
                setFaq(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "پرسش یا کلیدواژه" : "Question or keyword"}
                  <input
                    required
                    value={faq.question}
                    onChange={(e) =>
                      setFaq({ ...faq, question: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "پاسخ تأییدشده" : "Approved answer"}
                  <textarea
                    required
                    rows={6}
                    value={faq.answer}
                    onChange={(e) => setFaq({ ...faq, answer: e.target.value })}
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
  if (view === "appointments")
    return (
      <section className="panel">
        <Button
          variant="primary"
          onClick={() =>
            setAppointment({
              id: crypto.randomUUID(),
              name: "",
              phone: "",
              time: "",
              note: "",
              status: "booked",
            })
          }
        >
          {fa ? "قرار جدید" : "New appointment"}
        </Button>
        {appointments.map((a) => (
          <article className="domain-card row-between" key={a.id}>
            <div>
              <h3>{a.name}</h3>
              <p>
                {a.time.replace("T", " ")} · {a.phone}
              </p>
              <p>{a.note}</p>
              <span className="badge">{a.status}</span>
            </div>
            <Button
              disabled={a.status === "cancelled"}
              onClick={() =>
                saveAppointments(
                  appointments.map((x) =>
                    x.id === a.id ? { ...x, status: "cancelled" } : x,
                  ),
                )
              }
            >
              {fa ? "لغو قرار" : "Cancel appointment"}
            </Button>
          </article>
        ))}
        {appointment && (
          <Modal
            title={fa ? "ثبت قرار" : "Book appointment"}
            onClose={() => setAppointment(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  appointments.some(
                    (a) => a.time === appointment.time && a.status === "booked",
                  )
                ) {
                  toast.error(
                    fa
                      ? "این زمان رزرو شده است"
                      : "This time is already booked",
                  );
                  return;
                }
                saveAppointments([...appointments, appointment]);
                setAppointment(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "نام مراجعه‌کننده" : "Visitor name"}
                  <input
                    required
                    value={appointment.name}
                    onChange={(e) =>
                      setAppointment({ ...appointment, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "تلفن" : "Phone"}
                  <input
                    type="tel"
                    required
                    value={appointment.phone}
                    onChange={(e) =>
                      setAppointment({ ...appointment, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "زمان قرار" : "Appointment time"}
                  <input
                    type="datetime-local"
                    required
                    value={appointment.time}
                    onChange={(e) =>
                      setAppointment({ ...appointment, time: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "موضوع" : "Purpose"}
                  <textarea
                    value={appointment.note}
                    onChange={(e) =>
                      setAppointment({ ...appointment, note: e.target.value })
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
  if (view === "calls")
    return (
      <section className="panel">
        <h3>{fa ? "گزارش شبیه‌سازی تماس" : "Simulated call log"}</h3>
        {!calls.length ? (
          <Empty />
        ) : (
          calls.map((c) => (
            <article className="domain-card" key={c.id}>
              <span className="badge">
                {c.agent} · {c.date.slice(0, 16).replace("T", " ")}
              </span>
              <h3>{c.question}</h3>
              <p>{c.answer}</p>
              <Button
                onClick={() =>
                  download(
                    "call-" + c.id + ".txt",
                    [c.agent, c.date, c.question, c.answer].join("\n\n"),
                  )
                }
              >
                {fa ? "دریافت متن" : "Download transcript"}
              </Button>
            </article>
          ))
        )}
      </section>
    );
  return (
    <>
      <div className="tool-grid">
        {agents.map((a) => (
          <article className="panel" key={a.id}>
            <h3>{a.name}</h3>
            <p>{a.business}</p>
            <p>{a.greeting}</p>
            <p>
              {a.from} – {a.to}
            </p>
            <label className="toggle-row">
              <span>{fa ? "فعال در شبیه‌ساز" : "Enabled in simulator"}</span>
              <input
                type="checkbox"
                checked={a.enabled}
                onChange={(e) =>
                  saveAgents(
                    agents.map((x) =>
                      x.id === a.id ? { ...x, enabled: e.target.checked } : x,
                    ),
                  )
                }
              />
            </label>
          </article>
        ))}
      </div>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!active?.enabled) return;
          const match = knowledge.find((k) =>
            question
              .toLocaleLowerCase()
              .includes(k.question.toLocaleLowerCase()),
          );
          const reply = match?.answer || active.greeting;
          setAnswer(reply);
          saveCalls([
            {
              id: crypto.randomUUID(),
              agent: active.name,
              question,
              answer: reply,
              date: new Date().toISOString(),
            },
            ...calls,
          ]);
        }}
      >
        <h3>{fa ? "آزمایش متنی منشی" : "Text simulation"}</h3>
        <label>
          {fa ? "منشی" : "Agent"}
          <select
            value={active?.id || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {fa ? "سؤال تماس‌گیرنده" : "Caller question"}
          <textarea
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <Button disabled={!active?.enabled} type="submit" variant="primary">
          {fa ? "آزمایش بدون تماس واقعی" : "Test without a real call"}
        </Button>
        {answer && (
          <p role="status" className="domain-card">
            {answer}
          </p>
        )}
      </form>
    </>
  );
}
