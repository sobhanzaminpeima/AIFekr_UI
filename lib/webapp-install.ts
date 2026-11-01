export type InstallPlatform = "android" | "ios" | "desktop";
export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function installPlatform(userAgent: string, touchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  return /Android/i.test(userAgent) ? "android" : "desktop";
}
export function inAppBrowser(userAgent: string) { return /Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(userAgent); }

/** Browser prompt objects are single-use. Consume before awaiting to prevent duplicate dialogs. */
export class InstallRequest {
  private pending: InstallPrompt | null = null;
  private busy = false;
  receive(event: InstallPrompt) { event.preventDefault(); this.pending = event; }
  get available() { return this.pending !== null && !this.busy; }
  clear() { this.pending = null; }
  async run(): Promise<"accepted" | "dismissed" | "unavailable" | "failed"> {
    if (!this.available) return "unavailable";
    const event = this.pending!; this.pending = null; this.busy = true;
    try { await event.prompt(); return (await event.userChoice).outcome; }
    catch { return "failed"; }
    finally { this.busy = false; }
  }
}
