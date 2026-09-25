interface KeeperHudProps {
  message: string;
  visible: boolean;
}
export const KeeperHud: React.FC<KeeperHudProps> = ({ message, visible }) => (
  <aside className={`hive-keeper${visible ? ' hive-keeper--visible' : ''}`}>
    <span>✦</span>
    {message}
  </aside>
);
