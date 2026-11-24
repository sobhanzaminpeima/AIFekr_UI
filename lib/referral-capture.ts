/**
 * Keeps a `?ref=` invitation code from the page a visitor landed on (e.g. the
 * Instagram campaign link) until they register, so the code is not lost when
 * a landing page's CTA links to plain /register. The server still validates
 * the code at sign-up; this only remembers what the visitor arrived with.
 */
const KEY = "aifekr_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VALID = /^[A-Za-z0-9_-]{2,30}$/;

export function captureReferral(search: string) {
  try {
    const code = new URLSearchParams(search).get("ref")?.trim() ?? "";
    if (!VALID.test(code)) return;
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* storage unavailable (private mode): the URL parameter still works on /register */
  }
}

export function storedReferral(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "";
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number };
    if (!code || !VALID.test(code) || !at || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return "";
    }
    return code;
  } catch {
    return "";
  }
}
