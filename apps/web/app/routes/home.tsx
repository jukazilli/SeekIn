import { AppShell } from "../ui/components/AppShell";

export default function Home() {
  return (
    <AppShell>
      <header className="workspace-heading">
        <p className="eyebrow">Seu espaço</p>
        <h1>Início</h1>
      </header>

      <section className="focus-field" aria-labelledby="welcome-title">
        <div className="focus-field__copy">
          <h2 id="welcome-title">Um dia de cada vez.</h2>
          <p>Seu planejamento vai ganhar forma aqui.</p>
        </div>
        <div className="focus-field__mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </AppShell>
  );
}
