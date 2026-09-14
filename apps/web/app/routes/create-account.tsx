import { useState, type FormEvent } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  maskEmail,
  requestConfirmationResend,
  requestRegistration,
  validateCaptchaToken,
  validateEmail,
  validateSignUp,
  type SignUpFieldErrors,
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
  { title: "Criar conta | SeekIn" },
  {
    name: "description",
    content: "Crie sua conta SeekIn com e-mail e senha.",
  },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return { "cache-control": "no-store" };
}

interface CheckEmailActionData {
  cooldownId: string;
  cooldownSeconds: number;
  email: string;
  error?: string;
  kind: "check-email";
  maskedEmail: string;
  notice?: string;
}

interface FormActionData {
  errors?: SignUpFieldErrors;
  kind: "form";
  message?: string;
  values?: { email: string };
}

type CreateAccountActionData = CheckEmailActionData | FormActionData;

interface CreateAccountLoaderData {
  siteKey: string | null;
}

export function loader({
  context,
}: LoaderFunctionArgs): CreateAccountLoaderData {
  return { siteKey: turnstileSiteKey(context) };
}

function checkEmailData(
  email: string,
  options: {
    cooldownSeconds?: number;
    error?: string;
    notice?: string;
  } = {},
): CheckEmailActionData {
  return {
    cooldownId: crypto.randomUUID(),
    cooldownSeconds: options.cooldownSeconds ?? 60,
    email,
    ...(options.error ? { error: options.error } : {}),
    kind: "check-email",
    maskedEmail: maskEmail(email),
    ...(options.notice ? { notice: options.notice } : {}),
  };
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<CreateAccountActionData | Response> {
  if (!isSameOriginSubmission(request)) {
    return Response.json(
      {
        kind: "form",
        message: "Não foi possível continuar agora. Tente novamente.",
      } satisfies FormActionData,
      { status: 403 },
    );
  }

  const formData = await readAuthFormData(request);
  if (!formData) {
    return {
      kind: "form",
      message: "Não foi possível continuar agora. Tente novamente.",
    };
  }

  const intent = formData.get("intent");
  if (intent === "resend") {
    const captchaToken = validateCaptchaToken(
      formData.get("cf-turnstile-response"),
    );
    const email = validateEmail(formData.get("email"));
    if (!email) {
      return {
        errors: { email: "Informe um e-mail válido." },
        kind: "form",
      };
    }

    if (!captchaToken) {
      return checkEmailData(email, {
        cooldownSeconds: 0,
        error: "Conclua a verificação de segurança e tente novamente.",
      });
    }

    const redirectUrl = confirmationUrl(request, context);
    if (!redirectUrl) {
      return {
        kind: "form",
        message: "Não foi possível continuar agora. Tente novamente.",
        values: { email },
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
        kind: "form",
        message: "Não foi possível continuar agora. Tente novamente.",
        values: { email },
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
        kind: "form",
        message: "Não foi possível continuar agora. Tente novamente.",
        values: { email },
      };
    }
    if (result === "challenge_failed") {
      return checkEmailData(email, {
        cooldownSeconds: 0,
        error: "Conclua a verificação de segurança e tente novamente.",
      });
    }

    return checkEmailData(email, {
      cooldownSeconds: result === "rate_limited" ? 120 : 60,
      notice:
        result === "rate_limited"
          ? "Aguarde alguns minutos antes de tentar novamente."
          : "Se o endereço ainda precisar de confirmação, um novo link será enviado.",
    });
  }

  const validation = validateSignUp(formData);
  if (!validation.ok) {
    return {
      errors: validation.errors,
      kind: "form",
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  if (!validation.input.captchaToken) {
    return {
      kind: "form",
      message: "Conclua a verificação de segurança e tente novamente.",
      values: { email: validation.input.email },
    };
  }

  const redirectUrl = confirmationUrl(request, context);
  if (!redirectUrl) {
    return {
      kind: "form",
      message: "Não foi possível continuar agora. Tente novamente.",
      values: { email: validation.input.email },
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
      kind: "form",
      message: "Não foi possível continuar agora. Tente novamente.",
      values: { email: validation.input.email },
    };
  }

  const result = await requestRegistration(
    gateway,
    validation.input,
    redirectUrl,
  );
  if (result === "unavailable") {
    return {
      kind: "form",
      message: "Não foi possível continuar agora. Tente novamente.",
      values: { email: validation.input.email },
    };
  }
  if (result === "challenge_failed") {
    return {
      kind: "form",
      message: "Conclua a verificação de segurança e tente novamente.",
      values: { email: validation.input.email },
    };
  }

  return checkEmailData(validation.input.email, {
    cooldownSeconds: result === "rate_limited" ? 120 : 60,
    ...(result === "rate_limited"
      ? { notice: "Aguarde alguns minutos antes de tentar novamente." }
      : {}),
  });
}

export default function CreateAccount() {
  const actionData = useActionData<CreateAccountActionData>();
  const { siteKey } = useLoaderData<CreateAccountLoaderData>();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState("");
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") !== "resend";

  if (actionData?.kind === "check-email") {
    if (!siteKey) return <UnavailableAccountCreation />;
    return (
      <AuthLayout>
        <CheckEmailState
          key={actionData.cooldownId}
          siteKey={siteKey}
          {...actionData}
        />
      </AuthLayout>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) {
      setOfflineMessage("");
      return;
    }

    event.preventDefault();
    setOfflineMessage("Conecte-se à internet para criar uma conta.");
  }

  const errors = actionData?.kind === "form" ? actionData.errors : undefined;
  const message = actionData?.kind === "form" ? actionData.message : undefined;
  const emailValue =
    actionData?.kind === "form" ? actionData.values?.email : undefined;

  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="create-account-title">
        <p className="eyebrow">Comece por aqui</p>
        <h1 id="create-account-title">Crie sua conta</h1>
        <p className="auth-intro">
          Organize seus estudos com um plano que respeita sua rotina.
        </p>

        <Form className="auth-form" method="post" onSubmit={handleSubmit}>
          <input name="intent" type="hidden" value="signup" />
          <TextField
            autoComplete="email"
            defaultValue={emailValue}
            error={errors?.email}
            label="E-mail"
            maxLength={254}
            name="email"
            required
            type="email"
          />
          <TextField
            autoComplete="new-password"
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
            error={errors?.password}
            hint="Use de 8 a 128 caracteres, com letras e números."
            label="Senha"
            maxLength={128}
            minLength={8}
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <TextField
            autoComplete="new-password"
            error={errors?.confirmPassword}
            label="Confirmar senha"
            maxLength={128}
            minLength={8}
            name="confirmPassword"
            required
            type={showPassword ? "text" : "password"}
          />

          {siteKey ? (
            <TurnstileWidget action="signup" siteKey={siteKey} />
          ) : (
            <p className="form-message form-message--error" role="alert">
              Não foi possível carregar a verificação de segurança.
            </p>
          )}

          {offlineMessage || message ? (
            <p className="form-message form-message--error" role="alert">
              {offlineMessage || message}
            </p>
          ) : null}

          <Button disabled={!siteKey} loading={isSubmitting} type="submit">
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </Button>
        </Form>
      </section>
    </AuthLayout>
  );
}

function UnavailableAccountCreation() {
  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="account-unavailable">
        <h1 id="account-unavailable">Cadastro indisponível</h1>
        <p>Não foi possível continuar agora. Tente novamente.</p>
      </section>
    </AuthLayout>
  );
}
