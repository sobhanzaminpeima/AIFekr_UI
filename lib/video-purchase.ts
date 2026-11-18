export const VIDEO_SKUS = { main: "VF_AUTO_10", economy: "VF_ECONOMY_10" } as const;
export type VideoSku = typeof VIDEO_SKUS[keyof typeof VIDEO_SKUS];

export function videoSku(value: string | null): VideoSku | null {
  return value === VIDEO_SKUS.main || value === VIDEO_SKUS.economy ? value : null;
}

export function videoPurchasePath(sku: VideoSku) {
  return "/plans?plan=" + sku;
}

export function videoWorkspacePath(sku: VideoSku) {
  return "/video-factory?tab=production&new=1&package=" + (sku === VIDEO_SKUS.main ? "main" : "economy");
}
