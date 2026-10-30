"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/site-link";
import { useApp } from "./providers";
import { Button, copy, Icon, Modal } from "./ui";
import * as api from "@/lib/api/client";
import { toast } from "sonner";
import { ActionCard, Answer, dataSourceLabel, MediaResult, MediaSettings, PromptBoxCard, TemplateGallery, useLiveChat, type LiveMessage } from "./live-chat";
type Message = { role: "user" | "assistant"; text: string };
export function Chat({ persona }: { persona?: string }) {
  const { t, fa, n, spend, topup } = useApp();
  const query = useSearchParams();
  // Live mode (signed in on aifekr.com): the real chat behind the same screen.
  const pathname = usePathname();
  const router = useRouter();
  const lc = useLiveChat(pathname?.startsWith("/chat/") ? decodeURIComponent(pathname.split("/")[2] || "") || null : null);
  const live = lc.enabled;
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const referenceRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState(query.get("prompt") || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState("all");
  const [modelCost, setModelCost] = useState(2);
  const cost = live
    ? (mode === "all" ? lc.chatCost : lc.mediaCost())
    : mode === "all"
      ? modelCost
      : ({ image: 12, video: 45, music: 20, voice: 8 }[mode] ?? 2);
  const liveBusy = lc.streaming || lc.generating;
  const chooseMode = (key: string) => { setMode(key); if (live) lc.setMediaType(key === "image" || key === "video" || key === "music" ? key : "chat"); };
  function liveSubmit() {
    if (lc.mediaType === "chat") void lc.send(prompt);
    else void lc.generate(prompt);
    setPrompt("");
  }
  async function liveShare(text: string) {
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
    copy(text);
  }
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
    const start = query.get("mode");
    if (live && (start === "image" || start === "video" || start === "music")) { setMode(start); lc.setMediaType(start); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, live]);
  useEffect(() => {
    if (!live) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, live]);
  // Live: the thread scrolls inside #main. A new turn always scrolls to the
  // answer; while it streams the view follows it unless the reader scrolled up.
  const follow = useRef(true);
  const turns = useRef(0);
  useEffect(() => {
    const el = document.getElementById("main");
    if (!live || !el) return;
    const onScroll = () => { follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [live]);
  useEffect(() => {
    const el = document.getElementById("main");
    if (!live || !el) return;
    const newTurn = lc.messages.length > turns.current;
    turns.current = lc.messages.length;
    if (newTurn) follow.current = true;
    if (follow.current) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: newTurn ? "smooth" : "auto" }));
  }, [live, lc.messages]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!live || !el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [live, prompt]);
  useEffect(
    () => () => {
      cancel.current = true;
    },
    [],
  );
  async function send(text = prompt) {
    if (!text.trim() || busy) return;
    if (!spend(cost ?? 0)) return;
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
      topup(cost ?? 0);
    } finally {
      setBusy(false);
    }
  }
  const suggestions = live
    ? lc.chat!.industrySlug === "real-estate" ? lc.chat!.starters.realEstate : lc.chat!.starters.general
    : fa
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
        {live ? (
          <select aria-label={lc.s("AI model")} value={lc.model} onChange={(e) => lc.setModel(e.target.value)} disabled={lc.mediaType !== "chat"}>
            <option value="auto">{lc.chat!.t.models.auto}{lc.chatCost != null && lc.model === "auto" ? ` · ${n(lc.chatCost)}+ ✦` : ""}</option>
            {lc.providers.map((p) => <option key={p.id} value={p.model}>{p.name}{p.creditCost != null ? ` · ${n(p.creditCost)} ✦` : ""}</option>)}
          </select>
        ) : (
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
        )}
        {live ? lc.activeProvider && <span className="badge">✦ {lc.activeProvider}</span> : <span className="badge">{t("mock")}</span>}
        <button
          className="icon-btn"
          aria-label={t("newChat")}
          onClick={() => (live ? router.push("/chat?new=" + Date.now()) : setMessages([]))}
        >
          <Icon name="SquarePen" />
        </button>
      </div>
      {!(live ? lc.messages.length : messages.length) ? (
        <div className="chat-welcome">
          <div className="big-spark">✦</div>
          <span className="eyebrow">AIFekr INTELLIGENCE</span>
          <h1>
            {persona ||
              (live ? lc.chat!.t.greeting : fa
                ? "هر فکری داری، از اینجا شروع کن."
                : "Every idea begins with a conversation.")}
          </h1>
          <p>
            {live ? lc.chat!.t.greetingSubtitle : fa
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
      ) : live ? (
        <div className="messages">
          {lc.messages.map((m, i) => <LiveMessageView key={m.id} m={m} i={i} lc={lc} onEdit={setPrompt} onShare={liveShare} />)}
          <div ref={bottom} />
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
              onClick={() => chooseMode(key)}
            >
              {t(key)}
            </button>
          ))}
        </div>
        {mode === 'voice' && <div className="chat-voice-entry"><span className="chat-voice-symbol"><Icon name="AudioLines" size={23}/></span><div><strong>{fa?'به نوشته‌هایت صدا بده':'Give your words a voice'}</strong><p>{fa?'انتخاب صدا، تنظیم لحن و ساخت فایل صوتی در استودیوی صدا.':'Choose a voice, adjust the tone and create audio in Voice Studio.'}</p></div><Link href={'/voice-studio?tab=generate'+(prompt.trim()?'&prompt='+encodeURIComponent(prompt):'')} className="chat-voice-link">{fa?'ورود به استودیوی صدا':'Open Voice Studio'}<Icon name="ArrowUpLeft" size={16}/></Link></div>}
        {live && (lc.documents.length > 0 || lc.sourceImages.length > 0) && (
          <div className="chips attachment-chips">
            {lc.documents.map((d, i) => (
              <span className="badge" key={d.nonce ?? i}>
                📎 {d.name}
                <button onClick={() => lc.setDocuments((prev) => prev.filter((_, x) => x !== i))} aria-label={lc.s("Remove file")}>×</button>
              </span>
            ))}
            {lc.sourceImages.map((url, i) => (
              <span className="badge reference-chip" key={url}>
                <img src={url} alt={lc.s("Reference photo")} />
                <button onClick={() => lc.setSourceImages((prev) => prev.filter((_, x) => x !== i))} aria-label={lc.s("Remove file")}>×</button>
              </span>
            ))}
            {lc.sourceImages.length > 0 && <small className="muted">{lc.s("Reference photo attached")}</small>}
          </div>
        )}
        {!live && file && (
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
            if (live && mode !== "voice") return liveSubmit();
            if (mode !== "all") {
              location.href =
                (mode === 'voice' ? '/voice-studio?tab=generate&prompt=' : '/create/' + mode + '?prompt=') + encodeURIComponent(prompt);
              return;
            }
            send();
          }}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={live ? (lc.listening ? lc.chat!.t.listening : mode === "image" ? lc.s("What image should I create? Describe the scene, style and light...") : mode === "video" ? lc.s("What video should I create? Describe it...") : mode === "music" ? lc.s("What music should I create? Describe it...") : lc.chat!.t.placeholder) : t("placeholder")}
            aria-label={t("prompt")}
            rows={live ? 1 : 3}
          />
          <div className="composer-bottom">
            <div>
              <input
                hidden
                type="file"
                ref={fileRef}
                accept={live ? ".pdf,.docx,.txt,.csv,.xlsx,.md" : undefined}
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (live) { if (picked) void lc.attachDocument(picked); e.target.value = ""; return; }
                  setFile(picked?.name || "");
                  toast.success(t("attached"));
                }}
              />
              {live && <input hidden type="file" ref={referenceRef} accept="image/jpeg,image/png,image/webp" onChange={(e) => { const picked = e.target.files?.[0]; if (picked) void lc.uploadReference(picked); e.target.value = ""; }} />}
              <button
                type="button"
                className="icon-btn"
                onClick={() => (live && (lc.mediaType === "image" || lc.mediaType === "video") ? referenceRef.current?.click() : fileRef.current?.click())}
                disabled={live && (lc.mediaType === "music" || lc.documentBusy || lc.uploading || (lc.mediaType === "chat" ? lc.documents.length >= 3 : lc.sourceImages.length >= lc.refLimit))}
                aria-label={live ? (lc.mediaType === "chat" ? lc.chat!.t.attach : lc.s("Reference photo")) : fa ? "پیوست فایل" : "Attach file"}
              >
                <Icon name={live && (lc.documentBusy || lc.uploading) ? "Loader2" : "Paperclip"} size={19} className={live && (lc.documentBusy || lc.uploading) ? "spin" : ""} />
                {live && lc.mediaType === "image" && <small className="ref-count">{n(lc.sourceImages.length)}/{n(lc.refLimit)}</small>}
              </button>
              {live && lc.mediaType !== "chat" && (
                <button type="button" className="icon-btn" disabled={!prompt.trim()} aria-label={lc.s("Translate to English")} title={lc.s("Translate to English")} onClick={async () => setPrompt(await lc.translate(prompt))}>
                  <Icon name="Languages" size={18} />
                </button>
              )}
              <button
                type="button"
                className={`icon-btn ${(live ? lc.listening : mic) ? "recording" : ""}`}
                onClick={() => {
                  if (live) return lc.toggleVoice(setPrompt);
                  setMic(!mic);
                  toast.info(
                    fa
                      ? "ضبط صدا در این نسخه شبیه‌سازی می‌شود."
                      : "Voice capture is simulated in this demo.",
                  );
                }}
                aria-label={live ? lc.chat!.t.voiceInput : fa?'ورودی صوتی (آزمایشی)':'Voice input (demo)'}
              >
                <Icon name={(live ? lc.listening : mic) ? "Square" : "Mic"} size={19} />
              </button>
              {live ? (
                <select aria-label={fa ? "حالت گفتگو" : "Conversation mode"} value={lc.expertMode} onChange={(e) => lc.setExpertMode(e.target.value)} disabled={lc.mediaType !== "chat"}>
                  {lc.chat!.expertModes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              ) : (
              <select aria-label={fa ? "حالت گفتگو" : "Conversation mode"}>
                <option>{t("fast")}</option>
                <option>{t("deep")}</option>
                <option>{t("web")}</option>
              </select>
              )}
            </div>
            {cost != null && <span className="muted">
              ≈ {n(cost)} {t("credits")}
            </span>}
            {live ? (
              lc.streaming ? (
                <Button onClick={lc.stop}>
                  <Icon name="Square" size={15} />
                  {lc.chat!.t.stopGeneration}
                </Button>
              ) : (
                <button type="submit" className="send-btn" disabled={liveBusy || lc.documentBusy || (!prompt.trim() && !(lc.mediaType === "chat" && lc.documents.length)) || (lc.mediaType === "image" && lc.settings.puter && !lc.puterReady)} aria-label={lc.mediaType === "chat" ? t("send") : lc.s("Create")}>
                  <Icon name={lc.generating ? "Loader2" : "ArrowUp"} className={lc.generating ? "spin" : ""} />
                </button>
              )
            ) : busy ? (
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
        {live && <MediaSettings lc={lc} onTemplates={() => setTemplatesOpen(true)} />}
        <p className="composer-note">
          {live ? lc.chat!.t.disclaimer : fa
            ? "ای آی فکر ممکن است اشتباه کند. اطلاعات مهم را بررسی کن. پاسخ‌ها در این نسخه آزمایشی هستند."
            : "AIFekr can make mistakes. Check important information. Responses in this demo are simulated."}
        </p>
      </div>
      {live && templatesOpen && <TemplateGallery lc={lc} onClose={() => setTemplatesOpen(false)} onPick={(text) => { setPrompt(text); setTemplatesOpen(false); }} />}
      {!live && share && (
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

/** One message of the live thread, in the design's message markup. */
function LiveMessageView({ m, i, lc, onEdit, onShare }: { m: LiveMessage; i: number; lc: ReturnType<typeof useLiveChat>; onEdit: (text: string) => void; onShare: (text: string) => void }) {
  const { t } = useApp();
  const previous = lc.messages[i - 1];
  const done = !lc.streaming || i < lc.messages.length - 1;
  return (
    <article className={`message ${m.role}`}>
      <span className={m.role === "assistant" ? "ai-avatar" : "avatar"}>{m.role === "assistant" ? "✦" : "✎"}</span>
      <div>
        <strong>{m.role === "assistant" ? "ای آی فکر" : lc.lang === "fa" ? "شما" : "You"}</strong>
        {m.documents?.map((d, x) => <details key={x} className="doc-attachment"><summary>📎 {d.name}</summary><p>{d.text.slice(0, 2000)}</p></details>)}
        {m.role === "assistant" ? (
          m.media ? <MediaResult media={m.media} lc={lc} /> : (
            <>
              {m.display ? <Answer text={m.display} /> : !m.promptBox && <div className="message-text"><span className="thinking">✦ {lc.lang === "fa" ? "در حال فکر کردن…" : "Thinking…"}</span></div>}
              {m.promptBox && <PromptBoxCard data={m.promptBox} lc={lc} />}
            </>
          )
        ) : (
          <>
            <div className="message-text">{m.display}</div>
            {!!m.attachments?.length && <div className="reference-row">{m.attachments.map((url, x) => <img key={x} src={url} alt="" />)}</div>}
          </>
        )}
        {m.role === "assistant" && m.display && !m.media && done && (
          <div className="message-actions">
            <button className="icon-btn" aria-label={lc.chat!.t.copy} title={lc.chat!.t.copy} onClick={() => { void navigator.clipboard.writeText(m.display); toast.success(lc.chat!.t.copied); }}><Icon name="Copy" size={16} /></button>
            <button className="icon-btn" aria-label={lc.chat!.t.regenerate} title={lc.chat!.t.regenerate} disabled={lc.streaming || !previous} onClick={() => previous && void lc.send(previous.display)}><Icon name="RefreshCw" size={16} /></button>
            <button className="icon-btn" aria-label={lc.lang === "fa" ? "اشتراک‌گذاری" : "Share"} onClick={() => onShare(m.display)}><Icon name="Share2" size={16} /></button>
            <button className="icon-btn" aria-label={t("edit")} onClick={() => onEdit(previous?.display || "")}><Icon name="Pencil" size={16} /></button>
            <button className="icon-btn" aria-label={lc.chat!.t.good} title={lc.chat!.t.good} onClick={() => toast.success(lc.chat!.t.thanks)}><Icon name="ThumbsUp" size={16} /></button>
            <button className="icon-btn" aria-label={lc.chat!.t.improve} title={lc.chat!.t.improve} onClick={() => toast.success(lc.chat!.t.thanks)}><Icon name="ThumbsDown" size={16} /></button>
            <button className={`icon-btn ${lc.speakingId === m.id ? "recording" : ""}`} aria-label={lc.speakingId === m.id ? lc.chat!.t.stopSpeaking : lc.chat!.t.readAloud} title={lc.speakingId === m.id ? lc.chat!.t.stopSpeaking : lc.chat!.t.readAloud} onClick={() => lc.toggleSpeak(m.id, m.display)}><Icon name={lc.speakingId === m.id ? "VolumeX" : "Volume2"} size={16} /></button>
          </div>
        )}
        {m.role === "assistant" && !!m.dataSources?.length && <p className="data-source"><Icon name="Database" size={12} />{dataSourceLabel(m.dataSources, lc)}</p>}
        {m.role === "assistant" && m.actions?.map((a) => <ActionCard key={a.id} action={a} lc={lc} />)}
        {m.role === "assistant" && m.suggestions.length > 0 && done && (
          <div className="chat-followups">{m.suggestions.map((q, x) => <button key={x} onClick={() => void lc.send(q)}>{q}</button>)}</div>
        )}
      </div>
    </article>
  );
}
