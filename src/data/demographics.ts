import type { DemographicRecord, Granularity, MetricDefinition, MetricKey } from "../types/demographics";

export const metrics: MetricDefinition[] = [
  {
    key: "localBornShare",
    label: "Local-born population",
    shortLabel: "Local-born %",
    description: "Share of residents born in the selected geography's reporting country.",
    lowerIsDarker: true,
  },
  {
    key: "foreignBornShare",
    label: "Foreign-born population",
    shortLabel: "Foreign-born %",
    description: "Share of residents born outside the selected geography's reporting country.",
  },
  {
    key: "nonCitizenShare",
    label: "Non-citizen population",
    shortLabel: "Non-citizen %",
    description: "Share of residents who are not citizens of the reporting country.",
  },
];

export function getMetricDefinition(metricKey: MetricKey): MetricDefinition {
  const metric = metrics.find((item) => item.key === metricKey);

  if (!metric) {
    throw new Error(`Unsupported metric: ${metricKey}`);
  }

  return metric;
}

export function getMetricDescription(metric: MetricDefinition, granularity: Granularity): string {
  if (granularity !== "nuts2") {
    return metric.description;
  }

  return `${metric.description} Regional shares use 2023 Eurostat Labour Force Survey data for people aged 15+ in private households.`;
}

export function getMetricValue(record: DemographicRecord | undefined, metricKey: MetricKey): number | null {
  return record?.[metricKey] ?? null;
}

export function buildRecordsByGeoId(records: DemographicRecord[]): Map<string, DemographicRecord> {
  return new Map(records.map((record) => [record.geoId, record]));
}

function percentage(part: number | null | undefined, total: number | null | undefined): number | null {
  if (!part || !total) {
    return null;
  }

  return Math.round((part / total) * 10_000) / 100;
}

export function includeIrregularPresenceDetections(records: DemographicRecord[]): DemographicRecord[] {
  return records.map((record) => {
    const detections = record.irregularPresenceDetections ?? 0;

    if (detections <= 0) {
      return record;
    }

    const adjustedTotal = record.totalPopulation === null ? null : record.totalPopulation + detections;
    const adjustedForeignBorn =
      record.foreignBornPopulation === null ? null : record.foreignBornPopulation + detections;
    const adjustedNonCitizen = record.nonCitizenPopulation === null ? null : record.nonCitizenPopulation + detections;

    return {
      ...record,
      totalPopulation: adjustedTotal,
      foreignBornPopulation: adjustedForeignBorn,
      nonCitizenPopulation: adjustedNonCitizen,
      localBornShare: percentage(record.localBornPopulation, adjustedTotal),
      foreignBornShare: percentage(adjustedForeignBorn, adjustedTotal),
      nonCitizenShare: percentage(adjustedNonCitizen, adjustedTotal),
    };
  });
}
