"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "@/components/site-link";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { moduleViewHref } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import { Button, Modal, SectionTitle } from "./ui";
import { socialDraft, campaignLinks, socialPillars } from "@/lib/social-contract";
import { socialLabel } from "@/lib/social-copy";

type Row = Record<string, unknown>;
type Field = {
  key: string;
  fa: string;
  en: string;
  type?: string;
  choices?: string[];
  optional?: boolean;
};
const f = (
  key: string,
  fa: string,
  en: string,
  type = "text",
  choices?: string[],
  optional = false,
): Field => ({ key, fa, en, type, choices, optional });
const API = "/api/social/",
  IG = API + "instagram/";
const enc = encodeURIComponent;
const SocialContext = createContext({ fa: true, lang: "fa" });
const useSocial = () => useContext(SocialContext);
async function request(
  url: string,
  body?: unknown,
  method = "GET",
): Promise<Row> {
  const r = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    ...(body !== undefined && method !== "GET"
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Error(typeof d.error === "string" ? d.error : `HTTP ${r.status}`);
  return d;
}
function useData(url: string) {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void request(url)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [url, version]);
  return { data, error, reload };
}
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v : []);
function Status({ data, error }: { data: Row | null; error: string }) {
  const { fa } = useSocial();
  return error ? (
    <p role="alert" className="plan-notice">
      {error}
    </p>
  ) : !data ? (
    <p role="status">{fa ? "در حال دریافت…" : "Loading…"}</p>
  ) : null;
}
function Records({
  items,
  columns,
  actions,
}: {
  items: Row[];
  columns: Field[];
  actions?: (row: Row) => React.ReactNode;
}) {
  const { fa } = useSocial();
  return !items.length ? (
    <p className="crm-empty">
      {fa ? "هنوز داده‌ای ثبت نشده است." : "No records yet."}
    </p>
  ) : (
    <div className="domain-table-wrap">
      <table className="domain-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{fa ? c.fa : c.en}</th>
            ))}
            {actions && <th>{fa ? "عملیات" : "Actions"}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              {columns.map((c) => (
                <td key={c.key}>
                  <bdi>
                    {row[c.key] == null
                      ? "—"
                      : typeof row[c.key] === "boolean"
                        ? row[c.key]
                          ? "✓"
                          : "—"
                        : ["status", "mode", "direction", "mediaType"].includes(
                              c.key,
                            )
                          ? socialLabel(String(row[c.key]), fa)
                          : String(row[c.key])}
                  </bdi>
                </td>
              ))}
              {actions && (
                <td>
                  <div className="domain-actions">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/** Mutations are explicit and locked; transport failures never retry a paid/publishing action. */
function Form({
  title,
  fields,
  url,
  method = "POST",
  initial = {},
  map,
  onDone,
  caution,
}: {
  title: string;
  fields: Field[];
  url: string;
  method?: string;
  initial?: Row;
  map?: (d: Row) => Row;
  onDone: (d: Row) => void;
  caution?: string;
}) {
  const { fa } = useSocial();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{title}</Button>
      {open && (
        <Modal
          title={title}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current) return;
              const form = new FormData(e.currentTarget),
                body: Row = {};
              fields.forEach((field) => {
                const value = String(form.get(field.key) ?? "");
                if (!value && field.optional && field.type !== "checkbox")
                  return;
                body[field.key] =
                  field.type === "number"
                    ? Number(value)
                    : field.type === "checkbox"
                      ? form.get(field.key) === "on"
                      : value;
              });
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                const d = await request(url, map ? map(body) : body, method);
                onDone(d);
                setOpen(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {caution && <p className="plan-notice">{caution}</p>}
            {fields.map((field) => (
              <label key={field.key}>
                {fa ? field.fa : field.en}
                {field.choices ? (
                  <select
                    name={field.key}
                    defaultValue={String(
                      initial[field.key] ?? field.choices[0],
                    )}
                  >
                    {field.choices.map((c) => (
                      <option key={c} value={c}>
                        {socialLabel(c, fa)}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    rows={5}
                    required={!field.optional}
                    defaultValue={String(initial[field.key] ?? "")}
                  />
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    name={field.key}
                    defaultChecked={!!initial[field.key]}
                  />
                ) : (
                  <input
                    name={field.key}
                    type={field.type ?? "text"}
                    step={field.type === "number" ? "any" : undefined}
                    required={!field.optional}
                    defaultValue={String(initial[field.key] ?? "")}
                  />
                )}
              </label>
            ))}
            {error && <p role="alert">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? (fa ? "در حال انجام…" : "Working…") : title}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Confirm({
  title,
  url,
  body,
  method = "POST",
  onDone,
  caution,
}: {
  title: string;
  url: string;
  body?: Row;
  method?: string;
  onDone: () => void;
  caution?: string;
}) {
  const { fa } = useSocial();
  return (
    <Form
      title={title}
      fields={[]}
      url={url}
      method={method}
      map={() => body ?? {}}
      onDone={onDone}
      caution={
        caution ??
        (fa
          ? "این تغییر روی اطلاعات واقعی و حساب متصل اعمال می‌شود. ادامه می‌دهید؟"
          : "This changes real records or the connected account. Continue?")
      }
    />
  );
}

export function LiveSocial({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const shell = useShell()!;
  const fa = shell.lang === "fa";
  return (
    <SocialContext.Provider value={{ fa, lang: shell.lang }}>
      <div className="module-workspace accent-pink">
        <SectionTitle
          title={module.title[fa ? 0 : 1]}
          subtitle={module.subtitle[fa ? 0 : 1]}
        />
        <nav
          className="module-tabs"
          aria-label={fa ? "بخش‌های شبکه‌های اجتماعی" : "Social sections"}
        >
          {module.views.map((v) => (
            <Link
              key={v.id}
              href={moduleViewHref(module, v)}
              aria-current={v.id === view.id ? "page" : undefined}
            >
              {v.title[fa ? 0 : 1]}
            </Link>
          ))}
        </nav>
        <SocialView key={view.id} view={view.id} />
      </div>
    </SocialContext.Provider>
  );
}
function SocialView({ view }: { view: string }) {
  if (["publish", "connections", "calendar", "queue"].includes(view))
    return (
      <>
        <Publishing />
        {view === "connections" && <Webhooks />}
        {view === "calendar" && <CalendarDraft />}
      </>
    );
  if (view === "content")
    return (
      <>
        <Studio />
        <Quality />
        <ImageAnalysis />
        <Ideas />
      </>
    );
  if (view === "brand") return <Brand />;
  if (view === "analytics" || view === "growth-report")
    return <Analytics report={view === "growth-report"} />;
  if (view === "messages" || view === "direct-rules")
    return <Direct inbox={view === "messages"} />;
  if (view === "campaigns") return <Campaigns />;
  if (view === "competitors")
    return (
      <>
        <Competitors />
        <CompetitorAnalysis />
      </>
    );
  return null;
}
function Ideas() {
  const { fa } = useSocial();
  const [data, setData] = useState<Row | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "ایده‌های محتوا" : "Content ideas"}</h3>
      <Form
        title={fa ? "دریافت ایده‌ها" : "Get ideas"}
        fields={[]}
        url={API + "content-ideas"}
        method="GET"
        onDone={setData}
        caution={
          fa
            ? "ایده‌ها برای بررسی شما آماده می‌شوند و خودکار منتشر نمی‌شوند."
            : "Ideas are prepared for your review and are not published automatically."
        }
      />
      {data && (
        <Records
          items={rows(data.ideas)}
          columns={[
            f("title", "ایده", "Idea"),
            f("format", "فرمت", "Format"),
            f("why", "دلیل", "Why"),
          ]}
        />
      )}
    </section>
  );
}
function Quality() {
  const { fa } = useSocial();
  const [data, setData] = useState<Row | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "بررسی کیفیت متن" : "Caption quality check"}</h3>
      <Form
        title={fa ? "بررسی بدون تولید AI" : "Check without AI generation"}
        url={API + "quality"}
        fields={[
          f("caption", "کپشن", "Caption", "textarea"),
          f(
            "hashtags",
            "هشتگ‌ها با فاصله",
            "Space-separated hashtags",
            "text",
            undefined,
            true,
          ),
          f("format", "فرمت", "Format", "select", [
            "IMAGE",
            "REELS",
            "CAROUSEL",
          ]),
        ]}
        map={(d) => ({
          ...d,
          hashtags: String(d.hashtags ?? "")
            .split(/\s+/)
            .filter(Boolean),
        })}
        onDone={setData}
      />
      {data && (
        <>
          <p>
            {fa ? "امتیاز" : "Score"}: {String(data.score ?? "—")}/100
          </p>
          <Records
            items={rows(data.findings)}
            columns={[f("message", "پیشنهاد", "Suggestion")]}
          />
        </>
      )}
    </section>
  );
}
function ImageAnalysis() {
  const { fa, lang } = useSocial();
  const costs = useData("/api/credits/costs");
  const rates = costs.data?.costs as Row | undefined;
  const rate = rates?.tool_social_ig_image ?? rates?.tool;
  const [data, setData] = useState<Row | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "تحلیل سبک تصویر" : "Reference image analysis"}</h3>
      <Status {...costs} />
      {typeof rate === "number" && (
        <>
          <p>
            {rate} {fa ? "کردیت" : "credits"}
          </p>
          <Form
            title={
              fa ? "تحلیل تصویر با این هزینه" : "Analyze image at this cost"
            }
            url={IG + "analyze-image"}
            fields={[
              f("imageUrl", "آدرس تصویر مرجع", "Reference image URL", "url"),
              f(
                "businessName",
                "نام کسب‌وکار",
                "Business name",
                "text",
                undefined,
                true,
              ),
              f(
                "businessType",
                "نوع کسب‌وکار",
                "Business type",
                "text",
                undefined,
                true,
              ),
            ]}
            map={(d) => ({ ...d, language: lang === "fa" ? "fa" : "en" })}
            onDone={setData}
            caution={
              fa
                ? "تصویر به سرویس تحلیل ارسال می‌شود؛ خروجی برای بررسی شماست."
                : "The image is sent for analysis; results are for your review."
            }
          />
        </>
      )}
      {data && (
        <>
          {["styleDescription", "imagePrompt", "caption"].map((key) => (
            <p key={key} style={{ whiteSpace: "pre-wrap" }}>
              {String(data[key] ?? "")}
            </p>
          ))}
          <p>{Array.isArray(data.hashtags) ? data.hashtags.join(" ") : ""}</p>
          {typeof data.imagePrompt === "string" && !!data.imagePrompt.trim() && <Link className="btn" href={`/image/generate?prompt=${encodeURIComponent(data.imagePrompt)}`}>{fa ? "ساخت تصویر با این پرامپت" : "Use this prompt in Image Studio"}</Link>}
        </>
      )}
    </section>
  );
}
function CalendarDraft() {
  const { fa, lang } = useSocial();
  const [posts, setPosts] = useState<Row[] | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "پیش‌نویس تقویم هفتگی" : "Weekly calendar draft"}</h3>
      <Form
        title={fa ? "آماده‌سازی تقویم" : "Prepare calendar"}
        url={IG + "generate-calendar"}
        fields={[
          f("businessName", "نام کسب‌وکار", "Business name"),
          f("businessType", "نوع کسب‌وکار", "Business type"),
          f("topic", "موضوع", "Topic", "textarea", undefined, true),
        ]}
        map={(d) => ({ ...d, language: lang === "fa" ? "fa" : "en" })}
        onDone={(d) => {
          const result = rows(d.posts);
          if (!result.length) throw Error("EMPTY_RESULT");
          setPosts(result);
        }}
        caution={
          fa
            ? "این عملیات فقط پیش‌نویس می‌سازد؛ هیچ پستی زمان‌بندی یا منتشر نمی‌شود."
            : "This creates drafts only; no post is scheduled or published."
        }
      />
      {posts && (
        <Records
          items={posts.map((p) => ({
            ...p,
            hashtags: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
          }))}
          columns={[
            f(
              "dayOffset",
              "روز پس از فردا (۰ تا ۶)",
              "Day offset from tomorrow (0–6)",
            ),
            f("caption", "کپشن", "Caption"),
            f("hashtags", "هشتگ‌ها", "Hashtags"),
          ]}
          actions={post => <Form title={fa ? "زمان‌بندی این پیش‌نویس" : "Schedule this draft"} url={IG + "schedule"} fields={[f("caption", "کپشن", "Caption", "textarea"), f("hashtags", "هشتگ‌ها", "Hashtags", "text", undefined, true), f("scheduledFor", "زمان انتشار", "Publish at", "datetime-local")]} initial={{ caption: post.caption, hashtags: Array.isArray(post.hashtags) ? post.hashtags.join(" ") : post.hashtags }} map={d => ({ ...d, mode: "manual", scheduledFor: new Date(String(d.scheduledFor)).toISOString() })} onDone={() => {}} caution={fa ? "این مورد به صف دستی افزوده می‌شود؛ انتشار خودکار انجام نمی‌شود." : "This adds the draft to the manual queue; it does not auto-publish."} />}
        />
      )}
    </section>
  );
}
function Webhooks() {
  const { fa } = useSocial();
  const [state, setState] = useState<Row | null>(null);
  return (
    <section className="panel">
      <h3>
        {fa ? "اتصال رویدادهای اینستاگرام" : "Instagram event subscription"}
      </h3>
      <Form
        title={fa ? "بررسی وضعیت" : "Check status"}
        fields={[]}
        url={IG + "webhooks/subscribe"}
        method="GET"
        onDone={setState}
      />
      <Confirm
        title={fa ? "فعال‌سازی دریافت رویدادها" : "Enable event subscription"}
        url={IG + "webhooks/subscribe"}
        onDone={() => {
          setState({ subscribed: true });
        }}
        caution={
          fa
            ? "با این انتخاب دریافت رویدادهای مجاز حساب متصل برای قوانین پاسخ فعال می‌شود."
            : "This subscribes the connected account's authorized events for reply rules."
        }
      />
      {state && (
        <p role="status">
          {state.subscribed
            ? fa
              ? "اشتراک تأیید شد"
              : "Subscription confirmed"
            : fa
              ? "اشتراک تأیید نشده است"
              : "Subscription not confirmed"}
        </p>
      )}
    </section>
  );
}
function CompetitorAnalysis() {
  const { fa } = useSocial();
  return (
    <>
      <PaidResult
        title={fa ? "تحلیل الگوهای رقبا" : "Competitor pattern analysis"}
        feature="social.competitors"
        url={API + "competitors/analyze"}
        fields={[]}
        resultKey="analysis"
      />
      <section className="panel">
        <Form
          title={
            fa
              ? "رد پیشنهاد و ثبت دلیل در هویت برند"
              : "Reject suggestion and record the reason"
          }
          url={API + "competitors/reject"}
          fields={[f("reason", "دلیل رد", "Reason", "textarea")]}
          onDone={() => {}}
        />
      </section>
    </>
  );
}
function Publishing() {
  const { fa } = useSocial();
  const state = useData(IG + "status");
  return (
    <section className="panel">
      <Status {...state} />
      {state.data && (
        <>
          <div className="domain-toolbar">
            <strong>
              {state.data.connected
                ? `@${String(state.data.igUsername ?? "")}`
                : fa
                  ? "حساب متصل نیست"
                  : "No connected account"}
            </strong>
            <a className="btn primary" href={IG + "connect"}>
              {fa ? "اتصال اینستاگرام" : "Connect Instagram"}
            </a>
            <Button onClick={state.reload}>
              {fa ? "تازه‌سازی" : "Refresh"}
            </Button>
            {!!state.data.connected && (
              <Confirm
                title={fa ? "قطع اتصال" : "Disconnect"}
                url={IG + "status"}
                method="DELETE"
                onDone={state.reload}
                caution={
                  fa
                    ? "قطع اتصال، قوانین، کمپین‌ها و صف مرتبط با این حساب را حذف می‌کند. حساب جدید این داده‌ها را به ارث نمی‌برد."
                    : "Disconnecting removes this account's rules, campaigns and publishing queue. A new account will not inherit them."
                }
              />
            )}
          </div>
          <Form
            title={fa ? "زمان‌بندی پست" : "Schedule post"}
            url={IG + "schedule"}
            fields={[
              f("caption", "کپشن", "Caption", "textarea"),
              f("hashtags", "هشتگ‌ها", "Hashtags", "text", undefined, true),
              f("imageUrl", "لینک تصویر", "Image URL", "url", undefined, true),
              f("videoUrl", "لینک ویدیو", "Video URL", "url", undefined, true),
              f("scheduledFor", "زمان انتشار", "Publish at", "datetime-local"),
              f(
                "mode",
                "روش انتشار",
                "Publishing mode",
                "select",
                state.data.canAutoPublish ? ["manual", "auto"] : ["manual"],
              ),
            ]}
            map={(d) => ({
              ...d,
              scheduledFor: new Date(String(d.scheduledFor)).toISOString(),
            })}
            onDone={state.reload}
            caution={
              fa
                ? "حالت خودکار، پست را در زمان انتخاب‌شده روی حساب متصل منتشر می‌کند."
                : "Auto mode publishes to the connected account at the chosen time."
            }
          />
          <Records
            items={rows(state.data.posts)}
            columns={[
              f("caption", "متن", "Caption"),
              f("scheduledFor", "زمان", "Scheduled"),
              f("mode", "روش", "Mode"),
              f("status", "وضعیت", "Status"),
              f("errorMessage", "خطا", "Error"),
            ]}
            actions={(post) => (
              <>
                {post.status === "PENDING" && (
                  <Confirm
                    title={fa ? "لغو پست" : "Cancel post"}
                    url={IG + `schedule/${enc(String(post.id))}`}
                    method="DELETE"
                    onDone={state.reload}
                  />
                )}
                {post.status !== "PUBLISHED" &&
                  !!(post.imageUrl || post.videoUrl) &&
                  !!state.data?.connected && (
                    <Confirm
                      title={fa ? "انتشار اکنون" : "Publish now"}
                      url={IG + "publish"}
                      body={{ postId: post.id }}
                      onDone={state.reload}
                      caution={
                        fa
                          ? "این پست اکنون به‌صورت عمومی روی حساب متصل منتشر می‌شود."
                          : "This publishes the post publicly to the connected Instagram account now."
                      }
                    />
                  )}
              </>
            )}
          />
        </>
      )}
    </section>
  );
}
function Brand() {
  const { fa } = useSocial();
  const state = useData(API + "brand-profile");
  const profile = (state.data?.profile ?? {}) as Row;
  const pillars = socialPillars(profile.contentPillars);
  return (
    <section className="panel">
      <Status {...state} />
      {state.data && (
        <>
          <Form
            title={fa ? "ویرایش هویت برند" : "Edit brand profile"}
            url={API + "brand-profile"}
            initial={{ ...profile, contentPillars: pillars.join("\n") }}
            fields={[
              f("pageType", "نوع صفحه", "Page type"),
              f("specialty", "تخصص", "Specialty", "textarea", undefined, true),
              f("audience", "مخاطب", "Audience", "textarea", undefined, true),
              f("tone", "لحن", "Tone", "text", undefined, true),
              f(
                "contentPillars",
                "ستون‌های محتوا؛ هر خط یک مورد",
                "Content pillars; one per line",
                "textarea",
                undefined,
                true,
              ),
              f(
                "avoidTopics",
                "موضوعات ممنوع",
                "Topics to avoid",
                "textarea",
                undefined,
                true,
              ),
              f(
                "positioning",
                "جایگاه برند",
                "Positioning",
                "textarea",
                undefined,
                true,
              ),
            ]}
            map={(d) => ({
              ...d,
              contentPillars: String(d.contentPillars ?? "")
                .split("\n")
                .filter(Boolean),
            })}
            onDone={state.reload}
          />
          <Records
            items={[profile]}
            columns={[
              f("pageType", "نوع صفحه", "Page type"),
              f("audience", "مخاطب", "Audience"),
              f("tone", "لحن", "Tone"),
              f("positioning", "جایگاه", "Positioning"),
            ]}
          />
        </>
      )}
    </section>
  );
}
function PaidResult({
  title,
  feature,
  url,
  fields,
  map,
  resultKey,
}: {
  title: string;
  feature: string;
  url: string;
  fields: Field[];
  map?: (d: Row) => Row;
  resultKey: string;
}) {
  const { fa } = useSocial();
  const costs = useData("/api/credits/costs");
  const rates = costs.data?.costs as Row | undefined;
  const rate = rates?.["tool_" + feature.replace(/[.-]/g, "_")] ?? rates?.tool;
  const [result, setResult] = useState("");
  return (
    <section className="panel">
      <h3>{title}</h3>
      <Status {...costs} />
      {typeof rate === "number" && (
        <>
          <p>
            {rate}{" "}
            {fa
              ? "کردیت؛ خروجی پیش‌نویس است و خودکار منتشر نمی‌شود."
              : "credits; the output is a draft and is not published automatically."}
          </p>
          <Form
            title={fa ? "تولید با این هزینه" : "Generate at this cost"}
            fields={fields}
            url={url}
            map={map}
            onDone={(d) => setResult(socialDraft(d, resultKey))}
            caution={
              fa
                ? "با ارسال، عملیات هوش مصنوعی با هزینهٔ نمایش‌داده‌شده اجرا می‌شود."
                : "Submitting runs AI at the displayed credit cost."
            }
          />
        </>
      )}
      {result && (
        <div
          className="panel"
          aria-live="polite"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {result}
        </div>
      )}
    </section>
  );
}
function Studio() {
  const { lang, fa } = useSocial();
  return (
    <PaidResult
      title={fa ? "استودیوی محتوای اینستاگرام" : "Instagram content studio"}
      feature="social.generate"
      url={IG + "studio"}
      resultKey="content"
      fields={[
        f("task", "نوع خروجی", "Output type", "select", [
          "caption",
          "hooks",
          "carousel",
          "calendar",
          "hashtags",
          "humanize",
          "profile",
        ]),
        f("brief", "موضوع و توضیحات", "Brief", "textarea"),
      ]}
      map={(d) => ({ ...d, language: lang })}
    />
  );
}
function Analytics({ report }: { report: boolean }) {
  const { fa, lang } = useSocial();
  const state = useData(IG + "analytics");
  return (
    <>
      <section className="panel">
        <Status {...state} />
        {state.data && (
          <>
            <Button onClick={state.reload}>
              {fa ? "تازه‌سازی آمار" : "Refresh analytics"}
            </Button>
            {!!state.data.mediaError && (
              <p role="alert">{String(state.data.mediaError)}</p>
            )}
            <Records
              items={rows(state.data.trend)}
              columns={[
                f("date", "تاریخ", "Date"),
                f("followersCount", "دنبال‌کننده", "Followers"),
                f("mediaCount", "پست‌ها", "Posts"),
              ]}
            />
            <Records
              items={rows(state.data.recentMedia)}
              columns={[
                f("caption", "پست", "Post"),
                f("mediaType", "نوع", "Type"),
                f("views", "بازدید", "Views"),
                f("likeCount", "پسند", "Likes"),
                f("commentsCount", "کامنت", "Comments"),
              ]}
            />
          </>
        )}
      </section>
      {report && (
        <PaidResult
          title={
            fa ? "گزارش رشد از آمار واقعی" : "Growth report from actual metrics"
          }
          feature="social.ig-report"
          url={IG + "analytics/report"}
          fields={[]}
          map={() => ({ language: lang === "fa" ? "fa" : "en" })}
          resultKey="report"
        />
      )}
    </>
  );
}
function Direct({ inbox }: { inbox: boolean }) {
  const { fa } = useSocial();
  const state = useData(IG + "direct-rules");
  const delivery = [
    f(
      "followGateEnabled",
      "شرط دنبال‌کردن",
      "Follow gate",
      "checkbox",
      undefined,
      true,
    ),
    f(
      "typingIndicatorEnabled",
      "نمایش تایپ",
      "Typing indicator",
      "checkbox",
      undefined,
      true,
    ),
    f(
      "delayMinSeconds",
      "حداقل تأخیر ۰ تا ۵ ثانیه",
      "Minimum delay, 0–5 seconds",
      "number",
    ),
    f(
      "delayMaxSeconds",
      "حداکثر تأخیر ۰ تا ۵ ثانیه",
      "Maximum delay, 0–5 seconds",
      "number",
    ),
  ];
  return (
    <section className="panel">
      <Status {...state} />
      {state.data && (
        <>
          <Button onClick={state.reload}>{fa ? "تازه‌سازی" : "Refresh"}</Button>
          {!inbox && (
            <>
              <Form
                title={fa ? "قانون پاسخ جدید" : "New reply rule"}
                url={IG + "direct-rules"}
                fields={[
                  f("name", "نام", "Name"),
                  f("triggerType", "نوع محرک", "Trigger type", "select", [
                    "keyword",
                    "all_messages",
                    "ai_fallback",
                  ]),
                  f(
                    "keywords",
                    "کلمات کلیدی با ویرگول",
                    "Comma-separated keywords",
                    "text",
                    undefined,
                    true,
                  ),
                  f("response", "پاسخ", "Response", "textarea"),
                  ...delivery,
                ]}
                initial={{ delayMinSeconds: 0, delayMaxSeconds: 0 }}
                onDone={state.reload}
                caution={
                  fa
                    ? "این قانون پس از ذخیره می‌تواند به پیام‌های ورودی حساب متصل پاسخ بدهد."
                    : "Once saved this rule can reply to incoming messages on the connected account."
                }
              />
              <Records
                items={rows(state.data.rules)}
                columns={[
                  f("name", "نام", "Name"),
                  f("keywords", "کلمات", "Keywords"),
                  f("response", "پاسخ", "Response"),
                  f("isActive", "فعال", "Active"),
                ]}
                actions={(r) => (
                  <>
                    <Confirm
                      title={
                        r.isActive
                          ? fa
                            ? "توقف"
                            : "Pause"
                          : fa
                            ? "فعال‌سازی"
                            : "Enable"
                      }
                      url={IG + `direct-rules/${enc(String(r.id))}`}
                      method="PATCH"
                      body={{ isActive: !r.isActive }}
                      onDone={state.reload}
                    />
                    <Form
                      title={fa ? "ویرایش" : "Edit"}
                      url={IG + `direct-rules/${enc(String(r.id))}`}
                      method="PATCH"
                      fields={[
                        f("name", "نام", "Name"),
                        f("response", "پاسخ", "Response", "textarea"),
                        ...delivery,
                      ]}
                      initial={r}
                      onDone={state.reload}
                    />
                    <Confirm
                      title={fa ? "حذف قانون" : "Delete rule"}
                      url={IG + `direct-rules/${enc(String(r.id))}`}
                      method="DELETE"
                      onDone={state.reload}
                    />
                  </>
                )}
              />
            </>
          )}
          <h3>{fa ? "پیام‌های اخیر" : "Recent messages"}</h3>
          <Records
            items={rows(state.data.recentMessages)}
            columns={[
              f("senderId", "فرستنده", "Sender"),
              f("direction", "جهت", "Direction"),
              f("text", "پیام", "Message"),
              f("status", "وضعیت", "Status"),
              f("createdAt", "زمان", "Time"),
            ]}
            actions={(r) =>
              r.direction === "inbound" && (
                <Reply recipient={String(r.senderId)} onDone={state.reload} />
              )
            }
          />
        </>
      )}
    </section>
  );
}
function Reply({
  recipient,
  onDone,
}: {
  recipient: string;
  onDone: () => void;
}) {
  const { fa } = useSocial();
  const pending = useRef<{ text: string; id: string } | null>(null);
  return (
    <Form
      title={fa ? "پاسخ به این مخاطب" : "Reply to this sender"}
      url={IG + "inbox/reply"}
      fields={[f("text", "متن پاسخ", "Reply text", "textarea")]}
      map={(d) => {
        const text = String(d.text);
        if (!pending.current || pending.current.text !== text)
          pending.current = { text, id: crypto.randomUUID() };
        return { text, recipientId: recipient, requestId: pending.current.id };
      }}
      onDone={() => {
        pending.current = null;
        onDone();
      }}
      caution={
        fa
          ? "این پاسخ به مخاطب نشان‌داده‌شده در اینستاگرام ارسال می‌شود. در صورت نامشخص بودن نتیجه، پیش از ارسال دوباره تاریخچه را بررسی کنید."
          : "This sends to the displayed Instagram sender. If the result is uncertain, check history before resending."
      }
    />
  );
}
function Campaigns() {
  const { fa } = useSocial();
  const state = useData(IG + "campaigns");
  const [logs, setLogs] = useState<Row[] | null>(null),
    [error, setError] = useState("");
  const fields = [
    f(
      "linksText",
      "حداکثر دو لینک؛ هر خط: عنوان | آدرس",
      "Up to two links; one label | URL per line",
      "textarea",
      undefined,
      true,
    ),
    f("name", "نام کمپین", "Campaign name"),
    f("keyword", "کلمهٔ محرک", "Trigger keyword"),
    f("dmMessage", "پیام دایرکت", "Direct message", "textarea"),
    f(
      "publicReplyMessage",
      "پاسخ عمومی",
      "Public reply",
      "textarea",
      undefined,
      true,
    ),
    f(
      "postId",
      "شناسه پست؛ خالی برای همه",
      "Post ID; empty for all",
      "text",
      undefined,
      true,
    ),
    f(
      "followGateEnabled",
      "شرط دنبال‌کردن",
      "Follow gate",
      "checkbox",
      undefined,
      true,
    ),
    f(
      "followGatePrompt",
      "متن شرط دنبال‌کردن",
      "Follow-gate prompt",
      "textarea",
      undefined,
      true,
    ),
  ];
  return (
    <section className="panel">
      <Status {...state} />
      <Form
        title={fa ? "کمپین جدید" : "New campaign"}
        url={IG + "campaigns"}
        fields={fields}
        map={(d) => {
          const { linksText, ...rest } = d;
          return { ...rest, links: campaignLinks(String(linksText ?? "")) };
        }}
        onDone={state.reload}
        caution={
          fa
            ? "کمپین می‌تواند در پاسخ به کامنت‌ها پیام ارسال کند؛ متن و محدودهٔ پست‌ها را بررسی کنید."
            : "Campaigns can send replies to comments. Review the message and post scope."
        }
      />
      {error && <p role="alert">{error}</p>}
      {state.data && (
        <Records
          items={rows(state.data.campaigns)}
          columns={[
            f("name", "نام", "Name"),
            f("keyword", "محرک", "Keyword"),
            f("dmMessage", "پیام", "Message"),
            f("isActive", "فعال", "Active"),
          ]}
          actions={(r) => (
            <>
              <Form
                title={fa ? "ویرایش" : "Edit"}
                url={IG + `campaigns/${enc(String(r.id))}`}
                method="PATCH"
                fields={fields}
                initial={{
                  ...r,
                  linksText: (() => {
                    try {
                      return rows(JSON.parse(String(r.links ?? "[]")))
                        .map((l) => `${l.label} | ${l.url}`)
                        .join("\n");
                    } catch {
                      return "";
                    }
                  })(),
                }}
                map={(d) => {
                  const { linksText, ...rest } = d;
                  return {
                    ...rest,
                    links: campaignLinks(String(linksText ?? "")),
                  };
                }}
                onDone={state.reload}
              />
              <Confirm
                title={
                  r.isActive
                    ? fa
                      ? "توقف"
                      : "Pause"
                    : fa
                      ? "فعال‌سازی"
                      : "Enable"
                }
                url={IG + `campaigns/${enc(String(r.id))}`}
                method="PATCH"
                body={{ isActive: !r.isActive }}
                onDone={state.reload}
              />
              <Button
                onClick={async () => {
                  try {
                    const d = await request(
                      IG + `campaigns/${enc(String(r.id))}/logs`,
                    );
                    setLogs(rows(d.logs));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {fa ? "گزارش ارسال" : "Delivery log"}
              </Button>
              <Confirm
                title={fa ? "حذف کمپین" : "Delete campaign"}
                url={IG + `campaigns/${enc(String(r.id))}`}
                method="DELETE"
                onDone={state.reload}
              />
            </>
          )}
        />
      )}
      {logs && (
        <Modal
          title={fa ? "گزارش ارسال" : "Delivery log"}
          onClose={() => setLogs(null)}
        >
          <Records
            items={logs}
            columns={[
              f("commentText", "کامنت", "Comment"),
              f("status", "وضعیت", "Status"),
              f("errorMessage", "خطا", "Error"),
              f("createdAt", "زمان", "Time"),
            ]}
          />
        </Modal>
      )}
    </section>
  );
}
function Competitors() {
  const { fa } = useSocial();
  const state = useData(API + "competitors");
  return (
    <section className="panel">
      <Status {...state} />
      {state.data && (
        <>
          <p>
            {state.data.enabled
              ? fa
                ? "منبع دریافت اطلاعات فعال است."
                : "The data source is enabled."
              : fa
                ? "منبع آمار رقبا غیرفعال است؛ فقط فهرست ذخیره‌شده نمایش داده می‌شود."
                : "The competitor data source is disabled; showing saved records only."}
          </p>
          <Form
            title={fa ? "افزودن رقیب" : "Add competitor"}
            url={API + "competitors"}
            fields={[
              f("username", "نام کاربری", "Username"),
              f("label", "عنوان", "Label", "text", undefined, true),
            ]}
            onDone={state.reload}
            caution={
              fa
                ? "در صورت فعال بودن منبع داده، دریافت آمار رقیب نیز انجام می‌شود."
                : "If the data source is enabled, this also fetches the competitor's metrics."
            }
          />
          <Records
            items={rows(state.data.competitors)}
            columns={[
              f("username", "حساب", "Account"),
              f("followersCount", "دنبال‌کننده", "Followers"),
              f("mediaCount", "پست", "Posts"),
              f("lastCheckedAt", "آخرین بررسی", "Last checked"),
              f("lastError", "خطا", "Error"),
            ]}
            actions={(r) => (
              <>
                {!!state.data?.enabled && (
                  <Confirm
                    title={fa ? "تازه‌سازی آمار" : "Refresh metrics"}
                    url={API + `competitors/${enc(String(r.id))}/refresh`}
                    onDone={state.reload}
                  />
                )}
                <Confirm
                  title={fa ? "حذف رقیب" : "Remove competitor"}
                  url={API + `competitors?id=${enc(String(r.id))}`}
                  method="DELETE"
                  onDone={state.reload}
                />
              </>
            )}
          />
        </>
      )}
    </section>
  );
}
