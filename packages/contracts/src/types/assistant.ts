export interface AssistantSettings {
  id: string;
  tenantId: string;
  primaryLanguage: string;
  multilingualEnabled: boolean;
  updatedAt: string;
}

export interface AssistantResponse {
  data: AssistantSettings;
  tenant: { id: string; name: string; slug: string };
}

export interface AssistantSaveResponse {
  success: true;
  data: AssistantSettings;
  tenant: { id: string; name: string; slug: string };
}
