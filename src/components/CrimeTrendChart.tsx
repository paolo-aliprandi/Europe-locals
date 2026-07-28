import { useEffect, useMemo, useState } from "react";
import { Caption1, Text, makeStyles, tokens } from "@fluentui/react-components";

type CrimeTrendPoint = {
  year: number;
  ratePer100k: number | null;
};

type CrimeTrendOffence = {
  offenceCode: string;
  offenceLabel: string;
  points: CrimeTrendPoint[];
};

type CountryCrimeTrend = {
  geoId: string;
  geoName: string;
  offences: CrimeTrendOffence[];
};

type IndexedCrimeSeries = {
  offenceCode: string;
  offenceLabel: string;
  color: string;
  points: Array<{
    year: number;
    ratePer100k: number;
    indexValue: number;
  }>;
};

type CrimeMigrationAnalysis = {
  caveat: string;
  countryCrimeTrends: CountryCrimeTrend[];
};

const lineColors = ["#dc2626", "#2563eb", "#7c3aed", "#ea580c", "#059669", "#4b5563"];

const useStyles = makeStyles({
  root: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  chart: {
    width: "100%",
    height: "164px",
    overflow: "visible",
  },
  legend: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingVerticalXXS,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  legendSwatch: {
    width: "18px",
    height: "3px",
    borderRadius: tokens.borderRadiusCircular,
  },
});

type CrimeTrendChartProps = {
  countryId: string | null;
  countryName: string;
};

function getShortOffenceLabel(label: string): string {
  return label
    .replace("Burglary of private residential premises", "Residential burglary")
    .replace("Unlawful acts involving controlled drugs or precursors", "Drug offences");
}

function getChartTitle(seriesCount: number, firstLabel?: string): string {
  return seriesCount === 1 && firstLabel ? `${getShortOffenceLabel(firstLabel)} over time` : "Crime rates over time";
}

function formatIndexValue(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

export function CrimeTrendChart({ countryId, countryName }: CrimeTrendChartProps) {
  const styles = useStyles();
  const [analysis, setAnalysis] = useState<CrimeMigrationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    fetch(`${import.meta.env.BASE_URL}data/analysis/crime-migration-correlations.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load crime analysis: HTTP ${response.status}`);
        }

        return response.json() as Promise<CrimeMigrationAnalysis>;
      })
      .then((dataset) => {
        if (isCurrent) {
          setAnalysis(dataset);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load crime analysis.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const countryTrend = useMemo(
    () => analysis?.countryCrimeTrends.find((trend) => trend.geoId === countryId) ?? null,
    [analysis, countryId],
  );
  const indexedSeries = useMemo(
    () =>
      countryTrend?.offences
        .map((offence, index) => {
          const points = offence.points.filter((point): point is { year: number; ratePer100k: number } => point.ratePer100k !== null);
          const baseline = points[0]?.ratePer100k;

          if (!baseline || points.length < 2) {
            return null;
          }

          return {
            offenceCode: offence.offenceCode,
            offenceLabel: offence.offenceLabel,
            color: lineColors[index % lineColors.length],
            points: points.map((point) => ({
              ...point,
              indexValue: (point.ratePer100k / baseline) * 100,
            })),
          };
        })
        .filter((series): series is IndexedCrimeSeries => series !== null) ?? [],
    [countryTrend],
  );

  if (error) {
    return (
      <div className={styles.root}>
        <Text weight="semibold">Rape over time</Text>
        <Caption1>{error}</Caption1>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={styles.root}>
        <Text weight="semibold">Rape over time</Text>
        <Caption1>Loading crime trend data...</Caption1>
      </div>
    );
  }

  if (indexedSeries.length === 0) {
    return (
      <div className={styles.root}>
        <Text weight="semibold">Rape over time</Text>
        <Caption1>Crime trend data unavailable for {countryName}.</Caption1>
      </div>
    );
  }

  const width = 320;
  const height = 164;
  const padding = 22;
  const bottomPadding = 36;
  const allValues = indexedSeries.flatMap((series) => series.points.map((point) => point.indexValue));
  const minValue = Math.max(0, Math.min(...allValues) - 10);
  const maxValue = Math.max(...allValues) + 10;
  const valueRange = Math.max(1, maxValue - minValue);
  const years = [...new Set(indexedSeries.flatMap((series) => series.points.map((point) => point.year)))].sort();
  const firstYear = years[0] ?? 2014;
  const lastYear = years[years.length - 1] ?? 2023;
  const yearRange = Math.max(1, lastYear - firstYear);
  const xForYear = (year: number) => padding + ((year - firstYear) / yearRange) * (width - padding * 2);
  const yForValue = (value: number) =>
    height - bottomPadding - ((value - minValue) / valueRange) * (height - padding - bottomPadding);

  return (
    <div className={styles.root}>
      <Text weight="semibold">{getChartTitle(indexedSeries.length, indexedSeries[0]?.offenceLabel)}</Text>
      <Caption1>Indexed police-recorded rape offences per 100k; first available year = 100.</Caption1>
      <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Indexed crime-rate trends">
        <line
          x1={padding}
          y1={height - bottomPadding}
          x2={width - padding}
          y2={height - bottomPadding}
          stroke="#d1d5db"
        />
        <line x1={padding} y1={padding} x2={padding} y2={height - bottomPadding} stroke="#d1d5db" />
        <line
          x1={padding}
          y1={yForValue(100)}
          x2={width - padding}
          y2={yForValue(100)}
          stroke="#9ca3af"
          strokeDasharray="4 4"
        />
        {indexedSeries.map((series) => {
          const path = series.points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${xForYear(point.year)} ${yForValue(point.indexValue)}`)
            .join(" ");

          return (
            <g key={series.offenceCode}>
              <path d={path} fill="none" stroke={series.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {series.points.map((point) => (
                <circle key={`${series.offenceCode}-${point.year}`} cx={xForYear(point.year)} cy={yForValue(point.indexValue)} r="2.3" fill={series.color}>
                  <title>
                    {point.year} {getShortOffenceLabel(series.offenceLabel)}: {formatIndexValue(point.indexValue)} index,{" "}
                    {formatIndexValue(point.ratePer100k)} per 100k
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={padding} y={padding - 6} fontSize="10" fill="#6b7280">
          {formatIndexValue(maxValue)}
        </text>
        <text x={padding + 4} y={yForValue(100) - 4} fontSize="10" fill="#6b7280">
          100
        </text>
        <text x={padding} y={height - bottomPadding - 4} fontSize="10" fill="#6b7280">
          {formatIndexValue(minValue)}
        </text>
        {years.map((year) => (
          <text
            key={year}
            x={xForYear(year)}
            y={height - 12}
            fontSize="9"
            fill="#6b7280"
            textAnchor="end"
            transform={`rotate(-35 ${xForYear(year)} ${height - 12})`}
          >
            {year}
          </text>
        ))}
      </svg>
      <div className={styles.legend}>
        {indexedSeries.map((series) => (
          <Caption1 key={series.offenceCode} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ backgroundColor: series.color }} />
            {getShortOffenceLabel(series.offenceLabel)}
          </Caption1>
        ))}
      </div>
      <Caption1>{analysis.caveat}</Caption1>
    </div>
  );
}
