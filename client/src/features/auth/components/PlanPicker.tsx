import { PLANS, type PlanId } from '@/constants';

interface PlanPickerProps { plan: PlanId; onChange: (plan: PlanId) => void; }

export const PlanPicker: React.FC<PlanPickerProps> = ({ plan, onChange }) => <fieldset className="auth-plans"><legend>Choose your plan</legend><div>{PLANS.map((entry) => <label className={plan === entry.id ? 'auth-plan auth-plan--selected' : 'auth-plan'} key={entry.id}><input checked={plan === entry.id} name="plan" onChange={() => onChange(entry.id)} type="radio" value={entry.id} /><strong>{entry.name}</strong><span>{entry.limitsLine.replace('Up to ', '').replace('up to ', '')}</span></label>)}</div>{plan !== 'free' ? <small>Paid plans are in early access — we'll email you before any billing starts.</small> : null}</fieldset>;
