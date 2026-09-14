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
        <a className="brand" href="/" aria-label="SeekIn — Início">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SeekIn</span>
        </a>
      </header>
      <main className="auth-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
