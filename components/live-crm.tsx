"use client";
// The design's CRM (business-shell.tsx + crm-workspace.tsx) on aifekr.com with
// the real CRM (main site app/(dashboard)/(business)/crm/page.tsx): pipelines
// and deals, contacts and their history, follow-ups, analytics, automation and
// the CRM agent. Wording comes from /api/app/shell (shell.crm); the commercial
// tabs are in live-crm-ops.tsx and the real-estate tabs in live-crm-estate.tsx.
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { fill } from "@/lib/live-app";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  GATED_TABS, INDUSTRIES, LEAD_SOURCES, REAL_ESTATE_MODULE_KEYS, compactAmount, dateLocale, fmtDuration, fmtMoney, localizedName, toJalali,
  type Activity, type AutomationRule, type Contact, type ContactDetail, type CrmCopy, type CrmDocument, type CrmNote, type Deal, type Pipeline, type Task, type TeamMember, type ViewingRow, type VoiceAnalytics,
} from "@/lib/crm";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal } from "./ui";
import { BusinessShell } from "./business-shell";
import { CreditCost, CrmContext, EmptyText, FormError, Loading, useCrm } from "./live-crm-context";
import { ContractsView, InvoicesView, ProductsView, ProjectsView } from "./live-crm-ops";
import { MatchesView, OwnersView, PerformanceView, PropertiesView, ViewingsView } from "./live-crm-estate";

// ── Shared state ───────────────────────────────────────────────────────────
function useCrmState() {
  const shell = useShell();
  const lang = shell?.lang ?? "fa";
  const copy = (shell as { crm?: CrmCopy } | null)?.crm ?? null;
  const c = copy?.dict as CrmCopy["dict"];
  const s = useCallback((en: string, values?: Record<string, string | number>) => fill(copy?.strings[en] ?? en, values ?? {}), [copy]);
  const L = useCallback((table: string, key: string) => copy?.labels[table]?.[key] ?? key, [copy]);
  const api = useCallback(async <T,>(url: string, data?: unknown, method = "POST"): Promise<T> => {
    const init: RequestInit = method === "GET" ? { cache: "no-store" } : data instanceof FormData ? { method, body: data } : data === undefined ? { method } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
    const r = await fetch(url, init);
    if (r.status === 401) {
      // The session expired mid-visit: back to sign-in, then exactly here.
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      throw new Error("");
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || s("Error"));
    return d as T;
  }, [s]);
  const get = useCallback(<T,>(url: string) => api<T>(url, undefined, "GET"), [api]);

  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [crmPlan, setCrmPlan] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  const loadPipelines = useCallback(async () => {
    const d = await get<{ pipelines: Pipeline[] }>("/api/crm/pipelines").catch(() => ({ pipelines: [] }));
    setPipelines(d.pipelines || []);
    return d.pipelines || [];
  }, [get]);
  const loadContacts = useCallback(async () => {
    const d = await get<{ contacts: Contact[] }>("/api/crm/contacts").catch(() => ({ contacts: [] }));
    setContacts(d.contacts || []);
  }, [get]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setCrmPlan(d.user?.crmPlan || "NONE")).catch(() => setCrmPlan("NONE"));
    fetch(`/api/crm/module-access?keys=${REAL_ESTATE_MODULE_KEYS.join(",")}`).then((r) => r.json()).then((d) => setAccess(d.access || {})).catch(() => setAccess({})).finally(() => setAccessLoaded(true));
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam((d.team?.members || []).map((m: TeamMember) => ({ id: m.id, name: m.name, email: m.email })))).catch(() => {});
    void loadPipelines();
    void loadContacts();
  }, [loadPipelines, loadContacts]);

  return { shell, lang, c, s, L, api, get, access, accessLoaded, crmPlan, pipelines, loadPipelines, contacts, loadContacts, team, openContactId, setOpenContactId, ready: !!copy };
}
export type CrmCtx = ReturnType<typeof useCrmState>;

/** Every CRM tab of the design, on the real CRM. */
export function LiveCrm({ module, view }: { module: ModuleSpec; view: ViewSpec }) {
  const x = useCrmState();
  // A real-estate tab that is not enabled for this account falls back to the pipeline, as in the classic CRM.
  const gate = GATED_TABS[view.id];
  const shown = gate && x.accessLoaded && !x.access[gate] ? module.views.find((v) => v.id === "board") ?? view : view;
  return (
    <CrmContext.Provider value={x}>
      <BusinessShell module={module} view={shown}>
        {!x.ready || !x.pipelines || (gate && !x.accessLoaded) ? <div className="skeleton" /> : <CrmView view={shown.id} />}
      </BusinessShell>
      {x.openContactId && <ContactDetailModal key={x.openContactId} id={x.openContactId} onClose={() => x.setOpenContactId(null)} />}
    </CrmContext.Provider>
  );
}

function CrmView({ view }: { view: string }) {
  const x = useCrm();
  const content =
    view === "contacts" ? <ContactsView />
    : view === "automation" ? <AutomationView />
    : view === "agent" ? <AgentView />
    : view === "calendar" ? <CalendarView />
    : view === "analytics" ? <AnalyticsView />
    : view === "products" ? <ProductsView />
    : view === "invoices" ? <InvoicesView />
    : view === "contracts" ? <ContractsView />
    : view === "projects" ? <ProjectsView />
    : view === "properties" ? <PropertiesView />
    : view === "owners" ? <OwnersView />
    : view === "viewings" ? <ViewingsView />
    : view === "matches" ? <MatchesView />
    : view === "performance" ? <PerformanceView />
    : <BoardView />;
  return (
    <>
      {x.crmPlan === "NONE" && <UpgradeBanner />}
      {content}
    </>
  );
}

function UpgradeBanner() {
  const { c, lang, s } = useCrm();
  const [busy, setBusy] = useState(false);
  async function purchase(plan: "CRM_SOLO" | "CRM_TEAM") {
    setBusy(true);
    try {
      const res = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, currency: lang === "fa" ? "IRR" : "TRY" }) });
      const data = await res.json();
      if (!res.ok || !data.paymentUrl) throw new Error(data.error || c.errors.paymentStartFailed);
      window.location.href = data.paymentUrl;
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : c.errors.paymentGeneric);
      setBusy(false);
    }
  }
  return (
    <div className="panel crm-upgrade">
      <div><strong>{c.upgrade.banner}</strong><p>{c.upgrade.bannerSub}</p></div>
      <div className="domain-actions">
        <Button disabled={busy} onClick={() => purchase("CRM_SOLO")}>{c.upgrade.solo}</Button>
        <Button variant="primary" disabled={busy} onClick={() => purchase("CRM_TEAM")}>{busy ? s("Loading...") : c.upgrade.team}</Button>
      </div>
    </div>
  );
}

// ── Pipeline ───────────────────────────────────────────────────────────────
function BoardView() {
  const x = useCrm();
  const { c, s, lang, api, get, pipelines } = x;
  const { fa, n, t } = useApp();
  const [pipelineId, setPipelineId] = useState(pipelines?.[0]?.id ?? "");
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [query, setQuery] = useState("");
  const [newDeal, setNewDeal] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const pipeline = pipelines?.find((p) => p.id === pipelineId) ?? pipelines?.[0] ?? null;
  const stages = useMemo(() => [...(pipeline?.stages ?? [])].sort((a, b) => a.order - b.order), [pipeline]);
  const load = useCallback(async (id: string) => {
    const d = await get<{ deals: Deal[] }>(`/api/crm/deals?pipelineId=${id}`).catch(() => ({ deals: [] }));
    setDeals(d.deals || []);
  }, [get]);
  useEffect(() => { if (pipeline) void load(pipeline.id); }, [pipeline, load]);

  async function createPipeline() {
    setCreating(true);
    try {
      const d = await api<{ pipeline: Pipeline }>("/api/crm/pipelines", industry ? { industrySlug: industry } : { name: c.empty.defaultPipelineName });
      await x.loadPipelines();
      setPipelineId(d.pipeline.id);
    } catch (e) { if ((e as Error).message) toast.error((e as Error).message); } finally { setCreating(false); }
  }
  async function move(deal: Deal, stageId: string) {
    if (deal.stageId === stageId) return;
    // Optimistic, like the classic board; reverted on failure.
    setDeals((prev) => prev?.map((d) => (d.id === deal.id ? { ...d, stageId } : d)) ?? prev);
    try { await api(`/api/crm/deals/${deal.id}/move`, { stageId }); } catch { if (pipeline) void load(pipeline.id); }
  }

  if (!pipelines?.length)
    return (
      <section className="panel crm-start">
        <p>{c.empty.noPipeline}</p>
        <div className="domain-toolbar">
          <select aria-label={c.empty.createPipeline} value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((slug) => <option key={slug} value={slug}>{c.industries[slug || "generic"]}</option>)}
          </select>
          <Button variant="primary" disabled={creating} onClick={createPipeline}><Icon name="Plus" size={16} />{c.empty.createPipeline}</Button>
        </div>
      </section>
    );
  const open = (deals ?? []).filter((d) => d.status === "open");
  const won = (deals ?? []).filter((d) => d.status === "won");
  const filtered = (deals ?? []).filter((d) => (d.title + " " + (d.contact?.name ?? "")).toLowerCase().includes(query.trim().toLowerCase()));
  const dealOpen = deals?.find((d) => d.id === dealId) ?? null;
  return (
    <>
      <div className="stats-grid">
        {[
          [fa ? "ارزش کل قیف" : "Pipeline value", compactAmount(open.reduce((sum, d) => sum + d.value, 0), lang)],
          [fa ? "فروش قطعی" : "Won revenue", compactAmount(won.reduce((sum, d) => sum + d.value, 0), lang)],
          [c.analytics.totalDeals, n(deals?.length ?? 0)],
        ].map(([label, value]) => (
          <div className="panel stat" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="domain-toolbar">
        <input aria-label={t("search")} placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        {pipelines.length > 1 && (
          <select aria-label={s("Pipeline: ")} value={pipeline?.id} onChange={(e) => setPipelineId(e.target.value)}>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{localizedName(p, lang)}</option>)}
          </select>
        )}
        <a className="btn" href="/api/crm/export?type=deals" download>{c.board.exportCsv}</a>
        <Button variant="primary" onClick={() => setNewDeal(true)}><Icon name="Plus" size={16} />{c.board.newDeal}</Button>
      </div>
      {pipelines.length === 1 && pipeline && <h2 className="crm-pipeline-name">{localizedName(pipeline, lang)}</h2>}
      {!deals ? <Loading /> : (
        <div className="crm-pipeline" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(205px, 1fr))` }} tabIndex={0} role="region" aria-label={c.tabs.board}>
          {stages.map((stage) => {
            const list = filtered.filter((d) => d.stageId === stage.id);
            const total = list.reduce((sum, d) => sum + d.value, 0);
            return (
              <section className="panel" key={stage.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("dealId"); const deal = deals.find((d) => d.id === id); if (deal) void move(deal, stage.id); }}>
                <h3>
                  <span>{stage.isWon && <Icon name="CheckCircle2" size={14} />}{stage.isLost && <Icon name="Circle" size={14} />} {localizedName(stage, lang)}</span>
                  <span className="badge">{n(list.length)}</span>
                </h3>
                {total > 0 && <p className="crm-stage-total">{compactAmount(total, lang)} {c.board.currency}</p>}
                {list.map((d) => (
                  <article draggable onDragStart={(e) => e.dataTransfer.setData("dealId", d.id)} className="domain-card" key={d.id}>
                    <button className="text-link" onClick={() => setDealId(d.id)}>{d.title}</button>
                    <p>{d.contact?.name}</p>
                    {d.value > 0 && <strong>{compactAmount(d.value, lang)}</strong>}
                    <select aria-label={s("Stage") + " " + d.title} value={d.stageId} onChange={(e) => move(d, e.target.value)}>
                      {stages.map((st) => <option key={st.id} value={st.id}>{localizedName(st, lang)}</option>)}
                    </select>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
      {newDeal && pipeline && <NewDealModal pipeline={pipeline} onClose={() => setNewDeal(false)} onCreated={() => { setNewDeal(false); void load(pipeline.id); }} />}
      {dealId && <DealDetailModal key={dealId} deal={dealOpen} dealId={dealId} onClose={() => setDealId(null)} onChanged={() => pipeline && load(pipeline.id)} />}
    </>
  );
}

function NewDealModal({ pipeline, onClose, onCreated }: { pipeline: Pipeline; onClose: () => void; onCreated: () => void }) {
  const { c, s, lang, api, contacts } = useCrm();
  const stages = [...pipeline.stages].sort((a, b) => a.order - b.order);
  const [f, setF] = useState({ contactId: "", title: "", value: "", stageId: stages[0]?.id ?? "", expectedCloseDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!f.contactId || !f.title.trim()) { setError(c.newDealModal.errorRequired); return; }
    setSaving(true); setError("");
    try {
      await api("/api/crm/deals", { contactId: f.contactId, pipelineId: pipeline.id, stageId: f.stageId, title: f.title.trim(), value: Number(f.value) || 0, expectedCloseDate: f.expectedCloseDate || undefined });
      onCreated();
    } catch (e) { setError((e as Error).message || c.newDealModal.errorGeneric); } finally { setSaving(false); }
  }
  return (
    <Modal title={c.newDealModal.title} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="domain-fields">
          <label>{c.newDealModal.selectContact}
            <select value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}>
              <option value="">{c.newDealModal.selectContact}</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
          <label>{c.newDealModal.titlePlaceholder}<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={c.newDealModal.titlePlaceholder} /></label>
          <label>{c.newDealModal.valuePlaceholder}<input type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={c.newDealModal.valuePlaceholder} /></label>
          <label>{s("Stage")}
            <select value={f.stageId} onChange={(e) => setF({ ...f, stageId: e.target.value })}>
              {stages.map((st) => <option key={st.id} value={st.id}>{localizedName(st, lang)}</option>)}
            </select>
          </label>
          <label>{c.newDealModal.expectedCloseDateLabel}<input type="date" value={f.expectedCloseDate} onChange={(e) => setF({ ...f, expectedCloseDate: e.target.value })} /></label>
        </div>
        <FormError text={error} />
        <Button type="submit" variant="primary" disabled={saving}><Icon name="Plus" size={16} />{c.newDealModal.submit}</Button>
      </form>
    </Modal>
  );
}

function DealDetailModal({ dealId, deal, onClose, onChanged }: { dealId: string; deal: Deal | null; onClose: () => void; onChanged: () => void }) {
  const { c, s, lang, api, get, pipelines, team, access } = useCrm();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState(deal?.ownerId || "");
  const [commission, setCommission] = useState({ rate: deal?.commissionRate != null ? String(deal.commissionRate) : "", amount: deal?.commissionAmount != null ? String(deal.commissionAmount) : "", status: deal?.commissionPaymentStatus || "unpaid" });
  const [savingCommission, setSavingCommission] = useState(false);
  const load = useCallback(async () => {
    const d = await get<{ activities: Activity[] }>(`/api/crm/activities?dealId=${dealId}`).catch(() => ({ activities: [] }));
    setActivities(d.activities || []);
  }, [dealId, get]);
  useEffect(() => { void load(); }, [load]);
  const pipeline = pipelines?.find((p) => p.id === deal?.pipelineId);
  const stage = pipeline?.stages.find((st) => st.id === deal?.stageId);
  async function addActivity() {
    if (!note.trim()) return;
    setSaving(true);
    try { await api("/api/crm/activities", { dealId, type: "note", content: note.trim() }); setNote(""); await load(); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  async function assign(id: string) {
    setOwnerId(id);
    try { await api(`/api/crm/deals/${dealId}`, { ownerId: id || null }, "PUT"); onChanged(); } catch (e) { toast.error((e as Error).message); }
  }
  async function remove() {
    try { await api(`/api/crm/deals/${dealId}`, undefined, "DELETE"); onChanged(); onClose(); } catch (e) { toast.error((e as Error).message); }
  }
  async function saveCommission() {
    setSavingCommission(true);
    try {
      await api(`/api/crm/deals/${dealId}`, { commissionRate: commission.rate ? Number(commission.rate) : null, commissionAmount: commission.amount ? Number(commission.amount) : null, commissionPaymentStatus: commission.status }, "PUT");
      onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setSavingCommission(false); }
  }
  return (
    <Modal title={deal?.title || c.dealDetail.fallbackTitle} onClose={onClose}>
      {deal && (
        <dl className="domain-detail">
          {[
            [s("Value: "), fmtMoney(deal.value)],
            [s("Stage: "), stage ? localizedName(stage, lang) : "—"],
            [s("Pipeline: "), pipeline ? localizedName(pipeline, lang) : "—"],
            [s("Status: "), deal.status],
            [s("Contact: "), deal.contact.name + (deal.contact.phone ? ` — ${deal.contact.phone}` : "")],
            ...(deal.expectedCloseDate ? [[s("Expected close: "), toJalali(deal.expectedCloseDate)]] : []),
          ].map(([a, b]) => <div key={a}><dt>{a.replace(/:\s*$/, "")}</dt><dd>{b}</dd></div>)}
        </dl>
      )}
      {deal && access["crm.contractCommission"] && (
        <section className="crm-subsection">
          <h3>{s("Contract & Commission")}</h3>
          {deal.wonAt && <p className="fine-print">{s("Deal date: ")}{toJalali(deal.wonAt)}</p>}
          <div className="domain-fields">
            <label>{s("Commission %")}<input type="number" step="0.1" value={commission.rate} onChange={(e) => setCommission({ ...commission, rate: e.target.value })} /></label>
            <label>{s("Commission amount (Toman)")}<input type="number" value={commission.amount} onChange={(e) => setCommission({ ...commission, amount: e.target.value })} /></label>
            <label>{s("Status: ").replace(/:\s*$/, "")}
              <select value={commission.status} onChange={(e) => setCommission({ ...commission, status: e.target.value })}>
                <option value="unpaid">{s("Unpaid")}</option>
                <option value="partial">{s("Partially paid")}</option>
                <option value="paid">{s("Paid")}</option>
              </select>
            </label>
          </div>
          <Button variant="primary" disabled={savingCommission} onClick={saveCommission}>{s("Save commission")}</Button>
        </section>
      )}
      {team.length > 0 && (
        <label className="crm-field">{c.common.assignToTeam}
          <select value={ownerId} onChange={(e) => assign(e.target.value)}>
            <option value="">{c.common.unassigned}</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      )}
      <section className="crm-subsection">
        <h3>{c.contactDetail.activity}</h3>
        <ActivityList items={activities} empty={c.contactDetail.noActivity} />
        <label className="crm-field">{c.dealDetail.notePlaceholder}<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="domain-actions">
          <Button variant="primary" disabled={saving} onClick={addActivity}>{c.dealDetail.logActivity}</Button>
          <Button onClick={remove}><Icon name="Trash2" size={15} />{c.common.delete}</Button>
        </div>
      </section>
    </Modal>
  );
}

function ActivityList({ items, empty }: { items: Activity[]; empty: string }) {
  if (!items.length) return <p className="fine-print">{empty}</p>;
  return (
    <ul className="crm-activity">
      {items.map((a) => <li key={a.id}><Icon name="Clock" size={13} /><span>{a.content}</span></li>)}
    </ul>
  );
}

// ── Contacts ───────────────────────────────────────────────────────────────
function ContactsView() {
  const x = useCrm();
  const { c, s, contacts, access, api } = x;
  const { fa, t, n } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [remove, setRemove] = useState<Contact | null>(null);
  const [removeError, setRemoveError] = useState("");
  const statuses = Array.from(new Set(contacts.map((ct) => ct.status)));
  const q = query.trim().toLowerCase();
  const filtered = contacts.filter((ct) => (!status || ct.status === status) && (!q || ct.name.toLowerCase().includes(q) || (ct.phone || "").includes(q) || (ct.email || "").toLowerCase().includes(q) || (ct.company || "").toLowerCase().includes(q)));
  async function confirmRemove() {
    if (!remove) return;
    try { await api(`/api/crm/contacts/${remove.id}`, undefined, "DELETE"); setRemove(null); await x.loadContacts(); } catch (e) { setRemoveError((e as Error).message); }
  }
  return (
    <>
      <div className="domain-toolbar">
        <input aria-label={s("Search (name, phone, email, or company)")} placeholder={s("Search (name, phone, email, or company)")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label={s("All statuses")} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{s("All statuses")}</option>
          {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
        <a className="btn" href="/api/crm/export?type=contacts" download>{c.contacts.exportCsv}</a>
        <Button variant="primary" onClick={() => setCreating(true)}><Icon name="Plus" size={16} />{c.contacts.newContact}</Button>
      </div>
      {!contacts.length ? <EmptyText text={c.empty.noContacts} /> : !filtered.length ? <EmptyText text={s("No contacts match your search")} /> : (
        <div className="panel domain-table-wrap">
          <table className="domain-table">
            <thead><tr>{[fa ? "نام" : "Name", fa ? "شرکت" : "Company", fa ? "تلفن" : "Phone", fa ? "ایمیل" : "Email", fa ? "عملیات" : "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((ct) => (
                <tr key={ct.id}>
                  <td data-label={fa ? "نام" : "Name"}>
                    <span className="crm-contact-name">{ct.name}</span>
                    <span className="crm-chips">
                      {access["crm.property"] && !!ct._count?.properties && <span className="badge">{s("Owner of {properties}", { properties: n(ct._count.properties) })}</span>}
                      {access["crm.property"] && !!ct._count?.propertyInterests && <span className="badge green">{s("Interested in {propertyInterests}", { propertyInterests: n(ct._count.propertyInterests) })}</span>}
                      <span className="badge">{ct.status}</span>
                    </span>
                  </td>
                  <td data-label={fa ? "شرکت" : "Company"}>{ct.company || "—"}</td>
                  <td data-label={fa ? "تلفن" : "Phone"} dir="ltr">{ct.phone || "—"}</td>
                  <td data-label={fa ? "ایمیل" : "Email"}>{ct.email || "—"}</td>
                  <td data-label={fa ? "عملیات" : "Actions"}>
                    <div className="domain-actions">
                      <Button onClick={() => x.setOpenContactId(ct.id)}>{fa ? "پرونده مخاطب" : "Contact details"}</Button>
                      <Button onClick={() => { setRemove(ct); setRemoveError(""); }}>{t("delete")}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <NewContactModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); void x.loadContacts(); }} />}
      {remove && (
        <Modal title={fa ? "حذف مخاطب" : "Delete contact"} onClose={() => setRemove(null)}>
          <p>{fa ? "مخاطب و پیگیری‌هایش حذف شوند؟" : "Delete this contact and its follow-ups?"}</p>
          <FormError text={removeError} />
          <Button onClick={confirmRemove}>{fa ? "تأیید حذف" : "Confirm deletion"}</Button>
        </Modal>
      )}
    </>
  );
}

function NewContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { c, s, api, get, access } = useCrm();
  const [f, setF] = useState({ name: "", phone: "", email: "", whatsapp: "", telegram: "", company: "", source: "manual" });
  const [role, setRole] = useState<"" | "owner" | "interested">("");
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (access["crm.property"] && role && !properties.length) get<{ properties: { id: string; title: string }[] }>("/api/crm/properties").then((d) => setProperties((d.properties || []).map((p) => ({ id: p.id, title: p.title })))).catch(() => {});
  }, [access, role, properties.length, get]);
  async function submit() {
    if (!f.name.trim()) { setError(c.newContactModal.errorNameRequired); return; }
    if (role && !propertyId) { setError(s("Select a property")); return; }
    setSaving(true); setError("");
    try {
      const data = await api<{ contact: Contact }>("/api/crm/contacts", { name: f.name.trim(), phone: f.phone || undefined, email: f.email || undefined, whatsapp: f.whatsapp || undefined, telegram: f.telegram || undefined, company: f.company || undefined, source: f.source });
      if (role === "owner") await api(`/api/crm/properties/${propertyId}`, { crmContactId: data.contact.id }, "PATCH");
      else if (role === "interested") await api(`/api/crm/properties/${propertyId}/interests`, { contactId: data.contact.id });
      onCreated();
    } catch (e) { setError((e as Error).message || c.newContactModal.errorGeneric); } finally { setSaving(false); }
  }
  const field = (key: keyof typeof f, label: string, type = "text") => (
    <label>{label}<input type={type} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} placeholder={label} dir={type === "tel" ? "ltr" : undefined} /></label>
  );
  return (
    <Modal title={c.newContactModal.title} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="domain-fields">
          {field("name", c.newContactModal.namePlaceholder)}
          {field("phone", c.newContactModal.phonePlaceholder, "tel")}
          {field("email", c.newContactModal.emailPlaceholder, "email")}
          {field("whatsapp", c.newContactModal.whatsappPlaceholder)}
          {field("telegram", c.newContactModal.telegramPlaceholder)}
          {field("company", c.newContactModal.companyPlaceholder)}
          <label>{c.newContactModal.sourceLabel}
            <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              {Object.entries(c.leadSources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {access["crm.property"] && (
            <label>{s("Property relation (optional)")}
              <select value={role} onChange={(e) => { setRole(e.target.value as typeof role); setPropertyId(""); }}>
                <option value="">{s("No relation")}</option>
                <option value="owner">{s("Property owner")}</option>
                <option value="interested">{s("Interested buyer/tenant")}</option>
              </select>
            </label>
          )}
          {access["crm.property"] && role && (
            <label>{s("Select property...")}
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">{s("Select property...")}</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          )}
        </div>
        <FormError text={error} />
        <Button type="submit" variant="primary" disabled={saving}><Icon name="Plus" size={16} />{c.newContactModal.submit}</Button>
      </form>
    </Modal>
  );
}

type ContactTab = "profile" | "deals" | "tasks" | "activity" | "notesFiles";
function ContactDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { c, s, lang, api, get, team } = useCrm();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [tab, setTab] = useState<ContactTab>("profile");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", whatsapp: "", telegram: "", company: "" });
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const load = useCallback(async () => {
    const d = await get<{ contact: ContactDetail }>(`/api/crm/contacts/${id}`).catch(() => null);
    if (!d?.contact) return;
    setContact(d.contact);
    setForm({ name: d.contact.name, phone: d.contact.phone || "", email: d.contact.email || "", whatsapp: d.contact.whatsapp || "", telegram: d.contact.telegram || "", company: d.contact.company || "" });
  }, [id, get]);
  useEffect(() => { void load(); }, [load]);
  const act = async (work: () => Promise<unknown>) => { try { await work(); await load(); } catch (e) { if ((e as Error).message) toast.error((e as Error).message); } };
  if (!contact) return <Modal title={c.contactDetail.profile} onClose={onClose}><Loading /></Modal>;
  const logActivity = (type: string, content: string) => act(() => api("/api/crm/activities", { contactId: contact.id, type, content }));
  function sendWhatsapp() {
    if (!contact?.whatsapp) return;
    const digits = contact.whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const text = (whatsapp ?? "").trim();
    window.open(`https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`, "_blank", "noopener,noreferrer");
    void logActivity("whatsapp", c.contactDetail.whatsappActivityLog + (text ? `: ${text}` : ""));
    setWhatsapp(null);
  }
  function openTelegram() {
    if (!contact?.telegram) return;
    window.open(`https://t.me/${encodeURIComponent(contact.telegram.replace(/^@/, ""))}`, "_blank", "noopener,noreferrer");
    void logActivity("telegram", c.contactDetail.telegramActivityLog);
  }
  async function call() {
    setCalling(true);
    try { await api("/api/crm/voice-call", { contactId: contact!.id }); await load(); } catch (e) { toast.error((e as Error).message || s("Failed to start call")); } finally { setCalling(false); }
  }
  const tabs: [ContactTab, string][] = [["profile", c.contactDetail.profile], ["deals", c.contactDetail.deals], ["tasks", c.contactDetail.tasks], ["activity", c.contactDetail.activity], ["notesFiles", c.contactDetail.notesFiles]];
  const fields: [keyof typeof form, string][] = [["name", s("Name")], ["phone", s("Phone")], ["email", s("Email")], ["whatsapp", "WhatsApp"], ["telegram", "Telegram"], ["company", s("Company")]];
  return (
    <Modal title={contact.name} onClose={onClose}>
      <div className="crm-contact-meta">
        {contact.phone && <span dir="ltr"><Icon name="Phone" size={13} />{contact.phone}</span>}
        {contact.email && <span><Icon name="Mail" size={13} />{contact.email}</span>}
        {contact.whatsapp && <span dir="ltr"><Icon name="MessageCircle" size={13} />{contact.whatsapp}</span>}
        {contact.telegram && <span dir="ltr"><Icon name="Send" size={13} />{contact.telegram}</span>}
        {contact.company && <span><Icon name="Building2" size={13} />{contact.company}</span>}
      </div>
      <div className="domain-actions crm-contact-actions">
        {contact.phone && <Button disabled={calling} onClick={call}><Icon name="PhoneCall" size={15} />{c.contactDetail.callViaVoiceAgent}</Button>}
        {contact.whatsapp && <Button onClick={() => setWhatsapp(whatsapp === null ? "" : null)}><Icon name="MessageCircle" size={15} />{c.contactDetail.sendWhatsapp}</Button>}
        {contact.telegram && <Button onClick={openTelegram}><Icon name="Send" size={15} />{c.contactDetail.openTelegram}</Button>}
      </div>
      {whatsapp !== null && contact.whatsapp && (
        <div className="domain-toolbar">
          <input aria-label={c.contactDetail.whatsappMessagePlaceholder} placeholder={c.contactDetail.whatsappMessagePlaceholder} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <Button variant="primary" onClick={sendWhatsapp}>{c.contactDetail.sendWhatsapp}</Button>
        </div>
      )}
      <div className="chips">
        {tabs.map(([key, label]) => <button key={key} className={tab === key ? "selected" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      {tab === "profile" && (
        <>
          {editing ? (
            <div className="domain-fields">
              {fields.map(([key, label]) => <label key={key}>{label}<input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
            </div>
          ) : (
            <dl className="domain-detail">
              {fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{contact[key] || "—"}</dd></div>)}
            </dl>
          )}
          <div className="domain-actions">
            {editing ? (
              <>
                <Button variant="primary" onClick={() => act(async () => { await api(`/api/crm/contacts/${contact.id}`, form, "PUT"); setEditing(false); })}>{c.contactDetail.save}</Button>
                <Button onClick={() => { setEditing(false); setForm({ name: contact.name, phone: contact.phone || "", email: contact.email || "", whatsapp: contact.whatsapp || "", telegram: contact.telegram || "", company: contact.company || "" }); }}>{c.contactDetail.cancel}</Button>
              </>
            ) : <Button onClick={() => setEditing(true)}>{c.contactDetail.edit}</Button>}
          </div>
          {team.length > 0 && (
            <label className="crm-field">{c.common.assignToTeam}
              <select value={contact.assignedToId || ""} onChange={(e) => act(() => api(`/api/crm/contacts/${contact.id}`, { assignedToId: e.target.value || null }, "PUT"))}>
                <option value="">{c.common.unassigned}</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          )}
        </>
      )}
      {tab === "deals" && (contact.deals.length ? contact.deals.map((d) => <article className="domain-card row-between" key={d.id}><strong>{d.title}</strong><span className="badge">{d.status}</span></article>) : <p className="fine-print">{c.contactDetail.noActivity}</p>)}
      {tab === "tasks" && (
        <>
          {contact.tasks.map((tk) => (
            <div className="crm-task" key={tk.id}>
              <label className="toggle-row">
                <span>
                  <strong className={tk.status === "done" ? "is-done" : ""}>{tk.title}</strong>
                  {tk.status === "done" && tk.completedAt && <small>{new Date(tk.completedAt).toLocaleString(lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</small>}
                </span>
                <input type="checkbox" checked={tk.status === "done"} onChange={() => act(() => api("/api/crm/tasks", { id: tk.id, status: tk.status === "done" ? "pending" : "done" }, "PUT"))} />
              </label>
              {/* An AI-drafted follow-up, only ever copied — never sent automatically. */}
              {tk.draftMessage && (
                <div className="crm-draft">
                  <p>{tk.draftMessage}</p>
                  <Button onClick={() => { void navigator.clipboard.writeText(tk.draftMessage!); toast.success(s("Copied")); }}>{s("Copy message")}</Button>
                </div>
              )}
            </div>
          ))}
          <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); if (taskTitle.trim()) void act(async () => { await api("/api/crm/tasks", { contactId: contact.id, title: taskTitle.trim() }); setTaskTitle(""); }); }}>
            <input aria-label={c.contactDetail.newTaskPlaceholder} placeholder={c.contactDetail.newTaskPlaceholder} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <Button type="submit" variant="primary" label={c.contactDetail.newTaskPlaceholder}><Icon name="Plus" size={16} /></Button>
          </form>
        </>
      )}
      {tab === "activity" && (
        <>
          <ActivityList items={contact.activities} empty={c.contactDetail.noActivity} />
          <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); if (note.trim()) void act(async () => { await api("/api/crm/activities", { contactId: contact.id, type: "note", content: note.trim() }); setNote(""); }); }}>
            <input aria-label={c.contactDetail.newNotePlaceholder} placeholder={c.contactDetail.newNotePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" variant="primary" label={c.contactDetail.newNotePlaceholder}><Icon name="Plus" size={16} /></Button>
          </form>
        </>
      )}
      {tab === "notesFiles" && (
        <>
          <PinnedNotes contactId={contact.id} />
          <Documents contactId={contact.id} />
        </>
      )}
    </Modal>
  );
}

function PinnedNotes({ contactId }: { contactId: string }) {
  const { c, api, get } = useCrm();
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [text, setText] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ notes: CrmNote[] }>(`/api/crm/notes?contactId=${contactId}`).catch(() => ({ notes: [] }));
    setNotes(d.notes || []);
  }, [contactId, get]);
  useEffect(() => { void load(); }, [load]);
  const act = async (work: () => Promise<unknown>) => { try { await work(); await load(); } catch (e) { toast.error((e as Error).message); } };
  return (
    <section className="crm-subsection">
      <h3>{c.notes.title}</h3>
      {!notes.length ? <p className="fine-print">{c.notes.empty}</p> : notes.map((note) => (
        <div className="crm-note" key={note.id}>
          <Button label={c.notes.title} className={note.isPinned ? "is-pinned" : ""} onClick={() => act(() => api(`/api/crm/notes/${note.id}`, { isPinned: !note.isPinned }, "PUT"))}><Icon name="Pin" size={14} /></Button>
          <span>{note.content}</span>
          <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/notes?id=${note.id}`, undefined, "DELETE"))}><Icon name="Trash2" size={14} /></Button>
        </div>
      ))}
      <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void act(async () => { await api("/api/crm/notes", { contactId, content: text.trim() }); setText(""); }); }}>
        <input aria-label={c.notes.placeholder} placeholder={c.notes.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" variant="primary" label={c.notes.placeholder}><Icon name="Plus" size={16} /></Button>
      </form>
    </section>
  );
}

function Documents({ contactId }: { contactId: string }) {
  const { c, api, get } = useCrm();
  const [docs, setDocs] = useState<CrmDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ documents: CrmDocument[] }>(`/api/crm/documents?contactId=${contactId}`).catch(() => ({ documents: [] }));
    setDocs(d.documents || []);
  }, [contactId, get]);
  useEffect(() => { void load(); }, [load]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("contactId", contactId); form.append("name", file.name);
      await api("/api/crm/documents", form);
      await load();
    } catch (err) { setError((err as Error).message || c.documents.errorGeneric); } finally { setUploading(false); e.target.value = ""; }
  }
  return (
    <section className="crm-subsection">
      <h3>{c.documents.title}</h3>
      {!docs.length ? <p className="fine-print">{c.documents.empty}</p> : docs.map((d) => (
        <div className="crm-note" key={d.id}>
          <a href={`/api/crm/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer"><Icon name="FileText" size={14} />{d.name}</a>
          <Button label={c.common.delete} onClick={async () => { try { await api("/api/crm/documents", { id: d.id }, "DELETE"); await load(); } catch (err) { toast.error((err as Error).message); } }}><Icon name="Trash2" size={14} /></Button>
        </div>
      ))}
      <FormError text={error} />
      <label className="btn crm-upload">
        <Icon name="Upload" size={15} />{uploading ? c.documents.uploading : c.documents.upload}
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={upload} disabled={uploading} hidden />
      </label>
    </section>
  );
}

// ── Follow-ups calendar ────────────────────────────────────────────────────
type CalendarItem = { id: string; date: string; label: string; type: "task" | "deal" | "viewing"; who?: string | null; taskId?: string };
function CalendarView() {
  const { c, s, lang, api, get, contacts } = useCrm();
  const { fa } = useApp();
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [form, setForm] = useState({ title: "", contactId: "", dueDate: "" });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [taskData, dealData, viewingData] = await Promise.all([
      get<{ tasks: Task[] }>("/api/crm/tasks?status=pending").catch(() => ({ tasks: [] })),
      get<{ deals: Deal[] }>("/api/crm/deals?status=open").catch(() => ({ deals: [] })),
      // 403 when the viewing scheduler is not enabled — no viewings to show.
      fetch("/api/crm/viewings?status=scheduled").then((r) => (r.ok ? r.json() : { viewings: [] })).catch(() => ({ viewings: [] })) as Promise<{ viewings: ViewingRow[] }>,
    ]);
    const time = (iso: string) => new Date(iso).toLocaleTimeString(lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US", { hour: "2-digit", minute: "2-digit" });
    setItems([
      ...(taskData.tasks || []).filter((t) => t.dueDate).map((t) => ({ id: `task-${t.id}`, taskId: t.id, date: t.dueDate as string, label: t.title, type: "task" as const })),
      ...(dealData.deals || []).filter((d) => d.expectedCloseDate).map((d) => ({ id: `deal-${d.id}`, date: d.expectedCloseDate as string, label: `${d.title} — ${d.contact?.name || ""}`, type: "deal" as const })),
      ...(viewingData.viewings || []).map((v) => ({ id: `viewing-${v.id}`, date: v.scheduledAt, label: `${s("Viewing")}: ${v.property.title}${v.contact ? ` — ${v.contact.name}` : ""} · ${time(v.scheduledAt)}`, type: "viewing" as const, who: v.assignedTo?.name ?? null })),
    ].sort((a, b) => a.date.localeCompare(b.date)));
  }, [get, lang, s]);
  useEffect(() => { void load(); }, [load]);
  async function add() {
    setError("");
    try {
      await api("/api/crm/tasks", { contactId: form.contactId || undefined, title: form.title.trim(), dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined });
      setForm({ title: "", contactId: form.contactId, dueDate: "" });
      await load();
    } catch (e) { setError((e as Error).message); }
  }
  async function done(taskId: string) {
    try { await api("/api/crm/tasks", { id: taskId, status: "done" }, "PUT"); await load(); } catch (e) { toast.error((e as Error).message); }
  }
  const dayLabel = (day: string) => lang === "fa" ? toJalali(day) : new Date(day).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of items ?? []) grouped.set(item.date.slice(0, 10), [...(grouped.get(item.date.slice(0, 10)) || []), item]);
  return (
    <div className="panel">
      <form onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <div className="domain-fields">
          <label>{fa ? "موضوع پیگیری" : "Follow-up"}<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>{fa ? "مخاطب" : "Contact"}
            <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
              <option value="">{fa ? "انتخاب کنید" : "Select"}</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
          <label>{fa ? "موعد" : "Due date"}<input type="datetime-local" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        </div>
        <FormError text={error} />
        <Button type="submit" variant="primary" disabled={!contacts.length}>{fa ? "افزودن پیگیری" : "Add follow-up"}</Button>
      </form>
      {!items ? <Loading /> : !items.length ? <EmptyText text={c.calendar.empty} /> : [...grouped.entries()].map(([day, list]) => (
        <section className="crm-day" key={day}>
          <h3>{dayLabel(day)}</h3>
          {list.map((item) => item.type === "task" ? (
            <label className="toggle-row" key={item.id}>
              <span><strong>{item.label}</strong></span>
              <input type="checkbox" checked={false} onChange={() => done(item.taskId!)} />
            </label>
          ) : (
            <div className="toggle-row" key={item.id}>
              <span><Icon name={item.type === "viewing" ? "CalendarDays" : "BriefcaseBusiness"} size={15} /> <strong>{item.label}</strong></span>
              {item.who && <span className="badge">{item.who}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
function AnalyticsView() {
  const x = useCrm();
  const { c, lang, get, pipelines, contacts } = x;
  const { n } = useApp();
  const [sub, setSub] = useState<"pipeline" | "calls">("pipeline");
  const [pipelineId, setPipelineId] = useState(pipelines?.[0]?.id ?? "");
  const [deals, setDeals] = useState<Deal[] | null>(null);
  useEffect(() => {
    if (!pipelineId) { setDeals([]); return; }
    setDeals(null);
    get<{ deals: Deal[] }>(`/api/crm/deals?pipelineId=${pipelineId}`).then((d) => setDeals(d.deals || [])).catch(() => setDeals([]));
  }, [pipelineId, get]);
  const pipeline = pipelines?.find((p) => p.id === pipelineId) ?? null;
  const sources = LEAD_SOURCES.map((value) => {
    const rows = contacts.filter((ct) => ct.source === value);
    const converted = rows.filter((ct) => ct.status === "customer").length;
    return { value, total: rows.length, converted, rate: rows.length ? Math.round((converted / rows.length) * 100) : 0 };
  }).filter((row) => row.total > 0);
  const toggle = (
    <div className="chips">
      <button className={sub === "pipeline" ? "selected" : ""} onClick={() => setSub("pipeline")}>{c.analytics.pipelineSubTab}</button>
      <button className={sub === "calls" ? "selected" : ""} onClick={() => setSub("calls")}>{c.analytics.callsSubTab}</button>
    </div>
  );
  if (sub === "calls") return <>{toggle}<VoiceCalls /></>;
  if (!pipelines?.length) return <>{toggle}<EmptyText text={c.analytics.noPipeline} /></>;
  const stages = [...(pipeline?.stages ?? [])].sort((a, b) => a.order - b.order);
  const total = deals?.length ?? 0;
  const won = deals?.filter((d) => d.status === "won").length ?? 0;
  return (
    <>
      {toggle}
      {pipelines.length > 1 && (
        <div className="domain-toolbar">
          <select aria-label={c.analytics.pipelineSubTab} value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{localizedName(p, lang)}</option>)}
          </select>
        </div>
      )}
      {!deals ? <Loading /> : (
        <>
          <div className="stats-grid">
            <div className="panel stat"><span>{c.analytics.totalDeals}</span><strong>{n(total)}</strong></div>
            <div className="panel stat"><span>{c.analytics.overallConversion}</span><strong>{n(total ? Math.round((won / total) * 100) : 0)}%</strong></div>
          </div>
          <section className="panel">
            <h3>{c.analytics.funnelTitle}</h3>
            {stages.map((st) => {
              const list = deals.filter((d) => d.stageId === st.id);
              return (
                <div className="domain-card" key={st.id}>
                  <div className="row-between"><span>{localizedName(st, lang)}</span><strong>{n(list.length)} · {compactAmount(list.reduce((sum, d) => sum + d.value, 0), lang)}</strong></div>
                  <progress max={Math.max(total, 1)} value={list.length} />
                </div>
              );
            })}
          </section>
          {sources.length > 0 && (
            <section className="panel">
              <h3>{c.analytics.sourcePerfTitle}</h3>
              {sources.map((row) => (
                <div className="domain-card row-between" key={row.value}>
                  <span>{c.leadSources[row.value]}</span>
                  <span>{n(row.total)} {c.analytics.leads} · {n(row.converted)} {c.analytics.customers} · <b>{n(row.rate)}%</b></span>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

function VoiceCalls() {
  const x = useCrm();
  const { c, lang, get } = x;
  const { n } = useApp();
  const tv = c.voiceAnalytics;
  const [data, setData] = useState<VoiceAnalytics | null | undefined>(undefined);
  useEffect(() => { get<VoiceAnalytics>("/api/crm/voice-analytics").then(setData).catch(() => setData(null)); }, [get]);
  if (data === undefined) return <Loading />;
  if (!data || data.totalCalls === 0) return <EmptyText text={tv.empty} />;
  const max = Math.max(1, ...data.callsPerDay.map((d) => d.count));
  return (
    <>
      <div className="stats-grid">
        {[[tv.totalCalls, n(data.totalCalls)], [tv.totalMinutes, n(Math.round(data.totalDurationSec / 60))], [tv.avgDuration, fmtDuration(data.avgDurationSec)], [tv.successRate, `${n(data.successRate)}%`]].map(([label, value]) => (
          <div className="panel stat" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <section className="panel">
        <h3>{tv.trendTitle}</h3>
        <div className="crm-call-bars">{data.callsPerDay.map((d) => <span key={d.date} title={`${d.date}: ${d.count}`} style={{ height: `${Math.max(2, (d.count / max) * 80)}px`, opacity: d.count === 0 ? 0.2 : 0.85 }} />)}</div>
      </section>
      <div className="crm-two">
        <section className="panel"><h3>{tv.byStatusTitle}</h3>{data.byStatus.map((row) => <div className="domain-card row-between" key={row.status}><span>{tv.status[row.status] || row.status}</span><b>{n(row.count)}</b></div>)}</section>
        <section className="panel"><h3>{tv.byOutcomeTitle}</h3>{data.byOutcome.map((row) => <div className="domain-card row-between" key={row.outcome}><span>{tv.outcome[row.outcome] || row.outcome}</span><b>{n(row.count)}</b></div>)}</section>
      </div>
      <section className="panel">
        <h3>{tv.recentCallsTitle}</h3>
        {data.recentCalls.map((call) => (
          <article className="domain-card row-between" key={call.id}>
            <div>
              <strong>{call.contactName || call.callerPhone || tv.unknownCaller}</strong>
              <p className="fine-print">{call.callerPhone} · {new Date(call.createdAt).toLocaleString(dateLocale(lang))}</p>
            </div>
            <div className="domain-actions">
              <span className="badge">{tv.status[call.status] || call.status}</span>
              {call.outcome && <span className="badge">{tv.outcome[call.outcome] || call.outcome}</span>}
              <small>{call.durationSec != null ? fmtDuration(call.durationSec) : "—"}</small>
              {call.contactId && <Button onClick={() => x.setOpenContactId(call.contactId!)}>{tv.viewContact}</Button>}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

// ── Automation ─────────────────────────────────────────────────────────────
function AutomationView() {
  const { c, api, get } = useCrm();
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("3");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ rules: AutomationRule[] }>("/api/crm/automation-rules").catch(() => ({ rules: [] }));
    setRules(d.rules || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (!name.trim()) { setError(c.automation.errorNameRequired); return; }
    setSaving(true); setError("");
    try {
      await api("/api/crm/automation-rules", { name: name.trim(), trigger: "stale_deal", condition: { days: Number(days) || 3 }, action: "create_task" });
      setEditing(false); setName("");
      await load();
    } catch (e) { setError((e as Error).message || c.automation.errorGeneric); } finally { setSaving(false); }
  }
  const act = async (work: () => Promise<unknown>) => { try { await work(); await load(); } catch (e) { toast.error((e as Error).message); } };
  return (
    <section className="panel">
      <p className="fine-print">{c.automation.description}</p>
      <div className="domain-toolbar"><Button variant="primary" onClick={() => setEditing(true)}><Icon name="Plus" size={16} />{c.automation.newRule}</Button></div>
      {!rules ? <Loading /> : !rules.length ? <Empty /> : rules.map((r) => {
        let ruleDays = 3;
        try { ruleDays = JSON.parse(r.condition || "{}").days || 3; } catch { /* ignore */ }
        return (
          <article className="domain-card row-between" key={r.id}>
            <div>
              <h3>{r.name}</h3>
              <p>{c.automation.ruleSummaryPrefix} {ruleDays} {c.automation.ruleSummarySuffix}</p>
            </div>
            <div className="domain-actions">
              <Button className={r.isActive ? "is-active" : ""} onClick={() => act(() => api(`/api/crm/automation-rules/${r.id}`, { isActive: !r.isActive }, "PUT"))}>{r.isActive ? c.automation.active : c.automation.inactive}</Button>
              <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/automation-rules/${r.id}`, undefined, "DELETE"))}><Icon name="Trash2" size={15} /></Button>
            </div>
          </article>
        );
      })}
      {editing && (
        <Modal title={c.automation.newRule} onClose={() => setEditing(false)}>
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="domain-fields">
              <label>{c.automation.newRule}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={c.automation.namePlaceholder} /></label>
              <label>{c.automation.conditionPrefix} … {c.automation.conditionSuffix}<input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></label>
            </div>
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{c.automation.createRule}</Button>
          </form>
        </Modal>
      )}
    </section>
  );
}

// ── CRM agent ──────────────────────────────────────────────────────────────
function AgentView() {
  const { c, s, lang, get } = useCrm();
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [insights, setInsights] = useState<{ id: string; category: string; text: string }[] | null>(null);
  const [runs, setRuns] = useState<{ id: string; content: string; createdAt: string }[] | null>(null);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const load = useCallback(() => {
    get<{ insights: { id: string; category: string; text: string }[] }>("/api/crm/agent/insights").then((d) => setInsights(d.insights || [])).catch(() => setInsights([]));
    get<{ runs: { id: string; content: string; createdAt: string }[] }>("/api/crm/agent/runs").then((d) => setRuns(d.runs || [])).catch(() => setRuns([]));
  }, [get]);
  useEffect(() => { load(); }, [load]);
  async function run() {
    setRunning(true); setAnalysis("");
    try {
      const res = await fetch("/api/crm/agent/run", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error) toast.error(d.error);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.slice(6) === "[DONE]") continue;
          try { const evt = JSON.parse(line.slice(6)); if (evt.text) setAnalysis((p) => p + evt.text); } catch { /* malformed chunk */ }
        }
      }
    } finally { setRunning(false); load(); }
  }
  return (
    <>
      <section className="panel row-between crm-agent">
        <p>{c.agent.description}</p>
        <Button variant="primary" disabled={running} onClick={run}><Icon name="Sparkles" size={16} />{c.agent.analyzeButton} <CreditCost feature="crm.agent-run" /></Button>
      </section>
      {/* The agent's "notes for future runs" section is internal memory, never shown. */}
      {analysis && <section className="panel crm-markdown"><ReactMarkdown>{analysis.split(/## نکاتی برای حافظهٔ آینده/)[0].trim()}</ReactMarkdown></section>}
      <section className="panel">
        <h3>{s("Analysis history")}</h3>
        {!runs ? <Loading /> : !runs.length ? <p className="fine-print">{s("No analysis saved yet")}</p> : runs.map((r) => (
          <div key={r.id} className="crm-run">
            <button className="row-between" onClick={() => setOpenRun(openRun === r.id ? null : r.id)} aria-expanded={openRun === r.id}>
              <span><Icon name="CalendarDays" size={14} /> {new Date(r.createdAt).toLocaleString(lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              <Icon name={openRun === r.id ? "ChevronUp" : "ChevronDown"} size={14} />
            </button>
            {openRun === r.id && <div className="crm-markdown"><ReactMarkdown>{r.content}</ReactMarkdown></div>}
          </div>
        ))}
      </section>
      <section className="panel">
        <h3>{c.agent.savedNotesTitle}</h3>
        {!insights ? <Loading /> : !insights.length ? <p className="fine-print">{c.agent.noAnalysis}</p> : insights.map((i) => (
          <div className="crm-note" key={i.id}><span className="badge">{i.category}</span><span>{i.text}</span></div>
        ))}
      </section>
    </>
  );
}
