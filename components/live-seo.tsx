"use client";
import { useEffect, useRef, useState } from "react";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import { LiveStreamTool } from "./live-stream-tool";
import { LivePaidForm } from "./live-paid-form";
import { seoResearchInput, seoTopics } from "@/lib/seo-contract";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  liveRequest,
  type LiveRow,
} from "./live-module-kit";
const API = "/api/seo/",
  enc = encodeURIComponent;
/** Escaped, read-only provider/audit evidence; no provider HTML is executed. */
function Evidence({ value }: { value: unknown }) {
  if (value == null) return <span>—</span>;
  if (Array.isArray(value))
    return (
      <div>
        {value.map((v, i) => (
          <div className="domain-card" key={i}>
            <Evidence value={v} />
          </div>
        ))}
      </div>
    );
  if (typeof value === "object")
    return (
      <dl>
        {Object.entries(value as LiveRow)
          .filter(([, v]) => v != null)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="muted">{k}</dt>
              <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                <Evidence value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return <span>{String(value)}</span>;
}
export function LiveSeo({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    sites = useLiveData(API + "sites");
  const [id, setId] = useState("");
  const list = liveRows(sites.data?.sites),
    selected = list.find((s) => s.id === id) ?? list[0];
  return (
    <LiveModuleFrame module={module} view={view}>
      <section className="panel">
        <LiveLoad {...sites} />
        {sites.data && (
          <>
            <label>
              {fa ? "وب‌سایت" : "Website"}
              <select
                value={String(selected?.id ?? "")}
                onChange={(e) => setId(e.target.value)}
              >
                <option value="">{fa ? "انتخاب سایت" : "Select a site"}</option>
                {list.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name)} — {String(s.url)}
                  </option>
                ))}
              </select>
            </label>
            <LiveForm
              title={fa ? "افزودن سایت" : "Add website"}
              url={API + "sites"}
              fields={[
                field("url", "آدرس سایت", "Website address"),
                field("name", "نام", "Name", "text", true),
              ]}
              onDone={(d) => {
                setId(String((d.site as LiveRow).id));
                sites.reload();
              }}
            />
            <p>
              {fa ? "سقف سایت‌های پلن: " : "Plan website limit: "}
              {String(sites.data.limit ?? "—")}
            </p>
          </>
        )}
      </section>
      {["overview", "sites"].includes(view.id) && (
        <section className="panel">
          <LiveTable
            items={list}
            columns={[
              field("name", "نام", "Name"),
              field("url", "آدرس", "URL"),
              field("lastScore", "آخرین امتیاز", "Latest score"),
              field("verifiedAt", "تأیید مالکیت", "Verified"),
              field("lastAuditAt", "آخرین بررسی", "Latest audit"),
            ]}
            actions={(s) => (
              <>
                <Button onClick={() => setId(String(s.id))}>
                  {fa ? "انتخاب" : "Select"}
                </Button>
                <LiveForm
                  title={fa ? "تنظیم بررسی دوره‌ای" : "Audit schedule"}
                  url={API + "sites/" + enc(String(s.id))}
                  method="PATCH"
                  fields={[
                    field("name", "نام", "Name"),
                    field(
                      "autoAudit",
                      "بررسی خودکار",
                      "Automatic audit",
                      "checkbox",
                    ),
                    {
                      ...field("frequency", "تناوب", "Frequency"),
                      choices: ["daily", "weekly", "monthly"].map((value) => ({
                        value,
                        label: fa
                          ? ({
                              daily: "روزانه",
                              weekly: "هفتگی",
                              monthly: "ماهانه",
                            }[value] ?? value)
                          : value,
                      })),
                    },
                  ]}
                  initial={s}
                  onDone={sites.reload}
                />
                <LiveForm
                  title={fa ? "توقف ردیابی سایت" : "Stop tracking site"}
                  url={API + "sites/" + enc(String(s.id))}
                  method="DELETE"
                  onDone={sites.reload}
                  caution={
                    fa
                      ? "ردیابی و بررسی دوره‌ای متوقف می‌شود؛ سابقه پژوهش‌های هزینه‌دار طبق قواعد سرور حفظ می‌شود."
                      : "Tracking and scheduled audits stop. Billed research history is retained according to server rules."
                  }
                />
              </>
            )}
          />
        </section>
      )}
      {view.id === "url" && <UrlAudit />}
      {["keyword", "content", "meta"].includes(view.id) && (
        <LiveStreamTool
          title={view.title[fa ? 0 : 1]}
          feature="seo.analyze"
          url={API + "analyze"}
          fields={[
            field("keyword", "کلمه کلیدی", "Keyword"),
            ...(view.id === "keyword"
              ? []
              : [field("content", "متن صفحه", "Page content", "textarea")]),
          ]}
          map={(b) => ({ ...b, tool: view.id, language: fa ? "fa" : "en" })}
        />
      )}{" "}
      {view.id === "wordpress" && <Connections />}
      {view.id === "search-console" && <SearchConsole />}
      {view.id === "lessons" && <Lessons />}
      {["posts", "agent-pipeline", "content"].includes(view.id) && <Posts />}
      {selected && (
        <SiteTools
          key={String(selected.id) + view.id}
          site={selected}
          view={view.id}
          onChange={sites.reload}
        />
      )}
    </LiveModuleFrame>
  );
}
function UrlAudit() {
  const shell = useShell()!,
    fa = shell.lang === "fa";
  const [result, setResult] = useState<LiveRow | null>(null);
  const [plan, setPlan] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <LiveForm
        title={
          fa
            ? "بررسی فنی بدون تولید AI"
            : "Technical audit without AI generation"
        }
        url={API + "analyze-url"}
        fields={[field("url", "آدرس صفحه", "Page URL")]}
        map={(b) => ({ ...b, language: shell.lang })}
        onDone={setResult}
      />
      {result && <Evidence value={result} />}
      {result && (
        <>
          <LivePaidForm
            feature="seo.improve"
            title={fa ? "برنامه بهبود با AI" : "AI improvement plan"}
            url={API + "improve"}
            fields={[
              field(
                "targetKeyword",
                "کلمه کلیدی هدف",
                "Target keyword",
                "text",
                true,
              ),
            ]}
            map={(b) => ({ ...b, url: result.url, language: shell.lang })}
            onDone={setPlan}
          />
          {plan && (
            <>
              <Evidence value={plan.plan} />
              <ApplySeo url={String(result.url)} />
            </>
          )}
        </>
      )}
    </section>
  );
}
function SiteTools({
  site,
  view,
  onChange,
}: {
  site: LiveRow;
  view: string;
  onChange: () => void;
}) {
  const fa = useShell()!.lang === "fa",
    id = String(site.id);
  if (view === "verify") return <Verification id={id} onChange={onChange} />;
  if (["overview", "sites"].includes(view)) return <Audits id={id} />;
  if (
    [
      "intelligence",
      "rankings",
      "backlinks",
      "competitors",
      "keyword",
    ].includes(view)
  )
    return (
      <Research
        id={id}
        initial={
          view === "rankings"
            ? "rank"
            : view === "backlinks"
              ? "backlinks"
              : view === "competitors"
                ? "competitors"
                : "keywords"
        }
      />
    );
  if (["plan", "agent-pipeline"].includes(view)) return <ContentPlan id={id} />;
  return null;
}
function Verification({ id, onChange }: { id: string; onChange: () => void }) {
  const fa = useShell()!.lang === "fa";
  const [challenge, setChallenge] = useState<LiveRow | null>(null),
    [verified, setVerified] = useState(false);
  return (
    <section className="panel">
      <h3>
        {fa
          ? "تأیید مالکیت داخلی AIFekr"
          : "AIFekr site ownership verification"}
      </h3>
      <p>
        {fa
          ? "این تأیید مستقل از Search Console است. مقدار را دقیقاً در DNS یا فایل دامنه قرار دهید و سپس بررسی کنید."
          : "This verification is separate from Search Console. Place the exact value in DNS or the domain verification file, then check it."}
      </p>
      <LiveForm
        title={fa ? "دریافت اطلاعات تأیید" : "Get verification instructions"}
        url={API + "intelligence/sites"}
        map={() => ({ siteId: id })}
        onDone={setChallenge}
      />
      {challenge && (
        <>
          <Evidence value={challenge} />
          <LiveForm
            title={fa ? "بررسی رکورد TXT" : "Check DNS TXT"}
            url={API + "intelligence/sites"}
            map={() => ({ siteId: id, verify: true, method: "dns" })}
            onDone={() => {
              setVerified(true);
              onChange();
            }}
          />
          <LiveForm
            title={fa ? "بررسی فایل تأیید" : "Check verification file"}
            url={API + "intelligence/sites"}
            map={() => ({ siteId: id, verify: true, method: "file" })}
            onDone={() => {
              setVerified(true);
              onChange();
            }}
          />
        </>
      )}
      {verified && (
        <p role="status">{fa ? "مالکیت تأیید شد." : "Ownership verified."}</p>
      )}
    </section>
  );
}
function Audits({ id }: { id: string }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "sites/" + enc(id) + "/audits");
  const [audit, setAudit] = useState<string | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "بررسی‌ها و روند سایت" : "Website audits and history"}</h3>
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "اجرای بررسی فنی سایت" : "Run technical site audit"}
        url={API + "sites/" + enc(id) + "/audit"}
        onDone={(d) => {
          setAudit(String(d.auditId));
          r.reload();
        }}
        caution={
          fa
            ? "صفحات عمومی سایت خوانده و نتیجه بررسی ذخیره می‌شود."
            : "Public website pages are crawled and the audit result is saved."
        }
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.audits)}
          columns={[
            field("createdAt", "تاریخ", "Date"),
            field("score", "امتیاز", "Score"),
            field("mobileScore", "امتیاز موبایل", "Mobile score"),
            field("pagesCrawled", "صفحات", "Pages"),
            field("failCount", "خطاها", "Failures"),
            field("warnCount", "هشدارها", "Warnings"),
          ]}
          actions={(a) => (
            <Button onClick={() => setAudit(String(a.id))}>
              {fa ? "جزئیات" : "Details"}
            </Button>
          )}
        />
      )}
      {audit && <AuditEvidence id={audit} />}
    </section>
  );
}
function AuditEvidence({ id }: { id: string }) {
  const fa = useShell()!.lang === "fa";
  const r = useLiveData(API + "audits/" + enc(id));
  return (
    <>
      <LiveLoad {...r} />
      {r.data && <Evidence value={r.data} />}
      {r.data && (
        <LivePaidForm
          feature="seo.improve"
          title={fa ? "ذخیره برنامه بهبود AI" : "Save AI improvement plan"}
          url={API + "audits/" + enc(id) + "/improve"}
          fields={[
            field(
              "targetKeyword",
              "کلمه کلیدی هدف",
              "Target keyword",
              "text",
              true,
            ),
          ]}
          onDone={r.reload}
        />
      )}
    </>
  );
}
function ApplySeo({ url }: { url: string }) {
  const fa = useShell()!.lang === "fa";
  const [result, setResult] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <LiveForm
        title={
          fa
            ? "اعمال عنوان و متا پس از بازبینی"
            : "Apply reviewed title and metadata"
        }
        url={API + "apply"}
        fields={[
          field("title", "عنوان جدید", "New title", "text", true),
          field(
            "metaDescription",
            "توضیحات متا",
            "Meta description",
            "textarea",
            true,
          ),
          field(
            "focusKeyword",
            "کلمه کلیدی هدف",
            "Focus keyword",
            "text",
            true,
          ),
          field(
            "websiteId",
            "شناسه سایت ساخته‌شده در AIFekr (در صورت نیاز)",
            "AIFekr generated website ID (if applicable)",
            "text",
            true,
          ),
        ]}
        map={(b) => ({ ...b, url })}
        onDone={setResult}
        caution={
          fa
            ? "این عملیات محتوای واقعی سایت متصل را تغییر می‌دهد. متن‌ها و آدرس صفحه را پیش از تأیید بررسی کنید."
            : "This modifies the real connected website. Review the values and target page before confirming."
        }
      />
      {result && <Evidence value={result} />}
    </section>
  );
}
/** The research tools by name (the same eight as the classic SEO Intelligence page). */
const RESEARCH_LABELS: Record<string, [string, string]> = {
  keywords: ["پژوهش کلمات کلیدی", "Keyword explorer"],
  rank: ["بررسی زندهٔ رتبه", "Live rank check"],
  competitors: ["رقبای دامنه", "Domain competitors"],
  backlinks: ["بک‌لینک‌ها", "Backlinks"],
  referringDomains: ["دامنه‌های ارجاع‌دهنده", "Referring domains"],
  keywordGap: ["شکاف کلمات رقبا", "Competitor keyword gaps"],
  aiVisibility: ["حضور در جست‌وجوی هوش مصنوعی", "AI search visibility"],
  backlinkHistory: ["تاریخچهٔ بک‌لینک", "Backlink history"],
};
type Market = { location_code: number; location_name: string; available_languages: { language_code: string; language_name: string }[] };
/** Markets the search-data provider supports (countries, then their languages), as on the classic page. */
function useMarkets(kind: "labs" | "ai") {
  const [markets, setMarkets] = useState<Market[]>([]);
  useEffect(() => {
    const c = new AbortController();
    fetch(API + "intelligence/markets?kind=" + kind, { credentials: "include", signal: c.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.markets && !c.signal.aborted) setMarkets(d.markets); })
      .catch(() => {});
    return () => c.abort();
  }, [kind]);
  return markets;
}

function Research({ id, initial }: { id: string; initial: string }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "intelligence/research?siteId=" + enc(id));
  const [quote, setQuote] = useState<{
      input: LiveRow;
      credits: number;
      key: string;
    } | null>(null),
    [selected, setSelected] = useState<LiveRow | null>(null);
  const key = useRef("");
  const markets = useMarkets(initial === "aiVisibility" ? "ai" : "labs");
  const languages = [...new Map(markets.flatMap((m) => m.available_languages).map((l) => [l.language_code, l.language_name])).entries()];
  const actions = [
    "keywords",
    "rank",
    "competitors",
    "backlinks",
    "referringDomains",
    "keywordGap",
    "aiVisibility",
    "backlinkHistory",
  ];
  return (
    <section className="panel">
      <h3>
        {fa ? "پژوهش مبتنی بر داده واقعی" : "Research from measured data"}
      </h3>
      <p>
        {fa
          ? "کشور و زبان جستجو مستقل از زبان رابط هستند. کد بازار باید توسط ارائه‌دهنده پشتیبانی شود. ابتدا هزینه محاسبه می‌شود؛ اجرا فقط با تأیید شماست."
          : "Search market and language are independent of the interface. The provider must support the market code. Preview the cost, then explicitly confirm execution."}
      </p>
      <LiveForm
        title={fa ? "محاسبه هزینه" : "Preview cost"}
        url={API + "intelligence/research"}
        fields={[
          {
            ...field("action", "نوع بررسی", "Research type"),
            choices: actions.map((value) => ({ value, label: (RESEARCH_LABELS[value] ?? [value, value])[fa ? 0 : 1] })),
          },
          field("keyword", "کلمه کلیدی", "Keyword", "text", true),
          markets.length
            ? { ...field("locationCode", "کشور بازار هدف", "Target market"), choices: markets.map((m) => ({ value: String(m.location_code), label: m.location_name })) }
            : field("locationCode", "کد کشور بازار (مثال 2840 برای آمریکا)", "Market location code (e.g. 2840 for US)", "number"),
          languages.length
            ? { ...field("languageCode", "زبان جستجو", "Search language"), choices: languages.map(([value, label]) => ({ value, label })) }
            : field("languageCode", "زبان جستجو (fa / en / de / tr)", "Search language (fa / en / de / tr)"),
          field(
            "rows",
            "تعداد نتایج، ۱ تا ۱۰۰",
            "Result count, 1 to 100",
            "number",
          ),
          field(
            "competitorDomain",
            "دامنه رقیب بدون https",
            "Competitor domain without https",
            "text",
            true,
          ),
          {
            ...field("device", "دستگاه", "Device"),
            choices: [["desktop", "دسکتاپ", "Desktop"], ["mobile", "موبایل", "Mobile"]].map(([value, f, e]) => ({
              value,
              label: fa ? f : e,
            })),
          },
          {
            ...field("platform", "موتور", "Platform"),
            choices: [["google", "گوگل", "Google"], ["chat_gpt", "ChatGPT", "ChatGPT"]].map(([value, f, e]) => ({
              value,
              label: fa ? f : e,
            })),
          },
        ]}
        key={markets.length ? "markets" : "codes"}
        initial={{
          action: initial,
          ...(markets[0] ? { locationCode: String((markets.find((m) => m.location_code === 2364) ?? markets.find((m) => m.location_code === 2840) ?? markets[0]).location_code) } : {}),
          ...(languages.length ? { languageCode: languages.some(([c]) => c === (fa ? "fa" : "en")) ? (fa ? "fa" : "en") : languages[0][0] } : {}),
          rows: 20,
          device: "desktop",
          platform: "google",
        }}
        submit={async (b) => {
          const input = seoResearchInput(b, id);
          const d = await liveRequest(API + "intelligence/research", "POST", {
            input,
            preview: true,
          });
          const credits = (d.quote as LiveRow)?.credits;
          if (typeof credits !== "number" || credits < 0)
            throw Error("INVALID_QUOTE");
          key.current = crypto.randomUUID();
          setQuote({ input, credits, key: key.current });
          return d;
        }}
        onDone={() => {}}
      />
      {quote && (
        <div className="plan-notice">
          <p>
            {fa ? "هزینه تأییدشده: " : "Quoted cost: "}
            {quote.credits} {fa ? "کردیت" : "credits"}
          </p>
          <LiveForm
            title={fa ? "تأیید و شروع پژوهش" : "Confirm and start research"}
            url={API + "intelligence/research"}
            map={() => ({
              input: quote.input,
              confirmedCredits: quote.credits,
              idempotencyKey: quote.key,
            })}
            onDone={() => {
              setQuote(null);
              r.reload();
            }}
            caution={
              fa
                ? "این اجرا کردیت رزرو می‌کند. در خطای ارتباط، تاریخچه را بررسی کنید؛ همان درخواست با شناسه ثابت تکرار می‌شود."
                : "This reserves credits. Check history after a connection failure; retries of this confirmation retain the same request identifier."
            }
          />
        </div>
      )}
      <LiveLoad {...r} />
      <Button onClick={r.reload}>
        {fa ? "به‌روزرسانی وضعیت" : "Refresh status"}
      </Button>
      {r.data && (
        <LiveTable
          items={liveRows(r.data.jobs)}
          columns={[
            field("action", "نوع", "Type"),
            field("status", "وضعیت", "Status"),
            field("credits", "کردیت", "Credits"),
            field("createdAt", "تاریخ", "Created"),
            field("errorCode", "خطا", "Error"),
            field("refundedAt", "بازگشت کردیت", "Refunded"),
          ]}
          actions={(j) => (
            <Button onClick={() => setSelected(j)}>
              {fa ? "نتیجه" : "Result"}
            </Button>
          )}
        />
      )}
      {selected && (
        <Evidence
          value={(() => {
            try {
              return JSON.parse(String(selected.result ?? "null"));
            } catch {
              return selected.result;
            }
          })()}
        />
      )}
      {initial === "rank" && (
        <a href={API + "intelligence/ranks?siteId=" + enc(id) + "&format=csv"}>
          {fa ? "دانلود تاریخچه رتبه CSV" : "Download rank history CSV"}
        </a>
      )}
    </section>
  );
}
function Connections() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "connection");
  const [test, setTest] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && <Evidence value={r.data.connection} />}
      <LiveForm
        title={fa ? "ذخیره اتصال وردپرس" : "Save WordPress connection"}
        url={API + "connection"}
        fields={[
          field("siteUrl", "آدرس سایت", "Site URL", "url"),
          field("wpUsername", "نام کاربری وردپرس", "WordPress username"),
          field(
            "wpAppPassword",
            "رمز برنامه وردپرس",
            "WordPress application password",
            "password",
          ),
        ]}
        map={(b) => ({ ...b, platform: "wordpress" })}
        onDone={r.reload}
        caution={
          fa
            ? "فقط رمز برنامه مخصوص اتصال را وارد کنید. رمز به مرورگر بازگردانده نمی‌شود."
            : "Use a dedicated application password. The password is never returned to the browser."
        }
      />
      <LiveForm
        title={fa ? "آزمایش اتصال ذخیره‌شده" : "Test saved connection"}
        url={API + "wordpress/test"}
        onDone={setTest}
      />
      <LiveForm
        title={fa ? "قطع اتصال" : "Disconnect"}
        url={API + "connection"}
        method="DELETE"
        onDone={r.reload}
        caution={
          fa
            ? "اتصال وردپرس حذف می‌شود. محتوای سایت وردپرس حذف نمی‌شود."
            : "The saved connection is removed. WordPress content is not deleted."
        }
      />
      {test && <Evidence value={test} />}
    </section>
  );
}
function SearchConsole() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "gsc/status");
  const [sites, setSites] = useState<LiveRow | null>(null),
    [report, setReport] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <Evidence value={r.data} />
          <a href={API + "gsc/connect"}>
            {fa ? "اتصال حساب گوگل" : "Connect Google account"}
          </a>
          {!!r.data.connected && (
            <>
              <LiveForm
                title={fa ? "دریافت سایت‌های مجاز" : "Load authorized sites"}
                url={API + "gsc/sites"}
                method="GET"
                onDone={setSites}
              />
              {sites && (
                <LiveTable
                  items={liveRows(sites.sites)}
                  columns={[
                    field("siteUrl", "آدرس", "Site"),
                    field("permissionLevel", "دسترسی", "Permission"),
                  ]}
                  actions={(s) => (
                    <LiveForm
                      title={fa ? "انتخاب سایت" : "Select site"}
                      url={API + "gsc/sites"}
                      map={() => ({ siteUrl: s.siteUrl })}
                      onDone={r.reload}
                    />
                  )}
                />
              )}
              <LiveForm
                title={fa ? "دریافت گزارش ۲۸روزه" : "Load 28-day report"}
                url={API + "gsc/data"}
                method="GET"
                onDone={setReport}
              />
              {report && <Evidence value={report} />}
            </>
          )}
        </>
      )}
    </section>
  );
}
function Lessons() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "agent-pipeline/lessons");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "افزودن درس" : "Add lesson"}
        url={API + "agent-pipeline/lessons"}
        fields={[
          field("agentKey", "شناسه نقش", "Agent key"),
          field("text", "متن درس", "Lesson", "textarea"),
        ]}
        onDone={r.reload}
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.lessons)}
          columns={[
            field("agentKey", "نقش", "Agent"),
            field("text", "درس", "Lesson"),
            field("createdAt", "تاریخ", "Created"),
          ]}
          actions={(l) => (
            <LiveForm
              title={fa ? "حذف" : "Delete"}
              url={API + "agent-pipeline/lessons"}
              method="DELETE"
              map={() => ({ id: l.id })}
              onDone={r.reload}
              caution={
                fa
                  ? "این درس از حافظه تیم حذف می‌شود."
                  : "This lesson is removed from the team memory."
              }
            />
          )}
        />
      )}
    </section>
  );
}
function Posts() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "agent-pipeline/posts");
  const [post, setPost] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <h3>{fa ? "کتابخانه محتوای واقعی" : "Saved content library"}</h3>
      <LiveLoad {...r} />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.posts)}
          columns={[
            field("title", "عنوان", "Title"),
            field("externalStatus", "وضعیت انتشار", "Publishing status"),
            field("externalError", "خطای انتشار", "Publishing error"),
            field("publishedAt", "تاریخ", "Date"),
          ]}
          actions={(p) => (
            <>
              <Button onClick={() => setPost(p)}>
                {fa ? "باز کردن" : "Open"}
              </Button>
              <LiveForm
                title={fa ? "تصویر شاخص" : "Hero image"}
                url={API + "agent-pipeline/posts"}
                method="PATCH"
                fields={[
                  field("heroImageUrl", "نشانی تصویر", "Image URL", "url"),
                ]}
                initial={p}
                map={(b) => ({ ...b, postId: p.id })}
                onDone={r.reload}
              />
            </>
          )}
        />
      )}
      {post && (
        <Evidence
          value={{
            title: post.title,
            content: post.content,
            externalStatus: post.externalStatus,
            externalUrl: post.externalUrl,
          }}
        />
      )}
    </section>
  );
}
function ContentPlan({ id }: { id: string }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "sites/" + enc(id) + "/content-plan"),
    costs = useLiveData("/api/credits/costs");
  const rates = costs.data?.costs as LiveRow | undefined,
    rate = rates?.tool_seo_pipeline ?? rates?.tool;
  const plan = r.data?.plan as LiveRow | undefined;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {plan && (
        <>
          <h3>{fa ? "برنامه تولید محتوا" : "Content production plan"}</h3>
          <LiveForm
            title={fa ? "ذخیره برنامه" : "Save plan"}
            url={API + "sites/" + enc(id) + "/content-plan"}
            method="PUT"
            fields={[
              field("theme", "موضوع کلی", "Theme", "textarea", true),
              field(
                "topics",
                "موضوع‌ها؛ هر خط یک موضوع",
                "Topics; one per line",
                "textarea",
                true,
              ),
              field("brandVoice", "لحن برند", "Brand voice", "textarea", true),
              {
                ...field("frequency", "تناوب", "Frequency"),
                choices: ["daily", "weekly", "monthly"].map((value) => ({
                  value,
                  label: value,
                })),
              },
              {
                ...field("mode", "حالت انتشار", "Publishing mode"),
                choices: ["draft", "publish"].map((value) => ({
                  value,
                  label: fa
                    ? value === "draft"
                      ? "پیش‌نویس وردپرس"
                      : "انتشار عمومی"
                    : value,
                })),
              },
              field(
                "enabled",
                "فعال‌سازی تولید دوره‌ای",
                "Enable scheduled generation",
                "checkbox",
              ),
            ]}
            initial={{
              ...plan,
              topics: Array.isArray(plan.topics) ? plan.topics.join("\n") : "",
            }}
            map={(b) => {
              if (
                b.enabled &&
                (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0)
              )
                throw Error(
                  fa
                    ? "ابتدا تعرفه را دریافت کنید."
                    : "Load the approved rate first.",
                );
              return {
                ...b,
                topics: seoTopics(b.topics),
              };
            }}
            onDone={r.reload}
            caution={
              fa
                ? `فعال‌سازی برنامه باعث تولید دوره‌ای و کسر کردیت می‌شود. هزینه هر مقاله طبق تعرفه: ${typeof rate === "number" ? rate : "نامشخص"} کردیت. حالت انتشار عمومی، مقاله را روی سایت متصل منتشر می‌کند.`
                : `Enabling the schedule generates articles and uses credits. Per-article rate: ${typeof rate === "number" ? rate : "unavailable"} credits. Publish mode posts publicly to the connected site.`
            }
          />
          <LiveLoad {...costs} />
          {typeof rate === "number" && Number.isFinite(rate) && (
            <>
              <p>
                {fa ? "هزینه هر مقاله: " : "Per article: "}
                {rate} {fa ? "کردیت" : "credits"}
              </p>
              <LiveForm
                title={fa ? "نوشتن مقاله مشخص" : "Write an article"}
                url={API + "sites/" + enc(id) + "/content-plan/write"}
                fields={[
                  field(
                    "topic",
                    "موضوع مقاله، حداقل ۵ حرف",
                    "Article topic, at least 5 characters",
                  ),
                ]}
                map={(b) => ({ ...b, mode: "draft" })}
                onDone={r.reload}
                caution={
                  fa
                    ? "تولید هزینه دارد و در پس‌زمینه ادامه می‌یابد. خروجی به‌صورت پیش‌نویس ثبت می‌شود. برای مشاهده نتیجه وضعیت را به‌روز کنید؛ مجدداً تولید نزنید."
                    : "Generation uses credits and continues in the background. The result is saved as a draft. Refresh status to see the result; do not start another generation."
                }
              />
            </>
          )}
          <Button onClick={r.reload}>
            {fa ? "به‌روزرسانی وضعیت" : "Refresh status"}
          </Button>
          <Evidence
            value={{
              running: plan.running,
              lastError: plan.lastError,
              nextRunAt: plan.nextRunAt,
            }}
          />
          <LiveTable
            items={liveRows(r.data?.runs).map((run) => ({
              ...run,
              postTitle: (run.post as LiveRow | null)?.title,
            }))}
            columns={[
              field("topic", "موضوع", "Topic"),
              field("status", "وضعیت", "Status"),
              field("createdAt", "تاریخ", "Created"),
              field("postTitle", "مقاله", "Article"),
            ]}
          />
        </>
      )}
    </section>
  );
}
