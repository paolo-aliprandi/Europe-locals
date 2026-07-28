import {
  Badge,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Text,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { ChangeEvent } from "react";
import type { Granularity, MetricKey } from "../types/demographics";
import { metrics } from "../data/demographics";

const useStyles = makeStyles({
  panel: {
    position: "absolute",
    top: "24px",
    left: "24px",
    zIndex: 5,
    width: "340px",
    display: "grid",
    gap: tokens.spacingVerticalM,
    boxShadow: tokens.shadow28,
    backdropFilter: "blur(16px)",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  titleRow: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  euBanner: {
    flexShrink: 0,
    width: "54px",
    height: "36px",
    objectFit: "cover",
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: "0 2px 8px rgb(0 51 153 / 24%)",
  },
  controls: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  badges: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
  },
});

type ControlsPanelProps = {
  granularity: Granularity;
  metricKey: MetricKey;
  year: number;
  query: string;
  includeIrregularPresence: boolean;
  isDarkMode: boolean;
  onGranularityChange: (granularity: Granularity) => void;
  onMetricChange: (metricKey: MetricKey) => void;
  onYearChange: (year: number) => void;
  onQueryChange: (query: string) => void;
  onIncludeIrregularPresenceChange: (enabled: boolean) => void;
  onDarkModeChange: (enabled: boolean) => void;
};

export function ControlsPanel({
  granularity,
  metricKey,
  year,
  query,
  includeIrregularPresence,
  isDarkMode,
  onGranularityChange,
  onMetricChange,
  onYearChange,
  onQueryChange,
  onIncludeIrregularPresenceChange,
  onDarkModeChange,
}: ControlsPanelProps) {
  const styles = useStyles();

  return (
    <Card className={styles.panel} appearance="filled-alternative">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Title3>European Locals Map</Title3>
          <img
            className={styles.euBanner}
            src={`${import.meta.env.BASE_URL}img/Flag_of_Europe.svg.png`}
            alt="Flag of Europe"
          />
        </div>
        <Text size={200}>Explore local-born, foreign-born, and citizenship population shares across Europe.</Text>
        <div className={styles.badges}>
          <Badge appearance="tint" color="brand">
            MVP
          </Badge>
          <Badge appearance="tint">Eurostat-ready model</Badge>
          <Badge appearance="tint">GitHub Pages static</Badge>
        </div>
      </div>

      <div className={styles.controls}>
        <Field label="Granularity">
          <Select
            value={granularity}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onGranularityChange(event.target.value as Granularity)
            }
          >
            <option value="country">Country</option>
            <option value="nuts2">
              Region / NUTS 2
            </option>
            <option value="city" disabled>
              City - data pilot later
            </option>
          </Select>
        </Field>

        <Field label="Metric">
          <Select
            value={metricKey}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onMetricChange(event.target.value as MetricKey)}
          >
            {metrics.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.shortLabel}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Year">
          <Select
            value={String(year)}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onYearChange(Number(event.target.value))}
          >
            <option value="2023">2023 prototype</option>
          </Select>
        </Field>

        <Field label={granularity === "nuts2" ? "Search region" : "Search country"}>
          <Input
            value={query}
            onChange={(_, data) => onQueryChange(data.value)}
            placeholder={granularity === "nuts2" ? "Try Oberbayern, Lombardia..." : "Try Germany, France, Spain..."}
          />
        </Field>

        <Switch
          checked={isDarkMode}
          onChange={(_, data) => onDarkModeChange(data.checked)}
          label="Dark mode"
        />

        <Switch
          checked={includeIrregularPresence}
          onChange={(_, data) => onIncludeIrregularPresenceChange(data.checked)}
          label="Include irregular-presence detections"
        />
        {includeIrregularPresence ? (
          <Text size={100}>
            Adds Eurostat enforcement counts to the main indicators. These are detections, not an undocumented
            resident-population estimate.
          </Text>
        ) : null}
      </div>
    </Card>
  );
}
