import type { BrainConversationMeta } from '@/types';

import { Button } from '@/components';

export interface BrainConversationSwitcherProps {
  conversations: BrainConversationMeta[];
  currentId: string;
  onSwitch: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onNew: () => void;
}

const timeLabel = (timestamp: string): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};

export const BrainConversationSwitcher: React.FC<BrainConversationSwitcherProps> = ({
  conversations,
  currentId,
  onSwitch,
  onDelete,
  onNew,
}) => (
  <div className="brain-switcher">
    <Button icon="plus" onClick={onNew} size="sm" variant="ghost">
      New
    </Button>
    <div className="brain-switcher__list">
      {conversations.map((conversation) => (
        <button
          className={
            conversation.id === currentId
              ? 'brain-switcher__row brain-switcher__row--active'
              : 'brain-switcher__row'
          }
          key={conversation.id}
          onClick={() => onSwitch(conversation.id)}
          type="button"
        >
          <span className="brain-switcher__main">
            <span>{conversation.title || 'New conversation'}</span>
            <span>
              {conversation.messageCount} messages · {timeLabel(conversation.updatedAt)}
            </span>
          </span>
          <Button
            aria-label="Delete conversation"
            icon="x"
            iconOnly
            onClick={(event) => {
              event.stopPropagation();
              onDelete(conversation.id);
            }}
            size="sm"
            variant="ghost"
          />
        </button>
      ))}
    </div>
  </div>
);
