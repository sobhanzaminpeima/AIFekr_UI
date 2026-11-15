/**
 * First-run checklist (roadmap E5): the few first actions that show a new
 * account what AIFekr does, each ticked from the account's real data, never
 * from a click on the list itself.
 */
export type FirstRunStep = "chat" | "create" | "connect" | "automate";

export interface FirstRunFacts {
  usageTypes: string[];
  libraryKinds: string[];
  connectedKeys: string[];
  automations: number;
}

export const FIRST_RUN_LINKS: Record<FirstRunStep, string> = {
  chat: "/chat",
  create: "/image/generate",
  connect: "/social?tab=connections",
  automate: "/social?tab=campaigns",
};

export function firstRunSteps(f: FirstRunFacts): { step: FirstRunStep; done: boolean; href: string }[] {
  const done: Record<FirstRunStep, boolean> = {
    chat: f.usageTypes.includes("chat"),
    create: f.libraryKinds.length > 0,
    connect: f.connectedKeys.length > 0,
    automate: f.automations > 0,
  };
  return (Object.keys(done) as FirstRunStep[]).map((step) => ({ step, done: done[step], href: FIRST_RUN_LINKS[step] }));
}

/** Hidden once every step is done; a finished checklist is noise. */
export const firstRunComplete = (steps: { done: boolean }[]) => steps.every((s) => s.done);
