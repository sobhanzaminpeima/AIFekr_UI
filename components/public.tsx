"use client";
import Link, { useHref, useSite } from "@/components/site-link";
import { WebAppInstallCallout } from "./webapp-install";
import { LiveCreditCalculator } from "./live-public";
import { LiveOnboarding } from "./live-onboarding";
import { useShell } from "./live-shell-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Button, Icon, Modal, SectionTitle, ToolCard } from "./ui";
import { tools, publicPages } from "@/mocks/catalog";
import { FAQ, Plans } from "./account";
import { CourseCards } from "./workspaces";
import { toast } from "sonner";
import { ProductDirectory, ProductPage } from "./product-pages";
import { EditorialPage } from "./editorial-pages";
import {
  LandingJourney,
  LandingModuleExplorer,
  LandingDetails,
} from "./landing-sections";
export function Landing() {
  const { t, fa, n, tl } = useApp();
  const [demo, setDemo] = useState(false);
  const [tab, setTab] = useState("image");
  const [credits, setCredits] = useState(100);
  const [prompt, setPrompt] = useState("");
  const router = useRouter();
  const live = useSite();
  const href = useHref();
  // In live mode these targets are classic pages, so they load in full.
  const go = (target: string) => (live ? location.assign(href(target)) : router.push(target));
  return (
    <>
      <section className="landing-hero">
        <div className="landing-glow" />
        <Link href="/guides/getting-started" className="launch-badge">
          <span className="tiny-dot" />
          {fa
            ? "یک خانهٔ تازه برای همهٔ ایده‌هایت"
            : "A new home for all your ideas"}
          <Icon name="ArrowLeft" size={13} />
        </Link>
        <h1>
          {fa ? (
            <>
              یک فکر،
              <br />
              <em>هزار امکان.</em>
            </>
          ) : (
            <>
              One little spark.
              <br />
              <em>Endless possibilities.</em>
            </>
          )}
        </h1>
        <p>
          {fa
            ? "از یک گفتگوی ساده تا خلق تصویر، رشد کسب‌وکار و یادگیری؛ دنیای هوش مصنوعی، به زبان تو."
            : "From a simple conversation to creating something extraordinary. Your business, your learning, your world. All in one thoughtful space."}
        </p>
        <div className="hero-actions">
          <Link href="/register" className="btn primary large">
            {t("start")}
            <Icon name="ArrowUpLeft" size={20} className="directional" />
          </Link>
          <Button className="large" onClick={() => setDemo(true)}>
            <Icon name="CirclePlay" size={20} />
            {t("demo")}
          </Button>
        </div>
        <div className="trust-note">
          <span className="avatar-stack">
            {["س", "ع", "ن", "م"].map((s) => (
              <i key={s}>{s}</i>
            ))}
          </span>
          <span>
            {fa
              ? "طراحی‌شده برای خلاقیت، به زبان فارسی"
              : "Persian at heart. Made for your imagination."}
            {!live && <small>{t("mock")}</small>}
          </span>
        </div>
        <div className="hero-demo">
          <div className="demo-chrome">
            <div>
              <i />
              <i />
              <i />
            </div>
            <span>aifekr / {t("create")}</span>
            <Icon name="Sparkles" size={17} />
          </div>
          <div className="hero-demo-body">
            <div>
              <span className="eyebrow orange-text">
                {tl("ایده‌ات را زنده کن", "GIVE YOUR IDEA A LITTLE LIFE")}
              </span>
              <h2 className="demo-title">
                {fa ? "فقط تصورش کن." : "Just imagine it."}
              </h2>
              <p>
                {fa
                  ? "یک جهان کوچک، با نور گرم و کمی خیال."
                  : "A little world, warm light, and a touch of imagination."}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  go(
                    "/create/image?prompt=" +
                      encodeURIComponent(prompt || "Warm little world"),
                  );
                }}
              >
                <input
                  placeholder={t("placeholder")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  aria-label={t("prompt")}
                />
                <button className="send-btn" aria-label={t("send")}>
                  <Icon name="ArrowUp" size={18} />
                </button>
              </form>
              <div className="chips">
                <button
                  onClick={() =>
                    setPrompt(
                      fa ? "یک جهان مینیمال نارنجی" : "A minimal orange world",
                    )
                  }
                >
                  {t("image")}
                </button>
                <button onClick={() => go("/create/video")}>
                  {t("video")}
                </button>
                <button onClick={() => go("/voice-studio")}>
                  {t("voice")}
                </button>
              </div>
            </div>
            <img
              src="/art/orbit.svg"
              alt={
                fa
                  ? "جهان انتزاعی نارنجی؛ تصویر نمایشی استودیو"
                  : "Abstract orange world; studio sample artwork"
              }
            />
          </div>
        </div>
      </section>
      <div className="capability-strip">
        {[
          "CHAT & THINK",
          "CREATE & INSPIRE",
          "BUILD & GROW",
          "LEARN & DISCOVER",
          "MOVE & THRIVE",
        ].map((s) => (
          <span key={s}>✦ {s}</span>
        ))}
      </div>
      <section className="public-section" id="worlds">
        <div className="center-heading">
          <span className="eyebrow orange-text">
            {tl("همهٔ دنیای تو، در یک جا", "MANY SIDES OF YOU. ONE AIFekr.")}
          </span>
          <h2>
            {fa
              ? "یک پلتفرم، پنج دنیای تازه."
              : "One platform. Five possibilities."}
          </h2>
          <p>
            {fa
              ? "برای هر نقشی که در زندگی داری، یک همراه هوشمند."
              : "A thoughtful companion for every part of your day."}
          </p>
        </div>
        <div className="worlds-grid">
          {[
            [
              "chat",
              "گفتگو و فکر",
              "Think it through",
              "MessagesSquare",
              "orange",
            ],
            ["create", "خلق کن", "Make something", "Sparkles", "purple"],
            [
              "business",
              "کسب‌وکارت را رشد بده",
              "Build your business",
              "BriefcaseBusiness",
              "amber",
            ],
            ["learn", "یاد بگیر", "Stay curious", "GraduationCap", "blue"],
            ["fit/dashboard", "قوی‌تر شو", "Feel stronger", "Dumbbell", "lime"],
          ].map(([url, a, b, icon, color]) => (
            <Link className="panel world-card" href={"/" + url} key={url}>
              <span className={`icon-chip ${color}`}>
                <Icon name={icon} size={30} />
              </span>
              <h3>{fa ? a : b}</h3>
              <p>
                {fa
                  ? "از یک قدم کوچک، به امکان‌های بزرگ برس."
                  : "Small beginnings. Extraordinary possibilities."}
              </p>
              <Icon name="ArrowUpLeft" size={20} />
            </Link>
          ))}
        </div>
      </section>
      <section className="public-section showcase">
        <SectionTitle
          title={
            tl("خلاقیت، بدون مرز.", "Your creativity, without the limits.")
          }
        />
        <div className="chips">
          {(["image", "video", "voice", "music", "factory"] as const).map(
            (k) => (
              <button
                className={tab === k ? "selected" : ""}
                key={k}
                onClick={() => setTab(k)}
              >
                {t(k)}
              </button>
            ),
          )}
        </div>
        <div className="showcase-body">
          <img
            src={
              tab === "image"
                ? "/art/orbit.svg"
                : tab === "voice" || tab === "music"
                  ? "/art/voice.svg"
                  : "/art/waves.svg"
            }
            alt={t(tab as "image")}
          />
          <div>
            <span className="eyebrow orange-text">{t(tab as "image")}</span>
            <h2>
              {fa
                ? "چیزی بساز که فقط تو می‌توانی تصورش کنی."
                : "Make the thing only you can imagine."}
            </h2>
            <p>
              {fa
                ? "ایده‌ات را به زبان خودت بنویس، سبک را انتخاب کن و اولین نسخه را ببین."
                : "Describe it in your own words, choose a style and bring your first version to life."}
            </p>
            <Link
              href={
                tab === "voice"
                  ? "/voice-studio"
                  : "/create/" + (tab === "factory" ? "video-factory" : tab)
              }
              className="btn"
            >
              {t("generate")}
              <Icon name="ArrowLeft" size={16} />
            </Link>
          </div>
        </div>
      </section>
      <LandingJourney />
      <LandingDetails />
      <LandingModuleExplorer />
      <section className="public-section">
        <SectionTitle
          title={tl("برای آدم‌هایی شبیه تو.", "For people just like you.")}
        />
        <div className="audience-grid">
          {live ? live.solutions.map((s) => (
            <Link href={"/solutions/" + s.slug} className="panel" key={s.slug}>
              <Icon name={{ business: "BriefcaseBusiness", creators: "Palette", "real-estate": "Building2", students: "GraduationCap" }[s.slug] ?? "Sparkles"} />
              <h3>{s.title}</h3>
              <Icon name="ArrowUpLeft" size={16} />
            </Link>
          )) : [
            "creators",
            "real-estate",
            "clinics",
            "shops",
            "agencies",
            "students",
            "athletes",
          ].map((s, i) => (
            <Link href={"/solutions/" + s} className="panel" key={s}>
              <Icon
                name={
                  [
                    "Palette",
                    "Building2",
                    "HeartPulse",
                    "ShoppingBag",
                    "BriefcaseBusiness",
                    "GraduationCap",
                    "Dumbbell",
                  ][i]
                }
              />
              <h3>
                {fa
                  ? [
                      "خالقان محتوا",
                      "مشاوران املاک",
                      "کلینیک‌ها",
                      "فروشگاه‌ها",
                      "آژانس‌ها",
                      "دانشجویان",
                      "ورزشکاران",
                    ][i]
                  : [
                      "Creators",
                      "Real estate",
                      "Clinics",
                      "Shops",
                      "Agencies",
                      "Students",
                      "Athletes",
                    ][i]}
              </h3>
              <Icon name="ArrowUpLeft" size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="public-section steps-section">
        <h2>
          {fa
            ? "سه قدم تا ایدهٔ بعدی تو."
            : "A few small steps. A whole new possibility."}
        </h2>
        <div className="three-cols">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <b>{n(i + 1).padStart(2, "0")}</b>
              <h3>
                {fa
                  ? ["شروع کن", "ایده‌ات را بنویس", "به آن جان بده"][i]
                  : [
                      "Make yourself at home",
                      "Share your idea",
                      "Bring it to life",
                    ][i]}
              </h3>
              <p>
                {fa
                  ? "ساده، روشن، با کنترل کامل در هر قدم."
                  : "Simple, transparent, and always in your hands."}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="public-section">
        {live ? <LiveCreditCalculator /> : <div className="panel calculator">
          <div>
            <span className="eyebrow orange-text">
              {tl("اعتبار یعنی انتخاب", "YOUR CREDITS. YOUR CHOICE.")}
            </span>
            <h2>{fa ? "قبل از ساخت، بدان." : "Know before you create."}</h2>
            <p>
              {fa
                ? "هزینهٔ هر عملیات، روشن و قابل پیش‌بینی."
                : "Every action shows its cost before you begin."}
            </p>
          </div>
          <div>
            <label>
              {n(credits)} {t("credits")}
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
              />
            </label>
            <p>
              ≈ {n(Math.floor(credits / 12))} {t("image")} {tl("یا", "or")}{" "}
              {n(Math.floor(credits / 45))} {t("video")}
            </p>
          </div>
        </div>}
      </section>
      <section className="public-section" id="pricing">
        <Plans />
      </section>
      <section className="public-section security-strip">
        <Icon name="ShieldCheck" size={35} />
        <div>
          <h3>
            {fa
              ? "فکر تو، فضای امن تو."
              : "Your ideas deserve a little peace of mind."}
          </h3>
          <p>
            {live
              ? fa
                ? "هزینهٔ هر کار پیش از اجرا نمایش داده می‌شود و هیچ اقدامی بدون تأیید تو انجام نمی‌شود."
                : "Every action shows its cost before it runs, and nothing happens without your approval."
              : fa
                ? "این نسخه داده‌ها را تنها در مرورگر نگه می‌دارد."
                : "This demo keeps your data in your own browser."}
          </p>
        </div>
        <Link href="/security" className="text-link">
          {fa ? "بیشتر بدان" : "Learn more"}
          <Icon name="ArrowLeft" size={16} />
        </Link>
      </section>
      <WebAppInstallCallout/>
      <section className="final-cta">
        <span>✦</span>
        <h2>
          {fa
            ? "فکر بعدی‌ات را جدی بگیر."
            : "Your next idea is worth a little spark."}
        </h2>
        <Link href="/register" className="btn">
          {t("start")}
          <Icon name="ArrowUpLeft" size={18} />
        </Link>
      </section>
      {demo && (
        <Modal title={t("demo")} onClose={() => setDemo(false)}>
          <img className="full-img" src="/art/orbit.svg" alt={t("preview")} />
          <p>
            {fa
              ? "مسیر نمونه: خانه ← تصویرساز ← نوشتن ایده ← تأیید هزینه ← نتیجه."
              : "A sample journey: Home → Image studio → Describe → Approve credits → Result."}
          </p>
          <Link
            href="/home"
            className="btn primary"
            onClick={() => setDemo(false)}
          >
            {tl("خودت امتحان کن", "Try it yourself")}
          </Link>
        </Modal>
      )}
    </>
  );
}
export function Auth({ register = false }: { register?: boolean }) {
  const { fa, t, tl } = useApp();
  const router = useRouter();
  const [method, setMethod] = useState("phone");
  const [phase, setPhase] = useState(0);
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  useEffect(() => {
    if (!timer) return;
    const id = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);
  return (
    <div className="auth-layout">
      <div className="auth-form panel">
        <span className="eyebrow orange-text">
          {tl("یک فکر، هزار امکان", "ONE SPARK. A THOUSAND POSSIBILITIES.")}
        </span>
        <h1>
          {register ? t("welcome") : tl("خوش برگشتی!", "Welcome back.")}
        </h1>
        <p>
          {fa
            ? "به فضای فکرهای بزرگت وارد شو."
            : "Make yourself at home. Your ideas are waiting."}
        </p>
        <div className="chips">
          {["phone", "email"].map((m) => (
            <button
              className={method === m ? "selected" : ""}
              onClick={() => {
                setMethod(m);
                setPhase(0);
              }}
              key={m}
            >
              {m === "phone" ? (fa ? "شماره موبایل" : "Phone") : t("email")}
            </button>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await new Promise((r) => setTimeout(r, 650));
            setBusy(false);
            if (method === "phone" && phase === 0) {
              setPhase(1);
              setTimer(60);
              toast.info(tl("کد آزمایشی: ۱۲۳۴۵۶", "Demo code: 123456"));
            } else {if(register){const code=new URLSearchParams(location.search).get('ref');if(code&&/^[A-Za-z0-9_-]{1,64}$/.test(code)){const events=JSON.parse(localStorage.getItem('aifekr-referral-events')||'[]');if(!events.some((event:{code:string;type:string})=>event.code===code&&event.type==='signup'))localStorage.setItem('aifekr-referral-events',JSON.stringify([{id:crypto.randomUUID(),code,type:'signup',date:new Date().toISOString(),name:fa?'ثبت‌نام نمونه':'Demo signup'},...events]));}}router.push(register ? "/onboarding" : "/home");}
          }}
        >
          {phase === 0 ? (
            <>
              <label>
                {method === "phone"
                  ? fa
                    ? "شماره موبایل"
                    : "Phone number"
                  : t("email")}
                <input
                  type={method === "phone" ? "tel" : "email"}
                  pattern={method === "phone" ? "[+0-9۰-۹ ]{10,15}" : undefined}
                  required
                  placeholder={
                    method === "phone" ? "0912 345 6789" : "you@example.com"
                  }
                  dir="ltr"
                />
              </label>
              {method === "email" && (
                <label>
                  {tl("گذرواژه", "Password")}
                  <input
                    type="password"
                    minLength={8}
                    required
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                  />
                </label>
              )}
            </>
          ) : (
            <>
              <label>
                {fa ? "کد شش‌رقمی را وارد کن" : "Enter the six-digit code"}
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="123456"
                  maxLength={6}
                  placeholder="123456"
                  className="otp-input"
                  aria-describedby="otp-help"
                />
              </label>
              <small id="otp-help">
                {tl("کد آزمایشی: 123456", "Demo code: 123456")}
              </small>
              <Button
                disabled={timer > 0}
                onClick={() => {
                  setTimer(60);
                  toast.info("123456");
                }}
              >
                {timer > 0 ? `${timer}s` : fa ? "ارسال دوباره" : "Resend code"}
              </Button>
            </>
          )}
          <Button type="submit" variant="primary full" disabled={busy}>
            {busy
              ? t("loading")
              : phase === 0 && method === "phone"
                ? fa
                  ? "دریافت کد ورود"
                  : "Send a code"
                : t("continue")}
          </Button>
        </form>
        <Button
          className="full"
          onClick={() => {
            toast.info(t("mock"));
            router.push("/home");
          }}
        >
          <Icon name="Chrome" size={17} />
          {fa ? "ادامه با گوگل (نمایشی)" : "Continue with Google (demo)"}
        </Button>
        <p className="fine-print">
          {t("mock")} ·{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? t("login") : t("start")}
          </Link>
        </p>
      </div>
      <div className="auth-art">
        <img src="/art/orbit.svg" alt="" />
        <h2>
          {tl("جایی برای فکرهای تو.", "A little space for your big ideas.")}
        </h2>
        <p>{fa ? "بساز، یاد بگیر، جلو برو." : "Create. Learn. Keep moving."}</p>
      </div>
    </div>
  );
}
export function Onboarding() {
  // aifekr.com: the account's real onboarding (answers saved on the main site).
  if (useShell()?.welcome) return <LiveOnboarding />;
  return <DemoOnboarding />;
}
function DemoOnboarding() {
  const { fa, t, tl } = useApp();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  return (
    <div className="onboarding panel">
      <span className="eyebrow orange-text">{t("welcome")}</span>
      <div className="stepper">
        {[0, 1, 2].map((s) => (
          <button
            key={s}
            className={step === s ? "current" : ""}
            onClick={() => setStep(s)}
          >
            <span>{s + 1}</span>
          </button>
        ))}
      </div>
      <h1>
        {fa
          ? [
              "دوست داری از کجا شروع کنی؟",
              "کسب‌وکارت در چه زمینه‌ای است؟",
              "اولین جرقه را با هم بزنیم.",
            ][step]
          : [
              "What brings you here?",
              "What’s your world?",
              "Let’s make your first little spark.",
            ][step]}
      </h1>
      <p>
        {tl("این انتخاب فقط فضای کارت را شخصی‌تر می‌کند.", "We’ll make your workspace feel a little more like you.")}
      </p>
      <div className="onboarding-options">
        {(step === 0
          ? ["Create", "Business", "Study", "Fitness", "Chat"]
          : step === 1
            ? ["Real estate", "Clinic", "Shop", "Agency", "Personal"]
            : ["Image", "Chat", "Learn"]
        ).map((s, i) => (
          <button
            className={selected.includes(s) ? "selected" : ""}
            key={s}
            onClick={() =>
              setSelected((a) =>
                a.includes(s) ? a.filter((x) => x !== s) : [...a, s],
              )
            }
          >
            <Icon
              name={
                [
                  "Sparkles",
                  "BriefcaseBusiness",
                  "BookOpen",
                  "Dumbbell",
                  "MessagesSquare",
                ][i % 5]
              }
              size={26}
            />
            {fa
              ? (step === 0
                  ? ["خلاقیت", "کسب‌وکار", "یادگیری", "تناسب اندام", "گفتگو"]
                  : step === 1
                    ? ["املاک", "کلینیک", "فروشگاه", "آژانس", "شخصی"]
                    : ["ساخت تصویر", "شروع گفتگو", "یادگیری"])[i]
              : s}
          </button>
        ))}
      </div>
      <Button
        variant="primary full"
        onClick={() =>
          step < 2
            ? setStep((s) => s + 1)
            : router.push(
                "/chat?prompt=" +
                  encodeURIComponent(
                    tl("برای شروع یک ایدهٔ خلاقانه بده", "Give me a creative first idea"),
                  ),
              )
        }
      >
        {step < 2
          ? t("next")
          : tl("اولین ایده‌ام را بساز", "Make my first idea")}
      </Button>
      <Link className="text-link" href="/home">
        {t("skip")}
      </Link>
    </div>
  );
}
export function PublicPage({ path }: { path: string }) {
  const { fa, t, tl } = useApp();
  const part = path.split("/")[1];
  if (
    ["about", "contact", "privacy", "security", "terms", "guides"].includes(
      part,
    )
  )
    return <EditorialPage path={path} />;
  if (["features", "solutions", "industry"].includes(part))
    return <ProductPage path={path} />;
  const page = publicPages.find((x) => x[0] === part);
  const title = page
    ? fa
      ? page[1]
      : page[2]
    : part === "solutions"
      ? tl("راهکاری برای دنیای تو", "Made for your world")
      : part === "features"
        ? fa
          ? "یک امکان تازه برای ایده‌هایت"
          : "A new possibility for your ideas"
        : tl("با ای آی فکر، یک قدم جلوتر", "A little further with AIFekr");
  return (
    <div className="public-section public-article">
      <span className="eyebrow orange-text">AIFekr / {part.toUpperCase()}</span>
      <h1>{title}</h1>
      <p className="lead">
        {fa
          ? "فناوری وقتی ارزشمند است که زندگی را ساده‌تر کند. ما برای ساختن، یادگرفتن و رشد کردن، یک فضای یکپارچه طراحی کرده‌ایم."
          : "Technology matters when it makes life a little simpler. AIFekr brings creating, learning and growing into one thoughtful space."}
      </p>
      {part === "contact" ? (
        <form
          className="panel contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success(
              fa
                ? "پیام آزمایشی ثبت شد؛ پیامی ارسال نشده است."
                : "Demo message recorded; nothing was sent.",
            );
          }}
        >
          <label>
            {t("name")}
            <input required />
          </label>
          <label>
            {t("email")}
            <input type="email" required />
          </label>
          <label>
            {tl("پیام تو", "Your message")}
            <textarea required rows={5} />
          </label>
          <Button type="submit" variant="primary">
            {t("send")}
          </Button>
        </form>
      ) : ["privacy", "terms", "security"].includes(part) ? (
        <div className="panel prose">
          <h2>{tl("دربارهٔ این نسخه", "About this demo")}</h2>
          <p>
            {fa
              ? "این پروژه یک رابط کاربری آزمایشی است. هیچ سرویس هوش مصنوعی، پرداخت، انتشار یا اتصال حساب واقعی فعال نیست. اطلاعات پروفایل، تنظیمات و خروجی‌های نمونه در حافظهٔ مرورگر ذخیره می‌شوند."
              : "This project is an interactive interface demo. No live AI, payment, publishing or account connection is enabled. Preferences and sample outputs are stored in your browser."}
          </p>
          <h2>{tl("کنترل داده‌ها", "Your data, your choice")}</h2>
          <p>
            {fa
              ? "از تنظیمات می‌توانی داده‌های آزمایشی را دریافت یا پاک کنی. اطلاعات حساس یا واقعی را در این نسخه وارد نکن."
              : "Export or clear your sample data from Settings. Use sample information when exploring this demo."}
          </p>
          <Link href="/settings">{t("settings")}</Link>
        </div>
      ) : part === "guides" && path.split("/").length > 2 ? (
        <article className="panel prose">
          <h2>
            {fa ? "از یک سؤال خوب شروع کن" : "Start with a good question"}
          </h2>
          <p>
            {fa
              ? "هدف، مخاطب و شکل خروجی را روشن بنویس. برای مثال: «برای یک فروشگاه کوچک، سه ایدهٔ پست با لحن دوستانه بنویس.»"
              : "Describe your goal, audience and desired format. Try: “Write three friendly social post ideas for a small shop.”"}
          </p>
          <h2>{tl("قدم‌های کوچک", "Small steps")}</h2>
          <p>
            {fa
              ? "ابتدا یک نسخهٔ ساده بساز، نتیجه را ببین و جزئیات را بهتر کن. هزینهٔ هر عملیات کنار دکمهٔ ساخت نمایش داده می‌شود."
              : "Begin with a small version, review the result, and refine the details. Credit costs are visible before each action."}
          </p>
          <Link href="/chat" className="btn primary">
            {t("start")}
          </Link>
        </article>
      ) : (
        <>
          <div className="tool-grid">
            {tools
              .slice(part === "guides" ? 0 : 4, part === "guides" ? 3 : 10)
              .map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
          </div>
          <Link
            href={part === "guides" ? "/guides/getting-started" : "/register"}
            className="btn primary"
          >
            {part === "guides" ? t("read") : t("start")}
            <Icon name="ArrowLeft" size={17} />
          </Link>
        </>
      )}
    </div>
  );
}
