"use client";
/**
 * YouTube parts of the Video Factory:
 * - ChannelStudio (/video-factory?tab=channel): the owner's channel details, used by the script writer.
 * - CharacterReference: one character image (uploaded or generated in the image studio) sent with
 *   every generated image, so a stickman or mascot looks the same in all shots.
 * - ThumbnailPicker: any project image becomes the video thumbnail.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import type { FactoryCtx } from "./live-factory";

type Tx = [string, string, string, string];
function useTx() {
  const { locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  return (c: Tx) => c[i];
}
type Asset = { id: string; kind: string; name: string; mimeType: string };
type Config = Record<string, unknown> & { characterReferenceAssetId?: string; thumbnailAssetId?: string };
const configOf = (x: FactoryCtx): Config => JSON.parse(String(x.project!.configuration || "{}"));
/** A running production locks the configuration server-side; mirror that here. */
const busyJob = (x: FactoryCtx) => !!x.job && ["QUEUED", "RUNNING", "PAUSED", "AWAITING_APPROVAL", "PAUSING", "CANCELLING"].includes(String(x.job.status));
const assetUrl = (id: string) => `/api/video-factory/assets/${encodeURIComponent(id)}`;

async function saveConfig(x: FactoryCtx, patch: Partial<Config>) {
  await x.api(`/api/video-factory/projects/${x.project!.id}`, { action: "configuration", expectedVersion: x.project!.version, configuration: { ...configOf(x), ...patch } });
  await x.refresh(x.project!.id);
}
async function uploadImage(x: FactoryCtx, file: File) {
  const form = new FormData();
  form.set("file", file); form.set("projectId", x.project!.id); form.set("rightsConfirmed", "true");
  const r = await fetch("/api/video-factory/assets", { method: "POST", body: form });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.code || "UPLOAD_FAILED");
  return String(d.asset.id);
}
function useImages(x: FactoryCtx) {
  const [images, setImages] = useState<Asset[] | null>(null);
  const load = useCallback(async () => {
    const d = await x.api<{ assets: Asset[] }>(`/api/video-factory/assets?projectId=${x.project!.id}`);
    setImages(d.assets.filter((a) => a.kind === "IMAGE"));
  }, [x]);
  useEffect(() => { load().catch(() => setImages([])); }, [load]);
  return { images, load };
}

// ── Channel details ─────────────────────────────────────────────────────────
type Profile = { handle: string; name: string; niche: string; audience: string; language: "fa" | "en" | "de" | "tr"; tone: string; description: string; keywords: string; saved?: boolean };

export function ChannelStudio({ x }: { x: FactoryCtx }) {
  const tx = useTx();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { x.api<{ profile: Profile }>("/api/video-factory/channel-profile").then((d) => setProfile(d.profile)).catch((e) => toast.error(x.err((e as Error).message))); }, [x]);
  if (!profile) return <div className="skeleton" />;
  const set = (k: keyof Profile) => (e: { target: { value: string } }) => setProfile({ ...profile, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      const { saved: _saved, ...body } = profile;
      const d = await x.api<{ profile: Profile }>("/api/video-factory/channel-profile", body, "PUT");
      setProfile(d.profile);
      toast.success(tx(["اطلاعات کانال ذخیره شد", "Channel details saved", "Kanaldaten gespeichert", "Kanal bilgileri kaydedildi"]));
    } catch (e) { toast.error(x.err((e as Error).message)); } finally { setBusy(false); }
  };
  return (
    <section className="panel factory-channel">
      <h2>{tx(["کانال یوتیوب من", "My YouTube channel", "Mein YouTube-Kanal", "YouTube kanalım"])}</h2>
      <p className="muted">{tx([
        "این اطلاعات یک بار وارد می‌شود و هنگام نوشتن متن ویدیوها به‌عنوان زمینه استفاده می‌شود تا لحن و مخاطب با کانال شما یکی باشد. به حساب گوگل شما دسترسی نمی‌گیرد.",
        "Enter this once. It is used as context when scripts are written, so tone and audience match your channel. It does not access your Google account.",
        "Einmal eingeben. Es dient beim Schreiben der Skripte als Kontext. Kein Zugriff auf Ihr Google-Konto.",
        "Bir kez girin. Senaryolar yazılırken bağlam olarak kullanılır. Google hesabınıza erişmez.",
      ])}</p>
      <div className="domain-fields">
        <label>{tx(["نام کاربری کانال", "Channel handle", "Kanal-Handle", "Kanal kullanıcı adı"])}<input dir="ltr" maxLength={100} placeholder="@mychannel" value={profile.handle} onChange={set("handle")} /></label>
        <label>{tx(["نام کانال", "Channel name", "Kanalname", "Kanal adı"])}<input maxLength={120} value={profile.name} onChange={set("name")} /></label>
        <label>{tx(["موضوع کانال", "Niche", "Nische", "Niş"])}<input maxLength={300} value={profile.niche} onChange={set("niche")} placeholder={tx(["مثلاً داستان کسب‌وکارها", "e.g. business stories", "z. B. Unternehmensgeschichten", "ör. iş hikâyeleri"])} /></label>
        <label>{tx(["مخاطب", "Audience", "Zielgruppe", "Kitle"])}<input maxLength={500} value={profile.audience} onChange={set("audience")} /></label>
        <label>{tx(["زبان ویدیوها", "Video language", "Videosprache", "Video dili"])}
          <select value={profile.language} onChange={set("language")}><option value="fa">فارسی</option><option value="en">English</option><option value="de">Deutsch</option><option value="tr">Türkçe</option></select>
        </label>
        <label>{tx(["لحن", "Tone", "Tonalität", "Ton"])}<input maxLength={300} value={profile.tone} onChange={set("tone")} placeholder={tx(["مثلاً صمیمی و مستند", "e.g. friendly documentary", "z. B. freundlich, dokumentarisch", "ör. samimi belgesel"])} /></label>
        <label className="span-2">{tx(["توضیح کانال", "Channel description", "Kanalbeschreibung", "Kanal açıklaması"])}<textarea rows={4} maxLength={2000} value={profile.description} onChange={set("description")} /></label>
        <label className="span-2">{tx(["کلمات کلیدی (با ویرگول)", "Keywords (comma separated)", "Schlüsselwörter (Komma)", "Anahtar kelimeler (virgülle)"])}<input maxLength={500} value={profile.keywords} onChange={set("keywords")} /></label>
      </div>
      <div className="domain-actions">
        <Button variant="primary" disabled={busy} onClick={() => void save()}>{tx(["ذخیرهٔ اطلاعات کانال", "Save channel details", "Speichern", "Kaydet"])}</Button>
      </div>
    </section>
  );
}

// ── Fixed character ────────────────────────────────────────────────────────
export function CharacterReference({ x }: { x: FactoryCtx }) {
  const tx = useTx();
  const config = configOf(x);
  const current = config.characterReferenceAssetId || "";
  const { images, load } = useImages(x);
  const [prompt, setPrompt] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = busyJob(x);
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (e) { toast.error(x.err((e as Error).message)); } finally { setBusy(false); }
  };
  const choose = (id: string) => act(async () => {
    await saveConfig(x, { characterReferenceAssetId: id });
    toast.success(id
      ? tx(["این کاراکتر در همهٔ تصاویر بعدی استفاده می‌شود.", "This character will be used in every new image.", "Diese Figur wird in allen neuen Bildern verwendet.", "Bu karakter tüm yeni görsellerde kullanılır."])
      : tx(["کاراکتر ثابت برداشته شد.", "Fixed character removed.", "Feste Figur entfernt.", "Sabit karakter kaldırıldı."]));
  });
  const generate = () => act(async () => {
    const r = await fetch("/api/image/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `Character sheet of one consistent character on a plain white background, full body, front view, clean lines. ${prompt}`, ratio: "1:1", count: 1, kind: "character_sheet" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || d.code || "IMAGE_FAILED");
    const generated = d.images?.[0]?.id;
    if (!generated) throw new Error("IMAGE_FAILED");
    const imported = await x.api<{ asset: { id: string } }>("/api/video-factory/assets/import", { projectId: x.project!.id, generatedImageId: generated });
    await load();
    await saveConfig(x, { characterReferenceAssetId: imported.asset.id });
    toast.success(tx(["کاراکتر ساخته و انتخاب شد.", "Character generated and selected.", "Figur erstellt und gewählt.", "Karakter oluşturuldu ve seçildi."]));
  });
  return (
    <section className="panel factory-character-ref">
      <h2>{tx(["کاراکتر ثابت ویدیو", "Fixed character", "Feste Figur", "Sabit karakter"])}</h2>
      <p className="muted">{tx([
        "یک تصویر از کاراکتر (مثلاً یک استیکمن) بسازید یا بارگذاری کنید. همین تصویر همراه پرامپت هر شات فرستاده می‌شود تا کاراکتر در همهٔ تصاویر یکسان بماند.",
        "Generate or upload one image of your character (for example a stickman). It is sent with every shot's prompt so the character looks the same in all images.",
        "Erstellen oder laden Sie ein Bild Ihrer Figur. Es wird mit jedem Shot-Prompt gesendet.",
        "Karakterinizin bir görselini oluşturun veya yükleyin. Her shot prompt'uyla gönderilir.",
      ])}</p>
      {locked && <p className="notice-banner" role="status">{tx(["تا پایان تولید فعلی قابل تغییر نیست.", "Locked while a production runs.", "Während einer Produktion gesperrt.", "Üretim sürerken kilitli."])}</p>}
      <div className="factory-character-ref-row">
        <div className="factory-character-ref-preview">
          {current ? <img src={assetUrl(current)} alt={tx(["کاراکتر انتخاب‌شده", "Selected character", "Gewählte Figur", "Seçilen karakter"])} /> : <span className="muted">{tx(["کاراکتری انتخاب نشده", "No character selected", "Keine Figur gewählt", "Karakter seçilmedi"])}</span>}
        </div>
        <div className="factory-character-ref-actions">
          <label>{tx(["کاراکتر را توصیف کنید", "Describe the character", "Figur beschreiben", "Karakteri tarif edin"])}
            <textarea rows={3} maxLength={1000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={tx(["مثلاً استیکمن سیاه با کراوات قرمز", "e.g. a black stickman with a red tie", "z. B. schwarzes Strichmännchen mit roter Krawatte", "ör. kırmızı kravatlı siyah çöp adam"])} />
          </label>
          <div className="domain-actions">
            <Button variant="primary" disabled={busy || locked || prompt.trim().length < 3} onClick={() => void generate()}>
              <Icon name="Sparkles" size={16} />{tx(["ساخت کاراکتر", "Generate character", "Figur erstellen", "Karakter oluştur"])}
            </Button>
            {current && <Button disabled={busy || locked} onClick={() => void choose("")}>{tx(["برداشتن", "Remove", "Entfernen", "Kaldır"])}</Button>}
          </div>
          <p className="fine-print">{tx(["ساخت کاراکتر به اندازهٔ یک تصویر استاندارد از اعتبار شما کم می‌کند.", "Generating uses the price of one standard image from your credits.", "Kostet den Preis eines Standardbildes.", "Bir standart görsel ücreti kadar kredi kullanır."])}</p>
          <label className="check-label"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />{tx(["حق استفاده از تصویری که بارگذاری می‌کنم را دارم.", "I hold the rights to the image I upload.", "Ich habe die Rechte am Bild.", "Görselin haklarına sahibim."])}</label>
          <label className={"btn" + (rights && !locked ? "" : " disabled")}>
            <Icon name="Upload" size={16} />{tx(["بارگذاری تصویر کاراکتر", "Upload character image", "Figurbild hochladen", "Karakter görseli yükle"])}
            <input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={!rights || busy || locked} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void act(async () => { const id = await uploadImage(x, file); await load(); await saveConfig(x, { characterReferenceAssetId: id }); }); }} />
          </label>
        </div>
      </div>
      {!!images?.length && (
        <>
          <h3>{tx(["یا یکی از تصاویر پروژه را انتخاب کنید", "Or pick one of the project images", "Oder ein Projektbild wählen", "Veya bir proje görseli seçin"])}</h3>
          <div className="factory-pick-grid">
            {images.slice(0, 24).map((a) => (
              <button type="button" key={a.id} className={"factory-pick" + (a.id === current ? " selected" : "")} aria-pressed={a.id === current} disabled={busy || locked} onClick={() => void choose(a.id)}>
                <img src={assetUrl(a.id)} alt={a.name} loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Thumbnail ───────────────────────────────────────────────────────────────
export function ThumbnailPicker({ x, shotImages }: { x: FactoryCtx; shotImages: { id: string; code: string }[] }) {
  const tx = useTx();
  const current = configOf(x).thumbnailAssetId || "";
  const [busy, setBusy] = useState(false);
  const locked = busyJob(x);
  const choose = async (id: string) => {
    setBusy(true);
    try {
      await saveConfig(x, { thumbnailAssetId: id });
      toast.success(tx(["تامبنیل انتخاب شد؛ در رندر بعدی روی ویدیو قرار می‌گیرد.", "Thumbnail chosen; it is used from the next render.", "Thumbnail gewählt; ab dem nächsten Rendern.", "Küçük resim seçildi; sonraki render'da kullanılır."]));
    } catch (e) { toast.error(x.err((e as Error).message)); } finally { setBusy(false); }
  };
  return (
    <section className="panel">
      <div className="row-between">
        <h2>{tx(["تامبنیل ویدیو", "Video thumbnail", "Video-Thumbnail", "Video küçük resmi"])}</h2>
        {current && <a className="btn" href={assetUrl(current)} download="thumbnail.png">{tx(["دانلود تامبنیل", "Download thumbnail", "Thumbnail laden", "Küçük resmi indir"])}</a>}
      </div>
      <p className="muted">{current
        ? tx(["تصویر علامت‌خورده تامبنیل ویدیوست. برای تغییر، تصویر دیگری را انتخاب کنید.", "The marked image is the thumbnail. Pick another to change it.", "Das markierte Bild ist das Thumbnail.", "İşaretli görsel küçük resimdir."])
        : tx(["هنوز انتخاب نشده؛ اولین صحنه تامبنیل می‌شود. یکی از تصاویر زیر را انتخاب کنید.", "Not chosen yet; the first scene is used. Pick one of the images below.", "Noch nicht gewählt; die erste Szene wird verwendet.", "Seçilmedi; ilk sahne kullanılır."])}</p>
      {shotImages.length ? (
        <div className="factory-pick-grid">
          {shotImages.map((s) => (
            <button type="button" key={s.id} className={"factory-pick" + (s.id === current ? " selected" : "")} aria-pressed={s.id === current} aria-label={s.code} disabled={busy || locked} onClick={() => void choose(s.id)}>
              <img src={assetUrl(s.id)} alt={s.code} loading="lazy" />
              <span dir="ltr">{s.code}</span>
            </button>
          ))}
        </div>
      ) : <p className="muted">{tx(["بعد از ساخت تصاویر، این‌جا قابل انتخاب‌اند.", "Images appear here once they are made.", "Bilder erscheinen hier, sobald sie erstellt sind.", "Görseller oluşturulunca burada görünür."])}</p>}
    </section>
  );
}
