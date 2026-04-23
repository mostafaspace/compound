export interface SettingsNamespaceData {
  namespace: string;
  compoundId: string | null;
  settings: Record<string, unknown>;
}

export interface UpdateSettingsInput {
  settings: Record<string, unknown>;
  compoundId?: string | null;
  reason?: string;
}
