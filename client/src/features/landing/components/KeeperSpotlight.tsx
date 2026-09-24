import { COPY, KEEPER_BULLETS } from '../constants';
import { ChatMock } from './ChatMock';
import { Section } from './Section';
interface KeeperSpotlightProps {
  children?: never;
}
export const KeeperSpotlight: React.FC<KeeperSpotlightProps> = () => (
  <Section id="keeper" eyebrow={COPY.keeper.eyebrow} title={COPY.keeper.title}>
    <div className="landing-keeper">
      <div>
        <p>{COPY.keeper.body}</p>
        <ul>
          {KEEPER_BULLETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <ChatMock />
    </div>
  </Section>
);
