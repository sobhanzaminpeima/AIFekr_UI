// Generated from the classic tool pages (src/app/(dashboard)/tools/*): same wording and prompts.
import type { Locale } from "./i18n";

export type LiveToolField = { key: string; label: string; placeholder?: string };
export type LiveToolSpec = { title: string; description: string; systemPrompt: string; fields: LiveToolField[]; promptTemplate: (values: Record<string, string>) => string };
const tri = (lang: Locale, fa: string, en: string, de: string, tr?: string) => (lang === "fa" ? fa : lang === "de" ? de : lang === "tr" ? (tr ?? en) : en);

export const LIVE_TOOLS: Record<string, (lang: Locale) => LiveToolSpec> = {
  "business-ideas": (lang) => ({
    title: tri(lang, "ایده‌های کسب‌وکار", "Business Ideas", "Geschäftsideen"),
    description: tri(lang, "با هوش مصنوعی ایده‌های کسب‌وکار متناسب با شرایط شما بیابید", "Find business ideas tailored to your situation with AI", "Finden Sie mit KI Geschäftsideen, die zu Ihrer Situation passen"),
    systemPrompt: lang === "fa"
          ? "تو یک مشاور کسب‌وکار ایرانی حرفه‌ای هستی. ایده‌های کسب‌وکار خلاقانه و عملی با تحلیل سود/زیان و مراحل اجرا ارائه بده. همیشه به فارسی پاسخ بده."
          : lang === "de"
            ? "Du bist ein professioneller Unternehmensberater. Biete kreative, praktische Geschäftsideen mit Gewinn/Verlust-Analyse und Umsetzungsschritten an. Antworte immer auf Deutsch."
            : "You are a professional business consultant. Provide creative, practical business ideas with a profit/loss analysis and execution steps. Always respond in English.",
    fields: [
        { key: "field", label: tri(lang, "حوزه فعالیت", "Field of activity", "Tätigkeitsbereich"), placeholder: tri(lang, "مثال: فناوری، غذا، آموزش...", "e.g. technology, food, education...", "z.B. Technologie, Essen, Bildung...") },
        { key: "budget", label: tri(lang, "بودجه اولیه (تومان)", "Initial budget", "Erstinvestition"), placeholder: tri(lang, "مثال: ۵۰ میلیون تومان", "e.g. $10,000", "z.B. 10.000 €") },
        { key: "experience", label: tri(lang, "تجربه و مهارت شما", "Your experience and skills", "Ihre Erfahrung und Fähigkeiten"), placeholder: tri(lang, "مثال: برنامه‌نویسی، آشپزی...", "e.g. programming, cooking...", "z.B. Programmieren, Kochen...") },
        { key: "city", label: tri(lang, "شهر", "City", "Stadt"), placeholder: tri(lang, "مثال: تهران، اصفهان...", "e.g. Tehran, New York...", "z.B. Berlin, München...") },
      ],
    promptTemplate: ({ field, budget, experience, city }) =>
        lang === "fa"
          ? `می‌خواهم ایده‌های کسب‌وکار برای شرایط زیر داشته باشم:\\n- حوزه: ${field}\\n- بودجه: ${budget}\\n- تجربه: ${experience}\\n- شهر: ${city}\\n\\nلطفاً ۵ ایده با تحلیل سود/زیان و مراحل اجرا ارائه بده.`
          : lang === "de"
            ? `Ich möchte Geschäftsideen für folgende Bedingungen:\\n- Bereich: ${field}\\n- Budget: ${budget}\\n- Erfahrung: ${experience}\\n- Stadt: ${city}\\n\\nBitte 5 Ideen mit Gewinn/Verlust-Analyse und Umsetzungsschritten.`
            : `I want business ideas for the following conditions:\\n- Field: ${field}\\n- Budget: ${budget}\\n- Experience: ${experience}\\n- City: ${city}\\n\\nPlease provide 5 ideas with a profit/loss analysis and execution steps.`,
  }),
  "drop-shipping": (lang) => ({
    title: tri(lang, "راهنمای دراپشیپینگ", "Dropshipping Guide", "Dropshipping-Leitfaden"),
    description: tri(lang, "راهنمای کامل شروع کسب‌وکار دراپشیپینگ متناسب با شرایط شما", "A complete guide to starting a dropshipping business tailored to your situation", "Ein kompletter Leitfaden für den Start eines Dropshipping-Geschäfts, angepasst an Ihre Situation"),
    systemPrompt: lang === "fa"
          ? "تو یک متخصص دراپشیپینگ و تجارت الکترونیک هستی. راهنمایی‌های عملی، محصولات پرسود و استراتژی‌های موفق ارائه بده. همیشه به فارسی پاسخ بده."
          : lang === "de"
            ? "Du bist ein Dropshipping- und E-Commerce-Spezialist. Biete praktische Anleitungen, profitable Produkte und erfolgreiche Strategien an. Antworte immer auf Deutsch."
            : "You are a dropshipping and e-commerce specialist. Provide practical guidance, profitable products, and successful strategies. Always respond in English.",
    fields: [
        { key: "budget", label: tri(lang, "بودجه اولیه (دلار)", "Initial budget (USD)", "Erstinvestition (EUR)"), placeholder: tri(lang, "مثال: ۵۰۰ دلار", "e.g. $500", "z.B. 500 €") },
        { key: "country", label: tri(lang, "کشور هدف بازار", "Target market country", "Zielmarkt-Land"), placeholder: tri(lang, "مثال: آمریکا، اروپا، ایران...", "e.g. USA, Europe, Iran...", "z.B. USA, Europe, Deutschland...") },
        { key: "category", label: tri(lang, "دسته محصول علاقه‌مند", "Product category of interest", "Produktkategorie von Interesse"), placeholder: tri(lang, "مثال: الکترونیک، لوازم خانه، پوشاک...", "e.g. electronics, home goods, apparel...", "z.B. Elektronik, Haushaltswaren, Bekleidung...") },
      ],
    promptTemplate: ({ budget, country, category }) =>
        lang === "fa"
          ? `یک برنامه کامل دراپشیپینگ برای شرایط زیر بده:\\n- بودجه: ${budget}\\n- بازار هدف: ${country}\\n- دسته محصول: ${category}\\n\\nشامل: پلتفرم مناسب، تأمین‌کننده‌ها، استراتژی قیمت‌گذاری و مراحل شروع.`
          : lang === "de"
            ? `Erstellen Sie einen vollständigen Dropshipping-Plan für folgende Bedingungen:\\n- Budget: ${budget}\\n- Zielmarkt: ${country}\\n- Produktkategorie: ${category}\\n\\nEinschließlich: richtige Plattform, Lieferanten, Preisgestaltung und Schritte zum Start.`
            : `Provide a complete dropshipping plan for the following conditions:\\n- Budget: ${budget}\\n- Target market: ${country}\\n- Product category: ${category}\\n\\nInclude: the right platform, suppliers, pricing strategy, and steps to get started.`,
  }),
  "healthy-diet": (lang) => ({
    title: tri(lang, "برنامه غذایی سالم", "Healthy Diet Plan", "Gesunder Ernährungsplan"),
    description: tri(lang, "برنامه غذایی شخصی‌سازی‌شده متناسب با اهداف و شرایط بدنی شما", "A personalized diet plan tailored to your goals and physical condition", "Ein personalisierter Ernährungsplan, angepasst an Ihre Ziele und körperliche Verfassung"),
    systemPrompt: lang === "fa"
          ? "تو یک متخصص تغذیه هستی. برنامه‌های غذایی علمی، سالم و عملی با توجه به شرایط جسمانی و اهداف کاربر ارائه بده. تأکید کن که برای بیماری‌های خاص حتماً با پزشک مشورت شود. همیشه به فارسی پاسخ بده."
          : lang === "de"
            ? "Du bist ein Ernährungsexperte. Biete wissenschaftliche, gesunde und praktische Ernährungspläne basierend auf dem körperlichen Zustand und den Zielen des Nutzers an. Betone, dass bei bestimmten medizinischen Zuständen ein Arzt konsultiert werden muss. Antworte immer auf Deutsch."
            : "You are a nutrition specialist. Provide scientific, healthy, and practical diet plans based on the user's physical condition and goals. Emphasize that for specific medical conditions, a doctor must be consulted. Always respond in English.",
    fields: [
        { key: "age", label: tri(lang, "سن", "Age", "Alter"), placeholder: tri(lang, "مثال: ۳۰", "e.g. 30", "z.B. 30") },
        { key: "weight", label: tri(lang, "وزن (کیلوگرم)", "Weight (kg)", "Gewicht (kg)"), placeholder: tri(lang, "مثال: ۷۵", "e.g. 75", "z.B. 75") },
        { key: "height", label: tri(lang, "قد (سانتیمتر)", "Height (cm)", "Größe (cm)"), placeholder: tri(lang, "مثال: ۱۷۵", "e.g. 175", "z.B. 175") },
        { key: "goal", label: tri(lang, "هدف", "Goal", "Ziel"), placeholder: tri(lang, "مثال: کاهش وزن، افزایش عضله، سلامت عمومی...", "e.g. weight loss, muscle gain, general health...", "z.B. Gewichtsverlust, Muskelaufbau, allgemeine Gesundheit...") },
        { key: "conditions", label: tri(lang, "بیماری خاص (اگر دارید)", "Medical conditions (if any)", "Medizinische Vorerkrankungen (falls vorhanden)"), placeholder: tri(lang, "مثال: دیابت، فشار خون، بدون بیماری...", "e.g. diabetes, high blood pressure, none...", "z.B. Diabetes, Bluthochdruck, keine...") },
      ],
    promptTemplate: ({ age, weight, height, goal, conditions }) =>
        lang === "fa"
          ? `یک برنامه غذایی هفتگی برای من تهیه کن:\\n- سن: ${age} سال\\n- وزن: ${weight} کیلوگرم\\n- قد: ${height} سانتیمتر\\n- هدف: ${goal}\\n- شرایط خاص: ${conditions}\\n\\nبرنامه هفتگی کامل با صبحانه، ناهار، شام و میان‌وعده بده.`
          : lang === "de"
            ? `Erstellen Sie einen wöchentlichen Ernährungsplan für mich:\\n- Alter: ${age} Jahre\\n- Gewicht: ${weight} kg\\n- Größe: ${height} cm\\n- Ziel: ${goal}\\n- Medizinische Vorerkrankungen: ${conditions}\\n\\nBitte einen vollständigen Wochenplan mit Frühstück, Mittagessen, Abendessen und Snacks.`
            : `Prepare a weekly diet plan for me:\\n- Age: ${age} years\\n- Weight: ${weight} kg\\n- Height: ${height} cm\\n- Goal: ${goal}\\n- Medical conditions: ${conditions}\\n\\nProvide a complete weekly plan with breakfast, lunch, dinner, and snacks.`,
  }),
  "math": (lang) => ({
    title: tri(lang, "حل مسائل ریاضی", "Math Problem Solver", "Mathematik-Löser"),
    description: tri(lang, "مسائل ریاضی خود را با حل کامل و توضیح مرحله به مرحله دریافت کنید", "Get your math problems solved completely with step-by-step explanations", "Lösen Sie Ihre Mathematikprobleme mit vollständiger Schritt-für-Schritt-Erklärung"),
    systemPrompt: lang === "fa"
          ? "تو یک استاد ریاضیات متخصص هستی. مسائل ریاضی را گام‌به‌گام حل کن، هر مرحله را توضیح بده و فرمول‌های مورد استفاده را ذکر کن. از نماد ریاضی استاندارد استفاده کن. همیشه به فارسی توضیح بده."
          : lang === "de"
            ? "Du bist ein Experte für Mathematik. Löse Mathematikprobleme Schritt für Schritt, erkläre jeden Schritt und nenne die verwendeten Formeln. Verwende die Standard-Mathematiknotation. Erkläre immer auf Deutsch."
            : "You are an expert mathematics professor. Solve math problems step by step, explain each step, and state the formulas used. Use standard mathematical notation. Always explain in English.",
    fields: [
        { key: "problem", label: tri(lang, "مسئله ریاضی", "Math problem", "Mathematik-Aufgabe"), placeholder: tri(lang, "مثال: انتگرال sin(x)cos(x) را محاسبه کنید...", "e.g. Compute the integral of sin(x)cos(x)...", "z.B. Berechnen Sie das Integral von sin(x)cos(x)...") },
        { key: "level", label: tri(lang, "سطح تحصیلی", "Education level", "Bildungsniveau"), placeholder: tri(lang, "مثال: دبیرستان، دانشگاه، المپیاد...", "e.g. high school, university, olympiad...", "z.B. Gymnasium, Universität, Olympiade...") },
      ],
    promptTemplate: ({ problem, level }) =>
        lang === "fa"
          ? `این مسئله ریاضی را حل کن:\\n${problem}\\n\\nسطح: ${level}\\n\\nلطفاً گام‌به‌گام با توضیح کامل حل کن.`
          : lang === "de"
            ? `Lösen Sie diese Mathematikaufgabe:\\n${problem}\\n\\nNiveau: ${level}\\n\\nBitte Schritt für Schritt mit vollständiger Erklärung lösen.`
            : `Solve this math problem:\\n${problem}\\n\\nLevel: ${level}\\n\\nPlease solve it step by step with a complete explanation.`,
  }),
  "trading": (lang) => ({
    title: tri(lang, "تحلیل بازارهای مالی", "Financial Market Analysis", "Finanzmarkt-Analyse"),
    description: tri(lang, "تحلیل تکنیکال و بنیادی برای فارکس و ارز دیجیتال", "Technical and fundamental analysis for forex and cryptocurrency", "Technische und fundamentale Analyse für Forex und Kryptowährungen"),
    systemPrompt: lang === "fa"
          ? "تو یک تحلیلگر بازارهای مالی هستی که تحلیل‌های تکنیکال و بنیادی ارائه می‌دهی. تأکید کن که این مشاوره سرمایه‌گذاری نیست و کاربر باید ریسک‌ها را خودش مدیریت کند. همیشه به فارسی پاسخ بده."
          : lang === "de"
            ? "Du bist ein Finanzmarktanalyst, der technische und fundamentale Analysen durchführt. Betonen Sie, dass dies keine Anlageberatung ist und der Nutzer seine eigenen Risiken verwalten muss. Antworte immer auf Deutsch."
            : "You are a financial markets analyst who provides technical and fundamental analysis. Emphasize that this is not investment advice and the user must manage their own risks. Always respond in English.",
    fields: [
        { key: "pair", label: tri(lang, "جفت ارز یا دارایی", "Currency pair or asset", "Währungspaar oder Vermögenswert"), placeholder: tri(lang, "مثال: BTC/USDT، EUR/USD، طلا...", "e.g. BTC/USDT, EUR/USD, gold...", "z.B. BTC/USDT, EUR/USD, Gold...") },
        { key: "timeframe", label: tri(lang, "تایم‌فریم", "Timeframe", "Zeitrahmen"), placeholder: tri(lang, "مثال: ۱ ساعته، روزانه، هفتگی...", "e.g. 1-hour, daily, weekly...", "z.B. 1-Stunden, täglich, wöchentlich...") },
        { key: "style", label: tri(lang, "سبک معاملاتی", "Trading style", "Handelsstil"), placeholder: tri(lang, "مثال: اسکالپ، سوئینگ، بلند مدت...", "e.g. scalping, swing, long-term...", "z.B. Scalping, Swing, langfristig...") },
      ],
    promptTemplate: ({ pair, timeframe, style }) =>
        lang === "fa"
          ? `⚠️ این درخواست فقط برای اهداف آموزشی است.\\n\\nتحلیل ${pair} در تایم‌فریم ${timeframe} با سبک ${style} را ارائه بده. سطوح حمایت و مقاومت، اندیکاتورهای مهم و سناریوهای احتمالی را بررسی کن.`
          : lang === "de"
            ? `⚠️ Diese Anfrage dient nur zu Bildungszwecken.\\n\\nErstellen Sie eine Analyse von ${pair} im Zeitrahmen ${timeframe} mit dem Handelsstil ${style}. Behandeln Sie Unterstützungs- und Widerstandsniveaus, wichtige Indikatoren und mögliche Szenarien.`
            : `⚠️ This request is for educational purposes only.\\n\\nProvide an analysis of ${pair} on the ${timeframe} timeframe with a ${style} trading style. Cover support and resistance levels, key indicators, and possible scenarios.`,
  }),
};
