interface RingPatternProps {
  children?: never;
}
/** Backdrop echoing the logo: one large ring over a terminal-style grid. */
export const RingPattern: React.FC<RingPatternProps> = () => (
  <svg aria-hidden="true" className="landing-rings" viewBox="0 0 100 100">
    <circle cx="50" cy="50" fill="none" r="48" vectorEffect="non-scaling-stroke" />
  </svg>
);
