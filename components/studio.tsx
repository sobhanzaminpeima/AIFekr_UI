"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "./providers";
import {
  Button,
  download,
  Empty,
  ErrorState,
  Icon,
  Modal,
  SectionTitle,
} from "./ui";
import { Tool } from "@/mocks/catalog";
import * as api from "@/lib/api/client";
import { toast } from "sonner";
export function Studio({ tool }: { tool: Tool }) {
  const { t, fa, n, credits, spend, topup, items, addItem } = useApp();
  const query = useSearchParams();
  const [prompt, setPrompt] = useState(query.get("prompt") || "");
  const [confirm, setConfirm] = useState(false);
  const [stage, setStage] = useState<api.JobStage | "">("");
  const [progress, setProgress] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [tab, setTab] = useState("prompt");
  const [selected, setSelected] = useState("warm");
  const [consent, setConsent] = useState(false);
  const [voice, setVoice] = useState("nora");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playingId, setPlayingId] = useState("");
  const activeAudio = useRef<AudioContext | null>(null);
  const type = tool.slug.split("/").pop() || "image";
  const mine = items.filter((i) => i.type === type);
  const steps =
    type === "voice"
      ? fa
        ? ["متن و زبان", "انتخاب صدا", "ساخت و شنیدن"]
        : ["Script", "Voice", "Generate"]
      : fa
        ? [
            "ایده و منابع",
            "فیلمنامه",
            "استوری‌بورد",
            "صدا و موسیقی",
            "تأیید هزینه",
            "تولید",
            "بازبینی",
          ]
        : [
            "Idea & sources",
            "Script",
            "Storyboard",
            "Soundtrack",
            "Approve costs",
            "Production",
            "Review",
          ];
  useEffect(
    () => () => {
      activeAudio.current?.close();
    },
    [],
  );
  async function run() {
    setConfirm(false);
    if (!spend(tool.cost)) return;
    setStage("queued");
    setTab("results");
    setProgress(0);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setStage("running");
      for (let p = 10; p <= 90; p += 20) {
        await new Promise((r) => setTimeout(r, 250));
        setProgress(p);
      }
      const item = await api.generate(prompt, type);
      addItem(item);
      setProgress(100);
      setStage("done");
      toast.success(t("done"));
    } catch {
      setStage("failed");
      topup(tool.cost);
    }
  }
  async function play(id: string) {
    if (playingId === id && playing) {
      await activeAudio.current?.close();
      setPlaying(false);
      return;
    }
    await activeAudio.current?.close();
    const ctx = new AudioContext();
    activeAudio.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "music" ? 220 : 330;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);
    setPlayingId(id);
    setPlaying(true);
    osc.onended = () => setPlaying(false);
    toast.info(
      fa
        ? "پیش‌شنو آزمایشی؛ صدای تولیدشدهٔ واقعی نیست."
        : "Demo tone, not AI-generated audio.",
    );
  }
  return (
    <div className="studio-page">
      <SectionTitle
        title={fa ? tool.fa : tool.en}
        subtitle={fa ? tool.description : tool.descriptionEn}
      >
        <span className="badge">{t("mock")}</span>
      </SectionTitle>
      {(type === "voice" || tool.kind === "wizard") && (
        <div className="stepper">
          {steps.map((s, i) => (
            <button
              key={s}
              className={step === i ? "current" : i < step ? "completed" : ""}
              onClick={() => setStep(i)}
            >
              <span>{n(i + 1)}</span>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="studio-tabs chips">
        {["prompt", "results", "history"].map((k) => (
          <button
            className={tab === k ? "selected" : ""}
            onClick={() => setTab(k)}
            key={k}
          >
            {t(k as "prompt")}
          </button>
        ))}
      </div>
      <div className="studio-layout">
        <section
          className={`panel prompt-panel mobile-${tab === "prompt" ? "show" : "hide"}`}
        >
          <label className="field-label">{t("prompt")}</label>
          <textarea
            aria-label={t("prompt")}
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              fa
                ? "یک دنیای مینیمال با نور گرم نارنجی، بافت طبیعی و جزئیات سینمایی…"
                : "A minimal world with warm orange light, natural textures and cinematic detail…"
            }
          />
          <label className="field-label">
            {fa ? "سبک و حال‌وهوا" : "Style & mood"}
          </label>
          <div className="style-grid">
            {[
              ["warm", "گرم و طبیعی", "Warm", "/art/orbit.svg"],
              ["cinematic", "سینمایی", "Cinematic", "/art/waves.svg"],
              ["minimal", "مینیمال", "Minimal", "/art/voice.svg"],
            ].map(([id, a, b, src]) => (
              <button
                className={selected === id ? "selected" : ""}
                key={id}
                onClick={() => setSelected(id)}
              >
                <img src={src} alt="" />
                <span>{fa ? a : b}</span>
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              {type === "music"
                ? fa
                  ? "مدت"
                  : "Duration"
                : type === "voice"
                  ? fa
                    ? "زبان"
                    : "Language"
                  : fa
                    ? "نسبت تصویر"
                    : "Aspect ratio"}
              <select>
                <option>
                  {type === "music"
                    ? "30s"
                    : type === "voice"
                      ? "فارسی"
                      : "1:1"}
                </option>
                <option>
                  {type === "music"
                    ? "60s"
                    : type === "voice"
                      ? "English"
                      : "16:9"}
                </option>
                <option>
                  {type === "music"
                    ? "120s"
                    : type === "voice"
                      ? "Deutsch"
                      : "9:16"}
                </option>
              </select>
            </label>
            <label>
              {t("model")}
              <select>
                <option>{t("auto")}</option>
                <option>Studio Pro</option>
                <option>Studio Fast</option>
              </select>
            </label>
          </div>
          {type === "voice" && (
            <>
              <label>
                {fa ? "صدا" : "Voice"}
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  <option value="nora">
                    {fa ? "نورا · گرم و دوستانه" : "Nora · Warm"}
                  </option>
                  <option value="arman">
                    {fa ? "آرمان · آرام و عمیق" : "Arman · Calm"}
                  </option>
                  <option value="own">{fa ? "صدای شخصی" : "My voice"}</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                {fa
                  ? "برای استفاده از صدای شخصی رضایت دارم."
                  : "I consent to using my own voice."}
              </label>
            </>
          )}
          <button
            className="advanced-toggle"
            onClick={() => setAdvanced(!advanced)}
          >
            <Icon name="SlidersHorizontal" size={16} />
            {t("advanced")}
            <Icon name={advanced ? "ChevronUp" : "ChevronDown"} size={16} />
          </button>
          {advanced && (
            <div className="advanced-fields">
              <label>
                {fa ? "کیفیت" : "Quality"}
                <select>
                  <option>Standard</option>
                  <option>HD</option>
                </select>
              </label>
              <label>
                {fa ? "شدت خلاقیت" : "Creativity"}
                <input type="range" min="0" max="100" defaultValue="60" />
              </label>
              <label>
                {fa ? "موارد ناخواسته" : "Negative prompt"}
                <input
                  placeholder={fa ? "تاری، متن، نویز…" : "Blur, text, noise…"}
                />
              </label>
              <label className="file-drop">
                <Icon name="Upload" />
                {fa ? "بارگذاری مرجع" : "Upload reference"}
                <input
                  type="file"
                  onChange={() => toast.success(t("attached"))}
                />
              </label>
            </div>
          )}
          {(type === "voice" || tool.kind === "wizard") &&
            step < steps.length - 1 && (
              <Button onClick={() => setStep(step + 1)}>
                {t("next")}
                <Icon name="ArrowLeft" size={16} />
              </Button>
            )}
          <Button
            variant="primary full"
            disabled={
              !prompt.trim() ||
              stage === "running" ||
              stage === "queued" ||
              (voice === "own" && !consent)
            }
            onClick={() => setConfirm(true)}
          >
            <Icon name="Sparkles" size={18} />
            {t("generate")}
            <span>✦ {n(tool.cost)}</span>
          </Button>
          <p className="fine-print">
            {fa
              ? "اعتبار فقط برای عملیات موفق کسر می‌شود."
              : "Credits are refunded if generation fails."}{" "}
            · {t("balance")}: {n(credits)}
          </p>
        </section>
        <section
          className={`panel studio-canvas mobile-${tab === "results" ? "show" : "hide"}`}
        >
          <div className="row-between">
            <h3>{t("results")}</h3>
            <span className="badge">{t("preview")}</span>
          </div>
          {stage === "queued" || stage === "running" ? (
            <div className="job-progress">
              <div className="big-spark thinking">✦</div>
              <h3>{t(stage)}</h3>
              <p>
                {fa
                  ? "در حال آماده‌سازی جزئیات ایدهٔ تو…"
                  : "Bringing the details of your idea together…"}
              </p>
              <span className="meter">
                <i style={{ width: progress + "%" }} />
              </span>
              <strong>{n(progress)}٪</strong>
              <small>
                {fa
                  ? "پردازش نمایشی است؛ تولید واقعی انجام نمی‌شود."
                  : "Simulated processing; no live model is called."}
              </small>
            </div>
          ) : stage === "failed" ? (
            <ErrorState retry={() => setConfirm(true)} />
          ) : mine.length ? (
            <div className="generated-grid">
              {mine.slice(0, 4).map((item) => (
                <div className="generated-result" key={item.id}>
                  {type === "image" ? (
                    <img src="/art/orbit.svg" alt={item.prompt} />
                  ) : type === "video" || type === "video-factory" ? (
                    <div className="demo-video">
                      <img src="/art/waves.svg" alt={item.prompt} />
                      <span>
                        {fa ? "پیش‌نمایش استوری‌بورد" : "Storyboard preview"}
                      </span>
                    </div>
                  ) : (
                    <div className="audio-result">
                      <img src="/art/voice.svg" alt="" />
                      <button
                        className="play-icon"
                        aria-label={playing ? t("stop") : t("preview")}
                        onClick={() => play(item.id)}
                      >
                        <Icon
                          name={
                            playing && playingId === item.id ? "Pause" : "Play"
                          }
                        />
                      </button>
                    </div>
                  )}
                  <p>{item.prompt}</p>
                  <div className="row-between">
                    <small>{t("mock")}</small>
                    <Button
                      onClick={() => {
                        if (type === "image") {
                          const a = document.createElement("a");
                          a.href = "/art/orbit.svg";
                          a.download = "aifekr-demo.svg";
                          a.click();
                        } else
                          download(
                            "aifekr-storyboard.txt",
                            item.prompt + "\n\nAIFekr simulated output.",
                          );
                      }}
                    >
                      <Icon name="Download" size={16} />
                      {t("download")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </section>
        <aside
          className={`panel studio-history mobile-${tab === "history" ? "show" : "hide"}`}
        >
          <h3>{t("history")}</h3>
          {mine.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPrompt(item.prompt);
                setTab("results");
              }}
            >
              <img
                src={type === "image" ? "/art/orbit.svg" : "/art/voice.svg"}
                alt=""
              />
              <span>{item.prompt.slice(0, 45)}</span>
            </button>
          ))}
          {!mine.length && <p className="muted">{t("empty")}</p>}
        </aside>
      </div>
      {confirm && (
        <Modal
          title={
            fa
              ? "آماده‌ای ایده‌ات را بسازی؟"
              : "Ready to bring your idea to life?"
          }
          onClose={() => setConfirm(false)}
        >
          <p>{prompt}</p>
          <dl className="cost-summary">
            <dt>{t("cost")}</dt>
            <dd>
              ✦ {n(tool.cost)} {t("credits")}
            </dd>
            <dt>{t("balance")}</dt>
            <dd>{n(credits - tool.cost)}</dd>
          </dl>
          <p className="muted">{t("mock")}</p>
          <Button variant="primary full" onClick={run}>
            {t("confirm")}
          </Button>
        </Modal>
      )}
    </div>
  );
}
