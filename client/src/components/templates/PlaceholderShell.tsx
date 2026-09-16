interface PlaceholderShellProps {
  children?: never;
}

export const PlaceholderShell: React.FC<PlaceholderShellProps> = () => (
  <main className="placeholder-shell">
    <section className="placeholder-shell__panel">
      <p className="placeholder-shell__eyebrow">TermHive v2</p>
      <h1>Client scaffold ready</h1>
      <p>Phase 0 foundation is in place.</p>
    </section>
  </main>
);
