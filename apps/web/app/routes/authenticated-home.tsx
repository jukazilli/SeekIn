import {
  Form,
  redirect,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { readVerifiedSession } from "../auth/session-flow";
import {
  clearPrivateBrowserDataHeaders,
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
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

export async function action({ context, request }: ActionFunctionArgs) {
  if (!isSameOriginSubmission(request)) {
    throw new Response("Solicitação inválida", { status: 403 });
  }

  const formData = await readAuthFormData(request);
  if (!formData || formData.get("intent") !== "logout") {
    throw new Response("Solicitação inválida", { status: 400 });
  }

  const session = createRequestSessionClient(request, context);
  if (session) {
    try {
      await session.auth.signOut({ scope: "local" });
    } catch {
      // A limpeza local abaixo mantém este dispositivo em estado anônimo.
    }
  }

  return redirect("/entrar?status=signed-out", {
    headers: clearPrivateBrowserDataHeaders(request, session?.headers),
  });
}

export default function AuthenticatedHome() {
  const navigation = useNavigation();
  const isSigningOut =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "logout";

  return (
    <AppShell
      homeHref="/app"
      utility={
        <Form method="post">
          <input name="intent" type="hidden" value="logout" />
          <button
            className="sign-out-button"
            disabled={isSigningOut}
            type="submit"
          >
            {isSigningOut ? "Saindo…" : "Sair"}
          </button>
        </Form>
      }
    >
      <section className="workspace-heading" aria-labelledby="app-title">
        <p className="eyebrow">Conta conectada</p>
        <h1 id="app-title">Bem-vindo ao SeekIn</h1>
        <p>Seu próximo passo é configurar sua rotina.</p>
      </section>
    </AppShell>
  );
}
