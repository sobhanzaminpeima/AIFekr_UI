"use client";
import { useState } from "react";
import { useApp } from "./providers";
import { useLocalState } from "@/lib/use-local-state";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Post = {
  id: string;
  caption: string;
  format: string;
  channel: string;
  scheduledAt: string;
  status: "draft" | "scheduled" | "archived";
  color: string;
};
type Campaign = {
  id: string;
  name: string;
  keyword: string;
  reply: string;
  limit: number;
  enabled: boolean;
};
type Brand = {
  name: string;
  audience: string;
  tone: string;
  color: string;
  cta: string;
};
const emptyBrand: Brand = {
  name: "",
  audience: "",
  tone: "friendly",
  color: "#f97316",
  cta: "",
};
const uid = () => crypto.randomUUID();
export const socialViews = [
  "publish",
  "content",
  "analytics",
  "campaigns",
  "direct-rules",
  "brand",
  "calendar",
  "queue",
  "growth-report",
];
export function SocialWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [posts, savePosts] = useLocalState<Post[]>("aifekr-social-posts", []);
  const [campaigns, saveCampaigns] = useLocalState<Campaign[]>(
    "aifekr-social-campaigns",
    [],
  );
  const [brand, saveBrand] = useLocalState<Brand>(
    "aifekr-social-brand",
    emptyBrand,
  );
  const [draft, setDraft] = useState<Post>({
    id: uid(),
    caption: "",
    format: "post",
    channel: "Instagram",
    scheduledAt: "",
    status: "draft",
    color: brand.color,
  });
  const [edit, setEdit] = useState<Post | null>(null);
  const [filter, setFilter] = useState("all");
  const [rule, setRule] = useState<Campaign | null>(null);
  const [sample, setSample] = useState("");
  const [result, setResult] = useState("");
  const [brandDraft, setBrandDraft] = useState<Brand | null>(null);
  function commit(post: Post) {
    savePosts(
      posts.some((p) => p.id === post.id)
        ? posts.map((p) => (p.id === post.id ? post : p))
        : [post, ...posts],
    );
    toast.success(
      fa
        ? "محتوا در تقویم محلی ذخیره شد"
        : "Content saved to the local calendar",
    );
  }
  const editor = (post: Post, setter: (p: Post) => void) => (
    <div className="social-composer">
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            post.status === "scheduled" &&
            (!post.scheduledAt || new Date(post.scheduledAt) <= new Date())
          ) {
            toast.error(
              fa
                ? "زمان انتشار باید در آینده باشد"
                : "Choose a future publication time",
            );
            return;
          }
          commit(post);
          setEdit(null);
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "شبکه" : "Channel"}
            <select
              value={post.channel}
              onChange={(e) => setter({ ...post, channel: e.target.value })}
            >
              <option>Instagram</option>
              <option>LinkedIn</option>
              <option>Telegram</option>
            </select>
          </label>
          <label>
            {fa ? "قالب" : "Format"}
            <select
              value={post.format}
              onChange={(e) => setter({ ...post, format: e.target.value })}
            >
              {[
                ["post", "پست", "Post"],
                ["story", "استوری", "Story"],
                ["reel", "ریلز", "Reel"],
              ].map(([id, a, b]) => (
                <option key={id} value={id}>
                  {fa ? a : b}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {fa ? "متن و کپشن" : "Caption"}
          <textarea
            rows={8}
            maxLength={2200}
            required
            value={post.caption}
            onChange={(e) => setter({ ...post, caption: e.target.value })}
          />
        </label>
        <p className="fine-print">
          {n(post.caption.length)} / {n(2200)}
        </p>
        <div className="domain-fields">
          <label>
            {fa ? "رنگ طرح" : "Artwork color"}
            <input
              type="color"
              value={post.color}
              onChange={(e) => setter({ ...post, color: e.target.value })}
            />
          </label>
          <label>
            {fa ? "زمان انتشار" : "Publication time"}
            <input
              type="datetime-local"
              value={post.scheduledAt}
              onChange={(e) =>
                setter({
                  ...post,
                  scheduledAt: e.target.value,
                  status: e.target.value ? "scheduled" : "draft",
                })
              }
            />
          </label>
          <label>
            {fa ? "وضعیت" : "Status"}
            <select
              value={post.status}
              onChange={(e) =>
                setter({ ...post, status: e.target.value as Post["status"] })
              }
            >
              <option value="draft">{fa ? "پیش‌نویس" : "Draft"}</option>
              <option value="scheduled">
                {fa ? "زمان‌بندی‌شده" : "Scheduled"}
              </option>
              <option value="archived">{fa ? "بایگانی" : "Archived"}</option>
            </select>
          </label>
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
        <p>
          {fa
            ? "این تقویم محلی است؛ انتشار خودکار روی شبکه‌ها فعال نیست."
            : "This calendar is local. Automatic social publishing is not connected."}
        </p>
      </form>
      <aside className="panel social-preview">
        <div className="row-between">
          <strong>{brand.name || "AIFekr Studio"}</strong>
          <span>{post.channel}</span>
        </div>
        <div
          className={"social-art " + post.format}
          style={{
            background: `linear-gradient(135deg,${post.color},#171a23)`,
          }}
        >
          <Icon
            name={post.format === "reel" ? "CirclePlay" : "Sparkles"}
            size={50}
          />
          <h2>
            {post.caption.split("\n")[0] ||
              (fa ? "ایده بعدی برند تو" : "Your brand’s next idea")}
          </h2>
        </div>
        <p className="social-caption">{post.caption}</p>
        <small>{brand.cta}</small>
      </aside>
    </div>
  );
  if (view === "content") return editor(draft, setDraft);
  if (view === "brand") {
    const current = brandDraft || brand;
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          saveBrand(current);
          toast.success(t("save"));
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "نام برند" : "Brand name"}
            <input
              required
              value={current.name}
              onChange={(e) =>
                setBrandDraft({ ...current, name: e.target.value })
              }
            />
          </label>
          <label>
            {fa ? "مخاطبان هدف" : "Target audience"}
            <input
              required
              value={current.audience}
              onChange={(e) =>
                setBrandDraft({ ...current, audience: e.target.value })
              }
            />
          </label>
          <label>
            {fa ? "لحن" : "Tone"}
            <select
              value={current.tone}
              onChange={(e) =>
                setBrandDraft({ ...current, tone: e.target.value })
              }
            >
              {[
                ["friendly", "دوستانه", "Friendly"],
                ["professional", "رسمی", "Professional"],
                ["playful", "سرزنده", "Playful"],
              ].map(([id, a, b]) => (
                <option value={id} key={id}>
                  {fa ? a : b}
                </option>
              ))}
            </select>
          </label>
          <label>
            {fa ? "رنگ برند" : "Brand color"}
            <input
              type="color"
              value={current.color}
              onChange={(e) =>
                setBrandDraft({ ...current, color: e.target.value })
              }
            />
          </label>
          <label>
            {fa ? "دعوت به اقدام" : "Call to action"}
            <textarea
              value={current.cta}
              onChange={(e) =>
                setBrandDraft({ ...current, cta: e.target.value })
              }
            />
          </label>
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
    );
  }
  if (["campaigns", "direct-rules"].includes(view))
    return (
      <>
        <div className="domain-toolbar">
          <Button
            variant="primary"
            onClick={() =>
              setRule({
                id: uid(),
                name: "",
                keyword: "",
                reply: "",
                limit: 20,
                enabled: false,
              })
            }
          >
            {fa ? "قانون پاسخ تازه" : "New reply rule"}
          </Button>
        </div>
        <div className="social-composer">
          <section className="panel">
            {!campaigns.length ? (
              <Empty />
            ) : (
              campaigns.map((c) => (
                <article className="domain-card" key={c.id}>
                  <div className="row-between">
                    <h3>{c.name}</h3>
                    <label>
                      {fa ? "فعال در شبیه‌ساز" : "Enabled in simulator"}
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        onChange={(e) =>
                          saveCampaigns(
                            campaigns.map((x) =>
                              x.id === c.id
                                ? { ...x, enabled: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <p>
                    {c.keyword} → {c.reply}
                  </p>
                  <span className="badge">
                    {fa ? "سقف روزانه" : "Daily limit"}: {n(c.limit)}
                  </span>
                  <Button onClick={() => setRule(c)}>
                    {fa ? "ویرایش قانون" : "Edit rule"}
                  </Button>
                </article>
              ))
            )}
          </section>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const match = campaigns.find(
                (c) =>
                  c.enabled &&
                  sample
                    .toLocaleLowerCase()
                    .includes(c.keyword.toLocaleLowerCase()),
              );
              setResult(
                match?.reply ||
                  (fa
                    ? "قانون فعالی مطابقت نداشت."
                    : "No enabled rule matched."),
              );
            }}
          >
            <h3>{fa ? "آزمایش پاسخ خودکار" : "Test automatic reply"}</h3>
            <label>
              {fa ? "پیام یا کامنت نمونه" : "Sample message or comment"}
              <textarea
                required
                value={sample}
                onChange={(e) => setSample(e.target.value)}
              />
            </label>
            <Button type="submit">
              {fa ? "آزمایش بدون ارسال" : "Test without sending"}
            </Button>
            {result && (
              <p className="domain-card" role="status">
                {result}
              </p>
            )}
          </form>
        </div>
        {rule && (
          <Modal
            title={fa ? "قانون پاسخ" : "Reply rule"}
            onClose={() => setRule(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCampaigns(
                  campaigns.some((c) => c.id === rule.id)
                    ? campaigns.map((c) => (c.id === rule.id ? rule : c))
                    : [...campaigns, rule],
                );
                setRule(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "نام کمپین" : "Campaign name"}
                  <input
                    required
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                  />
                </label>
                <label>
                  {fa ? "کلمه محرک" : "Trigger keyword"}
                  <input
                    required
                    value={rule.keyword}
                    onChange={(e) =>
                      setRule({ ...rule, keyword: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "سقف روزانه" : "Daily limit"}
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={rule.limit}
                    onChange={(e) =>
                      setRule({ ...rule, limit: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  {fa ? "متن پاسخ" : "Reply text"}
                  <textarea
                    required
                    rows={5}
                    value={rule.reply}
                    onChange={(e) =>
                      setRule({ ...rule, reply: e.target.value })
                    }
                  />
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </>
    );
  if (["analytics", "growth-report"].includes(view))
    return (
      <>
        <div className="stats-grid">
          {[
            [fa ? "کل محتوا" : "Total content", posts.length],
            [
              fa ? "زمان‌بندی‌شده" : "Scheduled",
              posts.filter((p) => p.status === "scheduled").length,
            ],
            [
              fa ? "پیش‌نویس" : "Drafts",
              posts.filter((p) => p.status === "draft").length,
            ],
            [
              fa ? "قوانین فعال" : "Enabled rules",
              campaigns.filter((c) => c.enabled).length,
            ],
          ].map(([label, count]) => (
            <div className="panel stat" key={String(label)}>
              <span>{label}</span>
              <strong>{n(Number(count))}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <h3>{fa ? "ترکیب محتوای ثبت‌شده" : "Recorded content mix"}</h3>
          {["post", "story", "reel"].map((format) => (
            <div className="domain-card" key={format}>
              <span>{format}</span>
              <progress
                max={Math.max(posts.length, 1)}
                value={posts.filter((p) => p.format === format).length}
              />
            </div>
          ))}
          <p>
            {fa
              ? "آمار بازدید، فالوئر و تعامل به اتصال واقعی حساب نیاز دارد."
              : "Reach, follower and engagement metrics require a live account connection."}
          </p>
          <Button
            onClick={() =>
              download(
                "content-report.json",
                JSON.stringify({ brand, posts, campaigns }, null, 2),
                "application/json",
              )
            }
          >
            {t("export")}
          </Button>
        </section>
      </>
    );
  const visible = posts
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <>
      <div className="domain-toolbar">
        <select
          aria-label={fa ? "فیلتر محتوا" : "Content filter"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            ["all", "همه", "All"],
            ["draft", "پیش‌نویس", "Draft"],
            ["scheduled", "زمان‌بندی‌شده", "Scheduled"],
            ["archived", "بایگانی", "Archived"],
          ].map(([id, a, b]) => (
            <option value={id} key={id}>
              {fa ? a : b}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: uid(),
              caption: "",
              format: "post",
              channel: "Instagram",
              scheduledAt: "",
              status: "draft",
              color: brand.color,
            })
          }
        >
          {fa ? "محتوای تازه" : "New content"}
        </Button>
      </div>
      {!visible.length ? (
        <Empty />
      ) : (
        <div
          className={view === "calendar" ? "panel domain-agenda" : "tool-grid"}
        >
          {visible.map((p) => (
            <article className="panel domain-card" key={p.id}>
              <span className="badge">
                {p.channel} · {p.status}
              </span>
              <h3>{p.caption.slice(0, 90)}</h3>
              <time>
                {p.scheduledAt.replace("T", " ") ||
                  (fa ? "بدون زمان" : "Unscheduled")}
              </time>
              <div className="domain-actions">
                <Button onClick={() => setEdit(p)}>
                  {fa ? "ویرایش و پیش‌نمایش" : "Edit & preview"}
                </Button>
                <Button
                  disabled={p.status === "archived"}
                  onClick={() =>
                    savePosts(
                      posts.map((x) =>
                        x.id === p.id ? { ...x, status: "archived" } : x,
                      ),
                    )
                  }
                >
                  {fa ? "بایگانی" : "Archive"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <Modal
          title={fa ? "ویرایش محتوا" : "Edit content"}
          onClose={() => setEdit(null)}
        >
          {editor(edit, setEdit)}
        </Modal>
      )}
    </>
  );
}
