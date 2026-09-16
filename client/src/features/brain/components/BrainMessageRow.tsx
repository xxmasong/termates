import { useMemo } from 'react';

import { Icon } from '@/components';
import { renderMarkdown } from '@/lib/utils';
import type { BrainMessage } from '@/types';

export interface BrainMessageRowProps {
  message: BrainMessage;
}

export const BrainMessageRow: React.FC<BrainMessageRowProps> = ({ message }) => {
  const html = useMemo(() => renderMarkdown(message.text), [message.text]);

  if (message.role === 'user') {
    return (
      <div className="brain-message brain-message--user">
        <div className="brain-bubble">{message.text}</div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <div className="brain-message brain-message--assistant">
        <div className="brain-avatar">
          <Icon name="logo" size={12} />
        </div>
        <div className="brain-markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  if (message.role === 'tool') {
    return (
      <div className="brain-tool">
        <Icon name="bolt" size={11} />
        <span className="brain-tool__name">{message.tool ?? 'tool'}</span>
        {message.text ? <span className="brain-tool__text">{message.text}</span> : null}
      </div>
    );
  }

  if (message.role === 'reasoning') {
    return <div className="brain-reasoning">{message.text}</div>;
  }

  if (message.role === 'error') {
    return <div className="brain-error">{message.text}</div>;
  }

  return <div className="brain-system">{message.text}</div>;
};
