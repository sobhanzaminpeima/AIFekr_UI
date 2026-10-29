export type Plan = {
  id: string;
  fa: string;
  en: string;
  price: number;
  credits: number;
  enabled: boolean;
};
export type Promotion = {
  id: string;
  code: string;
  percent: number;
  active: boolean;
};
export type Purchase = {
  id: string;
  plan: string;
  amount: number;
  credits: number;
  period: number;
  date: string;
  status: "paid" | "failed";
};
export const defaultPlans: Plan[] = [
  {
    id: "starter",
    fa: "رایگان",
    en: "Starter",
    price: 0,
    credits: 50,
    enabled: true,
  },
  {
    id: "pro",
    fa: "حرفه‌ای",
    en: "Pro",
    price: 490000,
    credits: 2500,
    enabled: true,
  },
  {
    id: "business",
    fa: "کسب‌وکار",
    en: "Business",
    price: 1490000,
    credits: 10000,
    enabled: true,
  },
];
export const defaultPromotions: Promotion[] = [
  { id: "welcome", code: "AIFEKR10", percent: 10, active: true },
];
export const periodDiscount = (period: number) =>
  period === 12 ? 0.8 : period === 6 ? 0.9 : period === 3 ? 0.95 : 1;
