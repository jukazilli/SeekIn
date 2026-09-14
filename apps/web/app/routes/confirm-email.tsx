import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
  type MetaFunction,
} from "react-router";

import { confirmEmail } from "../auth/account-flow";
import {
  createRequestAuthGateway,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
import { AuthLayout } from "../ui/components/AuthLayout";
import { Button } from "../ui/components/Button";
import { Icon } from "../ui/icons/Icon";

export const meta: MetaFunction = () => [
  { title: "Confirmar e-mail | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];

export function headers() {
  return {
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  };
}

interface ConfirmActionData {
  kind: "unavailable";
}

function confirmationRedirect(destination: string) {
  return redirect(destination, {
    headers: {
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<ConfirmActionData | Response> {
  if (!isSameOriginSubmission(request)) {
    return confirmationRedirect("/conta-confirmada?status=invalid");
  }

  const formData = await readAuthFormData(request);
  if (!formData) {
    return confirmationRedirect("/conta-confirmada?status=invalid");
  }
  const tokenHash = formData.get("token_hash");
  if (typeof tokenHash !== "string" || tokenHash.length < 16) {
    return confirmationRedirect("/conta-confirmada?status=invalid");
  }

  let gateway;
  try {
    gateway = createRequestAuthGateway(context);
  } catch {
    gateway = null;
  }
  if (!gateway) return { kind: "unavailable" };

  const result = await confirmEmail(gateway, tokenHash);
  if (result === "confirmed") {
    return confirmationRedirect("/conta-confirmada?status=confirmed");
  }
  if (result === "invalid") {
    return confirmationRedirect("/conta-confirmada?status=invalid");
  }
  return { kind: "unavailable" };
}

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ConfirmActionData>();
  const navigation = useNavigation();
  const tokenHash = searchParams.get("token_hash");
  const hasValidShape =
    searchParams.get("type") === "email" &&
    Boolean(tokenHash && tokenHash.length >= 16);
  const isSubmitting = navigation.state === "submitting";

  return (
    <AuthLayout>
      <section
        className="auth-panel auth-panel--status"
        aria-labelledby="confirm-email-title"
      >
        <span className="auth-status-icon" aria-hidden="true">
          <Icon name="mail" size={26} />
        </span>
        <p className="eyebrow">Verificação</p>
        <h1 id="confirm-email-title">Confirme seu e-mail</h1>
        {hasValidShape ? (
          <>
            <p>Conclua a verificação para ativar sua conta.</p>
            {actionData?.kind === "unavailable" ? (
              <p className="form-message form-message--error" role="alert">
                Não foi possível confirmar agora. Tente novamente.
              </p>
            ) : null}
            <Form method="post">
              <input name="token_hash" type="hidden" value={tokenHash ?? ""} />
              <Button loading={isSubmitting} type="submit">
                {isSubmitting ? "Confirmando…" : "Confirmar e-mail"}
              </Button>
            </Form>
          </>
        ) : (
          <>
            <p>Este link não é válido ou está incompleto.</p>
            <Link
              className="button button--primary"
              to="/conta-confirmada?status=invalid"
            >
              Enviar novo link
            </Link>
          </>
        )}
      </section>
    </AuthLayout>
  );
}
