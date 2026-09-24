import { useCallback, useState } from 'react';

export const useFaqAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const toggle = useCallback((index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  }, []);

  return { openIndex, toggle };
};
