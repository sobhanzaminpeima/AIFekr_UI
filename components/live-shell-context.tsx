"use client";
import { createContext, useContext } from "react";
import type { ShellData } from "@/lib/live-app";

const ShellContext = createContext<ShellData | null>(null);
export function ShellProvider({ data, children }: { data: ShellData | null; children: React.ReactNode }) {
  return <ShellContext.Provider value={data}>{children}</ShellContext.Provider>;
}
/** The signed-in frame's data on aifekr.com app pages; null elsewhere. */
export const useShell = () => useContext(ShellContext);
