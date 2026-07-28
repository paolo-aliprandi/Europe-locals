import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import { makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { GISCO_COUNTRIES_GEOJSON_URL, GISCO_NUTS_GEOJSON_URL } from "../data/geography";
import { buildRecordsByGeoId } from "../data/demographics";
import type { DemographicRecord, Granularity, MetricDefinition, MetricKey } from "../types/demographics";
import { getCountryId, getNutsId } from "../types/geography";
import { buildCountryFillExpression, getColorRampForGranularity, getMaxRedPercentForGranularity } from "../map/colorScales";
import { openStreetMapRasterStyle } from "../map/mapStyle";

const COUNTRIES_SOURCE_ID = "gisco-countries";
const NUTS_SOURCE_ID = "gisco-nuts";
const COUNTRY_FILL_LAYER_ID = "country-demographics";
const COUNTRY_OUTLINE_LAYER_ID = "country-outlines";
const SELECTED_OUTLINE_LAYER_ID = "selected-country-outline";
const NUTS_FILL_LAYER_ID = "nuts2-demographics";
const NUTS_OUTLINE_LAYER_ID = "nuts2-outlines";
const SELECTED_NUTS_OUTLINE_LAYER_ID = "selected-nuts2-outline";

const useStyles = makeStyles({
  root: {
    position: "absolute",
    inset: 0,
  },
  map: {
    position: "absolute",
    inset: 0,
  },
  status: {
    position: "absolute",
    top: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 7,
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
});

type EuropeMapProps = {
  metricKey: MetricKey;
  metric: MetricDefinition;
  granularity: Granularity;
  selectedGeoId: string | null;
  searchQuery: string;
  records: DemographicRecord[];
  onSelectRecord: (record: DemographicRecord) => void;
};

export function EuropeMap({ metricKey, metric, granularity, selectedGeoId, searchQuery, records, onSelectRecord }: EuropeMapProps) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fillExpression = useMemo(
    () =>
      buildCountryFillExpression(
        records,
        metricKey,
        metric.lowerIsDarker,
        granularity === "nuts2" ? "NUTS_ID" : "CNTR_ID",
        getMaxRedPercentForGranularity(granularity),
        getColorRampForGranularity(granularity),
      ),
    [granularity, metric.lowerIsDarker, metricKey, records],
  );
  const recordsByGeoId = useMemo(() => buildRecordsByGeoId(records), [records]);
  const fillExpressionRef = useRef(fillExpression);
  const recordsByGeoIdRef = useRef(recordsByGeoId);
  const onSelectRecordRef = useRef(onSelectRecord);

  useEffect(() => {
    fillExpressionRef.current = fillExpression;
    recordsByGeoIdRef.current = recordsByGeoId;
    onSelectRecordRef.current = onSelectRecord;
  }, [fillExpression, onSelectRecord, recordsByGeoId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: openStreetMapRasterStyle,
      center: [13, 52],
      zoom: 3.05,
      minZoom: 2.2,
      maxZoom: 8,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");

    map.on("load", () => {
      map.addSource(COUNTRIES_SOURCE_ID, {
        type: "geojson",
        data: GISCO_COUNTRIES_GEOJSON_URL,
      });
      map.addSource(NUTS_SOURCE_ID, {
        type: "geojson",
        data: GISCO_NUTS_GEOJSON_URL,
      });

      map.addLayer({
        id: COUNTRY_FILL_LAYER_ID,
        type: "fill",
        source: COUNTRIES_SOURCE_ID,
        paint: {
          "fill-color": fillExpressionRef.current,
          "fill-opacity": 0.74,
        },
      });

      map.addLayer({
        id: COUNTRY_OUTLINE_LAYER_ID,
        type: "line",
        source: COUNTRIES_SOURCE_ID,
        paint: {
          "line-color": "rgba(255, 255, 255, 0.9)",
          "line-width": 0.8,
        },
      });

      map.addLayer({
        id: SELECTED_OUTLINE_LAYER_ID,
        type: "line",
        source: COUNTRIES_SOURCE_ID,
        filter: ["==", ["get", "CNTR_ID"], ""],
        paint: {
          "line-color": "#003399",
          "line-width": 3,
        },
      });

      map.addLayer({
        id: NUTS_FILL_LAYER_ID,
        type: "fill",
        source: NUTS_SOURCE_ID,
        filter: ["==", ["get", "LEVL_CODE"], 2],
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-color": fillExpressionRef.current,
          "fill-opacity": 0.74,
        },
      });

      map.addLayer({
        id: NUTS_OUTLINE_LAYER_ID,
        type: "line",
        source: NUTS_SOURCE_ID,
        filter: ["==", ["get", "LEVL_CODE"], 2],
        layout: {
          visibility: "none",
        },
        paint: {
          "line-color": "rgba(255, 255, 255, 0.82)",
          "line-width": 0.6,
        },
      });

      map.addLayer({
        id: SELECTED_NUTS_OUTLINE_LAYER_ID,
        type: "line",
        source: NUTS_SOURCE_ID,
        filter: ["all", ["==", ["get", "LEVL_CODE"], 2], ["==", ["get", "NUTS_ID"], ""]],
        layout: {
          visibility: "none",
        },
        paint: {
          "line-color": "#003399",
          "line-width": 3,
        },
      });

      setIsLoading(false);
    });

    map.on("mouseenter", COUNTRY_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseenter", NUTS_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", NUTS_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mouseleave", COUNTRY_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", COUNTRY_FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const countryId = feature ? getCountryId(feature) : undefined;
      const record = countryId ? recordsByGeoIdRef.current.get(countryId) : undefined;

      if (record) {
        onSelectRecordRef.current(record);
      }
    });
    map.on("click", NUTS_FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const nutsId = feature ? getNutsId(feature) : undefined;
      const record = nutsId ? recordsByGeoIdRef.current.get(nutsId) : undefined;

      if (record) {
        onSelectRecordRef.current(record);
      }
    });

    map.on("error", (event) => {
      setError(event.error?.message ?? "The map failed to load.");
      setIsLoading(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(COUNTRY_FILL_LAYER_ID)) {
      return;
    }

    const activeFillLayer = granularity === "nuts2" ? NUTS_FILL_LAYER_ID : COUNTRY_FILL_LAYER_ID;
    map.setPaintProperty(activeFillLayer, "fill-color", fillExpression);
  }, [fillExpression, granularity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(COUNTRY_FILL_LAYER_ID) || !map.getLayer(NUTS_FILL_LAYER_ID)) {
      return;
    }

    const isNuts = granularity === "nuts2";
    map.setLayoutProperty(COUNTRY_FILL_LAYER_ID, "visibility", isNuts ? "none" : "visible");
    map.setLayoutProperty(COUNTRY_OUTLINE_LAYER_ID, "visibility", isNuts ? "none" : "visible");
    map.setLayoutProperty(SELECTED_OUTLINE_LAYER_ID, "visibility", isNuts ? "none" : "visible");
    map.setLayoutProperty(NUTS_FILL_LAYER_ID, "visibility", isNuts ? "visible" : "none");
    map.setLayoutProperty(NUTS_OUTLINE_LAYER_ID, "visibility", isNuts ? "visible" : "none");
    map.setLayoutProperty(SELECTED_NUTS_OUTLINE_LAYER_ID, "visibility", isNuts ? "visible" : "none");
  }, [granularity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(SELECTED_OUTLINE_LAYER_ID)) {
      return;
    }

    map.setFilter(SELECTED_OUTLINE_LAYER_ID, ["==", ["get", "CNTR_ID"], selectedGeoId ?? ""]);
    map.setFilter(SELECTED_NUTS_OUTLINE_LAYER_ID, [
      "all",
      ["==", ["get", "LEVL_CODE"], 2],
      ["==", ["get", "NUTS_ID"], selectedGeoId ?? ""],
    ]);
  }, [selectedGeoId]);

  useEffect(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) {
      return;
    }

    const match = records.find((record) => record.geoName.toLocaleLowerCase().includes(query));
    if (match) {
      onSelectRecord(match);
    }
  }, [onSelectRecord, records, searchQuery]);

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} aria-label="Interactive demographic map of Europe" />
      {isLoading ? (
        <div className={styles.status}>
          <Spinner size="tiny" />
          <Text>Loading GISCO country boundaries...</Text>
        </div>
      ) : null}
      {error ? (
        <div className={`${styles.status} ${styles.error}`}>
          <Text weight="semibold">{error}</Text>
        </div>
      ) : null}
    </div>
  );
}
