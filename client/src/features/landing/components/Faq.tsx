import { COPY, FAQ_ENTRIES } from '../constants';
import { useFaqAccordion } from '../hooks';
import { FaqItem } from './FaqItem';
import { Section } from './Section';

interface FaqProps {
  children?: never;
}

export const Faq: React.FC<FaqProps> = () => {
  const { openIndex, toggle } = useFaqAccordion();
  return (
    <Section id="faq" eyebrow={COPY.faq.eyebrow} title={COPY.faq.title}>
      <div className="landing-faq">
        {FAQ_ENTRIES.map((entry, index) => (
          <FaqItem
            entry={entry}
            index={index}
            key={entry.question}
            onToggle={toggle}
            open={openIndex === index}
          />
        ))}
      </div>
    </Section>
  );
};
