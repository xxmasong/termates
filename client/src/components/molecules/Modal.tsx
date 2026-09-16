import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { IconButton } from '@/components/atoms';
import { MODAL_FOCUSABLE_SELECTOR } from '@/components/constants';

export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: number;
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  children,
  onClose,
  footer,
  width = 460,
  closeOnBackdrop = true,
}) => {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const focusFirstElement = useCallback(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }

    const focusable = modal.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR);
    const target = focusable[0] ?? modal;
    target.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalRef.current;
      const focusable = modal
        ? Array.from(modal.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR))
        : [];

      if (focusable.length === 0) {
        event.preventDefault();
        modal?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', onKeyDown);
    window.setTimeout(focusFirstElement, 0);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [focusFirstElement, onKeyDown, open]);

  const onBackdropMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdrop && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose],
  );

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onBackdropMouseDown}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal"
        ref={modalRef}
        role="dialog"
        style={{ '--modal-width': `${width}px` } as React.CSSProperties}
        tabIndex={-1}
      >
        <header className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          <IconButton icon="x" label="Close" onClick={onClose} size="sm" />
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
};
