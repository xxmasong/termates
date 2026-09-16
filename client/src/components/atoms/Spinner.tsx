export interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 14, className }) => (
  <span
    aria-label="Loading"
    className={className ? `spinner ${className}` : 'spinner'}
    role="status"
    style={{ '--spinner-size': `${size}px` } as React.CSSProperties}
  />
);
