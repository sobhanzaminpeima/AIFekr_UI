"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * AIFekr PLAY admin (/admin/play) on the real main-site APIs:
 * - GET/POST /api/admin/play: module lifecycle, per-game status and rules, question bank,
 *   player moderation; recent players and sessions. Every POST is audited server-side.
 * - GET/POST /api/admin/play/competitions: create, publish, pause, close (ranks accepted
 *   sessions), approve winners (creates the reward and notifies the winner), archive,
 *   and mark a reward delivered.
 * - POST /api/admin/play/questions/generate: drafts questions with the platform AI model
 *   (a small real model call, rate-limited to 5/hour); drafts stay unpublished.
 * Every change asks for confirmation and says what it will do.
 */
type Tx = [string, string, string, string];
const GAMES = ["tower", "snake", "2048", "speed-run", "fiko-fly", "brain"] as const;
type Game = { slug: string; status: string; version: number; configuration: string; updatedAt: string };
type Player = { userId: string; xp: number; sessions: number; points: number; suspended: boolean; moderationReason: string; lastActivity: string | null; user: { name: string | null } | null };
type Session = { id: string; userId: string; gameSlug: string; status: string; score: number; xp: number; rejectionReason: string | null; createdAt: string };
type Question = { id: string; language: string; prompt: string; options: string; answer: number; explanation: string; status: string; createdAt: string };
type Data = { configuration: { status: string }; games: Game[]; players: Player[]; sessions: Session[]; questions: Question[]; totals: { players: number; sessions: number; verified: number } };
type Tournament = { id: string; title: string; description: string; gameSlug: string; status: string; startsAt: string; endsAt: string; maxAttempts: number; maxParticipants: number; rewardTitle: string; terms: string; results: string; createdAt: string; _count: { entries: number } };
type Reward = { id: string; tournamentId: string; userId: string; title: string; status: string; deliveryNote: string; packageChoice: string; fulfilledAt: string | null; createdAt: string };
type Ask = { title: string; body: React.ReactNode; action: string; danger?: boolean; run: () => Promise<void> };

const ST: Record<string, [Tx, string]> = {
  ENABLED: [["فعال", "Enabled", "Aktiv", "Etkin"], "green"],
  INSTALLED: [["نصب‌شده", "Installed", "Installiert", "Kurulu"], ""],
  DISABLED: [["غیرفعال", "Disabled", "Deaktiviert", "Devre dışı"], "red"],
  MAINTENANCE: [["تعمیر و نگهداری", "Maintenance", "Wartung", "Bakım"], "amber"],
  ARCHIVED: [["بایگانی", "Archived", "Archiviert", "Arşiv"], ""],
  DRAFT: [["پیش‌نویس", "Draft", "Entwurf", "Taslak"], ""],
  PUBLISHED: [["منتشرشده", "Published", "Veröffentlicht", "Yayında"], "green"],
  PAUSED: [["متوقف", "Paused", "Pausiert", "Duraklatıldı"], "amber"],
  CLOSED: [["بسته‌شده", "Closed", "Geschlossen", "Kapandı"], "blue"],
  APPROVED: [["تأییدشده", "Approved", "Genehmigt", "Onaylandı"], "green"],
  FULFILLED: [["تحویل‌شده", "Delivered", "Geliefert", "Teslim edildi"], "green"],
  ACCEPTED: [["تأییدشده", "Verified", "Verifiziert", "Doğrulandı"], "green"],
  REJECTED: [["ردشده", "Rejected", "Abgelehnt", "Reddedildi"], "red"],
  OPEN: [["باز", "Open", "Offen", "Açık"], "blue"],
};
const GAME_NAME: Record<string, string> = { tower: "Tower", snake: "Snake", "2048": "2048", "speed-run": "Speed Run", "fiko-fly": "Fiko Fly", brain: "Brain" };
const LANGS = ["fa", "en", "de", "tr"] as const;
const TOPICS = ["logic", "mathematics", "technology", "science", "business"] as const;

async function call(url: string, body?: unknown) {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", credentials: "include", cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d;
}
const rulesOf = (g?: Game) => { try { const c = JSON.parse(g?.configuration || "{}"); return { speedScale: Number(c.speedScale) || 1, pointScale: Number(c.pointScale) || 1 }; } catch { return { speedScale: 1, pointScale: 1 }; } };
const local = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function LiveAdminPlay() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  const [tab, setTab] = useState<"games" | "competitions" | "questions" | "players">("games");
  const [data, setData] = useState<Data | null>(null);
  const [comp, setComp] = useState<{ tournaments: Tournament[]; rewards: Reward[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const [a, b] = await Promise.all([call("/api/admin/play"), call("/api/admin/play/competitions")]); setData(a); setComp(b); }
    catch { setFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const st = (s: string) => <span className={"badge " + (ST[s]?.[1] || "")}>{ST[s] ? tx(ST[s][0]) : s}</span>;
  const when = (iso: string | null) => iso ? new Date(iso).toLocaleString(tag, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const errText = (code: string) => ({
    INVALID_TOURNAMENT_STATE: tx(["در این وضعیت ممکن نیست (یا زمان مسابقه گذشته است).", "Not possible in this state (or the competition has ended).", "In diesem Status nicht möglich.", "Bu durumda mümkün değil."]),
    COMPETITION_NOT_ENDED: tx(["مسابقه هنوز تمام نشده است.", "The competition has not ended yet.", "Der Wettbewerb ist noch nicht beendet.", "Yarışma henüz bitmedi."]),
    CLOSE_BEFORE_ARCHIVING: tx(["اول مسابقه را ببندید.", "Close the competition first.", "Erst schließen.", "Önce kapatın."]),
    WINNERS_NOT_READY: tx(["اول مسابقه را ببندید تا رتبه‌ها حساب شوند.", "Close it first so rankings are computed.", "Erst schließen, damit Ränge berechnet werden.", "Önce kapatın, sıralama hesaplansın."]),
    WINNER_REQUIRES_REVIEW: tx(["برنده تعلیق شده است؛ اول وضعیتش را بررسی کنید.", "The winner is suspended; review them first.", "Gewinner gesperrt; erst prüfen.", "Kazanan askıda; önce inceleyin."]),
    BRAIN_COMPETITION_REQUIRES_FIXED_BANK_VERSION: tx(["مسابقهٔ Brain هنوز پشتیبانی نمی‌شود.", "Brain competitions are not supported yet.", "Brain-Wettbewerbe noch nicht unterstützt.", "Brain yarışmaları henüz desteklenmiyor."]),
    REWARD_NOT_APPROVED: tx(["جایزه در وضعیت تأییدشده نیست.", "The reward is not in approved state.", "Belohnung nicht genehmigt.", "Ödül onaylı değil."]),
    RATE_LIMITED: tx(["سقف ساعتی رسیده است.", "Hourly limit reached.", "Stündliches Limit erreicht.", "Saatlik sınır doldu."]),
    AI_PROVIDER_UNAVAILABLE: tx(["مدل هوش مصنوعی در دسترس نیست.", "AI model unavailable.", "KI-Modell nicht verfügbar.", "AI modeli kullanılamıyor."]),
  } as Record<string, string>)[code] || tx(["عملیات انجام نشد", "Action failed", "Aktion fehlgeschlagen", "İşlem başarısız"]) + " (" + code + ")";

  async function confirmRun() {
    if (!ask) return;
    setBusy(true);
    try { await ask.run(); toast.success(tx(["انجام شد", "Done", "Erledigt", "Tamam"])); setAsk(null); await load(); }
    catch (e) { toast.error(errText((e as Error).message)); }
    finally { setBusy(false); }
  }

  if (failed) return <p className="fine-print" role="alert">{tx(["اطلاعات PLAY دریافت نشد.", "PLAY data could not be loaded.", "PLAY-Daten konnten nicht geladen werden.", "PLAY verileri yüklenemedi."])}</p>;
  if (!data || !comp) return <p className="fine-print" role="status">{tx(["در حال دریافت…", "Loading…", "Wird geladen…", "Yükleniyor…"])}</p>;

  const tabs: [typeof tab, Tx][] = [
    ["games", ["ماژول و بازی‌ها", "Module & games", "Modul & Spiele", "Modül ve oyunlar"]],
    ["competitions", ["مسابقه‌ها و جوایز", "Competitions & rewards", "Wettbewerbe & Preise", "Yarışmalar ve ödüller"]],
    ["questions", ["بانک سؤال", "Question bank", "Fragenbank", "Soru bankası"]],
    ["players", ["بازیکنان و جلسه‌ها", "Players & sessions", "Spieler & Sitzungen", "Oyuncular ve oturumlar"]],
  ];
  const pending = comp.rewards.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="admin-sms">
      <header className="panel">
        <span className="eyebrow">AIFekr / PLAY</span>
        <h1>AIFekr PLAY</h1>
        <p className="muted">{tx(["بازی‌ها، مسابقه‌ها، جوایز، بانک سؤال و نظارت بر بازیکنان. همهٔ تغییرات در لاگ ممیزی ثبت می‌شوند.", "Games, competitions, rewards, question bank and player moderation. Every change is audit-logged.", "Spiele, Wettbewerbe, Preise, Fragenbank und Moderation. Jede Änderung wird protokolliert.", "Oyunlar, yarışmalar, ödüller, soru bankası ve moderasyon. Her değişiklik denetim kaydına yazılır."])}</p>
        <div className="chips">{st(data.configuration.status)}<Link className="badge" href="/play">{tx(["محیط کاربر", "Player view", "Spieleransicht", "Oyuncu görünümü"])} ↗</Link></div>
      </header>
      <div className="stats-grid">
        {([
          [tx(["بازیکنان", "Players", "Spieler", "Oyuncular"]), data.totals.players],
          [tx(["جلسه‌های بازی", "Game sessions", "Spielsitzungen", "Oyun oturumu"]), data.totals.sessions],
          [tx(["امتیاز تأییدشده", "Verified scores", "Verifizierte Punkte", "Doğrulanmış skor"]), data.totals.verified],
          [tx(["جایزهٔ در انتظار تحویل", "Rewards to deliver", "Zu liefernde Preise", "Teslim bekleyen ödül"]), pending],
        ] as [string, number][]).map(([a, b]) => <div className="panel stat" key={a}><span>{a}</span><strong>{n(b)}</strong></div>)}
      </div>
      <nav className="module-tabs">{tabs.map(([k, l]) => <button key={k} type="button" className={tab === k ? "selected" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>{tx(l)}</button>)}</nav>

      {tab === "games" && <GamesTab data={data} tx={tx} st={st} setAsk={setAsk} />}
      {tab === "competitions" && <CompetitionsTab comp={comp} data={data} tx={tx} n={n} st={st} when={when} setAsk={setAsk} />}
      {tab === "questions" && <QuestionsTab data={data} tx={tx} n={n} st={st} when={when} setAsk={setAsk} />}
      {tab === "players" && <PlayersTab data={data} tx={tx} n={n} st={st} when={when} setAsk={setAsk} />}

      {ask && (
        <Modal title={ask.title} onClose={() => !busy && setAsk(null)}>
          <div>{ask.body}</div>
          <div className="domain-actions">
            <Button variant={ask.danger ? "danger" : "primary"} disabled={busy} onClick={() => void confirmRun()}>{busy ? "…" : ask.action}</Button>
            <Button disabled={busy} onClick={() => setAsk(null)}>{tx(["انصراف", "Cancel", "Abbrechen", "İptal"])}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

type Common = { tx: (c: Tx) => string; st: (s: string) => React.ReactNode; setAsk: (a: Ask) => void };

function GamesTab({ data, tx, st, setAsk }: Common & { data: Data }) {
  const [rules, setRules] = useState<Record<string, { speedScale: number; pointScale: number }>>(() => Object.fromEntries(data.games.map((g) => [g.slug, rulesOf(g)])));
  const lifecycle = (status: string) => setAsk({
    title: tx(["تغییر وضعیت ماژول PLAY", "Change PLAY module status", "PLAY-Modulstatus ändern", "PLAY modül durumunu değiştir"]),
    body: <p>{tx(["وضعیت کل ماژول برای همهٔ کاربران تغییر می‌کند: ", "The whole module changes for all users: ", "Das gesamte Modul ändert sich für alle: ", "Tüm modül herkes için değişir: "])}<b>{data.configuration.status} → {status}</b></p>,
    action: tx(["تغییر وضعیت", "Change status", "Status ändern", "Durumu değiştir"]), danger: status !== "ENABLED",
    run: async () => { await call("/api/admin/play", { action: "lifecycle", status }); },
  });
  const save = (g: Game, status: string, withRules: boolean) => {
    const before = rulesOf(g), after = rules[g.slug];
    setAsk({
      title: tx(["تغییر بازی ", "Change game ", "Spiel ändern: ", "Oyunu değiştir: "]) + (GAME_NAME[g.slug] || g.slug),
      body: <ul className="fine-print" dir="ltr">
        {status !== g.status && <li>status: {g.status} → {status}</li>}
        {withRules && before.speedScale !== after.speedScale && <li>speedScale: {before.speedScale} → {after.speedScale}</li>}
        {withRules && before.pointScale !== after.pointScale && <li>pointScale: {before.pointScale} → {after.pointScale}</li>}
        <li>version: {g.version} → {g.version + 1} ({tx(["جلسه‌های جدید با نسخهٔ جدید", "new sessions use the new version", "neue Sitzungen nutzen die neue Version", "yeni oturumlar yeni sürümü kullanır"])})</li>
      </ul>,
      action: tx(["ذخیره", "Save", "Speichern", "Kaydet"]), danger: status !== "ENABLED",
      run: async () => { await call("/api/admin/play", { action: "game", slug: g.slug, status, ...(withRules ? { rules: after } : {}) }); },
    });
  };
  return (
    <>
      <section className="panel">
        <h2>{tx(["وضعیت ماژول", "Module status", "Modulstatus", "Modül durumu"])}</h2>
        <div className="domain-actions">
          {["ENABLED", "MAINTENANCE", "DISABLED", "ARCHIVED"].map((s) => <Button key={s} variant={data.configuration.status === s ? "primary" : ""} disabled={data.configuration.status === s} onClick={() => lifecycle(s)}>{tx(ST[s][0])}</Button>)}
        </div>
      </section>
      <section className="panel">
        <h2>{tx(["بازی‌ها و قوانین", "Games and rules", "Spiele und Regeln", "Oyunlar ve kurallar"])}</h2>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["بازی", "Game", "Spiel", "Oyun"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["سرعت (۰٫۵–۲)", "Speed (0.5–2)", "Tempo (0,5–2)", "Hız (0,5–2)"]), tx(["ضریب امتیاز (۱–۳)", "Points ×(1–3)", "Punkte ×(1–3)", "Puan ×(1–3)"]), tx(["نسخه", "Version", "Version", "Sürüm"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>
              {GAMES.map((slug) => {
                const g = data.games.find((x) => x.slug === slug);
                if (!g) return <tr key={slug}><td>{GAME_NAME[slug]}</td><td colSpan={5} className="muted">{tx(["هنوز نصب نشده", "Not installed yet", "Noch nicht installiert", "Henüz kurulmadı"])}</td></tr>;
                const r = rules[slug] || rulesOf(g), dirty = JSON.stringify(r) !== JSON.stringify(rulesOf(g));
                return (
                  <tr key={slug}>
                    <td><strong>{GAME_NAME[slug]}</strong></td>
                    <td><select aria-label={tx(["وضعیت", "Status", "Status", "Durum"])} value={g.status} onChange={(e) => save(g, e.target.value, false)}>{["ENABLED", "MAINTENANCE", "DISABLED", "ARCHIVED"].map((s) => <option key={s} value={s}>{tx(ST[s][0])}</option>)}</select></td>
                    <td><input type="number" min="0.5" max="2" step="0.1" dir="ltr" value={r.speedScale} onChange={(e) => setRules({ ...rules, [slug]: { ...r, speedScale: Number(e.target.value) } })} /></td>
                    <td><input type="number" min="1" max="3" step="1" dir="ltr" value={r.pointScale} onChange={(e) => setRules({ ...rules, [slug]: { ...r, pointScale: Number(e.target.value) } })} /></td>
                    <td>v{g.version}</td>
                    <td><Button disabled={!dirty || r.speedScale < 0.5 || r.speedScale > 2 || r.pointScale < 1 || r.pointScale > 3 || !Number.isInteger(r.pointScale)} onClick={() => save(g, g.status, true)}>{tx(["ذخیرهٔ قوانین", "Save rules", "Regeln speichern", "Kuralları kaydet"])}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const EMPTY_T = () => { const s = new Date(Date.now() + 3600000), e = new Date(Date.now() + 7 * 86400000); return { title: "", description: "", gameSlug: "tower", startsAt: local(s.toISOString()), endsAt: local(e.toISOString()), maxAttempts: 3, maxParticipants: 1000, rewardTitle: "", terms: "" }; };

function CompetitionsTab({ comp, data, tx, n, st, when, setAsk }: Common & { comp: { tournaments: Tournament[]; rewards: Reward[] }; data: Data; n: (v: number) => string; when: (iso: string | null) => string }) {
  const [form, setForm] = useState<ReturnType<typeof EMPTY_T> | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const nameOf = (userId: string) => data.players.find((p) => p.userId === userId)?.user?.name || userId.slice(0, 10) + "…";
  const act = (t: Tournament, action: string, label: Tx, body: Tx, danger = false) => setAsk({
    title: tx(label) + " · " + t.title, body: <p>{tx(body)}</p>, action: tx(label), danger,
    run: async () => { await call("/api/admin/play/competitions", { action, id: t.id }); },
  });
  const create = () => form && setAsk({
    title: tx(["ساخت مسابقه (پیش‌نویس)", "Create competition (draft)", "Wettbewerb anlegen (Entwurf)", "Yarışma oluştur (taslak)"]),
    body: <ul className="fine-print"><li>{form.title} · {GAME_NAME[form.gameSlug]}</li><li dir="ltr">{form.startsAt} → {form.endsAt}</li><li>{tx(["تلاش", "Attempts", "Versuche", "Deneme"])}: {form.maxAttempts} · {tx(["ظرفیت", "Capacity", "Kapazität", "Kapasite"])}: {form.maxParticipants}</li><li>{tx(["جایزه", "Reward", "Preis", "Ödül"])}: {form.rewardTitle || "—"}</li><li>{tx(["تا انتشار برای کاربران دیده نمی‌شود.", "Users won’t see it until you publish.", "Erst nach Veröffentlichung sichtbar.", "Yayınlanana kadar görünmez."])}</li></ul>,
    action: tx(["ساخت", "Create", "Anlegen", "Oluştur"]),
    run: async () => { await call("/api/admin/play/competitions", { action: "create", configuration: { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() } }); setForm(null); },
  });
  const valid = form && form.title.length >= 3 && form.terms.length >= 20 && new Date(form.endsAt) > new Date(form.startsAt) && form.gameSlug !== "brain";
  return (
    <>
      <section className="panel">
        <div className="table-toolbar">
          <h2>{tx(["مسابقه‌ها", "Competitions", "Wettbewerbe", "Yarışmalar"])}</h2>
          <Button variant="primary" onClick={() => setForm(form ? null : EMPTY_T())}><Icon name="Plus" size={16} />{tx(["مسابقهٔ جدید", "New competition", "Neuer Wettbewerb", "Yeni yarışma"])}</Button>
        </div>
        {form && (
          <div className="domain-fields">
            <label>{tx(["عنوان", "Title", "Titel", "Başlık"])}<input value={form.title} maxLength={180} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>{tx(["بازی", "Game", "Spiel", "Oyun"])}<select value={form.gameSlug} onChange={(e) => setForm({ ...form, gameSlug: e.target.value })}>{GAMES.filter((g) => g !== "brain").map((g) => <option key={g} value={g}>{GAME_NAME[g]}</option>)}</select></label>
            <label>{tx(["شروع", "Starts", "Beginn", "Başlangıç"])}<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
            <label>{tx(["پایان", "Ends", "Ende", "Bitiş"])}<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            <label>{tx(["حداکثر تلاش هر نفر", "Attempts per player", "Versuche pro Spieler", "Oyuncu başına deneme"])}<input type="number" min="1" max="10" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} /></label>
            <label>{tx(["ظرفیت شرکت‌کننده", "Participant capacity", "Teilnehmerkapazität", "Katılımcı kapasitesi"])}<input type="number" min="1" max="10000" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })} /></label>
            <label className="span-2">{tx(["جایزهٔ نفر اول (اختیاری)", "First-place reward (optional)", "Preis für Platz 1 (optional)", "Birincilik ödülü (isteğe bağlı)"])}<input value={form.rewardTitle} maxLength={180} placeholder="MONTHLY_PACKAGE_CHOICE" onChange={(e) => setForm({ ...form, rewardTitle: e.target.value })} /></label>
            <label className="span-2">{tx(["توضیح", "Description", "Beschreibung", "Açıklama"])}<textarea rows={2} maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="span-2">{tx(["قوانین و شرایط (حداقل ۲۰ نویسه)", "Terms (min. 20 characters)", "Bedingungen (mind. 20 Zeichen)", "Koşullar (en az 20 karakter)"])}<textarea rows={3} maxLength={10000} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></label>
            <div className="span-2 domain-actions"><Button variant="primary" disabled={!valid} onClick={create}>{tx(["بررسی و ساخت", "Review and create", "Prüfen und anlegen", "İncele ve oluştur"])}</Button><Button onClick={() => setForm(null)}>{tx(["انصراف", "Cancel", "Abbrechen", "İptal"])}</Button></div>
          </div>
        )}
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["مسابقه", "Competition", "Wettbewerb", "Yarışma"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["زمان", "Window", "Zeitraum", "Zaman"]), tx(["شرکت‌کننده", "Entries", "Teilnehmer", "Katılımcı"]), tx(["برترین‌ها", "Top", "Spitze", "İlk sıralar"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>
              {comp.tournaments.map((t) => {
                const ended = new Date(t.endsAt) <= new Date();
                let top: { userId: string; score: number }[] = [];
                try { top = JSON.parse(t.results).slice(0, 3); } catch { /* none */ }
                return (
                  <tr key={t.id}>
                    <td><strong>{t.title}</strong><small className="muted"> · {GAME_NAME[t.gameSlug] || t.gameSlug}{t.rewardTitle ? " · 🏆 " + t.rewardTitle : ""}</small></td>
                    <td>{st(t.status)}</td>
                    <td>{when(t.startsAt)} → {when(t.endsAt)}</td>
                    <td>{n(t._count.entries)} / {n(t.maxParticipants)}</td>
                    <td>{top.length ? top.map((r, k) => <div key={r.userId}>{k + 1}. {nameOf(r.userId)} · {n(r.score)}</div>) : "—"}</td>
                    <td><div className="domain-actions">
                      {["DRAFT", "PAUSED"].includes(t.status) && !ended && <Button onClick={() => act(t, "publish", ["انتشار", "Publish", "Veröffentlichen", "Yayınla"], ["مسابقه برای همهٔ کاربران دیده می‌شود و ثبت‌نام باز می‌شود.", "The competition becomes visible and open to all users.", "Der Wettbewerb wird für alle sichtbar und offen.", "Yarışma herkese görünür ve açık olur."])}>{tx(["انتشار", "Publish", "Veröffentlichen", "Yayınla"])}</Button>}
                      {t.status === "PUBLISHED" && <Button onClick={() => act(t, "pause", ["توقف", "Pause", "Pausieren", "Duraklat"], ["ثبت امتیاز تا انتشار دوباره متوقف می‌شود.", "Scoring stops until you publish again.", "Wertung stoppt bis zur erneuten Veröffentlichung.", "Yeniden yayınlanana kadar skor durur."], true)}>{tx(["توقف", "Pause", "Pausieren", "Duraklat"])}</Button>}
                      {["PUBLISHED", "PAUSED"].includes(t.status) && ended && <Button onClick={() => act(t, "close", ["بستن و رتبه‌بندی", "Close and rank", "Schließen und werten", "Kapat ve sırala"], ["امتیازهای تأییدشده تا پایان مسابقه رتبه‌بندی و ثابت می‌شوند. این کار برگشت‌پذیر نیست.", "Verified scores up to the end time are ranked and frozen. This cannot be undone.", "Verifizierte Punkte werden gewertet und eingefroren. Nicht umkehrbar.", "Doğrulanmış skorlar sıralanır ve sabitlenir. Geri alınamaz."], true)}>{tx(["بستن", "Close", "Schließen", "Kapat"])}</Button>}
                      {t.status === "CLOSED" && <Button variant="primary" onClick={() => act(t, "approve", ["تأیید برنده", "Approve winner", "Gewinner bestätigen", "Kazananı onayla"], ["نفر اول جایزه می‌گیرد و به او اعلان و ایمیل فرستاده می‌شود.", "First place receives the reward and gets a notification and email.", "Platz 1 erhält den Preis samt Benachrichtigung und E-Mail.", "Birinci ödülü alır; bildirim ve e-posta gönderilir."])}>{tx(["تأیید برنده", "Approve winner", "Gewinner bestätigen", "Kazananı onayla"])}</Button>}
                      {["DRAFT", "CLOSED", "APPROVED"].includes(t.status) && <Button onClick={() => act(t, "archive", ["بایگانی", "Archive", "Archivieren", "Arşivle"], ["مسابقه از فهرست فعال خارج می‌شود.", "The competition leaves the active list.", "Der Wettbewerb verlässt die aktive Liste.", "Yarışma aktif listeden çıkar."], true)}>{tx(["بایگانی", "Archive", "Archivieren", "Arşivle"])}</Button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!comp.tournaments.length && <Empty />}
      </section>
      <section className="panel">
        <h2>{tx(["جوایز", "Rewards", "Preise", "Ödüller"])}</h2>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["برنده", "Winner", "Gewinner", "Kazanan"]), tx(["جایزه", "Reward", "Preis", "Ödül"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["تحویل", "Delivery", "Lieferung", "Teslim"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {comp.rewards.map((r) => (
                <tr key={r.id}>
                  <td><Link href={"/admin/users/" + encodeURIComponent(r.userId)}>{nameOf(r.userId)}</Link></td>
                  <td>{r.title}{r.packageChoice && <small className="muted"> · {r.packageChoice}</small>}</td>
                  <td>{st(r.status)}</td>
                  <td>{r.status === "APPROVED" ? (
                    <div className="domain-actions">
                      <input aria-label={tx(["یادداشت تحویل", "Delivery note", "Liefernotiz", "Teslim notu"])} placeholder={tx(["یادداشت تحویل (حداقل ۵ نویسه)", "Delivery note (min. 5)", "Liefernotiz (mind. 5)", "Teslim notu (en az 5)"])} value={note[r.id] || ""} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} />
                      <Button disabled={(note[r.id] || "").trim().length < 5} onClick={() => setAsk({
                        title: tx(["ثبت تحویل جایزه", "Mark reward delivered", "Preis als geliefert markieren", "Ödülü teslim edildi işaretle"]),
                        body: <p>{r.title} → {nameOf(r.userId)}. {tx(["به برنده اعلان و ایمیل «جایزه تحویل شد» فرستاده می‌شود.", "The winner gets a “reward delivered” notification and email.", "Der Gewinner erhält Benachrichtigung und E-Mail.", "Kazanana bildirim ve e-posta gider."])}</p>,
                        action: tx(["ثبت تحویل", "Mark delivered", "Als geliefert markieren", "Teslim edildi"]),
                        run: async () => { await call("/api/admin/play/competitions", { action: "fulfill", id: r.id, note: (note[r.id] || "").trim() }); },
                      })}>{tx(["تحویل شد", "Delivered", "Geliefert", "Teslim edildi"])}</Button>
                    </div>
                  ) : r.deliveryNote ? <span>{r.deliveryNote}<small className="muted"> · {when(r.fulfilledAt)}</small></span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!comp.rewards.length && <Empty />}
      </section>
    </>
  );
}

type QForm = { id?: string; status: string; language: string; prompt: string; options: string[]; answer: number; explanation: string };

function QuestionsTab({ data, tx, n, st, when, setAsk }: Common & { data: Data; n: (v: number) => string; when: (iso: string | null) => string }) {
  const [lang, setLang] = useState("all");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<QForm | null>(null);
  const [gen, setGen] = useState<{ language: string; topic: string }>({ language: "fa", topic: "logic" });
  const parse = (q: Question): QForm => { let options: string[] = ["", "", "", ""]; try { options = JSON.parse(q.options); } catch { /* keep */ } return { id: q.id, status: q.status, language: q.language, prompt: q.prompt, options, answer: q.answer, explanation: q.explanation }; };
  const rows = useMemo(() => data.questions.filter((q) => (lang === "all" || q.language === lang) && (status === "all" || q.status === status)), [data.questions, lang, status]);
  const counts = useMemo(() => ({ PUBLISHED: data.questions.filter((q) => q.status === "PUBLISHED").length, DRAFT: data.questions.filter((q) => q.status === "DRAFT").length }), [data.questions]);
  const valid = edit && edit.prompt.trim().length >= 10 && edit.explanation.trim().length >= 5 && edit.options.every((o) => o.trim()) && new Set(edit.options.map((o) => o.trim())).size === 4;
  const quick = (q: Question, next: string) => setAsk({
    title: tx(["تغییر وضعیت سؤال", "Change question status", "Fragenstatus ändern", "Soru durumunu değiştir"]),
    body: <p><q>{q.prompt.slice(0, 120)}</q> <b dir="ltr">{q.status} → {next}</b>{next === "PUBLISHED" ? " · " + tx(["در بازی Brain برای کاربران نمایش داده می‌شود.", "It will appear to players in Brain.", "Erscheint in Brain.", "Brain’de görünür."]) : ""}</p>,
    action: tx(["تغییر", "Change", "Ändern", "Değiştir"]), danger: next === "ARCHIVED",
    run: async () => { const f = parse(q); await call("/api/admin/play", { action: "question", ...f, status: next }); },
  });
  return (
    <>
      <section className="panel">
        <div className="table-toolbar">
          <h2>{tx(["بانک سؤال Brain", "Brain question bank", "Brain-Fragenbank", "Brain soru bankası"])} <small className="muted">· {n(counts.PUBLISHED)} {tx(["منتشرشده", "published", "veröffentlicht", "yayında"])} · {n(counts.DRAFT)} {tx(["پیش‌نویس", "drafts", "Entwürfe", "taslak"])}</small></h2>
          <Button variant="primary" onClick={() => setEdit({ status: "DRAFT", language: "fa", prompt: "", options: ["", "", "", ""], answer: 0, explanation: "" })}><Icon name="Plus" size={16} />{tx(["سؤال جدید", "New question", "Neue Frage", "Yeni soru"])}</Button>
        </div>
        <div className="table-filters">
          <select aria-label={tx(["زبان", "Language", "Sprache", "Dil"])} value={lang} onChange={(e) => setLang(e.target.value)}><option value="all">{tx(["همهٔ زبان‌ها", "All languages", "Alle Sprachen", "Tüm diller"])}</option>{LANGS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
          <select aria-label={tx(["وضعیت", "Status", "Status", "Durum"])} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">{tx(["همه", "All", "Alle", "Tümü"])}</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s} value={s}>{tx(ST[s][0])}</option>)}</select>
          <span className="muted">{tx(["پیش‌نویس با AI:", "AI drafts:", "KI-Entwürfe:", "AI taslakları:"])}</span>
          <select aria-label={tx(["زبان پیش‌نویس", "Draft language", "Entwurfssprache", "Taslak dili"])} value={gen.language} onChange={(e) => setGen({ ...gen, language: e.target.value })}>{LANGS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
          <select aria-label={tx(["موضوع", "Topic", "Thema", "Konu"])} value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })}>{TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <Button onClick={() => setAsk({
            title: tx(["ساخت پیش‌نویس سؤال با AI", "Draft questions with AI", "Fragen mit KI entwerfen", "AI ile soru taslağı"]),
            body: <p>{tx(["یک درخواست واقعی به مدل هوش مصنوعی پلتفرم فرستاده می‌شود (هزینهٔ کم؛ حداکثر ۵ بار در ساعت). سؤال‌ها به‌صورت پیش‌نویس ذخیره می‌شوند و تا انتشار شما دیده نمی‌شوند.", "This sends one real request to the platform AI model (small cost; max 5 per hour). Questions are saved as drafts and stay hidden until you publish them.", "Sendet eine echte Anfrage an das Plattform-KI-Modell (geringe Kosten; max. 5/Std.). Entwürfe bleiben verborgen.", "Platform AI modeline gerçek bir istek gönderir (düşük maliyet; saatte en fazla 5). Taslaklar yayınlanana kadar gizli kalır."])} <b dir="ltr">{gen.language} · {gen.topic}</b></p>,
            action: tx(["ساخت پیش‌نویس", "Create drafts", "Entwürfe erstellen", "Taslak oluştur"]),
            run: async () => { const d = await call("/api/admin/play/questions/generate", gen); toast.message(tx(["پیش‌نویس‌های جدید: ", "New drafts: ", "Neue Entwürfe: ", "Yeni taslaklar: "]) + n(Number(d.created) || 0)); },
          })}><Icon name="Sparkles" size={16} />{tx(["ساخت", "Generate", "Erzeugen", "Oluştur"])}</Button>
        </div>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["سؤال", "Question", "Frage", "Soru"]), tx(["زبان", "Lang", "Sprache", "Dil"]), tx(["پاسخ درست", "Correct answer", "Richtige Antwort", "Doğru cevap"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["ساخته‌شده", "Created", "Erstellt", "Oluşturuldu"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((q) => { const f = parse(q); return (
                <tr key={q.id}>
                  <td className="cell-clamp" dir="auto">{q.prompt}</td>
                  <td>{q.language}</td>
                  <td dir="auto">{f.options[q.answer] ?? "—"}</td>
                  <td>{st(q.status)}</td>
                  <td>{when(q.createdAt)}</td>
                  <td><div className="domain-actions">
                    <Button onClick={() => setEdit(f)}>{tx(["ویرایش", "Edit", "Bearbeiten", "Düzenle"])}</Button>
                    {q.status !== "PUBLISHED" && <Button onClick={() => quick(q, "PUBLISHED")}>{tx(["انتشار", "Publish", "Veröffentlichen", "Yayınla"])}</Button>}
                    {q.status !== "ARCHIVED" && <Button onClick={() => quick(q, "ARCHIVED")}>{tx(["بایگانی", "Archive", "Archivieren", "Arşivle"])}</Button>}
                  </div></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty />}
      </section>
      {edit && (
        <Modal title={edit.id ? tx(["ویرایش سؤال", "Edit question", "Frage bearbeiten", "Soruyu düzenle"]) : tx(["سؤال جدید", "New question", "Neue Frage", "Yeni soru"])} onClose={() => setEdit(null)}>
          <div className="domain-fields">
            <label>{tx(["زبان", "Language", "Sprache", "Dil"])}<select value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value })}>{LANGS.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
            <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s} value={s}>{tx(ST[s][0])}</option>)}</select></label>
            <label className="span-2">{tx(["متن سؤال (حداقل ۱۰ نویسه)", "Question (min. 10 characters)", "Frage (mind. 10 Zeichen)", "Soru (en az 10 karakter)"])}<textarea rows={2} dir="auto" maxLength={2000} value={edit.prompt} onChange={(e) => setEdit({ ...edit, prompt: e.target.value })} /></label>
            {edit.options.map((o, k) => (
              <label key={k}>{tx(["گزینهٔ ", "Option ", "Option ", "Seçenek "]) + (k + 1)}
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="radio" name="play-answer" aria-label={tx(["پاسخ درست", "Correct answer", "Richtige Antwort", "Doğru cevap"])} checked={edit.answer === k} onChange={() => setEdit({ ...edit, answer: k })} /><input dir="auto" maxLength={300} value={o} onChange={(e) => setEdit({ ...edit, options: edit.options.map((x, j) => j === k ? e.target.value : x) })} /></span>
              </label>
            ))}
            <label className="span-2">{tx(["توضیح پاسخ", "Explanation", "Erklärung", "Açıklama"])}<textarea rows={2} dir="auto" maxLength={2000} value={edit.explanation} onChange={(e) => setEdit({ ...edit, explanation: e.target.value })} /></label>
          </div>
          <p className="fine-print">{tx(["گزینه‌ها باید متفاوت باشند. دایرهٔ کنار گزینه، پاسخ درست را مشخص می‌کند.", "Options must differ. The circle marks the correct answer.", "Optionen müssen sich unterscheiden. Der Kreis markiert die richtige Antwort.", "Seçenekler farklı olmalı. Daire doğru cevabı gösterir."])}</p>
          <div className="domain-actions">
            <Button variant="primary" disabled={!valid} onClick={() => { const f = edit; setEdit(null); setAsk({
              title: tx(["ذخیرهٔ سؤال", "Save question", "Frage speichern", "Soruyu kaydet"]),
              body: <p dir="auto"><q>{f.prompt.slice(0, 160)}</q> · {f.language} · {tx(ST[f.status][0])}{f.status === "PUBLISHED" ? " · " + tx(["برای بازیکنان نمایش داده می‌شود.", "Visible to players.", "Für Spieler sichtbar.", "Oyunculara görünür."]) : ""}</p>,
              action: tx(["ذخیره", "Save", "Speichern", "Kaydet"]),
              run: async () => { await call("/api/admin/play", { action: "question", ...(f.id ? { id: f.id } : {}), status: f.status, language: f.language, prompt: f.prompt.trim(), options: f.options.map((o) => o.trim()), answer: f.answer, explanation: f.explanation.trim() }); },
            }); }}>{tx(["بررسی و ذخیره", "Review and save", "Prüfen und speichern", "İncele ve kaydet"])}</Button>
            <Button onClick={() => setEdit(null)}>{tx(["انصراف", "Cancel", "Abbrechen", "İptal"])}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function PlayersTab({ data, tx, n, st, when, setAsk }: Common & { data: Data; n: (v: number) => string; when: (iso: string | null) => string }) {
  const [reason, setReason] = useState<Record<string, string>>({});
  const nameOf = (userId: string) => data.players.find((p) => p.userId === userId)?.user?.name || userId.slice(0, 10) + "…";
  return (
    <>
      <section className="panel">
        <h2>{tx(["بازیکنان اخیر", "Recent players", "Letzte Spieler", "Son oyuncular"])}</h2>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["بازیکن", "Player", "Spieler", "Oyuncu"]), "XP", tx(["امتیاز", "Points", "Punkte", "Puan"]), tx(["جلسه", "Sessions", "Sitzungen", "Oturum"]), tx(["آخرین فعالیت", "Last active", "Zuletzt aktiv", "Son etkinlik"]), tx(["نظارت", "Moderation", "Moderation", "Moderasyon"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {data.players.map((p) => (
                <tr key={p.userId}>
                  <td><Link href={"/admin/users/" + encodeURIComponent(p.userId)}>{p.user?.name || p.userId.slice(0, 10) + "…"}</Link>{p.suspended && <> {st("REJECTED")}<small className="muted"> {p.moderationReason}</small></>}</td>
                  <td>{n(p.xp)}</td><td>{n(p.points)}</td><td>{n(p.sessions)}</td><td>{when(p.lastActivity)}</td>
                  <td><div className="domain-actions">
                    <input aria-label={tx(["دلیل", "Reason", "Grund", "Sebep"])} placeholder={tx(["دلیل (حداقل ۳ نویسه)", "Reason (min. 3)", "Grund (mind. 3)", "Sebep (en az 3)"])} value={reason[p.userId] || ""} onChange={(e) => setReason({ ...reason, [p.userId]: e.target.value })} />
                    <Button variant={p.suspended ? "" : "danger"} disabled={(reason[p.userId] || "").trim().length < 3} onClick={() => setAsk({
                      title: p.suspended ? tx(["رفع تعلیق بازیکن", "Lift suspension", "Sperre aufheben", "Askıyı kaldır"]) : tx(["تعلیق بازیکن", "Suspend player", "Spieler sperren", "Oyuncuyu askıya al"]),
                      body: <p>{p.user?.name || p.userId} · {tx(["دلیل: ", "Reason: ", "Grund: ", "Sebep: "])}{(reason[p.userId] || "").trim()}{p.suspended ? "" : " · " + tx(["بازیکن معلق جایزهٔ مسابقه نمی‌گیرد تا بررسی شود.", "A suspended player gets no competition reward until reviewed.", "Gesperrte Spieler erhalten keine Preise.", "Askıdaki oyuncu ödül alamaz."])}</p>,
                      action: p.suspended ? tx(["رفع تعلیق", "Lift", "Aufheben", "Kaldır"]) : tx(["تعلیق", "Suspend", "Sperren", "Askıya al"]), danger: !p.suspended,
                      run: async () => { await call("/api/admin/play", { action: "moderate", userId: p.userId, suspended: !p.suspended, reason: (reason[p.userId] || "").trim() }); },
                    })}>{p.suspended ? tx(["رفع تعلیق", "Lift", "Aufheben", "Kaldır"]) : tx(["تعلیق", "Suspend", "Sperren", "Askıya al"])}</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.players.length && <Empty />}
      </section>
      <section className="panel">
        <h2>{tx(["جلسه‌های اخیر", "Recent sessions", "Letzte Sitzungen", "Son oturumlar"])}</h2>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["زمان", "Time", "Zeit", "Zaman"]), tx(["بازیکن", "Player", "Spieler", "Oyuncu"]), tx(["بازی", "Game", "Spiel", "Oyun"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["امتیاز", "Score", "Punkte", "Skor"]), "XP"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id}>
                  <td>{when(s.createdAt)}</td>
                  <td>{nameOf(s.userId)}</td>
                  <td>{GAME_NAME[s.gameSlug] || s.gameSlug}</td>
                  <td>{st(s.status)}{s.rejectionReason && <small className="muted" dir="ltr"> {s.rejectionReason}</small>}</td>
                  <td>{n(s.score)}</td><td>{n(s.xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.sessions.length && <Empty />}
      </section>
    </>
  );
}
