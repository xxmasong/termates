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
        // A div row: the switch target and the delete button are siblings, since
        // a button may not contain another button.
        <div
          className={
            conversation.id === currentId
              ? 'brain-switcher__row brain-switcher__row--active'
              : 'brain-switcher__row'
          }
          key={conversation.id}
        >
          <button
            aria-current={conversation.id === currentId ? 'true' : undefined}
            className="brain-switcher__main"
            onClick={() => onSwitch(conversation.id)}
            type="button"
          >
            <span>{conversation.title || 'New conversation'}</span>
            <span>
              {conversation.messageCount} messages · {timeLabel(conversation.updatedAt)}
            </span>
          </button>
          <Button
            aria-label="Delete conversation"
            icon="trash"
            iconOnly
            onClick={() => onDelete(conversation.id)}
            size="sm"
            title="Delete conversation"
            variant="ghost"
          />
        </div>
      ))}
    </div>
  </div>
);
