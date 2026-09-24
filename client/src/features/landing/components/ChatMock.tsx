import { CHAT_MESSAGES } from '../constants';
import { useInView } from '../hooks';
interface ChatMockProps {
  children?: never;
}
export const ChatMock: React.FC<ChatMockProps> = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div className={`landing-chat${inView ? ' landing-chat--visible' : ''}`} ref={ref}>
      {CHAT_MESSAGES.map((message, index) => (
        <p key={message} style={{ transitionDelay: `${index * 100}ms` }}>
          {message}
        </p>
      ))}
    </div>
  );
};
