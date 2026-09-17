import { useState } from 'react';

import { Icon } from '@/components';
import { classNames } from '@/lib/utils';

import { CONTENT_EXTENSION_COLORS, CONTENT_TREE_BASE_PADDING, CONTENT_TREE_INDENT } from '../constants';
import type { ContentTreeNode } from '../types';

export interface ContentTreeRowProps {
  depth: number;
  node: ContentTreeNode;
  onSelect: (filename: string) => void;
  selectedPath: string | null;
}

const formatAge = (timestamp: string | undefined): string => {
  if (!timestamp) {
    return '';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
};

export const ContentTreeRow: React.FC<ContentTreeRowProps> = ({
  depth,
  node,
  onSelect,
  selectedPath,
}) => {
  const [open, setOpen] = useState(depth < 1);
  const paddingLeft = CONTENT_TREE_BASE_PADDING + depth * CONTENT_TREE_INDENT;

  if (node.kind === 'folder') {
    return (
      <>
        <button
          className="content-tree-row content-tree-row--folder"
          onClick={() => setOpen((current) => !current)}
          style={{ paddingLeft }}
          type="button"
        >
          <span className={classNames('content-tree-row__caret', open && 'content-tree-row__caret--open')}>
            <Icon name="chevR" size={10} />
          </span>
          <Icon name="folder" size={13} />
          <span className="content-tree-row__name">{node.name}</span>
          <span className="content-tree-row__meta">{node.children?.length ?? 0}</span>
        </button>
        {open
          ? node.children?.map((child) => (
              <ContentTreeRow
                depth={depth + 1}
                key={child.path}
                node={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))
          : null}
      </>
    );
  }

  return (
    <button
      className={classNames(
        'content-tree-row',
        'content-tree-row--file',
        node.path === selectedPath && 'content-tree-row--active',
      )}
      onClick={() => onSelect(node.path)}
      style={{ paddingLeft }}
      type="button"
    >
      <span className="content-tree-row__caret" />
      <span
        className="content-tree-row__ext"
        style={{ color: CONTENT_EXTENSION_COLORS[node.ext ?? ''] ?? 'var(--text-2)' }}
      >
        {node.ext || '·'}
      </span>
      <span className="content-tree-row__name">{node.name}</span>
      <span className="content-tree-row__meta">
        {node.by ? `${node.by} · ` : ''}
        {formatAge(node.updatedAt)}
      </span>
    </button>
  );
};
