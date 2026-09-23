import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, EmptyState, Icon, Kbd, Textarea } from '@/components';
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
  const savedContent = selectedFilename ? fileQuery.data?.content : undefined;
  const isDirty = savedContent !== undefined && draftContent !== savedContent;

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
  const onDiscard = useCallback(() => {
    setDraftContent(savedContent ?? '');
  }, [savedContent]);
  const onEditorKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (isDirty && !updateMutation.isPending) {
          onSave();
        }
      } else if (event.key === 'Escape' && isDirty) {
        event.preventDefault();
        onDiscard();
      }
    },
    [isDirty, onDiscard, onSave, updateMutation.isPending],
  );

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
      </header>
      <div className="file-workspace">
        <aside className="file-workspace__tree">
          {files.length === 0 ? (
            <EmptyState icon={<Icon name="book" size={18} />} title="No wiki files" />
          ) : (
            files.map((file) => (
              <button
                className={
                  file.filename === selectedFilename
                    ? 'content-tree-row wiki-file-row content-tree-row--active'
                    : 'content-tree-row wiki-file-row'
                }
                key={file.id}
                onClick={() => onSelect(file.filename)}
                title={`${file.filename} · updated ${new Date(file.updatedAt).toLocaleString()}`}
                type="button"
              >
                <Icon className="file-editor__icon" name="file" size={12} />
                <span className="content-tree-row__name">{file.filename}</span>
              </button>
            ))
          )}
        </aside>
        {selectedFilename ? (
          <div className="file-workspace__editor" onKeyDown={onEditorKeyDown}>
            <div className="file-editor__bar">
              <Icon className="file-editor__icon" name="book" size={14} />
              <span className="file-editor__name" title={selectedFilename}>
                {selectedFilename}
              </span>
              <span className="file-editor__status">
                {updateMutation.isPending ? (
                  <Badge tone="idle">Saving…</Badge>
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
              {isDirty ? (
                <div className="file-editor__actions">
                  <Button onClick={onDiscard} size="sm" variant="ghost">
                    Discard
                  </Button>
                  <Button icon="check" loading={updateMutation.isPending} onClick={onSave} size="sm" variant="primary">
                    Save <Kbd className="file-editor__kbd">⌘S</Kbd>
                  </Button>
                </div>
              ) : null}
            </div>
            <Textarea aria-label="Content" className="file-editor__content" onChange={onContentChange} value={draftContent} />
          </div>
        ) : (
          <div className="file-workspace__editor file-workspace__editor--empty">
            <EmptyState icon={<Icon name="book" size={18} />} title="Select a wiki page" />
          </div>
        )}
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </section>
  );
};

