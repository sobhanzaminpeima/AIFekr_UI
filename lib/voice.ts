// The voice studio's text rules, copied verbatim from the main site's
// lib/voice-studio/domain.ts. The server splits a project the same way when it
// generates part N, so these must stay identical to keep the parts in step.

export type VoicePolicy = {
  enabled: boolean;
  /** Any account with a completed purchase may generate, paying from credits (main site voice-studio/domain.ts). */
  paidAccess?: boolean;
  version: number;
  maxCharacters: number;
  maxDurationSeconds: number;
  creditsPerInterval: number;
  billingInterval: number;
  allowedModels: string[];
  allowedVoices: string[];
};

export function graphemes(text: string) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

export function estimatedSeconds(text: string, language: string) {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, (words * 60) / (language === "fa" ? 95 : 110), graphemes(text) / (language === "fa" ? 9 : 12));
}

export function creditsFor(seconds: number, policy: Pick<VoicePolicy, "creditsPerInterval" | "billingInterval">) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("INVALID_DURATION");
  return Math.ceil(seconds / policy.billingInterval) * policy.creditsPerInterval;
}

/** Conservative segmentation is a preview, never a guarantee of the synthesized duration. */
export function splitProject(text: string, language: string, maxSeconds: number, maxProviderChars = 5000) {
  if (!text.trim()) return [];
  const pieces = [...new Intl.Segmenter(language, { granularity: "sentence" }).segment(text)].map((x) => x.segment);
  const out: string[] = [];
  let chunk = "";
  for (const sentence of pieces) {
    for (const word of sentence.split(/(?<=\s)/u)) {
      const next = chunk + word;
      if (chunk && (estimatedSeconds(next, language) > maxSeconds * 0.65 || Array.from(next).length > maxProviderChars)) {
        out.push(chunk);
        chunk = "";
      }
      if (estimatedSeconds(word, language) > maxSeconds * 0.65 || Array.from(word).length > maxProviderChars) throw new Error("UNSPLITTABLE_TEXT");
      chunk += word;
    }
  }
  if (chunk) out.push(chunk);
  return out;
}
