import { useCallback, useMemo, useRef, type ReactNode } from 'react';

import { Button } from '@/components/atoms';
import { GRID_LAYOUT } from '@/components/constants';
import { EmptyState } from '@/components/molecules';
import { useLocalStorage } from '@/lib/hooks';
import { classNames } from '@/lib/utils';

export type GridLayoutMode = 'single' | '2up' | '3up' | 'grid' | 'canvas';

export interface GridLayoutPane {
  id: string;
  children: ReactNode;
}

export interface GridLayoutProps {
  panes: GridLayoutPane[];
  mode: GridLayoutMode;
  focusedId?: string | null;
  onFocus?: (id: string) => void;
  storageKeyPrefix?: string;
  emptyTitle?: string;
}

type SplitDirection = 'horizontal' | 'vertical';
type SplitPath = Array<'a' | 'b'>;
type SplitTree =
  | { kind: 'leaf'; id: string }
  | { kind: 'split'; direction: SplitDirection; ratio: number; a: SplitTree; b: SplitTree };

interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const CANVAS_RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const paneIds = (panes: GridLayoutPane[]): string[] => panes.map((pane) => pane.id);

const buildTree = (ids: string[], direction: SplitDirection = 'horizontal'): SplitTree | null => {
  if (ids.length === 0) {
    return null;
  }

  if (ids.length === 1) {
    return { kind: 'leaf', id: ids[0] };
  }

  const midpoint = Math.ceil(ids.length / 2);
  const nextDirection = direction === 'horizontal' ? 'vertical' : 'horizontal';
  const left = buildTree(ids.slice(0, midpoint), nextDirection);
  const right = buildTree(ids.slice(midpoint), nextDirection);

  if (!left || !right) {
    return left ?? right;
  }

  return { kind: 'split', direction, ratio: 0.5, a: left, b: right };
};

const leafIds = (tree: SplitTree | null): string[] => {
  if (!tree) {
    return [];
  }

  if (tree.kind === 'leaf') {
    return [tree.id];
  }

  return [...leafIds(tree.a), ...leafIds(tree.b)];
};

const normalizeTree = (tree: SplitTree | null, ids: string[]): SplitTree | null => {
  const idSet = new Set(ids);

  const prune = (node: SplitTree | null): SplitTree | null => {
    if (!node) {
      return null;
    }

    if (node.kind === 'leaf') {
      return idSet.has(node.id) ? node : null;
    }

    const a = prune(node.a);
    const b = prune(node.b);

    if (a && b) {
      return { ...node, a, b };
    }

    return a ?? b;
  };

  let next = prune(tree);
  const existing = new Set(leafIds(next));

  ids.forEach((id) => {
    if (!existing.has(id)) {
      next = next
        ? splitLeaf(next, leafIds(next)[0], leafIds(next).length % 2 === 0 ? 'vertical' : 'horizontal', id)
        : { kind: 'leaf', id };
      existing.add(id);
    }
  });

  return next;
};

const splitLeaf = (
  tree: SplitTree,
  leafId: string,
  direction: SplitDirection,
  newId: string,
): SplitTree => {
  if (tree.kind === 'leaf') {
    return tree.id === leafId
      ? {
          kind: 'split',
          direction,
          ratio: 0.5,
          a: tree,
          b: { kind: 'leaf', id: newId },
        }
      : tree;
  }

  return { ...tree, a: splitLeaf(tree.a, leafId, direction, newId), b: splitLeaf(tree.b, leafId, direction, newId) };
};

const removeLeaf = (tree: SplitTree, leafId: string): SplitTree | null => {
  if (tree.kind === 'leaf') {
    return tree.id === leafId ? null : tree;
  }

  const a = removeLeaf(tree.a, leafId);
  const b = removeLeaf(tree.b, leafId);

  if (a && b) {
    return { ...tree, a, b };
  }

  return a ?? b;
};

const updateRatio = (tree: SplitTree, path: SplitPath, ratio: number): SplitTree => {
  if (tree.kind === 'leaf') {
    return tree;
  }

  if (path.length === 0) {
    return { ...tree, ratio };
  }

  const [head, ...tail] = path;
  return { ...tree, [head]: updateRatio(tree[head], tail, ratio) };
};

const swapLeaves = (tree: SplitTree, firstId: string, secondId: string): SplitTree => {
  if (tree.kind === 'leaf') {
    if (tree.id === firstId) {
      return { kind: 'leaf', id: secondId };
    }

    if (tree.id === secondId) {
      return { kind: 'leaf', id: firstId };
    }

    return tree;
  }

  return { ...tree, a: swapLeaves(tree.a, firstId, secondId), b: swapLeaves(tree.b, firstId, secondId) };
};

const createDefaultRects = (ids: string[]): Record<string, CanvasRect> => {
  const rects: Record<string, CanvasRect> = {};

  ids.forEach((id, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    rects[id] = {
      x: 20 + col * (GRID_LAYOUT.CANVAS_DEFAULT_WIDTH + 20),
      y: 60 + row * (GRID_LAYOUT.CANVAS_DEFAULT_HEIGHT + 20),
      width: GRID_LAYOUT.CANVAS_DEFAULT_WIDTH,
      height: GRID_LAYOUT.CANVAS_DEFAULT_HEIGHT,
      z: index + 1,
    };
  });

  return rects;
};

const normalizeRects = (
  rects: Record<string, CanvasRect>,
  ids: string[],
): Record<string, CanvasRect> => {
  const next: Record<string, CanvasRect> = {};
  const defaults = createDefaultRects(ids);

  ids.forEach((id) => {
    next[id] = rects[id] ?? defaults[id];
  });

  return next;
};

const paneById = (panes: GridLayoutPane[]): Map<string, GridLayoutPane> =>
  new Map(panes.map((pane) => [pane.id, pane]));

const renderPane = (
  pane: GridLayoutPane | undefined,
  focused: boolean,
  onFocus?: (id: string) => void,
): ReactNode => {
  if (!pane) {
    return null;
  }

  return (
    <div
      className={classNames('grid-layout__pane', focused && 'grid-layout__pane--focused')}
      onClick={() => onFocus?.(pane.id)}
    >
      {pane.children}
    </div>
  );
};

interface SplitTreeViewProps {
  tree: SplitTree;
  rootTree: SplitTree;
  panesById: Map<string, GridLayoutPane>;
  focusedId?: string | null;
  onFocus?: (id: string) => void;
  onTreeChange: (tree: SplitTree | null) => void;
  path?: SplitPath;
}

const SplitTreeView: React.FC<SplitTreeViewProps> = ({
  tree,
  rootTree,
  panesById,
  focusedId,
  onFocus,
  onTreeChange,
  path = [],
}) => {
  const dragSourceRef = useRef<string | null>(null);

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (tree.kind === 'leaf') {
        return;
      }

      event.preventDefault();
      const host = event.currentTarget.parentElement;
      const bounds = host?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      const isHorizontal = tree.direction === 'horizontal';
      const size = isHorizontal ? bounds.width : bounds.height;
      const startRatio = tree.ratio;
      let delta = 0;

      const move = (moveEvent: MouseEvent): void => {
        delta += isHorizontal ? moveEvent.movementX : moveEvent.movementY;
        const ratio = Math.max(
          GRID_LAYOUT.SPLIT_MIN_RATIO,
          Math.min(GRID_LAYOUT.SPLIT_MAX_RATIO, startRatio + delta / size),
        );
        onTreeChange(updateRatio(rootTree, path, ratio));
      };

      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    },
    [onTreeChange, path, rootTree, tree],
  );

  if (tree.kind === 'leaf') {
    const pane = panesById.get(tree.id);

    return (
      <div
        className="grid-layout__pane-wrap"
        draggable
        onDragOver={(event) => {
          if (dragSourceRef.current && dragSourceRef.current !== tree.id) {
            event.preventDefault();
          }
        }}
        onDragStart={(event) => {
          dragSourceRef.current = tree.id;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', tree.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const sourceId = event.dataTransfer.getData('text/plain');
          if (sourceId && sourceId !== tree.id) {
            onTreeChange(swapLeaves(rootTree, sourceId, tree.id));
          }
          dragSourceRef.current = null;
        }}
      >
        {renderPane(pane, tree.id === focusedId, onFocus)}
      </div>
    );
  }

  const isHorizontal = tree.direction === 'horizontal';
  const firstStyle = isHorizontal
    ? { width: `${tree.ratio * 100}%` }
    : { height: `${tree.ratio * 100}%` };
  const secondStyle = isHorizontal
    ? { width: `${(1 - tree.ratio) * 100}%` }
    : { height: `${(1 - tree.ratio) * 100}%` };

  return (
    <div
      className={classNames(
        'grid-layout__split',
        isHorizontal ? 'grid-layout__split--horizontal' : 'grid-layout__split--vertical',
      )}
    >
      <div className="grid-layout__split-side" style={firstStyle}>
        <SplitTreeView
          focusedId={focusedId}
          onFocus={onFocus}
          onTreeChange={onTreeChange}
          panesById={panesById}
          path={[...path, 'a']}
          rootTree={rootTree}
          tree={tree.a}
        />
      </div>
      <div
        className={classNames(
          'grid-layout__split-divider',
          isHorizontal
            ? 'grid-layout__split-divider--horizontal'
            : 'grid-layout__split-divider--vertical',
        )}
        onDoubleClick={() => onTreeChange(removeLeaf(rootTree, leafIds(tree)[0]))}
        onMouseDown={startResize}
      />
      <div className="grid-layout__split-side" style={secondStyle}>
        <SplitTreeView
          focusedId={focusedId}
          onFocus={onFocus}
          onTreeChange={onTreeChange}
          panesById={panesById}
          path={[...path, 'b']}
          rootTree={rootTree}
          tree={tree.b}
        />
      </div>
    </div>
  );
};

export const GridLayout: React.FC<GridLayoutProps> = ({
  panes,
  mode,
  focusedId,
  onFocus,
  storageKeyPrefix = 'termhive:grid-layout',
  emptyTitle = 'No panes',
}) => {
  const ids = useMemo(() => paneIds(panes), [panes]);
  const panesMap = useMemo(() => paneById(panes), [panes]);
  const [order, setOrder] = useLocalStorage<string[]>(`${storageKeyPrefix}:order`, ids);
  const [sizes2, setSizes2] = useLocalStorage<number[]>(`${storageKeyPrefix}:sizes:2up`, [50, 50]);
  const [sizes3, setSizes3] = useLocalStorage<number[]>(`${storageKeyPrefix}:sizes:3up`, [
    33.33,
    33.33,
    33.34,
  ]);
  const [tree, setTree] = useLocalStorage<SplitTree | null>(`${storageKeyPrefix}:tree`, null);
  const [rects, setRects] = useLocalStorage<Record<string, CanvasRect>>(
    `${storageKeyPrefix}:canvas`,
    {},
  );
  const rowRef = useRef<HTMLDivElement>(null);

  const orderedIds = useMemo(() => {
    const known = new Set(ids);
    const next = order.filter((id) => known.has(id));
    ids.forEach((id) => {
      if (!next.includes(id)) {
        next.push(id);
      }
    });
    return next;
  }, [ids, order]);

  const orderedPanes = useMemo(
    () => orderedIds.map((id) => panesMap.get(id)).filter((pane): pane is GridLayoutPane => Boolean(pane)),
    [orderedIds, panesMap],
  );

  const effectiveTree = useMemo(() => normalizeTree(tree ?? buildTree(orderedIds), orderedIds), [
    orderedIds,
    tree,
  ]);
  const effectiveRects = useMemo(() => normalizeRects(rects, orderedIds), [orderedIds, rects]);

  const reorder = useCallback(
    (from: number, to: number) => {
      setOrder((current) => {
        const next = orderedIds.length > 0 ? orderedIds.slice() : current.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [orderedIds, setOrder],
  );

  const resizeRow = useCallback(
    (index: number, dx: number, setSizes: (value: number[] | ((current: number[]) => number[])) => void) => {
      const width = rowRef.current?.clientWidth ?? 1000;
      const deltaPercent = (dx / width) * 100;

      setSizes((current) => {
        const next = current.slice();
        const first = next[index] + deltaPercent;
        const second = next[index + 1] - deltaPercent;

        if (first < GRID_LAYOUT.ROW_MIN_PERCENT || second < GRID_LAYOUT.ROW_MIN_PERCENT) {
          return current;
        }

        next[index] = first;
        next[index + 1] = second;
        return next;
      });
    },
    [],
  );

  const startRowResize = useCallback(
    (index: number, setSizes: (value: number[] | ((current: number[]) => number[])) => void) =>
      (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();

        const move = (moveEvent: MouseEvent): void => resizeRow(index, moveEvent.movementX, setSizes);
        const up = (): void => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        document.body.style.cursor = 'col-resize';
      },
    [resizeRow],
  );

  const renderRow = useCallback(
    (count: number, sizes: number[], setSizes: (value: number[] | ((current: number[]) => number[])) => void) => {
      const visiblePanes =
        count === 2 && focusedId
          ? [
              orderedPanes.find((pane) => pane.id === focusedId),
              ...orderedPanes.filter((pane) => pane.id !== focusedId),
            ]
              .filter((pane): pane is GridLayoutPane => Boolean(pane))
              .slice(0, count)
          : orderedPanes.slice(0, count);

      return (
        <div className="grid-layout grid-layout--row" ref={rowRef}>
          {visiblePanes.map((pane, index) => (
            <div
              className="grid-layout__pane-wrap"
              draggable
              key={pane.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const source = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isInteger(source) && source !== index) {
                  reorder(source, index);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              style={{ flex: `${sizes[index] ?? 100 / visiblePanes.length} 1 0` }}
            >
              {renderPane(pane, pane.id === focusedId, onFocus)}
              {index < visiblePanes.length - 1 ? (
                <div className="grid-layout__resizer" onMouseDown={startRowResize(index, setSizes)} />
              ) : null}
            </div>
          ))}
        </div>
      );
    },
    [focusedId, onFocus, orderedPanes, reorder, startRowResize],
  );

  const bringCanvasPaneForward = useCallback(
    (id: string) => {
      const topZ = Math.max(0, ...Object.values(effectiveRects).map((rect) => rect.z)) + 1;
      setRects((current) => {
        const normalized = normalizeRects(current, orderedIds);
        const rect = normalized[id];
        return rect ? { ...normalized, [id]: { ...rect, z: topZ } } : normalized;
      });
    },
    [effectiveRects, orderedIds, setRects],
  );

  const startCanvasDrag = useCallback(
    (id: string) => (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      bringCanvasPaneForward(id);

      const move = (moveEvent: MouseEvent): void => {
        setRects((current) => {
          const normalized = normalizeRects(current, orderedIds);
          const rect = normalized[id];

          if (!rect) {
            return normalized;
          }

          return {
            ...normalized,
            [id]: {
              ...rect,
              x: Math.max(0, rect.x + moveEvent.movementX),
              y: Math.max(0, rect.y + moveEvent.movementY),
            },
          };
        });
      };

      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      document.body.style.cursor = 'grabbing';
    },
    [bringCanvasPaneForward, orderedIds, setRects],
  );

  const startCanvasResize = useCallback(
    (id: string, direction: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      bringCanvasPaneForward(id);

      const move = (moveEvent: MouseEvent): void => {
        setRects((current) => {
          const normalized = normalizeRects(current, orderedIds);
          const rect = normalized[id];

          if (!rect) {
            return normalized;
          }

          const next = { ...rect };

          if (direction.includes('e')) {
            next.width = Math.max(GRID_LAYOUT.CANVAS_MIN_WIDTH, next.width + moveEvent.movementX);
          }

          if (direction.includes('s')) {
            next.height = Math.max(GRID_LAYOUT.CANVAS_MIN_HEIGHT, next.height + moveEvent.movementY);
          }

          if (direction.includes('w')) {
            const width = Math.max(GRID_LAYOUT.CANVAS_MIN_WIDTH, next.width - moveEvent.movementX);
            next.x += next.width - width;
            next.width = width;
          }

          if (direction.includes('n')) {
            const height = Math.max(GRID_LAYOUT.CANVAS_MIN_HEIGHT, next.height - moveEvent.movementY);
            next.y += next.height - height;
            next.height = height;
          }

          return { ...normalized, [id]: next };
        });
      };

      const up = (): void => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        document.body.style.cursor = '';
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      document.body.style.cursor = direction.length === 1 ? `${direction === 'n' || direction === 's' ? 'ns' : 'ew'}-resize` : 'nwse-resize';
    },
    [bringCanvasPaneForward, orderedIds, setRects],
  );

  const tileCanvas = useCallback(() => {
    const idsToTile = orderedIds;
    const count = idsToTile.length;

    if (count === 0) {
      return;
    }

    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const cellWidth = GRID_LAYOUT.CANVAS_DEFAULT_WIDTH;
    const cellHeight = GRID_LAYOUT.CANVAS_DEFAULT_HEIGHT;

    setRects(
      Object.fromEntries(
        idsToTile.map((id, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          return [
            id,
            {
              x: GRID_LAYOUT.CANVAS_GAP + column * (cellWidth + GRID_LAYOUT.CANVAS_GAP),
              y:
                GRID_LAYOUT.CANVAS_TOOLBAR_HEIGHT +
                GRID_LAYOUT.CANVAS_GAP +
                row * (cellHeight + GRID_LAYOUT.CANVAS_GAP),
              width: cellWidth,
              height: cellHeight,
              z: index + 1,
            },
          ];
        }),
      ),
    );
    void rows;
  }, [orderedIds, setRects]);

  if (orderedPanes.length === 0) {
    return (
      <div className="grid-layout grid-layout--single">
        <EmptyState title={emptyTitle} />
      </div>
    );
  }

  if (mode === 'single') {
    const pane = focusedId ? orderedPanes.find((item) => item.id === focusedId) : orderedPanes[0];
    return (
      <div className="grid-layout grid-layout--single">
        {renderPane(pane ?? orderedPanes[0], true, onFocus)}
      </div>
    );
  }

  if (mode === '2up') {
    return renderRow(2, sizes2, setSizes2);
  }

  if (mode === '3up') {
    return renderRow(3, sizes3, setSizes3);
  }

  if (mode === 'canvas') {
    return (
      <div className="grid-layout grid-layout--canvas">
        <div className="grid-layout__canvas-toolbar">
          <Button icon="grid" onClick={tileCanvas} size="sm" variant="ghost">
            Tile
          </Button>
        </div>
        <div className="grid-layout__canvas">
          {orderedPanes.map((pane) => {
            const rect = effectiveRects[pane.id];

            return (
              <div
                className={classNames(
                  'grid-layout__canvas-card',
                  pane.id === focusedId && 'grid-layout__canvas-card--focused',
                )}
                key={pane.id}
                style={{
                  height: rect.height,
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  zIndex: rect.z,
                }}
              >
                <div className="grid-layout__canvas-card-body">
                  {renderPane(pane, pane.id === focusedId, onFocus)}
                </div>
                <button
                  aria-label="Drag pane"
                  className="grid-layout__canvas-drag-handle"
                  onMouseDown={startCanvasDrag(pane.id)}
                  type="button"
                />
                {CANVAS_RESIZE_DIRECTIONS.map((direction) => (
                  <div
                    className={classNames(
                      'grid-layout__canvas-handle',
                      `grid-layout__canvas-handle--${direction}`,
                    )}
                    key={direction}
                    onMouseDown={startCanvasResize(pane.id, direction)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid-layout grid-layout--grid">
      {effectiveTree ? (
        <SplitTreeView
          focusedId={focusedId}
          onFocus={onFocus}
          onTreeChange={setTree}
          panesById={panesMap}
          rootTree={effectiveTree}
          tree={effectiveTree}
        />
      ) : (
        <EmptyState title={emptyTitle} />
      )}
    </div>
  );
};
