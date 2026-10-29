"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Modal, download } from "./ui";
import { toast } from "sonner";
type Audit = {
  id: string;
  url: string;
  title: string;
  description: string;
  words: number;
  headings: number;
  missingAlt: number;
  links: number;
  date: string;
};
type Article = {
  id: string;
  title: string;
  keyword: string;
  description: string;
  body: string;
  status: string;
};
export const seoViews = [
  "overview",
  "url",
  "keyword",
  "intelligence",
  "competitors",
  "content",
  "meta",
  "posts",
  "plan",
  "agent-pipeline",
  "rankings",
  "backlinks",
  "lessons",
];
export function SeoWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [audits, saveAudits] = useLocalState<Audit[]>("aifekr-seo-audits", []);
  const [articles, saveArticles] = useLocalState<Article[]>(
    "aifekr-seo-articles",
    [],
  );
  const [url, setUrl] = useState("https://example.com"),
    [source, setSource] = useState(""),
    [audit, setAudit] = useState<Audit | null>(null);
  const [keyword, setKeyword] = useState(""),
    [text, setText] = useState("");
  const [article, setArticle] = useState<Article>({
    id: crypto.randomUUID(),
    title: "",
    keyword: "",
    description: "",
    body: "",
    status: "idea",
  });
  const [editing, setEditing] = useState<Article | null>(null);
  function saveArticle(a: Article) {
    saveArticles(
      articles.some((x) => x.id === a.id)
        ? articles.map((x) => (x.id === a.id ? a : x))
        : [a, ...articles],
    );
    toast.success(t("save"));
  }
  const editor = (a: Article, setter: (a: Article) => void) => (
    <div className="social-composer">
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          saveArticle(a);
          setEditing(null);
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "عنوان مقاله" : "Article title"}
            <input
              required
              maxLength={120}
              value={a.title}
              onChange={(e) => setter({ ...a, title: e.target.value })}
            />
          </label>
          <label>
            {fa ? "کلیدواژه هدف" : "Target keyword"}
            <input
              value={a.keyword}
              onChange={(e) => setter({ ...a, keyword: e.target.value })}
            />
          </label>
        </div>
        <label>
          {fa ? "توضیح متا" : "Meta description"}
          <textarea
            rows={3}
            maxLength={320}
            value={a.description}
            onChange={(e) => setter({ ...a, description: e.target.value })}
          />
        </label>
        <label>
          {fa ? "متن مقاله" : "Article body"}
          <textarea
            rows={14}
            required={view !== "meta"}
            value={a.body}
            onChange={(e) => setter({ ...a, body: e.target.value })}
          />
        </label>
        <Button type="submit" variant="primary">
          {fa ? "ذخیره در کتابخانه محتوا" : "Save to content library"}
        </Button>
      </form>
      <aside className="panel">
        <h3>{fa ? "پیش‌نمایش نتیجه جستجو" : "Search result preview"}</h3>
        <small dir="ltr">example.com/article</small>
        <h2 className="blue-text">
          {a.title || (fa ? "عنوان مقاله" : "Article title")}
        </h2>
        <p>{a.description}</p>
        <div className="domain-card">
          <p>
            {fa ? "طول عنوان" : "Title length"}: {n(a.title.length)} / 60
          </p>
          <progress max={120} value={a.title.length} />
          <p>
            {fa ? "طول توضیح" : "Description length"}: {n(a.description.length)}{" "}
            / 160
          </p>
          <progress max={320} value={a.description.length} />
          <p>
            {fa ? "تعداد کلمات" : "Word count"}:{" "}
            {n(a.body.trim() ? a.body.trim().split(/\s+/).length : 0)}
          </p>
          {a.keyword && (
            <p>
              {fa ? "کاربرد کلیدواژه" : "Keyword mentions"}:{" "}
              {n(
                a.body.toLocaleLowerCase().split(a.keyword.toLocaleLowerCase())
                  .length - 1,
              )}
            </p>
          )}
        </div>
        <p>
          {fa
            ? "این پیش‌نمایش به موتور جستجو یا سرویس تولید محتوا متصل نیست."
            : "This preview is not connected to a search engine or content generation service."}
        </p>
      </aside>
    </div>
  );
  if (["content", "meta"].includes(view)) return editor(article, setArticle);
  if (view === "url")
    return (
      <>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const doc = new DOMParser().parseFromString(source, "text/html");
            const body = doc.body.textContent || "";
            const result: Audit = {
              id: crypto.randomUUID(),
              url,
              title: doc.querySelector("title")?.textContent || "",
              description:
                doc
                  .querySelector('meta[name="description"]')
                  ?.getAttribute("content") || "",
              words: body.trim() ? body.trim().split(/\s+/).length : 0,
              headings: doc.querySelectorAll("h1").length,
              missingAlt: [...doc.querySelectorAll("img")].filter(
                (img) => !img.hasAttribute("alt"),
              ).length,
              links: doc.querySelectorAll("a[href]").length,
              date: new Date().toISOString(),
            };
            saveAudits([result, ...audits]);
            setAudit(result);
          }}
        >
          <h3>{fa ? "بررسی HTML صفحه" : "Inspect page HTML"}</h3>
          <label>
            {fa ? "نشانی صفحه" : "Page URL"}
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label>
            {fa ? "کد HTML برای بررسی" : "HTML source to inspect"}
            <textarea
              rows={12}
              dir="ltr"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary">
            {fa ? "تحلیل محتوای واردشده" : "Analyze supplied content"}
          </Button>
          <p>
            {fa
              ? "HTML واردشده تحلیل می‌شود؛ وب‌سایت خارجی فراخوانی نمی‌شود."
              : "Only the supplied HTML is analyzed; the external site is not fetched."}
          </p>
        </form>
        {audit && <AuditResult audit={audit} />}
        <section className="panel">
          <h3>{fa ? "بررسی‌های قبلی" : "Previous inspections"}</h3>
          {audits.map((a) => (
            <button
              className="domain-card"
              key={a.id}
              onClick={() => setAudit(a)}
            >
              {a.url} · {a.date.slice(0, 10)}
            </button>
          ))}
        </section>
      </>
    );
  if (["keyword", "intelligence", "competitors"].includes(view)) {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const occurrences = keyword.trim()
      ? text.toLocaleLowerCase().split(keyword.trim().toLocaleLowerCase())
          .length - 1
      : 0;
    const suggestions = keyword.trim()
      ? fa
        ? [
            `راهنمای ${keyword}`,
            `بهترین ${keyword}`,
            `قیمت ${keyword}`,
            `مقایسه ${keyword}`,
            `آموزش ${keyword}`,
          ]
        : [
            `Guide to ${keyword}`,
            `Best ${keyword}`,
            `${keyword} pricing`,
            `${keyword} comparison`,
            `${keyword} tutorial`,
          ]
      : [];
    return (
      <div className="social-composer">
        <section className="panel">
          <label>
            {fa ? "کلیدواژه اصلی" : "Primary keyword"}
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
          <label>
            {fa
              ? "متن خودت یا رقیب برای مقایسه"
              : "Your or competitor’s supplied text"}
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="finance-summary">
            <span>
              {fa ? "کلمات" : "Words"}: {n(wordCount)}
            </span>
            <span>
              {fa ? "تکرار" : "Mentions"}: {n(occurrences)}
            </span>
            <strong>
              {fa ? "تراکم تقریبی" : "Approximate density"}:{" "}
              {n(
                wordCount
                  ? Math.round((occurrences / wordCount) * 10000) / 100
                  : 0,
              )}
              ٪
            </strong>
          </div>
        </section>
        <aside className="panel">
          <h3>{fa ? "ایده‌های عبارت جستجو" : "Search phrase ideas"}</h3>
          <p>
            {fa
              ? "این‌ها الگوهای نگارشی‌اند؛ حجم جستجو یا داده رقبا نیستند."
              : "These are writing patterns, not measured search volume or competitor data."}
          </p>
          {suggestions.map((s) => (
            <button
              className="domain-card"
              key={s}
              onClick={() => {
                saveArticle({
                  id: crypto.randomUUID(),
                  title: s,
                  keyword,
                  description: "",
                  body: "",
                  status: "idea",
                });
              }}
            >
              {s} +
            </button>
          ))}
        </aside>
      </div>
    );
  }
  if (["posts", "plan", "agent-pipeline"].includes(view))
    return (
      <>
        <div className="domain-toolbar">
          <Button
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                title: "",
                keyword: "",
                description: "",
                body: "",
                status: "idea",
              })
            }
            variant="primary"
          >
            {fa ? "مقاله تازه" : "New article"}
          </Button>
          <Button
            onClick={() =>
              download(
                "content-library.json",
                JSON.stringify(articles, null, 2),
                "application/json",
              )
            }
          >
            {t("export")}
          </Button>
        </div>
        {view === "agent-pipeline" ? (
          <div className="domain-board">
            {[
              ["idea", "ایده", "Idea"],
              ["writing", "نگارش", "Writing"],
              ["review", "بازبینی", "Review"],
            ].map(([id, a, b]) => (
              <section className="panel" key={id}>
                <h3>{fa ? a : b}</h3>
                {articles
                  .filter((a) => a.status === id)
                  .map((a) => (
                    <article key={a.id} className="domain-card">
                      <button
                        className="text-link"
                        onClick={() => setEditing(a)}
                      >
                        {a.title}
                      </button>
                      <select
                        aria-label={
                          (fa ? "مرحله مقاله " : "Article stage ") + a.title
                        }
                        value={a.status}
                        onChange={(e) =>
                          saveArticles(
                            articles.map((x) =>
                              x.id === a.id
                                ? { ...x, status: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        {[
                          ["idea", "ایده", "Idea"],
                          ["writing", "نگارش", "Writing"],
                          ["review", "بازبینی", "Review"],
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
        ) : !articles.length ? (
          <Empty />
        ) : (
          <div className="tool-grid">
            {articles.map((a) => (
              <article className="panel" key={a.id}>
                <span className="badge">{a.keyword}</span>
                <h3>{a.title}</h3>
                <p>{a.description}</p>
                <Button onClick={() => setEditing(a)}>
                  {fa ? "ویرایش مقاله" : "Edit article"}
                </Button>
                <Button
                  onClick={() =>
                    download(
                      a.title + ".txt",
                      [a.title, a.description, a.body].join("\n\n"),
                    )
                  }
                >
                  {t("download")}
                </Button>
              </article>
            ))}
          </div>
        )}
        {editing && (
          <Modal
            title={fa ? "ویرایش مقاله" : "Edit article"}
            onClose={() => setEditing(null)}
          >
            {editor(editing, setEditing)}
          </Modal>
        )}
      </>
    );
  if (["rankings", "backlinks", "lessons"].includes(view))
    return <SeoNotes view={view} />;
  return (
    <>
      <div className="stats-grid">
        {[
          [fa ? "بررسی صفحه" : "Page inspections", audits.length],
          [fa ? "مقالات" : "Articles", articles.length],
          [
            fa ? "در حال نگارش" : "In writing",
            articles.filter((a) => a.status === "writing").length,
          ],
          [
            fa ? "آماده بازبینی" : "Ready for review",
            articles.filter((a) => a.status === "review").length,
          ],
        ].map(([label, count]) => (
          <div className="panel stat" key={String(label)}>
            <span>{label}</span>
            <strong>{n(Number(count))}</strong>
          </div>
        ))}
      </div>
      {audits[0] ? <AuditResult audit={audits[0]} /> : <Empty />}
    </>
  );
}
function AuditResult({ audit }: { audit: Audit }) {
  const { fa, n } = useApp();
  const checks = [
    [fa ? "عنوان موجود" : "Title exists", !!audit.title],
    [fa ? "توضیح متا موجود" : "Description exists", !!audit.description],
    [fa ? "یک عنوان اصلی" : "Exactly one H1", audit.headings === 1],
    [
      fa ? "همه تصاویر دارای alt" : "All images have alt attributes",
      audit.missingAlt === 0,
    ],
  ] as const;
  return (
    <section className="panel">
      <h3>{audit.url}</h3>
      <div className="stats-grid">
        <div className="stat">
          <span>{fa ? "کلمات" : "Words"}</span>
          <strong>{n(audit.words)}</strong>
        </div>
        <div className="stat">
          <span>{fa ? "پیوندها" : "Links"}</span>
          <strong>{n(audit.links)}</strong>
        </div>
      </div>
      {checks.map(([label, pass]) => (
        <p className="domain-card" key={label}>
          {pass ? "✓" : "!"} {label}
        </p>
      ))}
      <p>{audit.title}</p>
      <p>{audit.description}</p>
    </section>
  );
}
function SeoNotes({ view }: { view: string }) {
  const { fa, t } = useApp();
  const [rows, save] = useLocalState<
    { id: string; term: string; url: string; value: string; date: string }[]
  >("aifekr-seo:" + view, []);
  const [draft, setDraft] = useState({
    term: "",
    url: "",
    value: "",
    date: "",
  });
  return (
    <section className="panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save([{ id: crypto.randomUUID(), ...draft }, ...rows]);
          setDraft({ term: "", url: "", value: "", date: "" });
        }}
      >
        <div className="domain-fields">
          <label>
            {view === "rankings"
              ? fa
                ? "کلیدواژه"
                : "Keyword"
              : fa
                ? "موضوع"
                : "Subject"}
            <input
              required
              value={draft.term}
              onChange={(e) => setDraft({ ...draft, term: e.target.value })}
            />
          </label>
          <label>
            {fa ? "نشانی مرجع" : "Reference URL"}
            <input
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </label>
          <label>
            {view === "rankings"
              ? fa
                ? "رتبه ثبت‌شده"
                : "Recorded rank"
              : fa
                ? "یادداشت"
                : "Note"}
            <input
              required
              type={view === "rankings" ? "number" : "text"}
              min={1}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            />
          </label>
          <label>
            {fa ? "تاریخ مشاهده" : "Observed date"}
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
      <p>
        {fa
          ? "داده‌های مشاهده‌شده را خودت وارد می‌کنی؛ پایش زنده فعال نیست."
          : "Enter your observed data; live monitoring is not connected."}
      </p>
      {rows.map((r) => (
        <article className="domain-card" key={r.id}>
          <h3>{r.term}</h3>
          <p>
            {r.value} · {r.date}
          </p>
          <small>{r.url}</small>
        </article>
      ))}
    </section>
  );
}
