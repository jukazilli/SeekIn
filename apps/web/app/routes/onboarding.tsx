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
import { useEffect, useRef } from "react";

import { ensureProfile, updateOnboardingProgress } from "@seekin/data-access";

import { readVerifiedSession } from "../auth/session-flow";
import {
  clearPrivateBrowserDataHeaders,
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
import {
  isAvailableOnboardingStep,
  onboardingStepCount,
  parseOnboardingMove,
} from "../onboarding/onboarding-flow";
import { Button } from "../ui/components/Button";

export const meta: MetaFunction = () => [
  { title: "Começar | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return { "cache-control": "private, no-store" };
}

async function loadProfile(
  request: Request,
  context: LoaderFunctionArgs["context"],
) {
  const session = createRequestSessionClient(request, context);
  if (!session) throw new Response("Serviço indisponível", { status: 503 });

  const verified = await readVerifiedSession(session.auth);
  if (verified.kind === "unavailable") {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  if (verified.kind === "anonymous") {
    return {
      response: redirect("/entrar?next=%2Fonboarding", {
        headers: session.headers,
      }),
    };
  }

  const profile = await ensureProfile(session.client, verified.userId);
  if (!profile) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }

  return { profile, session, userId: verified.userId };
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const loaded = await loadProfile(request, context);
  if ("response" in loaded) return loaded.response;
  if (loaded.profile.onboarding_status === "completed") {
    return redirect("/app", { headers: loaded.session.headers });
  }

  const step = isAvailableOnboardingStep(loaded.profile.onboarding_step)
    ? loaded.profile.onboarding_step
    : 1;
  return Response.json(
    { revision: loaded.profile.revision, step },
    { headers: loaded.session.headers },
  );
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (!isSameOriginSubmission(request)) {
    throw new Response("Solicitação inválida", { status: 403 });
  }
  const formData = await readAuthFormData(request);
  if (!formData) throw new Response("Solicitação inválida", { status: 400 });

  if (formData.get("intent") === "logout") {
    const session = createRequestSessionClient(request, context);
    if (session) {
      try {
        await session.auth.signOut({ scope: "local" });
      } catch {
        // A limpeza local mantém este dispositivo em estado anônimo.
      }
    }
    return redirect("/entrar?status=signed-out", {
      headers: clearPrivateBrowserDataHeaders(request, session?.headers),
    });
  }

  const loaded = await loadProfile(request, context);
  if ("response" in loaded) return loaded.response;
  if (loaded.profile.onboarding_status === "completed") {
    return redirect("/app", { headers: loaded.session.headers });
  }

  const revision = Number(formData.get("revision"));
  const currentStep = Number(formData.get("currentStep"));
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    currentStep !== loaded.profile.onboarding_step
  ) {
    return Response.json(
      { error: "Seu progresso mudou. Recarregue para continuar." },
      { headers: loaded.session.headers, status: 409 },
    );
  }

  const targetStep = parseOnboardingMove(formData, currentStep);
  if (targetStep === null) {
    throw new Response("Solicitação inválida", { status: 400 });
  }

  const updated = await updateOnboardingProgress(
    loaded.session.client,
    loaded.userId,
    revision,
    targetStep,
  );
  if (!updated) {
    return Response.json(
      { error: "Não foi possível salvar seu progresso. Tente novamente." },
      { headers: loaded.session.headers, status: 409 },
    );
  }

  return Response.json(
    { revision: updated.revision, step: updated.onboarding_step },
    { headers: loaded.session.headers },
  );
}

export default function Onboarding() {
  const loaded = useLoaderData() as { revision: number; step: 0 | 1 };
  const actionData = useActionData() as
    { error: string } | { revision: number; step: 0 | 1 } | undefined;
  const navigation = useNavigation();
  const state = actionData && "step" in actionData ? actionData : loaded;
  const isBusy = navigation.state !== "idle";
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (actionData && "step" in actionData) titleRef.current?.focus();
  }, [actionData]);

  return (
    <div className="onboarding-shell">
      <header className="onboarding-topbar">
        <a
          className="onboarding-wordmark"
          href="/onboarding"
          aria-label="SeekIn"
        >
          <img
            src="/brand/logo/seekin-wordmark.png"
            alt="SeekIn"
            width={2172}
            height={724}
          />
        </a>
        <div className="onboarding-utility">
          <span className="onboarding-progress">
            {state.step === 0
              ? "Boas-vindas"
              : `Etapa ${state.step} de ${onboardingStepCount}`}
          </span>
          <Form method="post">
            <button
              className="sign-out-button"
              disabled={isBusy}
              name="intent"
              type="submit"
              value="logout"
            >
              Sair
            </button>
          </Form>
        </div>
      </header>

      <main className="onboarding-main" id="main-content">
        <div className="onboarding-track" aria-hidden="true">
          <span
            style={{
              width: `${(state.step / onboardingStepCount) * 100}%`,
            }}
          />
        </div>

        <section className="onboarding-step" aria-labelledby="onboarding-title">
          {state.step === 0 ? (
            <>
              <p className="eyebrow">Boas-vindas</p>
              <h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>
                Vamos montar um plano que caiba na sua rotina.
              </h1>
              <p className="onboarding-lead">
                Você informa seu tempo e o que precisa entregar. O SeekIn
                organiza o caminho.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Preferências</p>
              <h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>
                Primeiro, acerte o ritmo.
              </h1>
              <p className="onboarding-lead">
                Suas escolhas de tempo aparecem aqui na próxima etapa.
              </p>
            </>
          )}

          {actionData && "error" in actionData ? (
            <p className="form-message form-message--error" role="alert">
              {actionData.error}
            </p>
          ) : null}

          <Form className="onboarding-actions" method="post">
            <input name="revision" type="hidden" value={state.revision} />
            <input name="currentStep" type="hidden" value={state.step} />
            {state.step === 1 ? (
              <Button
                name="intent"
                value="back"
                variant="secondary"
                loading={isBusy}
              >
                Voltar
              </Button>
            ) : null}
            {state.step === 0 ? (
              <Button name="intent" value="next" loading={isBusy}>
                Começar
              </Button>
            ) : null}
          </Form>
        </section>
      </main>
    </div>
  );
}
