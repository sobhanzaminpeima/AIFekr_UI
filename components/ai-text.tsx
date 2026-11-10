"use client";
import ReactMarkdown from "react-markdown";

/** AI output is Markdown; raw HTML in it stays inert (react-markdown does not render it). */
export function AIText({ text }: { text: string }) {
  return (
    <div className="prose" style={{ overflowWrap: "anywhere" }}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
