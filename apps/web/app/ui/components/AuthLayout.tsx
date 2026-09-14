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
          <img
            src="/brand/logo/seekin-wordmark.png"
            alt="SeekIn"
            width={2172}
            height={724}
          />
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
            <img
              className="auth-brand-panel__mascot"
              src="/brand/mascot/seekin-dolphin.png"
              alt=""
              width={1024}
              height={1536}
              aria-hidden="true"
            />
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
