# European Locals Map - MVP Plan

## Product goal

Build a user-friendly web map of Europe that visualizes demographic composition by geography. Users should be able to switch between country, region, province, and city granularity where data is available, then click an area to inspect a same-page dashboard with population statistics and provenance breakdowns.

Use neutral, precise language in the product:

- "Local-born population" instead of "pure"
- "Foreign-born population" instead of "foreigners" when the dataset is based on country of birth
- "Non-citizen population" when the dataset is based on citizenship
- Always show the dataset definition, source, year, and limitations

The MVP should feel like a polished civic-data product, not a quick prototype.

## MVP scope

### In scope

1. Full-screen Europe map as the home page.
2. OpenStreetMap-compatible base map.
3. Country-level choropleth layer for the first release.
4. Region/city granularity selector in the UI, with unavailable levels clearly disabled or marked as "coming as data is added".
5. Metric selector:
   - Local-born population %
   - Foreign-born population %
   - Non-citizen population %
   - Top origin group, where available
6. Year selector.
7. Clickable country/region/city shapes.
8. Same-page popover or side panel dashboard with:
   - Geography name
   - Total population
   - Local-born vs foreign-born percentages
   - Top origin countries/groups
   - Small trend chart if historical data is available
   - Source, year, and methodology note
9. Static deployment to GitHub Pages.
10. Data pipeline that can ingest Eurostat first, then national datasets later.

### Out of scope for MVP

1. Full municipality-level coverage across all European countries.
2. Real-time data updates.
3. User accounts.
4. Server-side database.
5. Editable annotations or collaborative features.
6. Perfect source harmonization across every country.

## Recommended stack

### App

- React with TypeScript.
- Vite for a static build that works well with GitHub Pages.
- MapLibre GL JS for modern vector-style map rendering.
- Fluent UI React v9 components for controls, panels, popovers, buttons, tokens, and accessibility.
- Recharts, Visx, or lightweight SVG charts for dashboard visuals.

### Styling

- Fluent UI v9 design tokens as the primary UI system.
- Custom map color scales with ColorBrewer-style palettes.
- Responsive layout for desktop first, tablet second.
- Mobile can be usable but does not need to be perfect in the first MVP.

### Deployment

- GitHub Pages using a static Vite build.
- GitHub Actions workflow:
  - install
  - typecheck
  - lint
  - build
  - deploy `dist/`

### Data storage

For MVP, use static files:

```text
public/
  data/
    geographies/
      countries.geojson
      nuts2.geojson
      cities.geojson
    demographics/
      country-2023.json
      nuts2-2023.json
      city-2023.json
```

Later, if the dataset becomes too large, move preprocessing to a build-time SQLite or DuckDB step and keep the deployed app static.

## Data sources

### Primary source: Eurostat

Use Eurostat first because it offers consistent EU-wide statistical APIs and standardized geography.

Candidate datasets:

- Country-level population by citizenship and country of birth.
- Regional population by NUTS geography.
- Urban Audit datasets for city-level coverage.
- Eurostat GISCO for official NUTS and country boundaries.

Useful Eurostat concepts:

- `geo`: country, NUTS region, or city code depending on dataset.
- `time`: year.
- `sex`: use total for MVP.
- `age`: use total for MVP.
- `citizen`: citizenship dimension.
- `birth`: country-of-birth dimension where available.

### Boundary data

Use official or stable boundaries:

1. Eurostat GISCO for EU/NUTS geometries.
2. Natural Earth for lightweight country-level fallback.
3. OSM-derived boundaries only where licensing, size, and topology requirements are clear.

### National datasets

Use national datasets only after the Eurostat-backed MVP works. National portals are needed for deeper province, municipality, or city-level origin breakdowns.

Examples:

- Germany: Destatis / regional statistical offices.
- Italy: ISTAT.
- France: INSEE.
- Spain: INE.
- Poland: Statistics Poland.
- Netherlands: CBS.
- UK: ONS, if included in the map.

## Data model

Normalize all sources into a single app-facing shape:

```ts
export type Granularity = "country" | "nuts1" | "nuts2" | "nuts3" | "city";

export type DemographicRecord = {
  geoId: string;
  geoName: string;
  granularity: Granularity;
  year: number;
  source: {
    name: string;
    url: string;
    datasetCode?: string;
    retrievedAt: string;
    methodologyNote: string;
  };
  totalPopulation: number | null;
  localBornPopulation: number | null;
  foreignBornPopulation: number | null;
  nonCitizenPopulation: number | null;
  localBornShare: number | null;
  foreignBornShare: number | null;
  nonCitizenShare: number | null;
  origins: Array<{
    originId: string;
    originName: string;
    population: number | null;
    share: number | null;
  }>;
};
```

Rules:

- Do not mix country-of-birth and citizenship data under one metric.
- If only citizenship data exists, label it as citizenship.
- If only country-of-birth data exists, label it as country of birth.
- Keep missing values explicit as `null`.
- Show "Data unavailable" in the UI instead of pretending coverage exists.

## UX design

### Home page layout

The app opens directly on the map.

Recommended layout:

- Top-left floating control panel:
  - App title
  - Granularity selector
  - Metric selector
  - Year selector
  - Search box for country/city
- Bottom-left legend:
  - Color scale
  - Metric label
  - Year
- Main map:
  - Europe viewport
  - Smooth hover states
  - Selected area outline
- Right-side drawer or anchored popover:
  - Appears after selecting a geography
  - Contains dashboard cards and charts

### Dashboard content

For selected geography:

1. Header:
   - Geography name
   - Granularity
   - Year
2. Main metric cards:
   - Total population
   - Local-born %
   - Foreign-born %
   - Non-citizen %, if available
3. Composition chart:
   - Local-born vs foreign-born stacked bar or donut
4. Origin breakdown:
   - Top 5-10 origin countries/groups
5. Source footer:
   - Dataset name
   - Retrieved date
   - Methodology note

### Visual language

- Use a restrained, analytical design.
- Avoid alarmist colors.
- Use a single sequential scale for one metric at a time.
- Ensure colorblind-safe palettes.
- Use clear empty states for unavailable data.
- Use accessible contrast and keyboard-accessible controls.

## Engineering architecture

Recommended folder structure:

```text
src/
  app/
    App.tsx
    routes.ts
  components/
    ControlsPanel.tsx
    MapLegend.tsx
    GeographyDashboard.tsx
    MetricCard.tsx
    OriginBreakdown.tsx
    YearSelector.tsx
  data/
    demographicRepository.ts
    geographyRepository.ts
    metricCalculations.ts
  map/
    EuropeMap.tsx
    mapStyles.ts
    colorScales.ts
    featureState.ts
  types/
    demographics.ts
    geography.ts
  utils/
    formatting.ts
    assertions.ts
scripts/
  ingest-eurostat.ts
  normalize-boundaries.ts
  validate-data.ts
public/
  data/
```

### Key principles

1. Separate raw source ingestion from app rendering.
2. Keep the map component focused on rendering and interactions.
3. Keep data normalization deterministic and testable.
4. Treat missing data as a first-class state.
5. Build country-level completely before expanding granularity.
6. Preserve a static deployment model until there is a proven need for a backend.

## Implementation milestones

### Milestone 1: Static polished prototype

Goal: prove the product experience with mock data.

Deliverables:

- Vite React TypeScript app.
- Fluent UI v9 theme and layout.
- MapLibre Europe map.
- Country GeoJSON layer.
- Mock demographic dataset for 5-10 countries.
- Choropleth coloring.
- Hover and selected states.
- Dashboard drawer/popover.
- Metric/year/granularity controls.
- GitHub Pages build configuration.

### Milestone 2: Eurostat country-level ingestion

Goal: replace mock data with real country-level data.

Deliverables:

- Eurostat fetch script.
- Normalized JSON output.
- Data validation script.
- Source metadata shown in dashboard.
- Clear distinction between country-of-birth and citizenship metrics.

### Milestone 3: Regional granularity

Goal: add NUTS regional views where coverage is available.

Deliverables:

- NUTS boundary ingestion.
- Granularity switch from country to NUTS levels.
- Data availability states.
- Map performance optimization for larger geometries.

### Milestone 4: City-level pilots

Goal: add city data for a small number of high-quality countries/cities.

Deliverables:

- Urban Audit or national dataset integration.
- City search.
- City marker or polygon layer.
- City dashboard coverage notes.

## Data quality and ethics requirements

This product must be careful because demographic composition can be misused or misinterpreted.

Requirements:

1. Avoid terms like "pure" in UI, code, documentation, and dataset labels.
2. Prefer "local-born", "foreign-born", "citizenship", and "country of birth".
3. Always show definitions and source metadata.
4. Never imply that population composition measures social value.
5. Avoid ranking countries with inflammatory labels.
6. Provide caveats when comparing countries with different reporting standards.
7. Make missing data obvious.

## GitHub Pages considerations

Use Vite `base` configuration for repository pages:

```ts
export default defineConfig({
  base: "/european-locals-map/",
});
```

If deployed to a user/organization root page, use:

```ts
export default defineConfig({
  base: "/",
});
```

The app should not require a backend for the MVP. All data should be fetched from static files in `public/data`.

## Suggested first implementation task

Scaffold the app with:

- Vite React TypeScript.
- Fluent UI React v9.
- MapLibre GL.
- A static country GeoJSON layer.
- Mock normalized demographic data.
- A polished dashboard drawer.
- GitHub Pages deployment workflow.

Once that works, replace mock data with an automated Eurostat ingestion script.
