import { useEffect, useState } from 'react';
import { SCROLL_THRESHOLD } from '../constants';
export const useScrolled = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
};
