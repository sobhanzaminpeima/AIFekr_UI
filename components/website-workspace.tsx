"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Section = { id: string; kind: string; heading: string; body: string };
type Page = { id: string; title: string; slug: string; sections: Section[] };
type Website = {
  id: string;
  name: string;
  audience: string;
  goal: string;
  color: string;
  pages: Page[];
};
const uid = () => crypto.randomUUID();
const escape = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function websiteHtml(site: Website, page: Page, rtl: boolean) {
  return `<!doctype html><html lang="${rtl ? "fa" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title)} · ${escape(site.name)}</title><style>*{box-sizing:border-box}body{margin:0;background:#0b0c10;color:#f5f5f4;font:17px/1.9 system-ui,sans-serif}header{padding:24px 7%;display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #30323b}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:inherit;text-decoration:none}main{max-width:1160px;margin:auto}section{padding:70px 7%;border-bottom:1px solid #30323b}section:first-child{background:radial-gradient(ellipse at top right,${/^#[0-9a-f]{6}$/i.test(site.color) ? site.color : "#f97316"}33,transparent 70%);min-height:400px;display:flex;flex-direction:column;justify-content:center}h1{font-size:clamp(32px,5vw,64px);line-height:1.4;max-width:800px}h2{font-size:32px}p{white-space:pre-wrap;color:#cbc9cf;max-width:750px}footer{padding:30px 7%;color:#aaa}@media(max-width:600px){header{display:block}nav{margin-top:16px}section{padding:40px 7%}}</style><header><strong>${escape(site.name)}</strong><nav>${site.pages.map((p) => `<a href="${escape(p.slug || "index")}.html">${escape(p.title)}</a>`).join("")}</nav></header><main>${page.sections.map((s, i) => `<section id="${escape(s.id)}"><${i === 0 ? "h1" : "h2"}>${escape(s.heading)}</${i === 0 ? "h1" : "h2"}><p>${escape(s.body)}</p></section>`).join("")}</main><footer>${escape(site.name)}</footer></html>`;
}
export function WebsiteWorkspace({ view }: { view: string }) {
  const { fa, t } = useApp();
  const [sites, save] = useLocalState<Website[]>("aifekr-websites-v2", []);
  const [active, setActive] = useState("");
  const [pageId, setPageId] = useState("");
  const [device, setDevice] = useState("desktop");
  const [brief, setBrief] = useState({
    name: "",
    audience: "",
    goal: "",
    color: "#f97316",
  });
  const [section, setSection] = useState<Section | null>(null);
  const [newPage, setNewPage] = useState(false);
  const [title, setTitle] = useState(""),
    [slug, setSlug] = useState("");
  const site = sites.find((s) => s.id === active) || sites[0];
  const page = site?.pages.find((p) => p.id === pageId) || site?.pages[0];
  function update(next: Website) {
    save(sites.map((s) => (s.id === next.id ? next : s)));
  }
  function updatePage(next: Page) {
    if (site)
      update({
        ...site,
        pages: site.pages.map((p) => (p.id === next.id ? next : p)),
      });
  }
  const html = site && page ? websiteHtml(site, page, fa) : "";
  if (view === "brief" || !site)
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const created: Website = {
            id: uid(),
            ...brief,
            pages: [
              {
                id: uid(),
                title: fa ? "خانه" : "Home",
                slug: "index",
                sections: [
                  {
                    id: uid(),
                    kind: "hero",
                    heading: brief.name,
                    body: brief.goal,
                  },
                  {
                    id: uid(),
                    kind: "features",
                    heading: fa ? "برای چه کسانی؟" : "Who is it for?",
                    body: brief.audience,
                  },
                ],
              },
            ],
          };
          save([created, ...sites]);
          setActive(created.id);
          toast.success(
            fa
              ? "پروژه ساخته شد؛ از تب پیش‌نمایش ویرایش کن."
              : "Project created. Open Preview to edit it.",
          );
        }}
      >
        <h3>{fa ? "تعریف وب‌سایت" : "Website brief"}</h3>
        <div className="domain-fields">
          <label>
            {fa ? "نام وب‌سایت" : "Website name"}
            <input
              required
              value={brief.name}
              onChange={(e) => setBrief({ ...brief, name: e.target.value })}
            />
          </label>
          <label>
            {fa ? "مخاطب هدف" : "Target audience"}
            <input
              required
              value={brief.audience}
              onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
            />
          </label>
          <label>
            {fa ? "رنگ برند" : "Brand color"}
            <input
              type="color"
              value={brief.color}
              onChange={(e) => setBrief({ ...brief, color: e.target.value })}
            />
          </label>
          <label>
            {fa ? "هدف و پیام اصلی" : "Goal and key message"}
            <textarea
              required
              rows={5}
              value={brief.goal}
              onChange={(e) => setBrief({ ...brief, goal: e.target.value })}
            />
          </label>
        </div>
        <Button type="submit" variant="primary">
          {fa ? "ساخت پروژه وب‌سایت" : "Create website project"}
        </Button>
        <p>
          {fa
            ? "ساختار قابل ویرایش به صورت محلی ساخته می‌شود؛ انتشار عمومی انجام نمی‌شود."
            : "An editable structure is created locally; no public deployment is performed."}
        </p>
      </form>
    );
  return (
    <>
      <div className="domain-toolbar">
        <select
          aria-label={fa ? "پروژه وب‌سایت" : "Website project"}
          value={site.id}
          onChange={(e) => {
            setActive(e.target.value);
            setPageId("");
          }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label={fa ? "صفحه" : "Page"}
          value={page?.id}
          onChange={(e) => setPageId(e.target.value)}
        >
          {site.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <Button onClick={() => setNewPage(true)}>
          {fa ? "افزودن صفحه" : "Add page"}
        </Button>
        <Button
          onClick={() =>
            download((page?.slug || "index") + ".html", html, "text/html")
          }
        >
          {fa ? "دریافت HTML صفحه" : "Download page HTML"}
        </Button>
        <Button
          onClick={() =>
            download(
              site.name + ".json",
              JSON.stringify(site, null, 2),
              "application/json",
            )
          }
        >
          {fa ? "خروجی کل پروژه" : "Export project"}
        </Button>
      </div>
      {view === "projects" ? (
        <div className="tool-grid">
          {sites.map((s) => (
            <button
              className="panel tool-card"
              key={s.id}
              onClick={() => {
                setActive(s.id);
                toast.info(
                  fa
                    ? "پروژه انتخاب شد؛ تب پیش‌نمایش را باز کن."
                    : "Project selected. Open the Preview tab.",
                );
              }}
            >
              <span className="icon-chip blue">
                <Icon name="PanelsTopLeft" />
              </span>
              <h3>{s.name}</h3>
              <p>{s.goal}</p>
              <span className="badge">
                {s.pages.length} {fa ? "صفحه" : "pages"}
              </span>
            </button>
          ))}
        </div>
      ) : view === "code" ? (
        <section className="panel">
          <label>
            {fa ? "کد خروجی صفحه" : "Page source"}
            <textarea
              className="website-code"
              dir="ltr"
              rows={24}
              readOnly
              value={html}
            />
          </label>
          <Button
            onClick={() => {
              navigator.clipboard
                .writeText(html)
                .then(() => toast.success(t("copy")))
                .catch(() =>
                  toast.error(
                    fa
                      ? "کپی انجام نشد؛ فایل را دریافت کن."
                      : "Copy failed; download the file instead.",
                  ),
                );
            }}
          >
            {t("copy")}
          </Button>
        </section>
      ) : (
        page && (
          <div className="website-editor">
            <aside className="panel">
              <h3>{fa ? "بخش‌های صفحه" : "Page sections"}</h3>
              {page.sections.map((s, i) => (
                <article className="domain-card" key={s.id}>
                  <button className="text-link" onClick={() => setSection(s)}>
                    {s.heading}
                  </button>
                  <div className="domain-actions">
                    <Button
                      aria-label={fa ? "انتقال بخش به بالا" : "Move section up"}
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...page.sections];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        updatePage({ ...page, sections: next });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      disabled={page.sections.length === 1}
                      onClick={() =>
                        updatePage({
                          ...page,
                          sections: page.sections.filter((x) => x.id !== s.id),
                        })
                      }
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </article>
              ))}
              <Button
                onClick={() =>
                  setSection({
                    id: uid(),
                    kind: "content",
                    heading: "",
                    body: "",
                  })
                }
              >
                {fa ? "افزودن بخش" : "Add section"}
              </Button>
              <label>
                {fa ? "رنگ سایت" : "Site color"}
                <input
                  type="color"
                  value={site.color}
                  onChange={(e) => update({ ...site, color: e.target.value })}
                />
              </label>
            </aside>
            <section className="panel">
              <div className="chips">
                {[
                  ["desktop", "دسکتاپ", "Desktop"],
                  ["tablet", "تبلت", "Tablet"],
                  ["mobile", "موبایل", "Mobile"],
                ].map(([id, a, b]) => (
                  <button
                    key={id}
                    className={device === id ? "selected" : ""}
                    onClick={() => setDevice(id)}
                  >
                    {fa ? a : b}
                  </button>
                ))}
              </div>
              <div className="website-preview-scroll">
                <iframe
                  title={fa ? "پیش‌نمایش وب‌سایت" : "Website preview"}
                  sandbox=""
                  srcDoc={html}
                  className={"website-preview " + device}
                />
              </div>
            </section>
          </div>
        )
      )}
      {section && page && (
        <Modal
          title={fa ? "ویرایش بخش" : "Edit section"}
          onClose={() => setSection(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updatePage({
                ...page,
                sections: page.sections.some((s) => s.id === section.id)
                  ? page.sections.map((s) =>
                      s.id === section.id ? section : s,
                    )
                  : [...page.sections, section],
              });
              setSection(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان بخش" : "Section heading"}
                <input
                  required
                  value={section.heading}
                  onChange={(e) =>
                    setSection({ ...section, heading: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "متن بخش" : "Section body"}
                <textarea
                  required
                  rows={7}
                  value={section.body}
                  onChange={(e) =>
                    setSection({ ...section, body: e.target.value })
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
      {newPage && (
        <Modal
          title={fa ? "صفحه جدید" : "New page"}
          onClose={() => setNewPage(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (site.pages.some((p) => p.slug === slug)) {
                toast.error(
                  fa
                    ? "این نشانی قبلاً استفاده شده است"
                    : "This page slug is already used",
                );
                return;
              }
              const p: Page = {
                id: uid(),
                title,
                slug,
                sections: [
                  { id: uid(), kind: "hero", heading: title, body: site.goal },
                ],
              };
              update({ ...site, pages: [...site.pages, p] });
              setPageId(p.id);
              setNewPage(false);
              setTitle("");
              setSlug("");
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان صفحه" : "Page title"}
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                {fa ? "نشانی صفحه" : "Page slug"}
                <input
                  required
                  pattern="[a-z0-9-]+"
                  dir="ltr"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
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
