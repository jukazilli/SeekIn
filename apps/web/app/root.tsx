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

import stylesheet from "./app.css?url";

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

export function ErrorBoundary({ error }: Readonly<{ error: unknown }>) {
  const title = isRouteErrorResponse(error)
    ? `${error.status}`
    : "Algo deu errado";
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : "Não foi possível concluir esta solicitação.";

  return (
    <main className="centered-page" aria-labelledby="error-title">
      <section className="foundation-card">
        <p className="eyebrow">SeekIn</p>
        <h1 id="error-title">{title}</h1>
        <p>{message}</p>
        <a className="primary-link" href="/">
          Voltar ao início
        </a>
      </section>
    </main>
  );
}
