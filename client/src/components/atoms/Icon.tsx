import type { CSSProperties } from 'react';

import { classNames } from '@/lib/utils';

interface IconDefinition {
  viewBox?: string;
  filled?: boolean;
  strokeWidth?: number;
  paths?: readonly string[];
  circles?: readonly { cx: number; cy: number; r: number }[];
  rects?: readonly { x: number; y: number; width: number; height: number; rx?: number }[];
}

const ICON_DEFINITIONS = {
  activity: { paths: ['M1.5 8h3l2-5 3 10 2-5h3'] },
  arrowR: { paths: ['M3 8h10M9 4l4 4-4 4'] },
  bell: { paths: ['M4 5.3a4 4 0 018 0c0 4.7 2 6 2 6H2s2-1.3 2-6', 'M6.9 14a1.3 1.3 0 002.3 0'] },
  bolt: { filled: true, paths: ['M9 1.5L3.5 9h4l-1 5.5L12 7H8l1-5.5z'] },
  book: { paths: ['M3 3.5a1.5 1.5 0 011.5-1.5H13v11H4.5A1.5 1.5 0 003 14.5v-11zM3 14.5a1.5 1.5 0 011.5-1.5H13'] },
  canvas: { paths: ['M2 2.5h5v4H2zM8.5 3.5h5v3h-5zM3 8.5h4v4.5H3zM9 8h5v5h-5z'] },
  check: { paths: ['M3 8.5l3 3L13 4'] },
  chevD: { paths: ['M3 6l5 4 5-4'] },
  chevR: { paths: ['M6 3l4 5-4 5'] },
  dots: { strokeWidth: 2, paths: ['M3.5 8h.01M8 8h.01M12.5 8h.01'] },
  dollar: { paths: ['M8 2v12M11 5H7a2 2 0 000 4h2a2 2 0 010 4H5'] },
  file: { paths: ['M4 1.5h5L13 5.5v9H4v-13zM9 1.5V5.5h4'] },
  folder: { paths: ['M2 3.5h4l1.5 1.5H14v8H2v-9.5z'] },
  gear: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
    ],
  },
  grid: { paths: ['M2.5 2.5h5v5h-5zM8.5 2.5h5v5h-5zM2.5 8.5h5v5h-5zM8.5 8.5h5v5h-5z'] },
  hash: { paths: ['M6 2v12M10 2v12M2 6h12M2 10h12'] },
  info: { paths: ['M8 14A6 6 0 108 2a6 6 0 000 12zM8 7.5v3.5M8 5h.01'] },
  logo: { paths: ['M8 1.4L13.7 4.8L13.7 11.2L8 14.6L2.3 11.2L2.3 4.8Z', 'M5.6 6L8 8L5.6 10', 'M8.6 10.2H11'] },
  menu: { viewBox: '0 0 18 18', paths: ['M3 5h12M3 9h12M3 13h12'] },
  message: { paths: ['M2.5 3.5h11v8h-4l-2.5 2.5V11.5h-4.5z'] },
  mic: { paths: ['M3.6 7.6a4.4 4.4 0 008.8 0', 'M8 12v2.4M5.6 14.4h4.8'], rects: [{ x: 5.8, y: 1.6, width: 4.4, height: 8, rx: 2.2 }] },
  moon: { paths: ['M13 9.5A5.5 5.5 0 116.5 3 4 4 0 0013 9.5z'] },
  panelLeft: { paths: ['M2.5 2.5h11v11h-11zM6 2.5v11'] },
  panelLeftOpen: { paths: ['M2.5 2.5h11v11h-11zM6 2.5v11M8.5 6l2 2-2 2'] },
  pin: { paths: ['M8 1.5v5M5 3.5h6M6.5 6.5L4 12h8L9.5 6.5M8 12v2.5'] },
  play: { filled: true, paths: ['M5 3.5l7 4.5-7 4.5V3.5z'] },
  plus: { paths: ['M8 3v10M3 8h10'] },
  restart: { paths: ['M13 8a5 5 0 11-1.5-3.5M13 3v3h-3'] },
  search: { paths: ['M7 12.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM11.2 11.2l3 3'] },
  send: { paths: ['M14 2L7 9M14 2L9.5 14L7 9L2 6.5L14 2z'] },
  settings: {
    paths: [
      'M13 8c0-.3-.03-.57-.07-.84l1.42-1.1-1.5-2.6-1.7.68a4.7 4.7 0 00-1.46-.84L9.5 1.5h-3l-.19 1.8a4.7 4.7 0 00-1.46.84l-1.7-.68-1.5 2.6 1.42 1.1A4.7 4.7 0 003 8c0 .29.02.57.07.84L1.65 9.94l1.5 2.6 1.7-.68c.43.34.92.62 1.46.84l.19 1.8h3l.19-1.8c.54-.22 1.03-.5 1.46-.84l1.7.68 1.5-2.6-1.42-1.1c.05-.27.07-.55.07-.84z',
    ],
    circles: [{ cx: 8, cy: 8, r: 2.2 }],
  },
  single: { paths: ['M2.5 2.5h11v11h-11z'] },
  sparkles: { paths: ['M8 1v5l3 2-3 2v5l-3-5-5 3 5-3-5-3 5 3 3-5z'] },
  splitH: { viewBox: '0 0 14 14', strokeWidth: 1.2, paths: ['M2.5 2.5h9v9h-9zM7 2.5v9'] },
  splitV: { viewBox: '0 0 14 14', strokeWidth: 1.2, paths: ['M2.5 2.5h9v9h-9zM2.5 7h9'] },
  stop: { filled: true, paths: ['M4 4h8v8H4z'] },
  sun: { paths: ['M8 11a3 3 0 100-6 3 3 0 000 6zM8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1'] },
  terminal: { paths: ['M2.5 3.5h11v9h-11zM4.5 6l2 2-2 2M8 10h3'] },
  threeup: { paths: ['M2 3h3v10H2zM6.5 3h3v10h-3zM11 3h3v10h-3z'] },
  twoup: { paths: ['M2.5 2.5h5v11h-5zM8.5 2.5h5v11h-5z'] },
  user: { paths: ['M8 8.5a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.5 2.5-4 6-4s6 1.5 6 4'] },
  volume: { paths: ['M8.5 3L4.5 6H2v4h2.5l4 3V3Z', 'M11 6.2a3 3 0 010 3.6M13 4.6a6 6 0 010 6.8'] },
  warning: { paths: ['M8 2l6 11H2L8 2zM8 6v3M8 11.5h.01'] },
  x: { paths: ['M4 4l8 8M12 4l-8 8'] },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICON_DEFINITIONS;

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 14,
  strokeWidth,
  className,
  style,
  title,
}) => {
  const definition: IconDefinition = ICON_DEFINITIONS[name];
  const resolvedStrokeWidth = strokeWidth ?? definition.strokeWidth ?? 1.5;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={classNames('icon', className)}
      fill={definition.filled ? 'currentColor' : 'none'}
      height={size}
      role={title ? 'img' : undefined}
      stroke={definition.filled ? 'none' : 'currentColor'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={resolvedStrokeWidth}
      style={style}
      viewBox={definition.viewBox ?? '0 0 16 16'}
      width={size}
    >
      {title ? <title>{title}</title> : null}
      {definition.paths?.map((path) => <path d={path} key={path} />)}
      {definition.circles?.map((circle) => <circle {...circle} key={`${circle.cx}-${circle.cy}-${circle.r}`} />)}
      {definition.rects?.map((rect) => (
        <rect {...rect} key={`${rect.x}-${rect.y}-${rect.width}-${rect.height}`} />
      ))}
    </svg>
  );
};

export const ICON_NAMES = Object.keys(ICON_DEFINITIONS) as IconName[];
