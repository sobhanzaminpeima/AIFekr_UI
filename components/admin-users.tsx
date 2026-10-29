"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { contacts } from "@/mocks/catalog";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Account = (typeof contacts)[number];
type Summary = {
  blocked?: boolean;
  credits?: number;
  plan?: string;
  role?: string;
};
export function AdminUsers() {
  const { fa, t, n } = useApp();
  const [users, save] = useLocalState("aifekr-admin-users", contacts);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Account | null>(null);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState(""),
    [email, setEmail] = useState("");
  useEffect(() => {
    const read = () => {
      const next: Record<string, Summary> = {};
      for (const u of users) {
        try {
          next[u.id] = JSON.parse(
            localStorage.getItem("aifekr-admin-user:" + u.id) || "{}",
          );
        } catch {}
      }
      setSummaries(next);
    };
    read();
    window.addEventListener("aifekr-local-update", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("aifekr-local-update", read);
      window.removeEventListener("storage", read);
    };
  }, [users]);
  const filtered = users.filter(
    (u) =>
        (u.name + " " + u.en + " " + u.email + " " + u.id)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "blocked") === !!summaries[u.id]?.blocked),
  );
  const visible = filtered.slice((page - 1) * 10, page * 10);
  return (
    <div className="admin-user-directory">
      <header className="admin-user-directory-header">
        <div>
          <span className="eyebrow">AIFekr / PEOPLE</span>
          <h1>{fa ? "کاربران و حساب‌ها" : "Users & accounts"}</h1>
          <p>
            {fa
              ? "مشخصات، اشتراک و دسترسی هر کاربر را از پروندهٔ همان حساب مدیریت کن."
              : "Manage each user’s details, subscription and access from their own account profile."}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreate(true);
            setName("");
            setEmail("");
          }}
        >
          <Icon name="Plus" size={18} />
          {fa ? "افزودن کاربر" : "Add user"}
        </Button>
      </header>
      <div className="stats-grid">
        {[
          [fa ? "کل کاربران" : "Total users", users.length],
          [
            fa ? "حساب فعال" : "Active accounts",
            users.filter((u) => !summaries[u.id]?.blocked).length,
          ],
          [
            fa ? "حساب مسدود" : "Blocked accounts",
            users.filter((u) => summaries[u.id]?.blocked).length,
          ],
          [
            fa ? "طرح غیررایگان" : "Paid-tier profiles",
            users.filter(
              (u) => summaries[u.id]?.plan && summaries[u.id].plan !== "free",
            ).length,
          ],
        ].map(([a, b]) => (
          <div className="panel stat" key={String(a)}>
            <span>{a}</span>
            <strong>{n(Number(b))}</strong>
          </div>
        ))}
      </div>
      <section className="panel data-panel">
        <div className="table-toolbar">
          <h2>{fa ? "فهرست کاربران" : "User directory"}</h2>
          <Button
            onClick={() =>
              download(
                "users.json",
                JSON.stringify(
                  filtered.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    ...summaries[u.id],
                  })),
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            {t("export")}
          </Button>
        </div>
        <div className="table-filters">
          <div className="search-field">
            <Icon name="Search" size={18} />
            <input
              aria-label={t("filter")}
              placeholder={fa ? "نام، ایمیل یا شناسه…" : "Name, email or ID…"}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label={fa ? "وضعیت حساب" : "Account status"}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{fa ? "همه حساب‌ها" : "All accounts"}</option>
            <option value="active">{fa ? "فعال" : "Active"}</option>
            <option value="blocked">{fa ? "مسدود" : "Blocked"}</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  fa ? "کاربر" : "User",
                  t("email"),
                  fa ? "اشتراک" : "Plan",
                  fa ? "اعتبار" : "Credits",
                  fa ? "وضعیت حساب" : "Account status",
                  t("action"),
                ].map((a) => (
                  <th key={a}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      className="table-person admin-user-name"
                      href={"/admin/users/" + encodeURIComponent(u.id)}
                    >
                      <span className="avatar small">
                        {(fa ? u.name : u.en).slice(0, 1)}
                      </span>
                      <span>
                        {fa ? u.name : u.en}
                        <small>
                          #{u.id} · {fa ? "مشاهده پرونده" : "View profile"} ↗
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td dir="ltr">{u.email}</td>
                  <td>
                    <span className="badge">
                      {(summaries[u.id]?.plan || "free").toUpperCase()}
                    </span>
                  </td>
                  <td>{n(summaries[u.id]?.credits || 0)} ✦</td>
                  <td>
                    <span
                      className={
                        "badge " + (summaries[u.id]?.blocked ? "red" : "green")
                      }
                    >
                      {summaries[u.id]?.blocked
                        ? fa
                          ? "مسدود"
                          : "Blocked"
                        : fa
                          ? "فعال"
                          : "Active"}
                    </span>
                  </td>
                  <td>
                    <Button onClick={() => setDetail(u)}>{t("action")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <Empty />}
        <div className="pagination">
          <span>
            {n(filtered.length)} {fa ? "حساب" : "accounts"}
          </span>
          <div>
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
              {fa ? "قبلی" : "Previous"}
            </Button>
            <span>
              {n(page)} / {n(Math.max(1, Math.ceil(filtered.length / 10)))}
            </span>
            <Button
              disabled={page >= Math.ceil(filtered.length / 10)}
              onClick={() => setPage(page + 1)}
            >
              {fa ? "بعدی" : "Next"}
            </Button>
          </div>
        </div>
      </section>
      {detail && (
        <Modal
          title={fa ? detail.name : detail.en}
          onClose={() => setDetail(null)}
        >
          <dl className="domain-detail">
            <div>
              <dt>{t("email")}</dt>
              <dd>{detail.email}</dd>
            </div>
            <div>
              <dt>{fa ? "شناسه" : "User ID"}</dt>
              <dd>{detail.id}</dd>
            </div>
            <div>
              <dt>{fa ? "اشتراک" : "Plan"}</dt>
              <dd>{summaries[detail.id]?.plan || "free"}</dd>
            </div>
            <div>
              <dt>{fa ? "اعتبار" : "Credits"}</dt>
              <dd>{n(summaries[detail.id]?.credits || 0)}</dd>
            </div>
          </dl>
          <Link
            className="btn primary"
            href={"/admin/users/" + encodeURIComponent(detail.id)}
          >
            {fa ? "مشخصات کامل کاربر" : "Open full user profile"}
            <Icon name="ArrowLeft" size={16} />
          </Link>
        </Modal>
      )}
      {create && (
        <Modal
          title={fa ? "افزودن کاربر محلی" : "Add local user"}
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const normalized = email.trim().toLowerCase();
              if (users.some((u) => u.email.toLowerCase() === normalized)) {
                toast.error(
                  fa
                    ? "این ایمیل قبلاً ثبت شده است"
                    : "This email is already registered",
                );
                return;
              }
              save([
                ...users,
                {
                  id: crypto.randomUUID(),
                  name,
                  en: name,
                  email: normalized,
                  amount: 0,
                  status: "pending",
                },
              ]);
              setCreate(false);
              toast.success(fa ? "کاربر محلی ثبت شد" : "Local user created");
            }}
          >
            <div className="domain-fields">
              <label>
                {t("name")}
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                {t("email")}
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
            <p className="fine-print">
              {fa
                ? "حساب واقعی یا ایمیل دعوت ایجاد نمی‌شود؛ فقط رکورد این پیش‌نمایش ثبت می‌شود."
                : "This creates a preview record, not a real login or invitation email."}
            </p>
            <Button variant="primary" type="submit">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
