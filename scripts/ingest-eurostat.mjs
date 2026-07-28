import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const year = Number(process.argv[2] ?? "2023");
const trendStartYear = year - 9;
const trendYears = Array.from({ length: year - trendStartYear + 1 }, (_, index) => trendStartYear + index);
const outputPath = new URL(`../public/data/demographics/country-${year}.json`, import.meta.url);
const nuts2OutputPath = new URL(`../public/data/demographics/nuts2-${year}.json`, import.meta.url);
const combinedNutsOutputPath = new URL("../public/data/geography/nuts-with-uk.geojson", import.meta.url);

const eurostatBase = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const birthDataset = "migr_pop3ctb";
const citizenshipDataset = "migr_pop1ctz";
const irregularPresenceDataset = "migr_eipre";
const regionalPopulationDataset = "demo_r_pjanaggr3";
const regionalBirthDataset = "LFST_R_LFSD2PWC";
const regionalCitizenshipDataset = "LFST_R_LFSD2PWN";
const regionalOriginDataset = "CENS_21COB_R3";
const inseeFranceOriginsUrl =
  "https://www.insee.fr/fr/statistiques/tableaux/8582067/METRO/1/rp2022_td_img1B.csv";
const nomisTs012ZipUrl = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts012.zip";
const nomisTs005ZipUrl = "https://www.nomisweb.co.uk/output/census/2021/census2021-ts005.zip";
const countriesUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson";
const nutsUrl = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326.geojson";
const ukNutsUrl = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2021_4326.geojson";

const aggregateCodes = new Set([
  "TOTAL",
  "NAT",
  "FOR",
  "UNK",
  "EUR",
  "EU27_2020_FOR",
  "EU28",
  "EU28_FOR",
  "EU27_2007",
  "EU25",
  "EU15",
  "EFTA_FOR",
  "CC9_23_FOR",
  "CC8_22_FOR",
  "NEU27_2020_FOR",
  "OTH",
  "OTH_FOR",
  "EXT_EU27_2020",
  "EU_OTH",
  "NEU",
  "EUR_NEU",
  "EUR_OTH",
  "AFR",
  "AFR_OTH",
  "AME_N",
  "AME_N_OTH",
  "AME_X_N",
  "AME_X_N_OTH",
  "ASI",
  "ASI_OTH",
  "OCE",
  "OCE_OTH",
]);

const ukBirthColumnToIso = new Map([
  ["Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: Ireland; measures: Value", "IE"],
  ["Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: France; measures: Value", "FR"],
  ["Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: Germany; measures: Value", "DE"],
  ["Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: Italy; measures: Value", "IT"],
  [
    "Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: Portugal (including Madeira and the Azores); measures: Value",
    "PT",
  ],
  [
    "Country of birth: Europe: Other Europe: EU countries: Member countries in March 2001: Spain (including Canary Islands); measures: Value",
    "ES",
  ],
  [
    "Country of birth: Europe: Other Europe: EU countries: Countries that joined the EU between April 2001 and March 2011: Lithuania; measures: Value",
    "LT",
  ],
  [
    "Country of birth: Europe: Other Europe: EU countries: Countries that joined the EU between April 2001 and March 2011: Poland; measures: Value",
    "PL",
  ],
  [
    "Country of birth: Europe: Other Europe: EU countries: Countries that joined the EU between April 2001 and March 2011: Romania; measures: Value",
    "RO",
  ],
  [
    "Country of birth: Europe: Other Europe: EU countries: Countries that joined the EU between April 2011 and March 2021: Croatia; measures: Value",
    "HR",
  ],
  ["Country of birth: Europe: Other Europe: Rest of Europe: Turkey; measures: Value", "TR"],
  ["Country of birth: Africa: Central and Western Africa: Ghana; measures: Value", "GH"],
  ["Country of birth: Africa: Central and Western Africa: Nigeria; measures: Value", "NG"],
  ["Country of birth: Africa: South and Eastern Africa: Kenya; measures: Value", "KE"],
  ["Country of birth: Africa: South and Eastern Africa: Somalia; measures: Value", "SO"],
  ["Country of birth: Africa: South and Eastern Africa: South Africa; measures: Value", "ZA"],
  ["Country of birth: Africa: South and Eastern Africa: Zimbabwe; measures: Value", "ZW"],
  ["Country of birth: Middle East and Asia: Middle East: Iran; measures: Value", "IR"],
  ["Country of birth: Middle East and Asia: Middle East: Iraq; measures: Value", "IQ"],
  ["Country of birth: Middle East and Asia: Eastern Asia: China; measures: Value", "CN"],
  ["Country of birth: Middle East and Asia: Eastern Asia: Hong Kong (Special Administrative Region of China); measures: Value", "HK"],
  ["Country of birth: Middle East and Asia: Southern Asia: Afghanistan; measures: Value", "AF"],
  ["Country of birth: Middle East and Asia: Southern Asia: India; measures: Value", "IN"],
  ["Country of birth: Middle East and Asia: Southern Asia: Pakistan; measures: Value", "PK"],
  ["Country of birth: Middle East and Asia: Southern Asia: Bangladesh; measures: Value", "BD"],
  ["Country of birth: Middle East and Asia: Southern Asia: Sri Lanka; measures: Value", "LK"],
  ["Country of birth: Middle East and Asia: South-East Asia: Philippines; measures: Value", "PH"],
  ["Country of birth: Middle East and Asia: South-East Asia: Malaysia; measures: Value", "MY"],
  ["Country of birth: Middle East and Asia: South-East Asia: Singapore; measures: Value", "SG"],
  ["Country of birth: The Americas and the Caribbean: North America: United States; measures: Value", "US"],
  ["Country of birth: The Americas and the Caribbean: North America: Canada; measures: Value", "CA"],
  ["Country of birth: The Americas and the Caribbean: The Caribbean: Jamaica; measures: Value", "JM"],
  ["Country of birth: Antarctica and Oceania: Australasia: Australia; measures: Value", "AU"],
  ["Country of birth: Antarctica and Oceania: Australasia: New Zealand; measures: Value", "NZ"],
]);

const inseeCountryNameToIso = new Map([
  ["Portugal", "PT"],
  ["Italie", "IT"],
  ["Espagne", "ES"],
  ["Allemagne", "DE"],
  ["Belgique", "BE"],
  ["Pologne", "PL"],
  ["Roumanie", "RO"],
  ["Pays-Bas", "NL"],
  ["Royaume-Uni", "UK"],
  ["Serbie", "RS"],
  ["Suisse", "CH"],
  ["Russie", "RU"],
  ["Algérie", "DZ"],
  ["Maroc", "MA"],
  ["Tunisie", "TN"],
  ["Sénégal", "SN"],
  ["Côte d'Ivoire", "CI"],
  ["Cameroun", "CM"],
  ["Mali", "ML"],
  ["Congo", "CG"],
  ["Congo (Rép.  Dém., ex-Zaïre)", "CD"],
  ["Madagascar", "MG"],
  ["Maurice (île)", "MU"],
  ["Comores", "KM"],
  ["Guinée (Rép. de)", "GN"],
  ["Angola", "AO"],
  ["Mauritanie", "MR"],
  ["Turquie", "TR"],
  ["Chine (Rép.  Pop)", "CN"],
  ["Viêt-Nam", "VN"],
  ["Cambodge", "KH"],
  ["Liban", "LB"],
  ["Sri Lanka", "LK"],
  ["Inde", "IN"],
  ["Pakistan", "PK"],
  ["Japon", "JP"],
  ["Haïti", "HT"],
  ["Brésil", "BR"],
  ["États-Unis d'Amérique", "US"],
  ["Colombie", "CO"],
  ["Canada", "CA"],
]);

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "european-locals-map-eurostat-ingest/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "european-locals-map-insee-ingest/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchZipEntryText(zipUrl, entryName) {
  const tempDirectory = await mkdtemp(join(tmpdir(), "european-locals-map-"));
  const zipPath = join(tempDirectory, "source.zip");

  try {
    const response = await fetch(zipUrl, {
      headers: {
        "user-agent": "european-locals-map-nomis-ingest/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`${zipUrl} returned HTTP ${response.status}`);
    }

    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    const { stdout } = await execFileAsync("unzip", ["-p", zipPath, entryName], {
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
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

function percentage(part, total) {
  if (!part || !total) {
    return null;
  }

  return Math.round((part / total) * 10_000) / 100;
}

function getValue(rows, codeDimension, geoId, code) {
  const row = rows.find((item) => item.geo === geoId && item[codeDimension] === code);
  return toNumber(row?.value);
}

function getRegionalLfsValue(rows, codeDimension, geoId, code) {
  const valueInThousands = getValue(rows, codeDimension, geoId, code);
  return valueInThousands === null ? null : Math.round(valueInThousands * 1000);
}

function buildOrigins(citizenshipRows, geoId, totalPopulation, countryNames) {
  return citizenshipRows
    .filter((row) => row.geo === geoId)
    .filter((row) => row.citizen && countryNames.has(row.citizen) && !aggregateCodes.has(row.citizen))
    .filter((row) => row.citizen !== geoId)
    .map((row) => ({
      originId: row.citizen,
      originName: row.citizen_label ?? row.citizen,
      population: toNumber(row.value),
      share: percentage(toNumber(row.value), totalPopulation),
    }))
    .filter((origin) => origin.population !== null && origin.population > 0)
    .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
    .slice(0, 25);
}

function buildRegionalOrigins(originRows, geoId, parentGeoId) {
  const totalPopulation = getValue(originRows, "c_birth", geoId, "TOTAL");

  return originRows
    .filter((row) => row.geo === geoId)
    .filter((row) => row.c_birth && !aggregateCodes.has(row.c_birth))
    .filter((row) => row.c_birth !== parentGeoId)
    .map((row) => ({
      originId: row.c_birth,
      originName: row.c_birth_label ?? row.c_birth,
      population: toNumber(row.value),
      share: percentage(toNumber(row.value), totalPopulation),
    }))
    .filter((origin) => origin.population !== null && origin.population > 0)
    .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
    .slice(0, 25);
}

function buildMigrationTrend(birthTrendRows, geoId) {
  return trendYears
    .map((trendYear) => {
      const yearCode = String(trendYear);
      const totalPopulation = toNumber(
        birthTrendRows.find((row) => row.geo === geoId && row.time === yearCode && row.c_birth === "TOTAL")?.value,
      );
      const localBornPopulation = toNumber(
        birthTrendRows.find((row) => row.geo === geoId && row.time === yearCode && row.c_birth === "NAT")?.value,
      );
      const foreignBornPopulation = toNumber(
        birthTrendRows.find((row) => row.geo === geoId && row.time === yearCode && row.c_birth === "FOR")?.value,
      );

      return {
        year: trendYear,
        totalPopulation,
        localBornPopulation,
        foreignBornPopulation,
        localBornShare: percentage(localBornPopulation, totalPopulation),
        foreignBornShare: percentage(foreignBornPopulation, totalPopulation),
      };
    })
    .filter((point) => point.totalPopulation !== null);
}

function buildRegionalMigrationTrend(regionalBirthTrendRows, geoId) {
  return trendYears
    .map((trendYear) => {
      const yearCode = String(trendYear);
      const totalPopulation = getRegionalLfsValue(
        regionalBirthTrendRows.filter((row) => row.time === yearCode),
        "c_birth",
        geoId,
        "TOTAL",
      );
      const localBornPopulation = getRegionalLfsValue(
        regionalBirthTrendRows.filter((row) => row.time === yearCode),
        "c_birth",
        geoId,
        "NAT",
      );
      const foreignBornPopulation = getRegionalLfsValue(
        regionalBirthTrendRows.filter((row) => row.time === yearCode),
        "c_birth",
        geoId,
        "FOR",
      );

      return {
        year: trendYear,
        totalPopulation,
        localBornPopulation,
        foreignBornPopulation,
        localBornShare: percentage(localBornPopulation, totalPopulation),
        foreignBornShare: percentage(foreignBornPopulation, totalPopulation),
      };
    })
    .filter((point) => point.totalPopulation !== null);
}

function parseInseeCsvLine(line) {
  return [...line.matchAll(/"([^"]*)";?/g)].map((match) => match[1]);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === "," && !isQuoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function parseFranceInseeOrigins(csv, franceTotalPopulation) {
  const sectionTitle = "IMG1B - Pays de naissance détaillé - Sexe : Ensemble";
  const sectionStart = csv.indexOf(sectionTitle);

  if (sectionStart === -1) {
    throw new Error("Could not find INSEE detailed country-of-birth section.");
  }

  const section = csv.slice(sectionStart);
  const lines = section.split(/\r?\n/);
  const origins = [];
  let hasReadHeader = false;

  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      if (hasReadHeader) {
        break;
      }
      continue;
    }

    const cells = parseInseeCsvLine(line);
    if (cells.length === 0) {
      continue;
    }

    if (cells[0] === "Pays de naissance") {
      hasReadHeader = true;
      continue;
    }

    if (!hasReadHeader || cells[0] === "Ensemble") {
      continue;
    }

    const isoCode = inseeCountryNameToIso.get(cells[0]);
    const population = Number(cells[5]);

    if (!isoCode || !Number.isFinite(population)) {
      continue;
    }

    origins.push({
      originId: isoCode,
      originName: cells[0],
      population,
      share: percentage(population, franceTotalPopulation),
    });
  }

  return origins.sort((left, right) => (right.population ?? 0) - (left.population ?? 0)).slice(0, 25);
}

function parseCountryCsv(csv) {
  const [headerLine, firstDataLine] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const values = parseCsvLine(firstDataLine);
  return Object.fromEntries(headers.map((header, index) => [header, Number(values[index]) || values[index]]));
}

function buildUnitedKingdomRecord(ts012Csv, ts005Csv) {
  const birthRow = parseCountryCsv(ts012Csv);
  const passportRow = parseCountryCsv(ts005Csv);
  const totalPopulation = birthRow["Country of birth: Total: All usual residents; measures: Value"];
  const localBornPopulation = birthRow["Country of birth: Europe: United Kingdom; measures: Value"];
  const foreignBornPopulation = totalPopulation - localBornPopulation;
  const ukPassportPopulation = passportRow["Passports held: Europe: United Kingdom; measures: Value"];
  const noPassportPopulation = passportRow["Passports held: No passport held; measures: Value"];
  const nonCitizenPopulation = Math.max(0, totalPopulation - ukPassportPopulation - noPassportPopulation);

  const origins = [...ukBirthColumnToIso.entries()]
    .map(([column, originId]) => {
      const population = birthRow[column];
      const originName = column
        .replace("Country of birth: ", "")
        .replace("; measures: Value", "")
        .split(": ")
        .at(-1)
        ?.replace(" (including Madeira and the Azores)", "")
        .replace(" (including Canary Islands)", "")
        .replace(" (Special Administrative Region of China)", "");

      return {
        originId,
        originName,
        population,
        share: percentage(population, totalPopulation),
      };
    })
    .filter((origin) => Number.isFinite(origin.population) && origin.population > 0)
    .sort((left, right) => right.population - left.population)
    .slice(0, 25);

  return {
    geoId: "UK",
    geoName: "United Kingdom",
    granularity: "country",
    year: 2021,
    source: {
      name: "ONS / Nomis",
      url: "https://www.nomisweb.co.uk/sources/census_2021_bulk",
      datasetCode: "Census 2021 TS012, TS005",
      retrievedAt: new Date().toISOString(),
      methodologyNote: "UK data uses Nomis Census 2021 TS012 country-of-birth and TS005 passports-held tables.",
    },
    totalPopulation,
    localBornPopulation,
    foreignBornPopulation,
    nonCitizenPopulation,
    irregularPresenceDetections: null,
    localBornShare: percentage(localBornPopulation, totalPopulation),
    foreignBornShare: percentage(foreignBornPopulation, totalPopulation),
    nonCitizenShare: percentage(nonCitizenPopulation, totalPopulation),
    origins,
    migrationTrend: [],
  };
}

const birthUrl = `${eurostatBase}/${birthDataset}?format=JSON&lang=en&time=${year}&age=TOTAL&sex=T&unit=NR&c_birth=TOTAL&c_birth=NAT&c_birth=FOR&c_birth=UNK`;
const trendTimeParams = trendYears.map((trendYear) => `time=${trendYear}`).join("&");
const birthTrendUrl = `${eurostatBase}/${birthDataset}?format=JSON&lang=en&age=TOTAL&sex=T&unit=NR&c_birth=TOTAL&c_birth=NAT&c_birth=FOR&${trendTimeParams}`;
const citizenshipUrl = `${eurostatBase}/${citizenshipDataset}?format=JSON&lang=en&time=${year}&age=TOTAL&sex=T&unit=NR`;
const irregularPresenceUrl = `${eurostatBase}/${irregularPresenceDataset}?format=JSON&lang=en&time=${year}&sex=T&age=TOTAL&unit=PER&reason=TOTAL&apprehen=TOTAL&citizen=TOTAL`;
const regionalPopulationUrl = `${eurostatBase}/${regionalPopulationDataset}?format=JSON&lang=en&time=${year}&age=TOTAL&sex=T&unit=NR`;
const regionalBirthUrl = `${eurostatBase}/${regionalBirthDataset}?format=JSON&lang=en&time=${year}&wstatus=POP&c_birth=TOTAL&c_birth=NAT&c_birth=FOR&sex=T&age=Y_GE15`;
const regionalCitizenshipUrl = `${eurostatBase}/${regionalCitizenshipDataset}?format=JSON&lang=en&time=${year}&wstatus=POP&citizen=TOTAL&citizen=NAT&citizen=FOR&sex=T&age=Y_GE15`;
const regionalBirthTrendUrl = `${eurostatBase}/${regionalBirthDataset}?format=JSON&lang=en&wstatus=POP&c_birth=TOTAL&c_birth=NAT&c_birth=FOR&sex=T&age=Y_GE15&${trendTimeParams}`;
const regionalOriginUrl = `${eurostatBase}/${regionalOriginDataset}?format=JSON&lang=en&sex=T&age=TOTAL&unit=NR`;

const [
  countriesGeojson,
  nutsGeojson,
  ukNutsGeojson,
  birthJson,
  birthTrendJson,
  citizenshipJson,
  irregularPresenceJson,
  regionalPopulationJson,
  regionalBirthJson,
  regionalCitizenshipJson,
  regionalBirthTrendJson,
  regionalOriginJson,
  inseeFranceOriginsCsv,
  ukBirthCsv,
  ukPassportCsv,
] = await Promise.all([
  fetchJson(countriesUrl),
  fetchJson(nutsUrl),
  fetchJson(ukNutsUrl),
  fetchJson(birthUrl),
  fetchJson(birthTrendUrl),
  fetchJson(citizenshipUrl),
  fetchJson(irregularPresenceUrl),
  fetchJson(regionalPopulationUrl),
  fetchJson(regionalBirthUrl),
  fetchJson(regionalCitizenshipUrl),
  fetchJson(regionalBirthTrendUrl),
  fetchJson(regionalOriginUrl),
  fetchText(inseeFranceOriginsUrl),
  fetchZipEntryText(nomisTs012ZipUrl, "census2021-ts012-ctry.csv"),
  fetchZipEntryText(nomisTs005ZipUrl, "census2021-ts005-ctry.csv"),
]);

const countryNames = new Map(
  countriesGeojson.features
    .map((feature) => [feature.properties?.CNTR_ID, feature.properties?.NAME_ENGL ?? feature.properties?.NAME_LATN])
    .filter(([id, name]) => id && name),
);

const birthRows = decodeJsonStat(birthJson);
const birthTrendRows = decodeJsonStat(birthTrendJson);
const citizenshipRows = decodeJsonStat(citizenshipJson);
const irregularPresenceRows = decodeJsonStat(irregularPresenceJson);
const regionalPopulationRows = decodeJsonStat(regionalPopulationJson);
const regionalBirthRows = decodeJsonStat(regionalBirthJson);
const regionalCitizenshipRows = decodeJsonStat(regionalCitizenshipJson);
const regionalBirthTrendRows = decodeJsonStat(regionalBirthTrendJson);
const regionalOriginRows = decodeJsonStat(regionalOriginJson);
const regionalPopulationByGeoId = new Map(
  regionalPopulationRows.map((row) => [row.geo, toNumber(row.value)]).filter(([, population]) => population !== null),
);
const geoIds = [...new Set(birthRows.map((row) => row.geo))]
  .filter((geoId) => countryNames.has(geoId))
  .sort((left, right) => countryNames.get(left).localeCompare(countryNames.get(right)));

const records = geoIds
  .map((geoId) => {
    const totalPopulation = getValue(birthRows, "c_birth", geoId, "TOTAL");
    const localBornPopulation = getValue(birthRows, "c_birth", geoId, "NAT");
    const foreignBornPopulation = getValue(birthRows, "c_birth", geoId, "FOR");
    const unknownBirthPopulation = getValue(birthRows, "c_birth", geoId, "UNK");
    const citizenPopulation = getValue(citizenshipRows, "citizen", geoId, "NAT");
    const citizenshipTotalPopulation = getValue(citizenshipRows, "citizen", geoId, "TOTAL");
    const unknownCitizenPopulation = getValue(citizenshipRows, "citizen", geoId, "UNK") ?? 0;
    const nonCitizenPopulation =
      citizenshipTotalPopulation !== null && citizenPopulation !== null
        ? Math.max(0, citizenshipTotalPopulation - citizenPopulation - unknownCitizenPopulation)
        : null;

    const eurostatOrigins = buildOrigins(citizenshipRows, geoId, citizenshipTotalPopulation ?? totalPopulation, countryNames);
    const franceInseeOrigins =
      geoId === "FR" && totalPopulation !== null ? parseFranceInseeOrigins(inseeFranceOriginsCsv, totalPopulation) : null;

    return {
      geoId,
      geoName: countryNames.get(geoId),
      granularity: "country",
      year,
      source: {
        name: franceInseeOrigins ? "Eurostat + INSEE" : "Eurostat",
        url: franceInseeOrigins
          ? "https://www.insee.fr/fr/statistiques/8582067?sommaire=8582090&geo=METRO-1"
          : "https://ec.europa.eu/eurostat/databrowser/",
        datasetCode: franceInseeOrigins
          ? `${birthDataset}, ${citizenshipDataset}, ${irregularPresenceDataset}; INSEE IMG1B RP2022`
          : `${birthDataset}, ${citizenshipDataset}, ${irregularPresenceDataset}`,
        retrievedAt: new Date().toISOString(),
        methodologyNote: franceInseeOrigins
          ? "Country-level totals use Eurostat 2023. France top origin groups are enriched from INSEE IMG1B RP2022 France métropolitaine country-of-birth data because Eurostat does not expose Algeria/Morocco detail for France in migr_pop3ctb/migr_pop1ctz. Irregular-presence detections use Eurostat migr_eipre and are enforcement counts, not a resident-population estimate."
          : "Country-of-birth metrics use Eurostat migr_pop3ctb (NAT/FOR/TOTAL). Non-citizen and top origin groups use Eurostat migr_pop1ctz citizenship data. Irregular-presence detections use migr_eipre and are enforcement counts, not a resident-population estimate.",
      },
      totalPopulation,
      localBornPopulation,
      foreignBornPopulation,
      nonCitizenPopulation,
      irregularPresenceDetections: getValue(irregularPresenceRows, "citizen", geoId, "TOTAL"),
      localBornShare: percentage(localBornPopulation, totalPopulation),
      foreignBornShare: percentage(foreignBornPopulation, totalPopulation),
      nonCitizenShare: percentage(nonCitizenPopulation, citizenshipTotalPopulation),
      unknownBirthPopulation,
      origins: franceInseeOrigins ?? eurostatOrigins,
      migrationTrend: buildMigrationTrend(birthTrendRows, geoId),
    };
  })
  .filter((record) => record.totalPopulation !== null && record.localBornPopulation !== null);

if (!records.some((record) => record.geoId === "UK")) {
  records.push(buildUnitedKingdomRecord(ukBirthCsv, ukPassportCsv));
  records.sort((left, right) => left.geoName.localeCompare(right.geoName));
}

if (records.length < 30) {
  throw new Error(`Expected at least 20 country records, got ${records.length}.`);
}

const recordsByGeoId = new Map(records.map((record) => [record.geoId, record]));
const ukNutsFeatures = ukNutsGeojson.features.filter((feature) => feature.properties?.CNTR_CODE === "UK");
const combinedNutsGeojson = {
  ...nutsGeojson,
  features: [
    ...nutsGeojson.features.filter((feature) => feature.properties?.CNTR_CODE !== "UK"),
    ...ukNutsFeatures,
  ],
};
const nuts2Records = combinedNutsGeojson.features
  .filter((feature) => feature.properties?.LEVL_CODE === 2)
  .map((feature) => {
    const countryRecord = recordsByGeoId.get(feature.properties.CNTR_CODE);

    if (!countryRecord) {
      return null;
    }

    const regionGeoId = feature.properties.NUTS_ID;
    const regionalTotalPopulation = regionalPopulationByGeoId.get(regionGeoId) ?? null;
    const regionalLfsTotalPopulation = getRegionalLfsValue(regionalBirthRows, "c_birth", regionGeoId, "TOTAL");
    const regionalLocalBornPopulation = getRegionalLfsValue(regionalBirthRows, "c_birth", regionGeoId, "NAT");
    const regionalForeignBornPopulation = getRegionalLfsValue(regionalBirthRows, "c_birth", regionGeoId, "FOR");
    const regionalCitizenshipTotalPopulation = getRegionalLfsValue(
      regionalCitizenshipRows,
      "citizen",
      regionGeoId,
      "TOTAL",
    );
    const regionalNonCitizenPopulation = getRegionalLfsValue(regionalCitizenshipRows, "citizen", regionGeoId, "FOR");
    const isUnitedKingdomRegion = countryRecord.geoId === "UK";
    const regionalOrigins = isUnitedKingdomRegion ? [] : buildRegionalOrigins(regionalOriginRows, regionGeoId, countryRecord.geoId);
    const regionalMigrationTrend = isUnitedKingdomRegion ? [] : buildRegionalMigrationTrend(regionalBirthTrendRows, regionGeoId);

    return {
      ...countryRecord,
      geoId: regionGeoId,
      geoName: feature.properties.NUTS_NAME ?? feature.properties.NAME_LATN ?? feature.properties.NUTS_ID,
      parentGeoId: countryRecord.geoId,
      parentGeoName: countryRecord.geoName,
      granularity: "nuts2",
      totalPopulation: regionalTotalPopulation,
      localBornPopulation: regionalLocalBornPopulation,
      foreignBornPopulation: regionalForeignBornPopulation,
      nonCitizenPopulation: regionalNonCitizenPopulation,
      irregularPresenceDetections: null,
      localBornShare: percentage(regionalLocalBornPopulation, regionalLfsTotalPopulation),
      foreignBornShare: percentage(regionalForeignBornPopulation, regionalLfsTotalPopulation),
      nonCitizenShare: percentage(regionalNonCitizenPopulation, regionalCitizenshipTotalPopulation),
      origins: regionalOrigins,
      migrationTrend: regionalMigrationTrend,
      source: {
        name: isUnitedKingdomRegion ? "ONS / Nomis + Eurostat GISCO" : "Eurostat + Eurostat GISCO",
        url: isUnitedKingdomRegion
          ? "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/"
          : "https://ec.europa.eu/eurostat/databrowser/",
        datasetCode: isUnitedKingdomRegion
          ? "Census 2021 TS012, TS005; GISCO NUTS 2021"
          : `${regionalPopulationDataset}, ${regionalBirthDataset}, ${regionalCitizenshipDataset}, ${regionalOriginDataset}; GISCO NUTS 2024`,
        retrievedAt: new Date().toISOString(),
        methodologyNote: isUnitedKingdomRegion
          ? "UK NUTS 2 regions use historical GISCO NUTS 2021 boundaries because the UK is not included in GISCO NUTS 2024. Comparable regional population-composition values are not currently available in the app, so UK regional counts and shares are shown as unavailable instead of inheriting country-level values."
          : "NUTS 2 view uses official GISCO regional boundaries and Eurostat demo_r_pjanaggr3 total regional population. Local-born, foreign-born, non-citizen shares, and migration trends use Eurostat Labour Force Survey regional tables for people aged 15+ in private households, so these shares are not directly comparable with all-age resident-population totals. Origin groups use Eurostat Census 2021 regional country-of-birth data where available.",
      },
    };
  })
  .filter(Boolean);

await mkdir(new URL("../public/data/demographics/", import.meta.url), { recursive: true });
await mkdir(new URL("../public/data/geography/", import.meta.url), { recursive: true });
await writeFile(combinedNutsOutputPath, `${JSON.stringify(combinedNutsGeojson)}\n`);
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      year,
      records,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  nuts2OutputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      year,
      records: nuts2Records,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${records.length} Eurostat country records to ${outputPath.pathname}`);
console.log(`Wrote ${nuts2Records.length} NUTS 2 region records to ${nuts2OutputPath.pathname}`);
console.log(`Wrote combined NUTS boundaries to ${combinedNutsOutputPath.pathname}`);
