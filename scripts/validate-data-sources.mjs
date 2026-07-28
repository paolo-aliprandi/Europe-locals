const sources = [
  {
    name: "GISCO country boundaries",
    url: "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson",
    expectJson: true,
  },
  {
    name: "GISCO NUTS boundaries",
    url: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326.geojson",
    expectJson: true,
  },
  {
    name: "GISCO UK NUTS 2021 boundaries",
    url: "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2021_4326.geojson",
    expectJson: true,
  },
  {
    name: "Eurostat country-of-birth dataset endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop3ctb?format=JSON&lang=en&time=2023&age=TOTAL&sex=T&unit=NR&geo=DE",
    expectJson: true,
  },
  {
    name: "Eurostat Urban Audit country-of-birth endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/urb_cpopcb?format=JSON&lang=en",
    expectJson: true,
  },
  {
    name: "Eurostat irregular presence enforcement endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_eipre?format=JSON&lang=en&time=2023&sex=T&age=TOTAL&unit=PER&reason=TOTAL&apprehen=TOTAL&citizen=TOTAL&geo=DE",
    expectJson: true,
  },
  {
    name: "Eurostat NUTS regional population endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_pjanaggr3?format=JSON&lang=en&time=2023&age=TOTAL&sex=T&unit=NR&geo=DE21",
    expectJson: true,
  },
  {
    name: "Eurostat NUTS regional country-of-birth LFS endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/LFST_R_LFSD2PWC?format=JSON&lang=en&time=2023&wstatus=POP&c_birth=TOTAL&c_birth=NAT&c_birth=FOR&sex=T&age=Y_GE15&geo=DE21",
    expectJson: true,
  },
  {
    name: "Eurostat NUTS regional citizenship LFS endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/LFST_R_LFSD2PWN?format=JSON&lang=en&time=2023&wstatus=POP&citizen=TOTAL&citizen=NAT&citizen=FOR&sex=T&age=Y_GE15&geo=DE21",
    expectJson: true,
  },
  {
    name: "Eurostat NUTS regional country-of-birth Census endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/CENS_21COB_R3?format=JSON&lang=en&sex=T&age=TOTAL&unit=NR&geo=DE21",
    expectJson: true,
  },
  {
    name: "Eurostat police-recorded offences endpoint",
    url: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/crim_off_cat?format=JSON&lang=en&time=2023&geo=DE&unit=P_HTHAB&iccs=ICCS0101",
    expectJson: true,
  },
  {
    name: "INSEE France immigrant origins CSV",
    url: "https://www.insee.fr/fr/statistiques/tableaux/8582067/METRO/1/rp2022_td_img1B.csv",
    expectJson: false,
  },
  {
    name: "Nomis Census 2021 country of birth ZIP",
    url: "https://www.nomisweb.co.uk/output/census/2021/census2021-ts012.zip",
    expectJson: false,
  },
  {
    name: "Nomis Census 2021 passports held ZIP",
    url: "https://www.nomisweb.co.uk/output/census/2021/census2021-ts005.zip",
    expectJson: false,
  },
  {
    name: "OpenStreetMap tile endpoint",
    url: "https://tile.openstreetmap.org/0/0/0.png",
    expectJson: false,
  },
];

async function validateSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "european-locals-map-source-validator/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`${source.name} returned HTTP ${response.status}`);
  }

  if (source.expectJson) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      throw new Error(`${source.name} did not return JSON. Content-Type: ${contentType || "missing"}`);
    }

    const data = await response.json();
    if (typeof data !== "object" || data === null) {
      throw new Error(`${source.name} returned invalid JSON.`);
    }
  } else {
    await response.arrayBuffer();
  }

  console.log(`OK ${source.name}`);
}

for (const source of sources) {
  await validateSource(source);
}
