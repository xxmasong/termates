import { useMemo } from 'react';

import type { SharedContent } from '@/types';

import type { ContentTreeNode } from '../types';

const getExtension = (filename: string): string => {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex + 1).toLowerCase() : '';
};

const sortTree = (nodes: ContentTreeNode[]): ContentTreeNode[] => {
  nodes.sort((first, second) => {
    if (first.kind !== second.kind) {
      return first.kind === 'folder' ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });

  nodes.forEach((node) => {
    if (node.kind === 'folder' && node.children) {
      sortTree(node.children);
    }
  });

  return nodes;
};

const buildTree = (items: SharedContent[]): ContentTreeNode[] => {
  const root: ContentTreeNode[] = [];
  const folderIndex = new Map<string, ContentTreeNode>();

  items.forEach((item) => {
    const parts = item.filename.split('/').filter(Boolean);

    if (parts.length <= 1) {
      const name = parts[0] ?? item.filename;
      root.push({
        by: item.createdBy,
        ext: getExtension(name),
        kind: 'file',
        name,
        path: item.filename,
        updatedAt: item.updatedAt,
      });
      return;
    }

    let prefix = '';
    let parentChildren = root;

    parts.slice(0, -1).forEach((part) => {
      prefix = prefix ? `${prefix}/${part}` : part;
      let folder = folderIndex.get(prefix);

      if (!folder) {
        folder = { children: [], kind: 'folder', name: part, path: prefix };
        folderIndex.set(prefix, folder);
        parentChildren.push(folder);
      }

      parentChildren = folder.children ?? [];
    });

    const leaf = parts[parts.length - 1];
    parentChildren.push({
      by: item.createdBy,
      ext: getExtension(leaf),
      kind: 'file',
      name: leaf,
      path: item.filename,
      updatedAt: item.updatedAt,
    });
  });

  return sortTree(root);
};

export const useContentTree = (items: SharedContent[]): ContentTreeNode[] =>
  useMemo(() => buildTree(items), [items]);
