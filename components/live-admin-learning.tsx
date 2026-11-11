"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin learning pages on aifekr.com:
 * - LiveAcademy (/admin/academy[?userId=]): /api/admin/academy (overview), /majors,
 *   /certificates (revoke with a reason, reissue PDF keeping the original id and date)
 *   and /paths (learning paths).
 * - LiveStudentAdmin (/admin/student): the student module's global default and the
 *   thesis-assist credit price (/api/admin/student); both ask before saving.
 */
type Tx = [string, string, string, string];
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { n, i, tx, tag };
}
async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d as T;
}

/* ───────────────────────── Academy ───────────────────────── */

type Major = { id: string; name: string; slug: string; description: string; faculty: string; status: string; specializations: { name: string }[] };
type Certificate = { id: string; studentName: string; courseTitle: string; status: string; issuedAt: string; verificationCode: string; completion: { courseId: string } };
type Overview = { metrics: Record<string, number | null>; profile: { major: { name: string } | null } | null; enrollments: { id: string; userId: string; studentName: string; progressPercent: number | null; version: number; state: string; completed: string; course: { title: string } }[]; attempts: { id: string; userId: string; studentName: string; answers: string; assessmentId: string; score: number; passed: boolean; createdAt: string }[] };
type PathRow = { id: string; title: string; description: string; majorId: string | null; status: string; courses: string };
type PathForm = { id?: string; title: string; description: string; majorId: string; status: string; courses: { courseId: string; requiredBeforeNext: boolean }[] };
const METRICS: Record<string, Tx> = {
  totalCourses: ["همهٔ دوره‌ها", "Total courses", "Alle Kurse", "Tüm kurslar"], publishedCourses: ["دوره‌های منتشرشده", "Published courses", "Veröffentlichte Kurse", "Yayınlanan kurslar"],
  activeEnrollments: ["ثبت‌نام‌های فعال", "Active enrollments", "Aktive Einschreibungen", "Aktif kayıtlar"], averageQuizScore: ["میانگین نمرهٔ آزمون", "Average quiz score", "Durchschnittliche Note", "Ortalama quiz puanı"],
  totalEnrollments: ["همهٔ ثبت‌نام‌ها", "Total enrollments", "Alle Einschreibungen", "Tüm kayıtlar"], verifiedCompletions: ["تکمیل‌های تأییدشده", "Verified completions", "Verifizierte Abschlüsse", "Doğrulanmış tamamlamalar"],
  certificatesIssued: ["گواهی‌های صادرشده", "Certificates issued", "Ausgestellte Zertifikate", "Verilen sertifikalar"], certificateVerifications: ["استعلام گواهی‌ها", "Certificate verifications", "Zertifikatsprüfungen", "Sertifika doğrulamaları"],
  completionRate: ["نرخ تکمیل (%)", "Completion rate (%)", "Abschlussquote (%)", "Tamamlama oranı (%)"],
};
const TABS: Record<string, Tx> = { dashboard: ["داشبورد", "Dashboard", "Dashboard", "Panel"], majors: ["رشته‌ها", "Majors", "Studienfächer", "Bölümler"], students: ["ثبت‌نام‌ها و آزمون‌ها", "Enrollments & assessments", "Einschreibungen & Prüfungen", "Kayıtlar ve değerlendirmeler"], certificates: ["گواهی‌ها", "Certificates", "Zertifikate", "Sertifikalar"], paths: ["مسیرهای یادگیری", "Learning paths", "Lernpfade", "Öğrenme yolları"] };
const ACTIVE: Tx = ["فعال", "Active", "Aktiv", "Aktif"];
const ARCHIVED: Tx = ["بایگانی", "Archived", "Archiviert", "Arşivlendi"];
const EMPTY_MAJOR = { name: "", slug: "", description: "", faculty: "", status: "ACTIVE", specializations: [] as string[] };
const EMPTY_PATH: PathForm = { title: "", description: "", majorId: "", status: "DRAFT", courses: [{ courseId: "", requiredBeforeNext: false }] };

export function LiveAcademy() {
  const { n, tx, tag } = useT();
  const [userId] = useState(() => (typeof location === "undefined" ? "" : new URLSearchParams(location.search).get("userId") || ""));
  const tabs = userId ? ["students", "certificates"] : ["dashboard", "majors", "students", "certificates", "paths"];
  const [tab, setTab] = useState(tabs[0]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [filter, setFilter] = useState({ search: "", status: "", from: "", to: "" });
  const [major, setMajor] = useState<typeof EMPTY_MAJOR & { id?: string }>(EMPTY_MAJOR);
  const [path, setPath] = useState<PathForm>(EMPTY_PATH);
  const [revoke, setRevoke] = useState<Certificate | null>(null);
  const [reissue, setReissue] = useState<Certificate | null>(null);
  const [reason, setReason] = useState("");
  const [download, setDownload] = useState("");
  const [busy, setBusy] = useState(false);
  const [courseList, setCourseList] = useState<{ id: string; title: string; status: string }[] | null>(null);
  useEffect(() => { if (tab === "paths" && !courseList) api<{ courses: { id: string; title: string; status: string }[] }>("/api/admin/ai-courses").then((d) => setCourseList(d.courses)).catch(() => setCourseList([])); }, [tab, courseList]);
  const q = userId ? "userId=" + encodeURIComponent(userId) : "";
  const loadCerts = useCallback(async () => {
    const p = new URLSearchParams({ search: filter.search, status: filter.status, from: filter.from, to: filter.to });
    if (userId) p.set("userId", userId);
    const d = await api<{ certificates: Certificate[] }>("/api/admin/academy/certificates?" + p);
    setCerts(d.certificates);
  }, [filter, userId]);
  const load = useCallback(async () => {
    try {
      const [a, b, d] = await Promise.all([api<{ majors: Major[] }>("/api/admin/academy/majors"), api<Overview>("/api/admin/academy" + (q ? "?" + q : "")), api<{ paths: PathRow[] }>("/api/admin/academy/paths")]);
      setMajors(a.majors); setOverview(b); setPaths(d.paths);
      await loadCerts();
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function mutate(url: string, method: string, body: unknown) {
    setBusy(true);
    try { await api(url, { method, body: JSON.stringify(body) }); await load(); toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); return true; }
    catch (e) {
      const m = e instanceof Error ? e.message : "FAILED";
      toast.error(m === "INVALID_PATH" ? tx(["عنوان حداقل ۳ حرف و دست‌کم یک دوره لازم است.", "A title of 3+ characters and at least one course are required.", "Titel mit mind. 3 Zeichen und mindestens ein Kurs sind nötig.", "En az 3 karakterlik başlık ve en az bir kurs gerekli."]) : m === "INVALID_PATH_COURSES" ? tx(["یک دوره تکراری است یا پیدا نشد؛ برای مسیر منتشرشده همهٔ دوره‌ها باید منتشر شده باشند.", "A course is repeated or missing; a published path needs every course published.", "Ein Kurs ist doppelt oder fehlt; veröffentlichte Pfade brauchen veröffentlichte Kurse.", "Bir kurs tekrarlı veya yok; yayınlanan yol için tüm kurslar yayınlanmış olmalı."]) : m);
      return false;
    } finally { setBusy(false); }
  }
  async function doReissue() {
    if (!reissue) return;
    setBusy(true);
    try { const d = await api<{ downloadUrl: string }>("/api/admin/academy/certificates", { method: "POST", body: JSON.stringify({ id: reissue.id, reason, confirm: true }) }); setDownload(d.downloadUrl); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const editPath = (p: PathRow) => { let courses: PathForm["courses"] = []; try { courses = JSON.parse(p.courses); } catch { /* keep empty */ } setPath({ id: p.id, title: p.title, description: p.description, majorId: p.majorId ?? "", status: p.status, courses: courses.length ? courses : EMPTY_PATH.courses }); };
  const date = (v: string) => new Date(v).toLocaleDateString(tag);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="GraduationCap" size={28} /></span>
        <div>
          <h2>{tx(["آکادمی دانشجویی", "Student academy", "Studienakademie", "Öğrenci akademisi"])}</h2>
          <p>{userId ? tx(["ثبت‌نام‌ها، آزمون‌ها و گواهی‌های همین کاربر.", "This user's enrollments, assessments and certificates.", "Einschreibungen, Prüfungen und Zertifikate dieses Nutzers.", "Bu kullanıcının kayıtları, değerlendirmeleri ve sertifikaları."]) : tx(["رشته‌ها، ثبت‌نام‌ها، آزمون‌ها، گواهی‌ها و مسیرهای یادگیری.", "Majors, enrollments, assessments, certificates and learning paths.", "Studienfächer, Einschreibungen, Prüfungen, Zertifikate und Lernpfade.", "Bölümler, kayıtlar, değerlendirmeler, sertifikalar ve öğrenme yolları."])}</p>
        </div>
        <Link className="btn" href="/admin/ai-courses">{tx(["دوره‌ها و تولید AI", "Courses & AI generator", "Kurse & KI-Generator", "Kurslar ve AI oluşturucu"])}</Link>
      </div>
      {userId && <nav className="admin-finance-links"><Link className="btn" href={"/admin/users/" + encodeURIComponent(userId)}>{tx(["پروفایل کاربر", "User profile", "Benutzerprofil", "Kullanıcı profili"])}</Link><Link className="btn" href="/admin/academy">{tx(["همهٔ دانشجویان", "All students", "Alle Studierenden", "Tüm öğrenciler"])}</Link></nav>}
      <nav className="module-tabs">{tabs.map((k) => <a key={k} href={"#" + k} className={tab === k ? "selected" : ""} aria-current={tab === k ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab(k); }}>{tx(TABS[k])}</a>)}</nav>

      {tab === "dashboard" && <div className="stats-grid" aria-busy={!overview}>{overview && Object.entries(overview.metrics).map(([k, v]) => <div className="panel stat" key={k}><span>{METRICS[k] ? tx(METRICS[k]) : k}</span><strong>{typeof v === "number" ? n(Math.round(v * 10) / 10) : "—"}</strong></div>)}</div>}

      {tab === "majors" && <div className="access-layout">
        <div className="admin-pick-list">
          <button className={!major.id ? "selected" : ""} onClick={() => setMajor(EMPTY_MAJOR)}><span><Icon name="Plus" size={14} /> {tx(["رشتهٔ جدید", "New major", "Neues Studienfach", "Yeni bölüm"])}</span></button>
          {majors.map((m) => <button key={m.id} className={major.id === m.id ? "selected" : ""} onClick={() => setMajor({ ...m, specializations: m.specializations.map((s) => s.name) })}><span>{m.name}</span><small>{m.status === "ACTIVE" ? tx(ACTIVE) : tx(ARCHIVED)}</small></button>)}
        </div>
        <form className="panel domain-fields" onSubmit={(e) => { e.preventDefault(); void mutate("/api/admin/academy/majors", "POST", major).then((ok) => { if (ok) setMajor(EMPTY_MAJOR); }); }}>
          <label>{tx(["نام رشته", "Major name", "Studienfachname", "Bölüm adı"])}<input required value={major.name} onChange={(e) => setMajor({ ...major, name: e.target.value })} /></label>
          <label>{tx(["شناسهٔ URL", "URL slug", "URL-Kennung", "URL kimliği"])}<input required dir="ltr" value={major.slug} onChange={(e) => setMajor({ ...major, slug: e.target.value })} /></label>
          <label>{tx(["دانشکده", "Faculty", "Fakultät", "Fakülte"])}<input value={major.faculty} onChange={(e) => setMajor({ ...major, faculty: e.target.value })} /></label>
          <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={major.status} onChange={(e) => setMajor({ ...major, status: e.target.value })}><option value="ACTIVE">{tx(ACTIVE)}</option><option value="ARCHIVED">{tx(ARCHIVED)}</option></select></label>
          <label className="span-2">{tx(["توضیحات", "Description", "Beschreibung", "Açıklama"])}<input value={major.description} onChange={(e) => setMajor({ ...major, description: e.target.value })} /></label>
          <label className="span-2">{tx(["گرایش‌ها — هر خط یک مورد", "Specializations — one per line", "Spezialisierungen — eine pro Zeile", "Uzmanlıklar — satır başına bir"])}<textarea rows={4} value={major.specializations.join("\n")} onChange={(e) => setMajor({ ...major, specializations: e.target.value.split("\n").filter(Boolean) })} /></label>
          <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیرهٔ رشته", "Save major", "Studienfach speichern", "Bölümü kaydet"])}</Button></div>
        </form>
      </div>}

      {tab === "students" && overview && <>
        {overview.profile?.major?.name && <p className="admin-note">{tx(["رشته", "Major", "Studienfach", "Bölüm"])}: <b>{overview.profile.major.name}</b></p>}
        <section className="panel">
          <h3>{tx(["ثبت‌نام‌ها", "Enrollments", "Einschreibungen", "Kayıtlar"])}</h3>
          {overview.enrollments.length ? <div className="table-scroll"><table className="admin-finance-table">
            <thead><tr>{([["دوره", "Course", "Kurs", "Kurs"], ["نسخه", "Version", "Version", "Sürüm"], ["وضعیت", "State", "Status", "Durum"], ["پیشرفت", "Progress", "Fortschritt", "İlerleme"], ["دانشجو", "Student", "Studierende", "Öğrenci"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
            <tbody>{overview.enrollments.map((e) => { let done = 0; try { done = JSON.parse(e.completed).length; } catch { /* ignore */ } return <tr key={e.id}><td>{e.course.title}</td><td dir="ltr">v{e.version}</td><td><span className="badge">{e.state}</span></td><td>{e.progressPercent !== null ? n(e.progressPercent) + "%" : n(done) + " " + tx(["درس", "lessons", "Lektionen", "ders"])}</td><td><Link href={"/admin/users/" + encodeURIComponent(e.userId)}>{e.studentName}</Link></td></tr>; })}</tbody>
          </table></div> : <Empty />}
        </section>
        <section className="panel">
          <h3>{tx(["تاریخچهٔ آزمون‌ها", "Assessment history", "Prüfungsverlauf", "Değerlendirme geçmişi"])}</h3>
          {overview.attempts.length ? <div className="academy-attempts">{overview.attempts.map((a) => <article key={a.id} className="access-row">
            <div><strong><Link href={"/admin/users/" + encodeURIComponent(a.userId)}>{a.studentName}</Link></strong><small><bdi dir="ltr">{a.assessmentId}</bdi> · {date(a.createdAt)}</small></div>
            <div className="domain-actions"><span className={"badge " + (a.passed ? "green" : "red")}>{n(Math.round(a.score))}% · {a.passed ? tx(["قبول", "Pass", "Bestanden", "Geçti"]) : tx(["مردود", "Fail", "Nicht bestanden", "Kaldı"])}</span></div>
            <details className="span-all"><summary className="fine-print">{tx(["پاسخ‌های ثبت‌شده", "Recorded answers", "Gespeicherte Antworten", "Kaydedilen yanıtlar"])}</summary><pre dir="ltr">{a.answers}</pre></details>
          </article>)}</div> : <Empty />}
        </section>
      </>}

      {tab === "certificates" && <>
        <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); void loadCerts().catch((err) => toast.error(err.message)); }}>
          <input aria-label={tx(["جست‌وجوی گواهی‌ها", "Search certificates", "Zertifikate suchen", "Sertifika ara"])} placeholder={tx(["نام، دوره یا شناسه", "Name, course or id", "Name, Kurs oder ID", "Ad, kurs veya kimlik"])} value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
          <select aria-label={tx(["وضعیت", "Status", "Status", "Durum"])} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">{tx(["همهٔ وضعیت‌ها", "All statuses", "Alle Status", "Tüm durumlar"])}</option><option value="ACTIVE">{tx(["معتبر", "Valid", "Gültig", "Geçerli"])}</option><option value="REVOKED">{tx(["لغوشده", "Revoked", "Widerrufen", "İptal edildi"])}</option></select>
          <input type="date" aria-label={tx(["از تاریخ", "From", "Von", "Başlangıç"])} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
          <input type="date" aria-label={tx(["تا تاریخ", "To", "Bis", "Bitiş"])} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
          <Button type="submit"><Icon name="Search" size={16} />{tx(["جست‌وجو", "Search", "Suchen", "Ara"])}</Button>
        </form>
        <div className="tool-grid" aria-busy={!certs}>
          {certs?.map((c) => <article key={c.id} className={"panel academy-cert" + (c.status === "REVOKED" ? " revoked" : "")}>
            <div className="row-between"><strong>{c.studentName}</strong><span className={"badge " + (c.status === "ACTIVE" ? "green" : "red")}>{c.status === "ACTIVE" ? tx(["معتبر", "Valid", "Gültig", "Geçerli"]) : tx(["لغوشده", "Revoked", "Widerrufen", "İptal edildi"])}</span></div>
            <p>{c.courseTitle}</p>
            <small><bdi dir="ltr">{c.id}</bdi> · {date(c.issuedAt)}</small>
            <div className="domain-actions">
              <a className="btn" href={"/verify-certificate/" + encodeURIComponent(c.verificationCode)} target="_blank" rel="noreferrer"><Icon name="BadgeCheck" size={15} />{tx(["استعلام", "Verify", "Prüfen", "Doğrula"])}</a>
              <a className="btn" href={`/api/learn/courses/${encodeURIComponent(c.completion.courseId)}/certificate?certificate=${encodeURIComponent(c.id)}`}><Icon name="FileDown" size={15} />PDF</a>
              {c.status === "ACTIVE" && <Button onClick={() => { setReissue(c); setReason(""); setDownload(""); }}><Icon name="RefreshCw" size={15} />{tx(["صدور دوبارهٔ PDF", "Reissue PDF", "PDF neu ausstellen", "PDF'yi yeniden oluştur"])}</Button>}
              {c.status === "ACTIVE" && <Button variant="danger" onClick={() => { setRevoke(c); setReason(""); }}><Icon name="Ban" size={15} />{tx(["لغو گواهی", "Revoke", "Widerrufen", "İptal et"])}</Button>}
            </div>
          </article>)}
        </div>
        {certs && !certs.length && <Empty />}
      </>}

      {tab === "paths" && <div className="access-layout">
        <div className="admin-pick-list">
          <button className={!path.id ? "selected" : ""} onClick={() => setPath(EMPTY_PATH)}><span><Icon name="Plus" size={14} /> {tx(["مسیر جدید", "New path", "Neuer Lernpfad", "Yeni yol"])}</span></button>
          {paths.map((p) => <button key={p.id} className={path.id === p.id ? "selected" : ""} onClick={() => editPath(p)}><span>{p.title}</span><small>{p.status}</small></button>)}
        </div>
        <form className="panel domain-fields" onSubmit={(e) => { e.preventDefault(); const courses = path.courses.filter((c) => c.courseId.trim()); void mutate("/api/admin/academy/paths", "POST", { ...(path.id ? { id: path.id } : {}), title: path.title, description: path.description, majorId: path.majorId || null, status: path.status, courses }); }}>
          <label>{tx(["عنوان", "Title", "Titel", "Başlık"])}<input required value={path.title} onChange={(e) => setPath({ ...path, title: e.target.value })} /></label>
          <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={path.status} onChange={(e) => setPath({ ...path, status: e.target.value })}>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="span-2">{tx(["توضیحات", "Description", "Beschreibung", "Açıklama"])}<textarea rows={3} value={path.description} onChange={(e) => setPath({ ...path, description: e.target.value })} /></label>
          <label className="span-2">{tx(["رشته", "Major", "Studienfach", "Bölüm"])}<select value={path.majorId} onChange={(e) => setPath({ ...path, majorId: e.target.value })}><option value="">{tx(["بدون رشته", "No major", "Ohne Studienfach", "Bölümsüz"])}</option>{majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <fieldset className="span-2 academy-path-courses">
            <legend>{tx(["دوره‌ها به ترتیب", "Courses in order", "Kurse in Reihenfolge", "Sırayla kurslar"])}</legend>
            {path.courses.map((c, k) => <div key={k} className="academy-path-row">
              <span>{n(k + 1)}</span>
              <select aria-label={tx(["دوره", "Course", "Kurs", "Kurs"])} value={c.courseId} onChange={(e) => setPath({ ...path, courses: path.courses.map((x, j) => (j === k ? { ...x, courseId: e.target.value } : x)) })}>
                <option value="">{courseList ? tx(["— یک دوره انتخاب کنید —", "— pick a course —", "— Kurs wählen —", "— bir kurs seçin —"]) : "…"}</option>
                {c.courseId && courseList && !courseList.some((x) => x.id === c.courseId) && <option value={c.courseId}>{c.courseId}</option>}
                {courseList?.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.status}</option>)}
              </select>
              <label className="gc-switch"><input type="checkbox" checked={c.requiredBeforeNext} onChange={(e) => setPath({ ...path, courses: path.courses.map((x, j) => (j === k ? { ...x, requiredBeforeNext: e.target.checked } : x)) })} />{tx(["پیش‌نیاز دورهٔ بعد", "Required before next", "Pflicht vor dem nächsten", "Sonrakinden önce zorunlu"])}</label>
              <Button label={tx(["حذف", "Remove", "Entfernen", "Kaldır"])} onClick={() => setPath({ ...path, courses: path.courses.filter((_, j) => j !== k) })}><Icon name="X" size={14} /></Button>
            </div>)}
            <Button onClick={() => setPath({ ...path, courses: [...path.courses, { courseId: "", requiredBeforeNext: false }] })}><Icon name="Plus" size={14} />{tx(["افزودن دوره", "Add course", "Kurs hinzufügen", "Kurs ekle"])}</Button>
            {courseList && !courseList.length && <p className="fine-print">{tx(["هنوز دوره‌ای ساخته نشده است؛ اول از «دوره‌ها و تولید AI» یک دوره بسازید.", "No courses yet; create one under Courses & AI generator first.", "Noch keine Kurse; zuerst unter Kurse & KI-Generator anlegen.", "Henüz kurs yok; önce Kurslar ve AI oluşturucu'dan oluşturun."])}</p>}
          </fieldset>
          <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy || !path.courses.some((c) => c.courseId)}>{tx(["ذخیرهٔ مسیر", "Save path", "Lernpfad speichern", "Yolu kaydet"])}</Button></div>
        </form>
      </div>}

      {revoke && (
        <Modal title={tx(["لغو گواهی", "Revoke certificate", "Zertifikat widerrufen", "Sertifikayı iptal et"]) + " · " + revoke.studentName} onClose={() => setRevoke(null)}>
          <p>{revoke.courseTitle}</p>
          <p className="fine-print">{tx(["پس از لغو، استعلام این گواهی «لغوشده» نشان می‌دهد.", "After revocation, verifying this certificate shows “revoked”.", "Nach dem Widerruf zeigt die Prüfung „widerrufen“.", "İptalden sonra doğrulama “iptal edildi” gösterir."])}</p>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void mutate("/api/admin/academy/certificates", "PATCH", { id: revoke.id, reason }).then((ok) => { if (ok) setRevoke(null); }); }}>
            <label className="span-2">{tx(["دلیل لغو (حداقل ۱۰ حرف)", "Reason (at least 10 characters)", "Grund (mind. 10 Zeichen)", "Neden (en az 10 karakter)"])}<textarea required minLength={10} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <div className="span-2 domain-actions"><Button type="submit" variant="danger" disabled={busy || reason.trim().length < 10}>{tx(["تأیید لغو", "Confirm revocation", "Widerruf bestätigen", "İptali onayla"])}</Button></div>
          </form>
        </Modal>
      )}
      {reissue && (
        <Modal title={tx(["صدور دوبارهٔ PDF", "Reissue PDF", "PDF neu ausstellen", "PDF'yi yeniden oluştur"]) + " · " + reissue.studentName} onClose={() => setReissue(null)}>
          <p>{reissue.courseTitle}</p>
          <p className="fine-print">{tx(["شناسه و تاریخ اصلی گواهی حفظ می‌شود.", "The original certificate id and date are kept.", "Ursprüngliche ID und Datum bleiben erhalten.", "İlk sertifika kimliği ve tarihi korunur."])}</p>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void doReissue(); }}>
            <label className="span-2">{tx(["دلیل صدور دوباره (حداقل ۱۰ حرف)", "Reason (at least 10 characters)", "Grund (mind. 10 Zeichen)", "Neden (en az 10 karakter)"])}<textarea required minLength={10} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <div className="span-2 domain-actions">
              <Button type="submit" variant="primary" disabled={busy || reason.trim().length < 10}>{tx(["تأیید صدور دوباره", "Confirm reissue", "Neuausstellung bestätigen", "Yeniden oluşturmayı onayla"])}</Button>
              {download && <a className="btn" href={download}><Icon name="FileDown" size={15} />PDF</a>}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ───────────────────────── Student module ───────────────────────── */

type StudentData = { enabled: boolean; thesisAssistCreditCost: number; stats: { activeUsers: number; courses: number; materials: number; notes: number; flashcards: number; quizzes: number; attempts: number; exams: number; tasks: number; aiRuns: number; aiCredits: number; averageScore: number | null }; recentCourses: { id: string; name: string; updatedAt: string; user: { id: string; name: string | null; email: string | null }; _count: { materials: number; quizzes: number; notes: number } }[] };

export function LiveStudentAdmin() {
  const { n, tx, tag } = useT();
  const [data, setData] = useState<StudentData | null>(null);
  const [cost, setCost] = useState("20");
  const [ask, setAsk] = useState<"toggle" | "cost" | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await api<StudentData>("/api/admin/student"); setData(d); setCost(String(d.thesisAssistCreditCost || 20)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true); setAsk(null);
    try { const d = await api<{ enabled?: boolean; thesisAssistCreditCost?: number }>("/api/admin/student", { method: "PATCH", body: JSON.stringify(body) }); setData((c) => (c ? { ...c, ...d } : c)); if (d.thesisAssistCreditCost) setCost(String(d.thesisAssistCreditCost)); toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const costN = Number(cost);
  const costOk = Number.isInteger(costN) && costN >= 5 && costN <= 100;
  const s = data?.stats;
  const cards: [string, Tx, React.ReactNode][] = s ? [
    ["Users", ["دانشجوی فعال", "Active students", "Aktive Studierende", "Aktif öğrenciler"], n(s.activeUsers)], ["BookOpen", ["درس‌ها", "Courses", "Kurse", "Dersler"], n(s.courses)], ["Files", ["جزوه‌ها", "Materials", "Unterlagen", "Materyaller"], n(s.materials)],
    ["Layers3", ["یادداشت‌ها / فلش‌کارت‌ها", "Notes / flashcards", "Notizen / Karteikarten", "Notlar / kartlar"], n(s.notes + s.flashcards)], ["Brain", ["آزمون / تلاش", "Quizzes / attempts", "Quiz / Versuche", "Quiz / deneme"], n(s.quizzes) + " / " + n(s.attempts)],
    ["CalendarDays", ["امتحان‌های ثبت‌شده", "Exams", "Prüfungen", "Sınavlar"], n(s.exams)], ["ListTodo", ["تکلیف و جلسهٔ مطالعه", "Tasks & study sessions", "Aufgaben & Lernsitzungen", "Görevler ve çalışma"], n(s.tasks)],
    ["Sparkles", ["مصرف AI", "AI runs", "KI-Läufe", "AI çalıştırma"], n(s.aiRuns)], ["Coins", ["اعتبار مصرف‌شده", "Credits used", "Verbrauchte Credits", "Harcanan kredi"], n(s.aiCredits)], ["Target", ["میانگین نتیجه", "Average score", "Durchschnitt", "Ortalama puan"], s.averageScore == null ? "—" : n(s.averageScore) + "%"],
  ] : [];
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="School" size={28} /></span>
        <div>
          <h2>{tx(["دانشگاه هوش مصنوعی", "AI university", "KI-Universität", "Yapay zekâ üniversitesi"])}</h2>
          <p>{tx(["پیش‌فرض سراسری ماژول دانشجویی؛ استثنای هر کاربر از «دسترسی ماژول‌ها» یا پروفایل کاربر تنظیم می‌شود.", "The student module's global default; per-user exceptions are set under Module access or the user profile.", "Globaler Standard des Studienmoduls; Ausnahmen pro Nutzer unter Modulzugriff oder im Profil.", "Öğrenci modülünün genel varsayılanı; kullanıcı istisnaları Modül erişimi veya profilden ayarlanır."])}</p>
        </div>
        {data && <Button variant={data.enabled ? "primary" : ""} disabled={busy} onClick={() => setAsk("toggle")}><Icon name={data.enabled ? "ToggleRight" : "ToggleLeft"} size={18} />{data.enabled ? tx(["پیش‌فرض: فعال", "Default: on", "Standard: an", "Varsayılan: açık"]) : tx(["پیش‌فرض: غیرفعال", "Default: off", "Standard: aus", "Varsayılan: kapalı"])}</Button>}
      </div>
      <nav className="admin-finance-links"><Link className="btn" href="/admin/module-access">{tx(["دسترسی ماژول‌ها", "Module access", "Modulzugriff", "Modül erişimi"])}</Link><Link className="btn" href="/admin/academy">{tx(["آکادمی", "Academy", "Akademie", "Akademi"])}</Link></nav>
      <form className="panel admin-commission-row" onSubmit={(e) => { e.preventDefault(); if (costOk) setAsk("cost"); }}>
        <Icon name="Coins" size={20} />
        <span>{tx(["هزینهٔ راهنمایی پایان‌نامه (۵ تا ۱۰۰ اعتبار؛ قبل از اجرا به دانشجو نشان داده می‌شود و فقط پس از پاسخ موفق کسر می‌شود)", "Thesis-assist price (5–100 credits; shown to the student first and charged only after a successful answer)", "Preis Abschlussarbeit-Hilfe (5–100 Credits; vorher angezeigt, nur nach Erfolg abgebucht)", "Tez yardımı ücreti (5–100 kredi; önce gösterilir, yalnızca başarılı yanıttan sonra düşülür)"])}</span>
        <input type="number" min={5} max={100} step={1} dir="ltr" aria-label={tx(["اعتبار", "Credits", "Credits", "Kredi"])} value={cost} onChange={(e) => setCost(e.target.value)} />
        <Button type="submit" variant="primary" disabled={busy || !data || !costOk || costN === data.thesisAssistCreditCost}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
      </form>
      <div className="stats-grid" aria-busy={!data}>{cards.map(([icon, l, v]) => <div className="panel stat" key={l[1]}><span><Icon name={icon} size={16} /> {tx(l)}</span><strong>{v}</strong></div>)}</div>
      <section className="panel">
        <h3>{tx(["درس‌های تازه‌فعالیت", "Recently active courses", "Zuletzt aktive Kurse", "Son etkin dersler"])}</h3>
        {data?.recentCourses.length ? <div className="llm-custom">{data.recentCourses.map((c) => <div key={c.id} className="access-row">
          <div><strong>{c.name}</strong><small><Link href={"/admin/users/" + encodeURIComponent(c.user.id)}>{c.user.name || c.user.email || c.user.id}</Link> · {new Date(c.updatedAt).toLocaleDateString(tag)}</small></div>
          <small>{n(c._count.materials)} {tx(["جزوه", "materials", "Unterlagen", "materyal"])} · {n(c._count.notes)} {tx(["یادداشت", "notes", "Notizen", "not"])} · {n(c._count.quizzes)} {tx(["آزمون", "quizzes", "Quiz", "quiz"])}</small>
        </div>)}</div> : data && <Empty />}
      </section>
      {ask === "toggle" && data && (
        <Modal title={tx(["تغییر پیش‌فرض ماژول دانشجویی", "Change the student module default", "Standard des Studienmoduls ändern", "Öğrenci modülü varsayılanını değiştir"])} onClose={() => setAsk(null)}>
          <p>{data.enabled ? tx(["ماژول دانشجویی برای همهٔ کاربرانی که استثنا ندارند پنهان می‌شود.", "The student module is hidden for every user without an exception.", "Das Studienmodul wird für alle Nutzer ohne Ausnahme ausgeblendet.", "Öğrenci modülü istisnası olmayan tüm kullanıcılardan gizlenir."]) : tx(["ماژول دانشجویی برای همهٔ کاربرانی که استثنا ندارند نمایش داده می‌شود.", "The student module is shown to every user without an exception.", "Das Studienmodul wird allen Nutzern ohne Ausnahme angezeigt.", "Öğrenci modülü istisnası olmayan tüm kullanıcılara gösterilir."])}</p>
          <div className="domain-actions"><Button variant={data.enabled ? "danger" : "primary"} disabled={busy} onClick={() => void patch({ enabled: !data.enabled }, !data.enabled ? tx(["ماژول دانشجویی فعال شد", "Student module on", "Studienmodul an", "Öğrenci modülü açık"]) : tx(["ماژول دانشجویی غیرفعال شد", "Student module off", "Studienmodul aus", "Öğrenci modülü kapalı"]))}>{data.enabled ? tx(["بله، غیرفعال کن", "Yes, turn off", "Ja, ausschalten", "Evet, kapat"]) : tx(["بله، فعال کن", "Yes, turn on", "Ja, einschalten", "Evet, aç"])}</Button></div>
        </Modal>
      )}
      {ask === "cost" && data && (
        <Modal title={tx(["تغییر هزینهٔ راهنمایی پایان‌نامه", "Change the thesis-assist price", "Preis ändern", "Ücreti değiştir"])} onClose={() => setAsk(null)}>
          <p>{tx(["هزینهٔ هر درخواست برای همهٔ دانشجویان:", "Price per request for every student:", "Preis pro Anfrage für alle Studierenden:", "Tüm öğrenciler için istek başı ücret:"])} <b>{n(data.thesisAssistCreditCost)} → {n(costN)}</b> {tx(["اعتبار", "credits", "Credits", "kredi"])}</p>
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => void patch({ thesisAssistCreditCost: costN }, tx(["هزینه ذخیره شد", "Price saved", "Preis gespeichert", "Ücret kaydedildi"]))}>{tx(["بله، ذخیره کن", "Yes, save", "Ja, speichern", "Evet, kaydet"])}</Button></div>
        </Modal>
      )}
    </>
  );
}
