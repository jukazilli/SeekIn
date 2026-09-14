import { useState } from "react";
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
import {
  updateRecoveredPassword,
  validateNewPassword,
} from "../auth/password-recovery-flow";
import {
  clearPrivateBrowserDataHeaders,
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
import { AuthLayout } from "../ui/components/AuthLayout";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { Icon } from "../ui/icons/Icon";

export const meta: MetaFunction = () => [
  { title: "Criar nova senha | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];
export function headers() {
  return { "cache-control": "no-store", "referrer-policy": "no-referrer" };
}
interface ActionData {
  errors?: Partial<Record<"confirmPassword" | "password", string>>;
  kind?: "invalid" | "unavailable";
}

export async function action({
  context,
  request,
}: ActionFunctionArgs): Promise<ActionData | Response> {
  if (!isSameOriginSubmission(request)) return { kind: "invalid" };
  const formData = await readAuthFormData(request);
  if (!formData) return { kind: "invalid" };
  const tokenHash = String(formData.get("token_hash") ?? "");
  if (tokenHash.length < 16) return { kind: "invalid" };
  const validation = validateNewPassword(formData);
  if (!validation.ok) return { errors: validation.errors };
  const session = createRequestSessionClient(request, context);
  if (!session) return { kind: "unavailable" };
  const result = await updateRecoveredPassword(
    session.auth,
    tokenHash,
    validation.password,
  );
  if (result === "updated")
    return redirect("/entrar?status=password-updated", {
      headers: clearPrivateBrowserDataHeaders(request, session.headers),
    });
  return { kind: result };
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const data = useActionData<ActionData>();
  const navigation = useNavigation();
  const [show, setShow] = useState(false);
  const tokenHash = params.get("token_hash");
  const validShape =
    params.get("type") === "recovery" &&
    Boolean(tokenHash && tokenHash.length >= 16);
  const saving = navigation.state === "submitting";
  return (
    <AuthLayout>
      <section className="auth-panel" aria-labelledby="reset-title">
        <p className="eyebrow">Recuperar acesso</p>
        <h1 id="reset-title">Crie uma nova senha</h1>
        {!validShape || data?.kind === "invalid" ? (
          <>
            <p>Este link não é válido ou já expirou.</p>
            <Link className="button button--primary" to="/recuperar-acesso">
              Enviar novo link
            </Link>
          </>
        ) : (
          <Form className="auth-form" method="post">
            <input name="token_hash" type="hidden" value={tokenHash ?? ""} />
            <TextField
              autoComplete="new-password"
              endAction={
                <button
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="field-icon-button"
                  onClick={() => setShow((v) => !v)}
                  type="button"
                >
                  <Icon
                    name={show ? "hide-password" : "show-password"}
                    size={20}
                  />
                </button>
              }
              error={data?.errors?.password}
              label="Nova senha"
              maxLength={128}
              minLength={8}
              name="password"
              required
              type={show ? "text" : "password"}
            />
            <TextField
              autoComplete="new-password"
              error={data?.errors?.confirmPassword}
              label="Confirmar nova senha"
              maxLength={128}
              minLength={8}
              name="confirmPassword"
              required
              type={show ? "text" : "password"}
            />
            {data?.kind === "unavailable" ? (
              <p className="form-message form-message--error" role="alert">
                Não foi possível salvar agora. Tente novamente.
              </p>
            ) : null}
            <Button loading={saving} type="submit">
              {saving ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </Form>
        )}
      </section>
    </AuthLayout>
  );
}
