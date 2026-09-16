import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { Icon, Input, Kbd } from '@/components/atoms';
import { EmptyState, Modal } from '@/components/molecules';
import { classNames } from '@/lib/utils';

export interface CommandPaletteItem {
  id: string;
  label: string;
  group?: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

export interface CommandPaletteShellProps {
  open: boolean;
  items: CommandPaletteItem[];
  onClose: () => void;
  onSelect?: (id: string) => void;
  placeholder?: string;
}

export const CommandPaletteShell: React.FC<CommandPaletteShellProps> = ({
  open,
  items,
  onClose,
  onSelect,
  placeholder = 'Search',
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      [item.label, item.description, item.group].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [items, query]);

  const selectActive = useCallback(() => {
    const item = filteredItems[activeIndex];
    if (!item || item.disabled) {
      return;
    }

    onSelect?.(item.id);
    onClose();
  }, [activeIndex, filteredItems, onClose, onSelect]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filteredItems.length - 1, 0)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        selectActive();
      }
    },
    [filteredItems.length, selectActive],
  );

  const groupedItems = useMemo(() => {
    let currentGroup = '';

    return filteredItems.map((item, index) => {
      const group = item.group ?? 'Commands';
      const showGroup = group !== currentGroup;
      currentGroup = group;
      return { item, index, group, showGroup };
    });
  }, [filteredItems]);

  return (
    <Modal closeOnBackdrop onClose={onClose} open={open} title="Command Palette" width={640}>
      <div className="command-palette" onKeyDown={onKeyDown}>
        <div className="command-palette__search">
          <Input
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder={placeholder}
            value={query}
          />
        </div>
        <div className="command-palette__list">
          {groupedItems.length === 0 ? (
            <EmptyState icon={<Icon name="search" size={18} />} title="No matches" />
          ) : (
            groupedItems.map(({ item, index, group, showGroup }) => (
              <div key={item.id}>
                {showGroup ? <div className="command-palette__group">{group}</div> : null}
                <button
                  className={classNames(
                    'command-palette__item',
                    index === activeIndex && 'command-palette__item--active',
                  )}
                  disabled={item.disabled}
                  onClick={() => {
                    onSelect?.(item.id);
                    onClose();
                  }}
                  type="button"
                >
                  {item.icon}
                  <span>
                    <span className="command-palette__item-label">{item.label}</span>
                    {item.description ? (
                      <span className="command-palette__item-meta">{item.description}</span>
                    ) : null}
                  </span>
                  {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
