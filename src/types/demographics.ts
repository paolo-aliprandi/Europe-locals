export type Granularity = "country" | "nuts1" | "nuts2" | "nuts3" | "city";

export type MetricKey = "localBornShare" | "foreignBornShare" | "nonCitizenShare";

export type SourceMetadata = {
  name: string;
  url: string;
  datasetCode?: string;
  retrievedAt: string;
  methodologyNote: string;
};

export type OriginBreakdown = {
  originId: string;
  originName: string;
  population: number | null;
  share: number | null;
};

export type MigrationTrendPoint = {
  year: number;
  totalPopulation: number | null;
  localBornPopulation: number | null;
  foreignBornPopulation: number | null;
  localBornShare: number | null;
  foreignBornShare: number | null;
};

export type DemographicRecord = {
  geoId: string;
  geoName: string;
  parentGeoId?: string;
  parentGeoName?: string;
  granularity: Granularity;
  year: number;
  source: SourceMetadata;
  totalPopulation: number | null;
  localBornPopulation: number | null;
  foreignBornPopulation: number | null;
  nonCitizenPopulation: number | null;
  irregularPresenceDetections?: number | null;
  localBornShare: number | null;
  foreignBornShare: number | null;
  nonCitizenShare: number | null;
  origins: OriginBreakdown[];
  migrationTrend: MigrationTrendPoint[];
};

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  lowerIsDarker?: boolean;
};
