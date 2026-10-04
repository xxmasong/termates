interface KeeperHudProps {
  message: string;
  visible: boolean;
}
export const KeeperHud: React.FC<KeeperHudProps> = ({ message, visible }) => (
  <aside className={`team-keeper${visible ? ' team-keeper--visible' : ''}`}>
    <span>✦</span>
    {message}
  </aside>
);
