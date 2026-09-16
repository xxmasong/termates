import { atom } from 'recoil';

export const selectedProjectIdState = atom<string | null>({
  default: null,
  key: 'projects.selectedProjectId',
});
