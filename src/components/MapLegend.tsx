import { Card, Caption1, Text, makeStyles, tokens } from "@fluentui/react-components";
import type { Granularity, MetricDefinition } from "../types/demographics";
import { getMetricDescription } from "../data/demographics";
import { getColorRampForGranularity, getMaxRedPercentForGranularity } from "../map/colorScales";

const useStyles = makeStyles({
  legend: {
    position: "absolute",
    left: "24px",
    bottom: "24px",
    zIndex: 5,
    width: "300px",
    display: "grid",
    gap: tokens.spacingVerticalXS,
    boxShadow: tokens.shadow16,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  ramp: {
    display: "grid",
    height: "12px",
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
  },
  labels: {
    display: "flex",
    justifyContent: "space-between",
  },
  swatch: {
    height: "12px",
  },
});

type MapLegendProps = {
  metric: MetricDefinition;
  granularity: Granularity;
  year: number;
};

export function MapLegend({ metric, granularity, year }: MapLegendProps) {
  const styles = useStyles();
  const ramp = getColorRampForGranularity(granularity);
  const maxRedPercent = getMaxRedPercentForGranularity(granularity);

  return (
    <Card className={styles.legend} appearance="filled-alternative">
      <Text weight="semibold">{metric.shortLabel}</Text>
      <div className={styles.ramp} style={{ gridTemplateColumns: `repeat(${ramp.length}, 1fr)` }} aria-hidden="true">
        {ramp.map((color) => (
          <span key={color} className={styles.swatch} style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className={styles.labels}>
        <Caption1>{metric.lowerIsDarker ? "More local-born" : "0%"}</Caption1>
        <Caption1>{year}</Caption1>
        <Caption1>{metric.lowerIsDarker ? "Less local-born" : `${maxRedPercent}%+`}</Caption1>
      </div>
      <Caption1>{getMetricDescription(metric, granularity)}</Caption1>
    </Card>
  );
}
