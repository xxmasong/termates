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
    <Section id="faq">
      <div className="landing-faq-layout">
        <div className="landing-faq__heading">
          <p className="landing-eyebrow">{COPY.faq.eyebrow}</p>
          <h2>{COPY.faq.title}</h2>
        </div>
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
      </div>
    </Section>
  );
};
