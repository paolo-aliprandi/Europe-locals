import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FluentProvider,
  MessageBar,
  MessageBarBody,
  Spinner,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import { ControlsPanel } from "./components/ControlsPanel";
import { EuropeMap } from "./components/EuropeMap";
import { GeographyDashboard } from "./components/GeographyDashboard";
import { MapLegend } from "./components/MapLegend";
import { buildRecordsByGeoId, getMetricDefinition, includeIrregularPresenceDetections } from "./data/demographics";
import { loadCountryDemographics, loadNuts2Demographics } from "./data/demographicRepository";
import type { DemographicRecord, Granularity, MetricKey } from "./types/demographics";

export function App() {
  const [granularity, setGranularity] = useState<Granularity>("country");
  const [metricKey, setMetricKey] = useState<MetricKey>("foreignBornShare");
  const [year, setYear] = useState(2023);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(null);
  const [records, setRecords] = useState<DemographicRecord[]>([]);
  const [includeIrregularPresence, setIncludeIrregularPresence] = useState(false);
  const [showAbsoluteValues, setShowAbsoluteValues] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEuStyle] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const metric = useMemo(() => getMetricDefinition(metricKey), [metricKey]);
  const displayRecords = useMemo(
    () => (includeIrregularPresence ? includeIrregularPresenceDetections(records) : records),
    [includeIrregularPresence, records],
  );
  const recordsByGeoId = useMemo(() => buildRecordsByGeoId(displayRecords), [displayRecords]);
  const selectedRecord = selectedGeoId ? recordsByGeoId.get(selectedGeoId) : undefined;

  useEffect(() => {
    let isCurrent = true;
    setIsDataLoading(true);
    setDataError(null);

    const loadDemographics = granularity === "nuts2" ? loadNuts2Demographics : loadCountryDemographics;

    loadDemographics(year)
      .then((dataset) => {
        if (!isCurrent) {
          return;
        }

        setRecords(dataset.records);
        setSelectedGeoId(dataset.records.find((record) => record.geoId === (granularity === "nuts2" ? "DE21" : "DE"))?.geoId ?? dataset.records[0]?.geoId ?? null);
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setDataError(error instanceof Error ? error.message : "Failed to load demographic data.");
      })
      .finally(() => {
        if (isCurrent) {
          setIsDataLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [granularity, year]);

  const handleSelectRecord = useCallback((record: DemographicRecord) => {
    setSelectedGeoId(record.geoId);
  }, []);

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme} className="app-provider">
      <main
        className={[
          "app-shell",
          isDarkMode ? "app-shell-dark" : "",
          isEuStyle ? "app-shell-eu" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <EuropeMap
          metricKey={metricKey}
          metric={metric}
          granularity={granularity}
          selectedGeoId={selectedGeoId}
          searchQuery={searchQuery}
          records={displayRecords}
          onSelectRecord={handleSelectRecord}
        />
        {isDataLoading ? (
          <div className="app-status">
            <Spinner size="tiny" />
            Loading Eurostat country data...
          </div>
        ) : null}
        {dataError ? (
          <MessageBar intent="error" className="app-error">
            <MessageBarBody>{dataError}</MessageBarBody>
          </MessageBar>
        ) : null}
        <ControlsPanel
          granularity={granularity}
          metricKey={metricKey}
          year={year}
          query={searchQuery}
          includeIrregularPresence={includeIrregularPresence}
          isDarkMode={isDarkMode}
          onGranularityChange={setGranularity}
          onMetricChange={setMetricKey}
          onYearChange={setYear}
          onQueryChange={setSearchQuery}
          onIncludeIrregularPresenceChange={setIncludeIrregularPresence}
          onDarkModeChange={setIsDarkMode}
        />
        <MapLegend metric={metric} granularity={granularity} year={year} />
        {selectedRecord ? (
          <GeographyDashboard
            record={selectedRecord}
            metric={metric}
            includeIrregularPresence={includeIrregularPresence}
            showAbsoluteValues={showAbsoluteValues}
            onShowAbsoluteValuesChange={setShowAbsoluteValues}
            onClose={() => setSelectedGeoId(null)}
          />
        ) : null}
      </main>
    </FluentProvider>
  );
}
