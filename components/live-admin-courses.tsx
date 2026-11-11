"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin AI courses on aifekr.com (/admin/ai-courses[?course=<id>], /admin/ai-courses/<id>/preview).
 * Same server contract as the classic editor:
 * - generation is paid; the request carries the expected credits and an idempotency key kept
 *   in localStorage until the server reports a terminal state, so a retry never double-charges;
 * - regenerating a whole course, approving a blueprint (reserved credits are spent) and
 *   publishing ask first; manual edits, revisions and settings are free.
 */
type Tx = [string, string, string, string];
type Lang = "fa" | "en" | "de" | "tr";
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { n, i, tx, tag, lang: (["fa", "en", "de", "tr"][i] ?? "en") as Lang };
}
class ApiError extends Error { code?: string; required?: number; }
async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, credentials: "include", headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new ApiError(d.code || d.error || "HTTP_" + r.status); e.code = d.code || d.error; e.required = d.required; throw e; }
  return d as T;
}

type Block = { type: string; text?: string; code?: string; language?: string; items?: string[]; headers?: string[]; rows?: string[][]; url?: string; alt?: string; caption?: string; prompt?: string; answer?: string };
type Question = { question: string; options: string[]; correctIndex: number; explanation: string };
type Lesson = { title: string; content: string; blocks?: Block[]; activity: string; quiz: Question[] } & Record<string, unknown>;
type Content = { overview: string; objectives: string[]; chapters: { title: string; lessons: Lesson[] }[]; finalProject: { title: string; instructions: string; rubric: string[] } } & Record<string, unknown>;
type Job = { id: string; generatedLessons: number; totalLessons: number; status: string; credits: number; userId: string; idempotencyKey: string };
type Course = { id: string; title: string; fieldOfStudy: string; description: string; language: string; status: string; version: number; activeJobId: string | null; content: string | null; publishedVersion?: { version: number } | null; jobs?: Job[] };
type Meta = { coverUrl: string | null; difficulty: string; durationMinutes: number; topic: string; skills: string; prerequisites: string; configuration: string; blueprint: string | null; status: string; version: number; activeJobId: string | null; majors?: { majorId: string }[] };

const LANGS: [Lang, string][] = [["fa", "فارسی"], ["en", "English"], ["de", "Deutsch"], ["tr", "Türkçe"]];
const STATUS: Record<string, Tx> = {
  DRAFT: ["پیش‌نویس", "Draft", "Entwurf", "Taslak"], GENERATING: ["در حال تولید", "Generating", "Wird erstellt", "Oluşturuluyor"], BLUEPRINT_REVIEW: ["بازبینی طرح", "Blueprint review", "Lehrplanprüfung", "Plan incelemesi"],
  GENERATED: ["آمادهٔ بازبینی", "Ready for review", "Bereit zur Prüfung", "İncelemeye hazır"], PUBLISHED: ["منتشرشده", "Published", "Veröffentlicht", "Yayında"], UNPUBLISHED: ["ثبت‌نام بسته", "Enrollment closed", "Einschreibung geschlossen", "Kayıt kapalı"], ARCHIVED: ["بایگانی", "Archived", "Archiviert", "Arşivlendi"],
};
const DIFF: Record<string, Tx> = { BEGINNER: ["مقدماتی", "Beginner", "Anfänger", "Başlangıç"], INTERMEDIATE: ["متوسط", "Intermediate", "Mittelstufe", "Orta"], ADVANCED: ["پیشرفته", "Advanced", "Fortgeschritten", "İleri"] };
const BLOCK_TYPES = ["heading", "paragraph", "keyConcept", "definition", "example", "code", "codeExplanation", "steps", "callout", "warning", "tip", "quote", "formula", "reflection", "summary", "flashcards", "table", "image", "knowledgeCheck"];

function statusBadge(s: string, tx: (c: Tx) => string) {
  const color = s === "PUBLISHED" ? "green" : s === "GENERATED" || s === "BLUEPRINT_REVIEW" ? "amber" : s === "ARCHIVED" ? "red" : "";
  return <span className={"badge " + color}>{STATUS[s] ? tx(STATUS[s]) : s}</span>;
}

function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const { tx } = useT();
  const [busy, setBusy] = useState(false);
  return (
    <label className="btn course-upload">
      <Icon name="ImageUp" size={15} />{busy ? tx(["در حال آپلود…", "Uploading…", "Wird hochgeladen…", "Yükleniyor…"]) : tx(["آپلود تصویر (حداکثر ۸ مگابایت)", "Upload image (8 MB max)", "Bild hochladen (max. 8 MB)", "Görsel yükle (en fazla 8 MB)"])}
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (e) => {
        const file = e.currentTarget.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) return void toast.error(tx(["حداکثر اندازهٔ تصویر ۸ مگابایت است", "Maximum image size is 8 MB", "Maximale Bildgröße: 8 MB", "En fazla 8 MB"]));
        setBusy(true);
        try { const form = new FormData(); form.set("file", file); const d = await api<{ url: string }>("/api/admin/academy/media", { method: "POST", body: form }); onUploaded(d.url); toast.success(tx(["تصویر آپلود شد", "Image uploaded", "Bild hochgeladen", "Görsel yüklendi"])); }
        catch { toast.error(tx(["آپلود انجام نشد؛ دوباره تلاش کن", "Upload failed; please retry", "Upload fehlgeschlagen", "Yükleme başarısız"])); } finally { setBusy(false); }
      }} />
    </label>
  );
}

export function LiveCourses() {
  const { n, tx, lang } = useT();
  const [selected, setSelected] = useState<string | null>(() => (typeof location === "undefined" ? null : new URLSearchParams(location.search).get("course")));
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [draft, setDraft] = useState<Content | null>(null);
  const [balance, setBalance] = useState(0);
  const [cost, setCost] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const [ask, setAsk] = useState<"regenerate" | "publish" | null>(null);
  const [brief, setBrief] = useState({ fieldOfStudy: "", title: "", description: "", language: lang as string });
  const select = (id: string | null) => { history.replaceState(null, "", "/admin/ai-courses" + (id ? "?course=" + encodeURIComponent(id) : "")); setSelected(id); };
  const load = useCallback(async () => {
    const d = await api<{ courses: Course[]; cost: number; balance: number; userId: string }>("/api/admin/ai-courses");
    setCourses(d.courses); setCost(d.cost); setBalance(d.balance); setUserId(d.userId);
  }, []);
  const detail = useCallback(async () => {
    if (!selected) { setCourse(null); setDraft(null); return; }
    const d = await api<{ course: Course; actorId: string }>("/api/admin/ai-courses/" + encodeURIComponent(selected));
    setCourse(d.course);
    setDraft(d.course.content ? JSON.parse(d.course.content) : null);
    const storageKey = `aifekr:course-generation:${d.actorId}:${selected}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      let key: string | null = null;
      try { key = JSON.parse(stored).idempotencyKey; } catch { localStorage.removeItem(storageKey); }
      if (key && /^[a-zA-Z0-9_-]{16,100}$/.test(key)) {
        const known = d.course.jobs?.find((j) => j.userId === d.actorId && j.idempotencyKey === key);
        const status = known?.status || (await api<{ requestStatus?: string }>(`/api/admin/ai-courses/${encodeURIComponent(selected)}?requestKey=${encodeURIComponent(key)}`)).requestStatus;
        // Only a proven terminal server state clears an in-flight key.
        if (status && ["SUCCEEDED", "REFUNDED"].includes(status)) localStorage.removeItem(storageKey);
      }
    }
    setBrief({ fieldOfStudy: d.course.fieldOfStudy, title: d.course.title, description: d.course.description, language: d.course.language });
  }, [selected]);
  const refresh = useCallback(async () => { await Promise.all([load(), detail()]); }, [load, detail]);
  useEffect(() => { void load().catch(() => toast.error(tx(["بارگذاری دوره‌ها ناموفق بود", "Could not load courses", "Kurse konnten nicht geladen werden", "Kurslar yüklenemedi"]))); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void detail().catch((e) => toast.error(e.message)); }, [detail]);
  useEffect(() => {
    if (!course?.activeJobId) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh().catch(() => undefined); }, 4000);
    return () => clearInterval(timer);
  }, [course?.activeJobId, refresh]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const d = await api<{ course: Course }>("/api/admin/ai-courses", { method: "POST", body: JSON.stringify(brief) }); select(d.course.id); await load(); toast.success(tx(["پیش‌نویس رایگان ساخته شد", "Free draft created", "Kostenloser Entwurf erstellt", "Ücretsiz taslak oluşturuldu"])); }
    catch { toast.error(tx(["اطلاعات دوره را کامل کن (شرح حداقل ۲۰ حرف)", "Complete the course brief (description 20+ characters)", "Kursbeschreibung vervollständigen (mind. 20 Zeichen)", "Kurs bilgilerini tamamla (açıklama 20+ karakter)"])); } finally { setBusy(false); }
  }
  async function save(status?: string) {
    if (!course) return;
    setBusy(true); setAsk(null);
    try {
      await api("/api/admin/ai-courses/" + encodeURIComponent(course.id), { method: "PATCH", body: JSON.stringify({ ...brief, version: course.version, ...(status ? { status } : draft ? { content: draft } : {}) }) });
      await refresh();
      toast.success(status === "PUBLISHED" ? tx(["دوره منتشر شد", "Course published", "Kurs veröffentlicht", "Kurs yayınlandı"]) : tx(["ذخیره شد؛ ویرایش دستی رایگان است", "Saved. Manual editing is free", "Gespeichert. Manuelle Bearbeitung ist kostenlos", "Kaydedildi. Elle düzenleme ücretsizdir"]));
    } catch (e) { toast.error(e instanceof Error ? (e.message === "INVALID_COURSE_CONTENT" ? tx(["ساختار محتوا معتبر نیست (مثلاً متن درس حداقل ۲۰۰ حرف، هر سؤال ۴ گزینه).", "The content structure is invalid (e.g. lesson text 200+ characters, 4 options per question).", "Inhaltsstruktur ungültig (z. B. Lektion 200+ Zeichen, 4 Optionen je Frage).", "İçerik yapısı geçersiz (ör. ders metni 200+ karakter, soru başına 4 seçenek)."]) : e.message) : "SAVE_FAILED"); }
    finally { setBusy(false); }
  }
  async function generate(confirmed = false) {
    if (!course || cost === null) return;
    const regenerate = !!course.content;
    if (regenerate && !confirmed) { setAsk("regenerate"); return; }
    setAsk(null); setBusy(true); setInsufficient(false);
    const storageKey = `aifekr:course-generation:${userId}:${course.id}`;
    let request = { idempotencyKey: crypto.randomUUID(), expectedCredits: cost, regenerate, confirmRegeneration: regenerate };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) request = JSON.parse(saved);
      else {
        // Persist the brief the administrator actually sees before starting paid generation.
        if (brief.title !== course.title || brief.description !== course.description || brief.fieldOfStudy !== course.fieldOfStudy || brief.language !== course.language) {
          await api("/api/admin/ai-courses/" + encodeURIComponent(course.id), { method: "PATCH", body: JSON.stringify({ ...brief, version: course.version }) });
        }
        localStorage.setItem(storageKey, JSON.stringify(request));
      }
      setCourse((c) => (c ? { ...c, activeJobId: "pending", status: "GENERATING" } : c));
      toast(tx(["در حال تولید ساختار و درس‌ها؛ قبل از انتشار بازبینی می‌کنی", "Generating the structure and lessons; you review before publishing", "Struktur und Lektionen werden erstellt; danach prüfen", "Yapı ve dersler oluşturuluyor; yayımlamadan önce incele"]));
      const d = await api<{ job: { status: string } }>(`/api/admin/ai-courses/${encodeURIComponent(course.id)}/generate`, { method: "POST", body: JSON.stringify(request) });
      if (["SUCCEEDED", "REFUNDED"].includes(d.job.status)) localStorage.removeItem(storageKey);
      if (d.job.status === "REFUNDED") toast.error(tx(["تولید ناموفق بود؛ اعتبار بازگردانده شد", "Generation failed; credits refunded", "Generierung fehlgeschlagen; Credits erstattet", "Oluşturma başarısız; krediler iade edildi"]));
      await refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.code) localStorage.removeItem(storageKey); // Transport failures keep the exact key for a safe retry.
      setInsufficient(err.code === "INSUFFICIENT_CREDITS");
      if (err.required !== undefined) setCost(err.required);
      toast.error(err.code === "INSUFFICIENT_CREDITS" ? tx(["اعتبار کافی نیست؛ تولید شروع نشد", "Insufficient credits; generation did not start", "Nicht genügend Credits; nicht gestartet", "Yetersiz kredi; başlamadı"]) : err.code === "COST_CHANGED" ? tx(["هزینه تغییر کرده؛ مبلغ جدید را بررسی کن و دوباره تأیید کن", "The cost changed. Check the new amount and confirm again", "Kosten geändert. Neuen Betrag prüfen und bestätigen", "Maliyet değişti. Yeni tutarı kontrol edip tekrar onayla"]) : tx(["پاسخ نرسید؛ همان درخواست را دوباره بزن تا شارژ تکراری نشود", "No response. Retry the same request safely", "Keine Antwort. Dieselbe Anfrage sicher wiederholen", "Yanıt yok. Aynı isteği güvenle tekrar dene"]));
      await refresh().catch(() => undefined);
    } finally { setBusy(false); }
  }
  const disabled = busy || !!course?.activeJobId;
  const unsaved = !!draft && !!course && JSON.stringify(draft) !== course.content;
  const lastJob = course?.jobs?.[0];
  const stateNote = lastJob?.status === "SUCCEEDED" ? tx(["دوره آمادهٔ بازبینی است؛ انتشار تأیید جداگانه می‌خواهد.", "Course ready for review; publishing needs a separate confirmation.", "Kurs bereit zur Prüfung; Veröffentlichung separat bestätigen.", "Kurs incelemeye hazır; yayımlamak ayrı onay ister."]) : lastJob?.status === "REFUNDED" ? tx(["آخرین تولید ناموفق بود؛ همهٔ اعتبار بازگردانده شد.", "The last generation failed; all credits were refunded.", "Letzte Generierung fehlgeschlagen; Credits erstattet.", "Son oluşturma başarısız; krediler iade edildi."]) : lastJob?.status === "AWAITING_BLUEPRINT_APPROVAL" ? tx(["طرح درس آماده است؛ پایین همین صفحه آن را بازبینی و تأیید کن.", "The blueprint is ready; review and approve it below.", "Der Lehrplan ist bereit; unten prüfen und genehmigen.", "Plan hazır; aşağıda inceleyip onayla."]) : "";

  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="BookOpenCheck" size={28} /></span>
        <div>
          <h2>{tx(["دوره‌های هوش مصنوعی", "AI courses", "KI-Kurse", "AI kursları"])}</h2>
          <p>{tx(["تولید ← بازبینی و ویرایش ← انتشار. ویرایش دستی، بازگردانی و تنظیمات رایگان‌اند؛ فقط تولید با AI اعتبار مصرف می‌کند.", "Generate → review and edit → publish. Manual edits, restores and settings are free; only AI generation uses credits.", "Generieren → prüfen → veröffentlichen. Manuelles Bearbeiten ist kostenlos; nur KI-Generierung kostet Credits.", "Oluştur → incele → yayımla. Elle düzenleme ücretsizdir; yalnızca AI üretimi kredi kullanır."])}</p>
        </div>
        <Link className="btn" href="/admin/academy">{tx(["آکادمی", "Academy", "Akademie", "Akademi"])}</Link>
      </div>
      <div className="stats-grid">
        <div className="panel stat"><span>{tx(["اعتبار قابل استفادهٔ شما", "Your available credits", "Ihre verfügbaren Credits", "Kullanılabilir krediniz"])}</span><strong>{n(balance)}</strong>{insufficient && <small><Link href="/credits">{tx(["خرید اعتبار", "Buy credits", "Credits kaufen", "Kredi al"])}</Link></small>}</div>
        <div className="panel stat"><span>{tx(["هزینهٔ تولید کامل دوره", "Full course generation", "Vollständige Generierung", "Tam kurs üretimi"])}</span><strong>{cost === null ? "—" : n(cost)}</strong><small><Link href="/admin/usage">{tx(["قوانین کردیت", "Credit rules", "Credit-Regeln", "Kredi kuralları"])}</Link></small></div>
        <div className="panel stat"><span>{tx(["دوره‌ها", "Courses", "Kurse", "Kurslar"])}</span><strong>{courses ? n(courses.length) : "—"}</strong></div>
      </div>

      <div className="course-layout">
        <div className="admin-pick-list" aria-busy={!courses}>
          <button className={!selected ? "selected" : ""} onClick={() => { select(null); setBrief({ fieldOfStudy: "", title: "", description: "", language: lang }); }}><span><Icon name="Plus" size={14} /> {tx(["دورهٔ جدید", "New course", "Neuer Kurs", "Yeni kurs"])}</span></button>
          {courses?.map((c) => <button key={c.id} className={selected === c.id ? "selected" : ""} onClick={() => select(c.id)}><span>{c.title}</span><small>{STATUS[c.status] ? tx(STATUS[c.status]) : c.status} · v{c.version}{c.activeJobId ? " · ⏳" : ""}</small></button>)}
        </div>

        <div className="course-main">
          <form className="panel domain-fields" onSubmit={create}>
            <h3 className="span-2">{course ? tx(["مشخصات دوره", "Course brief", "Kursbeschreibung", "Kurs bilgileri"]) : tx(["دورهٔ جدید — پیش‌نویس رایگان", "New course — free draft", "Neuer Kurs — kostenloser Entwurf", "Yeni kurs — ücretsiz taslak"])}</h3>
            <label>{tx(["رشتهٔ تحصیلی", "Field of study", "Studienfach", "Çalışma alanı"])}<input required minLength={3} maxLength={200} disabled={disabled} value={brief.fieldOfStudy} onChange={(e) => setBrief({ ...brief, fieldOfStudy: e.target.value })} /></label>
            <label>{tx(["عنوان دوره", "Course title", "Kurstitel", "Kurs başlığı"])}<input required minLength={3} maxLength={200} disabled={disabled} value={brief.title} onChange={(e) => setBrief({ ...brief, title: e.target.value })} /></label>
            <label className="span-2">{tx(["شرح دوره (حداقل ۲۰ حرف)", "Description (20+ characters)", "Beschreibung (mind. 20 Zeichen)", "Açıklama (20+ karakter)"])}<textarea required minLength={20} maxLength={6000} rows={4} disabled={disabled} value={brief.description} onChange={(e) => setBrief({ ...brief, description: e.target.value })} /></label>
            <label>{tx(["زبان دوره", "Course language", "Kurssprache", "Kurs dili"])}<select disabled={disabled} value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })}>{LANGS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <div className="domain-actions">{!course ? <Button type="submit" variant="primary" disabled={busy}>{tx(["ساخت پیش‌نویس رایگان", "Create free draft", "Kostenlosen Entwurf erstellen", "Ücretsiz taslak oluştur"])}</Button> : <Button disabled={disabled} onClick={() => void save()}>{tx(["ذخیرهٔ مشخصات — رایگان", "Save brief · free", "Speichern · kostenlos", "Kaydet · ücretsiz"])}</Button>}</div>
          </form>

          {course && <section className="panel course-generate">
            <div className="row-between">
              <div>{statusBadge(course.status, tx)} <small>v{course.version}{course.publishedVersion ? " · " + tx(["نسخهٔ دانشجویان", "student version", "Lernversion", "öğrenci sürümü"]) + " v" + course.publishedVersion.version : ""}</small></div>
              {course.content && <Link className="btn" href={`/admin/ai-courses/${encodeURIComponent(course.id)}/preview`}><Icon name="Eye" size={15} />{tx(["پیش‌نمایش دوره", "Preview course", "Kursvorschau", "Kursu önizle"])}</Link>}
            </div>
            {stateNote && <p className="admin-note">{stateNote}</p>}
            <Button variant="primary" disabled={disabled || cost === null} onClick={() => void generate()}><Icon name="Sparkles" size={16} />{course.activeJobId ? tx(["در حال تولید…", "Generating…", "Wird generiert…", "Oluşturuluyor…"]) : course.content ? tx(["تولید دوبارهٔ کل دوره", "Regenerate entire course", "Gesamten Kurs neu generieren", "Tüm kursu yeniden oluştur"]) : tx(["تولید دوره", "Generate course", "Kurs generieren", "Kurs oluştur"])} · {cost === null ? "…" : n(cost)} {tx(["اعتبار", "credits", "Credits", "kredi"])}</Button>
            <p className="fine-print">{tx(["AI ساختار، فصل‌ها، درس‌ها، فعالیت‌ها و پیش‌نویس آزمون‌ها را می‌سازد. همه را قبل از انتشار بازبینی و ویرایش کن.", "AI builds the structure, chapters, lessons, activities and quiz drafts. Review and edit everything before publishing.", "Die KI erstellt Struktur, Kapitel, Lektionen, Aktivitäten und Quizentwürfe. Vor dem Veröffentlichen alles prüfen.", "AI yapıyı, bölümleri, dersleri, etkinlikleri ve quiz taslaklarını oluşturur. Yayımlamadan önce hepsini incele."])}</p>
            {!!course.jobs?.length && <details><summary className="fine-print">{tx(["سابقهٔ تولید و اعتبار", "Generation & credit history", "Generierungs- & Creditverlauf", "Oluşturma ve kredi geçmişi"])}</summary><ul className="course-jobs">{course.jobs.map((j) => <li key={j.id}><span className="badge">{j.status}</span>{j.totalLessons > 0 && <> {n(j.generatedLessons)}/{n(j.totalLessons)}</>} · {j.status === "REFUNDED" ? "0 (" + n(j.credits) + " " + tx(["بازگشت", "refunded", "erstattet", "iade"]) + ")" : "-" + n(j.credits)} · <bdi dir="ltr">{j.id.slice(0, 8)}</bdi></li>)}</ul><Link href="/admin/logs">{tx(["دفتر اعتبار و تراکنش‌ها", "Credit ledger", "Credit-Buch", "Kredi defteri"])}</Link></details>}
          </section>}

          {course && <AcademySettings key={`${course.id}:${course.status}:${course.version}`} id={course.id} refresh={refresh} />}
          {course && draft && <SelectiveRegeneration id={course.id} version={course.version} content={draft} disabled={disabled || unsaved} refresh={refresh} />}
          {course && <Revisions id={course.id} version={course.version} disabled={disabled} refresh={refresh} />}
          {draft && <StructuredEditor content={draft} disabled={disabled} change={setDraft} />}
          {draft && <QuizReview content={draft} disabled={disabled} change={setDraft} />}

          {draft && course && <section className="panel course-publish">
            {unsaved && <p className="admin-note">{tx(["تغییرات ذخیره‌نشده داری؛ قبل از انتشار ذخیره کن.", "You have unsaved changes; save before publishing.", "Ungespeicherte Änderungen; vor dem Veröffentlichen speichern.", "Kaydedilmemiş değişiklikler var; yayımlamadan önce kaydet."])}</p>}
            <div className="domain-actions">
              <Button disabled={disabled || !unsaved} onClick={() => void save()}><Icon name="Save" size={15} />{tx(["ذخیرهٔ تغییرات — رایگان", "Save changes · free", "Speichern · kostenlos", "Kaydet · ücretsiz"])}</Button>
              {unsaved && <Button disabled={disabled} onClick={() => setDraft(course.content ? JSON.parse(course.content) : null)}><Icon name="RotateCcw" size={15} />{tx(["لغو تغییرات", "Discard changes", "Verwerfen", "Vazgeç"])}</Button>}
              <Button variant="primary" disabled={disabled || unsaved || course.status !== "GENERATED"} onClick={() => setAsk("publish")}><Icon name="Send" size={15} />{tx(["تأیید بازبینی و انتشار", "Confirm review & publish", "Prüfung bestätigen & veröffentlichen", "İncelemeyi onayla ve yayımla"])}</Button>
              <Button disabled={disabled || !course.publishedVersion} onClick={() => void save("UNPUBLISHED")}>{tx(["توقف ثبت‌نام جدید", "Stop new enrollment", "Neue Einschreibungen stoppen", "Yeni kayıtları durdur"])}</Button>
              <Button disabled={disabled} onClick={() => void save("ARCHIVED")}>{tx(["بایگانی", "Archive", "Archivieren", "Arşivle"])}</Button>
            </div>
          </section>}
          {courses && !courses.length && !course && <Empty />}
        </div>
      </div>

      {ask && (
        <Modal title={ask === "regenerate" ? tx(["تولید دوبارهٔ کل دوره", "Regenerate the whole course", "Gesamten Kurs neu generieren", "Tüm kursu yeniden oluştur"]) : tx(["انتشار برای دانشجویان", "Publish to students", "Für Studierende veröffentlichen", "Öğrencilere yayımla"])} onClose={() => setAsk(null)}>
          <p>{ask === "regenerate" ? tx([`تولید دوبارهٔ کل دوره ${n(cost ?? 0)} اعتبار AI مصرف می‌کند. محتوای فعلی به تاریخچه می‌رود.`, `Regenerating the whole course uses ${n(cost ?? 0)} AI credits. The current content goes to the history.`, `Die Neugenerierung kostet ${n(cost ?? 0)} KI-Credits. Der aktuelle Inhalt kommt in den Verlauf.`, `Tüm kursu yeniden oluşturmak ${n(cost ?? 0)} AI kredisi kullanır. Mevcut içerik geçmişe gider.`]) : tx(["محتوا را بازبینی کرده‌ای؟ فقط نسخهٔ ذخیره‌شده برای دانشجویان منتشر می‌شود.", "Have you reviewed the content? Only the saved version is published to students.", "Inhalte geprüft? Nur die gespeicherte Version wird veröffentlicht.", "İçeriği inceledin mi? Yalnızca kaydedilen sürüm yayımlanır."])}</p>
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => (ask === "regenerate" ? void generate(true) : void save("PUBLISHED"))}>{ask === "regenerate" ? tx(["بله، تولید کن", "Yes, regenerate", "Ja, neu generieren", "Evet, oluştur"]) : tx(["بله، منتشر کن", "Yes, publish", "Ja, veröffentlichen", "Evet, yayımla"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

/* Academy settings + blueprint review */
type Blueprint = { overview: string; objectives: string[]; chapters: { title: string; lessons: string[] }[]; finalProject: { title: string; instructions: string; rubric: string[] } };
function AcademySettings({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const { tx } = useT();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [majors, setMajors] = useState<{ id: string; name: string }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<"approve" | "cancel" | null>(null);
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<{ course: Meta }>("/api/admin/ai-courses/" + encodeURIComponent(id)), api<{ majors: { id: string; name: string }[] }>("/api/admin/academy/majors")]);
    setMeta(a.course); setMajors(b.majors || []);
    try { setConfig(JSON.parse(a.course.configuration || "{}")); } catch { setConfig({}); }
    try { setBp(a.course.blueprint ? JSON.parse(a.course.blueprint) : null); } catch { setBp(null); }
    setPicked((a.course.majors || []).map((m) => m.majorId));
  }, [id]);
  useEffect(() => { void load().catch(() => toast.error("LOAD_FAILED")); }, [load]);
  useEffect(() => { if (!meta?.activeJobId || meta.status === "BLUEPRINT_REVIEW") return; const t = setInterval(() => void load().catch(() => undefined), 5000); return () => clearInterval(t); }, [meta?.activeJobId, meta?.status, load]);
  if (!meta) return null;
  const skillsText = (() => { try { return meta.skills.startsWith("[") ? (JSON.parse(meta.skills) as string[]).join("\n") : meta.skills; } catch { return meta.skills; } })();
  const req = (config.requirements as Record<string, number | boolean> | undefined) ?? { lessonPercent: 100, quizScore: 60, finalRequired: false, finalScore: 75, attemptLimit: 0 };
  const setReq = (k: string, v: number | boolean) => setConfig({ ...config, requirements: { ...req, [k]: v } });
  async function save() {
    if (!meta) return;
    setBusy(true);
    try {
      await api("/api/admin/ai-courses/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ version: meta.version, coverUrl: meta.coverUrl, difficulty: meta.difficulty, durationMinutes: meta.durationMinutes, topic: meta.topic, skills: skillsText.split("\n").map((s) => s.trim()).filter(Boolean), prerequisites: meta.prerequisites, configuration: config, majorIds: picked }) });
      await load(); await refresh(); toast.success(tx(["تنظیمات ذخیره شد", "Settings saved", "Einstellungen gespeichert", "Ayarlar kaydedildi"]));
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  async function blueprint(cancel: boolean) {
    setBusy(true); setAsk(null);
    try { await api(`/api/admin/ai-courses/${encodeURIComponent(id)}/blueprint`, { method: "POST", body: JSON.stringify({ confirm: true, cancel, blueprint: cancel ? null : bp }) }); await load(); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const locked = busy || !!meta.activeJobId;
  const updBp = (fn: (b: Blueprint) => void) => { if (!bp) return; const next = structuredClone(bp); fn(next); setBp(next); };
  return (
    <details className="panel course-section">
      <summary>{tx(["تنظیمات آکادمی", "Academy settings", "Akademie-Einstellungen", "Akademi ayarları"])}</summary>
      <fieldset disabled={locked} className="domain-fields">
        <label>{tx(["سطح دوره", "Difficulty", "Schwierigkeit", "Zorluk"])}<select value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}>{Object.keys(DIFF).map((k) => <option key={k} value={k}>{tx(DIFF[k])}</option>)}</select></label>
        <label>{tx(["مدت (دقیقه)", "Duration (minutes)", "Dauer (Minuten)", "Süre (dakika)"])}<input type="number" min={5} max={60000} dir="ltr" value={meta.durationMinutes} onChange={(e) => setMeta({ ...meta, durationMinutes: Number(e.target.value) })} /></label>
        <label>{tx(["موضوع", "Topic", "Thema", "Konu"])}<input value={meta.topic} onChange={(e) => setMeta({ ...meta, topic: e.target.value })} /></label>
        <label>{tx(["تصویر کاور (HTTPS)", "Cover image (HTTPS)", "Titelbild (HTTPS)", "Kapak görseli (HTTPS)"])}<input type="url" dir="ltr" value={meta.coverUrl || ""} onChange={(e) => setMeta({ ...meta, coverUrl: e.target.value || null })} /><ImageUpload onUploaded={(url) => setMeta({ ...meta, coverUrl: url })} /></label>
        <label>{tx(["مهارت‌ها — هر خط یک مورد", "Skills — one per line", "Fähigkeiten — eine pro Zeile", "Beceriler — satır başına bir"])}<textarea rows={3} value={skillsText} onChange={(e) => setMeta({ ...meta, skills: e.target.value })} /></label>
        <label>{tx(["پیش‌نیازها", "Prerequisites", "Voraussetzungen", "Ön koşullar"])}<textarea rows={3} value={meta.prerequisites} onChange={(e) => setMeta({ ...meta, prerequisites: e.target.value })} /></label>
        <fieldset className="span-2 course-majors"><legend>{tx(["رشته‌های هدف", "Target majors", "Zielstudienfächer", "Hedef bölümler"])}</legend>{majors.length ? majors.map((m) => <label key={m.id} className="gc-switch"><input type="checkbox" checked={picked.includes(m.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />{m.name}</label>) : <small>{tx(["رشته‌ای تعریف نشده؛ از آکادمی بسازید.", "No majors yet; add them in the academy.", "Keine Studienfächer; in der Akademie anlegen.", "Bölüm yok; akademiden ekleyin."])}</small>}</fieldset>
        <h4 className="span-2">{tx(["قوانین تکمیل و تولید", "Completion & generation rules", "Abschluss- & Generierungsregeln", "Tamamlama ve üretim kuralları"])}</h4>
        <label>{tx(["درصد درس‌های لازم", "Required lessons (%)", "Erforderliche Lektionen (%)", "Gerekli dersler (%)"])}<input type="number" min={1} max={100} dir="ltr" value={Number(req.lessonPercent ?? 100)} onChange={(e) => setReq("lessonPercent", Number(e.target.value))} /></label>
        <label>{tx(["نمرهٔ قبولی آزمون درس (%)", "Lesson pass score (%)", "Bestehensgrenze Lektion (%)", "Ders geçme puanı (%)"])}<input type="number" min={1} max={100} dir="ltr" value={Number(req.quizScore ?? 60)} onChange={(e) => setReq("quizScore", Number(e.target.value))} /></label>
        <label>{tx(["نمرهٔ قبولی آزمون نهایی (%)", "Final pass score (%)", "Bestehensgrenze Abschluss (%)", "Final geçme puanı (%)"])}<input type="number" min={1} max={100} dir="ltr" value={Number(req.finalScore ?? 75)} onChange={(e) => setReq("finalScore", Number(e.target.value))} /></label>
        <label>{tx(["تعداد تلاش (۰ = نامحدود)", "Attempt limit (0 = unlimited)", "Versuchslimit (0 = unbegrenzt)", "Deneme sınırı (0 = sınırsız)"])}<input type="number" min={0} max={100} dir="ltr" value={Number(req.attemptLimit ?? 0)} onChange={(e) => setReq("attemptLimit", Number(e.target.value))} /></label>
        <label className="gc-switch span-2"><input type="checkbox" checked={!!(req.finalRequired ?? true)} onChange={(e) => setReq("finalRequired", e.target.checked)} />{tx(["آزمون نهایی الزامی است", "Final assessment required", "Abschlussprüfung erforderlich", "Final değerlendirme zorunlu"])}</label>
        {([["audience", ["مخاطب دوره", "Target audience", "Zielgruppe", "Hedef kitle"]], ["teachingStyle", ["سبک تدریس", "Teaching style", "Unterrichtsstil", "Öğretim tarzı"]], ["depth", ["عمق محتوا", "Content depth", "Inhaltstiefe", "İçerik derinliği"]], ["instructions", ["دستورهای تکمیلی", "Additional instructions", "Weitere Anweisungen", "Ek talimatlar"]]] as [string, Tx][]).map(([k, l]) => <label key={k}>{tx(l)}<textarea rows={2} maxLength={k === "instructions" ? 6000 : 1000} value={String(config[k] ?? "")} onChange={(e) => setConfig({ ...config, [k]: e.target.value })} /></label>)}
        <label>{tx(["اهداف یادگیری — هر خط یک مورد", "Learning objectives — one per line", "Lernziele — eines pro Zeile", "Öğrenme hedefleri — satır başına bir"])}<textarea rows={3} value={((config.learningObjectives as string[]) || []).join("\n")} onChange={(e) => setConfig({ ...config, learningObjectives: e.target.value.split("\n") })} /></label>
        <label>{tx(["تعداد فصل‌ها", "Number of chapters", "Anzahl Kapitel", "Bölüm sayısı"])}<input type="number" min={3} max={12} dir="ltr" value={Number(config.chapterCount ?? 6)} onChange={(e) => setConfig({ ...config, chapterCount: Number(e.target.value) })} /></label>
        <div className="span-2 domain-actions"><Button onClick={() => void save()}><Icon name="Save" size={15} />{tx(["ذخیرهٔ تنظیمات — رایگان", "Save settings · free", "Einstellungen speichern · kostenlos", "Ayarları kaydet · ücretsiz"])}</Button></div>
      </fieldset>

      {meta.status === "BLUEPRINT_REVIEW" && bp && <section className="course-blueprint">
        <h4>{tx(["بازبینی طرح درس قبل از تولید محتوا", "Review the blueprint before lessons are generated", "Lehrplan vor der Lektionserstellung prüfen", "Dersler oluşturulmadan önce planı incele"])}</h4>
        <p className="admin-note">{tx(["اعتبار رزرو شده است. تأیید طرح هزینهٔ دوباره ندارد؛ لغو یا انقضا اعتبار را برمی‌گرداند.", "Credits are reserved. Approving costs nothing extra; cancelling or expiry refunds them.", "Credits sind reserviert. Genehmigung kostet nichts extra; Abbruch erstattet.", "Krediler ayrıldı. Onay ek ücret almaz; iptal iade eder."])}</p>
        <div className="domain-fields">
          <label className="span-2">{tx(["خلاصهٔ دوره", "Course summary", "Kursübersicht", "Kurs özeti"])}<textarea rows={3} value={bp.overview} onChange={(e) => updBp((b) => { b.overview = e.target.value; })} /></label>
          <label className="span-2">{tx(["اهداف یادگیری — هر خط یک هدف", "Learning outcomes — one per line", "Lernziele — eines pro Zeile", "Öğrenme hedefleri — satır başına bir"])}<textarea rows={4} value={bp.objectives.join("\n")} onChange={(e) => updBp((b) => { b.objectives = e.target.value.split("\n"); })} /></label>
          {bp.chapters.map((c, k) => <fieldset key={k} className="span-2 course-chapter">
            <legend>{tx(["فصل", "Chapter", "Kapitel", "Bölüm"])} {k + 1}</legend>
            <input aria-label={tx(["عنوان فصل", "Chapter title", "Kapiteltitel", "Bölüm başlığı"])} value={c.title} onChange={(e) => updBp((b) => { b.chapters[k].title = e.target.value; })} />
            <textarea aria-label={tx(["درس‌ها — هر خط یک درس", "Lessons — one per line", "Lektionen — eine pro Zeile", "Dersler — satır başına bir"])} rows={Math.max(2, c.lessons.length)} value={c.lessons.join("\n")} onChange={(e) => updBp((b) => { b.chapters[k].lessons = e.target.value.split("\n"); })} />
            <div className="domain-actions">
              <Button disabled={k === 0} onClick={() => updBp((b) => { [b.chapters[k - 1], b.chapters[k]] = [b.chapters[k], b.chapters[k - 1]]; })}><Icon name="ArrowUp" size={14} /></Button>
              <Button disabled={bp.chapters.length <= 3} onClick={() => updBp((b) => { b.chapters.splice(k, 1); })}><Icon name="Trash2" size={14} />{tx(["حذف فصل", "Remove chapter", "Kapitel entfernen", "Bölümü kaldır"])}</Button>
            </div>
          </fieldset>)}
          <div className="span-2"><Button disabled={bp.chapters.length >= 12} onClick={() => updBp((b) => { b.chapters.push({ title: tx(["فصل جدید", "New chapter", "Neues Kapitel", "Yeni bölüm"]), lessons: [tx(["درس جدید", "New lesson", "Neue Lektion", "Yeni ders"])] }); })}><Icon name="Plus" size={14} />{tx(["افزودن فصل", "Add chapter", "Kapitel hinzufügen", "Bölüm ekle"])}</Button></div>
          <label className="span-2">{tx(["پروژهٔ پایانی", "Final project", "Abschlussprojekt", "Bitirme projesi"])}<input value={bp.finalProject.title} onChange={(e) => updBp((b) => { b.finalProject.title = e.target.value; })} /><textarea rows={3} value={bp.finalProject.instructions} onChange={(e) => updBp((b) => { b.finalProject.instructions = e.target.value; })} /></label>
        </div>
        <div className="domain-actions">
          <Button variant="primary" disabled={busy} onClick={() => setAsk("approve")}><Icon name="CheckCircle2" size={15} />{tx(["تأیید طرح و تولید درس‌ها", "Approve blueprint & generate lessons", "Lehrplan genehmigen & Lektionen erstellen", "Planı onayla ve dersleri oluştur"])}</Button>
          <Button variant="danger" disabled={busy} onClick={() => setAsk("cancel")}>{tx(["لغو و بازگشت اعتبار", "Cancel & refund", "Abbrechen & erstatten", "İptal ve iade"])}</Button>
        </div>
      </section>}
      {ask && (
        <Modal title={ask === "approve" ? tx(["تأیید طرح درس", "Approve the blueprint", "Lehrplan genehmigen", "Planı onayla"]) : tx(["لغو تولید", "Cancel generation", "Generierung abbrechen", "Üretimi iptal et"])} onClose={() => setAsk(null)}>
          <p>{ask === "approve" ? tx(["تولید درس‌ها با اعتبار رزروشده شروع می‌شود و دیگر قابل لغو نیست.", "Lesson generation starts with the reserved credits and can no longer be cancelled.", "Die Lektionserstellung startet mit den reservierten Credits und ist nicht mehr abbrechbar.", "Ders üretimi ayrılmış kredilerle başlar ve artık iptal edilemez."]) : tx(["طرح کنار گذاشته می‌شود و اعتبار رزروشده برمی‌گردد.", "The blueprint is discarded and the reserved credits are refunded.", "Der Lehrplan wird verworfen und die Credits erstattet.", "Plan atılır ve ayrılan krediler iade edilir."])}</p>
          <div className="domain-actions"><Button variant={ask === "approve" ? "primary" : "danger"} disabled={busy} onClick={() => void blueprint(ask === "cancel")}>{tx(["بله", "Yes", "Ja", "Evet"])}</Button></div>
        </Modal>
      )}
    </details>
  );
}

/* Selective regeneration */
type RegenJob = { id: string; status: string; checkpoint: string; credits: number; userId: string; idempotencyKey: string };
const REGEN: Record<string, Tx> = { description: ["معرفی", "Description", "Beschreibung", "Açıklama"], chapter: ["فصل / ماژول", "Chapter / module", "Kapitel / Modul", "Bölüm / modül"], lesson: ["درس", "Lesson", "Lektion", "Ders"], quiz: ["آزمون درس", "Lesson quiz", "Lektionsquiz", "Ders quizi"], examples: ["مثال‌ها", "Examples", "Beispiele", "Örnekler"], summary: ["خلاصه", "Summary", "Zusammenfassung", "Özet"], flashcards: ["فلش‌کارت‌ها", "Flashcards", "Lernkarten", "Bilgi kartları"] };
function SelectiveRegeneration({ id, version, content, disabled, refresh }: { id: string; version: number; content: Content; disabled: boolean; refresh: () => Promise<void> }) {
  const { n, tx } = useT();
  const [action, setAction] = useState("lesson");
  const [lessonId, setLessonId] = useState("0:0");
  const [chapter, setChapter] = useState(0);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<RegenJob[]>([]);
  const [preview, setPreview] = useState<RegenJob | null>(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/api/admin/ai-courses/${encodeURIComponent(id)}/regenerate`;
  const load = useCallback(async () => {
    const d = await api<{ costs: Record<string, number>; jobs: RegenJob[]; actorId: string }>(url);
    setCosts(d.costs); setJobs(d.jobs);
    for (const key of Object.keys(localStorage).filter((k) => k.startsWith(`academy-fragment:${id}:`))) {
      try { const r = JSON.parse(localStorage.getItem(key)!); if (d.jobs.some((j) => j.userId === d.actorId && j.idempotencyKey === r.idempotencyKey && ["PREVIEW_READY", "APPLIED", "REFUNDED"].includes(j.status))) localStorage.removeItem(key); } catch { localStorage.removeItem(key); }
    }
  }, [id, url]);
  useEffect(() => { void load().catch((e) => toast.error(e.message)); }, [load]);
  useEffect(() => { if (!jobs.some((j) => ["QUEUED_CONTENT", "GENERATING"].includes(j.status))) return; const t = setInterval(() => void load().catch(() => undefined), 4000); return () => clearInterval(t); }, [jobs, load]);
  async function generate() {
    setAsk(false); setBusy(true);
    const key = `academy-fragment:${id}:${action}:${lessonId}:${chapter}:${version}`;
    try {
      let request;
      const stored = localStorage.getItem(key);
      if (stored) request = JSON.parse(stored);
      else { request = { action, version, idempotencyKey: crypto.randomUUID(), expectedCredits: costs[action], ...(action === "chapter" ? { chapterIndex: chapter } : action === "description" ? {} : { lessonId }) }; localStorage.setItem(key, JSON.stringify(request)); }
      await api(url, { method: "POST", body: JSON.stringify(request) });
      await load(); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  async function apply() {
    if (!preview) return;
    setBusy(true);
    try { await api(url, { method: "PATCH", body: JSON.stringify({ jobId: preview.id, confirm: true }) }); setPreview(null); await load(); await refresh(); toast.success(tx(["جایگزین شد", "Replaced", "Ersetzt", "Değiştirildi"])); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const pretty = (raw: string) => { try { return JSON.stringify(typeof raw === "string" ? JSON.parse(raw) : raw, null, 2); } catch { return String(raw); } };
  const cp = preview ? (() => { try { return JSON.parse(preview.checkpoint); } catch { return {}; } })() : null;
  return (
    <details className="panel course-section">
      <summary>{tx(["بازتولید انتخابی با AI", "Selective AI regeneration", "Selektive KI-Neugenerierung", "Seçici AI yeniden üretimi"])}</summary>
      <div className="domain-toolbar">
        <select aria-label={tx(["بخش", "Part", "Teil", "Bölüm"])} value={action} onChange={(e) => { setAction(e.target.value); if (lessonId === "final" && e.target.value !== "quiz") setLessonId("0:0"); }}>{Object.keys(REGEN).map((k) => <option key={k} value={k}>{tx(REGEN[k])}</option>)}</select>
        {action === "chapter" ? <select aria-label={tx(["فصل", "Chapter", "Kapitel", "Bölüm"])} value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>{content.chapters.map((c, k) => <option key={k} value={k}>{c.title}</option>)}</select>
          : action !== "description" && <select aria-label={tx(["درس", "Lesson", "Lektion", "Ders"])} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>{content.chapters.flatMap((c, ci) => c.lessons.map((l, li) => <option key={`${ci}:${li}`} value={`${ci}:${li}`}>{l.title}</option>))}{action === "quiz" && <option value="final">{tx(["آزمون نهایی", "Final assessment", "Abschlussprüfung", "Final değerlendirme"])}</option>}</select>}
        <Button variant="primary" disabled={busy || disabled || costs[action] === undefined} onClick={() => setAsk(true)}><Icon name="Sparkles" size={15} />{tx(["تولید پیش‌نمایش", "Generate preview", "Vorschau erstellen", "Önizleme oluştur"])} · {costs[action] === undefined ? "…" : n(costs[action])} {tx(["اعتبار", "credits", "Credits", "kredi"])}</Button>
      </div>
      {disabled && <p className="fine-print">{tx(["برای بازتولید، اول تغییرات ذخیره‌نشده را ذخیره کن.", "Save your unsaved changes before regenerating.", "Vor dem Neugenerieren speichern.", "Yeniden üretmeden önce değişiklikleri kaydet."])}</p>}
      <p className="fine-print">{tx(["محتوا فقط پس از مقایسه و تأیید تو جایگزین می‌شود؛ تأیید هزینهٔ اضافه ندارد.", "Content is replaced only after you compare and confirm; confirming costs nothing extra.", "Inhalte werden erst nach Vergleich und Bestätigung ersetzt; ohne Zusatzkosten.", "İçerik yalnızca karşılaştırıp onayladıktan sonra değişir; onay ek ücret almaz."])}</p>
      {jobs.map((j) => <div key={j.id} className="access-row"><span><span className="badge">{j.status}</span> {n(j.credits)} {tx(["اعتبار", "credits", "Credits", "kredi"])}</span>{j.status === "PREVIEW_READY" && <Button onClick={() => setPreview(j)}>{tx(["مقایسه و بازبینی", "Compare & review", "Vergleichen & prüfen", "Karşılaştır ve incele"])}</Button>}</div>)}
      {preview && cp && (
        <Modal title={tx(["قبل / پیش‌نمایش جدید", "Before / new preview", "Vorher / neue Vorschau", "Önce / yeni önizleme"])} onClose={() => setPreview(null)}>
          <div className="course-compare"><pre dir="ltr">{pretty(cp.before)}</pre><pre dir="ltr">{pretty(cp.candidate)}</pre></div>
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => void apply()}>{tx(["تأیید جایگزینی — بدون هزینهٔ اضافه", "Confirm replacement · no extra charge", "Ersetzen bestätigen · ohne Zusatzkosten", "Değiştirmeyi onayla · ek ücret yok"])}</Button></div>
        </Modal>
      )}
      {ask && (
        <Modal title={tx(["بازتولید با AI", "AI regeneration", "KI-Neugenerierung", "AI yeniden üretimi"])} onClose={() => setAsk(false)}>
          <p>{tx([`یک پیش‌نمایش «${tx(REGEN[action])}» ساخته می‌شود و ${n(costs[action] ?? 0)} اعتبار مصرف می‌کند.`, `A “${tx(REGEN[action])}” preview is generated for ${n(costs[action] ?? 0)} credits.`, `Eine Vorschau „${tx(REGEN[action])}“ wird für ${n(costs[action] ?? 0)} Credits erstellt.`, `“${tx(REGEN[action])}” önizlemesi ${n(costs[action] ?? 0)} krediye oluşturulur.`])}</p>
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => void generate()}>{tx(["بله، بساز", "Yes, generate", "Ja, erstellen", "Evet, oluştur"])}</Button></div>
        </Modal>
      )}
    </details>
  );
}

/* Revision history */
function Revisions({ id, version, disabled, refresh }: { id: string; version: number; disabled: boolean; refresh: () => Promise<void> }) {
  const { tx, tag } = useT();
  const [rows, setRows] = useState<{ id: string; version: number; createdAt: string; reason: string }[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/api/admin/ai-courses/${encodeURIComponent(id)}/revisions`;
  useEffect(() => { setSel(null); setPreview(""); setOk(false); api<{ revisions: { id: string; version: number; createdAt: string; reason: string }[] }>(url).then((d) => setRows(d.revisions)).catch(() => setRows([])); }, [url, version]);
  async function choose(rid: string) {
    setSel(rid); setOk(false); setPreview("");
    try { const d = await api<{ revision: { metadata: string; content: string } }>(url + "?revision=" + encodeURIComponent(rid)); setPreview(JSON.stringify({ metadata: JSON.parse(d.revision.metadata), content: JSON.parse(d.revision.content) }, null, 2)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }
  async function restore() {
    if (!sel || !ok) return;
    setBusy(true);
    try { await api(url, { method: "POST", body: JSON.stringify({ revisionId: sel, version, confirm: true }) }); await refresh(); toast.success(tx(["به‌عنوان پیش‌نویس جدید بازگردانی شد", "Restored as a new draft", "Als neuer Entwurf wiederhergestellt", "Yeni taslak olarak geri yüklendi"])); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  return (
    <details className="panel course-section">
      <summary>{tx(["تاریخچه و بازگردانی پیش‌نویس", "Draft history & restore", "Entwurfsverlauf & Wiederherstellung", "Taslak geçmişi ve geri yükleme"])}</summary>
      <nav className="gc-chips">{rows?.map((r) => <button key={r.id} aria-pressed={sel === r.id} onClick={() => void choose(r.id)}>v{r.version} · {new Date(r.createdAt).toLocaleDateString(tag)}</button>)}</nav>
      {rows && !rows.length && <p className="fine-print">{tx(["هنوز ویرایش قبلی ثبت نشده است.", "No earlier revisions yet.", "Noch keine früheren Versionen.", "Henüz önceki sürüm yok."])}</p>}
      {preview && <>
        <pre dir="ltr" className="course-json">{preview}</pre>
        <label className="gc-switch"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />{tx(["این نسخه به‌عنوان پیش‌نویس جدید برگردد. انتشار دوباره تأیید می‌خواهد و نسخهٔ فعلی دانشجویان حفظ می‌شود.", "Restore this revision as a new draft. Publishing needs review again; current student versions stay.", "Als neuen Entwurf wiederherstellen. Veröffentlichung erfordert erneute Prüfung; Lernversionen bleiben.", "Yeni taslak olarak geri yükle. Yayın yeniden inceleme ister; öğrenci sürümleri korunur."])}</label>
        <div className="domain-actions"><Button disabled={disabled || busy || !ok} onClick={() => void restore()}><Icon name="History" size={15} />{tx(["بازگردانی — رایگان", "Restore · free", "Wiederherstellen · kostenlos", "Geri yükle · ücretsiz"])}</Button></div>
      </>}
    </details>
  );
}

/* Structured editor: overview, objectives, chapters, lessons, blocks */
function StructuredEditor({ content, disabled, change }: { content: Content; disabled: boolean; change: (c: Content) => void }) {
  const { tx } = useT();
  const [ci, setCi] = useState(0);
  const [li, setLi] = useState(0);
  const [blockType, setBlockType] = useState("paragraph");
  const [json, setJson] = useState("");
  const chapter = content.chapters[ci] || content.chapters[0];
  const lesson = chapter.lessons[li] || chapter.lessons[0];
  const edit = (fn: (c: Content) => void) => { const c = structuredClone(content); fn(c); change(c); };
  const move = <T,>(items: T[], k: number, d: number) => { if (k + d < 0 || k + d >= items.length) return; [items[k], items[k + d]] = [items[k + d], items[k]]; };
  function addBlock() {
    edit((c) => {
      const l = c.chapters[ci].lessons[li];
      const blocks = l.blocks || (l.blocks = [{ type: "paragraph", text: l.content }, { type: "summary", text: l.activity }]);
      if (blockType === "code") blocks.push({ type: "code", code: "// Add a reviewed code example", language: "javascript" });
      else if (blockType === "steps" || blockType === "flashcards") blocks.push({ type: blockType, items: ["Edit this learning item"] });
      else if (blockType === "table") blocks.push({ type: "table", headers: ["Heading"], rows: [["Value"]] });
      else if (blockType === "image") blocks.push({ type: "image", url: "", alt: "Replace with an uploaded image and accurate alt text" });
      else if (blockType === "knowledgeCheck") blocks.push({ type: "knowledgeCheck", prompt: "Edit the practice question", answer: "Edit its explanation" });
      else blocks.push({ type: blockType, text: "Edit this draft block before publishing" });
    });
  }
  return (
    <details className="panel course-section" open>
      <summary>{tx(["ویرایش محتوا", "Edit content", "Inhalt bearbeiten", "İçeriği düzenle"])}</summary>
      <fieldset disabled={disabled} className="domain-fields">
        <label className="span-2">{tx(["معرفی دوره", "Course overview", "Kursübersicht", "Kurs özeti"])}<textarea rows={4} value={content.overview} onChange={(e) => edit((c) => { c.overview = e.target.value; })} /></label>
        <label className="span-2">{tx(["هدف‌های یادگیری — هر خط یک مورد", "Learning objectives — one per line", "Lernziele — eines pro Zeile", "Öğrenme hedefleri — satır başına bir"])}<textarea rows={4} value={content.objectives.join("\n")} onChange={(e) => edit((c) => { c.objectives = e.target.value.split("\n"); })} /></label>
        <label>{tx(["فصل", "Chapter", "Kapitel", "Bölüm"])}<select value={ci} onChange={(e) => { setCi(Number(e.target.value)); setLi(0); }}>{content.chapters.map((c, k) => <option key={k} value={k}>{k + 1}. {c.title}</option>)}</select></label>
        <label>{tx(["درس", "Lesson", "Lektion", "Ders"])}<select value={li} onChange={(e) => setLi(Number(e.target.value))}>{chapter.lessons.map((l, k) => <option key={k} value={k}>{k + 1}. {l.title}</option>)}</select></label>
        <label className="span-2">{tx(["عنوان فصل", "Chapter title", "Kapiteltitel", "Bölüm başlığı"])}<input value={chapter.title} onChange={(e) => edit((c) => { c.chapters[ci].title = e.target.value; })} /></label>
        <div className="span-2 domain-actions">
          <Button disabled={ci === 0} onClick={() => { edit((c) => move(c.chapters, ci, -1)); setCi(ci - 1); }}><Icon name="ArrowUp" size={14} />{tx(["فصل", "Chapter", "Kapitel", "Bölüm"])}</Button>
          <Button disabled={ci === content.chapters.length - 1} onClick={() => { edit((c) => move(c.chapters, ci, 1)); setCi(ci + 1); }}><Icon name="ArrowDown" size={14} />{tx(["فصل", "Chapter", "Kapitel", "Bölüm"])}</Button>
          <Button disabled={content.chapters.length >= 12} onClick={() => { edit((c) => c.chapters.push({ title: "New draft chapter", lessons: [structuredClone(lesson)] })); setCi(content.chapters.length); setLi(0); }}><Icon name="Plus" size={14} />{tx(["افزودن فصل", "Add chapter", "Kapitel hinzufügen", "Bölüm ekle"])}</Button>
          <Button disabled={content.chapters.length <= 3} onClick={() => { edit((c) => { c.chapters.splice(ci, 1); }); setCi(0); setLi(0); }}><Icon name="Trash2" size={14} />{tx(["حذف فصل", "Remove chapter", "Kapitel entfernen", "Bölümü kaldır"])}</Button>
        </div>
        <label className="span-2">{tx(["عنوان درس", "Lesson title", "Lektionstitel", "Ders başlığı"])}<input value={lesson.title} onChange={(e) => edit((c) => { c.chapters[ci].lessons[li].title = e.target.value; })} /></label>
        <label className="span-2">{tx(["متن درس (حداقل ۲۰۰ حرف)", "Lesson text (200+ characters)", "Lektionstext (200+ Zeichen)", "Ders metni (200+ karakter)"])}<textarea rows={6} value={lesson.content} onChange={(e) => edit((c) => { c.chapters[ci].lessons[li].content = e.target.value; })} /></label>
        <label className="span-2">{tx(["تمرین عملی", "Practice task", "Praktische Übung", "Pratik görev"])}<textarea rows={3} value={lesson.activity} onChange={(e) => edit((c) => { c.chapters[ci].lessons[li].activity = e.target.value; })} /></label>
        <div className="span-2 domain-actions">
          <Button disabled={li === 0} onClick={() => { edit((c) => move(c.chapters[ci].lessons, li, -1)); setLi(li - 1); }}><Icon name="ArrowUp" size={14} />{tx(["درس", "Lesson", "Lektion", "Ders"])}</Button>
          <Button disabled={li === chapter.lessons.length - 1} onClick={() => { edit((c) => move(c.chapters[ci].lessons, li, 1)); setLi(li + 1); }}><Icon name="ArrowDown" size={14} />{tx(["درس", "Lesson", "Lektion", "Ders"])}</Button>
          <Button disabled={chapter.lessons.length >= 8} onClick={() => { edit((c) => c.chapters[ci].lessons.push({ ...structuredClone(lesson), title: "New draft lesson" })); setLi(chapter.lessons.length); }}><Icon name="Plus" size={14} />{tx(["افزودن درس", "Add lesson", "Lektion hinzufügen", "Ders ekle"])}</Button>
          <Button disabled={chapter.lessons.length <= 1} onClick={() => { edit((c) => { c.chapters[ci].lessons.splice(li, 1); }); setLi(0); }}><Icon name="Trash2" size={14} />{tx(["حذف درس", "Remove lesson", "Lektion entfernen", "Dersi kaldır"])}</Button>
        </div>
        <div className="span-2 course-blocks">
          <h4>{tx(["بلوک‌های درس", "Lesson blocks", "Lektionsblöcke", "Ders blokları"])}</h4>
          {lesson.blocks?.map((b, k) => <details key={`${ci}:${li}:${k}`} className="course-block">
            <summary>{k + 1}. <bdi dir="ltr">{b.type}</bdi></summary>
            {b.type === "image" && <ImageUpload onUploaded={(url) => edit((c) => { Object.assign(c.chapters[ci].lessons[li].blocks![k], { url }); })} />}
            {Object.entries(b).filter(([key]) => key !== "type").map(([key, v]) => <label key={key}><bdi dir="ltr">{key}</bdi><textarea rows={key === "code" || key === "text" ? 4 : 2} dir={key === "code" || key === "url" ? "ltr" : undefined} value={Array.isArray(v) ? JSON.stringify(v) : String(v ?? "")} onChange={(e) => { let value: unknown = e.target.value; if (Array.isArray(v)) { try { value = JSON.parse(e.target.value); } catch { return; } } edit((c) => { Object.assign(c.chapters[ci].lessons[li].blocks![k], { [key]: value }); }); }} /></label>)}
            <div className="domain-actions">
              <Button disabled={k === 0} onClick={() => edit((c) => move(c.chapters[ci].lessons[li].blocks!, k, -1))}><Icon name="ArrowUp" size={14} /></Button>
              <Button disabled={k === lesson.blocks!.length - 1} onClick={() => edit((c) => move(c.chapters[ci].lessons[li].blocks!, k, 1))}><Icon name="ArrowDown" size={14} /></Button>
              <Button disabled={lesson.blocks!.length <= 2} onClick={() => edit((c) => { c.chapters[ci].lessons[li].blocks!.splice(k, 1); })}><Icon name="Trash2" size={14} />{tx(["حذف بلوک", "Remove block", "Block entfernen", "Bloğu kaldır"])}</Button>
            </div>
          </details>)}
          <div className="domain-toolbar">
            <select aria-label={tx(["نوع بلوک جدید", "New block type", "Neuer Blocktyp", "Yeni blok türü"])} value={blockType} onChange={(e) => setBlockType(e.target.value)}>{BLOCK_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
            <Button disabled={(lesson.blocks?.length || 0) >= 80} onClick={addBlock}><Icon name="Plus" size={14} />{tx(["افزودن بلوک", "Add block", "Block hinzufügen", "Blok ekle"])}</Button>
          </div>
        </div>
        <label className="span-2">{tx(["پروژهٔ پایانی", "Final project", "Abschlussprojekt", "Bitirme projesi"])}<input value={content.finalProject.title} onChange={(e) => edit((c) => { c.finalProject.title = e.target.value; })} /></label>
        <label>{tx(["شرح پروژه", "Project instructions", "Projektanleitung", "Proje yönergeleri"])}<textarea rows={4} value={content.finalProject.instructions} onChange={(e) => edit((c) => { c.finalProject.instructions = e.target.value; })} /></label>
        <label>{tx(["معیارهای ارزیابی — هر خط یک مورد", "Rubric — one per line", "Bewertungskriterien — eines pro Zeile", "Değerlendirme ölçütleri — satır başına bir"])}<textarea rows={4} value={content.finalProject.rubric.join("\n")} onChange={(e) => edit((c) => { c.finalProject.rubric = e.target.value.split("\n"); })} /></label>
        <details className="span-2">
          <summary className="fine-print">{tx(["ویرایش پیشرفتهٔ JSON کل دوره", "Advanced: whole-course JSON", "Erweitert: Kurs-JSON", "Gelişmiş: tüm kurs JSON"])}</summary>
          <textarea dir="ltr" rows={16} className="course-json" value={json || JSON.stringify(content, null, 2)} onChange={(e) => setJson(e.target.value)} />
          <div className="domain-actions"><Button disabled={!json} onClick={() => { try { const parsed = JSON.parse(json); if (!parsed || !Array.isArray(parsed.chapters) || !parsed.finalProject) throw Error(); change(parsed); setJson(""); toast.success(tx(["اعمال شد؛ ذخیره را فراموش نکن", "Applied; remember to save", "Übernommen; speichern nicht vergessen", "Uygulandı; kaydetmeyi unutma"])); } catch { toast.error(tx(["JSON معتبر نیست؛ تغییری اعمال نشد.", "Invalid JSON; nothing applied.", "Ungültiges JSON; nichts übernommen.", "Geçersiz JSON; uygulanmadı."])); } }}>{tx(["اعمال JSON", "Apply JSON", "JSON übernehmen", "JSON uygula"])}</Button></div>
        </details>
      </fieldset>
    </details>
  );
}

/* Quiz review: every lesson's questions with the correct answer */
function QuizReview({ content, disabled, change }: { content: Content; disabled: boolean; change: (c: Content) => void }) {
  const { tx } = useT();
  const edit = (fn: (c: Content) => void) => { const c = structuredClone(content); fn(c); change(c); };
  return (
    <details className="panel course-section">
      <summary>{tx(["بازبینی آزمون‌های درس‌ها", "Review lesson quizzes", "Lektionsquiz prüfen", "Ders quizlerini incele"])}</summary>
      <fieldset disabled={disabled} className="course-quizzes">
        {content.chapters.map((c, ci) => c.lessons.map((l, li) => <details key={`${ci}:${li}`} className="course-block">
          <summary>{ci + 1}.{li + 1} {l.title} <small>({l.quiz.length})</small></summary>
          {l.quiz.map((q, qi) => <div key={qi} className="course-question">
            <input aria-label={tx(["سؤال", "Question", "Frage", "Soru"])} value={q.question} onChange={(e) => edit((x) => { x.chapters[ci].lessons[li].quiz[qi].question = e.target.value; })} />
            {q.options.map((o, oi) => <label key={oi} className={"course-option" + (oi === q.correctIndex ? " correct" : "")}>
              <input type="radio" name={`q-${ci}-${li}-${qi}`} checked={oi === q.correctIndex} onChange={() => edit((x) => { x.chapters[ci].lessons[li].quiz[qi].correctIndex = oi; })} aria-label={tx(["پاسخ درست", "Correct answer", "Richtige Antwort", "Doğru cevap"])} />
              <input value={o} onChange={(e) => edit((x) => { x.chapters[ci].lessons[li].quiz[qi].options[oi] = e.target.value; })} />
            </label>)}
            <textarea rows={2} aria-label={tx(["توضیح پاسخ", "Explanation", "Erklärung", "Açıklama"])} value={q.explanation} onChange={(e) => edit((x) => { x.chapters[ci].lessons[li].quiz[qi].explanation = e.target.value; })} />
          </div>)}
        </details>))}
      </fieldset>
    </details>
  );
}

/* ───────────────────────── Preview ───────────────────────── */

function embedUrl(url: string) {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (["www.youtube.com", "youtube.com", "m.youtube.com"].includes(u.hostname)) id = u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : u.searchParams.get("v");
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(u.hostname)) { const v = u.pathname.split("/").filter(Boolean).pop(); if (v && /^\d+$/.test(v)) return `https://player.vimeo.com/video/${v}`; }
  } catch { /* not a URL */ }
  return null;
}
function Exercise({ b }: { b: Block }) {
  const { tx } = useT();
  const [show, setShow] = useState(false);
  return <section className="course-exercise"><h4>{b.prompt}</h4><textarea rows={3} aria-label={b.prompt} /><Button onClick={() => setShow(!show)}>{tx(["نمایش / پنهان‌کردن توضیح", "Show / hide explanation", "Erklärung ein/aus", "Açıklamayı göster/gizle"])}</Button>{show && <p>{b.answer}</p>}</section>;
}
function Blocks({ blocks, fallback }: { blocks?: Block[]; fallback: string }) {
  if (!blocks?.length) return <div className="course-blocks-view">{fallback.split(/\n\s*\n/).map((t, k) => <p key={k}>{t}</p>)}</div>;
  return <div className="course-blocks-view">{blocks.map((b, k) => {
    if (b.prompt !== undefined) return <Exercise key={k} b={b} />;
    if (b.type === "heading") return <h4 key={k}>{b.text}</h4>;
    if (b.type === "code") return <pre key={k} dir="ltr"><code>{b.code}</code></pre>;
    if (b.type === "table") return <div key={k} className="table-scroll"><table className="admin-finance-table"><thead><tr>{b.headers?.map((h, j) => <th key={j}>{h}</th>)}</tr></thead><tbody>{b.rows?.map((r, j) => <tr key={j}>{r.map((v, x) => <td key={x}>{v}</td>)}</tr>)}</tbody></table></div>;
    if (b.url !== undefined) {
      if (b.type === "videoEmbed") { const u = embedUrl(b.url); if (u) return <figure key={k}><iframe title={b.alt} src={u} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen /><figcaption>{b.caption}</figcaption></figure>; }
      if (b.type === "image") return b.url ? <figure key={k}><img src={b.url} alt={b.alt} loading="lazy" /><figcaption>{b.caption}</figcaption></figure> : null;
      return <a key={k} className="btn" href={b.url} target="_blank" rel="noopener noreferrer">{b.alt} ↗</a>;
    }
    if (b.items) return b.type === "flashcards" ? <div key={k} className="course-flashcards">{b.items.map((v, j) => <details key={j}><summary>{v.split("::")[0]}</summary><p>{v.split("::").slice(1).join("::") || v}</p></details>)}</div> : <ol key={k}>{b.items.map((v, j) => <li key={j}>{v}</li>)}</ol>;
    if (b.text !== undefined) return <p key={k} className={["tip", "keyConcept", "warning", "callout", "summary"].includes(b.type) ? "course-callout" : ""}>{b.text}</p>;
    return null;
  })}</div>;
}

export function LiveCoursePreview({ id }: { id: string }) {
  const { n, tx } = useT();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<string>(() => (typeof location === "undefined" ? "" : new URLSearchParams(location.search).get("lesson") || ""));
  useEffect(() => { api<{ course: Course }>("/api/admin/ai-courses/" + encodeURIComponent(id)).then((d) => setCourse(d.course)).catch((e) => setError(e.message)); }, [id]);
  const back = <Link className="btn" href={"/admin/ai-courses?course=" + encodeURIComponent(id)}><Icon name="ArrowRight" size={16} />{tx(["بازگشت به ویرایشگر", "Back to the editor", "Zurück zum Editor", "Düzenleyiciye dön"])}</Link>;
  if (error) return <>{back}<p className="admin-alert">{error === "NOT_FOUND" ? tx(["دوره پیدا نشد.", "Course not found.", "Kurs nicht gefunden.", "Kurs bulunamadı."]) : error}</p></>;
  if (!course) return <section className="panel" aria-busy="true" />;
  let content: Content | null = null;
  try { content = course.content ? JSON.parse(course.content) : null; } catch { content = null; }
  if (!content) return <>{back}<p className="admin-note">{tx(["این دوره هنوز محتوایی ندارد.", "This course has no content yet.", "Dieser Kurs hat noch keinen Inhalt.", "Bu kursun henüz içeriği yok."])}</p></>;
  const lessons = content.chapters.flatMap((c, ci) => c.lessons.map((l, li) => ({ ...l, id: `${ci}:${li}`, chapter: c.title })));
  const lesson = lessons.find((l) => l.id === current) || lessons[0];
  const pick = (lid: string) => { setCurrent(lid); history.replaceState(null, "", `/admin/ai-courses/${encodeURIComponent(id)}/preview?lesson=${lid}`); };
  return (
    <>
      <nav className="admin-finance-links">{back}</nav>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Eye" size={28} /></span>
        <div>
          <h2>{course.title}</h2>
          <p>{tx(["پیش‌نمایش مدیریت — پیشرفت یا اعتبار تغییر نمی‌کند.", "Admin preview — no progress or credits change.", "Admin-Vorschau — kein Fortschritt, keine Credits.", "Yönetici önizlemesi — ilerleme veya kredi değişmez."])} {statusBadge(course.status, tx)} v{course.version} · {n(lessons.length)} {tx(["درس", "lessons", "Lektionen", "ders"])}</p>
        </div>
      </div>
      <p className="admin-note">{content.overview}</p>
      <div className="course-preview">
        <nav className="admin-pick-list" aria-label={tx(["سرفصل‌ها", "Curriculum", "Lehrplan", "Müfredat"])}>{lessons.map((l) => <button key={l.id} className={l.id === lesson.id ? "selected" : ""} onClick={() => pick(l.id)}><span>{l.title}</span><small>{l.chapter}</small></button>)}</nav>
        <article className="panel course-lesson" dir={course.language === "fa" ? "rtl" : "ltr"}>
          <small>{lesson.chapter}</small>
          <h3>{lesson.title}</h3>
          <Blocks blocks={lesson.blocks} fallback={lesson.content} />
          <section className="admin-note"><b>{tx(["تمرین", "Practice", "Übung", "Alıştırma"])}</b><p>{lesson.activity}</p></section>
          <details><summary>{tx(["آزمون و پاسخ‌ها — فقط برای مدیر", "Quiz and answers — admin only", "Quiz und Antworten — nur Admin", "Quiz ve cevaplar — yalnızca yönetici"])}</summary>
            {lesson.quiz.map((q, k) => <div key={k} className="course-question"><b>{q.question}</b><ol>{q.options.map((o, j) => <li key={j} className={j === q.correctIndex ? "correct" : ""}>{o}</li>)}</ol><p className="fine-print">{q.explanation}</p></div>)}
          </details>
        </article>
      </div>
    </>
  );
}
