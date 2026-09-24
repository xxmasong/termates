import { CHAT_MESSAGES } from '../constants';
import { useInView } from '../hooks';
interface ChatMockProps {
  children?: never;
}
export const ChatMock: React.FC<ChatMockProps> = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div className={`landing-chat${inView ? ' landing-chat--visible' : ''}`} ref={ref}>
      <header>
        <span>✦</span>
        <strong>Keeper</strong>
        <em>● online</em>
      </header>
      {CHAT_MESSAGES.map((message, index) => (
        <div
          className={`landing-chat__message landing-chat__message--${message.type}`}
          key={message.text}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          {message.type === 'keeper' ? <span className="landing-chat__avatar">✦</span> : null}
          <p>
            <span className="sr-only">{'speaker' in message ? `${message.speaker}: ` : ''}</span>
            {message.text}
          </p>
        </div>
      ))}
    </div>
  );
};
