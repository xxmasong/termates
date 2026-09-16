import { useMemo } from 'react';

import { Button, Icon } from '@/components';
import { renderMarkdown } from '@/lib/utils';
import type { CodexItem } from '@/types';

import { CodexStatusBadge } from './CodexStatusBadge';

export interface CodexItemRowProps {
  item: CodexItem;
  open: boolean;
  onToggle: (id: string) => void;
}

const lineClassName = (line: string): string => {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return 'codex-diff-line codex-diff-line--add';
  }

  if (line.startsWith('-') && !line.startsWith('---')) {
    return 'codex-diff-line codex-diff-line--del';
  }

  if (line.startsWith('@@')) {
    return 'codex-diff-line codex-diff-line--hunk';
  }

  return 'codex-diff-line';
};

export const CodexItemRow: React.FC<CodexItemRowProps> = ({ item, open, onToggle }) => {
  const html = useMemo(() => renderMarkdown(item.text ?? ''), [item.text]);
  const showCommandBody = open || item.status === 'running';
  const toolName = `${item.server ? `${item.server}/` : ''}${item.tool ?? 'tool'}`;

  if (item.kind === 'system') {
    return <div className="codex-system">{item.text}</div>;
  }

  if (item.kind === 'error') {
    return (
      <div className="codex-error">
        <CodexStatusBadge status={item.status} />
        <span>{item.text}</span>
      </div>
    );
  }

  if (item.kind === 'message') {
    if (item.role === 'user') {
      return (
        <div className="codex-message codex-message--user">
          <div className="codex-bubble">{item.text}</div>
        </div>
      );
    }

    return (
      <div className="codex-message codex-message--agent">
        <div className="codex-avatar">
          <Icon name="sparkles" size={12} />
        </div>
        <div className="codex-markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  if (item.kind === 'reasoning') {
    return (
      <div className="codex-card codex-card--reasoning">
        <button className="codex-card__header" onClick={() => onToggle(item.id)} type="button">
          <Icon className={open ? 'codex-chev codex-chev--open' : 'codex-chev'} name="chevR" size={11} />
          <Icon name="sparkles" size={11} />
          <span>Reasoning</span>
          <CodexStatusBadge status={item.status} />
        </button>
        {open ? <div className="codex-markdown codex-muted" dangerouslySetInnerHTML={{ __html: html }} /> : null}
      </div>
    );
  }

  if (item.kind === 'command') {
    return (
      <div className="codex-card">
        <button className="codex-card__header" onClick={() => onToggle(item.id)} type="button">
          <Icon
            className={showCommandBody ? 'codex-chev codex-chev--open' : 'codex-chev'}
            name="chevR"
            size={11}
          />
          <Icon name="terminal" size={11} />
          <span className="codex-card__title codex-card__title--mono">{item.command ?? '(command)'}</span>
          <CodexStatusBadge
            status={item.status ?? (item.exitCode === 0 ? 'done' : item.exitCode ? 'failed' : undefined)}
          />
        </button>
        {showCommandBody && item.output ? <pre className="codex-pre">{item.output.trimEnd()}</pre> : null}
      </div>
    );
  }

  if (item.kind === 'file') {
    return (
      <div className="codex-card">
        <button className="codex-card__header" onClick={() => onToggle(item.id)} type="button">
          <Icon className={open ? 'codex-chev codex-chev--open' : 'codex-chev'} name="chevR" size={11} />
          <Icon name="file" size={11} />
          <span className="codex-card__title codex-card__title--mono">{item.path ?? '(file)'}</span>
          <CodexStatusBadge status={item.status} />
        </button>
        {open && item.diff ? (
          <pre className="codex-pre codex-diff">
            {item.diff.split('\n').map((line, index) => (
              <div className={lineClassName(line)} key={`${item.id}-${index}`}>
                {line || ' '}
              </div>
            ))}
          </pre>
        ) : null}
      </div>
    );
  }

  if (item.kind === 'tool') {
    return (
      <div className="codex-card">
        <button className="codex-card__header" onClick={() => onToggle(item.id)} type="button">
          <Icon className={open ? 'codex-chev codex-chev--open' : 'codex-chev'} name="chevR" size={11} />
          <Icon name="bolt" size={11} />
          <span className="codex-card__title codex-card__title--mono">{toolName}</span>
          <CodexStatusBadge status={item.status} />
        </button>
        {open ? (
          <div className="codex-tool-body">
            {item.args ? (
              <div className="codex-kv">
                <span>args</span>
                <pre className="codex-pre">{item.args}</pre>
              </div>
            ) : null}
            {item.result ? (
              <div className="codex-kv">
                <span>result</span>
                <pre className="codex-pre">{item.result}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="codex-system">
      <Button icon="info" iconOnly size="sm" variant="ghost" />
      {item.text}
    </div>
  );
};
