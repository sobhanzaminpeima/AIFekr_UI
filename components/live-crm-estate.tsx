"use client";
// The CRM's real-estate tabs in the design (crm-workspace.tsx and
// business-utilities.tsx) on the real CRM: properties, owners, viewings, buyer
// matching and the team performance report — only for accounts with the
// real-estate modules, as on the classic CRM page.
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  CURRENCIES, defaultCurrencyForLang, fmtMoney, fmtPrice, isoDate,
  type BuyerMatchRow, type Contact, type OwnerRow, type PerformanceRow, type PropertyRow, type ViewingRow,
} from "@/lib/crm";
import { Button, Icon, Modal } from "./ui";
import { CreditCost, EmptyText, FormError, Loading, useCrm } from "./live-crm-context";
import { downscale } from "./live-media";

const act = async (work: () => Promise<unknown>, after?: () => unknown) => {
  try { await work(); await after?.(); } catch (e) { if ((e as Error).message) toast.error((e as Error).message); }
};
const LISTING_TYPES = ["buy", "sell", "rent", "short_term_rent"];
const PROPERTY_TYPES = ["apartment", "villa", "land", "commercial"];
const PROPERTY_STATUSES = ["available", "pending", "sold", "rented"];

// ── Country → city picker (seeded reference tables; writes the plain city name) ──
type GeoCountry = { id: string; name: string; nameFa: string | null; nameDe: string | null; emoji: string | null };
type GeoCity = { id: string; name: string; nameFa: string | null; nameDe: string | null };
const countriesCache: Partial<Record<string, Promise<GeoCountry[]>>> = {};
let pickerSeq = 0;
function CountryCityPicker({ city, onCity }: { city: string; onCity: (city: string) => void }) {
  const { s, lang } = useCrm();
  const [id] = useState(() => ++pickerSeq);
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [countryId, setCountryId] = useState("");
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    countriesCache[lang] ??= fetch(`/api/geo/countries?lang=${lang}`).then((r) => r.json()).then((d) => d.countries || []);
    void countriesCache[lang]!.then(setCountries);
  }, [lang]);
  useEffect(() => {
    if (!countryId) { setCities([]); return; }
    setLoading(true);
    fetch(`/api/geo/cities?countryId=${countryId}`).then((r) => r.json()).then((d) => setCities(d.cities || [])).finally(() => setLoading(false));
  }, [countryId]);
  const name = (x: { name: string; nameFa: string | null; nameDe: string | null }) => (lang === "fa" ? x.nameFa || x.name : lang === "de" ? x.nameDe || x.name : x.name);
  const countryLabel = (x: GeoCountry) => `${x.emoji ? x.emoji + " " : ""}${name(x)}`;
  return (
    <>
      <label>{s("Search country...")}
        <input list={`geo-countries-${id}`} value={query} placeholder={s("Search country...")} onChange={(e) => {
          setQuery(e.target.value);
          const match = countries.find((x) => countryLabel(x) === e.target.value);
          if (match) { setCountryId(match.id); onCity(""); } else if (countryId) { setCountryId(""); onCity(""); }
        }} />
        <datalist id={`geo-countries-${id}`}>{countries.map((x) => <option key={x.id} value={countryLabel(x)} />)}</datalist>
      </label>
      <label>{s("City")}
        <input list={`geo-cities-${id}`} value={city} disabled={!countryId} onChange={(e) => onCity(e.target.value)}
          placeholder={!countryId ? s("Select a country first") : loading ? s("Loading...") : s("Search city...")} />
        <datalist id={`geo-cities-${id}`}>{cities.map((x) => <option key={x.id} value={name(x)} />)}</datalist>
      </label>
    </>
  );
}

function QuickAddOwner({ onClose, onCreated }: { onClose: () => void; onCreated: (contact: Contact) => void }) {
  const { s, api } = useCrm();
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!f.name.trim()) { setError(s("Name is required")); return; }
    setSaving(true); setError("");
    try {
      const d = await api<{ contact: Contact }>("/api/crm/contacts", { name: f.name.trim(), phone: f.phone || undefined, email: f.email || undefined, source: "manual" });
      onCreated(d.contact);
    } catch (e) { setError((e as Error).message || s("Error")); } finally { setSaving(false); }
  }
  return (
    <Modal title={s("Add new owner")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="domain-fields">
          <label>{s("Name")}<input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label>{s("Phone (optional)")}<input dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label>{s("Email (optional)")}<input dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        </div>
        <FormError text={error} />
        <Button type="submit" variant="primary" disabled={saving}>{s("Add owner")}</Button>
      </form>
    </Modal>
  );
}

const priceOf = (p: PropertyRow, s: (en: string) => string, unit = "/night") =>
  p.listingType === "short_term_rent" ? (p.nightlyPrice ? `${fmtPrice(p.nightlyPrice, p.currency)} ${s(unit)}` : "—") : fmtPrice(p.price, p.currency);

// ── Properties ─────────────────────────────────────────────────────────────
const NEW_PROPERTY = { title: "", listingType: "sell", propertyType: "apartment", price: "", nightlyPrice: "", currency: "", bookingLink: "", address: "", city: "", bedrooms: "", bathrooms: "", areaSqm: "", description: "", ownerContactId: "", rentalOwnerContactId: "" };
const MAX_COMPARE = 3;

export function PropertiesView() {
  const x = useCrm();
  const { s, L, lang, api, get, access, contacts } = x;
  const [properties, setProperties] = useState<PropertyRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ ...NEW_PROPERTY, currency: defaultCurrencyForLang(lang) });
  const [extraOwners, setExtraOwners] = useState<Contact[]>([]);
  const [quickAdd, setQuickAdd] = useState<"owner" | "rentalOwner" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<{ createdCount: number; totalRows: number; errors: { row: number; error: string }[] } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selected, setSelected] = useState<PropertyRow | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [docsId, setDocsId] = useState<string | null>(null);
  const owners = [...contacts, ...extraOwners];
  const load = useCallback(async () => {
    const d = await get<{ properties: PropertyRow[] }>("/api/crm/properties").catch(() => ({ properties: [] }));
    setProperties(d.properties || []);
    return d.properties || [];
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  // Opened from the Owners tab: show that property's detail once the list is here.
  useEffect(() => {
    const id = sessionStorage.getItem("aifekr-crm-open-property");
    if (!id || !properties) return;
    sessionStorage.removeItem("aifekr-crm-open-property");
    const match = properties.find((p) => p.id === id);
    if (match) setSelected(match);
  }, [properties]);
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImported(null);
    try {
      const form = new FormData();
      form.append("file", file);
      setImported(await api("/api/crm/properties/import", form));
      await load();
    } catch (err) {
      setImported({ createdCount: 0, totalRows: 0, errors: [{ row: 0, error: (err as Error).message || s("Failed to import file") }] });
    } finally { setImporting(false); if (importRef.current) importRef.current.value = ""; }
  }
  async function create() {
    if (!f.title.trim()) { setError(s("Property title is required")); return; }
    if (!f.address.trim()) { setError(s("Address is required")); return; }
    setSaving(true); setError("");
    try {
      const d = await api<{ bookingLinkWarning?: string }>("/api/crm/properties", {
        title: f.title.trim(), listingType: f.listingType, propertyType: f.propertyType, address: f.address.trim(), city: f.city.trim() || undefined,
        price: f.listingType !== "short_term_rent" ? f.price : undefined,
        nightlyPrice: f.listingType === "short_term_rent" ? f.nightlyPrice : undefined,
        currency: f.currency, bookingLink: f.bookingLink.trim() || undefined,
        bedrooms: f.bedrooms || undefined, bathrooms: f.bathrooms || undefined, areaSqm: f.areaSqm || undefined,
        description: f.description.trim() || undefined,
        crmContactId: f.ownerContactId || undefined,
        ownerContactId: f.listingType === "short_term_rent" ? (f.rentalOwnerContactId || undefined) : undefined,
      });
      if (d.bookingLinkWarning) toast.warning(d.bookingLinkWarning);
      setCreating(false);
      setF({ ...NEW_PROPERTY, currency: defaultCurrencyForLang(lang) });
      await load();
    } catch (e) { setError((e as Error).message || s("Failed to save property")); } finally { setSaving(false); }
  }
  if (!properties) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = properties.filter((p) => (!typeFilter || p.listingType === typeFilter) && (!statusFilter || p.status === statusFilter) && (!q || p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q)));
  const field = (key: keyof typeof f, label: string, type = "text", dir?: "ltr") => <label>{label}<input type={type} dir={dir} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></label>;
  return (
    <>
      <div className="domain-toolbar">
        {properties.length > 0 && <input aria-label={s("Search (title or address)")} placeholder={s("Search (title or address)")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        {properties.length > 0 && (
          <>
            <select aria-label={s("All types")} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">{s("All types")}</option>
              {LISTING_TYPES.map((v) => <option key={v} value={v}>{L("PROPERTY_LISTING_TYPE_LABEL", v)}</option>)}
            </select>
            <select aria-label={s("All statuses")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{s("All statuses")}</option>
              {PROPERTY_STATUSES.map((v) => <option key={v} value={v}>{L("PROPERTY_STATUS_LABEL", v)}</option>)}
            </select>
          </>
        )}
        <a className="btn" href="/api/crm/properties/import/template" download><Icon name="FileDown" size={15} />{s("Download sample template")}</a>
        <Button disabled={importing} onClick={() => importRef.current?.click()}><Icon name="Upload" size={15} />{s("Import from file")}</Button>
        <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={importFile} />
        <Button variant="primary" onClick={() => setCreating(true)}><Icon name="Plus" size={16} />{s("New property")}</Button>
      </div>
      {imported && (
        <div className="panel crm-import" role="status">
          <div className="row-between">
            <strong>{s("{createdCount} of {totalRows} rows imported successfully", { createdCount: imported.createdCount, totalRows: imported.totalRows })}</strong>
            <Button label={s("Clear")} onClick={() => setImported(null)}><Icon name="X" size={14} /></Button>
          </div>
          {imported.errors.length > 0 && <ul>{imported.errors.slice(0, 20).map((e, i) => <li key={i}>{e.row > 0 ? s("Row {row}: ", { row: e.row }) : ""}{e.error}</li>)}</ul>}
        </div>
      )}
      {compare.length > 0 && (
        <div className="panel row-between crm-compare-bar">
          <span>{s("{length} selected for comparison", { length: compare.length })}</span>
          <div className="domain-actions">
            <Button onClick={() => setCompare([])}>{s("Clear")}</Button>
            <Button variant="primary" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>{s("Compare")}</Button>
          </div>
        </div>
      )}
      {!properties.length ? <EmptyText text={s("No properties yet")} /> : !filtered.length ? <EmptyText text={s("No properties match your search")} /> : (
        <section className="panel">
          {filtered.map((p) => (
            <article className="domain-card row-between" key={p.id}>
              <button className="crm-row-main" onClick={() => setSelected(p)}>
                <h3>{p.title} — {L("PROPERTY_LISTING_TYPE_LABEL", p.listingType)}{p.crmContact ? ` · ${p.crmContact.name}` : ""}</h3>
                <p>{p.address}{p.city ? `، ${p.city}` : ""} · {priceOf(p, s)}</p>
              </button>
              <div className="domain-actions">
                <label className="crm-check" title={s("Compare up to {MAX_COMPARE} properties", { MAX_COMPARE })}>
                  <input type="checkbox" checked={compare.includes(p.id)} disabled={!compare.includes(p.id) && compare.length >= MAX_COMPARE}
                    onChange={() => setCompare((prev) => (prev.includes(p.id) ? prev.filter((i) => i !== p.id) : prev.length >= MAX_COMPARE ? prev : [...prev, p.id]))} />
                  {s("Compare")}
                </label>
                <select aria-label={s("Status") + " " + p.title} value={p.status} onChange={(e) => act(() => api(`/api/crm/properties/${p.id}`, { status: e.target.value }, "PATCH"), load)}>
                  {PROPERTY_STATUSES.map((v) => <option key={v} value={v}>{L("PROPERTY_STATUS_LABEL", v)}</option>)}
                </select>
                {p.listingType === "short_term_rent" && access["crm.shortTermCalendar"] && <Button label={s("Occupancy calendar")} onClick={() => setCalendarId(p.id)}><Icon name="CalendarDays" size={15} /></Button>}
                {access["crm.propertyDocuments"] && <Button label={s("Property documents")} onClick={() => setDocsId(p.id)}><Icon name="FileText" size={15} /></Button>}
                <Button label={s("Copy public share link")} onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/p/${p.id}`); toast.success(s("Share link copied")); }}><Icon name="Share2" size={15} /></Button>
                <Button label={x.c.common.delete} onClick={() => act(() => api(`/api/crm/properties/${p.id}`, undefined, "DELETE"), async () => { setSelected(null); await load(); })}><Icon name="Trash2" size={15} /></Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {creating && (
        <Modal title={s("New property")} onClose={() => setCreating(false)}>
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="domain-fields">
              {field("title", s("Property title"))}
              <label>{s("Listing type")}
                <select value={f.listingType} onChange={(e) => setF({ ...f, listingType: e.target.value })}>
                  {LISTING_TYPES.map((v) => <option key={v} value={v}>{L("PROPERTY_LISTING_TYPE_LABEL", v)}</option>)}
                </select>
              </label>
              <label>{s("Property type: ").replace(/:\s*$/, "")}
                <select value={f.propertyType} onChange={(e) => setF({ ...f, propertyType: e.target.value })}>
                  {PROPERTY_TYPES.map((v) => <option key={v} value={v}>{L("PROPERTY_TYPE_LABEL", v)}</option>)}
                </select>
              </label>
              {field("address", s("Address"))}
              <CountryCityPicker city={f.city} onCity={(city) => setF((prev) => ({ ...prev, city }))} />
              {f.listingType === "short_term_rent" ? field("nightlyPrice", s("Price per night"), "number") : field("price", s("Total price"), "number")}
              <label>{s("Price")}
                <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                  {CURRENCIES.map((cur) => <option key={cur.value} value={cur.value}>{L("CURRENCY_OPTIONS", cur.value)}</option>)}
                </select>
              </label>
              {f.listingType === "short_term_rent" && field("bookingLink", s("Airbnb or booking platform link"), "text", "ltr")}
              {field("bedrooms", s("Bedrooms"), "number")}
              {field("bathrooms", s("Bathrooms"), "number")}
              {field("areaSqm", s("Area (sqm)"), "number")}
              <label>{s("Owner / contact")}
                <span className="crm-inline">
                  <select value={f.ownerContactId} onChange={(e) => setF({ ...f, ownerContactId: e.target.value })}>
                    <option value="">{s("No owner/contact set")}</option>
                    {owners.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                  <Button label={s("New owner")} onClick={() => setQuickAdd("owner")}><Icon name="Plus" size={15} /></Button>
                </span>
              </label>
              {f.listingType === "short_term_rent" && (
                <label>{s("Short-term rental owner (for owner statements)")}
                  <span className="crm-inline">
                    <select value={f.rentalOwnerContactId} onChange={(e) => setF({ ...f, rentalOwnerContactId: e.target.value })}>
                      <option value="">{s("No owner set")}</option>
                      {owners.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </select>
                    <Button label={s("New owner")} onClick={() => setQuickAdd("rentalOwner")}><Icon name="Plus" size={15} /></Button>
                  </span>
                </label>
              )}
            </div>
            <label className="crm-field">{s("Description")}<textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{s("Save property")}</Button>
          </form>
          {quickAdd && <QuickAddOwner onClose={() => setQuickAdd(null)} onCreated={(ct) => {
            setExtraOwners((prev) => [...prev, ct]);
            setF((prev) => (quickAdd === "owner" ? { ...prev, ownerContactId: ct.id } : { ...prev, rentalOwnerContactId: ct.id }));
            setQuickAdd(null);
          }} />}
        </Modal>
      )}
      {showCompare && <CompareModal chosen={compare.map((id) => properties.find((p) => p.id === id)).filter((p): p is PropertyRow => !!p)} onClose={() => setShowCompare(false)} />}
      {calendarId && <OccupancyCalendar propertyId={calendarId} onClose={() => setCalendarId(null)} />}
      {docsId && <PropertyDocs propertyId={docsId} onClose={() => setDocsId(null)} />}
      {selected && <PropertyDetail key={selected.id} property={selected} onClose={() => setSelected(null)} onChanged={async () => { const list = await load(); setSelected((cur) => (cur ? list.find((p) => p.id === cur.id) ?? null : null)); }} />}
    </>
  );
}

function CompareModal({ chosen, onClose }: { chosen: PropertyRow[]; onClose: () => void }) {
  const { s, L } = useCrm();
  const rows: [string, (p: PropertyRow) => React.ReactNode][] = [
    [s("Listing type"), (p) => L("PROPERTY_LISTING_TYPE_LABEL", p.listingType)],
    [s("Price"), (p) => priceOf(p, s, "/ night")],
    [s("Area"), (p) => (p.areaSqm ? `${p.areaSqm} ${s("sqm")}` : "—")],
    [s("Price per sqm"), (p) => (p.listingType !== "short_term_rent" && p.price && p.areaSqm ? fmtPrice(Math.round(p.price / p.areaSqm), p.currency) : "—")],
    [s("Bedrooms"), (p) => p.bedrooms ?? "—"],
    [s("Bathrooms"), (p) => p.bathrooms ?? "—"],
    [s("Location"), (p) => `${p.address}${p.city ? `، ${p.city}` : ""}`],
    [s("Status"), (p) => L("PROPERTY_STATUS_LABEL", p.status)],
    [s("Owner / contact"), (p) => p.crmContact?.name || "—"],
  ];
  return (
    <Modal title={s("Property comparison")} onClose={onClose}>
      <div className="domain-table-wrap">
        <table className="domain-table crm-compare">
          <thead><tr><th />{chosen.map((p) => <th key={p.id}>{p.title}</th>)}</tr></thead>
          <tbody>{rows.map(([label, cell]) => <tr key={label}><th scope="row">{label}</th>{chosen.map((p) => <td key={p.id}>{cell(p)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Modal>
  );
}

function OccupancyCalendar({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { s, api, get, contacts } = useCrm();
  type Booking = { id: string; checkIn: string; checkOut: string; guestName: string | null; status: string; contact: { id: string; name: string } | null };
  const [data, setData] = useState<{ bookings: Booking[]; bookingLink: string | null } | null>(null);
  const [f, setF] = useState({ checkIn: "", checkOut: "", guestName: "", contactId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ bookings: Booking[]; bookingLink: string | null }>(`/api/crm/properties/${propertyId}/bookings`).catch(() => ({ bookings: [], bookingLink: null }));
    setData({ bookings: d.bookings || [], bookingLink: d.bookingLink || null });
  }, [propertyId, get]);
  useEffect(() => { void load(); }, [load]);
  async function add() {
    if (!f.checkIn || !f.checkOut) { setError(s("Check-in and check-out are required")); return; }
    setSaving(true); setError("");
    try {
      await api(`/api/crm/properties/${propertyId}/bookings`, { checkIn: f.checkIn, checkOut: f.checkOut, guestName: f.guestName.trim() || undefined, contactId: f.contactId || undefined });
      setF({ checkIn: "", checkOut: "", guestName: "", contactId: "" });
      await load();
    } catch (e) { setError((e as Error).message || s("Failed to save booking")); } finally { setSaving(false); }
  }
  const confirmed = data?.bookings.filter((b) => b.status === "confirmed") ?? [];
  return (
    <Modal title={s("Occupancy calendar")} onClose={onClose}>
      {data?.bookingLink && <p className="fine-print">{s("Booking platform link (manual check — no instant auto-sync available): ")}<a href={data.bookingLink} target="_blank" rel="noopener noreferrer">{data.bookingLink}</a></p>}
      <form onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <div className="domain-fields">
          <label>{s("Check-in")}<input type="date" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></label>
          <label>{s("Check-out")}<input type="date" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></label>
          <label>{s("Guest name (optional)")}<input value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} /></label>
          <label>{s("No linked contact")}
            <select value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}>
              <option value="">{s("No linked contact")}</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
        </div>
        <FormError text={error} />
        <Button type="submit" variant="primary" disabled={saving}>{s("Add booking")}</Button>
      </form>
      {!data ? <Loading /> : !confirmed.length ? <p className="fine-print">{s("No bookings yet")}</p> : confirmed.map((b) => (
        <article className="domain-card row-between" key={b.id}>
          <span dir="ltr">{b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)}{b.guestName ? ` · ${b.guestName}` : b.contact ? ` · ${b.contact.name}` : ""}</span>
          <Button onClick={() => act(() => api(`/api/crm/bookings/${b.id}`, { status: "cancelled" }, "PATCH"), load)}>{s("Cancel")}</Button>
        </article>
      ))}
    </Modal>
  );
}

const DOC_TYPES = ["title_deed", "power_of_attorney", "floor_plan", "photo", "attachment"];
function PropertyDocs({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { s, L, api, get, c } = useCrm();
  const [docs, setDocs] = useState<{ id: string; name: string; type: string }[] | null>(null);
  const [type, setType] = useState("title_deed");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const d = await get<{ documents: { id: string; name: string; type: string }[] }>(`/api/crm/documents?propertyId=${propertyId}`).catch(() => ({ documents: [] }));
    setDocs(d.documents || []);
  }, [propertyId, get]);
  useEffect(() => { void load(); }, [load]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("propertyId", propertyId); form.append("type", type); form.append("name", file.name);
      await api("/api/crm/documents", form);
      await load();
    } catch (err) { setError((err as Error).message || s("Upload failed")); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  return (
    <Modal title={s("Property documents")} onClose={onClose}>
      <div className="domain-fields">
        <label>{s("Property documents")}
          <select value={type} onChange={(e) => setType(e.target.value)}>{DOC_TYPES.map((v) => <option key={v} value={v}>{L("DOC_TYPE_LABEL", v)}</option>)}</select>
        </label>
        <label>{s("PDF, image, Word, or Excel — max 15MB")}<input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" disabled={uploading} onChange={upload} /></label>
      </div>
      <FormError text={error} />
      {!docs ? <Loading /> : !docs.length ? <p className="fine-print">{s("No documents uploaded yet")}</p> : docs.map((d) => (
        <article className="domain-card row-between" key={d.id}>
          <a href={`/api/crm/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer"><Icon name="FileText" size={14} /> {d.name} — {L("DOC_TYPE_LABEL", d.type)}</a>
          <Button label={c.common.delete} onClick={() => act(() => api("/api/crm/documents", { id: d.id }, "DELETE"), load)}><Icon name="Trash2" size={14} /></Button>
        </article>
      ))}
    </Modal>
  );
}

type Interest = { contactId: string; note: string | null; contact: { id: string; name: string; phone: string | null; email: string | null } };
function PropertyDetail({ property, onClose, onChanged }: { property: PropertyRow; onClose: () => void; onChanged: () => Promise<void> }) {
  const { s, L, api, get, access, contacts, c } = useCrm();
  const shortTerm = property.listingType === "short_term_rent";
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: property.title, price: shortTerm ? "" : String(property.price), nightlyPrice: property.nightlyPrice != null ? String(property.nightlyPrice) : "", currency: property.currency,
    bookingLink: property.bookingLink || "", address: property.address, city: property.city || "",
    bedrooms: property.bedrooms != null ? String(property.bedrooms) : "", bathrooms: property.bathrooms != null ? String(property.bathrooms) : "", areaSqm: property.areaSqm != null ? String(property.areaSqm) : "", description: property.description || "",
  });
  const [owner, setOwner] = useState(property.crmContact?.id || "");
  const [rentalOwner, setRentalOwner] = useState(property.ownerContactId || "");
  const [newOwner, setNewOwner] = useState<{ name: string; phone: string } | null>(null);
  const [images, setImages] = useState<string[]>(() => { try { return property.images ? JSON.parse(property.images) : []; } catch { return []; } });
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const [interests, setInterests] = useState<Interest[] | null>(null);
  const [interestForm, setInterestForm] = useState<{ contactId: string; name: string; phone: string; note: string } | null>(null);
  const [platform, setPlatform] = useState<"instagram" | "divar" | "website">("instagram");
  const [copy, setCopy] = useState<{ content: string; hashtags?: string[] } | null>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [advice, setAdvice] = useState<{ priceRangeLow: number; priceRangeHigh: number; reasoning: string; dataLimitation: string; comparablesUsed: number } | null>(null);
  const [advising, setAdvising] = useState(false);
  useEffect(() => { get<{ interests: Interest[] }>(`/api/crm/properties/${property.id}/interests`).then((d) => setInterests(d.interests || [])).catch(() => setInterests([])); }, [property.id, get]);

  async function saveEdit() {
    setSaving(true); setError("");
    try {
      const d = await api<{ bookingLinkWarning?: string }>(`/api/crm/properties/${property.id}`, {
        title: form.title.trim(), price: !shortTerm ? form.price : undefined, nightlyPrice: shortTerm ? form.nightlyPrice : undefined,
        currency: form.currency, bookingLink: form.bookingLink.trim() || null, address: form.address.trim(), city: form.city.trim() || null,
        bedrooms: form.bedrooms || null, bathrooms: form.bathrooms || null, areaSqm: form.areaSqm || null, description: form.description.trim() || null,
      }, "PATCH");
      if (d.bookingLinkWarning) toast.warning(d.bookingLinkWarning);
      setEditing(false);
      await onChanged();
    } catch (e) { setError((e as Error).message || s("Failed to save")); } finally { setSaving(false); }
  }
  async function changeOwner(id: string, key: "crmContactId" | "ownerContactId") {
    if (key === "crmContactId") setOwner(id); else setRentalOwner(id);
    await act(() => api(`/api/crm/properties/${property.id}`, { [key]: id || null }, "PATCH"), onChanged);
  }
  async function createOwner() {
    if (!newOwner?.name.trim()) return;
    try {
      const d = await api<{ contact: Contact }>("/api/crm/contacts", { name: newOwner.name.trim(), phone: newOwner.phone.trim() || undefined, status: "customer" });
      await changeOwner(d.contact.id, "crmContactId");
      setNewOwner(null);
    } catch (e) { setError((e as Error).message || s("Failed to create owner")); }
  }
  async function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", await downscale(file));
      const d = await api<{ images: string[] }>(`/api/crm/properties/${property.id}/images`, fd);
      setImages(d.images || []);
    } catch (err) { setError((err as Error).message || s("Failed to upload photo")); } finally { setUploadingImage(false); if (imageRef.current) imageRef.current.value = ""; }
  }
  async function registerInterest() {
    if (!interestForm) return;
    try {
      const d = await api<{ interest: Interest }>(`/api/crm/properties/${property.id}/interests`, interestForm.contactId
        ? { contactId: interestForm.contactId, note: interestForm.note.trim() || undefined }
        : { name: interestForm.name.trim(), phone: interestForm.phone.trim() || undefined, note: interestForm.note.trim() || undefined });
      setInterests((prev) => [d.interest, ...(prev ?? []).filter((i) => i.contactId !== d.interest.contactId)]);
      setInterestForm(null);
    } catch (e) { setError((e as Error).message || s("Failed to register customer")); }
  }
  async function generateCopy() {
    setCopying(true); setCopy(null);
    try { setCopy(await get(`/api/crm/properties/${property.id}/listing-copy?platform=${platform}`)); } catch (e) { toast.error((e as Error).message || s("Failed to generate listing copy")); } finally { setCopying(false); }
  }
  async function generateAdvice() {
    setAdvising(true); setAdvice(null);
    try { setAdvice(await get(`/api/crm/properties/${property.id}/pricing-advice`)); } catch (e) { toast.error((e as Error).message || s("Failed to generate pricing advice")); } finally { setAdvising(false); }
  }
  const details = [
    property.bedrooms != null ? s("{bedrooms} bed", { bedrooms: property.bedrooms }) : null,
    property.bathrooms != null ? s("{bathrooms} bath", { bathrooms: property.bathrooms }) : null,
    property.areaSqm != null ? s("{areaSqm} sqm", { areaSqm: property.areaSqm }) : null,
  ].filter(Boolean).join(" · ");
  return (
    <Modal title={property.title} onClose={onClose}>
      <div className="row-between">
        <span className="badge">{L("PROPERTY_STATUS_LABEL", property.status)}</span>
        <Button onClick={() => setEditing((v) => !v)}>{editing ? s("Cancel") : s("Edit")}</Button>
      </div>
      <section className="crm-subsection">
        <h3>{s("Property photos")}</h3>
        <div className="crm-photos">
          {images.map((url) => (
            <span className="crm-photo" key={url}>
              <img src={url} alt="" />
              <button aria-label={c.common.delete} onClick={() => act(async () => { const d = await api<{ images: string[] }>(`/api/crm/properties/${property.id}/images`, { url }, "DELETE"); setImages(d.images || []); })}>×</button>
            </span>
          ))}
          <label className="crm-photo crm-photo-add" aria-label={s("Property photos")}>
            <Icon name={uploadingImage ? "Loader2" : "Upload"} size={16} />
            <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploadingImage} onChange={addImage} />
          </label>
        </div>
        <p className="fine-print">{s("JPEG, PNG, or WebP — max 8MB")}</p>
      </section>
      <FormError text={error} />
      {editing ? (
        <>
          <div className="domain-fields">
            <label>{s("Title")}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            {shortTerm
              ? <label>{s("Price per night")}<input type="number" value={form.nightlyPrice} onChange={(e) => setForm({ ...form, nightlyPrice: e.target.value })} /></label>
              : <label>{s("Total price")}<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>}
            <label>{s("Price")}
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((cur) => <option key={cur.value} value={cur.value}>{L("CURRENCY_OPTIONS", cur.value)}</option>)}
              </select>
            </label>
            {shortTerm && <label>{s("Airbnb or booking platform link")}<input dir="ltr" value={form.bookingLink} onChange={(e) => setForm({ ...form, bookingLink: e.target.value })} /></label>}
            <label>{s("Address")}<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <CountryCityPicker city={form.city} onCity={(city) => setForm((prev) => ({ ...prev, city }))} />
            <label>{s("Bedrooms")}<input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></label>
            <label>{s("Bathrooms")}<input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></label>
            <label>{s("Area (sqm)")}<input type="number" value={form.areaSqm} onChange={(e) => setForm({ ...form, areaSqm: e.target.value })} /></label>
          </div>
          <label className="crm-field">{s("Description")}<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <Button variant="primary" disabled={saving} onClick={saveEdit}>{s("Save changes")}</Button>
        </>
      ) : (
        <dl className="domain-detail">
          {([
            [s("Deal type: "), L("PROPERTY_LISTING_TYPE_LABEL", property.listingType)],
            [s("Property type: "), L("PROPERTY_TYPE_LABEL", property.propertyType)],
            [s("Price: "), shortTerm ? (property.nightlyPrice ? `${fmtPrice(property.nightlyPrice, property.currency)} / ${s("night")}` : "—") : fmtPrice(property.price, property.currency)],
            ...(shortTerm && property.bookingLink ? [[s("Booking link: "), property.bookingLink]] : []),
            [s("Address: "), property.address + (property.city ? `، ${property.city}` : "")],
            ...(details ? [[s("Details: "), details]] : []),
            ...(property.description ? [[s("Description: "), property.description]] : []),
          ] as [string, string][]).map(([a, b]) => <div key={a}><dt>{a.replace(/:\s*$/, "")}</dt><dd>{b.startsWith("http") ? <a href={b} target="_blank" rel="noopener noreferrer">{b}</a> : b}</dd></div>)}
        </dl>
      )}
      <section className="crm-subsection">
        <h3>{s("Owner")}</h3>
        {newOwner ? (
          <>
            <div className="domain-fields">
              <label>{s("Owner name")}<input value={newOwner.name} onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })} /></label>
              <label>{s("Phone (optional)")}<input dir="ltr" value={newOwner.phone} onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })} /></label>
            </div>
            <div className="domain-actions">
              <Button variant="primary" disabled={!newOwner.name.trim()} onClick={createOwner}>{s("Create & assign owner")}</Button>
              <Button onClick={() => setNewOwner(null)}>{s("Cancel")}</Button>
            </div>
          </>
        ) : (
          <div className="crm-inline">
            <select aria-label={s("Owner")} value={owner} onChange={(e) => changeOwner(e.target.value, "crmContactId")}>
              <option value="">{s("No owner")}</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
            <Button onClick={() => setNewOwner({ name: "", phone: "" })}>{s("+ New owner")}</Button>
          </div>
        )}
      </section>
      {shortTerm && (
        <section className="crm-subsection">
          <h3>{s("Short-term rental owner (for owner statements)")}</h3>
          <select aria-label={s("Short-term rental owner (for owner statements)")} value={rentalOwner} onChange={(e) => changeOwner(e.target.value, "ownerContactId")}>
            <option value="">{s("No owner set")}</option>
            {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
          </select>
        </section>
      )}
      <section className="crm-subsection">
        <div className="row-between">
          <h3>{s("Customers interested in this property")}</h3>
          <Button onClick={() => setInterestForm(interestForm ? null : { contactId: "", name: "", phone: "", note: "" })}>{s("+ Register customer")}</Button>
        </div>
        {interestForm && (
          <>
            <div className="domain-fields">
              <label>{s("New customer (enter name below)")}
                <select value={interestForm.contactId} onChange={(e) => setInterestForm({ ...interestForm, contactId: e.target.value })}>
                  <option value="">{s("New customer (enter name below)")}</option>
                  {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </label>
              {!interestForm.contactId && (
                <>
                  <label>{s("Customer name")}<input value={interestForm.name} onChange={(e) => setInterestForm({ ...interestForm, name: e.target.value })} /></label>
                  <label>{s("Phone (optional)")}<input dir="ltr" value={interestForm.phone} onChange={(e) => setInterestForm({ ...interestForm, phone: e.target.value })} /></label>
                </>
              )}
              <label>{s("Note (optional)")}<input value={interestForm.note} onChange={(e) => setInterestForm({ ...interestForm, note: e.target.value })} /></label>
            </div>
            <div className="domain-actions">
              <Button variant="primary" disabled={!interestForm.contactId && !interestForm.name.trim()} onClick={registerInterest}>{s("Register")}</Button>
              <Button onClick={() => setInterestForm(null)}>{s("Cancel")}</Button>
            </div>
          </>
        )}
        {!interests ? <Loading /> : !interests.length ? <p className="fine-print">{s("No customers registered yet")}</p> : interests.map((i) => (
          <article className="domain-card row-between" key={i.contactId}>
            <div><strong>{i.contact.name}</strong>{i.contact.phone && <span dir="ltr"> · {i.contact.phone}</span>}{i.note && <p>{i.note}</p>}</div>
            <Button label={c.common.delete} onClick={() => act(async () => { await api(`/api/crm/properties/${property.id}/interests`, { contactId: i.contactId }, "DELETE"); setInterests((prev) => (prev ?? []).filter((x) => x.contactId !== i.contactId)); })}><Icon name="Trash2" size={14} /></Button>
          </article>
        ))}
      </section>
      {/* AI only drafts listing copy here; nothing is published automatically. */}
      {access["agent.listingCopywriter"] && (
        <section className="crm-subsection">
          <h3>{s("Listing copy (multi-platform)")}</h3>
          <div className="chips">
            {(["instagram", "divar", "website"] as const).map((p) => <button key={p} className={platform === p ? "selected" : ""} onClick={() => { setPlatform(p); setCopy(null); }}>{p === "instagram" ? "Instagram" : p === "divar" ? "دیوار" : s("Website")}</button>)}
          </div>
          <Button variant="primary" disabled={copying} onClick={generateCopy}><Icon name="Sparkles" size={15} />{s("Generate")} <CreditCost feature="crm.listing-copy" /></Button>
          {copy && (
            <div className="crm-draft">
              <p>{copy.content}</p>
              {!!copy.hashtags?.length && <p dir="ltr">{copy.hashtags.join(" ")}</p>}
              <Button onClick={() => { void navigator.clipboard.writeText(copy.hashtags?.length ? `${copy.content}\n\n${copy.hashtags.join(" ")}` : copy.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? s("Copied") : s("Copy text")}</Button>
            </div>
          )}
        </section>
      )}
      {/* A suggestion from internal CRM data only, never a decision; its limits are always shown. */}
      {access["agent.pricingAdvisor"] && (
        <section className="crm-subsection">
          <div className="row-between">
            <h3>{s("Pricing Advisor")}</h3>
            <Button variant="primary" disabled={advising} onClick={generateAdvice}><Icon name="Sparkles" size={15} />{s("Analyze price")} <CreditCost feature="crm.pricing-advice" /></Button>
          </div>
          {advice && (
            <div className="crm-draft">
              <p className="fine-print">{s("⚠️ Based only on internal CRM data — no live or external market access. This is a suggestion, not a final decision.")}</p>
              <strong>{fmtPrice(advice.priceRangeLow, property.currency)} – {fmtPrice(advice.priceRangeHigh, property.currency)}</strong>
              <p>{advice.reasoning}</p>
              <p className="fine-print">{s("Based on {comparablesUsed} comparable properties in your system.", { comparablesUsed: advice.comparablesUsed })}</p>
              {advice.dataLimitation && <p className="crm-warning">{advice.dataLimitation}</p>}
            </div>
          )}
        </section>
      )}
    </Modal>
  );
}

// ── Owners ─────────────────────────────────────────────────────────────────
export function OwnersView() {
  const { s, api, get } = useCrm();
  const [owners, setOwners] = useState<OwnerRow[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ representationStartDate: "", representationEndDate: "", agreedCommissionRate: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ owners: OwnerRow[] }>("/api/crm/owners").catch(() => ({ owners: [] }));
    setOwners(d.owners || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function save(propertyId: string) {
    setSaving(true);
    await act(() => api(`/api/crm/properties/${propertyId}`, { representationStartDate: form.representationStartDate || null, representationEndDate: form.representationEndDate || null, agreedCommissionRate: form.agreedCommissionRate ? Number(form.agreedCommissionRate) : null }, "PATCH"), async () => { setEditing(null); await load(); });
    setSaving(false);
  }
  function openProperty(id: string) {
    sessionStorage.setItem("aifekr-crm-open-property", id);
    window.location.assign("/crm?tab=properties");
  }
  if (!owners) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = owners.filter((o) => !q || o.name.toLowerCase().includes(q) || (o.phone || "").includes(q) || (o.email || "").toLowerCase().includes(q));
  return (
    <>
      {owners.length > 0 && <div className="domain-toolbar"><input aria-label={s("Search owners (name, phone, or email)")} placeholder={s("Search owners (name, phone, or email)")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
      {!owners.length ? <EmptyText text={s("No owners yet — link a contact as owner when creating a property")} /> : !filtered.length ? <EmptyText text={s("No owners match your search")} /> : (
        <section className="panel">
          {filtered.map((o) => (
            <article className="domain-card" key={o.id}>
              <button className="row-between crm-row-main" aria-expanded={expanded === o.id} onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                <span><strong>{o.name}</strong><small>{o.phone || o.email || "—"}</small></span>
                <span className="badge">{o.propertiesOwnedCount} {s("properties")}</span>
              </button>
              {expanded === o.id && o.properties.map((p) => (
                <div className="crm-subsection" key={p.id}>
                  <div className="row-between">
                    <button className="text-link" onClick={() => openProperty(p.id)}>{p.title} — {p.address}{p.city ? `${s(",")} ${p.city}` : ""}</button>
                    {editing !== p.id && <Button onClick={() => { setEditing(p.id); setForm({ representationStartDate: p.representationStartDate?.slice(0, 10) || "", representationEndDate: p.representationEndDate?.slice(0, 10) || "", agreedCommissionRate: p.agreedCommissionRate != null ? String(p.agreedCommissionRate) : "" }); }}>{s("Edit terms")}</Button>}
                  </div>
                  {editing === p.id ? (
                    <>
                      <div className="domain-fields">
                        <label>{s("Start date")}<input type="date" value={form.representationStartDate} onChange={(e) => setForm({ ...form, representationStartDate: e.target.value })} /></label>
                        <label>{s("End date")}<input type="date" value={form.representationEndDate} onChange={(e) => setForm({ ...form, representationEndDate: e.target.value })} /></label>
                        <label>{s("Commission %")}<input type="number" step="0.1" value={form.agreedCommissionRate} onChange={(e) => setForm({ ...form, agreedCommissionRate: e.target.value })} /></label>
                      </div>
                      <div className="domain-actions">
                        <Button variant="primary" disabled={saving} onClick={() => save(p.id)}>{s("Save")}</Button>
                        <Button onClick={() => setEditing(null)}>{s("Cancel")}</Button>
                      </div>
                    </>
                  ) : (
                    <p className="fine-print">
                      {s("Agreement period:")} <span dir="ltr">{p.representationStartDate ? p.representationStartDate.slice(0, 10) : "—"} → {p.representationEndDate ? p.representationEndDate.slice(0, 10) : "—"}</span>
                      {" · "}{s("Commission:")} {p.agreedCommissionRate != null ? `${p.agreedCommissionRate}%` : "—"}
                    </p>
                  )}
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </>
  );
}

// ── Viewings ───────────────────────────────────────────────────────────────
const VIEWING_STATUSES = ["scheduled", "completed", "cancelled", "no_show"];
export function ViewingsView() {
  const { s, L, lang, api, get, access, contacts, team, c } = useCrm();
  const coordinator = !!access["agent.viewingCoordinator"];
  const [viewings, setViewings] = useState<ViewingRow[] | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [needsFeedback, setNeedsFeedback] = useState<unknown[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ propertyId: "", contactId: "", assignedToId: "", scheduledAt: "", autoSlot: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ viewing: ViewingRow; text: string; rating: string } | null>(null);
  const load = useCallback(async () => {
    const [v, p] = await Promise.all([
      get<{ viewings: ViewingRow[] }>("/api/crm/viewings").catch(() => ({ viewings: [] })),
      get<{ properties: PropertyRow[] }>("/api/crm/properties").catch(() => ({ properties: [] })),
    ]);
    setViewings(v.viewings || []);
    setProperties(p.properties || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!coordinator) return;
    get<{ viewings: unknown[] }>("/api/crm/viewings/needs-feedback").then((d) => setNeedsFeedback(d.viewings || [])).catch(() => {});
  }, [coordinator, viewings, get]);
  async function create() {
    if (!f.propertyId) { setError(s("Property is required")); return; }
    if (!f.scheduledAt) { setError(s("Viewing time is required")); return; }
    setSaving(true); setError("");
    try {
      const d = await api<{ autoRescheduled?: boolean; viewing: ViewingRow }>("/api/crm/viewings", {
        propertyId: f.propertyId, contactId: f.contactId || undefined, assignedToId: f.assignedToId || undefined, scheduledAt: f.scheduledAt,
        autoSlot: coordinator && !!f.assignedToId && f.autoSlot,
      });
      if (d.autoRescheduled) toast.info(s("The requested time was busy — booked at the nearest free slot ({time}) instead.", { time: new Date(d.viewing.scheduledAt).toLocaleString(lang === "fa" ? "fa-IR" : undefined) }), { duration: 10000 });
      setCreating(false);
      setF({ propertyId: "", contactId: "", assignedToId: "", scheduledAt: "", autoSlot: true });
      await load();
    } catch (e) { setError((e as Error).message || s("Failed to book viewing")); } finally { setSaving(false); }
  }
  if (!viewings) return <Loading />;
  return (
    <>
      {/* A reminder only — the customer is never messaged automatically. */}
      {coordinator && needsFeedback.length > 0 && <div className="panel crm-warning">{s("{length} past viewings still need feedback logged", { length: needsFeedback.length })}</div>}
      <div className="domain-toolbar"><Button variant="primary" onClick={() => setCreating(true)}><Icon name="Plus" size={16} />{s("New viewing")}</Button></div>
      {!viewings.length ? <EmptyText text={s("No viewings yet")} /> : (
        <section className="panel">
          {viewings.map((v) => (
            <article className="domain-card row-between" key={v.id}>
              <div>
                <h3>{v.property.title} — {v.property.address}</h3>
                <p>{new Date(v.scheduledAt).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}{v.contact ? ` · ${v.contact.name}` : ""}{v.assignedTo ? ` · ${v.assignedTo.name}` : ""}</p>
                {v.feedback && <p>{s("Feedback:")} {v.feedback}{v.feedbackRating ? ` (${v.feedbackRating}/5)` : ""}</p>}
              </div>
              <div className="domain-actions">
                <select aria-label={s("Status") + " " + v.property.title} value={v.status} onChange={(e) => act(() => api(`/api/crm/viewings/${v.id}`, { status: e.target.value }, "PATCH"), load)}>
                  {VIEWING_STATUSES.map((st) => <option key={st} value={st}>{L("STATUS_LABEL", st)}</option>)}
                </select>
                {v.status !== "completed" && <Button onClick={() => setFeedback({ viewing: v, text: v.feedback || "", rating: v.feedbackRating ? String(v.feedbackRating) : "" })}>{s("Add feedback")}</Button>}
                <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/viewings/${v.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {creating && (
        <Modal title={s("New viewing")} onClose={() => setCreating(false)}>
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="domain-fields">
              <label>{s("Select property")}
                <select value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}>
                  <option value="">{s("Select property")}</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.address}</option>)}
                </select>
              </label>
              <label>{s("Visitor / customer (optional)")}
                <select value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}>
                  <option value="">{s("Visitor / customer (optional)")}</option>
                  {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </label>
              <label>{s("Viewing")}<input type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></label>
              <label>{s("Agent (optional)")}
                <select value={f.assignedToId} onChange={(e) => setF({ ...f, assignedToId: e.target.value })}>
                  <option value="">{s("Agent (optional)")}</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            </div>
            {coordinator && f.assignedToId && (
              <label className="toggle-row"><span>{s("If this time is busy, automatically find the nearest free slot")}</span><input type="checkbox" checked={f.autoSlot} onChange={(e) => setF({ ...f, autoSlot: e.target.checked })} /></label>
            )}
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{s("Book viewing")}</Button>
          </form>
        </Modal>
      )}
      {feedback && (
        <Modal title={s("Post-viewing feedback")} onClose={() => setFeedback(null)}>
          <label className="crm-field">{s("Buyer/agent's impression of the property")}<textarea rows={3} value={feedback.text} onChange={(e) => setFeedback({ ...feedback, text: e.target.value })} /></label>
          <label className="crm-field">{s("Rating (optional)")}
            <select value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: e.target.value })}>
              <option value="">{s("Rating (optional)")}</option>
              {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}/5</option>)}
            </select>
          </label>
          <Button variant="primary" onClick={() => act(() => api(`/api/crm/viewings/${feedback.viewing.id}`, { feedback: feedback.text, feedbackRating: feedback.rating ? Number(feedback.rating) : null, status: "completed" }, "PATCH"), async () => { setFeedback(null); await load(); })}>{s("Save")}</Button>
        </Modal>
      )}
    </>
  );
}

// ── Buyer ↔ property match ─────────────────────────────────────────────────
export function MatchesView() {
  const { s, L, api, get, access, contacts } = useCrm();
  const [results, setResults] = useState<BuyerMatchRow[] | null>(null);
  const [criteria, setCriteria] = useState<{ contactId: string; propertyType: string; listingType: string; city: string; budgetMin: string; budgetMax: string; minBedrooms: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<{ contactId: string; name: string; email: string | null; matchedPropertyIds: string[]; message: string }[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    const d = await get<{ results: BuyerMatchRow[] }>("/api/crm/buyer-matches").catch(() => ({ results: [] }));
    setResults(d.results || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!criteria?.contactId) { setError(s("Select a contact")); return; }
    setSaving(true); setError("");
    try {
      const buyerCriteria: Record<string, unknown> = {};
      if (criteria.propertyType) buyerCriteria.propertyType = criteria.propertyType;
      if (criteria.listingType) buyerCriteria.listingType = criteria.listingType;
      if (criteria.city) buyerCriteria.city = criteria.city;
      if (criteria.budgetMin) buyerCriteria.budgetMin = Number(criteria.budgetMin);
      if (criteria.budgetMax) buyerCriteria.budgetMax = Number(criteria.budgetMax);
      if (criteria.minBedrooms) buyerCriteria.minBedrooms = Number(criteria.minBedrooms);
      await api(`/api/crm/contacts/${criteria.contactId}`, { customFields: { buyerCriteria } }, "PUT");
      setCriteria(null);
      await load();
    } catch { setError(s("Failed to save criteria")); } finally { setSaving(false); }
  }
  async function loadDrafts() {
    setLoadingDrafts(true);
    try { const d = await get<{ drafts: typeof drafts }>("/api/crm/lead-matcher"); setDrafts(d.drafts || []); } catch (e) { toast.error((e as Error).message); } finally { setLoadingDrafts(false); }
  }
  // A person always presses send; drafts are never sent automatically.
  async function send(d: { contactId: string; message: string }) {
    setSending(d.contactId);
    try { await api("/api/sales/followups/send", { contactId: d.contactId, message: d.message }); setSent((prev) => new Set(prev).add(d.contactId)); } catch (e) { toast.error((e as Error).message); } finally { setSending(null); }
  }
  if (!results) return <Loading />;
  return (
    <>
      {access["agent.leadMatcher"] && (
        <section className="panel">
          <div className="row-between">
            <div><h3>{s("Lead Matcher agent")}</h3><p className="fine-print">{s("Follow-up message drafts for leads — mentioning a matching property where one exists")}</p></div>
            <Button disabled={loadingDrafts} onClick={loadDrafts}><Icon name="Sparkles" size={15} />{s("Generate drafts")} <CreditCost feature="crm.lead-matcher" /></Button>
          </div>
          {!drafts.length && !loadingDrafts ? <p className="fine-print">{s("Click \"Generate drafts\"")}</p> : drafts.map((d) => (
            <article className="domain-card row-between" key={d.contactId}>
              <div>
                <strong>{d.name}</strong>{d.matchedPropertyIds.length > 0 && <span className="badge">{s("with match")}</span>}
                <p>{d.message}</p>
              </div>
              {sent.has(d.contactId) ? <span className="badge"><Icon name="Check" size={13} />{s("Sent")}</span>
                : d.email ? <Button variant="primary" disabled={sending === d.contactId} onClick={() => send(d)}><Icon name="Send" size={14} />{s("Send")}</Button>
                : <span className="badge">{s("No email")}</span>}
            </article>
          ))}
        </section>
      )}
      <div className="domain-toolbar"><Button variant="primary" onClick={() => setCriteria({ contactId: "", propertyType: "", listingType: "", city: "", budgetMin: "", budgetMax: "", minBedrooms: "" })}><Icon name="Plus" size={16} />{s("Set buyer criteria")}</Button></div>
      {!results.length ? <EmptyText text={s("No buyers have search criteria yet")} /> : results.map((r) => (
        <section className="panel" key={r.contactId}>
          <div className="row-between">
            <strong>{r.contactName}{r.phone ? ` · ${r.phone}` : ""}</strong>
            <span className="badge">{r.matches.length} {s("matches")}</span>
          </div>
          {r.matches.map((m) => (
            <article className="domain-card row-between" key={m.id}>
              <span>{m.title} — {m.address}{m.city ? `${s(",")} ${m.city}` : ""}</span>
              <strong>{fmtMoney(m.price)}</strong>
            </article>
          ))}
        </section>
      ))}
      {criteria && (
        <Modal title={s("Set buyer criteria")} onClose={() => setCriteria(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              <label>{s("Select buyer contact")}
                <select value={criteria.contactId} onChange={(e) => setCriteria({ ...criteria, contactId: e.target.value })}>
                  <option value="">{s("Select buyer contact")}</option>
                  {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </label>
              <label>{s("Property type (any)")}
                <select value={criteria.propertyType} onChange={(e) => setCriteria({ ...criteria, propertyType: e.target.value })}>
                  <option value="">{s("Property type (any)")}</option>
                  {PROPERTY_TYPES.map((v) => <option key={v} value={v}>{L("PROPERTY_TYPE_LABEL", v)}</option>)}
                </select>
              </label>
              <label>{s("Deal type (any)")}
                <select value={criteria.listingType} onChange={(e) => setCriteria({ ...criteria, listingType: e.target.value })}>
                  <option value="">{s("Deal type (any)")}</option>
                  <option value="buy">{s("Buy")}</option>
                  <option value="rent">{s("Rent")}</option>
                </select>
              </label>
              <label>{s("City (any)")}<input value={criteria.city} onChange={(e) => setCriteria({ ...criteria, city: e.target.value })} /></label>
              <label>{s("Min budget")}<input type="number" value={criteria.budgetMin} onChange={(e) => setCriteria({ ...criteria, budgetMin: e.target.value })} /></label>
              <label>{s("Max budget")}<input type="number" value={criteria.budgetMax} onChange={(e) => setCriteria({ ...criteria, budgetMax: e.target.value })} /></label>
              <label>{s("Min bedrooms")}<input type="number" value={criteria.minBedrooms} onChange={(e) => setCriteria({ ...criteria, minBedrooms: e.target.value })} /></label>
            </div>
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{s("Save criteria")}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

// ── Team performance ───────────────────────────────────────────────────────
export function PerformanceView() {
  const { s, get, access } = useCrm();
  const [start, setStart] = useState(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(isoDate(new Date()));
  const [report, setReport] = useState<PerformanceRow[] | null>(null);
  const [period, setPeriod] = useState("7");
  const [agency, setAgency] = useState("");
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    setReport(null);
    get<{ report: PerformanceRow[] }>(`/api/crm/performance-report?startDate=${start}&endDate=${end}`).then((d) => setReport(d.report || [])).catch(() => setReport([]));
  }, [start, end, get]);
  async function generate() {
    setGenerating(true); setAgency("");
    try { const d = await get<{ report: string }>(`/api/crm/agency-report?periodDays=${period}`); setAgency(d.report); } catch (e) { toast.error((e as Error).message || s("Failed to generate report")); } finally { setGenerating(false); }
  }
  return (
    <>
      {/* Reportive only: it asks questions about stale items and writes to no record. */}
      {access["agent.agencyManager"] && (
        <section className="panel">
          <div className="row-between">
            <div><h3>{s("Agency Manager Assistant")}</h3><p className="fine-print">{s("Periodic pipeline summary + suggested questions about abandoned leads and feedback-less viewings")}</p></div>
            <div className="domain-actions">
              <select aria-label={s("Agency Manager Assistant")} value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="7">{s("Weekly")}</option><option value="14">{s("Bi-weekly")}</option><option value="30">{s("Monthly")}</option>
              </select>
              <Button variant="primary" disabled={generating} onClick={generate}><Icon name="Sparkles" size={15} />{s("Generate report")} <CreditCost feature="crm.agency-report" /></Button>
            </div>
          </div>
          {agency && <div className="crm-markdown"><ReactMarkdown>{agency}</ReactMarkdown></div>}
        </section>
      )}
      <div className="domain-toolbar">
        <input type="date" aria-label={s("Start date")} value={start} onChange={(e) => setStart(e.target.value)} />
        <span>{s("to")}</span>
        <input type="date" aria-label={s("End date")} value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      {!report ? <Loading /> : !report.length ? <EmptyText text={s("No data in this range")} /> : (
        <section className="panel">
          {report.map((r) => (
            <article className="domain-card" key={r.agentId}>
              <h3>{r.agentName || s("Unnamed")}</h3>
              <div className="stats-grid">
                <div className="stat"><span>{s("Properties closed")}</span><strong>{r.propertiesClosedCount}</strong></div>
                <div className="stat"><span>{s("Commission volume")}</span><strong>{fmtMoney(r.commissionVolume)}</strong></div>
                <div className="stat"><span>{s("Viewings completed")}</span><strong>{r.viewingsCompleted} / {r.viewingsScheduled}</strong></div>
                <div className="stat"><span>{s("Viewing→contract rate")}</span><strong>{r.viewingToContractConversionRate != null ? `${r.viewingToContractConversionRate}%` : "—"}</strong></div>
              </div>
            </article>
          ))}
        </section>
      )}
      {report && <CommissionSplits agents={report} />}
    </>
  );
}

function CommissionSplits({ agents }: { agents: PerformanceRow[] }) {
  const { s } = useCrm();
  const [rows, setRows] = useState<{ agentUserId: string; count: number; total: number; paid: number; pending: number }[] | null>(null);
  useEffect(() => {
    // 402 without the CRM add-on: nothing to show.
    fetch("/api/accounting/commissions").then((r) => (r.ok ? r.json() : { records: [] })).then((d: { records?: { splits: { agentUserId: string; amount: number; status: string }[] }[] }) => {
      const by = new Map<string, { agentUserId: string; count: number; total: number; paid: number; pending: number }>();
      for (const rec of d.records || []) for (const sp of rec.splits) {
        const row = by.get(sp.agentUserId) || { agentUserId: sp.agentUserId, count: 0, total: 0, paid: 0, pending: 0 };
        row.count += 1; row.total += sp.amount;
        if (sp.status === "paid") row.paid += sp.amount; else row.pending += sp.amount;
        by.set(sp.agentUserId, row);
      }
      setRows([...by.values()].sort((a, b) => b.total - a.total));
    }).catch(() => setRows([]));
  }, []);
  if (!rows?.length) return null;
  const nameOf = (id: string) => agents.find((a) => a.agentId === id)?.agentName || s("Agent");
  return (
    <section className="panel domain-table-wrap">
      <div className="row-between"><h3>{s("Commission splits by agent")}</h3><a className="text-link" href="/accounting">{s("Accounting →")}</a></div>
      <table className="domain-table">
        <thead><tr>{[s("Agent"), s("Splits"), s("Total"), s("Paid"), s("Owed")].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.agentUserId}>
            <td data-label={s("Agent")}>{nameOf(r.agentUserId)}</td>
            <td data-label={s("Splits")}>{r.count}</td>
            <td data-label={s("Total")}><strong>{fmtMoney(r.total)}</strong></td>
            <td data-label={s("Paid")}>{fmtMoney(r.paid)}</td>
            <td data-label={s("Owed")}>{fmtMoney(r.pending)}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}
