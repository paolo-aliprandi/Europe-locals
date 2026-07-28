import { mkdir, readFile, writeFile } from "node:fs/promises";

const startYear = 2014;
const endYear = 2023;
const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
const eurostatBase = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const outputDirectory = new URL("../public/data/analysis/", import.meta.url);
const outputJsonPath = new URL("crime-migration-correlations.json", outputDirectory);
const outputCsvPath = new URL("crime-migration-correlations.csv", outputDirectory);
const countryDataPath = new URL("../public/data/demographics/country-2023.json", import.meta.url);

const selectedOffences = [
  ["ICCS03011", "Rape"],
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "european-locals-map-crime-migration-analysis/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

function decodeJsonStat(json) {
  if (!Array.isArray(json.id) || !Array.isArray(json.size)) {
    throw new Error("Eurostat response is not a JSON-stat dataset.");
  }

  const dimensions = json.id;
  const sizes = json.size;
  const rows = [];

  for (const [flatIndex, value] of Object.entries(json.value ?? {})) {
    let remainder = Number(flatIndex);
    const coordinates = {};

    for (let index = sizes.length - 1; index >= 0; index -= 1) {
      const dimensionId = dimensions[index];
      coordinates[dimensionId] = remainder % sizes[index];
      remainder = Math.floor(remainder / sizes[index]);
    }

    const row = { value };

    for (const dimensionId of dimensions) {
      const dimension = json.dimension[dimensionId];
      const categoryIndex = dimension?.category?.index ?? {};
      const categoryLabels = dimension?.category?.label ?? {};
      const code = Object.entries(categoryIndex).find(([, index]) => index === coordinates[dimensionId])?.[0];

      row[dimensionId] = code;
      row[`${dimensionId}_label`] = code ? categoryLabels[code] : undefined;
    }

    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pearsonCorrelation(points) {
  if (points.length < 5) {
    return null;
  }

  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (const point of points) {
    const xDelta = point.x - xMean;
    const yDelta = point.y - yMean;
    numerator += xDelta * yDelta;
    xVariance += xDelta ** 2;
    yVariance += yDelta ** 2;
  }

  if (xVariance === 0 || yVariance === 0) {
    return null;
  }

  return Math.round((numerator / Math.sqrt(xVariance * yVariance)) * 1000) / 1000;
}

function correlationStrength(correlation) {
  if (correlation === null) {
    return "insufficient data";
  }

  const absolute = Math.abs(correlation);

  if (absolute >= 0.7) {
    return "strong";
  }

  if (absolute >= 0.4) {
    return "moderate";
  }

  if (absolute >= 0.2) {
    return "weak";
  }

  return "very weak";
}

function getCrimeRate(crimeRows, geoId, offenceCode, year) {
  return toNumber(
    crimeRows.find(
      (row) => row.geo === geoId && row.iccs === offenceCode && row.unit === "P_HTHAB" && row.time === String(year),
    )?.value,
  );
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const countryDataset = JSON.parse(await readFile(countryDataPath, "utf8"));
const countryRecords = countryDataset.records;
const offenceParams = selectedOffences.map(([code]) => `iccs=${code}`).join("&");
const yearParams = years.map((year) => `time=${year}`).join("&");
const crimeUrl = `${eurostatBase}/crim_off_cat?format=JSON&lang=en&unit=P_HTHAB&${offenceParams}&${yearParams}`;
const crimeRows = decodeJsonStat(await fetchJson(crimeUrl));

const timeSeriesCorrelations = countryRecords.flatMap((country) =>
  selectedOffences.map(([offenceCode, offenceLabel]) => {
    const points = years
      .map((year) => {
        const migrationPoint = country.migrationTrend.find((point) => point.year === year);
        const migrationShare = migrationPoint?.foreignBornShare ?? null;
        const crimeRate = getCrimeRate(crimeRows, country.geoId, offenceCode, year);

        return migrationShare === null || crimeRate === null
          ? null
          : {
              year,
              x: migrationShare,
              y: crimeRate,
            };
      })
      .filter(Boolean);
    const correlation = pearsonCorrelation(points);

    return {
      geoId: country.geoId,
      geoName: country.geoName,
      offenceCode,
      offenceLabel,
      migrationMetric: "foreignBornShare",
      crimeMetric: "policeRecordedOffencesPer100k",
      years: points.map((point) => point.year),
      observations: points.length,
      correlation,
      strength: correlationStrength(correlation),
    };
  }),
);

const crossCountrySnapshot = selectedOffences.map(([offenceCode, offenceLabel]) => {
  const points = countryRecords
    .map((country) => {
      const migrationShare = country.foreignBornShare;
      const crimeRate = getCrimeRate(crimeRows, country.geoId, offenceCode, endYear);

      return migrationShare === null || crimeRate === null
        ? null
        : {
            geoId: country.geoId,
            geoName: country.geoName,
            x: migrationShare,
            y: crimeRate,
          };
    })
    .filter(Boolean);
  const correlation = pearsonCorrelation(points);

  return {
    year: endYear,
    offenceCode,
    offenceLabel,
    migrationMetric: "foreignBornShare",
    crimeMetric: "policeRecordedOffencesPer100k",
    observations: points.length,
    correlation,
    strength: correlationStrength(correlation),
  };
});

const countryCrimeTrends = countryRecords.map((country) => ({
  geoId: country.geoId,
  geoName: country.geoName,
  offences: selectedOffences.map(([offenceCode, offenceLabel]) => ({
    offenceCode,
    offenceLabel,
    points: years
      .map((year) => ({
        year,
        ratePer100k: getCrimeRate(crimeRows, country.geoId, offenceCode, year),
      }))
      .filter((point) => point.ratePer100k !== null),
  })),
}));

const analysis = {
  generatedAt: new Date().toISOString(),
  caveat:
    "This is an exploratory correlation analysis using aggregate country-level data. It does not establish causation, and cross-country police-recorded crime data are affected by reporting, legal, and recording differences.",
  sources: [
    {
      name: "Eurostat police-recorded offences by offence category",
      datasetCode: "crim_off_cat",
      unit: "P_HTHAB",
      url: "https://ec.europa.eu/eurostat/databrowser/view/crim_off_cat/default/table?lang=en",
    },
    {
      name: "Project demographic country dataset",
      datasetCode: "migr_pop3ctb-derived",
      url: "public/data/demographics/country-2023.json",
    },
  ],
  timeSeriesCorrelations,
  crossCountrySnapshot,
  countryCrimeTrends,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputJsonPath, `${JSON.stringify(analysis, null, 2)}\n`);

const csvRows = [
  [
    "scope",
    "geoId",
    "geoName",
    "year",
    "offenceCode",
    "offenceLabel",
    "observations",
    "correlation",
    "strength",
  ],
  ...timeSeriesCorrelations.map((row) => [
    "country_time_series",
    row.geoId,
    row.geoName,
    "",
    row.offenceCode,
    row.offenceLabel,
    row.observations,
    row.correlation,
    row.strength,
  ]),
  ...crossCountrySnapshot.map((row) => [
    "cross_country_snapshot",
    "",
    "",
    row.year,
    row.offenceCode,
    row.offenceLabel,
    row.observations,
    row.correlation,
    row.strength,
  ]),
];

await writeFile(outputCsvPath, `${csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`);

console.log(`Wrote ${outputJsonPath.pathname}`);
console.log(`Wrote ${outputCsvPath.pathname}`);
console.log("2023 cross-country correlations:");
for (const row of crossCountrySnapshot) {
  console.log(`${row.offenceLabel}: r=${row.correlation ?? "n/a"} (${row.observations} countries, ${row.strength})`);
}
