"use client";
import Link from "@/components/site-link";
import { useShell } from "./live-shell-context";
import { LiveMediaLibrary, LiveStudio } from "./live-create";
import { LiveCharacters } from "./live-characters";
import { LiveVoice } from "./live-voice";
import { LiveFactory } from "./live-factory";
import { LiveCrm } from "./live-crm";
import { LiveAccounting } from "./live-accounting";
import { LiveSocial } from "./live-social";
import { LiveLeads } from "./live-leads";
import { LiveAdvisory } from "./live-advisory";
import { LiveWebsite } from "./live-website";
import { LiveReferral } from "./live-referral";
import { LiveStartup } from "./live-startup";
import { LiveSeo } from "./live-seo";
import { LiveCeo } from "./live-ceo";
import { LiveAgents } from "./live-agents";
import { LiveOrganization } from "./live-organization";
import { LiveCallCenter } from "./live-call-center";
import { LiveStudent } from "./live-student";
import { LiveFitness } from "./live-fitness";
import { LiveMarketplace } from "./live-marketplace";
import { LivePlay } from "./live-play";
import { LiveAcademy } from "./live-academy";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, SectionTitle, download } from "./ui";
import { Chat } from "./chat";
import { Factory } from "./factory";
import { Studio } from "./studio";
import { tools } from "@/mocks/catalog";
import { Learning } from "./learning";
import { FinanceWorkspace, financeViews } from "./finance-workspace";
import { Invoice } from "./business-detail";
import { CrmWorkspace, crmViews } from "./crm-workspace";
import { SocialWorkspace, socialViews } from "./social-workspace";
import { WebsiteWorkspace } from "./website-workspace";
import { StartupWorkspace } from "./startup-workspace";
import { SeoWorkspace, seoViews } from "./seo-workspace";
import { BillingAdmin } from "./billing-admin";
import { AdminFinance, AdminIndustryPacks } from './admin-finance';
import { FitnessWorkspace } from "./fitness-workspace";
import { VoiceAgentWorkspace } from "./voice-agent-workspace";
import { LeadsWorkspace } from "./leads-workspace";
import { WorkspaceFrame } from "./workspace-frame";
import { AdminCenter } from "./admin-center";
import { BusinessShell } from "./business-shell";
import { VoiceWorkspace } from "./voice-workspace";
import { OrganizationWorkspace } from "./organization-workspace";
import { StrategyWorkspace } from "./strategy-workspace";
import { StudentWorkspace } from "./student-workspace";
import { AcademyWorkspace } from "./academy-workspace";
import { MarketplaceWorkspace } from "./marketplace-workspace";
import { AdminCoursePreview } from './admin-course-preview';
import { AdminCourses } from './admin-courses';
import { AssessmentWorkspace } from './assessment-workspace';
import { OwnerWorkspace } from './owner-workspace';
import { ReferralWorkspace } from './referral-workspace';
import { MediaLibrary, LyricsWorkspace, CharacterWorkspace } from './media-library';
import { ArcadeWorkspace } from './arcade-workspace';
import { ProductionWorkspace } from './production-workspace';
import { CompetitorWorkspace, SeoSiteWorkspace, FinancialReportsWorkspace, PropertyKnowledge } from './business-utilities';
import {
  ModuleSpec,
  ViewSpec,
  allModules,
  moduleViewHref,
  resolveView,
} from "@/lib/upstream/registry";
import { examplePath, sourcePage } from "@/lib/upstream/coverage";
import modelData from "@/lib/upstream/models.json";
import fieldCopy from "@/lib/upstream/field-copy.json";

type Field = {
  name: string;
  type: string;
  optional: boolean;
  default?: string;
};
type Row = Record<string, string | number | boolean>;
const schemas = modelData as Record<string, Field[]>;
const labels = fieldCopy as Record<string, string[]>;
const common: Record<string, string[]> = {
  name: ["نام", "Name"],
  title: ["عنوان", "Title"],
  description: ["توضیحات", "Description"],
  status: ["وضعیت", "Status"],
  amount: ["مبلغ", "Amount"],
  value: ["مقدار", "Value"],
  phone: ["شماره تماس", "Phone"],
  email: ["ایمیل", "Email"],
  notes: ["یادداشت", "Notes"],
  currency: ["ارز", "Currency"],
  createdAt: ["تاریخ ایجاد", "Created"],
  updatedAt: ["آخرین تغییر", "Updated"],
  date: ["تاریخ", "Date"],
  goal: ["هدف", "Goal"],
  level: ["سطح", "Level"],
  age: ["سن", "Age"],
  heightCm: ["قد (سانتی‌متر)", "Height (cm)"],
  weightKg: ["وزن (کیلوگرم)", "Weight (kg)"],
  targetWeightKg: ["وزن هدف", "Target weight"],
  daysPerWeek: ["روز تمرین در هفته", "Days per week"],
  sessionMinutes: ["مدت جلسه (دقیقه)", "Session minutes"],
  trainingLocation: ["محل تمرین", "Training location"],
  equipment: ["تجهیزات", "Equipment"],
  limitations: ["محدودیت‌ها", "Limitations"],
  dietaryPreferences: ["ترجیحات غذایی", "Dietary preferences"],
  allergens: ["حساسیت‌های غذایی", "Allergens"],
  key: ["کلید تنظیم", "Setting key"],
  company: ["شرکت", "Company"],
  source: ["منبع", "Source"],
  tags: ["برچسب‌ها", "Tags"],
  price: ["قیمت", "Price"],
  quantity: ["تعداد", "Quantity"],
  budget: ["بودجه", "Budget"],
  prompt: ["دستور ساخت", "Prompt"],
  content: ["محتوا", "Content"],
  url: ["نشانی", "URL"],
  startDate: ["تاریخ شروع", "Start date"],
  endDate: ["تاریخ پایان", "End date"],
  dueDate: ["سررسید", "Due date"],
  accountCode: ["کد حساب", "Account code"],
  taxAmount: ["مبلغ مالیات", "Tax amount"],
  expenseDate: ["تاریخ هزینه", "Expense date"],
  receiptUrl: ["نشانی رسید", "Receipt URL"],
  kind: ["نوع", "Kind"],
  probability: ["احتمال موفقیت", "Probability"],
  expectedCloseDate: ["تاریخ پیش‌بینی بستن", "Expected close date"],
  commissionRate: ["درصد کمیسیون", "Commission rate"],
  commissionAmount: ["مبلغ کمیسیون", "Commission amount"],
  commissionPaymentStatus: [
    "وضعیت پرداخت کمیسیون",
    "Commission payment status",
  ],
  lostReason: ["دلیل از دست رفتن", "Lost reason"],
  sourceDetails: ["جزئیات منبع", "Source details"],
  totalSpent: ["مجموع خرید", "Total spent"],
  lastContact: ["آخرین تماس", "Last contact"],
  customFields: ["فیلدهای سفارشی", "Custom fields"],
  address: ["نشانی", "Address"],
  nationalId: ["کد ملی", "National ID"],
  businessName: ["نام کسب‌وکار", "Business name"],
  industry: ["صنعت", "Industry"],
  revenue: ["درآمد", "Revenue"],
  teamSize: ["اندازه تیم", "Team size"],
  challenge: ["چالش", "Challenge"],
  goals: ["اهداف", "Goals"],
  enabled: ["فعال", "Enabled"],
  isActive: ["فعال", "Active"],
  isPublic: ["عمومی", "Public"],
  slug: ["نشانی کوتاه", "Slug"],
  sortOrder: ["ترتیب", "Order"],
  duration: ["مدت", "Duration"],
  score: ["امتیاز", "Score"],
  progress: ["پیشرفت", "Progress"],
  role: ["نقش", "Role"],
  code: ["کد", "Code"],
  total: ["جمع کل", "Total"],
  body: ["متن", "Body"],
  message: ["پیام", "Message"],
  subject: ["موضوع", "Subject"],
  category: ["دسته‌بندی", "Category"],
  rate: ["نرخ", "Rate"],
  balance: ["مانده", "Balance"],
  debit: ["بدهکار", "Debit"],
  credit: ["بستانکار", "Credit"],
};
export function fieldLabel(name: string, fa: boolean) {
  const pair = common[name] || labels[name];
  const words: Record<string, string> = {
    crm: "مشتریان",
    accounting: "مالی",
    fitness: "ورزشی",
    student: "دانشجو",
    ai: "هوش مصنوعی",
    course: "دوره",
    contact: "مخاطب",
    deal: "فرصت فروش",
    task: "وظیفه",
    activity: "فعالیت",
    note: "یادداشت",
    document: "سند",
    invoice: "فاکتور",
    item: "ردیف",
    revision: "نسخه",
    contract: "قرارداد",
    template: "قالب",
    project: "پروژه",
    property: "ملک",
    booking: "رزرو",
    owner: "مالک",
    statement: "تسویه",
    entry: "سند",
    journal: "روزنامه",
    line: "ردیف",
    expense: "هزینه",
    vendor: "تأمین‌کننده",
    bank: "بانک",
    account: "حساب",
    transaction: "تراکنش",
    employee: "کارمند",
    payroll: "حقوق",
    run: "اجرا",
    payslip: "فیش حقوقی",
    budget: "بودجه",
    tax: "مالیات",
    rate: "نرخ",
    program: "برنامه",
    session: "جلسه",
    trainer: "مربی",
    product: "محصول",
    order: "سفارش",
    market: "بازار",
    seller: "فروشنده",
    ledger: "دفتر",
    verified: "تأییدشده",
    review: "نظر",
    application: "درخواست",
    availability: "دسترسی",
    member: "عضو",
    organization: "سازمان",
    business: "کسب‌وکار",
    workspace: "فضای کاری",
    team: "تیم",
    invite: "دعوت",
    user: "کاربر",
    payment: "پرداخت",
    package: "بسته",
    usage: "مصرف",
    log: "رویداد",
    error: "خطا",
    audit: "ممیزی",
    social: "اجتماعی",
    post: "پست",
    scheduled: "زمان‌بندی",
    instagram: "اینستاگرام",
    connection: "اتصال",
    content: "محتوا",
    seo: "سئو",
    research: "پژوهش",
    job: "پردازش",
    site: "سایت",
    snapshot: "وضعیت",
    voice: "صدا",
    agent: "دستیار",
    call: "تماس",
    appointment: "قرار",
    knowledge: "دانش",
    base: "پایه",
    video: "ویدیو",
    factory: "تولید",
    generation: "ساخت",
    generated: "تولیدشده",
    asset: "دارایی",
    resource: "منبع",
    artifact: "خروجی",
    quality: "کیفیت",
    report: "گزارش",
    provider: "ارائه‌دهنده",
    model: "مدل",
    pricing: "قیمت‌گذاری",
    prompt: "پرامپت",
    wallet: "کیف پول",
    payout: "برداشت",
    request: "درخواست",
    referral: "دعوت",
    code: "کد",
    alias: "نام مستعار",
    promotion: "تخفیف",
    redemption: "استفاده",
    billing: "صورتحساب",
    exchange: "تبدیل",
    credit: "اعتبار",
    tier: "سطح",
    module: "ماژول",
    registry: "فهرست",
    industry: "صنعت",
    pack: "بسته",
    flag: "وضعیت",
    override: "اختصاصی",
    subscription: "اشتراک",
    setting: "تنظیم",
    startup: "استارتاپ",
    inquiry: "درخواست",
    play: "بازی",
    game: "بازی",
    question: "سؤال",
    tournament: "مسابقه",
    profile: "پروفایل",
    achievement: "دستاورد",
    grant: "اعطا",
    reward: "پاداش",
    learning: "یادگیری",
    path: "مسیر",
    academic: "تحصیلی",
    major: "رشته",
    assessment: "ارزیابی",
    attempt: "تلاش",
    certificate: "گواهی",
    progress: "پیشرفت",
    lesson: "درس",
    material: "منبع",
    exam: "امتحان",
    quiz: "آزمون",
    flashcard: "فلش‌کارت",
    study: "مطالعه",
    group: "گروه",
    message: "پیام",
    lead: "سرنخ",
    form: "فرم",
    submission: "پاسخ",
    source: "منبع",
    commission: "کمیسیون",
    split: "سهم",
    management: "مدیریت",
    fee: "کارمزد",
    rule: "قانون",
    automation: "اتوماسیون",
    analysis: "تحلیل",
    insight: "بینش",
    interest: "علاقه",
    viewing: "بازدید",
    ceo: "مدیرعامل",
    plan: "برنامه",
    website: "وب‌سایت",
    id: "شناسه",
    assigned: "مسئول",
    to: "",
    selected: "انتخاب‌شده",
    preferred: "ترجیحی",
    coach: "مربی",
    consent: "رضایت",
    at: "زمان",
    entitlement: "عضویت",
    expiry: "پایان",
    config: "پیکربندی",
    version: "نسخه",
    storage: "ذخیره‌سازی",
    quota: "سهمیه",
    approval: "تأیید",
    custom: "اختصاصی",
    conversation: "گفتگو",
  };
  if (fa && !pair)
    return name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => words[w.toLowerCase()] ?? w)
      .filter(Boolean)
      .join(" ");
  return (
    pair?.[fa ? 0 : 1] ||
    name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")
  );
}
function editableFields(view: ViewSpec, model: string): Field[] {
  const fields = schemas[model] || [
    { name: "title", type: "String", optional: false },
    { name: "description", type: "String", optional: true },
    { name: "status", type: "String", optional: false },
  ];
  return view.fields
    ? view.fields.map(
        (name) =>
          fields.find((f) => f.name === name) || {
            name,
            type: "String",
            optional: true,
          },
      )
    : fields.filter(
        (f) =>
          ![
            "id",
            "createdAt",
            "updatedAt",
            "userId",
            "businessId",
            "workspaceUserId",
          ].includes(f.name) &&
          !/(?:token|secret|password|hash|apiKey)/i.test(f.name),
      );
}
function seedRows(model: string, fields: Field[], fa: boolean): Row[] {
  return [0, 1, 2].map((i) =>
    Object.fromEntries([
      ["id", `${model}-${i + 1}`],
      ...fields.map((f) => [
        f.name,
        f.type === "Boolean"
          ? i !== 2
          : /Int|Float|Decimal/.test(f.type)
            ? (i + 1) *
              (/amount|price|value|budget|salary/i.test(f.name) ? 1250000 : 5)
            : f.type === "DateTime"
              ? `2026-10-${24 + i}T10:00`
              : f.name === "status"
                ? ["draft", "active", "completed"][i]
                : f.name === "email"
                  ? `sample${i + 1}@example.com`
                  : f.default && !/[([]/.test(f.default)
                    ? f.default
                    : /title|name|description/i.test(f.name)
                      ? `Sample ${i + 1}`
                      : "",
      ]),
    ]),
  );
}
function useRecords(key: string, initial: Row[]) {
  const [rows, setRows] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(v)) setRows(v);
    } catch {}
    setReady(true);
  }, [key]);
  function save(next: Row[]) {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  return { rows, save, ready };
}

/** A module tab's address on aifekr.com; the image gallery has its own page there. */
function liveTabHref(module: ModuleSpec, view: ViewSpec) {
  if (module.id === "image" && view.id === "gallery") return "/image/gallery";
  return moduleViewHref(module, view);
}
export function ModuleWorkspace({
  module,
  path,
}: {
  module: ModuleSpec;
  path: string;
}) {
  const search = useSearchParams();
  const { fa, tl } = useApp();
  const live = !!useShell();
  const params = new URLSearchParams(search.toString());
  if (live && module.id === "image" && params.get("tab") === "character") params.set("tab", "characters");
  const view = resolveView(module, path, params);
  const detailRoute = sourcePage(path)?.route.includes("[");
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [view.id]);
  // On aifekr.com the CRM is the account's real CRM.
  if (live && module.id === "crm") return <LiveCrm module={module} view={view} />;
  if (live && module.id === "accounting") return <LiveAccounting module={module} view={view} />;
  if (live && module.id === "social") return <LiveSocial module={module} view={view} />;
  if (live && module.id === "leads") return <LiveLeads module={module} view={view} />;
  if (live && ["doctor","meeting"].includes(module.id)) return <LiveAdvisory module={module} view={view} />;
  if (live && module.id === "website") return <LiveWebsite module={module} view={view} />;
  if (live && module.id === "referral") return <LiveReferral module={module} view={view} />;
  if (live && module.id === "startup") return <LiveStartup module={module} view={view} />;
  if (live && module.id === "seo") return <LiveSeo module={module} view={view} />;
  if (live && module.id === "ceo") return <LiveCeo module={module} view={view} />;
  if (live && module.id === "agents") return <LiveAgents module={module} view={view} />;
  if (live && module.id === "organization") return <LiveOrganization module={module} view={view} />;
  if (live && module.id === "voice-agent") return <LiveCallCenter module={module} view={view} />;
  if (live && module.id === "learn") return <LiveAcademy module={module} view={view} />;
  if (live && module.id === "student") return <LiveStudent module={module} view={view} />;
  if (live && module.id === "fitness") return <LiveFitness module={module} view={view} />;
  if (live && module.id === "marketplace") return <LiveMarketplace module={module} view={view} />;
  if (live && module.id === "play") return <LivePlay module={module} view={view} />;
  if (["crm", "accounting"].includes(module.id))
    return (
      <BusinessShell module={module} view={view}>
        <ViewContent
          module={module}
          view={detailRoute ? { ...view, kind: "form" } : view}
        />
      </BusinessShell>
    );
  return (
    <div className={`module-workspace accent-${module.accent}`}>
      <SectionTitle
        title={tl(module.title[0], module.title[1])}
        subtitle={tl(module.subtitle[0], module.subtitle[1])}
      >
        <span className={`icon-chip ${module.accent}`}>
          <Icon name={module.icon} />
        </span>
      </SectionTitle>
      <nav
        className="module-tabs"
        ref={tabsRef}
        aria-label={tl("بخش‌های ماژول", "Module sections")}
      >
        {module.views.map((v) => (
          <Link
            key={v.id}
            href={live ? liveTabHref(module, v) : examplePath(moduleViewHref(module, v))}
            aria-current={view.id === v.id ? "page" : undefined}
            className={view.id === v.id ? "selected" : ""}
          >
            {tl(v.title[0], v.title[1])}
          </Link>
        ))}
      </nav>
      <WorkspaceFrame key={module.id + view.id} module={module} view={view}>
        {detailRoute && module.id === "student" && view.id === "overview" ? (
          <Learning path="/learn/courses/demo" />
        ) : detailRoute && module.id.includes("ai-courses") ? (
          <AdminCoursePreview id={decodeURIComponent(path.split('/')[3])}/>
        ) : (
          <ViewContent
            module={module}
            view={detailRoute ? { ...view, kind: "form" } : view}
          />
        )}
      </WorkspaceFrame>
    </div>
  );
}

function ViewContent({ module, view }: { module: ModuleSpec; view: ViewSpec }) {
  const { fa, tl } = useApp();
  // On aifekr.com the create modules show the account's real creations and generate for real.
  const live = !!useShell();
  if (live && ['image','video','music'].includes(module.id) && ['gallery','history'].includes(view.id)) return <LiveMediaLibrary type={module.id as 'image'|'video'|'music'}/>;
  if (live && ['image','video','music'].includes(module.id) && view.kind === 'studio') return <LiveStudio tool={tools.find((x) => x.slug === 'create/' + module.id)!}/>;
  if (live && module.id === 'image' && view.id === 'characters') return <LiveCharacters/>;
  if (live && module.id === 'voice') return <LiveVoice view={view.id}/>;
  if (live && module.id === 'factory') return <LiveFactory view={view.id}/>;
  if(module.id==='admin-ai-courses')return <AdminCourses view={view.id}/>;
  if(module.id==='admin-academy'&&view.id==='overview')return <AdminCourses view="overview"/>;
  if(module.id==='doctor')return <AssessmentWorkspace view={view.id}/>;
  if(module.id==='owner')return <OwnerWorkspace view={view.id}/>;
  if(module.id==='referral')return <ReferralWorkspace view={view.id}/>;
  if(['image','video','music'].includes(module.id)&&['gallery','history'].includes(view.id))return <MediaLibrary type={module.id}/>;
  if(module.id==='music'&&view.id==='lyrics')return <LyricsWorkspace/>;
  if(module.id==='image'&&view.id==='characters')return <CharacterWorkspace/>;
  if(module.id==='fitness'&&view.id==='trainers')return <MarketplaceWorkspace view="trainers"/>;
  if(module.id==='play')return <ArcadeWorkspace view={view.id}/>;
  if(module.id==='factory'&&!['production','script','timeline','edit'].includes(view.id))return <ProductionWorkspace view={view.id}/>;
  if(module.id==='social'&&view.id==='competitors')return <CompetitorWorkspace/>;
  if(module.id==='seo'&&['sites','verify'].includes(view.id))return <SeoSiteWorkspace view={view.id}/>;
  if(module.id==='accounting'&&view.id==='automation')return <FinancialReportsWorkspace/>;
  if(module.id==='voice-agent'&&view.id==='properties')return <PropertyKnowledge/>;
  if (module.id === "marketplace")
    return <MarketplaceWorkspace view={view.id} />;
  if (module.id === "admin-fitness-marketplace" && view.id === "overview")
    return <MarketplaceWorkspace view={view.id} admin />;
  if (module.id === "learn" && view.kind !== "chat")
    return <AcademyWorkspace view={view.id} />;
  if (module.id === "student" && view.kind !== "chat")
    return <StudentWorkspace view={view.id} />;
  if (module.id === "organization")
    return <OrganizationWorkspace view={view.id} />;
  if (["ceo", "agents", "meeting"].includes(module.id) && view.kind !== "chat")
    return <StrategyWorkspace module={module.id} view={view.id} />;
  if (module.id === "voice" && view.id !== "generate")
    return <VoiceWorkspace view={view.id} />;
  if (module.id === "admin-dashboard" && view.id === "overview")
    return <AdminCenter />;
  if (module.id === "leads" && view.kind !== "connections")
    return <LeadsWorkspace view={view.id} />;
  if (
    module.id === "voice-agent" &&
    ["agents", "setup", "knowledge", "calls", "appointments"].includes(view.id)
  )
    return <VoiceAgentWorkspace view={view.id} />;
  if (module.id === "fitness" && view.id !== "trainers")
    return <FitnessWorkspace view={view.id} />;
  if (module.id === "admin-packages") return <BillingAdmin view="plans" />;
  if (module.id === "admin-billing-promotions")
    return <BillingAdmin view="promotions" />;
  if (module.id === "admin-financial") return <AdminFinance section="payments" />;
  if (module.id === "admin-financial-customers") return view.id==='package'?<BillingAdmin view="plans"/>:<AdminFinance section="customers" />;
  if (module.id === "admin-financial-invoices-[id]") return <AdminFinance section="invoice" />;
  if (module.id === "admin-subscriptions") return view.id==='industry-pack'?<AdminIndustryPacks/>:<AdminFinance section="subscriptions" />;
  if (module.id === "admin-industry-packs") return <AdminIndustryPacks/>;
  if (module.id === "admin-credit-tiers") return <AdminFinance section="tiers" />;
  if (module.id === "admin-billing-rates") return <AdminFinance section="rates" />;
  if (module.id === "admin-revenue") return <AdminFinance section="revenue" />;
  if (module.id === "seo" && seoViews.includes(view.id))
    return <SeoWorkspace view={view.id} />;
  if (module.id === "accounting" && financeViews.includes(view.id))
    return <FinanceWorkspace view={view.id} />;
  if (module.id === "crm" && view.id === "invoices") return <Invoice />;
  if (module.id === "crm" && crmViews.includes(view.id))
    return <CrmWorkspace view={view.id} />;
  if (module.id === "social" && socialViews.includes(view.id))
    return <SocialWorkspace view={view.id} />;
  if (module.id === "website") return <WebsiteWorkspace view={view.id} />;
  if (module.id === "startup") return <StartupWorkspace view={view.id} />;
  if (view.kind === "chat") return <Chat persona={tl(module.title[0], module.title[1])} />;
  if (
    module.id === "factory" &&
    ["production", "script", "timeline", "edit"].includes(view.id)
  )
    return <Factory initialStep={view.id==='production'?undefined:view.id==='script'?1:2}/>;
  if (view.kind === "studio") {
    const slug = (
      {
        image: "create/image",
        video: "create/video",
        music: "create/music",
        voice: "create/voice",
        social: "business/social",
        seo: "business/seo",
      } as Record<string, string>
    )[module.id];
    const tool = tools.find((t) => t.slug === slug);
    if (tool) return <Studio tool={tool} />;
  }
  if (view.kind === "matrix") return <AccessMatrix module={module} />;
  if (view.kind === "connections")
    return <Connections module={module} view={view} />;
  if (view.kind === "game") return <Game />;
  if (view.kind === "gym") return <Gym />;
  if (view.kind === "quiz") return <Learning path="/student/quiz" />;
  if (view.kind === "flashcards")
    return <Learning path="/student/flashcards" />;
  if (view.kind === "inbox") return <Inbox module={module} view={view} />;
  if (view.kind === "timeline") return <Timeline module={module} view={view} />;
  return <DomainWorkspace module={module} view={view} />;
}

function DomainWorkspace({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa, t, n, tl } = useApp();
  const [model, setModel] = useState(view.model || "Record");
  const models = [view.model || "Record", ...(view.models || [])];
  return (
    <>
      <div
        className={module.group === "admin" ? "admin-resource-nav" : "chips"}
      >
        {models.length > 1 &&
          models.map((m) => (
            <button
              key={m}
              className={model === m ? "selected" : ""}
              onClick={() => setModel(m)}
            >
              {module.group === "admin" && (
                <Icon
                  name={m === view.model ? "LayoutDashboard" : "Layers"}
                  size={17}
                />
              )}
              {m === view.model ? tl(view.title[0], view.title[1]) : fieldLabel(m, fa)}
            </button>
          ))}
      </div>
      <DomainRecords
        key={module.id + view.id + model}
        module={module}
        view={view}
        model={model}
      />
    </>
  );
}

function DomainRecords({
  module,
  view,
  model,
}: {
  module: ModuleSpec;
  view: ViewSpec;
  model: string;
}) {
  const { fa, t, n, tl } = useApp();
  const fields = editableFields(view, model);
  const key = "aifekr-domain:" + model;
  const { rows, save } = useRecords(key, seedRows(model, fields, fa));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Row>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setDraft(JSON.parse(localStorage.getItem(key + ":form") || "{}"));
    } catch {}
    setLoaded(true);
  }, [key]);
  const titleField =
    fields.find((f) =>
      ["title", "name", "description", "key", "subject"].includes(f.name),
    )?.name ||
    fields[0]?.name ||
    "id";
  const visible = rows.filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || r.status === filter),
  );
  const columns = fields
    .filter(
      (f) => !["Json", "Boolean"].includes(f.type) && !f.name.endsWith("Id"),
    )
    .sort(
      (a, b) => Number(b.name === titleField) - Number(a.name === titleField),
    )
    .slice(0, 5);
  function submit(row: Row) {
    const next = { ...row, id: row.id || crypto.randomUUID() };
    save(
      rows.some((r) => r.id === next.id)
        ? rows.map((r) => (r.id === next.id ? next : r))
        : [next, ...rows],
    );
    setEdit(null);
    toast.success(
      tl("اطلاعات در این مرورگر ذخیره شد", "Saved in this browser"),
    );
  }
  const isForm = ["form", "editor", "wizard", "studio"].includes(view.kind);
  const steps = view.steps || [
    ["اطلاعات اصلی", "Details"],
    ["تنظیمات", "Configuration"],
    ["بررسی نهایی", "Review"],
  ];
  const groupSize = Math.ceil(fields.length / (steps.length - 1));
  const stepFields = fields.slice(step * groupSize, (step + 1) * groupSize);
  if (isForm)
    return (
      <div className="domain-editor">
        <div className="panel">
          {view.kind === "wizard" && (
            <ol className="wizard-steps">
              {steps.map((s, i) => (
                <li key={i} className={step === i ? "selected" : ""}>
                  <span>{n(i + 1)}</span>
                  {tl(s[0], s[1])}
                </li>
              ))}
            </ol>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (view.kind === "wizard" && step < steps.length - 1) {
                setStep(step + 1);
                return;
              }
              submit(draft);
              localStorage.setItem(key + ":form", JSON.stringify(draft));
            }}
          >
            {view.kind === "wizard" && step === steps.length - 1 ? (
              <dl className="domain-detail">
                {fields.map((f) => (
                  <div key={f.name}>
                    <dt>{fieldLabel(f.name, fa)}</dt>
                    <dd>{String(draft[f.name] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <FieldForm
                fields={view.kind === "wizard" ? stepFields : fields}
                value={draft}
                onChange={setDraft}
              />
            )}
            <div className="domain-actions">
              {step > 0 && (
                <Button onClick={() => setStep(step - 1)}>
                  {tl("مرحله قبل", "Back")}
                </Button>
              )}
              <Button type="submit" variant="primary" disabled={!loaded}>
                {view.kind === "wizard" && step < steps.length - 1
                  ? tl("مرحله بعد", "Continue")
                  : t("save")}
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem(key + ":form", JSON.stringify(draft));
                  toast.success(tl("پیش‌نویس ذخیره شد", "Draft saved"));
                }}
              >
                {tl("ذخیره پیش‌نویس", "Save draft")}
              </Button>
            </div>
          </form>
        </div>
        <aside className="panel domain-aside">
          <Icon name={module.icon} size={32} />
          <h3>{tl(view.title[0], view.title[1])}</h3>
          <p>{tl(module.subtitle[0], module.subtitle[1])}</p>
          <span className="badge">
            {tl("پیش‌نمایش محلی", "Local preview")}
          </span>
          <p>
            {tl("اطلاعات این بخش به صورت مستقل در مرورگر نگه‌داری می‌شود.", "This workspace stores its own data in your browser.")}
          </p>
          {view.cost && (
            <p>
              {tl("هزینه در سرویس اصلی", "Service credit cost")}:{" "}
              {n(view.cost)}
            </p>
          )}
        </aside>
      </div>
    );
  return (
    <>
      {["overview", "report"].includes(view.kind) && (
        <div className="stats-grid">
          {[
            [tl("کل رکوردها", "Total records"), rows.length],
            [
              tl("فعال", "Active"),
              rows.filter((r) => r.status === "active").length,
            ],
            [
              tl("پیش‌نویس", "Drafts"),
              rows.filter((r) => r.status === "draft").length,
            ],
            [
              tl("تکمیل‌شده", "Completed"),
              rows.filter((r) => r.status === "completed").length,
            ],
          ].map(([label, value]) => (
            <div className="panel stat" key={label}>
              <span>{label}</span>
              <strong>{n(Number(value))}</strong>
            </div>
          ))}
        </div>
      )}
      {view.kind === "report" && (
        <div className="panel">
          <h3>{tl("توزیع وضعیت رکوردها", "Record status distribution")}</h3>
          <div className="domain-bars">
            {["draft", "active", "completed"].map((status) => (
              <div key={status}>
                <span>{status}</span>
                <progress
                  max={Math.max(rows.length, 1)}
                  value={rows.filter((r) => r.status === status).length}
                />
                <span>{n(rows.filter((r) => r.status === status).length)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="domain-toolbar">
        <input
          aria-label={tl("جستجوی رکوردها", "Search records")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={tl("فیلتر وضعیت", "Status filter")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{tl("همه وضعیت‌ها", "All statuses")}</option>
          {["draft", "active", "completed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button variant="primary" onClick={() => setEdit({})}>
          <Icon name="Plus" size={16} />
          {t("add")}
        </Button>
        <Button
          onClick={() =>
            download(
              model + ".csv",
              "\ufeff" +
                [
                  fields.map((f) => fieldLabel(f.name, fa)),
                  ...visible.map((r) =>
                    fields.map((f) => String(r[f.name] ?? "")),
                  ),
                ]
                  .map((row) =>
                    row
                      .map((cell) => '"' + cell.replaceAll('"', '""') + '"')
                      .join(","),
                  )
                  .join("\r\n"),
              "text/csv;charset=utf-8",
            )
          }
        >
          {t("export")}
        </Button>
      </div>
      {!visible.length ? (
        <Empty onAction={() => setEdit({})} />
      ) : view.kind === "board" ? (
        <div className="domain-board">
          {["draft", "active", "completed"].map((status) => (
            <section className="panel" key={status}>
              <h3>
                {status}{" "}
                <span className="badge">
                  {n(visible.filter((r) => r.status === status).length)}
                </span>
              </h3>
              {visible
                .filter((r) => r.status === status)
                .map((r) => (
                  <article className="domain-card" key={String(r.id)}>
                    <button className="text-link" onClick={() => setDetail(r)}>
                      {String(r[titleField] || r.id)}
                    </button>
                    <select
                      aria-label={tl("انتقال به مرحله", "Move to stage")}
                      value={String(r.status)}
                      onChange={(e) =>
                        save(
                          rows.map((x) =>
                            x.id === r.id
                              ? { ...x, status: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      {["draft", "active", "completed"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : ["gallery", "course"].includes(view.kind) ? (
        <div className="tool-grid">
          {visible.map((r) => (
            <button
              className="panel domain-card"
              key={String(r.id)}
              onClick={() => setDetail(r)}
            >
              <span className={`icon-chip ${module.accent}`}>
                <Icon name={module.icon} size={32} />
              </span>
              <h3>{String(r[titleField] || r.id)}</h3>
              <p>{String(r.status || "")}</p>
              <span className="text-link">{t("preview")} ←</span>
            </button>
          ))}
        </div>
      ) : view.kind === "calendar" ? (
        <div className="panel domain-agenda">
          {visible.map((r) => (
            <button key={String(r.id)} onClick={() => setDetail(r)}>
              <Icon name="CalendarDays" />
              <strong>{String(r[titleField] || r.id)}</strong>
              <time>
                {String(
                  Object.entries(r).find(([k]) =>
                    /date|startAt|scheduledAt/i.test(k),
                  )?.[1] || "—",
                )}
              </time>
            </button>
          ))}
        </div>
      ) : (
        <div className="panel domain-table-wrap">
          <table className="domain-table">
            <thead>
              <tr>
                {columns.map((f) => (
                  <th key={f.name}>{fieldLabel(f.name, fa)}</th>
                ))}
                <th>{tl("عملیات", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={String(r.id)}>
                  {columns.map((f) => (
                    <td data-label={fieldLabel(f.name, fa)} key={f.name}>
                      {String(r[f.name] ?? "—")}
                    </td>
                  ))}
                  <td>
                    <div className="domain-actions">
                      <Button onClick={() => setDetail(r)}>
                        {t("preview")}
                      </Button>
                      <Button onClick={() => setEdit(r)}>
                        {tl("ویرایش", "Edit")}
                      </Button>
                      <Button onClick={() => setRemove(String(r.id))}>
                        {tl("حذف", "Delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal
          title={tl("ویرایش اطلاعات", "Edit record")}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(edit);
            }}
          >
            <FieldForm fields={fields} value={edit} onChange={setEdit} />
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal
          title={String(detail[titleField] || tl(view.title[0], view.title[1]))}
          onClose={() => setDetail(null)}
        >
          <dl className="domain-detail">
            {fields.map((f) => (
              <div key={f.name}>
                <dt>{fieldLabel(f.name, fa)}</dt>
                <dd>{String(detail[f.name] ?? "—")}</dd>
              </div>
            ))}
          </dl>
          <div className="domain-actions">
            <Button
              onClick={() => {
                setEdit(detail);
                setDetail(null);
              }}
            >
              {tl("ویرایش", "Edit")}
            </Button>
            <Button
              onClick={() =>
                download(
                  model + ".json",
                  JSON.stringify(detail, null, 2),
                  "application/json",
                )
              }
            >
              {t("export")}
            </Button>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal
          title={tl("حذف رکورد", "Delete record")}
          onClose={() => setRemove(null)}
        >
          <p>
            {tl("این رکورد از داده‌های محلی حذف شود؟", "Delete this record from local data?")}
          </p>
          <Button
            onClick={() => {
              save(rows.filter((r) => String(r.id) !== remove));
              setRemove(null);
            }}
          >
            {tl("تأیید حذف", "Confirm deletion")}
          </Button>
        </Modal>
      )}
    </>
  );
}

function FieldForm({
  fields,
  value,
  onChange,
}: {
  fields: Field[];
  value: Row;
  onChange: (r: Row) => void;
}) {
  const { fa, tl } = useApp();
  return (
    <div className="domain-fields">
      {fields.map((f) => {
        const label = fieldLabel(f.name, fa);
        const change = (v: string | boolean | number) =>
          onChange({ ...value, [f.name]: v });
        return (
          <label key={f.name}>
            {label}
            {f.type === "Boolean" ? (
              <input
                type="checkbox"
                checked={Boolean(value[f.name])}
                onChange={(e) => change(e.target.checked)}
              />
            ) : f.name.endsWith("Id") && f.name !== "nationalId" ? (
              <select
                value={String(value[f.name] ?? "")}
                onChange={(e) => change(e.target.value)}
              >
                <option value="">
                  {tl("انتخاب کنید", "Select an option")}
                </option>
                {[1, 2, 3].map((i) => (
                  <option key={i} value={"sample-" + i}>
                    {tl("نمونه", "Sample")} {i}
                  </option>
                ))}
              </select>
            ) : f.name === "status" ? (
              <select
                value={String(value[f.name] || "draft")}
                onChange={(e) => change(e.target.value)}
              >
                <option value="draft">{tl("پیش‌نویس", "Draft")}</option>
                <option value="active">{tl("فعال", "Active")}</option>
                <option value="completed">
                  {tl("تکمیل‌شده", "Completed")}
                </option>
                <option value="archived">{tl("بایگانی", "Archived")}</option>
              </select>
            ) : /Json/.test(f.type) ||
              /description|notes|content|script|prompt|body|message|goals|challenge|equipment|limitations|customFields/i.test(
                f.name,
              ) ? (
              <textarea
                rows={4}
                value={String(value[f.name] ?? "")}
                onChange={(e) => change(e.target.value)}
              />
            ) : (
              <input
                required={!f.optional && !f.default && !f.name.endsWith("Id")}
                type={
                  f.type === "DateTime"
                    ? "datetime-local"
                    : /Int|Float|Decimal|BigInt/.test(f.type)
                      ? "number"
                      : /email/i.test(f.name)
                        ? "email"
                        : "text"
                }
                step={/Float|Decimal/.test(f.type) ? "any" : undefined}
                value={String(value[f.name] ?? "")}
                onChange={(e) =>
                  change(
                    /Int|Float|Decimal|BigInt/.test(f.type) &&
                      e.target.value !== ""
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function AccessMatrix({ module }: { module: ModuleSpec }) {
  const { fa, t, tl } = useApp();
  const key = "aifekr-matrix:" + module.id;
  const [values, setValues] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setValues(JSON.parse(localStorage.getItem(key) || "{}"));
    } catch {}
  }, [key]);
  return (
    <div className="panel">
      <div className="domain-table-wrap">
        <table className="domain-table">
          <thead>
            <tr>
              <th>{tl("ماژول", "Module")}</th>
              {["view", "create", "edit", "delete"].map((a) => (
                <th key={a}>
                  {(
                    {
                      view: "مشاهده",
                      create: "ایجاد",
                      edit: "ویرایش",
                      delete: "حذف",
                    } as Record<string, string>
                  )[a] && fa
                    ? (
                        {
                          view: "مشاهده",
                          create: "ایجاد",
                          edit: "ویرایش",
                          delete: "حذف",
                        } as Record<string, string>
                      )[a]
                    : a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allModules
              .filter((m) => m.group !== "admin")
              .map((m) => (
                <tr key={m.id}>
                  <td>{tl(m.title[0], m.title[1])}</td>
                  {["view", "create", "edit", "delete"].map((a) => (
                    <td key={a}>
                      <input
                        type="checkbox"
                        aria-label={tl(m.title[0], m.title[1]) + " " + a}
                        checked={values[m.id + a] ?? a === "view"}
                        onChange={(e) =>
                          setValues({ ...values, [m.id + a]: e.target.checked })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="primary"
        onClick={() => {
          localStorage.setItem(key, JSON.stringify(values));
          toast.success(t("save"));
        }}
      >
        {t("save")}
      </Button>
    </div>
  );
}
function Connections({ module, view }: { module: ModuleSpec; view: ViewSpec }) {
  const { fa, t, tl } = useApp();
  const key = "aifekr-connections:" + module.id + view.id;
  const [value, setValue] = useState<Row>({});
  useEffect(() => {
    try {
      setValue(JSON.parse(localStorage.getItem(key) || "{}"));
    } catch {}
  }, [key]);
  return (
    <div className="panel">
      <span className="icon-chip blue">
        <Icon name="Globe" size={32} />
      </span>
      <h3>{tl(view.title[0], view.title[1])}</h3>
      <p>
        {tl("پیکربندی اتصال آزمایشی؛ هیچ حساب خارجی متصل نمی‌شود.", "Demo connection configuration. No external account is connected.")}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = { ...value, configured: true };
          setValue(next);
          localStorage.setItem(key, JSON.stringify(next));
          toast.success(
            tl("پیکربندی محلی ذخیره شد", "Local configuration saved"),
          );
        }}
      >
        <FieldForm
          fields={[
            { name: "name", type: "String", optional: false },
            { name: "url", type: "String", optional: false },
            { name: "notes", type: "String", optional: true },
          ]}
          value={value}
          onChange={setValue}
        />
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
        {value.configured && (
          <span className="badge">
            {tl("پیکربندی ذخیره‌شده", "Configuration saved")}
          </span>
        )}
      </form>
    </div>
  );
}
function Game() {
  const { fa, n, tl } = useApp();
  const [answer, setAnswer] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const a = round + 2,
    b = round + 3;
  return (
    <div className="panel play-card">
      <Icon name="BrainCircuit" size={56} />
      <h2>{tl("چالش ذهنی", "Brain challenge")}</h2>
      <p dir="ltr">
        {a} × {b} = ?
      </p>
      <div className="chips">
        {[a * b - 2, a * b, a * b + 3].map((v) => (
          <button
            disabled={answer !== null}
            key={v}
            onClick={() => setAnswer(v)}
          >
            {n(v)}
          </button>
        ))}
      </div>
      {answer !== null && (
        <>
          <p role="status">
            {answer === a * b
              ? tl("درست بود!", "Correct!")
              : (tl("پاسخ درست: ", "Correct answer: ")) + n(a * b)}
          </p>
          <Button
            onClick={() => {
              setRound(round + 1);
              setAnswer(null);
            }}
          >
            {tl("چالش بعدی", "Next challenge")}
          </Button>
        </>
      )}
    </div>
  );
}
function Gym() {
  const { fa, n, tl } = useApp();
  const [sets, setSets] = useState([false, false, false]);
  return (
    <div className="panel">
      <h2>{tl("جلسه تمرین امروز", "Today’s workout")}</h2>
      <p>{tl("اسکوات · ۳ ست × ۱۲ تکرار", "Squats · 3 sets × 12 reps")}</p>
      {sets.map((done, i) => (
        <label className="domain-card" key={i}>
          <input
            type="checkbox"
            checked={done}
            onChange={() => setSets(sets.map((v, j) => (j === i ? !v : v)))}
          />
          {tl("ست", "Set")} {n(i + 1)}
        </label>
      ))}
      <progress max={3} value={sets.filter(Boolean).length} />
      <Button
        onClick={() => {
          localStorage.setItem(
            "aifekr-workout",
            JSON.stringify({ sets, date: new Date().toISOString() }),
          );
          toast.success(tl("تمرین ثبت شد", "Workout saved"));
        }}
      >
        {tl("ثبت جلسه", "Save workout")}
      </Button>
    </div>
  );
}
function Inbox({ module, view }: { module: ModuleSpec; view: ViewSpec }) {
  const { fa, t, tl } = useApp();
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState("");
  const { rows, save } = useRecords("aifekr-inbox:" + module.id + view.id, [
    {
      id: "welcome",
      thread: 0,
      body: tl("سلام، برای شروع راهنمایی می‌خواهم.", "Hello, I would like help getting started."),
      direction: "in",
    },
  ]);
  return (
    <div className="domain-inbox">
      <aside className="panel">
        {[0, 1, 2].map((i) => (
          <button
            className={"domain-card " + (selected === i ? "selected" : "")}
            key={i}
            onClick={() => setSelected(i)}
          >
            {tl("گفتگو", "Conversation")} {i + 1}
          </button>
        ))}
      </aside>
      <div className="panel">
        <div className="domain-messages">
          {rows
            .filter((r) => r.thread === selected)
            .map((r) => (
              <p
                key={String(r.id)}
                className={
                  r.direction === "out" ? "message user" : "message assistant"
                }
              >
                {String(r.body)}
              </p>
            ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            save([
              ...rows,
              {
                id: crypto.randomUUID(),
                thread: selected,
                body: text,
                direction: "out",
              },
            ]);
            setText("");
            toast.success(
              tl("پاسخ در پیش‌نمایش محلی ثبت شد", "Reply saved to local preview"),
            );
          }}
        >
          <label>
            {tl("پاسخ آزمایشی", "Demo reply")}
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </label>
          <Button type="submit" variant="primary">
            {t("send")}
          </Button>
        </form>
      </div>
    </div>
  );
}
function Timeline({ module, view }: { module: ModuleSpec; view: ViewSpec }) {
  const { fa, n, tl } = useApp();
  const { rows, save } = useRecords("aifekr-timeline:" + module.id + view.id, [
    { id: "1", title: tl("شروع مسیر", "Getting started"), done: false },
    { id: "2", title: tl("تمرین و اجرا", "Practice and apply"), done: false },
    {
      id: "3",
      title: tl("ارزیابی و بازبینی", "Review and assess"),
      done: false,
    },
  ]);
  return (
    <div className="panel">
      <progress value={rows.filter((r) => r.done).length} max={rows.length} />
      {rows.map((r, i) => (
        <div className="domain-card domain-actions" key={String(r.id)}>
          <span className="badge">{n(i + 1)}</span>
          <label>
            <input
              type="checkbox"
              checked={Boolean(r.done)}
              onChange={(e) =>
                save(
                  rows.map((x) =>
                    x.id === r.id ? { ...x, done: e.target.checked } : x,
                  ),
                )
              }
            />{" "}
            {String(r.title)}
          </label>
          <Button
            disabled={i === 0}
            onClick={() => {
              const next = [...rows];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              save(next);
            }}
          >
            {tl("انتقال به بالا", "Move up")}
          </Button>
        </div>
      ))}
    </div>
  );
}
