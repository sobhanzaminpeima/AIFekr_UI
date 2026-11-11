"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin FIT pages on aifekr.com:
 * - LiveFitnessAdmin (/admin/fitness): /api/admin/fitness — programs (edit = new version),
 *   exercise images, trainers, members, products.
 * - LiveFitnessUsers (/admin/fitness/users): /api/admin/fitness/users + /api/admin/users/<id>/fitness.
 * - LiveFitnessMarketplace (/admin/fitness/marketplace): /api/admin/fitness/marketplace.
 *   Each action asks for its own reason (and, for refunds, deliveries and payouts, the real
 *   external reference); nothing here moves money, it records what already happened.
 */
type Tx = [string, string, string, string];
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { n, i, tx, tag };
}
async function api<T = Row>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d as T;
}
const LEVEL: Record<string, Tx> = { BEGINNER: ["مبتدی", "Beginner", "Anfänger", "Başlangıç"], INTERMEDIATE: ["متوسط", "Intermediate", "Mittel", "Orta"], ADVANCED: ["پیشرفته", "Advanced", "Fortgeschritten", "İleri"] };
const PSTATUS: Record<string, Tx> = { DRAFT: ["پیش‌نویس", "Draft", "Entwurf", "Taslak"], PUBLISHED: ["منتشرشده", "Published", "Veröffentlicht", "Yayında"], ARCHIVED: ["بایگانی", "Archived", "Archiviert", "Arşivlendi"] };
const lbl = (m: Record<string, Tx>, k: string, i: number) => m[k]?.[i] ?? k;

function FitNav({ here }: { here: string }) {
  const { tx } = useT();
  const items: [string, Tx][] = [["/admin/fitness", ["برنامه‌ها و تمرین‌ها", "Programs & exercises", "Programme & Übungen", "Programlar ve egzersizler"]], ["/admin/fitness/users", ["کاربران فیتنس", "Fitness members", "Fitness-Mitglieder", "Fitness üyeleri"]], ["/admin/fitness/marketplace", ["بازار مربیان", "Trainer marketplace", "Trainermarkt", "Eğitmen pazarı"]]];
  return <nav className="module-tabs">{items.map(([href, l]) => <Link key={href} href={href} className={href === here ? "selected" : ""} aria-current={href === here ? "page" : undefined}>{tx(l)}</Link>)}<Link href="/fitness">{tx(["محیط کاربر", "Member workspace", "Mitgliederbereich", "Üye alanı"])}</Link></nav>;
}

/* ───────────────────────── Fitness center ───────────────────────── */

type Program = { kind: "program"; id?: string; title: string; description: string; level: string; status: string; minutes: number; trainerId: string | null; content: { exerciseId: string; sets: number; reps: number; rest: number }[] };

export function LiveFitnessAdmin() {
  const { n, i, tx, tag } = useT();
  const [data, setData] = useState<Row | null>(null);
  const [tab, setTab] = useState("programs");
  const [form, setForm] = useState<Program | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setData(await api("/api/admin/fitness")); } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function saveProgram() {
    if (!form) return;
    setBusy(true);
    try { await api("/api/admin/fitness", { method: "POST", body: JSON.stringify(form) }); setForm(null); await load(); toast.success(tx(["برنامه ذخیره شد", "Program saved", "Programm gespeichert", "Program kaydedildi"])); }
    catch (e) { const m = e instanceof Error ? e.message : "FAILED"; toast.error(m === "INVALID_EXERCISE" ? tx(["یکی از حرکت‌ها غیرفعال یا نامعتبر است.", "One of the exercises is inactive or invalid.", "Eine Übung ist inaktiv oder ungültig.", "Bir egzersiz pasif veya geçersiz."]) : m === "TRAINER_APPROVAL_REQUIRED" ? tx(["مربی انسانی باید تأییدشده و فعال باشد.", "A human trainer must be approved and active.", "Ein menschlicher Trainer muss freigegeben sein.", "İnsan eğitmen onaylı ve aktif olmalı."]) : m); }
    finally { setBusy(false); }
  }
  async function saveImage(id: string, imageUrl: string) {
    try { await api("/api/admin/fitness", { method: "POST", body: JSON.stringify({ kind: "exercise", id, imageUrl }) }); toast.success(tx(["تصویر ذخیره شد", "Image saved", "Bild gespeichert", "Görsel kaydedildi"])); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }
  const TABS: [string, Tx][] = [["programs", ["برنامه‌ها", "Programs", "Programme", "Programlar"]], ["exercises", ["حرکت‌ها", "Exercises", "Übungen", "Egzersizler"]], ["trainers", ["مربی‌ها", "Trainers", "Trainer", "Eğitmenler"]], ["members", ["اعضا", "Members", "Mitglieder", "Üyeler"]], ["products", ["محصولات", "Products", "Produkte", "Ürünler"]]];
  const rows: Row[] = data?.[tab] ?? [];
  const exName = (id: string) => data?.exercises?.find((x: Row) => x.id === id)?.name ?? id;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Dumbbell" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت فیتنس", "Fitness control center", "Fitness-Verwaltung", "Fitness yönetim merkezi"])}</h2>
          <p>{tx(["برنامه‌های تمرینی، حرکت‌ها، مربی‌ها، اعضا و محصولات AIFekr FIT.", "AIFekr FIT programs, exercises, trainers, members and products.", "Programme, Übungen, Trainer, Mitglieder und Produkte von AIFekr FIT.", "AIFekr FIT programları, egzersizleri, eğitmenleri, üyeleri ve ürünleri."])}</p>
        </div>
        <Link className="btn" href="/admin/packages">{tx(["پکیج‌ها", "Packages", "Pakete", "Paketler"])}</Link>
      </div>
      <FitNav here="/admin/fitness" />
      <div className="stats-grid" aria-busy={!data}>
        <div className="panel stat"><span>{tx(["اعضا", "Members", "Mitglieder", "Üyeler"])}</span><strong>{data ? n(data.members.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["جلسه‌های تمرین", "Workout sessions", "Trainingseinheiten", "Antrenmanlar"])}</span><strong>{data ? n(data.sessions) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["تکمیل‌شده", "Completed", "Abgeschlossen", "Tamamlanan"])}</span><strong className="ok">{data ? n(data.completed) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["برنامه‌ها", "Programs", "Programme", "Programlar"])}</span><strong>{data ? n(data.programs.length) : "—"}</strong></div>
      </div>
      <nav className="gc-chips">{TABS.map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{tx(l)} {data ? "(" + n(data[k].length) + ")" : ""}</button>)}</nav>
      <div className="tool-grid fit-grid" aria-busy={!data}>
        {rows.map((r) => (
          <article key={r.id || r.userId} className="panel fit-card">
            {tab === "programs" && <>
              <div className="row-between"><strong>{r.title}</strong><span className={"badge " + (r.status === "PUBLISHED" ? "green" : r.status === "ARCHIVED" ? "red" : "")}>{lbl(PSTATUS, r.status, i)}</span></div>
              <p>{r.description}</p>
              <small>{lbl(LEVEL, r.level, i)} · {n(r.minutes)} {tx(["دقیقه", "min", "Min.", "dk"])} · {n(r._count?.sessions ?? 0)} {tx(["جلسه", "sessions", "Einheiten", "seans"])}</small>
              <div className="domain-actions"><Button onClick={() => { let content: Program["content"] = []; try { content = JSON.parse(r.content); } catch { /* keep empty */ } setForm({ kind: "program", id: r.id, title: r.title, description: r.description, level: r.level, status: r.status, minutes: r.minutes, trainerId: r.trainerId, content }); }}><Icon name="Pencil" size={15} />{tx(["ویرایش / نسخهٔ جدید", "Edit / new version", "Bearbeiten / neue Version", "Düzenle / yeni sürüm"])}</Button></div>
            </>}
            {tab === "exercises" && <>
              <img className="fit-img" src={r.imageUrl || "/fitness/exercises/" + r.id + ".webp"} alt={r.name} loading="lazy" />
              <div className="row-between"><strong>{r.name}</strong><span className="badge">{r.category}</span></div>
              {r.instructions && <p>{r.instructions}</p>}
              <label className="fit-url">{tx(["آدرس تصویر آموزشی", "Exercise image URL", "Bild-URL", "Egzersiz görsel adresi"])}<input dir="ltr" defaultValue={r.imageUrl || "/fitness/exercises/" + r.id + ".webp"} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== (r.imageUrl || "/fitness/exercises/" + r.id + ".webp")) void saveImage(r.id, v); }} /></label>
            </>}
            {tab === "trainers" && <>
              <div className="row-between"><strong>{r.name}</strong><span className="badge">{r.type}</span></div>
              <p>{r.biography}</p>
              <small>{r.status}</small>
            </>}
            {tab === "members" && <>
              <strong><Link href={"/admin/users/" + encodeURIComponent(r.userId)}>{r.user?.name || r.user?.email || r.userId}</Link></strong>
              <small>{lbl(LEVEL, r.level, i)}{r.entitlementExpiry ? " · " + tx(["تا", "until", "bis", "bitiş"]) + " " + new Date(r.entitlementExpiry).toLocaleDateString(tag) : ""}</small>
            </>}
            {tab === "products" && <>
              <div className="row-between"><strong>{r.title || r.name}</strong><span className="badge">{r.status || r.category}</span></div>
              <p>{r.description}</p>
            </>}
          </article>
        ))}
      </div>
      {data && !rows.length && <Empty />}
      {form && data && (
        <Modal title={tx(["ویرایش برنامه", "Edit program", "Programm bearbeiten", "Programı düzenle"]) + " · " + form.title} onClose={() => setForm(null)}>
          <p className="fine-print">{tx(["اگر این برنامه جلسهٔ ثبت‌شده داشته باشد، ذخیره یک نسخهٔ جدید می‌سازد و جلسه‌های قبلی دست نمی‌خورند.", "If the program has recorded sessions, saving creates a new version and past sessions stay unchanged.", "Hat das Programm Einheiten, entsteht beim Speichern eine neue Version.", "Programın kayıtlı seansları varsa kaydetmek yeni sürüm oluşturur."])}</p>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void saveProgram(); }}>
            <label>{tx(["عنوان", "Title", "Titel", "Başlık"])}<input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>{tx(["مدت (دقیقه)", "Minutes", "Minuten", "Dakika"])}<input type="number" min={5} max={180} dir="ltr" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} /></label>
            <label>{tx(["سطح", "Level", "Niveau", "Seviye"])}<select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{Object.keys(LEVEL).map((k) => <option key={k} value={k}>{lbl(LEVEL, k, i)}</option>)}</select></label>
            <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.keys(PSTATUS).map((k) => <option key={k} value={k}>{lbl(PSTATUS, k, i)}</option>)}</select></label>
            <label className="span-2">{tx(["توضیحات", "Description", "Beschreibung", "Açıklama"])}<textarea rows={3} maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="span-2">{tx(["مربی", "Trainer", "Trainer", "Eğitmen"])}<select value={form.trainerId ?? ""} onChange={(e) => setForm({ ...form, trainerId: e.target.value || null })}><option value="">{tx(["بدون مربی", "No trainer", "Ohne Trainer", "Eğitmensiz"])}</option>{data.trainers.map((t: Row) => <option key={t.id} value={t.id}>{t.name} · {t.type}</option>)}</select></label>
            <fieldset className="span-2 fit-moves">
              <legend>{tx(["حرکت‌ها", "Exercises", "Übungen", "Egzersizler"])}</legend>
              {form.content.map((x, k) => <div key={k} className="fit-move">
                <select aria-label={tx(["حرکت", "Exercise", "Übung", "Egzersiz"])} value={x.exerciseId} onChange={(e) => setForm({ ...form, content: form.content.map((y, j) => (j === k ? { ...y, exerciseId: e.target.value } : y)) })}>{data.exercises.map((ex: Row) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}{!data.exercises.some((ex: Row) => ex.id === x.exerciseId) && <option value={x.exerciseId}>{exName(x.exerciseId)}</option>}</select>
                {(["sets", "reps", "rest"] as const).map((f) => <label key={f}>{tx(f === "sets" ? ["ست", "Sets", "Sätze", "Set"] : f === "reps" ? ["تکرار", "Reps", "Wdh.", "Tekrar"] : ["استراحت (ث)", "Rest (s)", "Pause (s)", "Dinlenme (sn)"])}<input type="number" min={0} dir="ltr" value={x[f]} onChange={(e) => setForm({ ...form, content: form.content.map((y, j) => (j === k ? { ...y, [f]: Number(e.target.value) } : y)) })} /></label>)}
                <Button label={tx(["حذف", "Remove", "Entfernen", "Kaldır"])} disabled={form.content.length <= 1} onClick={() => setForm({ ...form, content: form.content.filter((_, j) => j !== k) })}><Icon name="X" size={14} /></Button>
              </div>)}
              <Button onClick={() => setForm({ ...form, content: [...form.content, { exerciseId: data.exercises[0]?.id ?? "", sets: 3, reps: 10, rest: 60 }] })}><Icon name="Plus" size={14} />{tx(["افزودن حرکت", "Add exercise", "Übung hinzufügen", "Egzersiz ekle"])}</Button>
            </fieldset>
            <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ───────────────────────── Fitness members ───────────────────────── */

type FitUser = { id: string; name: string | null; email: string | null; phone: string | null; fitnessAccessExpiry: string | null; fitnessProfile: { entitlementExpiry: string | null } | null };

export function LiveFitnessUsers() {
  const { n, tx, tag } = useT();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: FitUser[]; count: number; activeCount: number } | null>(null);
  const [open, setOpen] = useState<FitUser | null>(null);
  const [days, setDays] = useState("30");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const r = await fetch(`/api/admin/fitness/users?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`, { cache: "no-store", credentials: "include", signal }); if (!r.ok) throw Error(); setData(await r.json()); }
    catch (e) { if (!(e instanceof Error && e.name === "AbortError")) toast.error(tx(["دریافت کاربران ممکن نشد", "Unable to load users", "Benutzer konnten nicht geladen werden", "Kullanıcılar yüklenemedi"])); }
  }, [q, filter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const c = new AbortController(); const t = setTimeout(() => void load(c.signal), 250); return () => { clearTimeout(t); c.abort(); }; }, [load]);
  const expiryOf = (u: FitUser) => [u.fitnessAccessExpiry, u.fitnessProfile?.entitlementExpiry].filter(Boolean).sort().at(-1) || null;
  async function save(enabled: boolean) {
    if (!open) return;
    const d = Number(days);
    if (enabled && (!Number.isInteger(d) || d < 1 || d > 366)) return toast.error(tx(["مدت باید بین ۱ تا ۳۶۶ روز باشد", "Days must be between 1 and 366", "Tage: 1 bis 366", "Gün 1 ile 366 arası olmalı"]));
    setBusy(true);
    try {
      await api("/api/admin/users/" + encodeURIComponent(open.id) + "/fitness", { method: "PUT", body: JSON.stringify({ enabled, days: enabled ? d : 1, ...(reason.trim() ? { reason: reason.trim() } : {}) }) });
      toast.success(enabled ? tx(["دسترسی فیتنس فعال شد", "Fitness access enabled", "Fitness-Zugang aktiviert", "Fitness erişimi açıldı"]) : tx(["دسترسی فیتنس قطع شد", "Fitness access disabled", "Fitness-Zugang deaktiviert", "Fitness erişimi kapatıldı"]));
      setOpen(null); setReason(""); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Users" size={28} /></span>
        <div>
          <h2>{tx(["کاربران فیتنس", "Fitness members", "Fitness-Mitglieder", "Fitness üyeleri"])}</h2>
          <p>{tx(["جست‌وجوی کاربر، فعال‌سازی و مدیریت مدت دسترسی فیتنس.", "Find users, enable fitness and manage access length.", "Nutzer suchen, Fitness aktivieren und Zugangsdauer verwalten.", "Kullanıcı ara, fitness'ı aç ve erişim süresini yönet."])}</p>
        </div>
      </div>
      <FitNav here="/admin/fitness/users" />
      <div className="stats-grid"><div className="panel stat"><span>{tx(["دسترسی فعال", "Active access", "Aktiver Zugang", "Aktif erişim"])}</span><strong className="ok">{data ? n(data.activeCount) : "—"}</strong></div><div className="panel stat"><span>{tx(["نتیجهٔ جست‌وجو", "Matching users", "Treffer", "Eşleşen"])}</span><strong>{data ? n(data.count) : "—"}</strong></div></div>
      <div className="domain-toolbar">
        <input aria-label={tx(["جست‌وجوی کاربر", "Search users", "Benutzer suchen", "Kullanıcı ara"])} placeholder={tx(["نام، ایمیل یا شماره", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select aria-label={tx(["وضعیت دسترسی", "Access status", "Zugriffsstatus", "Erişim durumu"])} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}><option value="all">{tx(["همهٔ کاربران", "All users", "Alle Benutzer", "Tüm kullanıcılar"])}</option><option value="active">{tx(["فیتنس فعال", "Active fitness", "Fitness aktiv", "Fitness etkin"])}</option></select>
      </div>
      <section className="panel" aria-busy={!data}>
        {data?.users.length ? <div className="llm-custom">{data.users.map((u) => { const exp = expiryOf(u); const on = !!exp && new Date(exp) > new Date(); return <div key={u.id} className="access-row">
          <div><strong><Link href={"/admin/users/" + encodeURIComponent(u.id)}>{u.name || u.email || u.phone}</Link></strong><small><bdi dir="ltr">{u.email || u.phone}</bdi></small></div>
          <div className="domain-actions">
            <span className={"badge " + (on ? "green" : "")}>{on ? tx(["فعال تا", "Active until", "Aktiv bis", "Bitiş"]) + " " + new Date(exp!).toLocaleDateString(tag) : tx(["غیرفعال", "Inactive", "Inaktiv", "Etkin değil"])}</span>
            <Button onClick={() => { setOpen(u); setDays("30"); setReason(""); }}><Icon name="Dumbbell" size={15} />{tx(["مدیریت دسترسی", "Manage access", "Zugang verwalten", "Erişimi yönet"])}</Button>
          </div>
        </div>; })}</div> : data && <Empty />}
        {data && <div className="pagination"><span>{n(data.count)}</span><div><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button><span>{n(page)} / {n(Math.max(1, Math.ceil(data.count / 20)))}</span><Button disabled={page * 20 >= data.count} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button></div></div>}
      </section>
      {open && (() => { const exp = expiryOf(open); const on = !!exp && new Date(exp) > new Date(); return (
        <Modal title={tx(["دسترسی فیتنس", "Fitness access", "Fitness-Zugang", "Fitness erişimi"]) + " · " + (open.name || open.email || open.phone)} onClose={() => setOpen(null)}>
          <p>{on ? tx(["فعال تا", "Active until", "Aktiv bis", "Bitiş"]) + " " + new Date(exp!).toLocaleDateString(tag) : tx(["دسترسی فعال ندارد.", "No active access.", "Kein aktiver Zugang.", "Aktif erişim yok."])}</p>
          <div className="domain-fields">
            <label>{tx(["مدت (روز)", "Days", "Tage", "Gün"])}<input type="number" min={1} max={366} dir="ltr" value={days} onChange={(e) => setDays(e.target.value)} /></label>
            <label>{tx(["دلیل (اختیاری)", "Reason (optional)", "Grund (optional)", "Neden (isteğe bağlı)"])}<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          </div>
          <div className="domain-actions">
            <Button variant="primary" disabled={busy} onClick={() => void save(true)}>{on ? tx(["تمدید دسترسی", "Extend access", "Zugang verlängern", "Erişimi uzat"]) : tx(["فعال‌سازی فیتنس", "Enable fitness", "Fitness aktivieren", "Fitness'ı aç"])}</Button>
            {on && <Button variant="danger" disabled={busy} onClick={() => void save(false)}>{tx(["قطع دسترسی", "Disable access", "Zugang entziehen", "Erişimi kapat"])}</Button>}
          </div>
        </Modal>
      ); })()}
    </>
  );
}

/* ───────────────────────── Trainer marketplace ───────────────────────── */

type Act = { action: string; id: string; title: string; needsRef: boolean; danger?: boolean };
const MTABS: [string, Tx][] = [["applications", ["درخواست مربیان", "Applications", "Bewerbungen", "Başvurular"]], ["products", ["محصولات", "Products", "Produkte", "Ürünler"]], ["orders", ["سفارش‌ها و رزروها", "Orders & bookings", "Bestellungen & Buchungen", "Siparişler ve rezervasyonlar"]], ["ledger", ["تسویهٔ فروشندگان", "Seller payouts", "Verkäuferauszahlungen", "Satıcı ödemeleri"]], ["reviews", ["نظرها", "Reviews", "Bewertungen", "Yorumlar"]]];

export function LiveFitnessMarketplace() {
  const { n, tx } = useT();
  const [data, setData] = useState<Row | null>(null);
  const [tab, setTab] = useState("applications");
  const [commission, setCommission] = useState("15");
  const [act, setAct] = useState<Act | null>(null);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const d = await api("/api/admin/fitness/marketplace"); setData(d); setCommission(String(d.commissionPercent)); } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const open = (a: Act) => { setAct(a); setReason(""); setReference(""); };
  async function run() {
    if (!act) return;
    setBusy(true);
    try { await api("/api/admin/fitness/marketplace", { method: "POST", body: JSON.stringify({ action: act.action, id: act.id, reason, reference }) }); toast.success(tx(["ثبت شد", "Recorded", "Erfasst", "Kaydedildi"])); setAct(null); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const money = (minor: number, cur: string) => (cur === "IRT" ? n(minor) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]) : (minor / 100).toFixed(2) + " " + cur);
  const btn = (a: Act, label: Tx, variant = "") => <Button variant={variant || (a.danger ? "danger" : "")} onClick={() => open(a)}>{tx(label)}</Button>;
  const rows: Row[] = data?.[tab] ?? [];
  const parse = (s: string, fb: unknown) => { try { return JSON.parse(s); } catch { return fb; } };
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Store" size={28} /></span>
        <div>
          <h2>{tx(["بازار مربیان، رزرو و فروشگاه", "Trainer marketplace, bookings & store", "Trainermarkt, Buchungen & Shop", "Eğitmen pazarı, rezervasyon ve mağaza"])}</h2>
          <p>{tx(["مربی را فقط پس از بررسی واقعی رضایت و مدارک تأیید کن. بازپرداخت و تسویه را فقط پس از انتقال واقعی و با شمارهٔ مرجع آن ثبت کن؛ این صفحه پولی جابه‌جا نمی‌کند.", "Approve trainers only after a real consent and credential review. Record refunds and payouts only after an actual transfer, with its reference; this page moves no money.", "Trainer erst nach echter Prüfung freigeben. Erstattungen und Auszahlungen erst nach echter Überweisung mit Referenz erfassen; hier wird kein Geld bewegt.", "Eğitmenleri yalnızca gerçek inceleme sonrası onaylayın. İade ve ödemeleri gerçek transferden sonra referansıyla kaydedin; bu sayfa para taşımaz."])}</p>
        </div>
      </div>
      <FitNav here="/admin/fitness/marketplace" />
      <form className="panel admin-commission-row" onSubmit={(e) => { e.preventDefault(); open({ action: "setCommission", id: String(Number(commission)), title: tx(["تغییر کمیسیون بازار", "Change marketplace commission", "Marktprovision ändern", "Pazar komisyonunu değiştir"]) + ": " + (data?.commissionPercent ?? "—") + "% → " + commission + "%", needsRef: false }); }}>
        <Icon name="Percent" size={20} />
        <span>{tx(["کمیسیون بازار از فروشنده", "Marketplace seller commission", "Marktprovision vom Verkäufer", "Satıcıdan pazar komisyonu"])}</span>
        <input type="number" min={0} max={100} dir="ltr" value={commission} onChange={(e) => setCommission(e.target.value)} />
        <span>٪</span>
        <Button type="submit" variant="primary" disabled={!data || Number(commission) === data.commissionPercent}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
      </form>
      <nav className="gc-chips">{MTABS.map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{tx(l)} {data ? "(" + n(data[k]?.length ?? 0) + ")" : ""}</button>)}</nav>
      <div className="tool-grid fit-grid" aria-busy={!data}>
        {rows.map((r) => <article key={r.id} className="panel fit-card">
          <div className="row-between"><strong>{r.name || r.title || r.user?.email || r.id}</strong><span className="badge">{r.status}</span></div>
          {tab === "applications" && <>
            {r.biography && <p>{r.biography}</p>}
            {r.qualifications && <pre className="fit-pre">{r.qualifications}</pre>}
            <small>{[r.country, r.timezone, r.languages].filter(Boolean).join(" · ")}</small>
            <div className="domain-actions">{(parse(r.credentials || "[]", []) as unknown[]).map((_, k) => <a key={k} className="btn" href={`/api/admin/fitness/marketplace/files?application=${encodeURIComponent(r.id)}&index=${k}`} target="_blank" rel="noreferrer"><Icon name="FileLock" size={14} />{tx(["مدرک", "Credential", "Nachweis", "Belge"])} {n(k + 1)}</a>)}</div>
            {r.status === "PENDING" && <div className="domain-actions">
              {btn({ action: "approveApplication", id: r.id, title: tx(["تأیید مدارک و فعال‌سازی مربی", "Verify credentials & activate trainer", "Prüfen & Trainer aktivieren", "Belgeleri doğrula ve eğitmeni etkinleştir"]), needsRef: false }, ["تأیید و فعال‌سازی", "Verify & activate", "Prüfen & aktivieren", "Doğrula ve etkinleştir"], "primary")}
              {btn({ action: "rejectApplication", id: r.id, title: tx(["رد درخواست مربی", "Reject the application", "Bewerbung ablehnen", "Başvuruyu reddet"]), needsRef: false, danger: true }, ["رد", "Reject", "Ablehnen", "Reddet"])}
            </div>}
          </>}
          {tab === "products" && <>
            {r.description && <p>{r.description}</p>}
            <small>{money(r.priceMinor, r.currency)}{r.trainer?.name ? " · " + r.trainer.name : ""}</small>
            <div className="domain-actions">
              {r.kind === "DIGITAL" && <a className="btn" href={"/api/admin/fitness/marketplace/files?product=" + encodeURIComponent(r.id)} target="_blank" rel="noreferrer"><Icon name="Download" size={14} />{tx(["دانلود خصوصی برای بررسی", "Private review download", "Privater Download", "Özel indirme"])}</a>}
              {btn({ action: "publishProduct", id: r.id, title: tx(["انتشار محصول", "Publish product", "Produkt veröffentlichen", "Ürünü yayımla"]) + " · " + (r.title || r.name), needsRef: false }, ["انتشار", "Publish", "Veröffentlichen", "Yayımla"], "primary")}
              {btn({ action: "archiveProduct", id: r.id, title: tx(["بایگانی محصول", "Archive product", "Produkt archivieren", "Ürünü arşivle"]) + " · " + (r.title || r.name), needsRef: false }, ["بایگانی", "Archive", "Archivieren", "Arşivle"])}
            </div>
          </>}
          {tab === "orders" && <>
            <p>{parse(r.snapshot, {})?.title} · {r.currency === "IRT" ? n(r.totalMinor) + " " + tx(["تومان", "Toman", "Toman", "Tümen"]) : (r.totalMinor / 100).toFixed(2) + " " + r.currency}</p>
            {r.shippingAddress && <small>{r.shippingAddress}</small>}
            {r.refundReason && <p className="admin-note">{tx(["دلیل درخواست بازپرداخت", "Refund request reason", "Erstattungsgrund", "İade nedeni"])}: {r.refundReason}</p>}
            <div className="domain-actions">
              <Link className="btn" href="/admin/financial">{tx(["پرداخت و رسید", "Payment & receipt", "Zahlung & Beleg", "Ödeme ve dekont"])}</Link>
              {r.status === "PAID" && btn({ action: r.booking ? "completeBooking" : "deliver", id: r.id, title: tx(["ثبت تحویل واقعی", "Record the actual delivery", "Tatsächliche Lieferung erfassen", "Gerçek teslimatı kaydet"]), needsRef: true }, ["ثبت تحویل", "Record delivery", "Lieferung erfassen", "Teslimatı kaydet"], "primary")}
              {r.status === "REFUND_REQUESTED" && btn({ action: "confirmRefund", id: r.id, title: tx(["ثبت بازپرداخت انجام‌شده", "Record a completed external refund", "Erfolgte Erstattung erfassen", "Gerçekleşen iadeyi kaydet"]), needsRef: true, danger: true }, ["ثبت بازپرداخت", "Record refund", "Erstattung erfassen", "İadeyi kaydet"])}
            </div>
          </>}
          {tab === "ledger" && <>
            <p>{n(r.amountToman)} {tx(["تومان", "Toman", "Toman", "Tümen"])} · {r.kind}</p>
            <div className="domain-actions">
              {r.status === "HELD" && btn({ action: "releaseSellerFunds", id: r.id, title: tx(["آزادسازی سهم فروشنده پس از تحویل", "Release the seller's share after delivery", "Verkäuferanteil nach Lieferung freigeben", "Teslimattan sonra satıcı payını serbest bırak"]), needsRef: false }, ["آزادسازی", "Release", "Freigeben", "Serbest bırak"], "primary")}
              {r.status === "RELEASED" && btn({ action: "recordSellerPayout", id: r.id, title: tx(["ثبت واریز انجام‌شده به فروشنده", "Record a completed payout to the seller", "Erfolgte Auszahlung erfassen", "Satıcıya yapılan ödemeyi kaydet"]), needsRef: true }, ["ثبت واریز", "Record payout", "Auszahlung erfassen", "Ödemeyi kaydet"], "primary")}
            </div>
          </>}
          {tab === "reviews" && <>
            <p>{"★".repeat(Math.max(0, Math.min(5, r.rating)))} · {r.body}</p>
            <div className="domain-actions">
              {btn({ action: "approveReview", id: r.id, title: tx(["انتشار نظر", "Publish review", "Bewertung veröffentlichen", "Yorumu yayımla"]), needsRef: false }, ["انتشار", "Publish", "Veröffentlichen", "Yayımla"], "primary")}
              {btn({ action: "hideReview", id: r.id, title: tx(["پنهان کردن نظر", "Hide review", "Bewertung ausblenden", "Yorumu gizle"]), needsRef: false, danger: true }, ["پنهان کردن", "Hide", "Ausblenden", "Gizle"])}
            </div>
          </>}
        </article>)}
      </div>
      {data && !rows.length && <Empty />}
      {act && (
        <Modal title={act.title} onClose={() => setAct(null)}>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void run(); }}>
            <label className="span-2">{tx(["دلیل و نتیجهٔ بررسی (حداقل ۵ حرف)", "Reason and review result (5+ characters)", "Grund und Prüfergebnis (mind. 5 Zeichen)", "Neden ve inceleme sonucu (5+ karakter)"])}<textarea required minLength={5} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            {act.needsRef && <label className="span-2">{tx(["شمارهٔ مرجع انتقال یا ارسال واقعی", "Actual transfer / delivery reference", "Tatsächliche Überweisungs-/Versandreferenz", "Gerçek transfer / gönderim referansı"])}<input required dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} /></label>}
            {act.needsRef && <p className="span-2 fine-print">{tx(["این فقط کاری را که بیرون از سایت انجام داده‌ای ثبت می‌کند و خودش پولی جابه‌جا نمی‌کند.", "This only records what you already did outside the site; it moves no money itself.", "Erfasst nur, was bereits außerhalb erledigt wurde; bewegt kein Geld.", "Yalnızca site dışında yaptığınızı kaydeder; para taşımaz."])}</p>}
            <div className="span-2 domain-actions"><Button type="submit" variant={act.danger ? "danger" : "primary"} disabled={busy || reason.trim().length < 5 || (act.needsRef && !reference.trim())}>{tx(["تأیید و ثبت", "Confirm and record", "Bestätigen und erfassen", "Onayla ve kaydet"])}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
