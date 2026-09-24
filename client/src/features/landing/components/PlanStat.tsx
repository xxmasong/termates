interface PlanStatProps {
  label: string;
  value: number | null;
}

export const PlanStat: React.FC<PlanStatProps> = ({ label, value }) => (
  <div className="landing-plan-stat">
    <strong>{value === null ? '∞' : value}</strong>
    <span>{label}</span>
  </div>
);
