export interface RefillPolicyManualProps {
  /** Controlled open state — per the console-ui skill's "components stay controlled" rule, this
   *  section owns no local state of its own; the caller (a page composing it) decides whether it
   *  starts open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}
