import { Caption1, Text, makeStyles, tokens } from "@fluentui/react-components";
import type { MigrationTrendPoint } from "../types/demographics";
import { formatPercent } from "../utils/formatting";

const useStyles = makeStyles({
  root: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  chart: {
    width: "100%",
    height: "132px",
    overflow: "visible",
  },
  labels: {
    display: "flex",
    justifyContent: "space-between",
  },
});

type MigrationTrendChartProps = {
  points: MigrationTrendPoint[];
};

export function MigrationTrendChart({ points }: MigrationTrendChartProps) {
  const styles = useStyles();
  const validPoints = points.filter((point) => point.foreignBornShare !== null);

  if (validPoints.length < 2) {
    return (
      <div className={styles.root}>
        <Text weight="semibold">Migration trend over time</Text>
        <Caption1>Trend data unavailable for this country.</Caption1>
      </div>
    );
  }

  const width = 320;
  const height = 132;
  const padding = 20;
  const bottomPadding = 34;
  const values = validPoints.map((point) => point.foreignBornShare ?? 0);
  const minValue = Math.max(0, Math.min(...values) - 1);
  const maxValue = Math.max(...values) + 1;
  const valueRange = Math.max(1, maxValue - minValue);
  const firstPoint = validPoints[0]!;
  const lastPoint = validPoints[validPoints.length - 1]!;

  const coordinates = validPoints.map((point, index) => {
    const x = padding + (index / (validPoints.length - 1)) * (width - padding * 2);
    const y =
      height -
      bottomPadding -
      (((point.foreignBornShare ?? 0) - minValue) / valueRange) * (height - padding - bottomPadding);
    return { x, y, point };
  });

  const path = coordinates.map((coordinate, index) => `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`).join(" ");

  return (
    <div className={styles.root}>
      <Text weight="semibold">Migration trend over time</Text>
      <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Foreign-born share trend">
        <line
          x1={padding}
          y1={height - bottomPadding}
          x2={width - padding}
          y2={height - bottomPadding}
          stroke="#d1d5db"
        />
        <line x1={padding} y1={padding} x2={padding} y2={height - bottomPadding} stroke="#d1d5db" />
        <path d={path} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map(({ x, y, point }) => (
          <g key={point.year}>
            <circle cx={x} cy={y} r="3.5" fill="#991b1b">
              <title>
                {point.year}: {formatPercent(point.foreignBornShare)}
              </title>
            </circle>
            <text
              x={x}
              y={height - 12}
              fontSize="9"
              fill="#6b7280"
              textAnchor="end"
              transform={`rotate(-35 ${x} ${height - 12})`}
            >
              {point.year}
            </text>
          </g>
        ))}
        <text x={padding} y={padding - 6} fontSize="10" fill="#6b7280">
          {formatPercent(maxValue)}
        </text>
        <text x={padding} y={height - bottomPadding - 4} fontSize="10" fill="#6b7280">
          {formatPercent(minValue)}
        </text>
      </svg>
      <div className={styles.labels}>
        <Caption1>
          {firstPoint.year}: {formatPercent(firstPoint.foreignBornShare)}
        </Caption1>
        <Caption1>
          {lastPoint.year}: {formatPercent(lastPoint.foreignBornShare)}
        </Caption1>
      </div>
    </div>
  );
}
