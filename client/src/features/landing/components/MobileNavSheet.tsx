import { useEffect, useRef } from 'react';
import { NAV_LINKS } from '../constants';
interface MobileNavSheetProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}
export const MobileNavSheet: React.FC<MobileNavSheetProps> = ({ open, onClose, triggerRef }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const trigger = triggerRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [onClose, open, triggerRef]);
  if (!open) return null;
  return (
    <div className="landing-mobile-sheet">
      <button className="landing-sheet-close" onClick={onClose} ref={closeRef} type="button">
        Close
      </button>
      <nav aria-label="Mobile navigation">
        {NAV_LINKS.map((link) => (
          <a href={link.href} key={link.href} onClick={onClose}>
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  );
};
