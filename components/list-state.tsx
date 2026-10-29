"use client";
import { useEffect, useState } from "react";
import { request } from "@/lib/api/client";
import { Skeleton, ErrorState } from "./ui";
export function ListState({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState("loading");
    request(true)
      .then(() => {
        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (state === "loading") return <Skeleton />;
  if (state === "error")
    return <ErrorState retry={() => setAttempt((a) => a + 1)} />;
  return children;
}
