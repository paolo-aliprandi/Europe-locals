import type { ExpressionSpecification } from "maplibre-gl";
import type { DemographicRecord, Granularity, MetricKey } from "../types/demographics";
import { getMetricValue } from "../data/demographics";

const fallbackColor = "#fff7f7";
const COUNTRY_COLOR_RAMP = ["#fff7f7", "#fee2e2", "#fecaca", "#fca5a5", "#f87171", "#dc2626", "#991b1b"];
const NUTS2_COLOR_RAMP = [
  "#fff7f7",
  "#feecec",
  "#fee2e2",
  "#fed7d7",
  "#fecaca",
  "#fdb7b7",
  "#fca5a5",
  "#fb8b8b",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#991b1b",
];
const COUNTRY_MAX_RED_PERCENT = 40;
const NUTS2_MAX_RED_PERCENT = 30;

export function getMaxRedPercentForGranularity(granularity: Granularity): number {
  return granularity === "nuts2" ? NUTS2_MAX_RED_PERCENT : COUNTRY_MAX_RED_PERCENT;
}

export function getColorRampForGranularity(granularity: Granularity): string[] {
  return granularity === "nuts2" ? NUTS2_COLOR_RAMP : COUNTRY_COLOR_RAMP;
}

export function getChoroplethColor(
  value: number | null,
  invert = false,
  maxRedPercent = COUNTRY_MAX_RED_PERCENT,
  colorRamp = COUNTRY_COLOR_RAMP,
): string {
  if (value === null || Number.isNaN(value)) {
    return "rgba(180, 188, 196, 0.35)";
  }

  const scaledValue = invert ? 100 - value : value;
  const clampedValue = Math.max(0, Math.min(maxRedPercent, scaledValue));
  const bucket = Math.min(colorRamp.length - 1, Math.floor((clampedValue / maxRedPercent) * colorRamp.length));
  const paletteIndex = bucket;

  return colorRamp[paletteIndex] ?? fallbackColor;
}

export function buildCountryFillExpression(
  records: DemographicRecord[],
  metricKey: MetricKey,
  invert = false,
  featureIdProperty = "CNTR_ID",
  maxRedPercent = COUNTRY_MAX_RED_PERCENT,
  colorRamp = COUNTRY_COLOR_RAMP,
): ExpressionSpecification {
  const colorsByCountry = Object.fromEntries(
    records.map((record) => [
      record.geoId,
      getChoroplethColor(getMetricValue(record, metricKey), invert, maxRedPercent, colorRamp),
    ]),
  );

  return ["coalesce", ["get", ["get", featureIdProperty], ["literal", colorsByCountry]], "rgba(209, 213, 219, 0.28)"];
}
