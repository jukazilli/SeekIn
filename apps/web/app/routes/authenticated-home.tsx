import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { readVerifiedSession } from "../auth/session-flow";
import { ensureProfile, updateProfile } from "@seekin/data-access";
import {
  clearPrivateBrowserDataHeaders,
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
import { AppShell } from "../ui/components/AppShell";
import {
  parseProfileInput,
  profileTimezones,
  type EditableProfile,
} from "../profile/profile-flow";

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

  const profile = await ensureProfile(session.client, verified.userId);
  if (!profile) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }

  if (profile.onboarding_status !== "completed") {
    return redirect("/onboarding", { headers: session.headers });
  }

  return Response.json(
    {
      profile: {
        display_name: profile.display_name,
        revision: profile.revision,
        timezone: profile.timezone,
      },
    },
    { headers: session.headers },
  );
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (!isSameOriginSubmission(request)) {
    throw new Response("Solicitação inválida", { status: 403 });
  }

  const formData = await readAuthFormData(request);
  if (!formData) {
    throw new Response("Solicitação inválida", { status: 400 });
  }

  const session = createRequestSessionClient(request, context);
  if (formData.get("intent") === "logout") {
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

  if (formData.get("intent") !== "save-profile" || !session) {
    throw new Response("Solicitação inválida", { status: 400 });
  }

  const verified = await readVerifiedSession(session.auth);
  if (verified.kind === "unavailable") {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  if (verified.kind === "anonymous") {
    return redirect("/entrar?next=%2Fapp", { headers: session.headers });
  }

  const input = parseProfileInput(formData);
  const revision = Number(formData.get("revision"));
  if (!input || !Number.isSafeInteger(revision) || revision < 1) {
    return Response.json(
      { error: "Revise os dados informados." },
      { headers: session.headers, status: 400 },
    );
  }

  const profile = await updateProfile(
    session.client,
    verified.userId,
    revision,
    input,
  );
  if (!profile) {
    return Response.json(
      {
        error:
          "O perfil mudou ou não pôde ser salvo. Recarregue e tente novamente.",
      },
      { headers: session.headers, status: 409 },
    );
  }

  return Response.json(
    {
      saved: true,
      profile: {
        display_name: profile.display_name,
        revision: profile.revision,
        timezone: profile.timezone,
      },
    },
    { headers: session.headers },
  );
}

export default function AuthenticatedHome() {
  const { profile } = useLoaderData() as { profile: EditableProfile };
  const actionData = useActionData() as
    { error: string } | { profile: EditableProfile; saved: true } | undefined;
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
        <p className="eyebrow">Perfil</p>
        <h1 id="app-title">Como você quer ser chamado?</h1>
        <p>
          Salve seu nome e o fuso usado pelo SeekIn para organizar seus
          horários.
        </p>
      </section>
      <Form className="profile-form" method="post">
        <input name="intent" type="hidden" value="save-profile" />
        <input name="revision" type="hidden" value={profile.revision} />
        <label htmlFor="display-name">Nome</label>
        <input
          id="display-name"
          maxLength={80}
          name="displayName"
          defaultValue={profile.display_name ?? ""}
        />
        <label htmlFor="timezone">Fuso horário</label>
        <select id="timezone" name="timezone" defaultValue={profile.timezone}>
          {profileTimezones.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone.replace("_", " ")}
            </option>
          ))}
        </select>
        {actionData && "error" in actionData ? (
          <p className="form-message form-message--error" role="alert">
            {actionData.error}
          </p>
        ) : null}
        {actionData && "saved" in actionData ? (
          <p className="form-message form-message--success" role="status">
            Perfil salvo.
          </p>
        ) : null}
        <button
          className="button button--primary"
          disabled={navigation.state !== "idle"}
          type="submit"
        >
          {navigation.state === "submitting" ? "Salvando…" : "Salvar perfil"}
        </button>
      </Form>
    </AppShell>
  );
}
