import { useState, type FormEvent } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  maskEmail,
  requestConfirmationResend,
  validateCaptchaToken,
  validateEmail,
} from "../auth/account-flow";
import { CheckEmailState } from "../auth/CheckEmailState";
import {
  confirmationUrl,
  createRequestAuthGateway,
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
  { title: "E-mail confirmado | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return { "cache-control": "no-store" };
}

interface ResendActionData {
  cooldownId?: string;
  cooldownSeconds?: number;
  email?: string;
  error?: string;
  kind: "form" | "sent";
  maskedEmail?: string;
  notice?: string;
}

interface EmailConfirmedLoaderData {
  siteKey: string | null;
}

export function loader({
  context,
}: LoaderFunctionArgs): EmailConfirmedLoaderData {
  return { siteKey: turnstileSiteKey(context) };
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<ResendActionData | Response> {
  if (!isSameOriginSubmission(request)) {
    return Response.json(
      {
        error: "Não foi possível continuar agora. Tente novamente.",
        kind: "form",
      } satisfies ResendActionData,
      { status: 403 },
    );
  }

  const formData = await readAuthFormData(request);
  if (!formData) {
    return {
      error: "Não foi possível continuar agora. Tente novamente.",
      kind: "form",
    };
  }
  const captchaToken = validateCaptchaToken(
    formData.get("cf-turnstile-response"),
  );
  const email = validateEmail(formData.get("email"));
  if (!email) {
    return { error: "Informe um e-mail válido.", kind: "form" };
  }

  if (!captchaToken) {
    return {
      email,
      error: "Conclua a verificação de segurança e tente novamente.",
      kind: "form",
    };
  }

  let gateway;
  try {
    gateway = createRequestAuthGateway(context);
  } catch {
    gateway = null;
  }
  if (!gateway) {
    return {
      email,
      error: "Não foi possível continuar agora. Tente novamente.",
      kind: "form",
    };
  }

  const redirectUrl = confirmationUrl(request, context);
  if (!redirectUrl) {
    return {
      email,
      error: "Não foi possível continuar agora. Tente novamente.",
      kind: "form",
    };
  }

  const result = await requestConfirmationResend(
    gateway,
    captchaToken,
    email,
    redirectUrl,
  );
  if (result === "unavailable") {
    return {
      email,
      error: "Não foi possível continuar agora. Tente novamente.",
      kind: "form",
    };
  }
  if (result === "challenge_failed") {
    return {
      email,
      error: "Conclua a verificação de segurança e tente novamente.",
      kind: "form",
    };
  }

  return {
    cooldownId: crypto.randomUUID(),
    cooldownSeconds: result === "rate_limited" ? 120 : 60,
    email,
    kind: "sent",
    maskedEmail: maskEmail(email),
    notice:
      result === "rate_limited"
        ? "Aguarde alguns minutos antes de tentar novamente."
        : "Se o endereço ainda precisar de confirmação, um novo link será enviado.",
  };
}

export default function EmailConfirmed() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ResendActionData>();
  const { siteKey } = useLoaderData<EmailConfirmedLoaderData>();
  const navigation = useNavigation();
  const [offlineMessage, setOfflineMessage] = useState("");
  const status = searchParams.get("status");
  const isSubmitting = navigation.state === "submitting";

  if (
    actionData?.kind === "sent" &&
    actionData.email &&
    actionData.maskedEmail &&
    actionData.cooldownSeconds !== undefined &&
    siteKey
  ) {
    return (
      <AuthLayout>
        <CheckEmailState
          cooldownSeconds={actionData.cooldownSeconds}
          email={actionData.email}
          key={actionData.cooldownId}
          maskedEmail={actionData.maskedEmail}
          notice={actionData.notice}
          siteKey={siteKey}
        />
      </AuthLayout>
    );
  }

  if (status === "confirmed") {
    return (
      <AuthLayout>
        <section
          className="auth-panel auth-panel--status"
          aria-labelledby="confirmed-title"
        >
          <span
            className="auth-status-icon auth-status-icon--success"
            aria-hidden="true"
          >
            <Icon name="lock" size={26} />
          </span>
          <p className="eyebrow">Conta verificada</p>
          <h1 id="confirmed-title">E-mail confirmado</h1>
          <p>Sua conta está pronta para continuar.</p>
          <Link className="button button--primary" to="/">
            Come&ccedil;ar
          </Link>
        </section>
      </AuthLayout>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) {
      setOfflineMessage("");
      return;
    }
    event.preventDefault();
    setOfflineMessage("Conecte-se à internet para enviar um novo link.");
  }

  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="invalid-link-title">
        <p className="eyebrow">Verificação</p>
        <h1 id="invalid-link-title">O link não está mais disponível</h1>
        <p className="auth-intro">Informe seu e-mail para solicitar um novo.</p>
        <Form className="auth-form" method="post" onSubmit={handleSubmit}>
          <TextField
            autoComplete="email"
            defaultValue={actionData?.email}
            error={
              actionData?.error?.startsWith("Informe")
                ? actionData.error
                : undefined
            }
            label="E-mail"
            maxLength={254}
            name="email"
            required
            type="email"
          />
          {siteKey ? (
            <TurnstileWidget action="resend_confirmation" siteKey={siteKey} />
          ) : (
            <p className="form-message form-message--error" role="alert">
              Não foi possível carregar a verificação de segurança.
            </p>
          )}
          {offlineMessage ||
          (actionData?.error && !actionData.error.startsWith("Informe")) ? (
            <p className="form-message form-message--error" role="alert">
              {offlineMessage || actionData?.error}
            </p>
          ) : null}
          <Button disabled={!siteKey} loading={isSubmitting} type="submit">
            {isSubmitting ? "Enviando…" : "Enviar novo link"}
          </Button>
        </Form>
      </section>
    </AuthLayout>
  );
}
