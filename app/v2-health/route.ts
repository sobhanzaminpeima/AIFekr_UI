// Polled by the main site's proxy; while this fails, every page falls back to the classic design.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true, service: "aifekr-ui-v2" }, { headers: { "Cache-Control": "no-store" } });
}
