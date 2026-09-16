import { useCallback, type ReactNode } from 'react';

import { SPLIT_PANE } from '@/components/constants';
import { classNames } from '@/lib/utils';

export interface SplitPaneProps {
  first: ReactNode;
  second: ReactNode;
  direction?: 'horizontal' | 'vertical';
  ratio: number;
  onRatioChange: (ratio: number) => void;
  className?: string;
}

const clampRatio = (ratio: number): number =>
  Math.max(SPLIT_PANE.MIN_RATIO, Math.min(SPLIT_PANE.MAX_RATIO, ratio));

export const SplitPane: React.FC<SplitPaneProps> = ({
  first,
  second,
  direction = 'horizontal',
  ratio,
  onRatioChange,
  className,
}) => {
  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const host = event.currentTarget.parentElement;
      const bounds = host?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      const size = direction === 'horizontal' ? bounds.width : bounds.height;
      const startRatio = clampRatio(ratio);
      let delta = 0;

      const move = (moveEvent: MouseEvent): void => {
        delta += direction === 'horizontal' ? moveEvent.movementX : moveEvent.movementY;
        onRatioChange(clampRatio(startRatio + (delta / size) * 100));
      };

      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    },
    [direction, onRatioChange, ratio],
  );

  const firstStyle =
    direction === 'horizontal'
      ? { width: `${clampRatio(ratio)}%` }
      : { height: `${clampRatio(ratio)}%` };
  const secondStyle =
    direction === 'horizontal'
      ? { width: `${100 - clampRatio(ratio)}%` }
      : { height: `${100 - clampRatio(ratio)}%` };

  return (
    <div className={classNames('split-pane', `split-pane--${direction}`, className)}>
      <div className="split-pane__pane" style={firstStyle}>
        {first}
      </div>
      <div className="split-pane__resizer" onMouseDown={startResize} />
      <div className="split-pane__pane" style={secondStyle}>
        {second}
      </div>
    </div>
  );
};
