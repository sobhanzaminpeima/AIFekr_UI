"use client";
import { useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";

const LABELS = {
  fa: { copy: "کپی", copied: "کپی شد", failed: "کپی نشد", download: "دانلود" },
  en: { copy: "Copy", copied: "Copied", failed: "Copy failed", download: "Download" },
  de: { copy: "Kopieren", copied: "Kopiert", failed: "Kopieren fehlgeschlagen", download: "Herunterladen" },
  tr: { copy: "Kopyala", copied: "Kopyalandı", failed: "Kopyalanamadı", download: "İndir" },
} as const;

/** Copy and download for a finished AI result. */
export function AIResultActions({ text, filename }: { text: string; filename: string }) {
  const lang = useShell()!.lang,
    l = LABELS[lang as keyof typeof LABELS] ?? LABELS.en;
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const download = () => {
    const href = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  };
  return (
    <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button
        onClick={() =>
          navigator.clipboard.writeText(text).then(
            () => setCopy("copied"),
            () => setCopy("failed"),
          )
        }
      >
        {copy === "copied" ? l.copied : copy === "failed" ? l.failed : l.copy}
      </Button>
      <Button onClick={download}>{l.download}</Button>
    </p>
  );
}
