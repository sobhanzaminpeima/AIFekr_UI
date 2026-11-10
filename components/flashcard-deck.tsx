"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { Button } from "./ui";
import { liveCellText } from "@/lib/live-format";

export type Flashcard = { id: string; question: string; answer: string; nextReviewAt?: string | null; masteryLevel?: number | null };
type Rating = "hard" | "good" | "easy";

const dueTime = (c: Flashcard) => (c.nextReviewAt ? new Date(c.nextReviewAt).getTime() : 0);

/** One card at a time, due cards first: read the question, turn the card, say how well you remembered it. */
export function FlashcardDeck({ cards, url }: { cards: Flashcard[]; url: (id: string) => string }) {
  const { locale, tl } = useApp();
  const deck = useMemo(() => [...cards].sort((a, b) => dueTime(a) - dueTime(b)), [cards]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rated, setRated] = useState<Record<string, string>>({});
  const finished = index >= deck.length;
  const card = deck[index];
  const now = Date.now();
  const due = deck.filter((c) => dueTime(c) <= now).length;

  const go = useCallback((to: number) => {
    setError("");
    setFlipped(false);
    setIndex(to);
  }, []);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      setError("");
      try {
        const response = await fetch(url(card.id), {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string; nextReviewAt?: string };
        if (!response.ok) throw Error(body.error || "");
        setRated((r) => ({ ...r, [card.id]: body.nextReviewAt ?? "" }));
        go(index + 1);
      } catch (e) {
        setError((e instanceof Error && e.message) || tl("ثبت مرور انجام نشد. دوباره تلاش کن.", "Could not save this review. Please try again."));
      } finally {
        setBusy(false);
      }
    },
    [busy, card, go, index, tl, url],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (flipped && ["1", "2", "3"].includes(e.key)) void rate((["hard", "good", "easy"] as const)[Number(e.key) - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, rate]);

  if (!deck.length) return <p className="crm-empty">{tl("هنوز فلش‌کارتی نساخته‌ای. اولین کارت را اضافه کن.", "No flashcards yet. Add your first card.")}</p>;

  if (finished) {
    return (
      <div className="flash-done" role="status">
        <strong>{tl("این دور تمام شد!", "Round complete!")}</strong>
        <p>{tl("همهٔ کارت‌ها را مرور کردی. زمان مرور بعدی هر کارت ثبت شد.", "You reviewed every card, and each one has its next review date.")}</p>
        <Button onClick={() => { setRated({}); go(0); }}>{tl("مرور دوباره", "Review again")}</Button>
      </div>
    );
  }

  return (
    <div className="flash-deck">
      <div className="flash-meta">
        <span>{tl("کارت", "Card")} <bdi>{index + 1}</bdi> / <bdi>{deck.length}</bdi></span>
        <span>{tl("آمادهٔ مرور:", "Due now:")} <bdi>{due}</bdi></span>
      </div>
      <div className="flash-progress" role="progressbar" aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={index} aria-label={tl("پیشرفت مرور", "Review progress")}>
        <i style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>
      <div className="flash-stack">
        <button
          type="button"
          key={card.id}
          className={"flash-card" + (flipped ? " flipped" : "")}
          aria-pressed={flipped}
          aria-label={flipped ? tl("نمایش پرسش", "Show question") : tl("نمایش پاسخ", "Show answer")}
          onClick={() => setFlipped((f) => !f)}
        >
          <span className="flash-inner">
            <span className="flash-face flash-front" aria-hidden={flipped}>
              <small>{tl("پرسش", "Question")}</small>
              <b><bdi>{card.question}</bdi></b>
              <em>{tl("برای دیدن پاسخ، روی کارت بزن", "Tap the card to see the answer")}</em>
            </span>
            <span className="flash-face flash-back" aria-hidden={!flipped}>
              <small>{tl("پاسخ", "Answer")}</small>
              <b><bdi>{card.answer}</bdi></b>
              {card.nextReviewAt && <em>{tl("موعد این مرور: ", "Scheduled for: ")}{liveCellText(card.nextReviewAt, locale)}</em>}
            </span>
          </span>
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className={"flash-rating" + (flipped ? " shown" : "")} aria-hidden={!flipped}>
        {(["hard", "good", "easy"] as const).map((rating, i) => (
          <button type="button" key={rating} className={"flash-rate " + rating} disabled={!flipped || busy} tabIndex={flipped ? 0 : -1} onClick={() => void rate(rating)}>
            <span>{[tl("سخت بود", "Hard"), tl("مناسب بود", "Good"), tl("آسان بود", "Easy")][i]}</span>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="flash-nav">
        <Button onClick={() => go(index - 1)} disabled={index === 0}>{tl("کارت قبلی", "Previous")}</Button>
        <Button onClick={() => go(index + 1)}>{tl("رد کردن", "Skip")}</Button>
      </div>
      {rated[card.id] && <p className="fine-print">{liveCellText(rated[card.id], locale)}</p>}
    </div>
  );
}
