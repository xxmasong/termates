import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, ConfirmDialog, EmptyState, Icon, IconButton, Input, Kbd, Textarea } from '@/components';
import { renderMarkdown } from '@/lib/utils/markdown';

import {
  useContentItem,
  useContentList,
  useContentTree,
  useCreateContent,
  useDeleteContent,
  useUpdateContent,
} from '../hooks';
import { ContentTreeRow } from './ContentTreeRow';

export interface ContentPanelProps {
  projectId: string;
  author?: string;
}

export const ContentPanel: React.FC<ContentPanelProps> = ({ projectId, author = 'user' }) => {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftFilename, setDraftFilename] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const listQuery = useContentList(projectId);
  const itemQuery = useContentItem(projectId, selectedFilename);
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();
  const deleteMutation = useDeleteContent();

  const files = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const tree = useContentTree(files);
  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent]);
  const savedContent = selectedFilename ? itemQuery.data?.content : undefined;
  const isDirty = creating ? draftContent.length > 0 || draftFilename.trim().length > 0 : savedContent !== undefined && draftContent !== savedContent;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canSave = isDirty && draftFilename.trim().length > 0 && !isSaving;
  const hasEditor = creating || Boolean(selectedFilename);

  useEffect(() => {
    setSelectedFilename(null);
    setCreating(false);
    setDraftFilename('');
    setDraftContent('');
  }, [projectId]);

  useEffect(() => {
    if (!selectedFilename && !creating && files[0]) {
      setSelectedFilename(files[0].filename);
    }
  }, [creating, files, selectedFilename]);

  useEffect(() => {
    if (itemQuery.data) {
      setDraftFilename(itemQuery.data.filename);
      setDraftContent(itemQuery.data.content);
    }
  }, [itemQuery.data]);

  const onNew = useCallback(() => {
    setSelectedFilename(null);
    setCreating(true);
    setDraftFilename('');
    setDraftContent('');
  }, []);
  const onFilenameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftFilename(event.target.value);
  }, []);
  const onContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
  }, []);
  const onSelect = useCallback((filename: string) => {
    setCreating(false);
    setSelectedFilename(filename);
  }, []);
  const onSave = useCallback(() => {
    const filename = draftFilename.trim();
    if (!filename) {
      return;
    }

    if (selectedFilename) {
      updateMutation.mutate({ filename: selectedFilename, input: { content: draftContent }, projectId });
      return;
    }

    createMutation.mutate(
      { input: { content: draftContent, createdBy: author, filename }, projectId },
      {
        onSuccess: (content) => {
          setCreating(false);
          setSelectedFilename(content.filename);
        },
      },
    );
  }, [author, createMutation, draftContent, draftFilename, projectId, selectedFilename, updateMutation]);
  const onDelete = useCallback(() => {
    if (!selectedFilename) {
      return;
    }

    deleteMutation.mutate(
      { filename: selectedFilename, projectId },
      {
        onSuccess: () => {
          setConfirmingDelete(false);
          setCreating(false);
          setSelectedFilename(null);
          setDraftFilename('');
          setDraftContent('');
        },
      },
    );
  }, [deleteMutation, projectId, selectedFilename]);
  const onDiscard = useCallback(() => {
    if (creating) {
      setCreating(false);
      setDraftFilename('');
      setDraftContent('');
      return;
    }

    setDraftContent(savedContent ?? '');
  }, [creating, savedContent]);
  const onEditorKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (canSave) {
          onSave();
        }
      } else if (event.key === 'Escape' && isDirty) {
        event.preventDefault();
        onDiscard();
      }
    },
    [canSave, isDirty, onDiscard, onSave],
  );
  const onRequestDelete = useCallback(() => setConfirmingDelete(true), []);
  const onCancelDelete = useCallback(() => setConfirmingDelete(false), []);

  return (
    <section className="feature-panel content-panel">
      <header className="feature-panel__header">
        <div>
          <h2>Shared Content</h2>
          <p>Files and folders visible to every agent in this project · {files.length} {files.length === 1 ? 'item' : 'items'}</p>
        </div>
        <Button icon="plus" onClick={onNew} size="sm" variant="ghost">
          New
        </Button>
      </header>

      <div className="file-workspace">
        <aside className="file-workspace__tree">
          {tree.length === 0 ? (
            <EmptyState icon={<Icon name="folder" size={18} />} title="No files yet" />
          ) : (
            tree.map((node) => (
              <ContentTreeRow
                depth={0}
                key={node.path}
                node={node}
                onSelect={onSelect}
                selectedPath={selectedFilename}
              />
            ))
          )}
        </aside>
        {hasEditor ? (
          <div className="file-workspace__editor" onKeyDown={onEditorKeyDown}>
            <div className="file-editor__bar">
              <Icon className="file-editor__icon" name="file" size={14} />
              {creating ? (
                <Input
                  aria-label="Filename"
                  autoFocus
                  className="file-editor__name-input"
                  onChange={onFilenameChange}
                  placeholder="notes/new-file.md"
                  value={draftFilename}
                />
              ) : (
                <span className="file-editor__name" title={draftFilename}>
                  {draftFilename}
                </span>
              )}
              <span className="file-editor__status">
                {isSaving ? (
                  <Badge tone="idle">Saving…</Badge>
                ) : creating ? (
                  <Badge tone="attention" withDot>
                    New file
                  </Badge>
                ) : isDirty ? (
                  <Badge tone="attention" withDot>
                    Unsaved
                  </Badge>
                ) : (
                  <span className="file-editor__saved">
                    <Icon name="check" size={11} /> Saved
                  </span>
                )}
              </span>
              <div className="file-editor__actions">
                {isDirty || creating ? (
                  <>
                    <Button onClick={onDiscard} size="sm" variant="ghost">
                      {creating ? 'Cancel' : 'Discard'}
                    </Button>
                    <Button disabled={!canSave} icon="check" loading={isSaving} onClick={onSave} size="sm" variant="primary">
                      Save <Kbd className="file-editor__kbd">⌘S</Kbd>
                    </Button>
                  </>
                ) : null}
                {selectedFilename ? (
                  <IconButton icon="trash" label={`Delete ${selectedFilename}`} onClick={onRequestDelete} size="sm" tone="danger" />
                ) : null}
              </div>
            </div>
            <Textarea
              aria-label="Content"
              className="file-editor__content"
              onChange={onContentChange}
              placeholder="Write markdown…"
              value={draftContent}
            />
          </div>
        ) : (
          <div className="file-workspace__editor file-workspace__editor--empty">
            <EmptyState icon={<Icon name="file" size={18} />} title="Select a file or create a new one" />
          </div>
        )}
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
      <ConfirmDialog
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        message={`Delete ${selectedFilename ?? 'this file'}? Every agent in this project loses access to it.`}
        onCancel={onCancelDelete}
        onConfirm={onDelete}
        open={confirmingDelete}
        title="Delete shared file"
      />
    </section>
  );
};
