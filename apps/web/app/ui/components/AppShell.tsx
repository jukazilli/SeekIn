import type { ReactNode } from "react";

import { Icon } from "../icons/Icon";

interface AppShellProps {
  busy?: boolean;
  children: ReactNode;
}

function HomeLink({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <a
      aria-current="page"
      className={compact ? "nav-link nav-link--compact" : "nav-link"}
      href="/"
    >
      <Icon name="home" size={compact ? 22 : 20} />
      <span>Início</span>
    </a>
  );
}

export function AppShell({ busy = false, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <header className="topbar">
        <a className="brand" href="/" aria-label="SeekIn — Início">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SeekIn</span>
        </a>
      </header>

      <aside className="sidebar">
        <nav aria-label="Navegação principal">
          <HomeLink />
        </nav>
      </aside>

      <main
        aria-busy={busy || undefined}
        className="workspace"
        id="main-content"
        tabIndex={-1}
      >
        {children}
      </main>

      <nav className="bottom-navigation" aria-label="Navegação principal">
        <HomeLink compact />
      </nav>
    </div>
  );
}
