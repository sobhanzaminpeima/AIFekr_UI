import sourceIndex from "./source-index.json";
export type Copy = [string, string];
export type ViewKind =
  | "overview"
  | "records"
  | "board"
  | "calendar"
  | "form"
  | "report"
  | "chat"
  | "wizard"
  | "inbox"
  | "gallery"
  | "studio"
  | "course"
  | "gym"
  | "quiz"
  | "flashcards"
  | "matrix"
  | "editor"
  | "timeline"
  | "connections"
  | "game";
export type ViewSpec = {
  id: string;
  title: Copy;
  kind: ViewKind;
  model?: string;
  models?: string[];
  fields?: string[];
  cost?: number;
  description?: Copy;
  steps?: Copy[];
  source?: string;
  detailTabs?: Copy[];
};
export type ModuleSpec = {
  id: string;
  base: string;
  title: Copy;
  subtitle: Copy;
  icon: string;
  accent: string;
  group:
    "create" | "business" | "learn" | "fit" | "account" | "admin" | "public";
  views: ViewSpec[];
  source: string;
  aliases?: string[];
  primary: Copy;
};
export const view = (
  id: string,
  fa: string,
  en: string,
  kind: ViewKind,
  model?: string,
  extra: Partial<ViewSpec> = {},
): ViewSpec => ({ id, title: [fa, en], kind, model, ...extra });
const v = view;
const src = (route: string) =>
  sourceIndex.find((p) => p.route === route)?.source || "";
const defineModule = (
  id: string,
  base: string,
  title: Copy,
  subtitle: Copy,
  icon: string,
  accent: string,
  group: ModuleSpec["group"],
  views: ViewSpec[],
  extra: Partial<ModuleSpec> = {},
): ModuleSpec => ({
  id,
  base,
  title,
  subtitle,
  icon,
  accent,
  group,
  views,
  source: src(base),
  primary: ["افزودن", "Add new"],
  ...extra,
});
export const modules: ModuleSpec[] = [
  defineModule(
    "crm",
    "/crm",
    ["روابط مشتریان", "Customer relationships"],
    [
      "از اولین آشنایی تا همکاری ماندگار.",
      "From your first hello to a lasting partnership.",
    ],
    "Users",
    "amber",
    "business",
    [
      v("board", "مسیر فروش", "Sales pipeline", "board", "CrmDeal", {
        models: ["CrmPipeline", "CrmStage", "CrmTask"],
      }),
      v("contacts", "مخاطبان", "Contacts", "records", "CrmContact", {
        detailTabs: [
          ["پروفایل", "Profile"],
          ["فرصت‌ها", "Deals"],
          ["وظایف", "Tasks"],
          ["فعالیت‌ها", "Activity"],
          ["یادداشت و فایل", "Notes & files"],
        ],
        models: ["CrmDeal", "CrmTask", "CrmActivity", "CrmNote", "CrmDocument"],
      }),
      v(
        "automation",
        "اتوماسیون",
        "Automation",
        "records",
        "CrmAutomationRule",
      ),
      v("agent", "دستیار فروش", "Sales assistant", "chat", "CrmInsight", {
        cost: 5,
        models: ["CrmAnalysisRun"],
      }),
      v("calendar", "تقویم تیم", "Team calendar", "calendar", "CrmTask"),
      v("analytics", "تحلیل فروش", "Sales analytics", "report", "CrmDeal"),
      v("products", "محصولات", "Products", "records", "CrmProduct"),
      v("invoices", "فاکتورها", "Invoices", "records", "CrmInvoice", {
        models: ["CrmInvoiceItem", "CrmInvoiceRevision"],
      }),
      v("contracts", "قراردادها", "Contracts", "records", "CrmContract", {
        models: ["CrmContractTemplate", "CrmContractRevision"],
      }),
      v("projects", "پروژه‌ها", "Projects", "board", "CrmProject"),
      v("properties", "ملک‌ها", "Properties", "gallery", "Property", {
        models: ["PropertyBooking", "CrmDocument"],
      }),
      v("owners", "مالکین", "Owners", "records", "CrmContact", {
        fields: ["name", "phone", "email", "address", "nationalId", "notes"],
        models: ["Property", "AccountingOwnerStatement"],
      }),
      v("viewings", "بازدیدها", "Viewings", "calendar", "PropertyViewing"),
      v(
        "matches",
        "تطبیق خریدار و ملک",
        "Buyer & property matching",
        "report",
        "PropertyInterest",
        { models: ["Property"] },
      ),
      v(
        "performance",
        "عملکرد مشاوران",
        "Agent performance",
        "report",
        "CrmDeal",
      ),
    ],
    {
      aliases: ["/business/crm", "/business/real-estate", "/sales"],
      primary: ["فرصت فروش جدید", "New opportunity"],
    },
  ),
  defineModule(
    "social",
    "/social",
    ["استودیوی شبکه‌های اجتماعی", "Social media studio"],
    [
      "محتوای بهتر، گفتگوی نزدیک‌تر.",
      "Create with purpose. Connect with people.",
    ],
    "Instagram",
    "pink",
    "business",
    [
      v(
        "publish",
        "حساب و انتشار",
        "Account & publishing",
        "overview",
        "ScheduledPost",
        { models: ["InstagramConnection"] },
      ),
      v("content", "ساخت محتوا", "Content studio", "studio", "SocialPost", {
        cost: 5,
      }),
      v(
        "analytics",
        "آمار و رشد",
        "Analytics & growth",
        "report",
        "InstagramFollowerSnapshot",
        { models: ["SocialCompetitorSnapshot"] },
      ),
      v(
        "messages",
        "صندوق پیام",
        "Instagram inbox",
        "inbox",
        "InstagramDirectMessageLog",
      ),
      v(
        "campaigns",
        "کامنت به دایرکت",
        "Comment-to-DM",
        "wizard",
        "InstagramCommentCampaign",
        {
          steps: [
            ["محرک", "Trigger"],
            ["پیام", "Message"],
            ["قوانین", "Rules"],
          ],
          models: ["InstagramCommentReplyLog"],
        },
      ),
      v(
        "direct-rules",
        "پاسخ خودکار دایرکت",
        "Direct reply rules",
        "records",
        "InstagramDirectRule",
      ),
      v("brand", "هویت برند", "Brand profile", "form", "SocialBrandProfile"),
      v(
        "competitors",
        "رقبای من",
        "Competitors",
        "records",
        "SocialCompetitor",
      ),
      v(
        "calendar",
        "تقویم محتوا",
        "Content calendar",
        "calendar",
        "ScheduledPost",
      ),
      v("queue", "صف انتشار", "Publishing queue", "records", "ScheduledPost"),
      v(
        "growth-report",
        "گزارش رشد هوشمند",
        "AI growth report",
        "wizard",
        "InstagramFollowerSnapshot",
        { cost: 10 },
      ),
      v(
        "connections",
        "اتصال و وبهوک",
        "Connections & webhooks",
        "connections",
        "InstagramConnection",
      ),
    ],
    { aliases: ["/business/social"], primary: ["ساخت پست", "Create a post"] },
  ),
  defineModule(
    "seo",
    "/seo",
    ["کارگاه سئو و محتوا", "SEO & content workspace"],
    [
      "از دادهٔ روشن، تا محتوای اثرگذار.",
      "From useful evidence to meaningful content.",
    ],
    "Search",
    "blue",
    "business",
    [
      v("overview", "نمای کلی", "Overview", "overview", "SeoSite"),
      v("url", "بررسی نشانی", "URL audit", "wizard", "SeoAudit", { cost: 5 }),
      v(
        "keyword",
        "پژوهش کلیدواژه",
        "Keyword research",
        "wizard",
        "SeoResearchJob",
        { cost: 8 },
      ),
      v("content", "نویسنده محتوا", "Content writer", "studio", "ContentPost", {
        cost: 10,
      }),
      v("meta", "عنوان و متا", "Title & meta", "editor", "SeoContentPlan"),
      v("sites", "وب‌سایت‌های من", "My websites", "records", "SeoSite", {
        source: src("/seo/sites"),
      }),
      v(
        "intelligence",
        "داده و رقابت",
        "SEO intelligence",
        "wizard",
        "SeoResearchJob",
        { source: src("/seo/intelligence"), cost: 12 },
      ),
      v("rankings", "پایش رتبه", "Rank tracking", "report", "SeoRankSnapshot"),
      v("backlinks", "بک‌لینک‌ها", "Backlinks", "report", "SeoResearchJob"),
      v(
        "competitors",
        "رقبای جستجو",
        "Search competitors",
        "wizard",
        "SeoResearchJob",
        { cost: 8 },
      ),
      v(
        "agent-pipeline",
        "تیم محتوای سئو",
        "SEO content team",
        "board",
        "ContentPipelineRun",
        {
          source: src("/seo/agent-pipeline"),
          models: ["ContentPipelineStep", "ContentAgentLesson", "ContentPost"],
        },
      ),
      v(
        "lessons",
        "حافظه و درس‌ها",
        "Agent lessons",
        "records",
        "ContentAgentLesson",
      ),
      v("posts", "کتابخانه محتوا", "Content library", "records", "ContentPost"),
      v("plan", "برنامه تولید محتوا", "Content plan", "form", "SeoContentPlan"),
      v(
        "wordpress",
        "اتصال وردپرس",
        "WordPress connection",
        "connections",
        "SeoConnection",
      ),
      v(
        "search-console",
        "کنسول جستجوی گوگل",
        "Google Search Console",
        "connections",
        "GscConnection",
      ),
      v(
        "verify",
        "تأیید مالکیت سایت",
        "Site verification",
        "wizard",
        "SeoSite",
      ),
    ],
    { aliases: ["/business/seo"], primary: ["پژوهش تازه", "New research"] },
  ),
  defineModule(
    "accounting",
    "/accounting",
    ["دفتر مالی", "Financial workspace"],
    [
      "هر عدد، بخشی از داستان کسب‌وکار تو.",
      "Clarity for every part of your business.",
    ],
    "Receipt",
    "amber",
    "business",
    [
      v(
        "overview",
        "نمای مالی",
        "Overview",
        "overview",
        "AccountingJournalEntry",
        { models: ["AccountingExpense", "CrmInvoice"] },
      ),
      v(
        "journal",
        "اسناد و آرتیکل‌ها",
        "Journal entries",
        "records",
        "AccountingJournalEntry",
        { models: ["AccountingJournalEntryLine"] },
      ),
      v(
        "accounts",
        "دفتر حساب‌ها",
        "Account ledger",
        "records",
        "AccountingAccount",
      ),
      v(
        "ledger-setup",
        "کدینگ، بودجه و مالیات",
        "Accounts, budgets & tax",
        "records",
        "AccountingAccount",
        {
          source: src("/accounting/ledger-setup"),
          models: ["AccountingBudget", "AccountingTaxRate"],
        },
      ),
      v(
        "expenses",
        "هزینه‌ها و تأمین‌کنندگان",
        "Expenses & vendors",
        "records",
        "AccountingExpense",
        { source: src("/accounting/expenses"), models: ["AccountingVendor"] },
      ),
      v(
        "bank",
        "بانک و تطبیق",
        "Bank & reconciliation",
        "records",
        "AccountingBankTransaction",
        { source: src("/accounting/bank"), models: ["AccountingBankAccount"] },
      ),
      v(
        "payroll",
        "حقوق و دستمزد",
        "Payroll",
        "records",
        "AccountingPayrollRun",
        {
          source: src("/accounting/payroll"),
          models: ["AccountingEmployee", "AccountingPayslip"],
        },
      ),
      v(
        "owner-statements",
        "تسویه با مالک",
        "Owner statements",
        "records",
        "AccountingOwnerStatement",
        {
          source: src("/accounting/owner-statements"),
          models: [
            "AccountingOwnerStatementEntry",
            "AccountingManagementFeeRule",
            "AccountingCommissionRecord",
            "AccountingCommissionSplit",
          ],
        },
      ),
      v(
        "close-period",
        "بستن دورهٔ مالی",
        "Close fiscal period",
        "wizard",
        "AccountingFiscalPeriod",
        { source: src("/accounting/close-period") },
      ),
      v(
        "assistant",
        "دستیار مالی",
        "AI finance assistant",
        "chat",
        "AccountingAiProposal",
        { source: src("/accounting/assistant"), cost: 5 },
      ),
      v(
        "automation",
        "گزارش خودکار و خروجی",
        "Scheduled reports & BI",
        "records",
        "AccountingScheduledReport",
        {
          source: src("/accounting/automation"),
          models: ["AccountingApiToken"],
        },
      ),
      v("budgets", "بودجه‌بندی", "Budgets", "records", "AccountingBudget"),
      v(
        "tax",
        "مالیات و ارزش افزوده",
        "Tax & VAT",
        "records",
        "AccountingTaxRate",
      ),
    ],
    {
      aliases: ["/business/accounting"],
      primary: ["ثبت سند مالی", "Record an entry"],
    },
  ),
  defineModule(
    "leads",
    "/lead-gen",
    ["رشد و جذب مشتری", "Lead generation"],
    [
      "هر ارتباط تازه، یک امکان تازه.",
      "Every new connection is a new possibility.",
    ],
    "Magnet",
    "amber",
    "business",
    [
      v("overview", "نمای جذب", "Overview", "overview", "LeadFormSubmission"),
      v("forms", "فرم‌های جذب", "Lead forms", "records", "LeadForm", {
        models: ["LeadFormSubmission"],
      }),
      v(
        "sources",
        "منابع و کانال‌ها",
        "Sources & channels",
        "records",
        "LeadSource",
      ),
      v(
        "inbox",
        "صندوق سرنخ‌ها",
        "Lead inbox",
        "records",
        "LeadFormSubmission",
      ),
      v(
        "reports",
        "تبدیل بر اساس کانال",
        "Channel conversion",
        "report",
        "LeadSource",
      ),
      v("builder", "سازندهٔ فرم", "Form builder", "editor", "LeadForm"),
      v(
        "connectors",
        "اتصال‌های تبلیغاتی",
        "Ad connectors",
        "connections",
        "LeadSource",
      ),
    ],
    { aliases: ["/business/leads"], primary: ["فرم تازه", "Create a form"] },
  ),
  defineModule(
    "voice-agent",
    "/voice-agent",
    ["مرکز تماس هوشمند", "AI call center"],
    [
      "یک پاسخ روشن، در اولین تماس.",
      "A thoughtful answer, from the first call.",
    ],
    "Phone",
    "purple",
    "business",
    [
      v("agents", "منشی‌ها", "Voice agents", "records", "VoiceAgent"),
      v("setup", "راه‌اندازی منشی", "Agent setup", "wizard", "VoiceAgent", {
        steps: [
          ["کسب‌وکار", "Business"],
          ["دانش", "Knowledge"],
          ["صدا و زمان", "Voice & schedule"],
          ["بررسی", "Review"],
        ],
      }),
      v(
        "knowledge",
        "دانش منشی",
        "Knowledge base",
        "records",
        "VoiceKnowledgeBase",
      ),
      v(
        "properties",
        "فایل‌های املاک",
        "Property knowledge",
        "records",
        "Property",
      ),
      v("calls", "گزارش تماس‌ها", "Call logs", "records", "VoiceCallLog"),
      v(
        "appointments",
        "قرارهای ثبت‌شده",
        "Appointments",
        "calendar",
        "VoiceAppointment",
      ),
      v(
        "numbers",
        "شماره‌ها و اتصال",
        "Numbers & connection",
        "connections",
        "VoiceAgent",
      ),
    ],
    {
      aliases: ["/business/voice-agent"],
      primary: ["منشی جدید", "New voice agent"],
    },
  ),
  defineModule(
    "doctor",
    "/business-doctor",
    ["دکتر کسب‌وکار", "Business doctor"],
    ["یک نگاه تازه، برای قدم بعدی.", "A fresh perspective for your next step."],
    "HeartPulse",
    "amber",
    "business",
    [
      v(
        "assessment",
        "ارزیابی کسب‌وکار",
        "Business assessment",
        "wizard",
        "BusinessAnalysis",
        {
          fields: [
            "businessName",
            "industry",
            "revenue",
            "teamSize",
            "challenge",
            "goals",
          ],
          cost: 10,
        },
      ),
      v(
        "swot",
        "قوت‌ها و فرصت‌ها",
        "SWOT analysis",
        "report",
        "BusinessAnalysis",
      ),
      v("action-plan", "برنامهٔ اقدام", "Action plan", "board", "CeoTask"),
      v(
        "kpis",
        "شاخص‌های پیشنهادی",
        "Recommended KPIs",
        "report",
        "BusinessAnalysis",
      ),
      v(
        "history",
        "ارزیابی‌های قبلی",
        "Assessment history",
        "records",
        "BusinessAnalysis",
      ),
    ],
    {
      aliases: ["/business/doctor"],
      primary: ["ارزیابی تازه", "New assessment"],
    },
  ),
  defineModule(
    "ceo",
    "/ceo",
    ["اتاق فرمان مدیرعامل", "CEO workspace"],
    [
      "فکر بزرگ را به قدم‌های روشن تبدیل کن.",
      "Turn a big ambition into clear next steps.",
    ],
    "BrainCircuit",
    "amber",
    "business",
    [
      v("advisor", "مشاور استراتژیک", "Strategic adviser", "chat", "CeoTask", {
        cost: 5,
      }),
      v(
        "orchestrator",
        "هماهنگ‌کنندهٔ تیم",
        "Team orchestrator",
        "board",
        "OrchestratorAction",
        {
          source: src("/ceo/orchestrator"),
          models: ["CeoTask", "BusinessMemory"],
        },
      ),
      v("goals", "هدف‌های من", "My goals", "records", "CeoTask"),
      v(
        "approvals",
        "اقدام‌های منتظر تأیید",
        "Awaiting approvals",
        "records",
        "OrchestratorAction",
      ),
      v(
        "memory",
        "حافظهٔ کسب‌وکار",
        "Business memory",
        "records",
        "BusinessMemory",
      ),
      v(
        "knowledge",
        "دانش کسب‌وکار",
        "Knowledge documents",
        "records",
        "KbDocument",
      ),
    ],
    { aliases: ["/business/ceo"], primary: ["هدف تازه", "New goal"] },
  ),
  defineModule(
    "agents",
    "/agents",
    ["تیم هوش مصنوعی", "AI agent team"],
    [
      "نقش‌های متفاوت؛ یک هدف مشترک.",
      "Different strengths. One shared ambition.",
    ],
    "Bot",
    "purple",
    "business",
    [
      v("overview", "اعضای تیم", "Team members", "gallery", "CeoTask"),
      v(
        "industry",
        "دستیاران صنفی",
        "Industry agents",
        "gallery",
        "IndustryPack",
      ),
      v("runs", "گزارش اجراها", "Run history", "records", "OrchestratorAction"),
      v("create", "راه‌اندازی دستیار", "Set up an assistant", "form", "CustomAiProvider"),
    ],
  ),
  defineModule(
    "meeting",
    "/meeting",
    ["اتاق مشاوران", "Advisory room"],
    [
      "یک موضوع، چند زاویهٔ دید.",
      "One challenge. A fresh set of perspectives.",
    ],
    "MessagesSquare",
    "purple",
    "business",
    [
      v("room", "جلسهٔ تازه", "New meeting", "wizard", "BoardroomSession", {
        cost: 15,
        steps: [
          ["موضوع", "Topic"],
          ["مشاوران", "Advisers"],
          ["گفتگو", "Conversation"],
          ["جمع‌بندی", "Summary"],
        ],
      }),
      v(
        "history",
        "جلسات من",
        "Meeting history",
        "records",
        "BoardroomSession",
      ),
    ],
  ),
  defineModule(
    "website",
    "/website-designer",
    ["طراح وب‌سایت", "Website designer"],
    ["فکر تو، خانهٔ تازهٔ برندت.", "A new home for your brand."],
    "PanelsTopLeft",
    "blue",
    "business",
    [
      v(
        "projects",
        "وب‌سایت‌های من",
        "My websites",
        "gallery",
        "GeneratedWebsite",
      ),
      v("brief", "شرح پروژه", "Project brief", "wizard", "GeneratedWebsite", {
        cost: 20,
      }),
      v(
        "preview",
        "پیش‌نمایش و بخش‌ها",
        "Preview & sections",
        "editor",
        "GeneratedWebsite",
      ),
      v(
        "code",
        "کد و دریافت فایل",
        "Code & download",
        "editor",
        "GeneratedWebsite",
      ),
    ],
    {
      aliases: ["/business/website"],
      primary: ["وب‌سایت تازه", "New website"],
    },
  ),
  defineModule(
    "startup",
    "/startup/builder",
    ["از فکر تا استارتاپ", "Startup builder"],
    ["ایده را روشن کن. مسیر را بساز.", "Find the idea. Shape the journey."],
    "Rocket",
    "orange",
    "business",
    [
      v("idea", "ایده و مسئله", "Idea & problem", "wizard", "StartupProject", {
        cost: 10,
      }),
      v("canvas", "بوم ناب", "Lean canvas", "editor", "StartupProject"),
      v("mvp", "مسیر محصول اولیه", "MVP roadmap", "board", "StartupProject"),
      v(
        "pitch",
        "ارائهٔ سرمایه‌گذار",
        "Pitch deck",
        "editor",
        "StartupProject",
      ),
      v(
        "contact",
        "ارتباط با تیم متخصص",
        "Expert implementation",
        "form",
        "StartupInquiry",
        { source: src("/startup/contact") },
      ),
      v("projects", "پروژه‌های من", "My projects", "records", "StartupProject"),
    ],
    { aliases: ["/business/startup"] },
  ),
  defineModule(
    "organization",
    "/organization/onboarding",
    ["فضای کسب‌وکار و تیم", "Business & team workspace"],
    [
      "یک فضای مشترک برای کارهای بزرگ.",
      "A shared space for your next big thing.",
    ],
    "Building2",
    "amber",
    "business",
    [
      v(
        "identity",
        "هویت کسب‌وکار",
        "Business identity",
        "wizard",
        "Organization",
        { models: ["BusinessWorkspace"] },
      ),
      v(
        "workspaces",
        "کسب‌وکارهای من",
        "My businesses",
        "records",
        "BusinessWorkspace",
      ),
      v("members", "اعضای تیم", "Team members", "records", "BusinessMember"),
      v("invites", "دعوت همکاران", "Team invitations", "records", "TeamInvite"),
      v(
        "roles",
        "نقش‌ها و دسترسی",
        "Roles & permissions",
        "matrix",
        "BusinessMember",
      ),
      v(
        "modules",
        "ماژول‌های فعال",
        "Active modules",
        "matrix",
        "OrganizationFeatureFlag",
      ),
      v(
        "audit",
        "رویدادهای تیم",
        "Team activity",
        "records",
        "OrganizationAuditLog",
      ),
    ],
    { aliases: ["/business/organization"] },
  ),
  defineModule(
    "student",
    "/student",
    ["فضای یادگیری تو", "Your learning workspace"],
    [
      "کنجکاوی امروز، توانایی فردا.",
      "Today’s curiosity. Tomorrow’s confidence.",
    ],
    "GraduationCap",
    "blue",
    "learn",
    [
      v("overview", "نمای کلی", "Overview", "overview", "StudentCourse", {
        models: ["StudentExam", "StudentTask", "StudentStudySession"],
      }),
      v("courses", "درس‌های من", "My subjects", "gallery", "StudentCourse"),
      v(
        "upload",
        "جزوه و منابع",
        "Materials & uploads",
        "records",
        "StudentMaterial",
      ),
      v("notes", "یادداشت‌ها", "Notes", "editor", "StudentNote"),
      v(
        "practice",
        "تمرین و آزمون",
        "Practice & quizzes",
        "quiz",
        "StudentQuiz",
        { models: ["StudentQuizAttempt"] },
      ),
      v(
        "review",
        "فلش‌کارت و مرور",
        "Flashcards & review",
        "flashcards",
        "StudentFlashcard",
      ),
      v(
        "planner",
        "برنامه و امتحان‌ها",
        "Planner & exams",
        "calendar",
        "StudentTask",
        { models: ["StudentExam"] },
      ),
      v(
        "groups",
        "گروه‌های مطالعه",
        "Study groups",
        "inbox",
        "StudentStudyGroup",
        { models: ["StudentStudyGroupMember", "StudentStudyGroupMessage"] },
      ),
      v(
        "reports",
        "گزارش مطالعه و زمان‌سنج",
        "Timer & study reports",
        "report",
        "StudentStudySession",
      ),
      v(
        "thesis",
        "دستیار پایان‌نامه",
        "Thesis assistant",
        "wizard",
        "StudentNote",
        { cost: 5 },
      ),
      v(
        "assignment",
        "دستیار تکلیف",
        "Assignment helper",
        "wizard",
        "StudentNote",
        { cost: 3 },
      ),
      v(
        "profile",
        "پروفایل دانشجو",
        "Student profile",
        "form",
        "StudentAcademicProfile",
      ),
      v(
        "business",
        "کسب‌وکار دانشجویی",
        "Student business tools",
        "overview",
        "BusinessWorkspace",
      ),
      v("chat", "گفتگو با مدرس", "AI tutor", "chat", "Conversation", {
        source: src("/student/chat"),
        cost: 2,
      }),
      v("path", "مسیر یادگیری", "Learning path", "timeline", "StudentCourse"),
    ],
    { primary: ["افزودن درس", "Add a subject"] },
  ),
  defineModule(
    "learn",
    "/learn",
    ["آکادمی آی‌فکر", "AIFekr academy"],
    ["به یادگیری‌ات، مسیر بده.", "Give your curiosity a direction."],
    "BookOpen",
    "blue",
    "learn",
    [
      v("catalogue", "کشف دوره‌ها", "Explore courses", "gallery", "AiCourse"),
      v("lesson", "درس و تمرین", "Lesson player", "course", "AiCourse", {
        models: ["AiCourseProgress", "AiCourseLessonNote"],
      }),
      v(
        "paths",
        "مسیرهای یادگیری",
        "Learning paths",
        "timeline",
        "AcademyLearningPath",
      ),
      v("tutor", "دستیار درس", "Course tutor", "chat", "Conversation", {
        cost: 2,
      }),
      v(
        "notes",
        "یادداشت‌های درس",
        "Lesson notes",
        "editor",
        "AiCourseLessonNote",
      ),
      v(
        "assessment",
        "آزمون پایانی",
        "Final assessment",
        "quiz",
        "AiCourseAssessmentAttempt",
      ),
      v(
        "certificates",
        "گواهی‌ها و دستاوردها",
        "Certificates & achievements",
        "gallery",
        "AiCourseCertificate",
      ),
      v(
        "profile",
        "پروفایل تحصیلی",
        "Academic profile",
        "form",
        "StudentAcademicProfile",
      ),
    ],
    { primary: ["ادامهٔ یادگیری", "Continue learning"] },
  ),
  defineModule(
    "fitness",
    "/fitness",
    ["فیتنس آی‌فکر", "AIFekr FIT"],
    ["هر روز، کمی قوی‌تر.", "A little stronger, every day."],
    "Dumbbell",
    "lime",
    "fit",
    [
      v("overview", "نمای کلی", "Overview", "overview", "FitnessProfile", {
        models: ["FitnessSession", "FitnessProgram"],
      }),
      v("trainers", "مربی‌ها", "Coaches", "gallery", "FitnessTrainer"),
      v(
        "programs",
        "برنامه‌های تمرین",
        "Workout programs",
        "gallery",
        "FitnessProgram",
        { cost: 5 },
      ),
      v("gym", "حالت باشگاه", "Gym mode", "gym", "FitnessSession", {
        models: ["FitnessSetLog", "FitnessExercise"],
      }),
      v(
        "nutrition",
        "تغذیه و یادداشت روزانه",
        "Nutrition & diary",
        "records",
        "FitnessDiary",
      ),
      v(
        "history",
        "تاریخچهٔ تمرین",
        "Workout history",
        "records",
        "FitnessSession",
      ),
      v(
        "profile",
        "پروفایل ورزشی",
        "Fitness profile",
        "form",
        "FitnessProfile",
      ),
      v(
        "reports",
        "گزارش پیشرفت",
        "Progress reports",
        "report",
        "FitnessSession",
      ),
      v("plans", "عضویت فیتنس", "FIT membership", "gallery", "Package"),
      v(
        "athlete-card",
        "کارت ورزشکار",
        "Athlete card",
        "editor",
        "FitnessProfile",
      ),
    ],
    {
      aliases: [
        "/fit/dashboard",
        "/fit/workouts",
        "/fit/coach",
        "/fit/nutrition",
      ],
      primary: ["شروع تمرین", "Start workout"],
    },
  ),
  defineModule(
    "marketplace",
    "/fitness/marketplace",
    ["بازار مربیان و رزرو", "Coaches & marketplace"],
    ["مربی و برنامهٔ مناسب مسیر تو.", "Find your kind of coach."],
    "UsersRound",
    "lime",
    "fit",
    [
      v("trainers", "مربیان", "Coaches", "gallery", "FitnessTrainer"),
      v(
        "store",
        "فروشگاه برنامه‌ها",
        "Programme store",
        "gallery",
        "FitnessProduct",
      ),
      v(
        "slots",
        "وقت‌های مشاوره",
        "Book a session",
        "calendar",
        "FitnessAvailability",
        { models: ["FitnessBooking"] },
      ),
      v("orders", "سفارش‌های من", "My orders", "records", "FitnessMarketOrder"),
      v(
        "apply",
        "درخواست مربیگری",
        "Become a coach",
        "wizard",
        "FitnessTrainerApplication",
      ),
      v(
        "seller",
        "پنل فروشنده",
        "Seller workspace",
        "records",
        "FitnessSellerLedger",
        {
          models: [
            "FitnessProduct",
            "FitnessAvailability",
            "FitnessBooking",
            "FitnessVerifiedReview",
          ],
        },
      ),
      v(
        "reviews",
        "نظرهای تأییدشده",
        "Verified reviews",
        "records",
        "FitnessVerifiedReview",
      ),
    ],
    { aliases: ["/fit/coaches"] },
  ),
  defineModule(
    "image",
    "/image/generate",
    ["استودیوی تصویر", "Image studio"],
    ["هرچه تصور کنی، به تصویر بکش.", "Give your imagination a canvas."],
    "Image",
    "orange",
    "create",
    [
      v(
        "generate",
        "ساخت تصویر",
        "Generate image",
        "studio",
        "GeneratedImage",
        { cost: 12 },
      ),
      v(
        "reference",
        "تصویر مرجع",
        "Image reference",
        "studio",
        "GeneratedImage",
        { cost: 12 },
      ),
      v(
        "characters",
        "طراحی شخصیت",
        "Character creation",
        "editor",
        "GeneratedImage",
      ),
      v(
        "gallery",
        "گالری تصاویر",
        "Image gallery",
        "gallery",
        "GeneratedImage",
        { source: src("/image/gallery") },
      ),
    ],
    { aliases: ["/create/image"], primary: ["تصویر تازه", "New image"] },
  ),
  defineModule(
    "video",
    "/video/generate",
    ["استودیوی ویدیو", "Video studio"],
    ["به ایده‌هایت حرکت بده.", "Put your ideas in motion."],
    "Clapperboard",
    "blue",
    "create",
    [
      v(
        "generate",
        "ساخت ویدیو",
        "Generate video",
        "studio",
        "GeneratedVideo",
        { cost: 45 },
      ),
      v(
        "reference",
        "تصویر به ویدیو",
        "Image to video",
        "studio",
        "GeneratedVideo",
        { cost: 45 },
      ),
      v("history", "ویدیوهای من", "My videos", "gallery", "GeneratedVideo"),
    ],
    { aliases: ["/create/video"] },
  ),
  defineModule(
    "music",
    "/music/generate",
    ["استودیوی موسیقی", "Music studio"],
    ["آهنگ لحظهٔ بعدی تو.", "A soundtrack for your next little moment."],
    "Music2",
    "pink",
    "create",
    [
      v(
        "generate",
        "ساخت موسیقی",
        "Generate music",
        "studio",
        "GeneratedMusic",
        { cost: 20 },
      ),
      v(
        "lyrics",
        "ترانه و بی‌کلام",
        "Lyrics & instrumental",
        "editor",
        "GeneratedMusic",
      ),
      v("history", "آهنگ‌های من", "My tracks", "gallery", "GeneratedMusic"),
    ],
    { aliases: ["/create/music"] },
  ),
  defineModule(
    "voice",
    "/voice-studio",
    ["استودیوی صدا", "Voice studio"],
    ["به کلمه‌هایت صدای تازه بده.", "Find the voice for your next story."],
    "AudioLines",
    "purple",
    "create",
    [
      v(
        "text",
        "متن و بخش‌بندی",
        "Script & segments",
        "editor",
        "VoiceStudioProject",
      ),
      v(
        "voice",
        "کتابخانه صدا",
        "Voice library",
        "gallery",
        "VoiceStudioProject",
      ),
      v(
        "generate",
        "ساخت و شنیدن",
        "Generate & listen",
        "studio",
        "VoiceStudioGeneration",
        { cost: 8 },
      ),
      v(
        "projects",
        "پروژه‌های صوتی",
        "Voice projects",
        "records",
        "VoiceStudioProject",
      ),
      v(
        "presets",
        "تنظیمات ذخیره‌شده",
        "Saved voice presets",
        "form",
        "VoiceStudioProject",
      ),
      v(
        "history",
        "فایل‌های صوتی",
        "Audio files",
        "records",
        "VoiceStudioGeneration",
      ),
      v("archive", "بایگانی", "Archive", "records", "VoiceStudioProject"),
    ],
    { aliases: ["/create/voice"] },
  ),
  defineModule(
    "factory",
    "/video-factory",
    ["کارخانهٔ ویدیو", "Video factory"],
    [
      "از اولین جرقه تا آخرین نما.",
      "From your first spark to the final frame.",
    ],
    "Film",
    "orange",
    "create",
    [
      v(
        "projects",
        "پروژه‌های من",
        "My projects",
        "gallery",
        "VideoFactoryProject",
      ),
      v(
        "production",
        "تولید فصل‌به‌فصل",
        "Production",
        "wizard",
        "VideoFactoryProject",
        { cost: 120, models: ["VideoFactoryJob", "VideoFactoryStep"] },
      ),
      v(
        "ideas",
        "ایده و منابع",
        "Ideas & sources",
        "editor",
        "VideoFactoryProject",
      ),
      v(
        "script",
        "متن و استوری‌بورد",
        "Script & storyboard",
        "editor",
        "VideoFactoryProject",
      ),
      v(
        "characters",
        "شخصیت و پیوستگی",
        "Characters & continuity",
        "editor",
        "VideoFactoryResource",
      ),
      v("timeline", "تایم‌لاین", "Timeline", "timeline", "VideoFactoryStep"),
      v("edit", "ویرایش نماها", "Edit shots", "editor", "VideoFactoryProject"),
      v(
        "library",
        "کتابخانهٔ دارایی‌ها",
        "Asset library",
        "gallery",
        "VideoFactoryAsset",
      ),
      v(
        "assets",
        "خروجی‌ها",
        "Deliverables",
        "gallery",
        "VideoFactoryArtifact",
      ),
      v(
        "publishing",
        "انتشار و زمان‌بندی",
        "Publishing",
        "form",
        "VideoFactoryPublishJob",
        { models: ["VideoFactoryChannel"] },
      ),
      v(
        "advanced",
        "صدا و کیفیت",
        "Audio & quality",
        "form",
        "VideoFactoryQualityReport",
      ),
      v(
        "history",
        "نسخه‌ها و بازگردانی",
        "Versions & restore",
        "records",
        "VideoFactoryVersion",
      ),
      v("packages", "پکیج‌های تولید", "Video packages", "gallery", "Package"),
    ],
    { aliases: ["/create/video-factory"] },
  ),
  defineModule(
    "play",
    "/play",
    ["زمین بازی آی‌فکر", "AIFekr arcade"],
    [
      "کمی بازی، کمی کشف، کمی پیشرفت.",
      "Play a little. Discover something new.",
    ],
    "Shapes",
    "purple",
    "create",
    [
      v("arcade", "بازی‌ها", "Arcade", "game", "PlayGame"),
      v("profile", "پروفایل بازی من", "Player profile", "form", "PlayProfile"),
      v("rankings", "رتبه‌بندی", "Leaderboard", "records", "PlayProfile"),
      v("history", "تاریخچه من", "My history", "records", "PlaySession"),
      v(
        "achievements",
        "دستاوردها",
        "Achievements",
        "gallery",
        "PlayAchievementGrant",
      ),
      v(
        "competitions",
        "مسابقه‌ها و پاداش‌ها",
        "Competitions & rewards",
        "gallery",
        "PlayTournament",
        { models: ["PlayTournamentEntry", "PlayRewardGrant"] },
      ),
    ],
  ),
  defineModule(
    "referral",
    "/referral",
    ["دعوت و درآمد", "Invite & earn"],
    ["فکرهای خوب را با دیگران قسمت کن.", "Good ideas deserve good company."],
    "Gift",
    "orange",
    "account",
    [
      v(
        "invite",
        "دعوت دوستان",
        "Invite friends",
        "editor",
        "ReferralCodeAlias",
      ),
      v("stats", "آمار دعوت‌ها", "Referral statistics", "report", "User"),
      v(
        "wallet",
        "کیف پول درآمد",
        "Earnings wallet",
        "overview",
        "WalletTransaction",
      ),
      v(
        "transactions",
        "تراکنش‌ها",
        "Transactions",
        "records",
        "WalletTransaction",
      ),
      v(
        "payout",
        "درخواست برداشت",
        "Request a payout",
        "form",
        "WalletPayoutRequest",
      ),
    ],
  ),
  defineModule(
    "owner",
    "/owner",
    ["فضای مالک", "Owner portal"],
    [
      "وضعیت ملک و تسویه‌ها، در یک نگاه.",
      "Your properties and statements, at a glance.",
    ],
    "Building2",
    "amber",
    "account",
    [
      v(
        "statements",
        "گزارش‌های تسویه",
        "Owner statements",
        "records",
        "AccountingOwnerStatement",
        { models: ["AccountingOwnerStatementEntry"] },
      ),
      v("properties", "ملک‌های من", "My properties", "gallery", "Property"),
      v(
        "bookings",
        "تقویم رزروها",
        "Booking calendar",
        "calendar",
        "PropertyBooking",
      ),
    ],
  ),
];

export const adminDefinitions: [string, string, string, string, string[]?][] = [
  [
    "dashboard",
    "داشبورد مدیریت",
    "Admin overview",
    "overview",
    ["Payment", "User", "UsageLog"],
  ],
  ["users", "کاربران", "Users", "records", ["User"]],
  [
    "users/[id]",
    "پروندهٔ کاربر",
    "User detail",
    "records",
    [
      "User",
      "Payment",
      "WalletTransaction",
      "Conversation",
      "OrganizationMember",
      "StudentAcademicProfile",
      "FitnessProfile",
    ],
  ],
  ["admins", "مدیران و دسترسی", "Administrators & roles", "matrix", ["User"]],
  [
    "crm",
    "CRM کسب‌وکارها",
    "Tenant CRM",
    "records",
    ["CrmContact", "CrmDeal", "BusinessWorkspace"],
  ],
  ["companies", "شرکت‌ها", "Companies", "records", ["Company"]],
  [
    "financial",
    "خریدها و فاکتورها",
    "Purchases & invoices",
    "records",
    ["Payment"],
  ],
  [
    "financial/customers",
    "حساب خریداران",
    "Customer accounts",
    "records",
    ["User", "Package"],
  ],
  [
    "financial/invoices/[id]",
    "فاکتور خرید",
    "Purchase invoice",
    "records",
    ["Payment"],
  ],
  [
    "packages",
    "پکیج‌ها و قیمت‌گذاری",
    "Packages & pricing",
    "records",
    ["Package"],
  ],
  [
    "subscriptions",
    "اشتراک‌ها",
    "Subscriptions",
    "records",
    ["User", "IndustryPack"],
  ],
  [
    "credit-tiers",
    "بسته‌های اعتبار",
    "Credit pricing tiers",
    "records",
    ["CreditPricingTier"],
  ],
  [
    "billing/rates",
    "ارز و نرخ‌ها",
    "Currencies & rates",
    "records",
    ["BillingExchangeRate"],
  ],
  [
    "billing/promotions",
    "پروموشن‌ها",
    "Promotions",
    "records",
    ["BillingPromotion", "BillingPromotionRedemption"],
  ],
  ["revenue", "درآمد و فروش", "Revenue & sales", "report", ["Payment"]],
  [
    "affiliate",
    "همکاری و کیف پول",
    "Affiliate & wallet",
    "records",
    ["WalletPayoutRequest", "WalletTransaction"],
  ],
  [
    "referrals",
    "کد دعوت و اینفلوئنسر",
    "Referral codes & influencers",
    "records",
    ["ReferralCodeAlias", "InviteCard"],
  ],
  [
    "invites",
    "سازندهٔ دعوت‌نامه",
    "Invitation builder",
    "editor",
    ["InviteCard"],
  ],
  [
    "invites/manage",
    "مدیریت دعوت‌نامه‌ها",
    "Manage invitations",
    "records",
    ["InviteCard"],
  ],
  [
    "industry-packs",
    "بسته‌های صنعتی",
    "Industry packs",
    "records",
    ["IndustryPack"],
  ],
  [
    "categories",
    "دسته‌های کسب‌وکار",
    "Business categories",
    "records",
    ["BusinessCategory"],
  ],
  [
    "modules",
    "ثبت و تنظیم ماژول‌ها",
    "Module registry",
    "records",
    ["ModuleRegistry"],
  ],
  [
    "module-access",
    "دسترسی بسته و مشتری",
    "Module access",
    "matrix",
    ["IndustryModuleFlag", "UserModuleOverride"],
  ],
  [
    "tools",
    "ابزارها و دستیارها",
    "Tools & assistants",
    "records",
    ["ModuleRegistry", "Prompt"],
  ],
  [
    "llm",
    "مدیریت API و مسیریابی",
    "AI providers & routing",
    "records",
    ["CustomAiProvider", "LlmModel"],
  ],
  [
    "models",
    "تعرفه و مدل‌های AI",
    "AI model pricing",
    "records",
    ["AiModelPricing"],
  ],
  [
    "provider-fallback",
    "رویدادهای جایگزینی",
    "Provider fallback log",
    "report",
    ["ProviderFallbackLog"],
  ],
  [
    "usage",
    "مصرف و اقتصاد واحد",
    "Usage & unit economics",
    "report",
    ["UsageLog", "AiModelPricing"],
  ],
  [
    "analytics",
    "تحلیل امکانات",
    "Feature analytics",
    "report",
    ["UsageLog", "PublicPageVisit"],
  ],
  ["prompts", "کتابخانه پرامپت", "Prompt library", "records", ["Prompt"]],
  [
    "ai-chat",
    "سیاست‌های چت و کشف",
    "AI chat policies",
    "form",
    ["AiChatQuota", "AiChatDiscoveryPreference"],
  ],
  [
    "chats",
    "بازبینی گفتگوها",
    "Conversation review",
    "records",
    ["Conversation", "Message"],
  ],
  [
    "public-share",
    "گالری و لینک‌های عمومی",
    "Public sharing",
    "records",
    ["PublicPageVisit", "GeneratedImage"],
  ],
  [
    "student",
    "فضای دانشجویی",
    "Student workspace",
    "records",
    ["StudentCourse", "StudentMaterial", "StudentStudySession"],
  ],
  [
    "academy",
    "مدیریت آکادمی",
    "Academy management",
    "overview",
    [
      "AiCourse",
      "AcademicMajor",
      "StudentAcademicProfile",
      "AiCourseCertificate",
      "AcademyLearningPath",
    ],
  ],
  [
    "ai-courses",
    "تولید و ویرایش دوره",
    "Course creation & editing",
    "records",
    ["AiCourse", "AiCourseGenerationJob", "AiCourseRevision"],
  ],
  [
    "ai-courses/[id]/preview",
    "پیش‌نمایش دوره",
    "Course preview",
    "course",
    ["AiCourse"],
  ],
  [
    "fitness",
    "مدیریت فیتنس",
    "FIT management",
    "records",
    ["FitnessExercise", "FitnessTrainer", "FitnessProgram"],
  ],
  [
    "fitness/users",
    "اعضا و دسترسی ورزشی",
    "FIT members & access",
    "records",
    ["FitnessProfile", "User"],
  ],
  [
    "fitness/marketplace",
    "بازار مربیان و سفارش‌ها",
    "Marketplace operations",
    "records",
    [
      "FitnessTrainerApplication",
      "FitnessProduct",
      "FitnessMarketOrder",
      "FitnessSellerLedger",
      "FitnessVerifiedReview",
    ],
  ],
  [
    "video-factory",
    "مرکز عملیات تولید ویدیو",
    "Video factory operations",
    "overview",
    [
      "VideoFactoryJob",
      "VideoFactoryProvider",
      "VideoFactoryResource",
      "VideoFactoryStorageQuota",
      "VideoFactoryQualityReport",
      "VideoFactoryApproval",
      "VideoFactoryAsset",
      "VideoFactoryConfigVersion",
    ],
  ],
  [
    "voice-studio",
    "مدیریت استودیوی صدا",
    "Voice studio operations",
    "overview",
    ["VoiceStudioGeneration", "AiModelPricing", "VoiceStudioProject"],
  ],
  [
    "voice-agent",
    "مدیریت مرکز تماس",
    "Call center operations",
    "overview",
    ["VoiceAgent", "VoiceCallLog", "VoiceAppointment"],
  ],
  [
    "seo-intelligence",
    "تعرفه و پژوهش سئو",
    "SEO intelligence operations",
    "records",
    ["SeoResearchJob", "SeoSite"],
  ],
  [
    "lead-connectors",
    "اتصال‌های تبلیغاتی",
    "Ad connectors",
    "records",
    ["LeadSource"],
  ],
  [
    "generated-websites",
    "وب‌سایت‌های تولیدشده",
    "Generated websites",
    "records",
    ["GeneratedWebsite"],
  ],
  [
    "play",
    "مدیریت زمین بازی",
    "Arcade management",
    "overview",
    [
      "PlayGame",
      "PlayProfile",
      "PlayTournament",
      "PlayQuestion",
      "PlaySession",
    ],
  ],
  [
    "games",
    "بازی‌ها و بانک سؤال",
    "Games & question bank",
    "records",
    ["Game", "GameQuestion", "GameSession"],
  ],
  [
    "startup-inquiries",
    "درخواست‌های استارتاپ",
    "Startup inquiries",
    "records",
    ["StartupInquiry"],
  ],
  ["settings", "هویت و تنظیمات سایت", "Site settings", "form", ["SiteSetting"]],
  [
    "cloudflare",
    "زیرساخت و Workers AI",
    "Cloudflare infrastructure",
    "connections",
    ["SiteSetting"],
  ],
  ["system", "سلامت سیستم", "System health", "report", ["ErrorLog"]],
  [
    "logs",
    "لاگ و رویدادها",
    "Logs & events",
    "records",
    ["ErrorLog", "AuditLog"],
  ],
];
const adminResourceTitles: Record<string,string> = {
  User:'کاربران',UsageLog:'سوابق مصرف',CrmDeal:'فرصت‌های فروش',BusinessWorkspace:'فضاهای کسب‌وکار',
  Package:'طرح‌ها و قیمت‌ها',IndustryPack:'بسته‌های صنعتی',WalletTransaction:'تراکنش‌های کیف پول',
  InviteCard:'دعوت‌نامه‌ها',UserModuleOverride:'استثناهای دسترسی کاربران',Prompt:'پرامپت‌ها',LlmModel:'مدل‌های زبانی',
  AiModelPricing:'تعرفهٔ مدل‌ها',PublicPageVisit:'بازدیدهای صفحات عمومی',AiChatDiscoveryPreference:'تنظیمات کشف محتوا',
  Message:'پیام‌ها',GeneratedImage:'تصاویر تولیدشده',StudentMaterial:'منابع درسی',StudentStudySession:'جلسه‌های مطالعه',
  AcademicMajor:'رشته‌های تحصیلی',StudentAcademicProfile:'پروفایل‌های تحصیلی',AiCourseCertificate:'گواهی‌های دوره',
  AcademyLearningPath:'مسیرهای یادگیری',AiCourseGenerationJob:'صف تولید دوره',AiCourseRevision:'نسخه‌های دوره',
  FitnessTrainer:'مربیان',FitnessProgram:'برنامه‌های ورزشی',FitnessProduct:'محصولات مربیان',FitnessMarketOrder:'سفارش‌های بازار',
  FitnessSellerLedger:'دفتر فروشندگان',FitnessVerifiedReview:'بازخوردهای خرید',VideoFactoryProvider:'تأمین‌کنندگان تولید',
  VideoFactoryResource:'منابع تولید',VideoFactoryStorageQuota:'سهمیه‌های ذخیره‌سازی',VideoFactoryQualityReport:'گزارش‌های کیفیت',
  VideoFactoryApproval:'تأییدیه‌های تولید',VideoFactoryAsset:'دارایی‌های تولید',VideoFactoryConfigVersion:'نسخه‌های پیکربندی',
  VoiceStudioProject:'پروژه‌های صدا',VoiceCallLog:'سوابق تماس',VoiceAppointment:'قرارهای تماس',SeoSite:'وب‌سایت‌های سئو',
  PlayProfile:'پروفایل بازیکنان',PlayTournament:'چالش‌ها و مسابقه‌ها',PlayQuestion:'پرسش‌های بازی',PlaySession:'جلسه‌های بازی',
  GameQuestion:'بانک پرسش‌ها',GameSession:'سوابق بازی',AuditLog:'سوابق تغییرات',
};
export const adminModules: ModuleSpec[] = adminDefinitions.map(
  ([slug, fa, en, kind, models]) =>
    defineModule(
      "admin-" + slug.replaceAll("/", "-"),
      "/admin/" + slug,
      [fa, en],
      [
        "کنترل روشن، در همهٔ جزئیات.",
        "Clarity and control, down to the details.",
      ],
      "LayoutDashboard",
      "orange",
      "admin",
      [
        v("overview", fa, en, kind as ViewKind, models?.[0], {
          models: models?.slice(1),
        }),
        ...(models
          ?.slice(1)
          .map((model, i) =>
            v(
              model.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
              adminResourceTitles[model] || model.replace(/([a-z])([A-Z])/g, "$1 $2"),
              model.replace(/([a-z])([A-Z])/g, "$1 $2"),
              "records",
              model,
            ),
          ) || []),
      ],
      { source: src("/admin/" + slug) },
    ),
);
export const SOURCE_COMMIT = "b89eea53ec1e78a117718356d319aff3ac837b7f";
export const sourceRoutes = sourceIndex;
export const allModules = [...modules, ...adminModules];
export function moduleViewHref(module: ModuleSpec, view: ViewSpec) {
  return view.id === module.views[0].id
    ? module.base
    : module.base +
        "?" +
        (module.id === "student" ? "view" : "tab") +
        "=" +
        view.id;
}
export function findModule(path: string): ModuleSpec | undefined {
  const sorted = [...allModules].sort((a, b) => b.base.length - a.base.length);
  return sorted.find((m) => {
    const pattern = m.base.replace(/\[[^\]]+\]/g, "[^/]+");
    return (
      new RegExp("^" + pattern + "(?:/.*)?$").test(path) ||
      m.aliases?.some((a) => path === a || path.startsWith(a + "/"))
    );
  });
}
export function resolveView(
  module: ModuleSpec,
  path: string,
  search: URLSearchParams,
) {
  let id =
    search.get("tool") ||
    search.get("tab") ||
    search.get("view") ||
    search.get("section");
  if (!id && path.startsWith(module.base + "/"))
    id = path.slice(module.base.length + 1).split("/")[0];
  if (!id && module.aliases?.some((a) => path.startsWith(a + "/")))
    id = path.split("/").pop() || null;
  const aliases: Record<string, string> = {
    pipeline: "board",
    reconciliation: "bank",
    setup: "ledger-setup",
    statements: "owner-statements",
    rules: "automation",
    coaches: "trainers",
    workouts: "programs",
    quiz: "practice",
    flashcards: "review",
    compose: "content",
    accounts: "publish",
    leads: "inbox",
    orchestrator: "orchestration",
  };
  const moduleAliases: Record<string, Record<string, string>> = {
    seo: { audit: "url", keywords: "keyword", pipeline: "agent-pipeline" },
    learn: {
      courses: "lesson",
      exam: "assessment",
      certificate: "certificates",
    },
    crm: {
      listings: "properties",
      commissions: "owners",
      "follow-ups": "calendar",
      pricing: "matches",
    },
    accounting: { ledger: "accounts" },
  };
  id = id
    ? module.views.some((v) => v.id === id)
      ? id
      : moduleAliases[module.id]?.[id] || aliases[id] || id
    : null;
  return module.views.find((v) => v.id === id) || module.views[0];
}
