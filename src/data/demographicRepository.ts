import type { DemographicRecord } from "../types/demographics";

type DemographicDataset = {
  generatedAt: string;
  year: number;
  records: DemographicRecord[];
};

export async function loadCountryDemographics(year: number): Promise<DemographicDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/demographics/country-${year}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load demographic data for ${year}: HTTP ${response.status}`);
  }

  const dataset = (await response.json()) as DemographicDataset;

  if (!Array.isArray(dataset.records) || dataset.records.length === 0) {
    throw new Error(`Demographic data for ${year} did not contain records.`);
  }

  return dataset;
}

export async function loadNuts2Demographics(year: number): Promise<DemographicDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/demographics/nuts2-${year}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load NUTS 2 demographic data for ${year}: HTTP ${response.status}`);
  }

  const dataset = (await response.json()) as DemographicDataset;

  if (!Array.isArray(dataset.records) || dataset.records.length === 0) {
    throw new Error(`NUTS 2 demographic data for ${year} did not contain records.`);
  }

  return dataset;
}
