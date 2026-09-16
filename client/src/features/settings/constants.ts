export {};
export const THEMES = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Amber', value: 'amber' },
  { label: 'Mono', value: 'mono' },
] as const;

export type ThemeName = (typeof THEMES)[number]['value'];
