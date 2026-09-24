import type { FaqEntry } from '../types';

interface FaqItemProps {
  entry: FaqEntry;
  index: number;
  open: boolean;
  onToggle: (index: number) => void;
}

export const FaqItem: React.FC<FaqItemProps> = ({ entry, index, open, onToggle }) => {
  const panelId = `landing-faq-${index}`;
  return (
    <article className="landing-faq__item">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => onToggle(index)}
        type="button"
      >
        <span>{entry.question}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div id={panelId}>
          <p>{entry.answer}</p>
        </div>
      ) : null}
    </article>
  );
};
