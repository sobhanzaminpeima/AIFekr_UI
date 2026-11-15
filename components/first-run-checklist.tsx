"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { firstRunComplete, firstRunSteps, type FirstRunStep } from "@/lib/first-run";

type Q = [string, string, string, string];
const TITLE: Q = ["شروع کار با AIFekr", "Getting started with AIFekr", "Erste Schritte mit AIFekr", "AIFekr ile başlarken"];
const STEP: Record<FirstRunStep, Q> = {
  chat: ["یک سؤال از دستیار بپرسید", "Ask the assistant a question", "Stellen Sie dem Assistenten eine Frage", "Asistana bir soru sorun"],
  create: ["اولین تصویر یا محتوا را بسازید", "Make your first image or content", "Erstellen Sie Ihr erstes Bild oder Inhalt", "İlk görselinizi veya içeriğinizi oluşturun"],
  connect: ["اینستاگرام یا سایتتان را وصل کنید", "Connect your Instagram or website", "Verbinden Sie Instagram oder Ihre Website", "Instagram'ınızı veya sitenizi bağlayın"],
  automate: ["اولین اتوماسیون را بسازید", "Create your first automation", "Erstellen Sie Ihre erste Automation", "İlk otomasyonunuzu oluşturun"],
};
const json = (u: string) => fetch(u, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

/** E5: a first-run checklist ticked from the account's real activity. */
export function FirstRunChecklist() {
  const { locale } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const [steps, setSteps] = useState<ReturnType<typeof firstRunSteps> | null>(null);
  useEffect(() => {
    Promise.all([
      json("/api/user/usage/history?limit=200").catch(() => ({ entries: [] })),
      json("/api/library").catch(() => ({ items: [] })),
      json("/api/connections/health").catch(() => ({ connections: [] })),
      json("/api/automations").catch(() => ({ automations: [] })),
    ]).then(([u, l, c, a]) => setSteps(firstRunSteps({
      usageTypes: (u.entries ?? []).map((e: { type: string }) => e.type),
      libraryKinds: (l.items ?? []).map((x: { kind: string }) => x.kind),
      connectedKeys: (c.connections ?? []).filter((x: { state: string }) => x.state !== "not_connected").map((x: { key: string }) => x.key),
      automations: (a.automations ?? []).length,
    })));
  }, []);
  if (!steps || firstRunComplete(steps)) return null;
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="panel" aria-label={TITLE[i]}>
      <div className="row-between"><h3>{TITLE[i]}</h3><span className="badge">{done}/{steps.length}</span></div>
      <ol className="first-run">
        {steps.map((s) => (
          <li key={s.step} className={s.done ? "done" : ""}>
            <span aria-hidden="true">{s.done ? "✓" : "○"}</span>{" "}
            {s.done ? <s>{STEP[s.step][i]}</s> : <a className="text-link" href={s.href}>{STEP[s.step][i]}</a>}
          </li>
        ))}
      </ol>
    </section>
  );
}
