import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import {
  requestPasswordRecovery,
  validateRecoveryRequest,
} from "../auth/password-recovery-flow";
import {
  createRequestSessionClient,
  isSameOriginSubmission,
  passwordRecoveryUrl,
  readAuthFormData,
  turnstileSiteKey,
} from "../auth/runtime-auth";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { AuthLayout } from "../ui/components/AuthLayout";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";

export const meta: MetaFunction = () => [
  { title: "Recuperar acesso | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];
export function headers() {
  return { "cache-control": "no-store" };
}

interface LoaderData {
  siteKey: string | null;
}
interface ActionData {
  email?: string;
  emailError?: string;
  kind?: "error" | "sent";
}

export function loader({ context }: LoaderFunctionArgs): LoaderData {
  return { siteKey: turnstileSiteKey(context) };
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  if (!isSameOriginSubmission(request)) return { kind: "error" };
  const formData = await readAuthFormData(request);
  if (!formData) return { kind: "error" };
  const validation = validateRecoveryRequest(formData);
  if (!validation.ok)
    return {
      email: String(formData.get("email") ?? ""),
      emailError: validation.error,
    };
  if (!validation.captchaToken)
    return { email: validation.email, kind: "error" };
  const session = createRequestSessionClient(request, context);
  const redirectTo = passwordRecoveryUrl(request, context);
  if (!session || !redirectTo)
    return { email: validation.email, kind: "error" };
  const result = await requestPasswordRecovery(
    session.auth,
    validation.email,
    validation.captchaToken,
    redirectTo,
  );
  return result === "sent"
    ? { kind: "sent" }
    : { email: validation.email, kind: "error" };
}

export default function RequestPasswordRecovery() {
  const { siteKey } = useLoaderData<LoaderData>();
  const data = useActionData<ActionData>();
  const navigation = useNavigation();
  const sending = navigation.state === "submitting";
  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="recovery-title">
        <p className="eyebrow">Recuperar acesso</p>
        <h1 id="recovery-title">Esqueceu sua senha?</h1>
        <p className="auth-intro">Enviaremos um link para criar uma nova.</p>
        {data?.kind === "sent" ? (
          <div className="auth-status-block" role="status">
            <h2>Confira seu e-mail</h2>
            <p>
              Se houver uma conta nesse endereço, o link chegará em alguns
              minutos.
            </p>
            <Link className="button button--secondary" to="/entrar">
              Voltar para entrar
            </Link>
          </div>
        ) : (
          <Form className="auth-form" method="post">
            <TextField
              autoComplete="email"
              defaultValue={data?.email}
              error={data?.emailError}
              label="E-mail"
              maxLength={254}
              name="email"
              required
              type="email"
            />
            {siteKey ? (
              <TurnstileWidget action="password_recovery" siteKey={siteKey} />
            ) : null}
            {data?.kind === "error" ? (
              <p className="form-message form-message--error" role="alert">
                Não foi possível continuar agora. Tente novamente.
              </p>
            ) : null}
            <Button disabled={!siteKey} loading={sending} type="submit">
              {sending ? "Enviando…" : "Enviar link"}
            </Button>
          </Form>
        )}
      </section>
    </AuthLayout>
  );
}
