"use client";
import { useEffect, useId, useState } from "react";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { AIText } from "./ai-text";
import { Button, Icon } from "./ui";
import { LIVE_TOOLS } from "@/lib/live-tools";

function ToolHero({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="module-hero">
      <span className="module-hero-icon" aria-hidden="true"><Icon name={icon} size={26} /></span>
      <div className="section-title"><div><h2>{title}</h2><p>{description}</p></div></div>
    </div>
  );
}

/** A guided AI tool: fill in a few fields, read the answer. Billed by /api/chat like any chat message. */
export function LiveTool({ slug }: { slug: string }) {
  const { tl } = useApp();
  const lang = useShell()!.lang;
  const spec = LIVE_TOOLS[slug](lang);
  const id = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const missing = spec.fields.find((f) => !values[f.key]?.trim());
    if (missing) return setError(tl(`لطفاً ${missing.label} را وارد کنید`, `Please enter ${missing.label}`));
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: spec.promptTemplate(values),
          systemPrompt: lang === "tr" ? spec.systemPrompt + " Always respond in Turkish." : spec.systemPrompt,
          history: [],
        }),
      });
      if (!response.ok) throw Error((await response.json().catch(() => ({}))).error || "");
      const reader = response.body?.getReader();
      if (!reader) throw Error("");
      const decoder = new TextDecoder();
      let text = "", buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) { text += parsed.text; setResult(text); }
          } catch {}
        }
      }
    } catch (e) {
      setError((e instanceof Error && e.message) || tl("خطا در پردازش", "Processing error"));
    } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(result); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError(tl("متن را انتخاب و کپی کنید.", "Select and copy the text manually.")); }
  }

  return (
    <div className="module-workspace accent-amber" data-module="startup">
      <ToolHero icon="Lightbulb" title={spec.title} description={spec.description} />
      <div className="tool-grid">
        <form className="panel" onSubmit={run}>
          <h3>{tl("اطلاعات شما", "Your information")}</h3>
          {spec.fields.map((f) => (
            <div className="tool-field" key={f.key}>
              <label htmlFor={id + f.key}>{f.label}</label>
              <input id={id + f.key} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            </div>
          ))}
          {error && <p role="alert">{error}</p>}
          <Button type="submit" variant="primary" className="full" disabled={busy}>{busy ? tl("در حال پردازش…", "Processing…") : tl("دریافت نتیجه", "Get result")}</Button>
        </form>
        <section className="panel" aria-live="polite">
          <div className="row-between">
            <h3>{tl("نتیجه", "Result")}</h3>
            {result && <Button onClick={copy}>{copied ? tl("کپی شد", "Copied") : tl("کپی", "Copy")}</Button>}
          </div>
          {result ? <AIText text={result} /> : <p className="crm-empty">{tl("نتیجه اینجا نمایش داده می‌شود", "Your result will appear here")}</p>}
        </section>
      </div>
    </div>
  );
}

type Puter = { ai: { chat: (prompt: string, opts?: { model?: string }) => Promise<string>; txt2img: (prompt: string, opts?: { model?: string }) => Promise<HTMLImageElement> } };
const puter = () => (window as unknown as { puter?: Puter }).puter;

/** Experimental: runs in the visitor's own puter.com account. No AIFekr credit or backend route is involved. */
export function LiveTryFree() {
  const { tl } = useApp();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState({ prompt: "", result: "", busy: false, error: "" });
  const [image, setImage] = useState({ prompt: "", url: "", busy: false, error: "" });
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-puter]');
    if (existing) { setReady(!!puter()); existing.addEventListener("load", () => setReady(true)); return; }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.dataset.puter = "1";
    script.onload = () => setReady(true);
    document.head.append(script);
  }, []);
  const failed = tl("خطا در ارتباط با Puter", "Puter request failed");
  async function runText() {
    if (!text.prompt.trim() || !puter()) return;
    setText((t) => ({ ...t, busy: true, error: "", result: "" }));
    try { const result = await puter()!.ai.chat(text.prompt.trim(), { model: "gpt-5.4-nano" }); setText((t) => ({ ...t, result, busy: false })); }
    catch (e) { setText((t) => ({ ...t, busy: false, error: (e instanceof Error && e.message) || failed })); }
  }
  async function runImage() {
    if (!image.prompt.trim() || !puter()) return;
    setImage((t) => ({ ...t, busy: true, error: "", url: "" }));
    try { const el = await puter()!.ai.txt2img(image.prompt.trim(), { model: "gpt-image-1-mini" }); setImage((t) => ({ ...t, url: el.src, busy: false })); }
    catch (e) { setImage((t) => ({ ...t, busy: false, error: (e instanceof Error && e.message) || failed })); }
  }
  return (
    <div className="module-workspace accent-purple" data-module="startup">
      <ToolHero icon="Sparkles" title={tl("امتحان AI رایگان (آزمایشی)", "Try Free AI (Experimental)")} description={tl("با حساب Puter.com شخصی خودتان، جدا از اعتبار AIFekr", "Uses your own puter.com account, separate from AIFekr credits")} />
      <p className="panel">{tl("این ابزار آزمایشی از سرویس شخص ثالث Puter.js استفاده می‌کند و بار اول از شما می‌خواهد وارد حساب puter.com خودتان شوید.", "This experimental tool uses the third-party Puter.js service. The first time, it asks you to sign in to your own puter.com account.")}</p>
      <div className="tool-grid">
        <section className="panel">
          <h3>{tl("تولید متن", "Text generation")}</h3>
          <div className="tool-field"><textarea rows={4} aria-label={tl("درخواست متن", "Text request")} placeholder={tl("سؤال یا درخواست خود را بنویسید…", "Ask anything…")} value={text.prompt} onChange={(e) => setText((t) => ({ ...t, prompt: e.target.value }))} /></div>
          <Button variant="primary" disabled={!ready || text.busy || !text.prompt.trim()} onClick={runText}>{tl("تولید متن", "Generate text")}</Button>
          {text.error && <p role="alert">{text.error}</p>}
          {text.result && <div className="domain-card"><AIText text={text.result} /></div>}
        </section>
        <section className="panel">
          <h3>{tl("تولید تصویر", "Image generation")}</h3>
          <div className="tool-field"><input aria-label={tl("توضیح تصویر", "Image description")} placeholder={tl("توضیح تصویر مورد نظر…", "Describe the image…")} value={image.prompt} onChange={(e) => setImage((t) => ({ ...t, prompt: e.target.value }))} /></div>
          <Button variant="primary" disabled={!ready || image.busy || !image.prompt.trim()} onClick={runImage}>{tl("تولید تصویر", "Generate image")}</Button>
          {image.error && <p role="alert">{image.error}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image.url && <img src={image.url} alt={image.prompt} className="tool-image" />}
        </section>
      </div>
    </div>
  );
}
