import { useEffect, useState } from "react";
import { Form, Link, useNavigation } from "react-router";

import { Button } from "../ui/components/Button";
import { Icon } from "../ui/icons/Icon";
import { TurnstileWidget } from "./TurnstileWidget";

interface CheckEmailStateProps {
  cooldownSeconds: number;
  email: string;
  error?: string;
  maskedEmail: string;
  notice?: string;
  siteKey: string;
}

export function CheckEmailState({
  cooldownSeconds,
  email,
  error,
  maskedEmail,
  notice,
  siteKey,
}: CheckEmailStateProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(cooldownSeconds);
  const navigation = useNavigation();
  const isResending =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "resend";

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setRemainingSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  return (
    <section
      className="auth-panel auth-panel--status"
      aria-labelledby="check-email-title"
    >
      <span className="auth-status-icon" aria-hidden="true">
        <Icon name="mail" size={26} />
      </span>
      <p className="eyebrow">Solicita&ccedil;&atilde;o recebida</p>
      <h1 id="check-email-title">Confira seu e-mail</h1>
      <p>
        Se o endereço puder receber mensagens, enviaremos um link de confirmação
        para <strong>{maskedEmail}</strong>.
      </p>
      {notice ? (
        <p className="form-message form-message--info" role="status">
          {notice}
        </p>
      ) : null}
      <Form method="post" className="auth-secondary-action">
        <input name="email" type="hidden" value={email} />
        <input name="intent" type="hidden" value="resend" />
        <TurnstileWidget action="resend_confirmation" siteKey={siteKey} />
        {error ? (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={remainingSeconds > 0}
          loading={isResending}
          type="submit"
          variant="secondary"
        >
          {isResending
            ? "Reenviando…"
            : remainingSeconds > 0
              ? `Reenviar em ${remainingSeconds} s`
              : "Reenviar e-mail"}
        </Button>
      </Form>
      <Link className="text-link" to="/criar-conta">
        Usar outro e-mail
      </Link>
    </section>
  );
}
