import { Button, Icon } from '@/components';
import { classNames } from '@/lib/utils';

import { useKeeperHud, type KeeperHudNotice } from '../hooks';

export interface KeeperHudProps {
  awaiting: KeeperHudNotice[];
  headerListening: boolean;
  idleCount: number;
  onOpenFull: () => void;
  onSelectAgent: (projectId: string, agentId: string) => void;
  runningCount: number;
}

export const KeeperHud: React.FC<KeeperHudProps> = ({
  awaiting,
  headerListening,
  idleCount,
  onOpenFull,
  onSelectAgent,
  runningCount,
}) => {
  const hud = useKeeperHud({ headerListening });

  return (
    <div className="keeper-hud">
      {hud.expanded ? (
        <div className="keeper-hud__panel">
          <header className="keeper-hud__header">
            <div className={classNames('keeper-hud__mini-orb', `keeper-hud__mini-orb--${hud.state}`)}>
              <Icon name="logo" size={12} />
            </div>
            <span className="keeper-hud__title">The Keeper</span>
            <Button icon="message" iconOnly onClick={onOpenFull} size="sm" title="Open full conversation" variant="ghost" />
            <Button icon="x" iconOnly onClick={hud.close} size="sm" title="Collapse" variant="ghost" />
          </header>

          <div className="keeper-hud__wake">
            <Icon name="mic" size={11} />
            <span>{hud.wake.supported ? (hud.wake.enabled ? 'Wake word on' : 'Wake word off') : 'Wake word unavailable'}</span>
            {hud.wake.enabled ? <code>{hud.wake.phrase}</code> : null}
          </div>

          <div className="keeper-hud__status">
            <span><i className="status-dot status-dot--running" />{runningCount} running</span>
            <span><i className="status-dot status-dot--awaiting_input" />{awaiting.length} awaiting</span>
            <span><i className="status-dot status-dot--idle" />{idleCount} idle</span>
          </div>

          {awaiting.length > 0 ? (
            <div className="keeper-hud__awaiting">
              {awaiting.slice(0, 6).map((notice) => (
                <button
                  className="keeper-hud__awaiting-row"
                  key={notice.agentId}
                  onClick={() => onSelectAgent(notice.projectId, notice.agentId)}
                  type="button"
                >
                  <span className="status-dot status-dot--awaiting_input" />
                  <span className="keeper-hud__awaiting-name">{notice.agentName}</span>
                  <span className="keeper-hud__awaiting-project">{notice.projectName}</span>
                </button>
              ))}
            </div>
          ) : null}

          {hud.status === 'thinking' || hud.replyHtml ? (
            <div className="keeper-hud__reply">
              {hud.status === 'thinking' ? (
                <span className="keeper-hud__working">
                  <span className="keeper-hud__dot" />
                  <span className="keeper-hud__dot" />
                  <span className="keeper-hud__dot" />
                  The Keeper is working...
                  <Button icon="stop" onClick={hud.abort} size="sm" variant="danger">
                    Stop
                  </Button>
                </span>
              ) : (
                <>
                  <Button
                    aria-label="Clear Keeper reply"
                    className="keeper-hud__clear"
                    icon="x"
                    iconOnly
                    onClick={hud.clearReply}
                    size="sm"
                    variant="ghost"
                  />
                  <div
                    className="keeper-hud__reply-text brain-markdown"
                    dangerouslySetInnerHTML={{ __html: hud.replyHtml }}
                  />
                </>
              )}
            </div>
          ) : null}

          <footer className="keeper-hud__compose">
            {hud.speech.supported ? (
              <Button
                className={classNames(hud.speech.listening && 'keeper-hud__mic--on')}
                icon="mic"
                iconOnly
                onClick={hud.speech.toggle}
                size="md"
                title={hud.speech.error ?? (hud.speech.listening ? 'Stop listening' : 'Voice')}
                variant="ghost"
              />
            ) : null}
            <input
              className="keeper-hud__input"
              onChange={(event) => hud.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  hud.submit();
                }
              }}
              placeholder="Speak or type to The Keeper..."
              value={hud.input}
            />
            <Button disabled={!hud.input.trim()} icon="send" iconOnly onClick={hud.submit} size="md" variant="primary" />
          </footer>
        </div>
      ) : null}

      <button
        aria-label="Open Keeper HUD"
        className={classNames('keeper-hud__orb', `keeper-hud__orb--${hud.state}`)}
        onClick={hud.toggleExpanded}
        title="The Keeper"
        type="button"
      >
        <span className="keeper-hud__ring" />
        <span className="keeper-hud__ring keeper-hud__ring--second" />
        <span className="keeper-hud__core">
          <Icon name="logo" size={24} />
        </span>
        {awaiting.length > 0 ? <span className="keeper-hud__badge">{awaiting.length}</span> : null}
      </button>
    </div>
  );
};
