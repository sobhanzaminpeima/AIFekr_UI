/**
 * The credit range one chat message can cost. In automatic mode the router may
 * answer with any enabled model, so a single "≈ 1" understated it: production
 * charged 4 credits on 59 of 146 automatic messages in 30 days (issue 46).
 * Returns [lowest, highest]; equal when only one price is possible.
 */
export function chatCostRange(
  model: string,
  baseCost: number | null,
  providers: { model: string; creditCost?: number }[],
): [number, number] | null {
  if (model !== "auto") {
    const c = providers.find((p) => p.model === model)?.creditCost;
    return typeof c === "number" ? [c, c] : null;
  }
  const costs = providers.map((p) => p.creditCost).filter((c): c is number => typeof c === "number");
  if (baseCost == null && !costs.length) return null;
  const low = Math.min(...(baseCost != null ? [baseCost] : []), ...costs);
  return [low, Math.max(low, ...costs)];
}
