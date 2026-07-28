import type { MapGeoJSONFeature } from "maplibre-gl";

export type CountryFeatureProperties = {
  CNTR_ID?: string;
  NAME_ENGL?: string;
  NAME_LATN?: string;
};

export function getCountryId(feature: MapGeoJSONFeature): string | undefined {
  const properties = feature.properties as CountryFeatureProperties | null;
  return properties?.CNTR_ID;
}

export type NutsFeatureProperties = {
  NUTS_ID?: string;
  LEVL_CODE?: number;
  NUTS_NAME?: string;
  CNTR_CODE?: string;
};

export function getNutsId(feature: MapGeoJSONFeature): string | undefined {
  const properties = feature.properties as NutsFeatureProperties | null;
  return properties?.NUTS_ID;
}
