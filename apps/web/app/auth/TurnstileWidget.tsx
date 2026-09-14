import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

interface TurnstileApi {
  remove(widgetId: string): void;
  render(
    container: HTMLElement,
    options: {
      action: string;
      language: string;
      sitekey: string;
      size: "compact" | "flexible";
      theme: "light";
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  action: "login" | "resend_confirmation" | "signup";
  siteKey: string;
}

const scriptId = "seekin-turnstile-script";
const scriptSource =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ action, siteKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const previousNavigationState = useRef("idle");
  const [loadFailed, setLoadFailed] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    let disposed = false;

    function renderWidget() {
      if (
        disposed ||
        widgetIdRef.current ||
        !containerRef.current ||
        !window.turnstile
      ) {
        return;
      }

      const size = window.matchMedia("(max-width: 400px)").matches
        ? "compact"
        : "flexible";
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        action,
        language: "pt-br",
        sitekey: siteKey,
        size,
        theme: "light",
      });
    }

    let script = document.querySelector<HTMLScriptElement>(`#${scriptId}`);
    const handleLoad = () => renderWidget();
    const handleError = () => setLoadFailed(true);

    if (window.turnstile) {
      renderWidget();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.async = true;
        script.defer = true;
        script.id = scriptId;
        script.src = scriptSource;
        document.head.appendChild(script);
      }
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
    }

    return () => {
      disposed = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, siteKey]);

  useEffect(() => {
    const completedSubmission =
      previousNavigationState.current !== "idle" && navigation.state === "idle";
    previousNavigationState.current = navigation.state;

    if (completedSubmission && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [navigation.state]);

  return (
    <div className="turnstile-field">
      <div ref={containerRef} />
      {loadFailed ? (
        <p className="text-field__error" role="alert">
          Não foi possível carregar a verificação de segurança. Atualize a
          página.
        </p>
      ) : null}
    </div>
  );
}
