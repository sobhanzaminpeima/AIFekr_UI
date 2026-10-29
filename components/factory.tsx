"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button, download, Icon, Modal, SectionTitle } from "./ui";
import { generate } from "@/lib/api/client";
import { toast } from "sonner";
type Scene = {
  id: string;
  title: string;
  script: string;
  note: string;
  status: "queued" | "running" | "done" | "failed";
};
export function Factory({initialStep}:{initialStep?:number}={}) {
  const { fa, t, n, credits, spend, topup, addItem } = useApp();
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [source, setSource] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [voice, setVoice] = useState("Nora");
  const [music, setMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draftLoaded,setDraftLoaded]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('aifekr-factory-draft')||'null');if(saved){setIdea(saved.idea||'');setSource(saved.source||'');setScenes((saved.scenes||[]).map((scene:Scene)=>({...scene,status:scene.status==='running'?'queued':scene.status})));setVoice(saved.voice||'Nora');setMusic(saved.music!==false);setStep(saved.scenes?.length?Math.min(4,Math.max(0,initialStep??(Number(saved.step)||0))):0);}}catch{}setDraftLoaded(true);},[]);
  useEffect(()=>{if(draftLoaded)localStorage.setItem('aifekr-factory-draft',JSON.stringify({idea,source,scenes,voice,music,step}));},[draftLoaded,idea,source,scenes,voice,music,step]);
  const labels = fa
    ? [
        "ایده و منابع",
        "فیلمنامه",
        "استوری‌بورد",
        "روایت و موسیقی",
        "تأیید هزینه",
        "تولید",
        "بازبینی",
      ]
    : [
        "Idea & sources",
        "Script",
        "Storyboard",
        "Narration & music",
        "Cost approval",
        "Production",
        "Review",
      ];
  const total = scenes.length * 40;
  function move(index: number, delta: number) {
    setScenes((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  function startScript() {
    if (!idea.trim()) return;
    setScenes(
      [0, 1, 2].map((v) => ({
        id: crypto.randomUUID(),
        title: fa
          ? ["شروع داستان", "گسترش ایده", "پایان و دعوت"][v]
          : ["The opening", "Develop the idea", "A thoughtful ending"][v],
        script: fa
          ? [
              `با یک سؤال روشن دربارهٔ «${idea}» شروع کن.`,
              `با یک مثال ملموس، ${idea} را توضیح بده.`,
              `سه قدم ساده برای شروع ${idea} پیشنهاد بده.`,
            ][v]
          : [
              `Open with a clear question about ${idea}.`,
              `Explore ${idea} through one concrete example.`,
              `Share three small next steps for ${idea}.`,
            ][v],
        note: "",
        status: "queued",
      })),
    );
    setStep(1);
  }
  async function produce() {
    setConfirm(false);
    if (!spend(total)) return;
    setStep(5);
    setBusy(true);
    setFailed(false);
    setScenes((s) => s.map((v) => ({ ...v, status: "queued" })));
    try {
      for (const scene of scenes) {
        setScenes((s) =>
          s.map((v) => (v.id === scene.id ? { ...v, status: "running" } : v)),
        );
        await new Promise((r) => setTimeout(r, 700));
        setScenes((s) =>
          s.map((v) => (v.id === scene.id ? { ...v, status: "done" } : v)),
        );
      }
      const item = await generate(idea, "video-factory");
      addItem(item);
      try{const stored=JSON.parse(localStorage.getItem('aifekr-factory-artifacts')||'[]');const artifacts=Array.isArray(stored)?stored:[];localStorage.setItem('aifekr-factory-artifacts',JSON.stringify([{id:item.id,title:idea,date:new Date().toISOString(),voice,music,scenes:scenes.map(scene=>({...scene,status:'done'}))},...artifacts]));}catch{}
      setStep(6);
      toast.success(t("done"));
    } catch {
      setFailed(true);
      setScenes((s) => s.map((v) => ({ ...v, status: "failed" })));
      topup(total);
      toast.error(t("failed"));
    }
    setBusy(false);
  }
  return (
    <div>
      <SectionTitle
        title={t("factory")}
        subtitle={
          fa
            ? "از یک ایده، تا یک داستان یکپارچه."
            : "From a little idea to a complete story."
        }
      >
        <span className="badge">{t("mock")}</span>
      </SectionTitle>
      <div className="stepper">
        {labels.map((s, i) => (
          <button
            className={step === i ? "current" : i < step ? "completed" : ""}
            disabled={busy || i > Math.max(step, scenes.length ? 4 : 0)}
            onClick={() => setStep(i)}
            key={s}
          >
            <span>{n(i + 1)}</span>
            {s}
          </button>
        ))}
      </div>
      <section className="panel factory-step">
        {step === 0 ? (
          <>
            <span className="eyebrow orange-text">
              01 / {fa ? "اولین جرقه" : "THE FIRST SPARK"}
            </span>
            <h1>
              {fa
                ? "داستان تو از کجا شروع می‌شود؟"
                : "Where does your story begin?"}
            </h1>
            <label>
              {t("prompt")}
              <textarea
                rows={5}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={
                  fa
                    ? "یک ویدیوی آموزشی دربارهٔ شروع یک کسب‌وکار کوچک…"
                    : "An explainer about starting a small business…"
                }
              />
            </label>
            <label>
              {fa ? "منابع و نکته‌های مهم" : "Sources & important notes"}
              <textarea
                rows={3}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={
                  fa
                    ? "متن یا پیوند مرجع؛ در این نسخه لینک‌ها خوانده نمی‌شوند."
                    : "Reference text or links. Links are not fetched in this demo."
                }
              />
            </label>
            <Button
              variant="primary"
              disabled={!idea.trim()}
              onClick={startScript}
            >
              {fa ? "طرح داستان را بساز" : "Create a story outline"}
              <Icon name="ArrowLeft" size={17} />
            </Button>
          </>
        ) : step === 1 ? (
          <>
            <h1>
              {fa ? "به داستانت شکل بده." : "Give your story a little shape."}
            </h1>
            <p>
              {fa
                ? "فصل‌ها را ویرایش کن. متن زیر یک پیشنهاد آزمایشی است."
                : "Edit each chapter. This is a sample outline, ready for your own words."}
            </p>
            {scenes.map((s, i) => (
              <div className="scene-script" key={s.id}>
                <label>
                  {fa ? "عنوان فصل" : "Chapter title"}
                  <input
                    value={s.title}
                    onChange={(e) =>
                      setScenes((old) =>
                        old.map((v) =>
                          v.id === s.id ? { ...v, title: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  {fa ? "روایت" : "Narration"}
                  <textarea
                    rows={3}
                    value={s.script}
                    onChange={(e) =>
                      setScenes((old) =>
                        old.map((v) =>
                          v.id === s.id ? { ...v, script: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setScenes((old) => old.filter((v) => v.id !== s.id))
                  }
                  disabled={scenes.length <= 1}
                >
                  <Icon name="Trash2" size={15} />
                  {t("delete")} {n(i + 1)}
                </Button>
              </div>
            ))}
            <Button
              onClick={() =>
                setScenes((s) => [
                  ...s,
                  {
                    id: crypto.randomUUID(),
                    title: fa ? "فصل تازه" : "New chapter",
                    script: "",
                    note: "",
                    status: "queued",
                  },
                ])
              }
            >
              <Icon name="Plus" size={17} />
              {fa ? "افزودن فصل" : "Add a chapter"}
            </Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              {t("next")}
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <h1>
              {fa
                ? "صحنه‌به‌صحنه، داستان را ببین."
                : "See the story, scene by scene."}
            </h1>
            <div className="storyboard-grid">
              {scenes.map((s, i) => (
                <article
                  className="panel storyboard-card"
                  key={s.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("scene", String(i))
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = Number(e.dataTransfer.getData("scene"));
                    setScenes((old) => {
                      const next = [...old];
                      const [item] = next.splice(from, 1);
                      next.splice(i, 0, item);
                      return next;
                    });
                  }}
                >
                  <img
                    src={i % 2 ? "/art/waves.svg" : "/art/orbit.svg"}
                    alt={s.title}
                  />
                  <div className="row-between">
                    <h3>
                      {n(i + 1)}. {s.title}
                    </h3>
                    <div>
                      <Button
                        label={fa ? "جابه‌جایی بالا" : "Move up"}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <Icon name="ChevronUp" size={15} />
                      </Button>
                      <Button
                        label={fa ? "جابه‌جایی پایین" : "Move down"}
                        disabled={i === scenes.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <Icon name="ChevronDown" size={15} />
                      </Button>
                    </div>
                  </div>
                  <p>{s.script}</p>
                  <label>
                    {fa ? "نکتهٔ پیوستگی بصری" : "Visual continuity note"}
                    <input
                      value={s.note}
                      onChange={(e) =>
                        setScenes((old) =>
                          old.map((v) =>
                            v.id === s.id ? { ...v, note: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
            <Button variant="primary" onClick={() => setStep(3)}>
              {t("next")}
            </Button>
          </>
        ) : step === 3 ? (
          <>
            <h1>
              {fa
                ? "صدای داستانت را پیدا کن."
                : "Find the sound of your story."}
            </h1>
            <div className="voice-options">
              {["Nora", "Arman", "Luna"].map((v, i) => (
                <button
                  className={voice === v ? "selected" : ""}
                  key={v}
                  onClick={() => setVoice(v)}
                >
                  <span className="icon-chip purple">
                    <Icon name="AudioLines" size={26} />
                  </span>
                  <h3>{fa ? ["نورا", "آرمان", "لونا"][i] : v}</h3>
                  <p>
                    {fa
                      ? ["گرم و صمیمی", "آرام و عمیق", "پرانرژی"][i]
                      : [
                          "Warm & friendly",
                          "Calm & deep",
                          "Bright & energetic",
                        ][i]}
                  </p>
                  {voice === v && <Icon name="Check" size={18} />}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              {fa ? "موسیقی پس‌زمینه" : "Background music"}
              <input
                type="checkbox"
                checked={music}
                onChange={(e) => setMusic(e.target.checked)}
              />
            </label>
            <label>
              {fa ? "زبان روایت" : "Narration language"}
              <select>
                <option>فارسی</option>
                <option>English</option>
                <option>Deutsch</option>
                <option>Türkçe</option>
              </select>
            </label>
            <Button variant="primary" onClick={() => setStep(4)}>
              {t("next")}
            </Button>
          </>
        ) : step === 4 ? (
          <>
            <h1>
              {fa
                ? "هزینه، روشن و قابل پیش‌بینی."
                : "A clear cost. No surprises."}
            </h1>
            <p>
              {fa
                ? "در صورت شکست عملیات، تمام اعتبار بازمی‌گردد."
                : "If production fails, all credits are refunded."}
            </p>
            <dl className="cost-summary">
              {scenes.map((s) => (
                <div className="cost-row" key={s.id}>
                  <dt>{s.title}</dt>
                  <dd>✦ {n(40)}</dd>
                </div>
              ))}
              <div className="cost-row total">
                <dt>{fa ? "مجموع" : "Total"}</dt>
                <dd>✦ {n(total)}</dd>
              </div>
              <div className="cost-row">
                <dt>{t("balance")}</dt>
                <dd>{n(credits - total)}</dd>
              </div>
            </dl>
            <Button variant="primary" onClick={() => setConfirm(true)}>
              <Icon name="Sparkles" size={18} />
              {fa ? "تأیید هزینه و ساخت" : "Approve cost & produce"} · ✦{" "}
              {n(total)}
            </Button>
          </>
        ) : step === 5 ? (
          <>
            <h1>
              {fa
                ? "داستانت در حال شکل گرفتن است."
                : "Your story is coming together."}
            </h1>
            <div className="production-board">
              {scenes.map((s) => (
                <div className="inline-banner" key={s.id}>
                  <span
                    className={`icon-chip ${s.status === "done" ? "lime" : "orange"}`}
                  >
                    <Icon name={s.status === "done" ? "Check" : "Film"} />
                  </span>
                  <h3>{s.title}</h3>
                  <span className="badge">{t(s.status)}</span>
                </div>
              ))}
            </div>
            {failed && (
              <Button variant="primary" onClick={() => setConfirm(true)}>
                {t("retry")}
              </Button>
            )}
            <p className="fine-print">{t("mock")}</p>
          </>
        ) : (
          <>
            <div className="storyboard-preview">
              <img src="/art/orbit.svg" alt={idea} />
              <span className="badge">
                {fa
                  ? "پیش‌نمایش تصویری آزمایشی؛ ویدیوی واقعی تولید نشده است."
                  : "Sample storyboard preview. No live video was generated."}
              </span>
            </div>
            <h1>
              {fa
                ? "یک داستان تازه، با امضای تو."
                : "A fresh story, with your signature."}
            </h1>
            <p>{idea}</p>
            <Button
              variant="primary"
              onClick={() =>
                download(
                  "aifekr-storyboard.json",
                  JSON.stringify(
                    { idea, source, voice, music, scenes },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              <Icon name="Download" size={18} />
              {fa ? "دریافت پروژهٔ استوری‌بورد" : "Download storyboard project"}
            </Button>
            <Button
              onClick={() => {
                setStep(0);
                setScenes([]);
                setIdea("");
              }}
            >
              {fa ? "داستان تازه" : "Make another story"}
            </Button>
            <div className="inline-banner">
              <Icon name="LockKeyhole" />
              <p>
                {fa
                  ? "برای انتشار، اتصال یک حساب واقعی و رضایت جداگانه لازم است."
                  : "Publishing requires a connected account and separate consent."}
              </p>
            </div>
          </>
        )}
      </section>
      {confirm && (
        <Modal
          title={fa ? "تأیید تولید" : "Approve production"}
          onClose={() => setConfirm(false)}
        >
          <p>
            {fa
              ? "این عملیات آزمایشی است. "
              : "This is a simulated operation. "}
            ✦ {n(total)} {t("credits")}
          </p>
          <Button variant="primary full" onClick={produce}>
            {t("confirm")}
          </Button>
        </Modal>
      )}
    </div>
  );
}
