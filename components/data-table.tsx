"use client";
import { useState } from "react";
import { useApp } from "./providers";
import { Button, download, Icon, Modal } from "./ui";
import { contacts } from "@/mocks/catalog";
import { toast } from "sonner";
import { ListState } from "./list-state";
import Link from "next/link";
import { useLocalState } from "@/lib/use-local-state";
export function DataTable({
  title,
  userLinks = false,
}: {
  title: string;
  userLinks?: boolean;
}) {
  return (
    <ListState key={title}>
      <DataTableContent title={title} userLinks={userLinks} />
    </ListState>
  );
}
function DataTableContent({
  title,
  userLinks,
}: {
  title: string;
  userLinks: boolean;
}) {
  const { fa, t, n, price } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useLocalState(
    userLinks ? "aifekr-admin-users" : "aifekr-table:" + title,
    contacts,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<(typeof contacts)[number] | null>(null);
  const [sort, setSort] = useState(false);
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState(true);
  const [create, setCreate] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [newName, setNewName] = useState("");
  let filtered = rows.filter(
    (r) =>
      `${r.name} ${r.en} ${r.email}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || r.status === filter),
  );
  if (sort) filtered = [...filtered].sort((a, b) => b.amount - a.amount);
  const visible = filtered.slice((page - 1) * 4, page * 4);
  return (
    <section className="panel data-panel">
      <div className="table-toolbar">
        <h3>{title}</h3>
        <div>
          <Button
            onClick={() =>
              download(
                "aifekr-export.csv",
                "\uFEFF" +
                  [
                    "Name,Email,Amount,Status",
                    ...filtered.map((r) =>
                      [fa ? r.name : r.en, r.email, r.amount, r.status].join(
                        ",",
                      ),
                    ),
                  ].join("\n"),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Icon name="Download" size={16} />
            {t("export")}
          </Button>
          <Button onClick={() => setCreate(true)}>
            <Icon name="Plus" size={16} />
            {t("add")}
          </Button>
        </div>
      </div>
      <div className="table-filters">
        <div className="search-field">
          <Icon name="Search" size={16} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            aria-label={t("filter")}
            placeholder={t("filter")}
          />
        </div>
        <select
          aria-label={t("status")}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t("all")}</option>
          <option value="paid">{fa ? "موفق" : "Paid"}</option>
          <option value="pending">{fa ? "در انتظار" : "Pending"}</option>
          <option value="failed">{fa ? "ناموفق" : "Failed"}</option>
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={email}
            onChange={(e) => setEmail(e.target.checked)}
          />
          {t("email")}
        </label>
        {selected.length > 0 && (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            {t("delete")} ({n(selected.length)})
          </Button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  aria-label={fa ? "انتخاب همه" : "Select all"}
                  type="checkbox"
                  checked={
                    visible.length > 0 &&
                    visible.every((r) => selected.includes(r.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? visible.map((r) => r.id) : [],
                    )
                  }
                />
              </th>
              <th>{t("name")}</th>
              {email && <th>{t("email")}</th>}
              <th>
                <button onClick={() => setSort(!sort)}>
                  {t("amount")} <Icon name="ArrowUpDown" size={13} />
                </button>
              </th>
              <th>{t("status")}</th>
              <th>{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={fa ? r.name : r.en}
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, r.id]
                          : s.filter((v) => v !== r.id),
                      )
                    }
                  />
                </td>
                <td>
                  {userLinks ? (
                    <Link
                      className="table-person admin-user-name"
                      href={"/admin/users/" + encodeURIComponent(r.id)}
                    >
                      <span className="avatar small">
                        {fa ? r.name[0] : r.en[0]}
                      </span>
                      <span>
                        {fa ? r.name : r.en}
                        <small>{fa ? "مشاهده پرونده" : "View profile"} ↗</small>
                      </span>
                    </Link>
                  ) : (
                    <span className="table-person">
                      <span className="avatar small">
                        {fa ? r.name[0] : r.en[0]}
                      </span>
                      {fa ? r.name : r.en}
                    </span>
                  )}
                </td>
                {email && <td dir="ltr">{r.email}</td>}
                <td className="mono">{price(r.amount)}</td>
                <td>
                  <span
                    className={`badge ${r.status === "paid" ? "green" : r.status === "pending" ? "amber" : "red"}`}
                  >
                    {r.status === "paid"
                      ? fa
                        ? "موفق"
                        : "Paid"
                      : r.status === "pending"
                        ? fa
                          ? "در انتظار"
                          : "Pending"
                        : fa
                          ? "ناموفق"
                          : "Failed"}
                  </span>
                </td>
                <td>
                  <button
                    className="icon-btn"
                    aria-label={t("action")}
                    onClick={() => setDetail(r)}
                  >
                    <Icon name="Ellipsis" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            <Icon name="SearchX" />
            <p>{t("noResults")}</p>
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {n(filtered.length)} {fa ? "رکورد" : "records"}
        </span>
        <div>
          <Button
            label={fa ? "صفحهٔ قبل" : "Previous page"}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
          <span>
            {n(page)} / {n(Math.max(1, Math.ceil(filtered.length / 4)))}
          </span>
          <Button
            label={fa ? "صفحهٔ بعد" : "Next page"}
            disabled={page >= Math.ceil(filtered.length / 4)}
            onClick={() => setPage((p) => p + 1)}
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
        </div>
      </div>
      {detail && (
        <Modal
          title={fa ? detail.name : detail.en}
          onClose={() => setDetail(null)}
        >
          <dl className="cost-summary">
            <dt>{t("email")}</dt>
            <dd>{detail.email}</dd>
            <dt>{t("amount")}</dt>
            <dd>{price(detail.amount)}</dd>
            <dt>{t("status")}</dt>
            <dd>{detail.status}</dd>
          </dl>
          <h3>{fa ? "یادداشت و سابقه" : "Notes & timeline"}</h3>
          <p className="muted">
            {fa
              ? "حساب ایجاد شد ← طرح فعال شد ← آخرین فعالیت: امروز"
              : "Account created → Plan activated → Last active today"}
          </p>
          <textarea
            aria-label={fa ? "یادداشت" : "Note"}
            placeholder={fa ? "یادداشت اضافه کن…" : "Add a note…"}
          />
          <Button
            onClick={() => {
              toast.success(t("success"));
              setDetail(null);
            }}
          >
            {t("save")}
          </Button>
        </Modal>
      )}
      {create && (
        <Modal title={t("add")} onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRows([
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: newName,
                  en: newName,
                  email: "new@example.com",
                  amount: 0,
                  status: "pending",
                },
              ]);
              setCreate(false);
              toast.success(t("success"));
            }}
          >
            <label>
              {t("name")}
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={fa ? "حذف رکوردهای انتخاب‌شده" : "Delete selected records"}
          onClose={() => setConfirm(false)}
        >
          <p>
            {fa
              ? "برای تأیید، DELETE را وارد کن. این اقدام در سابقهٔ آزمایشی ثبت می‌شود."
              : "Type DELETE to confirm. This action is recorded in the demo audit trail."}
          </p>
          <input
            aria-label="DELETE"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button
            variant="danger"
            disabled={typed !== "DELETE"}
            onClick={() => {
              setRows(rows.filter((x) => !selected.includes(x.id)));
              setSelected([]);
              setConfirm(false);
              toast.success(
                fa
                  ? "حذف و ثبت در سابقه انجام شد"
                  : "Deleted and recorded in audit trail",
              );
            }}
          >
            {t("delete")}
          </Button>
        </Modal>
      )}
    </section>
  );
}
