"use client";
import { useState, useEffect } from "react";
import { useApp } from "./providers";
import { Button, download, Icon, Modal, SectionTitle } from "./ui";
import { tools } from "@/mocks/catalog";
import { toast } from "sonner";
const special = [
  "roles",
  "modules",
  "models",
  "providers",
  "fallback",
  "prompts",
  "chat-settings",
  "settings",
  "payment-providers",
  "cloudflare",
  "logs",
  "backups",
  "billing-rates",
  "plans",
  "credit-tiers",
  "promotions",
  "courses",
];
export function isSpecialAdmin(section: string) {
  return special.includes(section);
}
export function AdminSpecial({ section }: { section: string }) {
  const { fa, t, n } = useApp();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState(["OpenAI", "Anthropic", "Google"]);
  const [text, setText] = useState(
    fa
      ? "پاسخ‌ها روشن، کوتاه و به زبان کاربر باشند."
      : "Respond clearly, concisely and in the user’s language.",
  );
  const [version, setVersion] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [audit, setAudit] = useState<string[]>([]);
  const [logs, setLogs] = useState([
    ["INFO", "12:42:18", "Image job completed · JOB-1042"],
    ["WARN", "12:41:52", "Provider fallback used · Google"],
    ["INFO", "12:41:40", "Demo payment confirmed"],
    ["ERROR", "12:40:08", "Demo voice generation failed · refunded"],
  ]);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("aifekr-admin-config:" + section) || "null",
      );
      if (stored) {
        setEnabled(stored.enabled || {});
        setOrder(stored.order || ["OpenAI", "Anthropic", "Google"]);
        setText(stored.text || "");
        setVersion(stored.version || 1);
        setAudit(stored.audit || []);
      }
    } catch {}
  }, [section]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function toggle(key: string, initial = false) {
    setEnabled((s) => ({ ...s, [key]: !(s[key] ?? initial) }));
    setDirty(true);
  }
  function saved() {
    setDirty(false);
    localStorage.setItem(
      "aifekr-admin-config:" + section,
      JSON.stringify({
        enabled,
        order,
        text,
        version,
        audit: [
          new Date().toISOString() + " · " + section + " saved",
          ...audit,
        ],
      }),
    );
    setAudit((s) => [
      new Date().toISOString() + " · " + section + " saved",
      ...s,
    ]);
    toast.success(t("success"));
  }
  return (
    <>
      <div className="panel admin-editor">
        {section === "roles" || section === "modules" ? (
          <>
            <h2>
              {fa
                ? section === "roles"
                  ? "ماتریس دسترسی مدیران"
                  : "دسترسی ماژول‌ها بر اساس طرح"
                : section === "roles"
                  ? "Role permissions"
                  : "Module access by plan"}
            </h2>
            <div className="permission-matrix">
              <div className="matrix-head">
                <span>{fa ? "بخش" : "Section"}</span>
                {(section === "roles"
                  ? ["Admin", "Editor", "Support"]
                  : ["Free", "Pro", "Business"]
                ).map((s) => (
                  <strong key={s}>{s}</strong>
                ))}
              </div>
              {(section === "roles"
                ? fa
                  ? [
                      "کاربران",
                      "پرداخت‌ها",
                      "محتوا",
                      "تنظیمات",
                      "مدل‌ها",
                      "گزارش‌ها",
                    ]
                  : [
                      "Users",
                      "Payments",
                      "Content",
                      "Settings",
                      "Models",
                      "Reports",
                    ]
                : tools.filter((_, i) => i < 12).map((s) => (fa ? s.fa : s.en))
              ).map((s, i) => (
                <div key={s}>
                  <span>{s}</span>
                  {[0, 1, 2].map((v) => (
                    <label key={v} aria-label={s + " " + v}>
                      <input
                        type="checkbox"
                        checked={
                          enabled[s + v] ??
                          (section === "roles" ? v === 0 : v > 0 || i === 0)
                        }
                        onChange={() =>
                          toggle(
                            s + v,
                            section === "roles" ? v === 0 : v > 0 || i === 0,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={saved}>
              {t("save")}
            </Button>
          </>
        ) : ["models", "providers", "billing-rates"].includes(section) ? (
          <>
            <SectionTitle
              title={fa ? "مدل‌ها و تأمین‌کنندگان" : "Models & providers"}
              subtitle={
                fa
                  ? "همهٔ وضعیت‌ها نمایشی هستند."
                  : "All health indicators are sample data."
              }
            />
            <div className="model-list">
              {["GPT", "Claude", "Gemini", "Image Studio", "Voice Studio"].map(
                (s, i) => (
                  <div className="model-row" key={s}>
                    <span className="icon-chip orange">
                      <Icon name="BrainCircuit" />
                    </span>
                    <div>
                      <h3>{s}</h3>
                      <span className="badge green">
                        {t("ready")} · {n(120 + i * 35)}ms
                      </span>
                    </div>
                    <label>
                      {t("cost")}
                      <input
                        type="number"
                        min={0}
                        defaultValue={i + 2}
                        onChange={() => setDirty(true)}
                      />
                    </label>
                    <label className="check-label">
                      {fa ? "فعال" : "Enabled"}
                      <input
                        type="checkbox"
                        checked={enabled[s] ?? true}
                        onChange={() => toggle(s, true)}
                      />
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="default-model"
                        defaultChecked={i === 0}
                        onChange={() => setDirty(true)}
                        aria-label={(fa ? "مدل پیش‌فرض " : "Default ") + s}
                      />
                    </label>
                  </div>
                ),
              )}
            </div>
            <Button variant="primary" onClick={saved}>
              {t("save")}
            </Button>
          </>
        ) : section === "fallback" ? (
          <>
            <h2>{fa ? "اولویت تأمین‌کنندگان" : "Provider fallback order"}</h2>
            <p className="fine-print">
              {fa
                ? "در صورت شکست، تأمین‌کنندهٔ بعدی انتخاب می‌شود."
                : "When a provider fails, try the next in the chain."}
            </p>
            {order.map((s, i) => (
              <div
                className="fallback-row"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("provider", String(i))
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const from = Number(e.dataTransfer.getData("provider"));
                  setOrder((old) => {
                    const next = [...old];
                    const [entry] = next.splice(from, 1);
                    next.splice(i, 0, entry);
                    return next;
                  });
                  setDirty(true);
                }}
                key={s}
              >
                <Icon name="GripVertical" size={18} />
                <span>{n(i + 1)}</span>
                <strong>{s}</strong>
                <span className="badge green">{t("ready")}</span>
                <Button
                  label={fa ? "اولویت بالاتر" : "Move up"}
                  disabled={i === 0}
                  onClick={() => {
                    setOrder((old) => {
                      const next = [...old];
                      [next[i], next[i - 1]] = [next[i - 1], next[i]];
                      return next;
                    });
                    setDirty(true);
                  }}
                >
                  <Icon name="ChevronUp" size={16} />
                </Button>
                <Button
                  label={fa ? "اولویت پایین‌تر" : "Move down"}
                  disabled={i === order.length - 1}
                  onClick={() => {
                    setOrder((old) => {
                      const next = [...old];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      return next;
                    });
                    setDirty(true);
                  }}
                >
                  <Icon name="ChevronDown" size={16} />
                </Button>
              </div>
            ))}
            <Button variant="primary" onClick={saved}>
              {t("save")}
            </Button>
          </>
        ) : section === "logs" ? (
          <>
            <SectionTitle title={fa ? "رویدادهای سیستم" : "System logs"}>
              <select
                aria-label={t("filter")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t("all")}</option>
                {["INFO", "WARN", "ERROR"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </SectionTitle>
            <div className="log-viewer" dir="ltr">
              {logs
                .filter((v) => filter === "all" || v[0] === filter)
                .map(([level, time, msg], i) => (
                  <p key={i}>
                    <span>{time}</span>
                    <strong
                      className={
                        level === "ERROR"
                          ? "red"
                          : level === "WARN"
                            ? "amber-text"
                            : "green"
                      }
                    >
                      {level}
                    </strong>
                    {msg}
                  </p>
                ))}
            </div>
            <Button
              variant="primary"
              onClick={() =>
                setLogs((s) => [
                  [
                    "INFO",
                    new Date().toLocaleTimeString("en-GB"),
                    "Sample heartbeat received",
                  ],
                  ...s,
                ])
              }
            >
              <Icon name="RefreshCw" size={16} />
              {fa ? "دریافت رویداد آزمایشی" : "Append sample event"}
            </Button>
          </>
        ) : section === "backups" ? (
          <>
            <h2>{fa ? "نسخه‌های پشتیبان" : "Backups"}</h2>
            {[0, 1, 2].map((i) => (
              <div className="fallback-row" key={i}>
                <Icon name="DatabaseBackup" />
                <strong>backup-2026-10-{28 - i}.json</strong>
                <span className="badge">DEMO</span>
                <Button
                  onClick={() =>
                    download(
                      "backup-demo.json",
                      JSON.stringify({ demo: true, date: `2026-10-${28 - i}` }),
                      "application/json",
                    )
                  }
                >
                  {t("download")}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setConfirm("backup-" + i)}
                >
                  {fa ? "بازیابی" : "Restore"}
                </Button>
              </div>
            ))}
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (section === "prompts") setVersion((v) => v + 1);
              saved();
            }}
          >
            <div className="row-between">
              <h2>{fa ? "ویرایش تنظیمات" : "Edit configuration"}</h2>
              <span className="badge">v{n(version)}</span>
            </div>
            <label>
              {t("name")}
              <input
                required
                defaultValue={
                  section === "prompts" ? "Default assistant" : section
                }
                onChange={() => setDirty(true)}
              />
            </label>
            <label>
              {section === "prompts"
                ? fa
                  ? "پرامپت سیستم"
                  : "System prompt"
                : section === "courses"
                  ? fa
                    ? "طرح درس"
                    : "Syllabus"
                  : fa
                    ? "جزئیات و توضیحات"
                    : "Details & description"}
              <textarea
                required
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <div className="form-grid">
              <label>
                {fa ? "وضعیت" : "Status"}
                <select onChange={() => setDirty(true)}>
                  <option>{fa ? "فعال" : "Active"}</option>
                  <option>{fa ? "پیش‌نویس" : "Draft"}</option>
                </select>
              </label>
              <label>
                {fa ? "مقدار / تعرفه" : "Value / rate"}
                <input
                  type="number"
                  min={0}
                  defaultValue={section === "promotions" ? 10 : 100}
                  onChange={() => setDirty(true)}
                />
              </label>
            </div>
            <label className="toggle-row">
              {fa ? "حالت آزمایشی" : "Test mode"}
              <input
                type="checkbox"
                defaultChecked
                onChange={() => setDirty(true)}
              />
            </label>
            <div className="form-footer">
              {dirty && (
                <span className="amber-text">
                  {fa ? "تغییرات ذخیره نشده" : "Unsaved changes"}
                </span>
              )}
              <Button variant="primary" type="submit">
                {section === "prompts"
                  ? fa
                    ? "ذخیره نسخهٔ تازه"
                    : "Save a new version"
                  : t("save")}
              </Button>
            </div>
          </form>
        )}
      </div>
      {audit.length > 0 && (
        <div className="panel audit-trail">
          <h3>{fa ? "سابقهٔ تغییرات" : "Audit trail"}</h3>
          {audit.map((s, i) => (
            <p key={i} dir="ltr">
              {s}
            </p>
          ))}
        </div>
      )}
      {confirm && (
        <Modal
          title={fa ? "تأیید بازیابی" : "Confirm restore"}
          onClose={() => setConfirm(null)}
        >
          <p>
            {fa
              ? "برای تأیید، RESTORE را وارد کن. این یک عملیات نمایشی است."
              : "Type RESTORE to confirm this simulated restore."}
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="RESTORE"
          />
          <Button
            variant="danger"
            disabled={typed !== "RESTORE"}
            onClick={() => {
              setAudit((s) => [
                new Date().toISOString() + " · Restored " + confirm,
                ...s,
              ]);
              setConfirm(null);
              toast.success(t("success"));
            }}
          >
            {t("confirm")}
          </Button>
        </Modal>
      )}
    </>
  );
}
