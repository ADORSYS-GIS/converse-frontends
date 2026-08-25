export type ApiKeysHygiene = {
  expiringCount: number;
  expiringInDays: number;
  neverUsedCount: number;
  revokedRetainedCount: number;
};

export interface ApiKeysHygieneRailProps {
  hygiene: ApiKeysHygiene;
  className?: string;
}
