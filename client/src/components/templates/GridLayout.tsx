import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/atoms';
import { GRID_LAYOUT } from '@/components/constants';
import { EmptyState } from '@/components/molecules';
import { useLocalStorage } from '@/lib/hooks';
import { classNames } from '@/lib/utils';

export type GridLayoutMode = 'single' | '2up' | '3up' | 'grid' | 'canvas';
export const GRID_LAYOUT_DRAG_MIME = 'application/x-termhive-pane';

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
type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';

const CANVAS_RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const GRID_DRAG_HANDLE_SELECTOR = '[data-grid-drag-handle]';
const GRID_DRAG_BLOCK_SELECTOR = 'button, select, input, textarea, a, [role="button"], .agent-model-bar';

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

const splitLeafAt = (tree: SplitTree, targetId: string, newId: string, zone: DropZone): SplitTree => {
  if (tree.kind === 'leaf') {
    if (tree.id !== targetId || zone === 'center') {
      return tree;
    }

    const target: SplitTree = { kind: 'leaf', id: targetId };
    const source: SplitTree = { kind: 'leaf', id: newId };
    const direction: SplitDirection = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
    const sourceFirst = zone === 'left' || zone === 'top';

    return {
      kind: 'split',
      direction,
      ratio: 0.5,
      a: sourceFirst ? source : target,
      b: sourceFirst ? target : source,
    };
  }

  return { ...tree, a: splitLeafAt(tree.a, targetId, newId, zone), b: splitLeafAt(tree.b, targetId, newId, zone) };
};

const dataTransferHasPane = (dataTransfer: DataTransfer): boolean =>
  Array.from(dataTransfer.types).includes(GRID_LAYOUT_DRAG_MIME);

const isPaneDragHandleTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(GRID_DRAG_BLOCK_SELECTOR)) {
    return false;
  }

  return Boolean(target.closest(GRID_DRAG_HANDLE_SELECTOR));
};

const gridDropZone = (rect: DOMRect, clientX: number, clientY: number): DropZone => {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const edgeBandX = rect.width * 0.25;
  const edgeBandY = rect.height * 0.25;
  const edges: Array<{ zone: DropZone; distance: number }> = [];

  if (x <= edgeBandX) {
    edges.push({ zone: 'left', distance: x });
  }

  if (rect.width - x <= edgeBandX) {
    edges.push({ zone: 'right', distance: rect.width - x });
  }

  if (y <= edgeBandY) {
    edges.push({ zone: 'top', distance: y });
  }

  if (rect.height - y <= edgeBandY) {
    edges.push({ zone: 'bottom', distance: rect.height - y });
  }

  return edges.sort((first, second) => first.distance - second.distance)[0]?.zone ?? 'center';
};

const rowDropZone = (rect: DOMRect, clientX: number, allowCenter: boolean): DropZone => {
  const x = (clientX - rect.left) / rect.width;

  if (!allowCenter) {
    return x < 0.5 ? 'left' : 'right';
  }

  if (x < 0.25) {
    return 'left';
  }

  if (x > 0.75) {
    return 'right';
  }

  return 'center';
};

const rowVisibleIds = (orderedIds: string[], focusedId: string | null | undefined, count: number): string[] => {
  const visible = orderedIds.slice(0, count);

  if (focusedId && visible.length > 0 && orderedIds.includes(focusedId) && !visible.includes(focusedId)) {
    visible[visible.length - 1] = focusedId;
  }

  return visible;
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

interface DropOverlayProps {
  dragActive: boolean;
  draggingId: string | null;
  hoverTargetId: string | null;
  hoverZone: DropZone | null;
  paneId: string;
  onDragLeave: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
}

const DropOverlay: React.FC<DropOverlayProps> = ({
  dragActive,
  draggingId,
  hoverTargetId,
  hoverZone,
  paneId,
  onDragLeave,
  onDragOver,
  onDrop,
}) => {
  if (!dragActive || draggingId === paneId) {
    return null;
  }

  const activeZone = hoverTargetId === paneId ? hoverZone : null;

  return (
    <div
      className="grid-layout__drop-overlay"
      onDragLeave={(event) => onDragLeave(paneId, event)}
      onDragOver={(event) => onDragOver(paneId, event)}
      onDrop={(event) => onDrop(paneId, event)}
    >
      {activeZone ? (
        <div
          className={classNames(
            'grid-layout__drop-indicator',
            `grid-layout__drop-indicator--${activeZone}`,
          )}
        />
      ) : null}
    </div>
  );
};

interface SplitTreeViewProps {
  dragActive: boolean;
  draggingId: string | null;
  dragReadyId: string | null;
  hoverTargetId: string | null;
  hoverZone: DropZone | null;
  tree: SplitTree;
  rootTree: SplitTree;
  panesById: Map<string, GridLayoutPane>;
  focusedId?: string | null;
  onDragEnd: () => void;
  onGridDragLeave: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onGridDragOver: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onGridDrop: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onFocus?: (id: string) => void;
  onPaneDragStart: (id: string, event: React.DragEvent<HTMLDivElement>) => void;
  onPaneMouseDownCapture: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  onPaneMouseUpCapture: () => void;
  onTreeChange: (tree: SplitTree | null) => void;
  path?: SplitPath;
}

const SplitTreeView: React.FC<SplitTreeViewProps> = ({
  dragActive,
  draggingId,
  dragReadyId,
  hoverTargetId,
  hoverZone,
  tree,
  rootTree,
  panesById,
  focusedId,
  onDragEnd,
  onGridDragLeave,
  onGridDragOver,
  onGridDrop,
  onFocus,
  onPaneDragStart,
  onPaneMouseDownCapture,
  onPaneMouseUpCapture,
  onTreeChange,
  path = [],
}) => {
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
        className={classNames(
          'grid-layout__pane-wrap',
          draggingId === tree.id && 'grid-layout__pane-wrap--dragging',
        )}
        draggable={dragReadyId === tree.id}
        onDragEnd={onDragEnd}
        onDragStart={(event) => onPaneDragStart(tree.id, event)}
        onMouseDownCapture={(event) => onPaneMouseDownCapture(tree.id, event)}
        onMouseUpCapture={onPaneMouseUpCapture}
      >
        {renderPane(pane, tree.id === focusedId, onFocus)}
        <DropOverlay
          dragActive={dragActive}
          draggingId={draggingId}
          hoverTargetId={hoverTargetId}
          hoverZone={hoverZone}
          onDragLeave={onGridDragLeave}
          onDragOver={onGridDragOver}
          onDrop={onGridDrop}
          paneId={tree.id}
        />
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
          dragActive={dragActive}
          draggingId={draggingId}
          dragReadyId={dragReadyId}
          focusedId={focusedId}
          hoverTargetId={hoverTargetId}
          hoverZone={hoverZone}
          onDragEnd={onDragEnd}
          onFocus={onFocus}
          onGridDragLeave={onGridDragLeave}
          onGridDragOver={onGridDragOver}
          onGridDrop={onGridDrop}
          onPaneDragStart={onPaneDragStart}
          onPaneMouseDownCapture={onPaneMouseDownCapture}
          onPaneMouseUpCapture={onPaneMouseUpCapture}
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
          dragActive={dragActive}
          draggingId={draggingId}
          dragReadyId={dragReadyId}
          focusedId={focusedId}
          hoverTargetId={hoverTargetId}
          hoverZone={hoverZone}
          onDragEnd={onDragEnd}
          onFocus={onFocus}
          onGridDragLeave={onGridDragLeave}
          onGridDragOver={onGridDragOver}
          onGridDrop={onGridDrop}
          onPaneDragStart={onPaneDragStart}
          onPaneMouseDownCapture={onPaneMouseDownCapture}
          onPaneMouseUpCapture={onPaneMouseUpCapture}
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragReadyId, setDragReadyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [externalDragActive, setExternalDragActive] = useState(false);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [hoverZone, setHoverZone] = useState<DropZone | null>(null);
  const dragStartAllowedRef = useRef<{ id: string; allowed: boolean } | null>(null);
  const dragActive = Boolean(draggingId || externalDragActive);

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

  const resetDragState = useCallback(() => {
    dragStartAllowedRef.current = null;
    setDragReadyId(null);
    setDraggingId(null);
    setExternalDragActive(false);
    setHoverTargetId(null);
    setHoverZone(null);
  }, []);

  useEffect(() => {
    window.addEventListener('dragend', resetDragState);
    window.addEventListener('drop', resetDragState);

    return () => {
      window.removeEventListener('dragend', resetDragState);
      window.removeEventListener('drop', resetDragState);
    };
  }, [resetDragState]);

  const notePaneDrag = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (dataTransferHasPane(event.dataTransfer)) {
      setExternalDragActive(true);
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleLayoutDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (dataTransferHasPane(event.dataTransfer)) {
      event.preventDefault();
    }

    resetDragState();
  }, [resetDragState]);

  const handlePaneMouseDownCapture = useCallback((id: string, event: React.MouseEvent<HTMLDivElement>) => {
    const allowed = isPaneDragHandleTarget(event.target);
    dragStartAllowedRef.current = { id, allowed };
    setDragReadyId(allowed ? id : null);
  }, []);

  const handlePaneMouseUpCapture = useCallback(() => {
    setDragReadyId(null);
  }, []);

  const handlePaneDragStart = useCallback((id: string, event: React.DragEvent<HTMLDivElement>) => {
    const allowed = dragStartAllowedRef.current?.id === id && dragStartAllowedRef.current.allowed;

    if (!allowed) {
      event.preventDefault();
      return;
    }

    const header = event.currentTarget.querySelector<HTMLElement>(GRID_DRAG_HANDLE_SELECTOR);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(GRID_LAYOUT_DRAG_MIME, id);

    if (header) {
      event.dataTransfer.setDragImage(header, 20, 20);
    }

    // Mutating the DOM inside dragstart can abort the drag in Chromium, so
    // mount the drop overlays on the next tick.
    window.setTimeout(() => {
      setDraggingId(id);
      setExternalDragActive(false);
    }, 0);
  }, []);

  const movePaneBeforeOrAfter = useCallback(
    (sourceId: string, targetId: string, placement: 'before' | 'after') => {
      setOrder((current) => {
        const next = orderedIds.length > 0 ? orderedIds.slice() : current.slice();
        const sourceIndex = next.indexOf(sourceId);

        if (sourceIndex === -1) {
          next.push(sourceId);
        }

        const withoutSource = next.filter((id) => id !== sourceId);
        const targetIndex = withoutSource.indexOf(targetId);

        if (targetIndex === -1) {
          return next;
        }

        withoutSource.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, sourceId);
        return withoutSource;
      });
    },
    [orderedIds, setOrder],
  );

  const movePaneToTargetPosition = useCallback(
    (sourceId: string, targetId: string) => {
      setOrder((current) => {
        const next = orderedIds.length > 0 ? orderedIds.slice() : current.slice();
        const targetIndex = next.indexOf(targetId);

        if (targetIndex === -1) {
          return next;
        }

        if (!next.includes(sourceId)) {
          next.splice(targetIndex, 0, sourceId);
          return next;
        }

        const withoutSource = next.filter((id) => id !== sourceId);
        const adjustedTargetIndex = withoutSource.indexOf(targetId);

        if (adjustedTargetIndex === -1) {
          return next;
        }

        withoutSource.splice(adjustedTargetIndex, 0, sourceId);
        return withoutSource;
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
      const visibleIds = rowVisibleIds(orderedIds, focusedId, count);
      const visiblePanes = visibleIds
        .map((id) => panesMap.get(id))
        .filter((pane): pane is GridLayoutPane => Boolean(pane));

      const rowDragOver = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
        if (!dataTransferHasPane(event.dataTransfer)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setExternalDragActive(true);

        const allowCenter = !draggingId || !visibleIds.includes(draggingId);
        setHoverTargetId(targetId);
        setHoverZone(rowDropZone(event.currentTarget.getBoundingClientRect(), event.clientX, allowCenter));
      };

      const rowDragLeave = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        if (hoverTargetId === targetId) {
          setHoverTargetId(null);
          setHoverZone(null);
        }
      };

      const rowDrop = (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
        if (!dataTransferHasPane(event.dataTransfer)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const sourceId = event.dataTransfer.getData(GRID_LAYOUT_DRAG_MIME);

        if (sourceId && ids.includes(sourceId)) {
          const sourceVisible = visibleIds.includes(sourceId);
          // Match the zone the indicator showed during dragover.
          const allowCenter = !draggingId || !visibleIds.includes(draggingId);
          const zone = rowDropZone(event.currentTarget.getBoundingClientRect(), event.clientX, allowCenter);

          if (zone === 'center') {
            if (!sourceVisible) {
              movePaneToTargetPosition(sourceId, targetId);
            } else if (sourceId !== targetId) {
              setOrder(() => {
                const next = orderedIds.slice();
                const sourceIndex = next.indexOf(sourceId);
                const targetIndex = next.indexOf(targetId);
                next[sourceIndex] = targetId;
                next[targetIndex] = sourceId;
                return next;
              });
            }
          } else if (sourceId !== targetId) {
            movePaneBeforeOrAfter(sourceId, targetId, zone === 'left' ? 'before' : 'after');
          }

          onFocus?.(sourceId);
        }

        resetDragState();
      };

      return (
        <div
          className="grid-layout grid-layout--row"
          onDragEnter={notePaneDrag}
          onDragOver={notePaneDrag}
          onDrop={handleLayoutDrop}
          ref={rowRef}
        >
          {visiblePanes.map((pane, index) => (
            <div
              className={classNames(
                'grid-layout__pane-wrap',
                draggingId === pane.id && 'grid-layout__pane-wrap--dragging',
              )}
              draggable={dragReadyId === pane.id}
              key={pane.id}
              onDragEnd={resetDragState}
              onDragStart={(event) => handlePaneDragStart(pane.id, event)}
              onMouseDownCapture={(event) => handlePaneMouseDownCapture(pane.id, event)}
              onMouseUpCapture={handlePaneMouseUpCapture}
              style={{ flex: `${sizes[index] ?? 100 / visiblePanes.length} 1 0` }}
            >
              {renderPane(pane, pane.id === focusedId, onFocus)}
              <DropOverlay
                dragActive={dragActive}
                draggingId={draggingId}
                hoverTargetId={hoverTargetId}
                hoverZone={hoverZone}
                onDragLeave={rowDragLeave}
                onDragOver={rowDragOver}
                onDrop={rowDrop}
                paneId={pane.id}
              />
              {index < visiblePanes.length - 1 ? (
                <div className="grid-layout__resizer" onMouseDown={startRowResize(index, setSizes)} />
              ) : null}
            </div>
          ))}
        </div>
      );
    },
    [
      dragActive,
      dragReadyId,
      draggingId,
      focusedId,
      handleLayoutDrop,
      handlePaneDragStart,
      handlePaneMouseDownCapture,
      handlePaneMouseUpCapture,
      hoverTargetId,
      hoverZone,
      ids,
      movePaneBeforeOrAfter,
      movePaneToTargetPosition,
      notePaneDrag,
      onFocus,
      orderedIds,
      panesMap,
      resetDragState,
      setOrder,
      startRowResize,
    ],
  );

  const handleGridDragOver = useCallback((targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!dataTransferHasPane(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setExternalDragActive(true);
    setHoverTargetId(targetId);
    setHoverZone(gridDropZone(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY));
  }, []);

  const handleGridDragLeave = useCallback((targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    if (hoverTargetId === targetId) {
      setHoverTargetId(null);
      setHoverZone(null);
    }
  }, [hoverTargetId]);

  const handleGridDrop = useCallback(
    (targetId: string, event: React.DragEvent<HTMLDivElement>) => {
      if (!dataTransferHasPane(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const sourceId = event.dataTransfer.getData(GRID_LAYOUT_DRAG_MIME);

      if (sourceId && ids.includes(sourceId) && effectiveTree) {
        const zone = gridDropZone(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);

        if (zone === 'center') {
          if (sourceId !== targetId) {
            setTree(swapLeaves(effectiveTree, sourceId, targetId));
          }
        } else if (sourceId !== targetId) {
          const pruned = removeLeaf(effectiveTree, sourceId);

          if (pruned) {
            setTree(splitLeafAt(pruned, targetId, sourceId, zone));
          }
        }

        onFocus?.(sourceId);
      }

      resetDragState();
    },
    [effectiveTree, ids, onFocus, resetDragState, setTree],
  );

  const handleSingleDragOver = useCallback((targetId: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!dataTransferHasPane(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setExternalDragActive(true);
    setHoverTargetId(targetId);
    setHoverZone('center');
  }, []);

  const handleSingleDrop = useCallback(
    (_targetId: string, event: React.DragEvent<HTMLDivElement>) => {
      if (!dataTransferHasPane(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const sourceId = event.dataTransfer.getData(GRID_LAYOUT_DRAG_MIME);

      if (sourceId && ids.includes(sourceId)) {
        onFocus?.(sourceId);
      }

      resetDragState();
    },
    [ids, onFocus, resetDragState],
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

    // Fit the tiles to the visible canvas width so tiling never scrolls
    // horizontally; extra rows scroll vertically instead.
    const gap = GRID_LAYOUT.CANVAS_GAP;
    const top = GRID_LAYOUT.CANVAS_TOOLBAR_HEIGHT + gap;
    const viewWidth = canvasRef.current?.clientWidth ?? window.innerWidth;
    const viewHeight = canvasRef.current?.clientHeight ?? window.innerHeight;
    const maxColumns = Math.max(1, Math.floor((viewWidth - gap) / (GRID_LAYOUT.CANVAS_MIN_WIDTH + gap)));
    const columns = Math.min(Math.ceil(Math.sqrt(count)), maxColumns);
    const rows = Math.ceil(count / columns);
    const cellWidth = Math.floor((viewWidth - gap * (columns + 1)) / columns);
    const cellHeight = Math.max(
      GRID_LAYOUT.CANVAS_MIN_HEIGHT,
      Math.floor((viewHeight - top - gap * rows) / rows),
    );

    setRects(
      Object.fromEntries(
        idsToTile.map((id, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          return [
            id,
            {
              x: gap + column * (cellWidth + gap),
              y: top + row * (cellHeight + gap),
              width: cellWidth,
              height: cellHeight,
              z: index + 1,
            },
          ];
        }),
      ),
    );
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
    const visiblePane = pane ?? orderedPanes[0];

    return (
      <div
        className="grid-layout grid-layout--single"
        onDragEnter={notePaneDrag}
        onDragOver={notePaneDrag}
        onDrop={handleLayoutDrop}
      >
        <div
          className={classNames(
            'grid-layout__pane-wrap',
            draggingId === visiblePane.id && 'grid-layout__pane-wrap--dragging',
          )}
          draggable={dragReadyId === visiblePane.id}
          onDragEnd={resetDragState}
          onDragStart={(event) => handlePaneDragStart(visiblePane.id, event)}
          onMouseDownCapture={(event) => handlePaneMouseDownCapture(visiblePane.id, event)}
          onMouseUpCapture={handlePaneMouseUpCapture}
        >
          {renderPane(visiblePane, true, onFocus)}
          <DropOverlay
            dragActive={dragActive}
            draggingId={draggingId}
            hoverTargetId={hoverTargetId}
            hoverZone={hoverZone}
            onDragLeave={handleGridDragLeave}
            onDragOver={handleSingleDragOver}
            onDrop={handleSingleDrop}
            paneId={visiblePane.id}
          />
        </div>
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
      <div className="grid-layout grid-layout--canvas" ref={canvasRef}>
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
    <div
      className="grid-layout grid-layout--grid"
      onDragEnter={notePaneDrag}
      onDragOver={notePaneDrag}
      onDrop={handleLayoutDrop}
    >
      {effectiveTree ? (
        <SplitTreeView
          dragActive={dragActive}
          draggingId={draggingId}
          dragReadyId={dragReadyId}
          focusedId={focusedId}
          hoverTargetId={hoverTargetId}
          hoverZone={hoverZone}
          onDragEnd={resetDragState}
          onFocus={onFocus}
          onGridDragLeave={handleGridDragLeave}
          onGridDragOver={handleGridDragOver}
          onGridDrop={handleGridDrop}
          onPaneDragStart={handlePaneDragStart}
          onPaneMouseDownCapture={handlePaneMouseDownCapture}
          onPaneMouseUpCapture={handlePaneMouseUpCapture}
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
