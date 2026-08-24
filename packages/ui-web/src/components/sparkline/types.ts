export interface SparklineProps {
  /** Series values, oldest first. Needs at least 2 points to draw a line. */
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}
