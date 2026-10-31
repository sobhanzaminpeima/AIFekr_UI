const LABELS: Record<string, [string, string]> = {
  manual: ["دستی", "Manual"], auto: ["خودکار", "Automatic"],
  caption: ["کپشن", "Caption"], hooks: ["شروع ریلز", "Reels hooks"], carousel: ["کاروسل", "Carousel"], calendar: ["تقویم محتوا", "Content calendar"], hashtags: ["هشتگ‌ها", "Hashtags"], humanize: ["بازنویسی طبیعی", "Natural rewrite"], profile: ["معرفی صفحه", "Profile bio"],
  keyword: ["کلمهٔ کلیدی", "Keyword"], all_messages: ["همهٔ پیام‌ها", "All messages"], ai_fallback: ["پاسخ پیش‌فرض", "Fallback response"],
  PENDING: ["در انتظار", "Pending"], PUBLISHED: ["منتشرشده", "Published"], FAILED: ["ناموفق", "Failed"],
  inbound: ["دریافتی", "Incoming"], outbound: ["ارسالی", "Outgoing"], sent: ["ارسال‌شده", "Sent"], failed: ["ناموفق", "Failed"], sending: ["در حال ارسال", "Sending"],
  IMAGE: ["تصویر", "Image"], VIDEO: ["ویدیو", "Video"], CAROUSEL_ALBUM: ["آلبوم", "Carousel"],
};
export const socialLabel = (value: string, fa: boolean) => LABELS[value]?.[fa ? 0 : 1] ?? value;
