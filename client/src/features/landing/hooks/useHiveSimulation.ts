import { useEffect, useState } from 'react';
import { SIM_STEPS, SIM_STEP_MS } from '../constants';
import { useReducedMotion } from './useReducedMotion';
export const useHiveSimulation = () => {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? SIM_STEPS.length - 1 : 0);
  useEffect(() => {
    if (reduced) return undefined;
    const timer = window.setInterval(
      () => setStep((value) => (value + 1) % SIM_STEPS.length),
      SIM_STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduced]);
  return { step, reduced };
};
