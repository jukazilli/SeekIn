import { AppShell } from "./AppShell";

export function FoundationLoading() {
  return (
    <AppShell busy>
      <section className="loading-state" role="status" aria-live="polite">
        <span className="visually-hidden">Carregando</span>
        <div className="skeleton skeleton--eyebrow" aria-hidden="true" />
        <div className="skeleton skeleton--title" aria-hidden="true" />
        <div className="skeleton skeleton--field" aria-hidden="true" />
      </section>
    </AppShell>
  );
}
