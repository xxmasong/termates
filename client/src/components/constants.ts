export const BUTTON_ICON_SIZE = {
  sm: 12,
  md: 14,
  lg: 16,
} as const;

export const MODAL_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const SIDEBAR_WIDTH = {
  DEFAULT: 232,
  MIN: 180,
  MAX: 420,
} as const;

export const SPLIT_PANE = {
  DEFAULT_RATIO: 50,
  MIN_RATIO: 12,
  MAX_RATIO: 88,
} as const;

export const GRID_LAYOUT = {
  CANVAS_GAP: 16,
  CANVAS_TOOLBAR_HEIGHT: 36,
  CANVAS_DEFAULT_WIDTH: 500,
  CANVAS_DEFAULT_HEIGHT: 340,
  CANVAS_MIN_WIDTH: 280,
  CANVAS_MIN_HEIGHT: 200,
  ROW_MIN_PERCENT: 8,
  SPLIT_MIN_RATIO: 0.1,
  SPLIT_MAX_RATIO: 0.9,
} as const;

/** Matches the `max-width: 760px` breakpoint in components.css. */
export const MOBILE_BREAKPOINT = 760;
