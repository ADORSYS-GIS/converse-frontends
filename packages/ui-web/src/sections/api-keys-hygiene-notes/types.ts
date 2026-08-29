export type ApiKeysHygiene = {
  expiringCount: number;
  expiringInDays: number;
  neverUsedCount: number;
  revokedRetainedCount: number;
};

export interface ApiKeysHygieneNotesProps {
  hygiene: ApiKeysHygiene;
  className?: string;
}
