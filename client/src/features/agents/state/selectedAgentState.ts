import { atom } from 'recoil';

export const selectedAgentIdState = atom<string | null>({
  default: null,
  key: 'agents.selectedAgentId',
});
