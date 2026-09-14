import { useState, type FormEvent } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  readVerifiedSession,
  requestLogin,
  safeReturnPath,
  validateLogin,
  type LoginFieldErrors,
} from "../auth/session-flow";
import {
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
  turnstileSiteKey,
} from "../auth/runtime-auth";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { AuthLayout } from "../ui/components/AuthLayout";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { Icon } from "../ui/icons/Icon";

export const meta: MetaFunction = () => [
  { title: "Entrar | SeekIn" },
  { name: "description", content: "Entre na sua conta SeekIn." },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return { "cache-control": "no-store" };
}

interface LoginLoaderData {
  next: string;
  signedOut: boolean;
  siteKey: string | null;
}

interface LoginActionData {
  errors?: LoginFieldErrors;
  message?: string;
  values?: { email: string };
}

export async function loader({
  context,
  request,
}: LoaderFunctionArgs): Promise<LoginLoaderData | Response> {
  const next = safeReturnPath(new URL(request.url).searchParams.get("next"));
  const signedOut =
    new URL(request.url).searchParams.get("status") === "signed-out";
  const session = createRequestSessionClient(request, context);
  if (session) {
    const verified = await readVerifiedSession(session.auth);
    if (verified.kind === "authenticated") {
      return redirect(next, { headers: session.headers });
    }
    return Response.json(
      { next, signedOut, siteKey: turnstileSiteKey(context) },
      { headers: session.headers },
    );
  }

  return { next, signedOut, siteKey: turnstileSiteKey(context) };
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<LoginActionData | Response> {
  if (!isSameOriginSubmission(request)) {
    return Response.json(
      { message: "Não foi possível continuar agora. Tente novamente." },
      { status: 403 },
    );
  }

  const formData = await readAuthFormData(request);
  if (!formData) {
    return { message: "Não foi possível continuar agora. Tente novamente." };
  }

  const validation = validateLogin(formData);
  if (!validation.ok) {
    return {
      errors: validation.errors,
      values: { email: String(formData.get("email") ?? "") },
    };
  }
  if (!validation.input.captchaToken) {
    return {
      message: "Conclua a verificação de segurança e tente novamente.",
      values: { email: validation.input.email },
    };
  }

  const session = createRequestSessionClient(request, context);
  if (!session) {
    return {
      message: "Não foi possível continuar agora. Tente novamente.",
      values: { email: validation.input.email },
    };
  }

  const result = await requestLogin(session.auth, validation.input);
  if (result === "authenticated") {
    return redirect(safeReturnPath(String(formData.get("next") ?? "")), {
      headers: session.headers,
    });
  }

  const message =
    result === "challenge_failed"
      ? "Conclua a verificação de segurança e tente novamente."
      : result === "rate_limited"
        ? "Aguarde alguns minutos antes de tentar novamente."
        : result === "unavailable"
          ? "Não foi possível continuar agora. Tente novamente."
          : "Não foi possível entrar. Confira os dados e tente novamente.";
  return { message, values: { email: validation.input.email } };
}

export default function Login() {
  const actionData = useActionData<LoginActionData>();
  const { next, signedOut, siteKey } = useLoaderData<LoginLoaderData>();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState("");
  const isSubmitting = navigation.state === "submitting";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) {
      setOfflineMessage("");
      return;
    }
    event.preventDefault();
    setOfflineMessage("Conecte-se à internet para entrar.");
  }

  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">Que bom ter você de volta</p>
        <h1 id="login-title">Entre na sua conta</h1>
        <p className="auth-intro">Continue de onde parou.</p>

        {signedOut ? (
          <p className="form-message form-message--success" role="status">
            Você saiu da sua conta.
          </p>
        ) : null}

        <Form className="auth-form" method="post" onSubmit={handleSubmit}>
          <input name="next" type="hidden" value={next} />
          <TextField
            autoComplete="email"
            defaultValue={actionData?.values?.email}
            error={actionData?.errors?.email}
            label="E-mail"
            maxLength={254}
            name="email"
            required
            type="email"
          />
          <TextField
            autoComplete="current-password"
            endAction={
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="field-icon-button"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                <Icon
                  name={showPassword ? "hide-password" : "show-password"}
                  size={20}
                />
              </button>
            }
            error={actionData?.errors?.password}
            label="Senha"
            maxLength={128}
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />

          {siteKey ? (
            <TurnstileWidget action="login" siteKey={siteKey} />
          ) : (
            <p className="form-message form-message--error" role="alert">
              Não foi possível carregar a verificação de segurança.
            </p>
          )}

          {offlineMessage || actionData?.message ? (
            <p className="form-message form-message--error" role="alert">
              {offlineMessage || actionData?.message}
            </p>
          ) : null}

          <Button disabled={!siteKey} loading={isSubmitting} type="submit">
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </Form>

        <p className="auth-switch">
          Primeira vez aqui? <Link to="/criar-conta">Criar conta</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
