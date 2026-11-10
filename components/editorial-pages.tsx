"use client";
import Link, { useSite } from "@/components/site-link";
import { LiveContact, LiveGuides } from "./live-public";
import { useState } from "react";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import { toast } from "sonner";
const guideTopics = [
  [
    "getting-started",
    "شروع کار با ای آی فکر",
    "Getting started",
    "Sparkles",
    "هدف، مخاطب و خروجی موردنیازت را مشخص کن؛ سپس ابزار مناسب را انتخاب کن.",
    "Define your goal, audience and desired output, then choose your tool.",
  ],
  [
    "creative-studio",
    "از ایده تا محتوای تازه",
    "From idea to content",
    "Image",
    "شرح دقیق، نسبت تصویر و سبک را انتخاب کن و پیش از ساخت، هزینه را بررسی کن.",
    "Choose a detailed prompt, aspect ratio and style, and review the credit cost before creating.",
  ],
  [
    "business-workspace",
    "راه‌اندازی فضای کسب‌وکار",
    "Set up your workspace",
    "Building2",
    "مخاطبان را ثبت کن، فرصت‌های فروش را بساز و برای قدم بعدی پیگیری تعیین کن.",
    "Add contacts, create opportunities and schedule your next follow-up.",
  ],
  [
    "learning",
    "مسیر یادگیری شخصی",
    "Your learning path",
    "GraduationCap",
    "منابع، یادداشت‌ها و برنامه مطالعه را در یک فضا نگه دار و با تمرین مرور کن.",
    "Keep resources, notes and study plans together, and revisit them through practice.",
  ],
  [
    "account-and-credits",
    "حساب و اعتبارها",
    "Account and credits",
    "Wallet",
    "طرح‌ها را مقایسه کن و سوابق محلی خرید و مصرف را بررسی کن.",
    "Compare plans and review your local purchase and usage records.",
  ],
  [
    "data-and-privacy",
    "مدیریت اطلاعات شخصی",
    "Manage your data",
    "ShieldCheck",
    "از تنظیمات، داده‌های محلی را دریافت یا پاک کن.",
    "Export or clear your local data from Settings.",
  ],
];
const legalContent: Record<
  string,
  {
    icon: string;
    fa: string;
    en: string;
    sections: [string, string, string, string][];
  }
> = {
  privacy: {
    icon: "LockKeyhole",
    fa: "حریم خصوصی، روشن و قابل‌کنترل",
    en: "Privacy you can understand",
    sections: [
      [
        "اطلاعات این نسخه",
        "Data in this preview",
        "تنظیمات، پیش‌نویس‌ها و اطلاعاتی که در فرم‌ها وارد می‌کنی در حافظه همین مرورگر ذخیره می‌شوند.",
        "Preferences, drafts and form entries are stored in this browser.",
      ],
      [
        "کنترل داده‌ها",
        "Your data controls",
        "در تنظیمات می‌توانی داده‌های ذخیره‌شده را به فایل دریافت کنی یا از مرورگر پاک کنی.",
        "Use Settings to export stored data or clear it from the browser.",
      ],
      [
        "سرویس‌های متصل",
        "Connected services",
        "این پیش‌نمایش به پرداخت، انتشار اجتماعی، تماس تلفنی یا مدل هوش مصنوعی واقعی متصل نیست.",
        "This preview is not connected to real payments, social publishing, telephony or AI models.",
      ],
      [
        "اطلاعات حساس",
        "Sensitive information",
        "برای بررسی رابط از اطلاعات نمونه استفاده کن. متن سیاست عملیاتی باید پیش از راه‌اندازی سرویس واقعی تعیین شود.",
        "Use sample information to explore the interface. Operational policies must be defined before a production launch.",
      ],
    ],
  },
  security: {
    icon: "ShieldCheck",
    fa: "اعتماد از شفافیت شروع می‌شود",
    en: "Trust begins with transparency",
    sections: [
      [
        "محیط نمایشی",
        "Preview environment",
        "عملیات این نسخه روی داده‌های محلی انجام می‌شود. هیچ نقش یا مجوزی در این رابط به‌تنهایی امنیت یک سرویس واقعی را تأمین نمی‌کند.",
        "Operations use local data. Interface roles and permissions alone do not secure a production service.",
      ],
      [
        "پیش‌نمایش وب‌سایت",
        "Website previews",
        "HTML سایت‌های ساخته‌شده در قاب محدودشده نمایش داده می‌شود و متن واردشده هنگام خروجی‌گیری رمزگذاری می‌شود.",
        "Generated HTML is displayed in a sandboxed frame, and supplied text is escaped in exports.",
      ],
      [
        "کنترل عملیات",
        "Operation controls",
        "حذف، بستن دوره مالی و عملیات حساس با تأیید یا محدودیت وضعیت همراه هستند.",
        "Deletion, fiscal closing and sensitive actions use confirmations or state restrictions.",
      ],
      [
        "آماده‌سازی برای انتشار",
        "Before production",
        "احراز هویت، مجوزهای سمت سرور، ذخیره‌سازی امن و بررسی امنیتی برای انتشار واقعی لازم‌اند.",
        "Production requires authentication, server authorization, secure storage and security review.",
      ],
    ],
  },
  terms: {
    icon: "Scale",
    fa: "شرایط استفاده از پیش‌نمایش",
    en: "Preview terms",
    sections: [
      [
        "ماهیت این نسخه",
        "About this version",
        "این محیط برای بررسی طراحی و تعامل‌های رابط است. خروجی‌ها و سوابق محلی، مدرک پرداخت یا خدمت واقعی نیستند.",
        "This environment demonstrates interface design and interactions. Local outputs and records are not proof of real payments or services.",
      ],
      [
        "محتوا و مسئولیت",
        "Content and responsibility",
        "اطلاعات و خروجی‌ها را پیش از استفاده بیرون از این محیط بررسی کن. پاسخ‌های نمایشی جایگزین نظر تخصصی نیستند.",
        "Review information and outputs before using them outside this environment. Simulated responses do not replace professional judgment.",
      ],
      [
        "اعتبار و پرداخت",
        "Credits and payments",
        "افزایش اعتبار و پرداخت در این نسخه شبیه‌سازی می‌شود و مبلغی دریافت نمی‌شود.",
        "Credits and purchases are simulated; no payment is collected.",
      ],
      [
        "تغییر و حذف داده",
        "Changes and deletion",
        "داده‌های مرورگر ممکن است با پاک‌سازی مرورگر حذف شوند. فایل خروجی را برای نگه‌داری نسخه شخصی دریافت کن.",
        "Browser data may be removed when browser storage is cleared. Export a file to keep your own copy.",
      ],
    ],
  },
};
export function EditorialPage({ path }: { path: string }) {
  const { fa, tl } = useApp();
  const live = useSite();
  const part = path.split("/")[1];
  if (live && part === "contact") return <LiveContact />;
  if (live && part === "guides") return <LiveGuides slug={path.split("/")[2]} />;
  if (part === "contact") return <ContactPage />;
  if (part === "guides") return <Guides path={path} />;
  const legal = legalContent[part];
  // aifekr.com: the real legal text (main site lib/marketing/legal.ts), in the design's own layout.
  if (legal && live?.legal) {
    const doc = live.legal;
    const num = (i: number) => String(i + 1).padStart(2, "0");
    return (
      <div className="public-section editorial-page">
        <header className="editorial-hero">
          <span className="icon-chip orange">
            <Icon name={legal.icon} size={30} />
          </span>
          <span className="eyebrow">AIFekr / {part.toUpperCase()}</span>
          <h1>{doc.title}</h1>
          <p>{doc.updated ?? live.copy.noPromise}</p>
        </header>
        <div className="editorial-layout">
          <nav className="panel editorial-toc" aria-label={tl("فهرست مطالب", "On this page")}>
            <strong>{tl("در این صفحه", "On this page")}</strong>
            {doc.sections.map((s, i) => (
              <a key={i} href={"#section-" + i}>
                <span>{num(i)}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <article className="panel editorial-document">
            {doc.sections.map((s, i) => (
              <section id={"section-" + i} key={i}>
                <span className="eyebrow">{num(i)}</span>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </section>
            ))}
            <Link href="/contact" className="btn">
              {tl("تماس با ما", "Contact us")} <Icon name="ArrowLeft" size={16} />
            </Link>
          </article>
        </div>
      </div>
    );
  }
  if (legal)
    return (
      <div className="public-section editorial-page">
        <header className="editorial-hero">
          <span className="icon-chip orange">
            <Icon name={legal.icon} size={30} />
          </span>
          <span className="eyebrow">AIFekr / {part.toUpperCase()}</span>
          <h1>{tl(legal.fa, legal.en)}</h1>
          <p>
            {tl("اطلاعات مربوط به همین نسخهٔ نمایشی، بدون ادعای سیاست‌های یک سرویس عملیاتی.", "Information about this preview, without assuming policies for a production service.")}
          </p>
        </header>
        <div className="editorial-layout">
          <nav
            className="panel editorial-toc"
            aria-label={tl("فهرست مطالب", "On this page")}
          >
            <strong>{tl("در این صفحه", "On this page")}</strong>
            {legal.sections.map((s, i) => (
              <a key={i} href={"#section-" + i}>
                <span>0{i + 1}</span>
                {tl(s[0], s[1])}
              </a>
            ))}
          </nav>
          <article className="panel editorial-document">
            {legal.sections.map((s, i) => (
              <section id={"section-" + i} key={i}>
                <span className="eyebrow">0{i + 1}</span>
                <h2>{tl(s[0], s[1])}</h2>
                <p>{s[fa ? 2 : 3]}</p>
              </section>
            ))}
            <Link href="/settings" className="btn">
              {tl("مدیریت اطلاعات من", "Manage my data")}{" "}
              <Icon name="ArrowLeft" size={16} />
            </Link>
          </article>
        </div>
      </div>
    );
  return (
    <div className="public-section editorial-page">
      <header className="editorial-hero about-hero">
        <span className="eyebrow">AIFekr / ABOUT</span>
        <h1>
          {tl("یک فکر،\nهزار مسیر تازه.", "One idea.\nA thousand new paths.")}
        </h1>
        <p>
          {tl("فضایی برای کنار هم آوردن خلاقیت، یادگیری و کار روزانه؛ با ابزارهایی که مسیر ایده تا اجرا را روشن‌تر می‌کنند.", "A place where creativity, learning and everyday work come together, making the path from idea to action clearer.")}
        </p>
        <div className="domain-actions">
          <Link className="btn primary" href="/home">
            {tl("کشف فضای ای آی فکر", "Explore AIFekr")}{" "}
            <Icon name="ArrowLeft" size={16} />
          </Link>
          <Link className="btn" href="/contact">
            {tl("ارتباط با ما", "Get in touch")}
          </Link>
        </div>
        <div className="about-orbit" aria-hidden="true">
          <span />
          <span />
          <Icon name="Sparkles" size={70} />
        </div>
      </header>
      <section className="about-story">
        <span className="eyebrow">{tl("چرایی ای آی فکر", "WHY AIFekr")}</span>
        <h2>
          {tl("ابزارها کنار هم،\nفکر تو در مرکز.", "Tools together.\nYour ideas at the center.")}
        </h2>
        <p>
          {tl("برای ساختن محتوا، مدیریت ارتباط با مشتری و یادگیری، بارها میان ابزارها جابه‌جا می‌شویم. طراحی ای آی فکر این کارها را در فضاهای مشخص گرد هم می‌آورد تا قدم بعدی واضح باشد.", "Creating content, managing customers and learning often means moving between tools. AIFekr brings these activities into focused workspaces so your next step is clear.")}
        </p>
      </section>
      <div className="tool-grid">
        {[
          [
            "Sparkles",
            "خلق کردن",
            "Create",
            "از تصویر و صدا تا وب‌سایت و ویدیو.",
            "From images and voice to websites and video.",
            "/create",
          ],
          [
            "Building2",
            "رشد کردن",
            "Grow",
            "مخاطبان، فروش و عملیات روزانه در یک فضا.",
            "Customers, sales and daily operations in one place.",
            "/business",
          ],
          [
            "GraduationCap",
            "یاد گرفتن",
            "Learn",
            "مسیر یادگیری، منابع و تمرین در کنار هم.",
            "Learning paths, resources and practice together.",
            "/learn",
          ],
        ].map(([icon, a, b, c, d, url]) => (
          <Link className="panel about-pillar" href={url} key={url}>
            <span className="icon-chip orange">
              <Icon name={icon} size={28} />
            </span>
            <h3>{fa ? a : b}</h3>
            <p>{fa ? c : d}</p>
            <Icon name="ArrowUpLeft" size={20} />
          </Link>
        ))}
      </div>
    </div>
  );
}
function ContactPage() {
  const { fa, t, tl } = useApp();
  const [sent, setSent] = useState(false);
  return (
    <div className="public-section editorial-page">
      <header className="editorial-hero">
        <span className="eyebrow">AIFekr / CONTACT</span>
        <h1>
          {tl("گفتگو، شروع\nیک امکان تازه است.", "A conversation starts\na new possibility.")}
        </h1>
        <p>
          {tl("پرسش، پیشنهاد یا بازخوردت را برای این پیش‌نمایش ثبت کن.", "Record your question, suggestion or feedback for this preview.")}
        </p>
      </header>
      <div className="contact-layout">
        <aside>
          <div className="panel">
            <span className="icon-chip orange">
              <Icon name="MessagesSquare" size={30} />
            </span>
            <h2>
              {tl("درباره چه چیزی صحبت کنیم؟", "What would you like to discuss?")}
            </h2>
            <p>
              {tl("موضوع پیام را انتخاب کن تا درخواستت روشن‌تر ثبت شود. این فرم پیام خارجی ارسال نمی‌کند.", "Choose a topic to organize your request. This form does not send an external message.")}
            </p>
          </div>
          <Link className="contact-guide-link" href="/guides">
            <Icon name="BookOpen" />
            <span>
              {tl("پاسخ را در راهنماها جستجو کن", "Explore the guides")}
            </span>
            <Icon name="ArrowUpLeft" size={18} />
          </Link>
        </aside>
        <form
          className="panel contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            const entries = JSON.parse(
              localStorage.getItem("aifekr-contact-inquiries") || "[]",
            );
            localStorage.setItem(
              "aifekr-contact-inquiries",
              JSON.stringify([
                {
                  ...Object.fromEntries(new FormData(e.currentTarget)),
                  date: new Date().toISOString(),
                },
                ...entries,
              ]),
            );
            setSent(true);
            toast.success(
              tl("پیام در این مرورگر ثبت شد", "Message saved in this browser"),
            );
          }}
        >
          {sent ? (
            <div className="contact-success" role="status">
              <span className="icon-chip lime">
                <Icon name="CheckCircle2" size={36} />
              </span>
              <h2>{tl("بازخوردت ثبت شد.", "Your feedback is saved.")}</h2>
              <p>
                {tl("این ثبت محلی است و پیام ارسال نشده است.", "This is a local record; no message was sent.")}
              </p>
              <Button onClick={() => setSent(false)}>
                {tl("ثبت پیام دیگر", "Record another message")}
              </Button>
            </div>
          ) : (
            <>
              <div className="domain-fields">
                <label>
                  {t("name")}
                  <input name="name" required autoComplete="name" />
                </label>
                <label>
                  {t("email")}
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </label>
              </div>
              <label>
                {tl("موضوع گفتگو", "Topic")}
                <select name="topic">
                  <option>{tl("بازخورد طراحی", "Design feedback")}</option>
                  <option>{tl("گزارش مشکل", "Report an issue")}</option>
                  <option>{tl("همکاری", "Collaboration")}</option>
                </select>
              </label>
              <label>
                {tl("پیام تو", "Your message")}
                <textarea name="message" required rows={7} />
              </label>
              <Button type="submit" variant="primary">
                {tl("ثبت پیام در پیش‌نمایش", "Save preview message")}{" "}
                <Icon name="ArrowLeft" size={17} />
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
function Guides({ path }: { path: string }) {
  const { fa, tl } = useApp();
  const [query, setQuery] = useState("");
  const slug = path.split("/")[2];
  const topic = guideTopics.find((t) => t[0] === slug);
  if (slug)
    return (
      <div className="public-section editorial-page">
        <Link className="text-link" href="/guides">
          {tl("همه راهنماها", "All guides")}
        </Link>
        <header className="editorial-hero">
          <span className="icon-chip blue">
            <Icon name={topic?.[3] || "BookOpen"} size={32} />
          </span>
          <h1>
            {topic?.[fa ? 1 : 2] ||
              (tl("راهنمای شروع کار", "Getting started"))}
          </h1>
          <p>{topic?.[fa ? 4 : 5]}</p>
        </header>
        <div className="panel editorial-document">
          {[
            [
              tl("۱. هدف را روشن کن", "1. Define the goal"),
              tl("قبل از انتخاب ابزار، بنویس چه نتیجه‌ای می‌خواهی و برای چه کسی.", "Before choosing a tool, describe the desired result and its audience."),
            ],
            [
              tl("۲. یک نسخه کوچک بساز", "2. Start small"),
              tl("اطلاعات لازم را وارد کن، پیش‌نمایش را ببین و جزئیات را اصلاح کن.", "Enter the required information, review the preview and refine the details."),
            ],
            [
              tl("۳. ذخیره و بازبینی کن", "3. Save and review"),
              tl("داده‌ها در همین مرورگر ذخیره می‌شوند. برای نگه‌داری مستقل از فایل خروجی استفاده کن.", "Data is stored in this browser. Export a file to keep an independent copy."),
            ],
          ].map(([a, b]) => (
            <section key={a}>
              <h2>{a}</h2>
              <p>{b}</p>
            </section>
          ))}
          <Link href="/home" className="btn primary">
            {tl("ورود به فضای کار", "Open workspace")}
          </Link>
        </div>
      </div>
    );
  return (
    <div className="public-section editorial-page">
      <header className="editorial-hero center">
        <span className="eyebrow">AIFekr / GUIDES</span>
        <h1>
          {tl("قدم بعدی را\nآسان‌تر پیدا کن.", "Find your next step\na little more easily.")}
        </h1>
        <p>
          {tl("راهنماهای کوتاه برای شروع، ساختن و مدیریت کارها.", "Short guides for getting started, creating and managing your work.")}
        </p>
        <input
          className="guide-search"
          aria-label={tl("جستجوی راهنما", "Search guides")}
          placeholder={tl("دنبال چه چیزی هستی؟", "What are you looking for?")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>
      <div className="tool-grid">
        {guideTopics
          .filter((t) =>
            (t[fa ? 1 : 2] + " " + t[fa ? 4 : 5])
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map(([id, a, b, icon, c, d]) => (
            <Link className="panel guide-card" href={"/guides/" + id} key={id}>
              <span className="icon-chip blue">
                <Icon name={icon} size={26} />
              </span>
              <h2>{fa ? a : b}</h2>
              <p>{fa ? c : d}</p>
              <span className="text-link">
                {tl("خواندن راهنما", "Read guide")}{" "}
                <Icon name="ArrowLeft" size={16} />
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
