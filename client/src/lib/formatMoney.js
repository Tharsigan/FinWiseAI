const LKR = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

export function formatLKR(value) {
  return LKR.format(Number(value));
}

export function formatCompactLKR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000)
    return `LKR ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `LKR ${Math.round(n / 1000)}k`;
  return formatLKR(n);
}
