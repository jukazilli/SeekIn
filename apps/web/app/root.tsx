import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { LinksFunction, MetaFunction } from "react-router";

import "@fontsource-variable/manrope";

import stylesheet from "./app.css?url";
import { AppShell } from "./ui/components/AppShell";
import { FoundationLoading } from "./ui/components/FoundationLoading";
import { Icon } from "./ui/icons/Icon";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: MetaFunction = () => [
  { title: "SeekIn" },
  {
    name: "description",
    content: "Planejamento de estudos orientado por capacidade e prioridade.",
  },
];

export function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <FoundationLoading />;
}

export function ErrorBoundary({ error }: Readonly<{ error: unknown }>) {
  const status = isRouteErrorResponse(error) ? error.status : 500;

  return (
    <AppShell>
      <section className="state-page" aria-labelledby="error-title">
        <div className="state-page__content">
          <p className="eyebrow">Erro {status}</p>
          <h1 id="error-title">Não foi possível abrir esta página</h1>
          <p>Tente novamente ou volte ao início.</p>
          <a className="primary-link" href="/">
            <Icon name="arrow-left" size={18} />
            Voltar ao início
          </a>
        </div>
      </section>
    </AppShell>
  );
}
