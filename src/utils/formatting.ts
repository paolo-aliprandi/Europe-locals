export function formatPopulation(value: number | null): string {
  if (value === null) {
    return "Data unavailable";
  }

  return new Intl.NumberFormat("en", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "Data unavailable";
  }

  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value)}%`;
}
