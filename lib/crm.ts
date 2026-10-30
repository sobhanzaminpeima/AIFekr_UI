// The real CRM's records and the classic CRM page's display rules (main site
// app/(dashboard)/(business)/crm/page.tsx), kept identical so both themes show
// the same numbers, names and dates.
import type { Locale } from "./i18n";

export interface Stage { id: string; name: string; nameEn: string | null; nameDe: string | null; order: number; isWon: boolean; isLost: boolean }
export interface Pipeline { id: string; name: string; nameEn: string | null; nameDe: string | null; industrySlug: string | null; isDefault: boolean; stages: Stage[] }
export interface DealContact { id: string; name: string; phone: string | null; company: string | null }
export interface Deal {
  id: string; title: string; value: number; stageId: string; pipelineId: string;
  status: string; contactId: string; contact: DealContact; expectedCloseDate: string | null; ownerId: string | null;
  wonAt?: string | null;
  commissionRate?: number | null; commissionAmount?: number | null; commissionPaymentStatus?: string;
}
export interface Contact {
  id: string; name: string; phone: string | null; email: string | null;
  whatsapp: string | null; telegram: string | null; company: string | null;
  status: string; source?: string; totalSpent: number; lastContact: string | null; assignedToId?: string | null;
  _count?: { properties: number; propertyInterests: number };
}
export interface TeamMember { id: string; name: string; email: string }
export interface Activity { id: string; type: string; content: string; createdAt: string }
export interface Task { id: string; title: string; status: string; dueDate: string | null; draftMessage?: string | null; completedAt?: string | null; contactId?: string | null }
export interface ContactDetail extends Contact { deals: Deal[]; activities: Activity[]; tasks: Task[] }
export interface AutomationRule { id: string; name: string; trigger: string; condition: string | null; action: string; isActive: boolean }
export interface CrmDocument { id: string; name: string; type: string; createdAt: string }
export interface CrmNote { id: string; content: string; isPinned: boolean; createdAt: string }
export interface CrmProduct { id: string; name: string; sku: string | null; description: string | null; price: number; unit: string | null; taxRate: number; isActive: boolean; imageUrl: string | null }
export interface InvoiceItem { id?: string; description: string; quantity: number; unitPrice: number; taxRate: number; lineTotal: number; productId?: string | null }
export interface CrmInvoice {
  id: string; invoiceNumber: string; status: string; total: number; currency: string;
  issueDate: string; dueDate: string | null; contact: { id: string; name: string };
  subtotal: number; taxTotal: number; discount: number; notes: string | null; items: InvoiceItem[];
}
export interface CrmContract { id: string; title: string; status: string; content: string; createdAt: string; contact: { id: string; name: string }; signedAt: string | null }
export interface ContractTemplate { id: string; name: string; content: string }
export interface ProjectProperty { id: string; listingType: string; propertyType: string; price: number; nightlyPrice: number | null; bookingLink: string | null; address: string; city: string | null; areaSqm: number | null }
export interface CrmProject {
  id: string; name: string; status: string; description: string | null;
  startDate: string | null; endDate: string | null;
  contact: { id: string; name: string } | null; deal: { id: string; title: string } | null;
  property: ProjectProperty | null;
}
export interface PropertyRow {
  id: string; title: string; listingType: string; propertyType: string;
  price: number; nightlyPrice: number | null; currency: string; bookingLink: string | null;
  address: string; city: string | null; bedrooms: number | null; bathrooms: number | null; areaSqm: number | null;
  description: string | null; images: string | null; status: string;
  representationStartDate: string | null; representationEndDate: string | null; agreedCommissionRate: number | null;
  crmContact: { id: string; name: string; phone: string | null } | null;
  crmDeal: { id: string; title: string } | null;
  ownerContactId: string | null;
}
export interface OwnerRow {
  id: string; name: string; phone: string | null; email: string | null;
  propertiesOwnedCount: number;
  properties: { id: string; title: string; status: string; listingType: string; address: string; city: string | null; representationStartDate: string | null; representationEndDate: string | null; agreedCommissionRate: number | null }[];
}
export interface ViewingRow {
  id: string; propertyId: string; contactId: string | null; assignedToId: string | null;
  scheduledAt: string; durationMin: number; status: string; feedback: string | null; feedbackRating: number | null;
  property: { id: string; title: string; address: string };
  contact: { id: string; name: string; phone: string | null } | null;
  assignedTo: { id: string; name: string } | null;
}
export interface BuyerMatchRow {
  contactId: string; contactName: string; phone: string | null;
  criteria: { propertyType?: string; listingType?: string; city?: string; budgetMin?: number; budgetMax?: number; minBedrooms?: number };
  matches: { id: string; title: string; listingType: string; propertyType: string; price: number; city: string | null; bedrooms: number | null; address: string }[];
}
export interface PerformanceRow {
  agentId: string; agentName: string | null;
  propertiesClosedCount: number; commissionVolume: number;
  viewingsScheduled: number; viewingsCompleted: number;
  viewingToContractConversionRate: number | null;
}
export interface VoiceAnalytics {
  totalCalls: number; totalDurationSec: number; avgDurationSec: number; completedCalls: number; successRate: number;
  byStatus: { status: string; count: number }[];
  byOutcome: { outcome: string; count: number }[];
  callsPerDay: { date: string; count: number }[];
  recentCalls: { id: string; callerPhone: string | null; direction: string; status: string; outcome: string | null; durationSec: number | null; createdAt: string; contactId: string | null; contactName: string | null }[];
}

/** The classic crm dictionary (main site lib/i18n/*.ts → crm), as /api/app/shell sends it. */
type Words<K extends string> = Record<K, string>;
export type CrmDict = {
  header: Words<"title" | "subtitle">;
  tabs: Words<"board" | "contacts" | "automation" | "agent" | "calendar" | "analytics" | "products" | "invoices" | "contracts" | "projects">;
  upgrade: Words<"banner" | "bannerSub" | "solo" | "team">;
  empty: Words<"noPipeline" | "createPipeline" | "noContacts" | "defaultPipelineName">;
  board: Words<"exportCsv" | "newDeal" | "currency">;
  contacts: Words<"exportCsv" | "newContact">;
  newDealModal: Words<"title" | "selectContact" | "titlePlaceholder" | "valuePlaceholder" | "expectedCloseDateLabel" | "submit" | "errorRequired" | "errorGeneric">;
  newContactModal: Words<"title" | "namePlaceholder" | "phonePlaceholder" | "emailPlaceholder" | "whatsappPlaceholder" | "telegramPlaceholder" | "companyPlaceholder" | "sourceLabel" | "submit" | "errorNameRequired" | "errorGeneric">;
  leadSources: Record<string, string>;
  industries: Record<string, string>;
  errors: Words<"paymentStartFailed" | "paymentGeneric">;
  common: Words<"assignToTeam" | "unassigned" | "delete">;
  dealDetail: Words<"fallbackTitle" | "notePlaceholder" | "logActivity">;
  contactDetail: Words<"profile" | "notesFiles" | "edit" | "save" | "cancel" | "deals" | "tasks" | "newTaskPlaceholder" | "activity" | "noActivity" | "newNotePlaceholder" | "callViaVoiceAgent" | "sendWhatsapp" | "openTelegram" | "whatsappMessagePlaceholder" | "whatsappActivityLog" | "telegramActivityLog">;
  notes: Words<"title" | "empty" | "placeholder">;
  documents: Words<"title" | "empty" | "uploading" | "upload" | "errorGeneric">;
  automation: Words<"description" | "newRule" | "namePlaceholder" | "conditionPrefix" | "conditionSuffix" | "createRule" | "empty" | "ruleSummaryPrefix" | "ruleSummarySuffix" | "active" | "inactive" | "errorNameRequired" | "errorGeneric">;
  agent: Words<"description" | "analyzeButton" | "savedNotesTitle" | "noAnalysis">;
  calendar: Words<"empty">;
  analytics: Words<"noPipeline" | "totalDeals" | "overallConversion" | "funnelTitle" | "sourcePerfTitle" | "leads" | "customers" | "pipelineSubTab" | "callsSubTab">;
  voiceAnalytics: Words<"empty" | "totalCalls" | "totalMinutes" | "avgDuration" | "successRate" | "trendTitle" | "byStatusTitle" | "byOutcomeTitle" | "recentCallsTitle" | "unknownCaller" | "viewContact"> & { status: Record<string, string>; outcome: Record<string, string> };
  products: Words<"new" | "uploadingPhoto" | "uploadPhoto" | "namePlaceholder" | "descriptionPlaceholder" | "skuPlaceholder" | "pricePlaceholder" | "unitPlaceholder" | "taxPlaceholder" | "cancel" | "save" | "empty" | "edit" | "active" | "inactive" | "tax" | "errorNameRequired" | "errorPriceRequired" | "errorGeneric" | "errorImageUpload"> & { detail: Words<"customersWhoBought" | "notUsedYet"> };
  invoiceStatus: Record<string, string>;
  invoices: Words<"new" | "selectContact" | "fromCatalog" | "itemDescription" | "qty" | "unitPrice" | "addItem" | "discount" | "total" | "createInvoice" | "empty" | "currency" | "send" | "markPaid" | "errorContactRequired" | "errorItemDescriptionRequired" | "errorGeneric"> & {
    print: Words<"printPdf" | "downloadPdf" | "close" | "invoiceTitle" | "billTo" | "description" | "qty" | "unit" | "total" | "subtotal" | "tax" | "discount" | "grandTotal">;
  };
  contractStatus: Record<string, string>;
  contracts: Words<"restoreDefaults" | "manageTemplates" | "newContract" | "legalDisclaimer" | "selectContact" | "titlePlaceholder" | "noTemplate" | "contentPlaceholder" | "createContract" | "noTemplatesYet" | "edit" | "empty" | "send" | "markSigned" | "errorRequired" | "errorGeneric"> & {
    print: Words<"printPdf" | "downloadPdf" | "close" | "contact">;
    editModal: Words<"title" | "finalizedNotice" | "save">;
    templateEditModal: Words<"title" | "legalDisclaimer" | "namePlaceholder" | "save">;
  };
  projectStatus: Record<string, string>;
  projects: Words<"new" | "namePlaceholder" | "noContact" | "descriptionPlaceholder" | "createProject" | "empty" | "errorNameRequired" | "errorGeneric">;
};
export type CrmCopy = { dict: CrmDict; strings: Record<string, string>; labels: Record<string, Record<string, string>> };

export const REAL_ESTATE_MODULE_KEYS = ["crm.property", "crm.owner", "crm.viewingScheduler", "crm.contractCommission", "crm.shortTermCalendar", "crm.matchView", "crm.propertyDocuments", "crm.performanceReport", "agent.leadMatcher", "agent.listingCopywriter", "agent.viewingCoordinator", "agent.pricingAdvisor", "agent.agencyManager"];
/** CRM tabs that only exist for an enabled real-estate module (hidden, never greyed out). */
export const GATED_TABS: Record<string, string> = { properties: "crm.property", owners: "crm.owner", viewings: "crm.viewingScheduler", matches: "crm.matchView", performance: "crm.performanceReport" };
export const LEAD_SOURCES = ["manual", "instagram_dm", "referral", "walk_in", "website_form", "other"];
export const INDUSTRIES = ["real-estate", "construction", "clinic", "restaurant", "university", "ecommerce", "law-firm", "hotel", ""];

/** Falls back to the Persian name when a pipeline/stage has no translation. */
export function localizedName(item: { name: string; nameEn: string | null; nameDe: string | null }, lang: Locale): string {
  return lang === "en" ? (item.nameEn || item.name) : lang === "de" ? (item.nameDe || item.name) : item.name;
}
export const fmtMoney = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
export function formatNumber(n: number, lang?: string): string {
  const locale = lang === "en" ? "en-US" : lang === "de" ? "de-DE" : lang === "tr" ? "tr-TR" : "fa-IR";
  return new Intl.NumberFormat(locale).format(n);
}
const pick = (lang: Locale, fa: string, en: string, de: string, tr?: string) => (lang === "fa" ? fa : lang === "de" ? de : lang === "tr" ? (tr ?? en) : en);
/** Large money figures as people say them (main site lib/utils/compactAmount). */
export function compactAmount(n: number, lang: Locale): string {
  const v = Math.round(n);
  if (Math.abs(v) < 1_000_000) return formatNumber(v, lang);
  const billions = v / 1_000_000_000;
  if (Math.abs(billions) >= 1) return `${formatNumber(Math.round(billions * 10) / 10, lang)} ${pick(lang, "میلیارد", "B", "Mrd.", "B")}`;
  return `${formatNumber(Math.round(v / 100_000) / 10, lang)} ${pick(lang, "میلیون", "M", "Mio.", "M")}`;
}
export const toJalali = (date: Date | string) => new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", calendar: "persian" }).format(new Date(date));
export const dateLocale = (lang: Locale) => (lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : lang === "tr" ? "tr-TR" : "en-US");

export const CURRENCIES: { value: string; fa?: true; symbol: string }[] = [
  { value: "IRT", fa: true, symbol: "تومان" }, { value: "IRR", fa: true, symbol: "ریال" },
  { value: "USD", symbol: "$" }, { value: "GBP", symbol: "£" }, { value: "EUR", symbol: "€" }, { value: "TRY", symbol: "₺" },
];
export const defaultCurrencyForLang = (lang: Locale) => (lang === "fa" ? "IRT" : lang === "de" ? "EUR" : "USD");
/** Digits follow the currency, never the viewer's language; 0 means "no price set". */
export function fmtPrice(n: number, currency: string): string {
  if (!n) return "—";
  const opt = CURRENCIES.find((c) => c.value === currency);
  const formatted = new Intl.NumberFormat(opt?.fa ? "fa-IR" : "en-US").format(n);
  if (!opt) return formatted;
  return opt.fa ? `${formatted} ${opt.symbol}` : `${opt.symbol}${formatted}`;
}
export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
