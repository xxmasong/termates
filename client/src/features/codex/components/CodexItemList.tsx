import { useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { CodexItem } from '@/types';

import { CODEX_VIRTUALIZE_THRESHOLD } from '../constants';
import { CodexItemRow } from './CodexItemRow';

export interface CodexItemListProps {
  items: CodexItem[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

export const CodexItemList: React.FC<CodexItemListProps> = ({ items, expandedIds, onToggle }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length > CODEX_VIRTUALIZE_THRESHOLD;
  const count = items.length;

  const rowVirtualizer = useVirtualizer({
    count,
    estimateSize: () => 112,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const lastItemId = items[count - 1]?.id;
  const virtualItems = useMemo(
    () =>
      virtualRows.map((row) => ({
        item: items[row.index],
        row,
      })),
    [items, virtualRows],
  );

  useEffect(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl || !lastItemId) {
      return;
    }

    scrollEl.scrollTop = scrollEl.scrollHeight;
  }, [lastItemId]);

  return (
    <div className="codex-stream" ref={scrollRef}>
      {shouldVirtualize ? (
        <div className="codex-virtual" style={{ height: totalSize }}>
          {virtualItems.map(({ item, row }) => (
            <div
              className="codex-virtual__row"
              data-index={row.index}
              key={item.id}
              ref={rowVirtualizer.measureElement}
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <CodexItemRow item={item} onToggle={onToggle} open={expandedIds.has(item.id)} />
            </div>
          ))}
        </div>
      ) : (
        items.map((item) => (
          <CodexItemRow item={item} key={item.id} onToggle={onToggle} open={expandedIds.has(item.id)} />
        ))
      )}
    </div>
  );
};
