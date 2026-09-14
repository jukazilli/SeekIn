import { createSupabaseAuthGateway } from "@seekin/data-access";
import type { RouterContextProvider } from "react-router";

import { cloudflareEnvironmentContext } from "../http/runtime-context";

const localTurnstileSiteKey = "1x00000000000000000000AA";
const maxAuthFormBytes = 8 * 1024;

function requestEnvironment(context: Pick<RouterContextProvider, "get">) {
  return context.get(cloudflareEnvironmentContext);
}

export function createRequestAuthGateway(
  context: Pick<RouterContextProvider, "get">,
) {
  const environment = requestEnvironment(context);
  const publishableKey = environment.SUPABASE_PUBLISHABLE_KEY?.trim();
  const url = environment.SUPABASE_URL?.trim();

  if (!publishableKey || !url) return null;
  return createSupabaseAuthGateway({ publishableKey, url });
}

export function isSameOriginSubmission(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readAuthFormData(request: Request) {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/x-www-form-urlencoded") return null;

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxAuthFormBytes) {
    return null;
  }

  if (!request.body) return new FormData();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxAuthFormBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const payload = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const formData = new FormData();
  const parameters = new URLSearchParams(new TextDecoder().decode(payload));
  for (const [name, value] of parameters) {
    formData.append(name, value);
  }
  return formData;
}

export function confirmationUrl(
  request: Request,
  context: Pick<RouterContextProvider, "get">,
) {
  const environment = requestEnvironment(context);
  const configuredOrigin = environment.APP_ORIGIN?.trim();

  try {
    const requestOrigin = new URL(request.url).origin;
    const baseOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : requestOrigin;

    if (environment.APP_ENV === "beta" && !configuredOrigin) return null;
    return new URL("/auth/confirmar", baseOrigin).toString();
  } catch {
    return null;
  }
}

export function turnstileSiteKey(context: Pick<RouterContextProvider, "get">) {
  try {
    const environment = requestEnvironment(context);
    const configuredSiteKey = environment.TURNSTILE_SITE_KEY?.trim();
    if (configuredSiteKey) return configuredSiteKey;
    return environment.APP_ENV === "local" ? localTurnstileSiteKey : null;
  } catch {
    return import.meta.env.DEV ? localTurnstileSiteKey : null;
  }
}
