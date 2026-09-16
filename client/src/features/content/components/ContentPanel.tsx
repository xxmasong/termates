import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, EmptyState, FormField, Icon, Input, Textarea } from '@/components';
import { renderMarkdown } from '@/lib/utils/markdown';

import { useContentItem, useContentList, useCreateContent, useDeleteContent, useUpdateContent } from '../hooks';

export interface ContentPanelProps {
  projectId: string;
  author?: string;
}

export const ContentPanel: React.FC<ContentPanelProps> = ({ projectId, author = 'user' }) => {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [draftFilename, setDraftFilename] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const listQuery = useContentList(projectId);
  const itemQuery = useContentItem(projectId, selectedFilename);
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();
  const deleteMutation = useDeleteContent();

  const files = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent]);

  useEffect(() => {
    if (!selectedFilename && files[0]) {
      setSelectedFilename(files[0].filename);
    }
  }, [files, selectedFilename]);

  useEffect(() => {
    if (itemQuery.data) {
      setDraftFilename(itemQuery.data.filename);
      setDraftContent(itemQuery.data.content);
    }
  }, [itemQuery.data]);

  const onNew = useCallback(() => {
    setSelectedFilename(null);
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
      { onSuccess: (content) => setSelectedFilename(content.filename) },
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
          <p>Files visible to every agent in this project</p>
        </div>
        <Button icon="plus" onClick={onNew} size="sm" variant="ghost">
          New
        </Button>
      </header>

      <div className="file-workspace">
        <aside className="file-workspace__list">
          {files.length === 0 ? (
            <EmptyState icon={<Icon name="file" size={18} />} title="No shared files" />
          ) : (
            files.map((file) => (
              <button
                className={file.filename === selectedFilename ? 'file-list-item file-list-item--active' : 'file-list-item'}
                key={file.id}
                onClick={() => onSelect(file.filename)}
                type="button"
              >
                <span>{file.filename}</span>
                <time>{new Date(file.updatedAt).toLocaleString()}</time>
              </button>
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

