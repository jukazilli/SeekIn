import { useEffect, useRef } from "react";
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
import {
  ensureProfile,
  ensureUserPreferences,
  updateOnboardingProgress,
  updateProfile,
  updateUserPreferences,
} from "@seekin/data-access";
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
import { parseOnboardingPreferences } from "../onboarding/preferences-flow";
import { profileTimezones } from "../profile/profile-flow";
import { Button } from "../ui/components/Button";

type OnboardingState = {
  preferences: {
    capacity_reserve_percent: number;
    minimum_session_minutes: number;
    preferred_session_minutes: number;
    revision: number;
    week_starts_on: number;
  };
  revision: number;
  step: 0 | 1 | 2;
  timezone: string;
};

export const meta: MetaFunction = () => [
  { title: "Começar | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];
export function headers() {
  return { "cache-control": "private, no-store" };
}

async function loadOnboarding(
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
  const preferences = await ensureUserPreferences(
    session.client,
    verified.userId,
  );
  if (!preferences) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  return { preferences, profile, session, userId: verified.userId };
}

function publicState(loaded: {
  preferences: NonNullable<Awaited<ReturnType<typeof ensureUserPreferences>>>;
  profile: NonNullable<Awaited<ReturnType<typeof ensureProfile>>>;
}): OnboardingState {
  const step = isAvailableOnboardingStep(loaded.profile.onboarding_step)
    ? loaded.profile.onboarding_step
    : 1;
  return {
    preferences: {
      capacity_reserve_percent: loaded.preferences.capacity_reserve_percent,
      minimum_session_minutes: loaded.preferences.minimum_session_minutes,
      preferred_session_minutes: loaded.preferences.preferred_session_minutes,
      revision: loaded.preferences.revision,
      week_starts_on: loaded.preferences.week_starts_on,
    },
    revision: loaded.profile.revision,
    step,
    timezone: loaded.profile.timezone,
  };
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const loaded = await loadOnboarding(request, context);
  if ("response" in loaded) return loaded.response;
  if (loaded.profile.onboarding_status === "completed") {
    return redirect("/app", { headers: loaded.session.headers });
  }
  return Response.json(publicState(loaded), {
    headers: loaded.session.headers,
  });
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (!isSameOriginSubmission(request))
    throw new Response("Solicitação inválida", { status: 403 });
  const formData = await readAuthFormData(request);
  if (!formData) throw new Response("Solicitação inválida", { status: 400 });
  if (formData.get("intent") === "logout") {
    const session = createRequestSessionClient(request, context);
    if (session)
      try {
        await session.auth.signOut({ scope: "local" });
      } catch {
        /* limpeza local abaixo */
      }
    return redirect("/entrar?status=signed-out", {
      headers: clearPrivateBrowserDataHeaders(request, session?.headers),
    });
  }

  const loaded = await loadOnboarding(request, context);
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
  if (targetStep === null)
    throw new Response("Solicitação inválida", { status: 400 });

  let profileRevision = revision;
  let savedPreferences = loaded.preferences;
  let savedTimezone = loaded.profile.timezone;
  if (currentStep === 1 && targetStep === 2) {
    const input = parseOnboardingPreferences(formData);
    const preferencesRevision = Number(formData.get("preferencesRevision"));
    if (!input || preferencesRevision !== loaded.preferences.revision) {
      return Response.json(
        { error: "Revise os valores informados." },
        { headers: loaded.session.headers, status: 400 },
      );
    }
    const profile = await updateProfile(
      loaded.session.client,
      loaded.userId,
      revision,
      {
        displayName: loaded.profile.display_name,
        timezone: input.timezone,
      },
    );
    if (!profile)
      return Response.json(
        { error: "Seu progresso mudou. Recarregue para continuar." },
        { headers: loaded.session.headers, status: 409 },
      );
    profileRevision = profile.revision;
    savedTimezone = profile.timezone;
    const preferencesInput = {
      capacity_reserve_percent: input.capacity_reserve_percent,
      minimum_session_minutes: input.minimum_session_minutes,
      preferred_session_minutes: input.preferred_session_minutes,
      week_starts_on: input.week_starts_on,
    };
    const preferences = await updateUserPreferences(
      loaded.session.client,
      loaded.userId,
      preferencesRevision,
      preferencesInput,
    );
    if (!preferences)
      return Response.json(
        { error: "Não foi possível salvar. Recarregue e tente novamente." },
        { headers: loaded.session.headers, status: 409 },
      );
    savedPreferences = preferences;
  }

  const updated = await updateOnboardingProgress(
    loaded.session.client,
    loaded.userId,
    profileRevision,
    targetStep,
  );
  if (!updated)
    return Response.json(
      { error: "Não foi possível salvar seu progresso. Tente novamente." },
      { headers: loaded.session.headers, status: 409 },
    );
  return Response.json(
    {
      preferences: {
        capacity_reserve_percent: savedPreferences.capacity_reserve_percent,
        minimum_session_minutes: savedPreferences.minimum_session_minutes,
        preferred_session_minutes: savedPreferences.preferred_session_minutes,
        revision: savedPreferences.revision,
        week_starts_on: savedPreferences.week_starts_on,
      },
      revision: updated.revision,
      step: targetStep,
      timezone: savedTimezone,
    } satisfies OnboardingState,
    { headers: loaded.session.headers },
  );
}

const weekDays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function PreferencesFields({ state }: Readonly<{ state: OnboardingState }>) {
  return (
    <div className="onboarding-preferences">
      <input
        name="preferencesRevision"
        type="hidden"
        value={state.preferences.revision}
      />
      <label>
        <span>Fuso horário</span>
        <select name="timezone" defaultValue={state.timezone}>
          {profileTimezones.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Minha semana começa</span>
        <select
          name="weekStartsOn"
          defaultValue={state.preferences.week_starts_on}
        >
          {weekDays.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Sessão padrão</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={240}
            min={5}
            name="preferredSessionMinutes"
            defaultValue={state.preferences.preferred_session_minutes}
            type="number"
          />
          <span>min</span>
        </span>
      </label>
      <label>
        <span>Sessão mínima</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={240}
            min={5}
            name="minimumSessionMinutes"
            defaultValue={state.preferences.minimum_session_minutes}
            type="number"
          />
          <span>min</span>
        </span>
      </label>
      <label>
        <span>Reserva de tempo livre</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={50}
            min={0}
            name="capacityReservePercent"
            defaultValue={state.preferences.capacity_reserve_percent}
            type="number"
          />
          <span>%</span>
        </span>
      </label>
    </div>
  );
}

export default function Onboarding() {
  const loaded = useLoaderData() as OnboardingState;
  const actionData = useActionData() as
    { error: string } | OnboardingState | undefined;
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
            style={{ width: `${(state.step / onboardingStepCount) * 100}%` }}
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
          ) : state.step === 1 ? (
            <>
              <p className="eyebrow">Preferências</p>
              <h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>
                Primeiro, acerte o ritmo.
              </h1>
              <p className="onboarding-lead">
                Defina como sua semana funciona.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Disponibilidade</p>
              <h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>
                Quando você costuma ter tempo livre?
              </h1>
            </>
          )}
          {actionData && "error" in actionData ? (
            <p className="form-message form-message--error" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <Form className="onboarding-form" method="post">
            <input name="revision" type="hidden" value={state.revision} />
            <input name="currentStep" type="hidden" value={state.step} />
            {state.step === 1 ? <PreferencesFields state={state} /> : null}
            <div className="onboarding-actions">
              {state.step > 0 ? (
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
              {state.step === 1 ? (
                <Button name="intent" value="next" loading={isBusy}>
                  Continuar
                </Button>
              ) : null}
            </div>
          </Form>
        </section>
      </main>
    </div>
  );
}
