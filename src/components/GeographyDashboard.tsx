import {
  Button,
  Card,
  Caption1,
  Divider,
  Link,
  ProgressBar,
  Switch,
  Text,
  Title2,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import type { DemographicRecord, MetricDefinition } from "../types/demographics";
import { getMetricDescription } from "../data/demographics";
import { formatPercent, formatPopulation } from "../utils/formatting";
import { getFlagEmoji } from "../utils/flags";
import { CrimeTrendChart } from "./CrimeTrendChart";
import { MigrationTrendChart } from "./MigrationTrendChart";

const useStyles = makeStyles({
  drawer: {
    position: "absolute",
    top: "24px",
    right: "24px",
    bottom: "24px",
    zIndex: 6,
    width: "380px",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: tokens.spacingVerticalM,
    boxShadow: tokens.shadow28,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: "hidden",
  },
  empty: {
    alignSelf: "start",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  content: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    overflowY: "auto",
    paddingRight: tokens.spacingHorizontalXS,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: tokens.spacingHorizontalS,
  },
  metricCard: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  composition: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  originRow: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    ":hover": {
      [`& .originFlagPopover`]: {
        opacity: 1,
        transform: "translateY(-50%) scale(1)",
        pointerEvents: "auto",
      },
    },
    ":focus-within": {
      [`& .originFlagPopover`]: {
        opacity: 1,
        transform: "translateY(-50%) scale(1)",
        pointerEvents: "auto",
      },
    },
  },
  originName: {
    width: "100%",
    textAlign: "left",
    padding: 0,
    border: 0,
    color: "inherit",
    backgroundColor: "transparent",
    font: "inherit",
    cursor: "default",
  },
  flagPopover: {
    position: "absolute",
    right: "52px",
    top: "50%",
    zIndex: 10,
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalXXS,
    minWidth: "76px",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusXLarge,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    opacity: 0,
    transform: "translateY(-50%) scale(0.96)",
    transformOrigin: "right center",
    pointerEvents: "none",
    transitionDuration: tokens.durationFast,
    transitionProperty: "opacity, transform",
    transitionTimingFunction: tokens.curveEasyEase,
  },
  flagEmoji: {
    fontSize: "32px",
    lineHeight: "32px",
  },
  source: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
});

type GeographyDashboardProps = {
  record: DemographicRecord;
  metric: MetricDefinition;
  includeIrregularPresence: boolean;
  showAbsoluteValues: boolean;
  onShowAbsoluteValuesChange: (enabled: boolean) => void;
  onClose: () => void;
};

export function GeographyDashboard({
  record,
  metric,
  includeIrregularPresence,
  showAbsoluteValues,
  onShowAbsoluteValuesChange,
  onClose,
}: GeographyDashboardProps) {
  const styles = useStyles();
  const crimeTrendCountryId = record.granularity === "nuts2" ? (record.parentGeoId ?? null) : record.geoId;
  const crimeTrendCountryName = record.granularity === "nuts2" ? (record.parentGeoName ?? record.geoName) : record.geoName;

  return (
    <Card className={styles.drawer} appearance="filled-alternative">
      <div className={styles.header}>
        <div>
          <Title2>{record.geoName}</Title2>
          <Caption1>
            {record.granularity === "nuts2" ? `${record.parentGeoName ?? "Region"} · NUTS 2 view` : "Country view"} ·{" "}
            {record.year} · Highlighting {metric.shortLabel}
          </Caption1>
          {record.granularity === "nuts2" ? <Caption1>{getMetricDescription(metric, record.granularity)}</Caption1> : null}
        </div>
        <Button appearance="subtle" icon={<Dismiss24Regular />} aria-label="Close dashboard" onClick={onClose} />
      </div>

      <div className={styles.content}>
        <Switch
          checked={showAbsoluteValues}
          onChange={(_, data) => onShowAbsoluteValuesChange(data.checked)}
          label={showAbsoluteValues ? "Showing absolute numbers" : "Showing percentages"}
        />

        <div className={styles.cards}>
          <div className={styles.metricCard}>
            <Caption1>Total population</Caption1>
            <Text size={600} weight="semibold">
              {formatPopulation(record.totalPopulation)}
            </Text>
          </div>
          <div className={styles.metricCard}>
            <Caption1>{metric.shortLabel}</Caption1>
            <Text size={600} weight="semibold">
              {formatPercent(record[metric.key])}
            </Text>
          </div>
          <div className={styles.metricCard}>
            <Caption1>Local-born</Caption1>
            <Text size={500} weight="semibold">
              {formatPercent(record.localBornShare)}
            </Text>
          </div>
          <div className={styles.metricCard}>
            <Caption1>Foreign-born</Caption1>
            <Text size={500} weight="semibold">
              {formatPercent(record.foreignBornShare)}
            </Text>
          </div>
          <div className={styles.metricCard}>
            <Caption1>Irregular-presence detections</Caption1>
            <Text size={500} weight="semibold">
              {formatPopulation(record.irregularPresenceDetections ?? null)}
            </Text>
          </div>
        </div>

        {includeIrregularPresence ? (
          <Caption1>
            Aggregation is enabled: irregular-presence detections are added to the displayed total, foreign-born, and
            non-citizen indicators. This is an enforcement indicator, not a true population estimate.
          </Caption1>
        ) : null}

        <div className={styles.composition}>
          <Text weight="semibold">Population composition</Text>
          <ProgressBar value={(record.foreignBornShare ?? 0) / 100} thickness="large" />
          <Caption1>
            {showAbsoluteValues
              ? `${formatPopulation(record.localBornPopulation)} local-born · ${formatPopulation(
                  record.foreignBornPopulation,
                )} foreign-born · ${formatPopulation(record.nonCitizenPopulation)} non-citizen`
              : `${formatPercent(record.localBornShare)} local-born · ${formatPercent(
                  record.foreignBornShare,
                )} foreign-born · ${formatPercent(record.nonCitizenShare)} non-citizen`}
          </Caption1>
        </div>

        <Divider />

        <MigrationTrendChart points={record.migrationTrend} />

        <CrimeTrendChart countryId={crimeTrendCountryId} countryName={crimeTrendCountryName} />

        <Divider />

        <div className={styles.composition}>
          <Text weight="semibold">Top origin groups</Text>
          {record.origins.length === 0 ? <Caption1>Origin groups unavailable for this regional view.</Caption1> : null}
          {record.origins.map((origin) => (
            <div key={origin.originId} className={styles.originRow}>
              <div>
                <button className={styles.originName} type="button" aria-label={`Show ${origin.originName} flag`}>
                  <Text>{origin.originName}</Text>
                </button>
                <ProgressBar value={(origin.share ?? 0) / 5} />
              </div>
              <Text weight="semibold">
                {showAbsoluteValues ? formatPopulation(origin.population) : formatPercent(origin.share)}
              </Text>
              <div className={`${styles.flagPopover} originFlagPopover`} role="tooltip">
                <span className={styles.flagEmoji} aria-hidden="true">
                  {getFlagEmoji(origin.originId) ?? "🏳️"}
                </span>
                <Caption1>{origin.originName}</Caption1>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        <div className={styles.source}>
          <Text weight="semibold">Source and methodology</Text>
          <Caption1>{record.source.methodologyNote}</Caption1>
          <Caption1>
            Source:{" "}
            <Link href={record.source.url} target="_blank" rel="noreferrer">
              {record.source.name}
            </Link>{" "}
            · Retrieved {record.source.retrievedAt}
          </Caption1>
        </div>
      </div>
    </Card>
  );
}
