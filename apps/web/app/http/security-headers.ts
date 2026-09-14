interface SecurityHeaderOptions {
  appEnvironment?: string;
  supabaseUrl?: string;
}

function getAllowedSupabaseOrigins(supabaseUrl?: string) {
  if (!supabaseUrl) {
    return [];
  }

  const origin = new URL(supabaseUrl).origin;
  return [origin, origin.replace("https://", "wss://")];
}

export function applySecurityHeaders(
  response: Response,
  options: SecurityHeaderOptions = {},
) {
  const connectSources = [
    "'self'",
    "https://challenges.cloudflare.com",
    ...getAllowedSupabaseOrigins(options.supabaseUrl),
  ];
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("content-security-policy", contentSecurityPolicy);
  response.headers.set(
    "permissions-policy",
    "camera=(), geolocation=(), microphone=()",
  );
  if (!response.headers.has("referrer-policy")) {
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");

  if (options.appEnvironment && options.appEnvironment !== "local") {
    response.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
}
