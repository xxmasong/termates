import { Spinner } from '@/components';
interface SubmitButtonProps { children: React.ReactNode; pending?: boolean; }
export const SubmitButton: React.FC<SubmitButtonProps> = ({ children, pending = false }) => <button className="auth-submit" disabled={pending} type="submit">{pending ? <Spinner size={16} /> : children}</button>;
