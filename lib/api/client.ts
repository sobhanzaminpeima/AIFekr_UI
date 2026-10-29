export type JobStage = "queued" | "running" | "done" | "failed";
export type GeneratedItem = {
  id: string;
  prompt: string;
  type: string;
  date: string;
  content: string;
};
let randomFailure = false;
export function setFailureMode(enabled: boolean) {
  randomFailure = enabled;
}
export async function request<T>(data: T): Promise<T> {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 900));
  if (randomFailure && Math.random() < 0.35)
    throw new Error("SIMULATED_FAILURE");
  return data;
}
export async function generate(
  prompt: string,
  type: string,
): Promise<GeneratedItem> {
  return request({
    id: crypto.randomUUID(),
    prompt,
    type,
    date: new Date().toISOString(),
    content: type === "image" ? "/art/orbit.svg" : prompt,
  });
}
export async function save<T>(value: T) {
  return request(value);
}
export async function chat(prompt: string, fa: boolean) {
  return request(
    fa
      ? `برای «${prompt}» از یک هدف روشن شروع کنیم.\n\n۱. مخاطب و نتیجهٔ مورد انتظار را مشخص کن.\n۲. ایده را به سه قدم کوچک و قابل انجام تقسیم کن.\n۳. یک نسخهٔ اولیه بساز و با بازخورد بهترش کن.\n\nپیشنهاد من: امروز روی قدم اول تمرکز کنیم و یک طرح کوتاه بنویسیم. دوست داری جزئیات کدام بخش را با هم بررسی کنیم؟\n\nاین پاسخ برای نمایش رابط کاربری ساخته شده و از مدل واقعی دریافت نشده است.`
      : `Let’s work on “${prompt}” with a clear first step.\n\n1. Define the audience and the outcome.\n2. Break the idea into three achievable milestones.\n3. Build a small first version and improve it with feedback.\n\nI suggest we start with a concise outline. Which part would you like to explore?\n\nThis is a simulated response for the interface demo, not a live AI model.`,
  );
}
