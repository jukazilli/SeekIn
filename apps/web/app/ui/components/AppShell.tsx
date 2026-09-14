import type { ReactNode } from "react";

import { Icon } from "../icons/Icon";

interface AppShellProps {
  busy?: boolean;
  children: ReactNode;
  homeHref?: string;
  utility?: ReactNode;
}

function HomeLink({
  compact = false,
  href,
}: Readonly<{ compact?: boolean; href: string }>) {
  return (
    <a
      aria-current="page"
      className={compact ? "nav-link nav-link--compact" : "nav-link"}
      href={href}
    >
      <Icon name="home" size={compact ? 22 : 20} />
      <span>Início</span>
    </a>
  );
}

export function AppShell({
  busy = false,
  children,
  homeHref = "/",
  utility,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <header className="topbar">
        <a className="brand" href={homeHref} aria-label="SeekIn — Início">
          <img
            src="/brand/logo/seekin-wordmark.png"
            alt="SeekIn"
            width={2172}
            height={724}
          />
        </a>
        {utility ? <div className="topbar-utility">{utility}</div> : null}
      </header>

      <aside className="sidebar">
        <nav aria-label="Navegação principal">
          <HomeLink href={homeHref} />
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
        <HomeLink compact href={homeHref} />
      </nav>
    </div>
  );
}
