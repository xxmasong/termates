import { apiRequest } from '@/lib/api';

export interface CodexModelsResponse {
  models: string[];
}

export const getCodexModels = (): Promise<CodexModelsResponse> =>
  apiRequest<CodexModelsResponse>('/codex/models');
