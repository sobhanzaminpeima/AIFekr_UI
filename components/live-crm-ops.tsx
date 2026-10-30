"use client";
// The CRM's commercial tabs in the design (crm-workspace.tsx CrmOperations and
// business-detail.tsx Invoice) on the real CRM: products, invoices, contracts
// and projects, as on the classic CRM page.
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fmtMoney, toJalali, type ContractTemplate, type CrmContract, type CrmInvoice, type CrmProduct, type CrmProject, type InvoiceItem } from "@/lib/crm";
import { Button, Icon, Modal } from "./ui";
import { EmptyText, FormError, Loading, useCrm } from "./live-crm-context";
import { downscale } from "./live-media";

const act = async (work: () => Promise<unknown>, after?: () => unknown) => {
  try { await work(); await after?.(); } catch (e) { if ((e as Error).message) toast.error((e as Error).message); }
};

/** The workspace logo for printed invoices and contracts (classic useCompanyLogo). */
function useCompanyLogo() {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => { fetch("/api/crm/company-logo").then((r) => r.json()).then((d) => setLogo(d.logoUrl || null)).catch(() => {}); }, []);
  return logo;
}


// ── Products ───────────────────────────────────────────────────────────────
type ProductForm = { id?: string; name: string; sku: string; description: string; price: string; unit: string; taxRate: string; imageUrl: string };
const EMPTY_PRODUCT: ProductForm = { name: "", sku: "", description: "", price: "", unit: "", taxRate: "0", imageUrl: "" };

export function ProductsView() {
  const { c, s, api, get } = useCrm();
  const [products, setProducts] = useState<CrmProduct[] | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [detail, setDetail] = useState<CrmProduct | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const d = await get<{ products: CrmProduct[] }>("/api/crm/products").catch(() => ({ products: [] }));
    setProducts(d.products || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", await downscale(file));
      const d = await api<{ url: string }>("/api/upload", fd);
      setForm((f) => (f ? { ...f, imageUrl: d.url } : f));
    } catch (e) { setError((e as Error).message || c.products.errorImageUpload); } finally { setUploading(false); }
  }
  async function save() {
    if (!form) return;
    if (!form.name.trim()) { setError(c.products.errorNameRequired); return; }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) { setError(c.products.errorPriceRequired); return; }
    setSaving(true); setError("");
    try {
      const payload = { name: form.name.trim(), sku: form.sku.trim() || undefined, description: form.description.trim() || undefined, price, unit: form.unit.trim() || undefined, taxRate: Number(form.taxRate) || 0, imageUrl: form.imageUrl || undefined };
      await api(form.id ? `/api/crm/products/${form.id}` : "/api/crm/products", payload, form.id ? "PUT" : "POST");
      setForm(null);
      await load();
    } catch (e) { setError((e as Error).message || c.products.errorGeneric); } finally { setSaving(false); }
  }
  if (!products) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  return (
    <section className="panel">
      <div className="domain-toolbar">
        {products.length > 0 && <input aria-label={s("Search products (name or SKU)")} placeholder={s("Search products (name or SKU)")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        <Button variant="primary" onClick={() => { setForm(EMPTY_PRODUCT); setError(""); }}><Icon name="Plus" size={16} />{c.products.new}</Button>
      </div>
      {!products.length ? <EmptyText text={c.products.empty} /> : !filtered.length ? <EmptyText text={s("No products match your search")} /> : filtered.map((p) => (
        <article className={"domain-card row-between crm-product" + (p.isActive ? "" : " is-inactive")} key={p.id}>
          <button className="crm-product-main" onClick={() => setDetail(p)}>
            <span className="crm-thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <Icon name="Package" size={18} />}</span>
            <span>
              <strong>{p.name}</strong>
              <small>{fmtMoney(p.price)} {p.unit ? `/ ${p.unit}` : ""} {p.taxRate > 0 ? `· ${p.taxRate}% ${c.products.tax}` : ""}</small>
            </span>
          </button>
          <div className="domain-actions">
            <Button onClick={() => { setForm({ id: p.id, name: p.name, sku: p.sku || "", description: p.description || "", price: String(p.price), unit: p.unit || "", taxRate: String(p.taxRate), imageUrl: p.imageUrl || "" }); setError(""); }}>{c.products.edit}</Button>
            <Button className={p.isActive ? "is-active" : ""} onClick={() => act(() => api(`/api/crm/products/${p.id}`, { isActive: !p.isActive }, "PUT"), load)}>{p.isActive ? c.products.active : c.products.inactive}</Button>
            <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/products/${p.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
          </div>
        </article>
      ))}
      {form && (
        <Modal title={form.id ? c.products.edit : c.products.new} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="crm-photo-row">
              <span className="crm-thumb large">{form.imageUrl ? <img src={form.imageUrl} alt="" /> : <Icon name="Package" size={24} />}</span>
              <label className="btn">{uploading ? c.products.uploadingPhoto : c.products.uploadPhoto}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
              </label>
            </div>
            <div className="domain-fields">
              <label>{c.products.namePlaceholder}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>{c.products.descriptionPlaceholder}<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label>{c.products.skuPlaceholder}<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
              <label>{c.products.pricePlaceholder}<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label>{c.products.unitPlaceholder}<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
              <label>{c.products.taxPlaceholder}<input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} /></label>
            </div>
            <FormError text={error} />
            <div className="domain-actions">
              <Button type="submit" variant="primary" disabled={saving}>{c.products.save}</Button>
              <Button onClick={() => setForm(null)}>{c.products.cancel}</Button>
            </div>
          </form>
        </Modal>
      )}
      {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function ProductDetail({ product, onClose }: { product: CrmProduct; onClose: () => void }) {
  const { c, get } = useCrm();
  const [buyers, setBuyers] = useState<{ id: string; name: string }[] | null>(null);
  useEffect(() => { get<{ contacts: { id: string; name: string }[] }>(`/api/crm/products/${product.id}`).then((d) => setBuyers(d.contacts || [])).catch(() => setBuyers([])); }, [product.id, get]);
  return (
    <Modal title={product.name} onClose={onClose}>
      <div className="crm-photo-row">
        <span className="crm-thumb large">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Icon name="Package" size={24} />}</span>
        <p>{fmtMoney(product.price)} {product.unit ? `/ ${product.unit}` : ""}</p>
      </div>
      {product.description && <p>{product.description}</p>}
      <h3>{c.products.detail.customersWhoBought}</h3>
      {!buyers ? <Loading /> : !buyers.length ? <p className="fine-print">{c.products.detail.notUsedYet}</p> : buyers.map((b) => <article className="domain-card" key={b.id}>{b.name}</article>)}
    </Modal>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────
const NEW_LINE: InvoiceItem = { description: "", quantity: 1, unitPrice: 0, taxRate: 0, lineTotal: 0 };

export function InvoicesView() {
  const { c, s, api, get, contacts } = useCrm();
  const [invoices, setInvoices] = useState<CrmInvoice[] | null>(null);
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [editing, setEditing] = useState(false);
  const [contactId, setContactId] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([NEW_LINE]);
  const [discount, setDiscount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [printing, setPrinting] = useState<CrmInvoice | null>(null);
  const load = useCallback(async () => {
    const [inv, prod] = await Promise.all([
      get<{ invoices: CrmInvoice[] }>("/api/crm/invoices").catch(() => ({ invoices: [] })),
      get<{ products: CrmProduct[] }>("/api/crm/products?activeOnly=1").catch(() => ({ products: [] })),
    ]);
    setInvoices(inv.invoices || []);
    setProducts(prod.products || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  const update = (i: number, patch: Partial<InvoiceItem>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxTotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.taxRate / 100), 0);
  const total = Math.max(0, subtotal + taxTotal - (Number(discount) || 0));
  async function create() {
    if (!contactId) { setError(c.invoices.errorContactRequired); return; }
    if (items.some((it) => !it.description.trim())) { setError(c.invoices.errorItemDescriptionRequired); return; }
    setSaving(true); setError("");
    try {
      await api("/api/crm/invoices", { contactId, items, discount: Number(discount) || 0 });
      setEditing(false); setContactId(""); setItems([NEW_LINE]); setDiscount("0");
      await load();
    } catch (e) { setError((e as Error).message || c.invoices.errorGeneric); } finally { setSaving(false); }
  }
  async function setInvoiceStatus(id: string, next: string) {
    try {
      const d = await api<{ ledgerWarning?: string }>(`/api/crm/invoices/${id}`, { status: next }, "PUT");
      if (d.ledgerWarning) toast.error(d.ledgerWarning, { duration: 8000 });
    } catch (e) { toast.error((e as Error).message); }
    await load();
  }
  if (!invoices) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = invoices.filter((inv) => (!status || inv.status === status) && (!q || inv.invoiceNumber.toLowerCase().includes(q) || inv.contact.name.toLowerCase().includes(q)));
  return (
    <>
      <div className="domain-toolbar">
        {invoices.length > 0 && <input aria-label={s("Search (invoice number or customer)")} placeholder={s("Search (invoice number or customer)")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        {invoices.length > 0 && (
          <select aria-label={s("All statuses")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{s("All statuses")}</option>
            {Object.keys(c.invoiceStatus).map((v) => <option key={v} value={v}>{c.invoiceStatus[v]}</option>)}
          </select>
        )}
        <Button variant="primary" onClick={() => setEditing((v) => !v)}><Icon name="Plus" size={16} />{c.invoices.new}</Button>
      </div>
      {editing && (
        <section className="panel invoice-editor">
          <div className="row-between"><span className="eyebrow orange-text">AIFekr / INVOICE</span></div>
          <label>{c.invoices.selectContact}
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">{c.invoices.selectContact}</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
          {items.map((it, i) => (
            <div className="invoice-line crm-invoice-line" key={i}>
              <label>{c.invoices.fromCatalog}
                <select defaultValue="" onChange={(e) => { const p = products.find((x) => x.id === e.target.value); if (p) update(i, { description: p.name, unitPrice: p.price, taxRate: p.taxRate, productId: p.id }); }}>
                  <option value="">{c.invoices.fromCatalog}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>{c.invoices.itemDescription}<input value={it.description} onChange={(e) => update(i, { description: e.target.value })} /></label>
              <label>{c.invoices.qty}<input type="number" value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) || 1 })} /></label>
              <label>{c.invoices.unitPrice}<input type="number" value={it.unitPrice} onChange={(e) => update(i, { unitPrice: Number(e.target.value) || 0 })} /></label>
              <Button label={c.common.delete} onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}><Icon name="Trash2" size={16} /></Button>
            </div>
          ))}
          <Button onClick={() => setItems((prev) => [...prev, NEW_LINE])}><Icon name="Plus" size={16} />{c.invoices.addItem}</Button>
          <label>{c.invoices.discount.replace(/[:：]\s*$/, "")}<input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
          <div className="invoice-total"><span>{c.invoices.total.replace(/[:：]\s*$/, "")}</span><strong>{fmtMoney(total)}</strong></div>
          <FormError text={error} />
          <div className="flex-wrap"><Button variant="primary" disabled={saving} onClick={create}>{c.invoices.createInvoice}</Button></div>
        </section>
      )}
      {!invoices.length ? <EmptyText text={c.invoices.empty} /> : !filtered.length ? <EmptyText text={s("No invoices match your search")} /> : (
        <section className="panel">
          {filtered.map((inv) => (
            <article className="domain-card row-between" key={inv.id}>
              <div>
                <h3>{inv.invoiceNumber} — {inv.contact.name}</h3>
                <strong>{fmtMoney(inv.total)} {c.invoices.currency}</strong>
              </div>
              <div className="domain-actions">
                <span className={"badge crm-status-" + inv.status}>{c.invoiceStatus[inv.status] || c.invoiceStatus.draft}</span>
                {inv.status === "draft" && <Button onClick={() => setInvoiceStatus(inv.id, "sent")}>{c.invoices.send}</Button>}
                {inv.status !== "paid" && inv.status !== "cancelled" && <Button onClick={() => setInvoiceStatus(inv.id, "paid")}>{c.invoices.markPaid}</Button>}
                <Button label={c.invoices.print.printPdf} onClick={() => setPrinting(inv)}><Icon name="Printer" size={15} /></Button>
                <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/invoices/${inv.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {printing && <InvoicePrint invoice={printing} onClose={() => setPrinting(null)} />}
    </>
  );
}

function PrintActions({ onPdf, pdfLabel, printLabel, busy }: { onPdf: () => void; pdfLabel: string; printLabel: string; busy: boolean }) {
  return (
    <div className="domain-actions crm-print-actions">
      <Button variant="primary" disabled={busy} onClick={onPdf}><Icon name="FileDown" size={16} />{pdfLabel}</Button>
      <Button onClick={() => window.print()}><Icon name="Printer" size={16} />{printLabel}</Button>
    </div>
  );
}

function InvoicePrint({ invoice, onClose }: { invoice: CrmInvoice; onClose: () => void }) {
  const { c, s, lang } = useCrm();
  const logo = useCompanyLogo();
  const [busy, setBusy] = useState(false);
  const p = c.invoices.print;
  const date = lang === "fa" ? toJalali(invoice.issueDate) : new Date(invoice.issueDate).toLocaleDateString(lang === "de" ? "de-DE" : "en-US");
  async function pdf() {
    setBusy(true);
    try {
      // The PDF library is only loaded by people who export.
      const { downloadInvoicePdf } = await import("./crm-pdf");
      await downloadInvoicePdf({ invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate, contactName: invoice.contact.name, items: invoice.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })), subtotal: invoice.subtotal, taxTotal: invoice.taxTotal, discount: invoice.discount, total: invoice.total, currency: invoice.currency, logoUrl: logo }, p, lang === "fa", date);
    } catch { toast.error(s("Failed to generate the PDF")); } finally { setBusy(false); }
  }
  return (
    <Modal title={`${p.invoiceTitle} ${invoice.invoiceNumber}`} onClose={onClose}>
      <PrintActions onPdf={pdf} pdfLabel={p.downloadPdf} printLabel={p.printPdf} busy={busy} />
      <div className="crm-print-sheet" dir={lang === "fa" ? "rtl" : "ltr"}>
        {logo && <img src={logo} alt="logo" className="crm-print-logo" />}
        <div className="row-between"><h2>{p.invoiceTitle} {invoice.invoiceNumber}</h2><span>{date}</span></div>
        <p>{p.billTo} {invoice.contact.name}</p>
        <table>
          <thead><tr><th>{p.description}</th><th>{p.qty}</th><th>{p.unit}</th><th>{p.total}</th></tr></thead>
          <tbody>{invoice.items.map((it, i) => <tr key={i}><td>{it.description}</td><td>{it.quantity}</td><td>{fmtMoney(it.unitPrice)}</td><td>{fmtMoney(it.quantity * it.unitPrice)}</td></tr>)}</tbody>
        </table>
        <div className="crm-print-totals">
          <p>{p.subtotal} {fmtMoney(invoice.subtotal)}</p>
          <p>{p.tax} {fmtMoney(invoice.taxTotal)}</p>
          {invoice.discount > 0 && <p>{p.discount} -{fmtMoney(invoice.discount)}</p>}
          <p><strong>{p.grandTotal} {fmtMoney(invoice.total)} {invoice.currency}</strong></p>
        </div>
      </div>
    </Modal>
  );
}

// ── Contracts ──────────────────────────────────────────────────────────────
export function ContractsView() {
  const { c, s, api, get, contacts } = useCrm();
  const [contracts, setContracts] = useState<CrmContract[] | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [creating, setCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [form, setForm] = useState({ contactId: "", templateId: "", title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [printing, setPrinting] = useState<CrmContract | null>(null);
  const [editing, setEditing] = useState<CrmContract | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const load = useCallback(async () => {
    const [cs, ts] = await Promise.all([
      get<{ contracts: CrmContract[] }>("/api/crm/contracts").catch(() => ({ contracts: [] })),
      get<{ templates: ContractTemplate[] }>("/api/crm/contract-templates").catch(() => ({ templates: [] })),
    ]);
    setContracts(cs.contracts || []);
    setTemplates(ts.templates || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (!form.contactId || !form.title.trim()) { setError(c.contracts.errorRequired); return; }
    setSaving(true); setError("");
    try {
      await api("/api/crm/contracts", { contactId: form.contactId, templateId: form.templateId || undefined, title: form.title.trim(), content: form.templateId ? undefined : form.content });
      setCreating(false); setForm({ contactId: "", templateId: "", title: "", content: "" });
      await load();
    } catch (e) { setError((e as Error).message || c.contracts.errorGeneric); } finally { setSaving(false); }
  }
  if (!contracts) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = contracts.filter((ct) => (!status || ct.status === status) && (!q || ct.title.toLowerCase().includes(q) || ct.contact.name.toLowerCase().includes(q)));
  return (
    <>
      <div className="domain-toolbar">
        {contracts.length > 0 && <input aria-label={s("Search (title or customer)")} placeholder={s("Search (title or customer)")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        {contracts.length > 0 && (
          <select aria-label={s("All statuses")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{s("All statuses")}</option>
            {Object.keys(c.contractStatus).map((v) => <option key={v} value={v}>{c.contractStatus[v]}</option>)}
          </select>
        )}
        <Button disabled={restoring} onClick={async () => { setRestoring(true); await act(() => api("/api/crm/contract-templates/seed-defaults"), load); setRestoring(false); }}>{c.contracts.restoreDefaults}</Button>
        <Button onClick={() => setShowTemplates((v) => !v)}><Icon name="FileText" size={16} />{c.contracts.manageTemplates}</Button>
        <Button variant="primary" onClick={() => setCreating(true)}><Icon name="Plus" size={16} />{c.contracts.newContract}</Button>
      </div>
      {showTemplates && (
        <section className="panel">
          <h3>{c.contracts.manageTemplates}</h3>
          {!templates.length ? <p className="fine-print">{c.contracts.noTemplatesYet}</p> : templates.map((tpl) => (
            <article className="domain-card row-between" key={tpl.id}>
              <span>{tpl.name}</span>
              <div className="domain-actions">
                <Button onClick={() => setEditingTemplate(tpl)}>{c.contracts.edit}</Button>
                <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/contract-templates/${tpl.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {!contracts.length ? <EmptyText text={c.contracts.empty} /> : !filtered.length ? <EmptyText text={s("No contracts match your search")} /> : (
        <section className="panel">
          {filtered.map((ct) => (
            <article className="domain-card row-between" key={ct.id}>
              <h3>{ct.title} — {ct.contact.name}</h3>
              <div className="domain-actions">
                <span className={"badge crm-status-" + ct.status}>{c.contractStatus[ct.status] || c.contractStatus.draft}</span>
                {ct.status === "draft" && <Button onClick={() => act(() => api(`/api/crm/contracts/${ct.id}`, { status: "sent" }, "PUT"), load)}>{c.contracts.send}</Button>}
                {ct.status !== "signed" && ct.status !== "cancelled" && <Button onClick={() => act(() => api(`/api/crm/contracts/${ct.id}`, { status: "signed" }, "PUT"), load)}>{c.contracts.markSigned}</Button>}
                <Button onClick={() => setEditing(ct)}>{c.contracts.edit}</Button>
                <Button label={c.contracts.print.printPdf} onClick={() => setPrinting(ct)}><Icon name="Printer" size={15} /></Button>
                <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/contracts/${ct.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {creating && (
        <Modal title={c.contracts.newContract} onClose={() => setCreating(false)}>
          <p className="fine-print">{c.contracts.legalDisclaimer}</p>
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="domain-fields">
              <label>{c.contracts.selectContact}
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                  <option value="">{c.contracts.selectContact}</option>
                  {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </label>
              <label>{c.contracts.titlePlaceholder}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>{c.contracts.noTemplate}
                <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                  <option value="">{c.contracts.noTemplate}</option>
                  {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                </select>
              </label>
            </div>
            {!form.templateId && <label className="crm-field">{c.contracts.contentPlaceholder}<textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>}
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{c.contracts.createContract}</Button>
          </form>
        </Modal>
      )}
      {editing && (
        <TextEditor title={c.contracts.editModal.title} notice={editing.status !== "draft" ? c.contracts.editModal.finalizedNotice : ""} content={editing.content} save={c.contracts.editModal.save}
          onClose={() => setEditing(null)} onSave={(content) => act(() => api(`/api/crm/contracts/${editing.id}`, { content }, "PUT"), async () => { setEditing(null); await load(); })} />
      )}
      {editingTemplate && (
        <TextEditor title={c.contracts.templateEditModal.title} notice={c.contracts.templateEditModal.legalDisclaimer} name={editingTemplate.name} namePlaceholder={c.contracts.templateEditModal.namePlaceholder} content={editingTemplate.content} save={c.contracts.templateEditModal.save}
          onClose={() => setEditingTemplate(null)} onSave={(content, name) => act(() => api(`/api/crm/contract-templates/${editingTemplate.id}`, { name, content }, "PUT"), async () => { setEditingTemplate(null); await load(); })} />
      )}
      {printing && <ContractPrint contract={printing} onClose={() => setPrinting(null)} />}
    </>
  );
}

function TextEditor({ title, notice, name, namePlaceholder, content, save, onClose, onSave }: { title: string; notice: string; name?: string; namePlaceholder?: string; content: string; save: string; onClose: () => void; onSave: (content: string, name: string) => Promise<unknown> }) {
  const [text, setText] = useState(content);
  const [label, setLabel] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      {notice && <p className="fine-print">{notice}</p>}
      {name !== undefined && <label className="crm-field">{namePlaceholder}<input value={label} onChange={(e) => setLabel(e.target.value)} /></label>}
      <textarea className="crm-long-text" rows={12} value={text} onChange={(e) => setText(e.target.value)} aria-label={title} />
      <Button variant="primary" disabled={saving} onClick={async () => { setSaving(true); await onSave(text, label); setSaving(false); }}>{save}</Button>
    </Modal>
  );
}

function ContractPrint({ contract, onClose }: { contract: CrmContract; onClose: () => void }) {
  const { c, s, lang } = useCrm();
  const logo = useCompanyLogo();
  const [busy, setBusy] = useState(false);
  const p = c.contracts.print;
  async function pdf() {
    setBusy(true);
    try {
      const { downloadContractPdf } = await import("./crm-pdf");
      await downloadContractPdf({ title: contract.title, contactName: contract.contact.name, content: contract.content, logoUrl: logo }, p, lang === "fa");
    } catch { toast.error(s("Failed to generate the PDF")); } finally { setBusy(false); }
  }
  return (
    <Modal title={contract.title} onClose={onClose}>
      <PrintActions onPdf={pdf} pdfLabel={p.downloadPdf} printLabel={p.printPdf} busy={busy} />
      <div className="crm-print-sheet crm-contract-sheet" dir={lang === "fa" ? "rtl" : "ltr"}>
        {logo && <img src={logo} alt="logo" className="crm-print-logo" />}
        <h2>{contract.title}</h2>
        <p>{p.contact} {contract.contact.name}</p>
        <div>{contract.content}</div>
      </div>
    </Modal>
  );
}

// ── Projects ───────────────────────────────────────────────────────────────
const PROPERTY_TYPES = ["apartment", "villa", "land", "commercial"];
const PROPERTY_TYPE_EN: Record<string, string> = { apartment: "Apartment", villa: "Villa", land: "Land", commercial: "Commercial" };

export function ProjectsView() {
  const { c, s, L, api, get, contacts, pipelines } = useCrm();
  const isRealEstate = !!pipelines?.some((p) => p.industrySlug === "real-estate");
  const [projects, setProjects] = useState<CrmProject[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", contactId: "", description: "", dealType: "", propertyType: "apartment", address: "", city: "", price: "", nightlyPrice: "", bookingLink: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const load = useCallback(async () => {
    const d = await get<{ projects: CrmProject[] }>("/api/crm/projects").catch(() => ({ projects: [] }));
    setProjects(d.projects || []);
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  async function create() {
    if (!form.name.trim()) { setError(c.projects.errorNameRequired); return; }
    setSaving(true); setError("");
    try {
      const d = await api<{ bookingLinkWarning?: string }>("/api/crm/projects", {
        name: form.name.trim(), contactId: form.contactId || undefined, description: form.description.trim() || undefined,
        realEstate: isRealEstate && form.dealType ? {
          dealType: form.dealType, propertyType: form.propertyType, address: form.address.trim(), city: form.city.trim() || undefined,
          price: form.dealType !== "short_term_rent" ? form.price : undefined,
          nightlyPrice: form.dealType === "short_term_rent" ? form.nightlyPrice : undefined,
          bookingLink: form.bookingLink.trim() || undefined,
        } : undefined,
      });
      if (d.bookingLinkWarning) toast.warning(d.bookingLinkWarning);
      setCreating(false);
      setForm({ name: "", contactId: "", description: "", dealType: "", propertyType: "apartment", address: "", city: "", price: "", nightlyPrice: "", bookingLink: "" });
      await load();
    } catch (e) { setError((e as Error).message || c.projects.errorGeneric); } finally { setSaving(false); }
  }
  if (!projects) return <Loading />;
  const q = search.trim().toLowerCase();
  const filtered = projects.filter((p) => (!status || p.status === status) && (!q || p.name.toLowerCase().includes(q) || (p.contact?.name || "").toLowerCase().includes(q)));
  const project = projects.find((p) => p.id === selected) ?? null;
  return (
    <section className="panel">
      <div className="domain-toolbar">
        {projects.length > 0 && <input aria-label={s("Search (project name or customer)")} placeholder={s("Search (project name or customer)")} value={search} onChange={(e) => setSearch(e.target.value)} />}
        {projects.length > 0 && (
          <select aria-label={s("All statuses")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{s("All statuses")}</option>
            {Object.entries(c.projectStatus).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        )}
        <Button variant="primary" onClick={() => setCreating(true)}><Icon name="Plus" size={16} />{c.projects.new}</Button>
      </div>
      {!projects.length ? <EmptyText text={c.projects.empty} /> : !filtered.length ? <EmptyText text={s("No projects match your search")} /> : filtered.map((p) => (
        <article className="domain-card row-between" key={p.id}>
          <button className="crm-row-main" onClick={() => setSelected(p.id)}>
            <h3>{p.name} {p.contact ? `— ${p.contact.name}` : ""}</h3>
            {p.description && <p>{p.description}</p>}
          </button>
          <div className="domain-actions">
            <select aria-label={s("Status: ").replace(/:\s*$/, "") + " " + p.name} value={p.status} onChange={(e) => act(() => api(`/api/crm/projects/${p.id}`, { status: e.target.value }, "PUT"), load)}>
              {Object.entries(c.projectStatus).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <Button label={c.common.delete} onClick={() => act(() => api(`/api/crm/projects/${p.id}`, undefined, "DELETE"), load)}><Icon name="Trash2" size={15} /></Button>
          </div>
        </article>
      ))}
      {creating && (
        <Modal title={c.projects.new} onClose={() => setCreating(false)}>
          <form onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="domain-fields">
              <label>{c.projects.namePlaceholder}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>{c.projects.noContact}
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                  <option value="">{c.projects.noContact}</option>
                  {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </label>
            </div>
            <label className="crm-field">{c.projects.descriptionPlaceholder}<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            {isRealEstate && (
              <div className="domain-fields">
                <label>{s("Deal type (optional)")}
                  <select value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
                    <option value="">{s("Deal type (optional)")}</option>
                    {["sell", "rent", "short_term_rent"].map((v) => <option key={v} value={v}>{L("PROJECT_LISTING_TYPE_LABEL", v)}</option>)}
                  </select>
                </label>
                {form.dealType && (
                  <>
                    <label>{s("Property type: ").replace(/:\s*$/, "")}
                      <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                        {PROPERTY_TYPES.map((v) => <option key={v} value={v}>{s(PROPERTY_TYPE_EN[v])}</option>)}
                      </select>
                    </label>
                    <label>{s("City")}<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
                    <label>{s("Address")}<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                    {form.dealType === "short_term_rent" ? (
                      <>
                        <label>{s("Price per night (Toman)")}<input type="number" value={form.nightlyPrice} onChange={(e) => setForm({ ...form, nightlyPrice: e.target.value })} /></label>
                        <label>{s("Booking platform link (Airbnb, Booking.com, ...)")}<input dir="ltr" value={form.bookingLink} onChange={(e) => setForm({ ...form, bookingLink: e.target.value })} /></label>
                      </>
                    ) : <label>{s("Total price (Toman)")}<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>}
                  </>
                )}
              </div>
            )}
            <FormError text={error} />
            <Button type="submit" variant="primary" disabled={saving}>{c.projects.createProject}</Button>
          </form>
        </Modal>
      )}
      {project && <ProjectDetail key={project.id} project={project} onClose={() => setSelected(null)} onChanged={load} />}
    </section>
  );
}

function ProjectDetail({ project, onClose, onChanged }: { project: CrmProject; onClose: () => void; onChanged: () => Promise<void> }) {
  const { c, s, L, api } = useCrm();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: project.name, description: project.description || "", startDate: project.startDate?.slice(0, 10) || "", endDate: project.endDate?.slice(0, 10) || "" });
  const property = project.property;
  const shortTerm = property?.listingType === "short_term_rent";
  const [re, setRe] = useState({ propertyType: property?.propertyType || "apartment", address: property?.address || "", city: property?.city || "", price: property?.price ? String(property.price) : "", nightlyPrice: property?.nightlyPrice ? String(property.nightlyPrice) : "", bookingLink: property?.bookingLink || "" });
  const once = useRef(false);
  async function save() {
    if (once.current) return;
    once.current = true; setSaving(true);
    try {
      const d = await api<{ bookingLinkWarning?: string }>(`/api/crm/projects/${project.id}`, {
        ...form, startDate: form.startDate || null, endDate: form.endDate || null,
        realEstate: property ? { propertyType: re.propertyType, address: re.address, city: re.city, price: shortTerm ? undefined : re.price, nightlyPrice: shortTerm ? re.nightlyPrice : undefined, bookingLink: re.bookingLink } : undefined,
      }, "PUT");
      if (d.bookingLinkWarning) toast.warning(d.bookingLinkWarning);
      setEditing(false);
      await onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); once.current = false; }
  }
  const rows: [string, string][] = [
    ...(project.contact ? [[s("Contact: "), project.contact.name] as [string, string]] : []),
    ...(project.deal ? [[s("Related deal: "), project.deal.title] as [string, string]] : []),
    ...(project.startDate ? [[s("Start: "), toJalali(project.startDate)] as [string, string]] : []),
    ...(project.endDate ? [[s("End: "), toJalali(project.endDate)] as [string, string]] : []),
    ...(property ? [
      [s("Deal type: "), L("PROJECT_LISTING_TYPE_LABEL", property.listingType)] as [string, string],
      [s("Address: "), property.address + (property.city ? `، ${property.city}` : "")] as [string, string],
      ...(shortTerm
        ? [...(property.nightlyPrice != null ? [[s("Per night: "), fmtMoney(property.nightlyPrice)] as [string, string]] : []), ...(property.bookingLink ? [[s("Booking link: "), property.bookingLink] as [string, string]] : [])]
        : property.price > 0 ? [[s("Price: "), fmtMoney(property.price)] as [string, string]] : []),
    ] : []),
  ];
  return (
    <Modal title={project.name} onClose={onClose}>
      <div className="row-between">
        <span className={"badge crm-status-" + project.status}>{L("PROJECT_STATUS_LABEL", project.status) || L("PROJECT_STATUS_LABEL", "active")}</span>
        {editing ? (
          <div className="domain-actions">
            <Button variant="primary" disabled={saving} onClick={save}>{c.contactDetail.save}</Button>
            <Button onClick={() => setEditing(false)}>{c.contactDetail.cancel}</Button>
          </div>
        ) : <Button onClick={() => setEditing(true)}>{c.contactDetail.edit}</Button>}
      </div>
      {editing ? (
        <>
          <div className="domain-fields">
            <label>{c.projects.namePlaceholder}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>{s("Start date")}<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
            <label>{s("End date")}<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
          </div>
          <label className="crm-field">{c.projects.descriptionPlaceholder}<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          {property && (
            <section className="crm-subsection">
              <h3>{L("PROJECT_LISTING_TYPE_LABEL", property.listingType)}</h3>
              <div className="domain-fields">
                <label>{s("Property type: ").replace(/:\s*$/, "")}
                  <select value={re.propertyType} onChange={(e) => setRe({ ...re, propertyType: e.target.value })}>
                    {PROPERTY_TYPES.map((v) => <option key={v} value={v}>{s(PROPERTY_TYPE_EN[v])}</option>)}
                  </select>
                </label>
                <label>{s("City")}<input value={re.city} onChange={(e) => setRe({ ...re, city: e.target.value })} /></label>
                <label>{s("Address")}<input value={re.address} onChange={(e) => setRe({ ...re, address: e.target.value })} /></label>
                {shortTerm ? (
                  <>
                    <label>{s("Price per night (Toman)")}<input type="number" value={re.nightlyPrice} onChange={(e) => setRe({ ...re, nightlyPrice: e.target.value })} /></label>
                    <label>{s("Booking platform link")}<input dir="ltr" value={re.bookingLink} onChange={(e) => setRe({ ...re, bookingLink: e.target.value })} /></label>
                  </>
                ) : <label>{s("Total price (Toman)")}<input type="number" value={re.price} onChange={(e) => setRe({ ...re, price: e.target.value })} /></label>}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {project.description && <p>{project.description}</p>}
          {rows.length ? (
            <dl className="domain-detail">
              {rows.map(([a, b]) => <div key={a}><dt>{a.replace(/:\s*$/, "")}</dt><dd>{b.startsWith("http") ? <a href={b} target="_blank" rel="noopener noreferrer">{b}</a> : b}</dd></div>)}
            </dl>
          ) : !project.description && <p className="fine-print">{c.contactDetail.noActivity}</p>}
        </>
      )}
    </Modal>
  );
}
