import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <header className="auth-topbar">
        <a className="auth-wordmark" href="/" aria-label="SeekIn — Início">
          SeekIn
        </a>
      </header>
      <main className="auth-main" id="main-content" tabIndex={-1}>
        <div className="auth-frame">
          <div className="auth-form-area">{children}</div>
          <aside
            className="auth-brand-panel"
            aria-label="Mensagem da marca SeekIn"
          >
            <div className="auth-brand-panel__flow" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-brand-panel__copy">
              <p>Seu tempo importa.</p>
              <h2>Um plano possível começa com a sua rotina.</h2>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
