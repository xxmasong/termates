import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, EmptyState, FormField, Icon, Textarea } from '@/components';
import { renderMarkdown } from '@/lib/utils/markdown';

import { useInitializeWiki, useUpdateWikiFile, useWikiFile, useWikiFiles, useWikiStatus } from '../hooks';

export interface WikiPanelProps {
  projectId: string;
}

export const WikiPanel: React.FC<WikiPanelProps> = ({ projectId }) => {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const statusQuery = useWikiStatus(projectId);
  const initialized = statusQuery.data?.initialized ?? false;
  const filesQuery = useWikiFiles(projectId, initialized);
  const fileQuery = useWikiFile(projectId, selectedFilename);
  const initializeMutation = useInitializeWiki();
  const updateMutation = useUpdateWikiFile();

  const files = useMemo(() => filesQuery.data ?? [], [filesQuery.data]);
  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent]);

  useEffect(() => {
    if (!selectedFilename && files[0]) {
      setSelectedFilename(files[0].filename);
    }
  }, [files, selectedFilename]);

  useEffect(() => {
    if (fileQuery.data) {
      setDraftContent(fileQuery.data.content);
    }
  }, [fileQuery.data]);

  const onInitialize = useCallback(() => {
    initializeMutation.mutate({ projectId });
  }, [initializeMutation, projectId]);
  const onSelect = useCallback((filename: string) => {
    setSelectedFilename(filename);
  }, []);
  const onContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
  }, []);
  const onSave = useCallback(() => {
    if (!selectedFilename) {
      return;
    }
    updateMutation.mutate({ filename: selectedFilename, input: { content: draftContent }, projectId });
  }, [draftContent, projectId, selectedFilename, updateMutation]);

  if (!initialized) {
    return (
      <section className="feature-panel">
        <EmptyState icon={<Icon name="book" size={20} />} title="Project memory is not initialized" />
        <div className="feature-panel__center-action">
          <Button icon="sparkles" loading={initializeMutation.isPending} onClick={onInitialize} variant="primary">
            Initialize Wiki
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="feature-panel content-panel">
      <header className="feature-panel__header">
        <div>
          <h2>Wiki</h2>
          <p>Project memory maintained by the daemon</p>
        </div>
        <Button disabled={!selectedFilename} icon="check" loading={updateMutation.isPending} onClick={onSave} size="sm" variant="primary">
          Save
        </Button>
      </header>
      <div className="file-workspace">
        <aside className="file-workspace__list">
          {files.length === 0 ? (
            <EmptyState icon={<Icon name="book" size={18} />} title="No wiki files" />
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
          <FormField label={selectedFilename ?? 'File'}>
            <Textarea disabled={!selectedFilename} onChange={onContentChange} rows={16} value={draftContent} />
          </FormField>
        </div>
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </section>
  );
};

