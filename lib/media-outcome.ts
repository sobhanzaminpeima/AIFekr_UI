/** Display and validate generation outcomes without changing billing rules. */
export function approvedMediaCost(costs: Record<string, number> | null, kind: string, quality: string, count: number, seconds: number): number | null {
  const key = kind === "image" ? quality === "hd" ? "image_hd" : "image_standard" : kind === "video" ? `video_${seconds <= 5 ? 5 : seconds <= 10 ? 10 : 30}s` : `music_${seconds <= 30 ? 30 : seconds <= 60 ? 60 : 120}s`;
  const rate = costs?.[key];
  return typeof rate === "number" && Number.isFinite(rate) && rate >= 0 ? rate * (kind === "image" ? count : 1) : null;
}

export function imageOutputs(body: { images?: unknown }): string[] {
  if (!Array.isArray(body.images)) return [];
  return body.images.flatMap((item) => item && typeof item.url === "string" && /^https?:\/\//.test(item.url) ? [item.url] : []);
}

export type MediaFailure = "credits" | "plan" | "rate_limited" | "invalid_input" | "disabled" | "provider" | "content_blocked";
export function mediaFailure(status: number, body: Record<string, unknown>): MediaFailure {
  const code = String(body.code ?? "");
  if(code==='IMAGE_SAFETY_REJECTED')return 'content_blocked';
  if (body.requiresUpgrade || /PLAN_REQUIRED|REQUIRES_UPGRADE/.test(code)) return "plan";
  if (status === 402 || /INSUFFICIENT_CREDITS|CREDITS_INSUFFICIENT/.test(code)) return "credits";
  if (status === 429) return "rate_limited";
  if (status === 503) return "disabled";
  if ([400, 413, 422].includes(status)) return "invalid_input";
  return "provider";
}

export function failureGuidance(reason: MediaFailure, fa: boolean): string {
  const copy: Record<MediaFailure, [string, string]> = {
    content_blocked:['درخواست تصویر در بررسی ایمنی سرویس پذیرفته نشد؛ متن و تصویر مرجع را بررسی کنید. برای این درخواست کردیتی کسر نشده است.','The image request was rejected by the service’s safety checks. Review your prompt and reference image. No credits were deducted for this request.'],
    credits: ["کردیت کافی نیست؛ موجودی و هزینه را بررسی کنید یا کیف پول را شارژ کنید.", "Check your balance and cost, or top up your wallet."],
    plan: ["این ابزار به پکیج مناسب نیاز دارد؛ پکیج‌ها را بررسی کنید.", "This tool needs an eligible package. Review your packages."],
    rate_limited: ["درخواست‌ها زیاد شده‌اند؛ کمی صبر کنید و دوباره تلاش کنید.", "Too many requests. Wait a moment before trying again."],
    invalid_input: ["متن و فایل مرجع را بررسی کنید؛ سپس دوباره ارسال کنید.", "Check your prompt and reference file before submitting again."],
    disabled: ["این سرویس فعلاً در دسترس نیست؛ بعداً دوباره بررسی کنید.", "This service is currently unavailable. Check back later."],
    provider: ["خروجی تأیید نشد. تاریخچه و موجودی را قبل از ارسال مجدد بررسی کنید.", "No output was confirmed. Check your history and balance before resubmitting."],
  };
  return copy[reason][fa ? 0 : 1];
}
