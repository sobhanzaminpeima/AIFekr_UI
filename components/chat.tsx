"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from 'next/link';
import { useApp } from "./providers";
import { Button, copy, Icon, Modal } from "./ui";
import * as api from "@/lib/api/client";
import { toast } from "sonner";
type Message = { role: "user" | "assistant"; text: string };
export function Chat({ persona }: { persona?: string }) {
  const { t, fa, n, spend, topup } = useApp();
  const query = useSearchParams();
  const [prompt, setPrompt] = useState(query.get("prompt") || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState("all");
  const [modelCost, setModelCost] = useState(2);
  const cost =
    mode === "all"
      ? modelCost
      : ({ image: 12, video: 45, music: 20, voice: 8 }[mode] ?? 2);
  const [share, setShare] = useState(false);
  const [file, setFile] = useState("");
  const [mic, setMic] = useState(false);
  const cancel = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMessages([]);
    setPrompt(query.get("prompt") || "");
    cancel.current = true;
    setBusy(false);
  }, [query]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(
    () => () => {
      cancel.current = true;
    },
    [],
  );
  async function send(text = prompt) {
    if (!text.trim() || busy) return;
    if (!spend(cost)) return;
    cancel.current = false;
    setPrompt("");
    setError(false);
    setMessages((m) => [
      ...m,
      { role: "user", text: text + (file ? "\n📎 " + file : "") },
    ]);
    setFile("");
    setBusy(true);
    try {
      const answer = await api.chat(text, fa);
      if (cancel.current) return;
      setMessages((m) => [...m, { role: "assistant", text: "" }]);
      for (let i = 0; i < answer.length; i += 6) {
        if (cancel.current) break;
        await new Promise((r) => setTimeout(r, 12));
        setMessages((m) =>
          m.map((v, j) =>
            j === m.length - 1 ? { ...v, text: answer.slice(0, i + 6) } : v,
          ),
        );
      }
    } catch {
      setError(true);
      topup(cost);
    } finally {
      setBusy(false);
    }
  }
  const suggestions = fa
    ? [
        "برای یک برند خلاق، ایده بده",
        "این موضوع را ساده توضیح بده",
        "برنامهٔ این هفته‌ام را بچین",
        "یک داستان کوتاه بنویس",
      ]
    : [
        "Brainstorm a creative brand",
        "Explain a complex topic simply",
        "Plan a productive week",
        "Write a short story",
      ];
  return (
    <div className={`chat-page ${messages.length ? "has-messages" : ""}`}>
      <div className="chat-heading">
        <select
          aria-label={t("model")}
          value={modelCost}
          onChange={(e) => setModelCost(Number(e.target.value))}
        >
          <option value={2}>
            {t("auto")} · {n(2)} ✦
          </option>
          <option value={4}>GPT · {n(4)} ✦</option>
          <option value={5}>Claude · {n(5)} ✦</option>
          <option value={3}>Gemini · {n(3)} ✦</option>
        </select>
        <span className="badge">{t("mock")}</span>
        <button
          className="icon-btn"
          aria-label={t("newChat")}
          onClick={() => setMessages([])}
        >
          <Icon name="SquarePen" />
        </button>
      </div>
      {!messages.length ? (
        <div className="chat-welcome">
          <div className="big-spark">✦</div>
          <span className="eyebrow">AIFekr INTELLIGENCE</span>
          <h1>
            {persona ||
              (fa
                ? "هر فکری داری، از اینجا شروع کن."
                : "Every idea begins with a conversation.")}
          </h1>
          <p>
            {fa
              ? "بنویس، بپرس، تصور کن. من کنارت هستم."
              : "Write, wonder, imagine. I’m right here with you."}
          </p>
          <div className="chat-suggestions">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => setPrompt(s)}>
                <Icon
                  name={["Lightbulb", "BookOpen", "CalendarDays", "Feather"][i]}
                  size={21}
                />
                <span>{s}</span>
                <Icon name="ArrowUpLeft" size={16} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages">
          {messages.map((m, i) => (
            <article key={i} className={`message ${m.role}`}>
              <span className={m.role === "assistant" ? "ai-avatar" : "avatar"}>
                {m.role === "assistant" ? "✦" : "س"}
              </span>
              <div>
                <strong>
                  {m.role === "assistant" ? "ای آی فکر" : fa ? "شما" : "You"}
                </strong>
                <div className="message-text">
                  {m.text || (
                    <span className="thinking">
                      ✦ {fa ? "در حال فکر کردن…" : "Thinking…"}
                    </span>
                  )}
                </div>
                {m.role === "assistant" && m.text && (
                  <div className="message-actions">
                    <button
                      className="icon-btn"
                      aria-label={t("copy")}
                      onClick={() => copy(m.text)}
                    >
                      <Icon name="Copy" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={t("retry")}
                      disabled={busy}
                      onClick={() => send(messages[i - 1]?.text)}
                    >
                      <Icon name="RefreshCw" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={fa ? "اشتراک‌گذاری" : "Share"}
                      onClick={() => setShare(true)}
                    >
                      <Icon name="Share2" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={t("edit")}
                      onClick={() => setPrompt(messages[i - 1]?.text || "")}
                    >
                      <Icon name="Pencil" size={16} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
          {error && (
            <div role="alert" className="error-banner">
              {t("error")} · {fa ? "اعتبار بازگشت داده شد" : "Credits refunded"}
              <Button onClick={() => send(messages[messages.length - 1]?.text)}>
                {t("retry")}
              </Button>
            </div>
          )}
          <div ref={bottom} />
        </div>
      )}
      <div className="chat-composer-wrap">
        <div className="chips mode-chips">
          {(["all", "image", "video", "music", "voice"] as const).map((key) => (
            <button
              key={key}
              className={mode === key ? "selected" : ""}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {t(key)}
            </button>
          ))}
        </div>
        {mode === 'voice' && <div className="chat-voice-entry"><span className="chat-voice-symbol"><Icon name="AudioLines" size={23}/></span><div><strong>{fa?'به نوشته‌هایت صدا بده':'Give your words a voice'}</strong><p>{fa?'انتخاب صدا، تنظیم لحن و ساخت فایل صوتی در استودیوی صدا.':'Choose a voice, adjust the tone and create audio in Voice Studio.'}</p></div><Link href={'/voice-studio?tab=generate'+(prompt.trim()?'&prompt='+encodeURIComponent(prompt):'')} className="chat-voice-link">{fa?'ورود به استودیوی صدا':'Open Voice Studio'}<Icon name="ArrowUpLeft" size={16}/></Link></div>}
        {file && (
          <span className="badge">
            📎 {file}
            <button onClick={() => setFile("")} aria-label={t("delete")}>
              ×
            </button>
          </span>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode !== "all") {
              location.href =
                (mode === 'voice' ? '/voice-studio?tab=generate&prompt=' : '/create/' + mode + '?prompt=') + encodeURIComponent(prompt);
              return;
            }
            send();
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("prompt")}
            rows={3}
          />
          <div className="composer-bottom">
            <div>
              <input
                hidden
                type="file"
                ref={fileRef}
                onChange={(e) => {
                  setFile(e.target.files?.[0]?.name || "");
                  toast.success(t("attached"));
                }}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => fileRef.current?.click()}
                aria-label={fa ? "پیوست فایل" : "Attach file"}
              >
                <Icon name="Paperclip" size={19} />
              </button>
              <button
                type="button"
                className={`icon-btn ${mic ? "recording" : ""}`}
                onClick={() => {
                  setMic(!mic);
                  toast.info(
                    fa
                      ? "ضبط صدا در این نسخه شبیه‌سازی می‌شود."
                      : "Voice capture is simulated in this demo.",
                  );
                }}
                aria-label={fa?'ورودی صوتی (آزمایشی)':'Voice input (demo)'}
              >
                <Icon name={mic ? "Square" : "Mic"} size={19} />
              </button>
              <select aria-label={fa ? "حالت گفتگو" : "Conversation mode"}>
                <option>{t("fast")}</option>
                <option>{t("deep")}</option>
                <option>{t("web")}</option>
              </select>
            </div>
            <span className="muted">
              ≈ {n(cost)} {t("credits")}
            </span>
            {busy ? (
              <Button
                onClick={() => {
                  cancel.current = true;
                  setBusy(false);
                }}
              >
                <Icon name="Square" size={15} />
                {t("stop")}
              </Button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={!prompt.trim()}
                aria-label={t("send")}
              >
                <Icon name="ArrowUp" />
              </button>
            )}
          </div>
        </form>
        <p className="composer-note">
          {fa
            ? "ای آی فکر ممکن است اشتباه کند. اطلاعات مهم را بررسی کن. پاسخ‌ها در این نسخه آزمایشی هستند."
            : "AIFekr can make mistakes. Check important information. Responses in this demo are simulated."}
        </p>
      </div>
      {share && (
        <Modal
          title={fa ? "اشتراک گفتگو" : "Share conversation"}
          onClose={() => setShare(false)}
        >
          <p>
            {fa
              ? "پیوند نمایشی فقط یک گفتگوی نمونه را نشان می‌دهد."
              : "This demo link shows a sample conversation."}
          </p>
          <Button onClick={() => copy(location.origin + "/share/demo")}>
            {t("copy")}
          </Button>
        </Modal>
      )}
    </div>
  );
}
