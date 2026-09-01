export interface RailResizerProps {
  /** The rail's current width, px — controlled, the same value `ConsoleShell` sets on the rail
   *  column's own inline style. */
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Accessible label for the separator — what it resizes. */
  label?: string;
  className?: string;
}
