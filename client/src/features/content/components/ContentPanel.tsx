import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, EmptyState, FormField, Icon, Input, Textarea } from '@/components';
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
  const listQuery = useContentList(projectId);
  const itemQuery = useContentItem(projectId, selectedFilename);
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();
  const deleteMutation = useDeleteContent();

  const files = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const tree = useContentTree(files);
  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent]);

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
          setCreating(false);
          setSelectedFilename(null);
          setDraftFilename('');
          setDraftContent('');
        },
      },
    );
  }, [deleteMutation, projectId, selectedFilename]);

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
        <div className="file-workspace__editor">
          <FormField label="Filename">
            <Input disabled={Boolean(selectedFilename)} onChange={onFilenameChange} value={draftFilename} />
          </FormField>
          <FormField label="Content">
            <Textarea onChange={onContentChange} rows={12} value={draftContent} />
          </FormField>
          <div className="feature-panel__actions">
            {selectedFilename ? (
              <Button icon="x" loading={deleteMutation.isPending} onClick={onDelete} variant="danger">
                Delete
              </Button>
            ) : null}
            <Button
              icon="check"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={onSave}
              variant="primary"
            >
              Save
            </Button>
          </div>
        </div>
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </section>
  );
};
