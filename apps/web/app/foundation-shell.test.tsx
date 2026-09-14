import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ErrorBoundary, HydrateFallback } from "./root";
import Home from "./routes/home";
import NotFound, { loader as notFoundLoader } from "./routes/not-found";

describe("CT foundation shell — responsive states", () => {
  it("renders semantic navigation and the focused empty workspace", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain('aria-label="Navegação principal"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("Um dia de cada vez.");
    expect(markup).toContain('href="/criar-conta"');
    expect(markup).not.toContain("Cloudflare Worker");
    expect(markup).not.toContain("Supabase");
  });

  it("keeps the loading shell stable and announces progress", () => {
    const markup = renderToStaticMarkup(<HydrateFallback />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Carregando");
  });

  it("returns a real 404 with a concise recovery path", () => {
    const response = notFoundLoader();
    const markup = renderToStaticMarkup(<NotFound />);

    expect(response.status).toBe(404);
    expect(markup).toContain("Página não encontrada");
    expect(markup).toContain("Voltar ao início");
  });

  it("does not expose internal errors", () => {
    const markup = renderToStaticMarkup(
      <ErrorBoundary error={new Error("private database detail")} />,
    );

    expect(markup).toContain("Não foi possível abrir esta página");
    expect(markup).not.toContain("private database detail");
  });
});
