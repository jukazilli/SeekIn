import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { readVerifiedSession } from "../auth/session-flow";
import { createRequestSessionClient } from "../auth/runtime-auth";
import { AppShell } from "../ui/components/AppShell";

export const meta: MetaFunction = () => [
  { title: "Início | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return { "cache-control": "private, no-store" };
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const session = createRequestSessionClient(request, context);
  if (!session) {
    throw new Response("Serviço indisponível", { status: 503 });
  }

  const verified = await readVerifiedSession(session.auth);
  if (verified.kind === "unavailable") {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  if (verified.kind === "anonymous") {
    const url = new URL(request.url);
    const next = `${url.pathname}${url.search}`;
    return redirect(`/entrar?next=${encodeURIComponent(next)}`, {
      headers: session.headers,
    });
  }

  return Response.json({ authenticated: true }, { headers: session.headers });
}

export default function AuthenticatedHome() {
  return (
    <AppShell homeHref="/app">
      <section className="workspace-heading" aria-labelledby="app-title">
        <p className="eyebrow">Conta conectada</p>
        <h1 id="app-title">Bem-vindo ao SeekIn</h1>
        <p>Seu próximo passo é configurar sua rotina.</p>
      </section>
    </AppShell>
  );
}
