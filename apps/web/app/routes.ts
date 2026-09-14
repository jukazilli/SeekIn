import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("app", "routes/authenticated-home.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("entrar", "routes/login.tsx"),
  route("recuperar-acesso", "routes/request-password-recovery.tsx"),
  route("auth/redefinir", "routes/reset-password.tsx"),
  route("criar-conta", "routes/create-account.tsx"),
  route("auth/confirmar", "routes/confirm-email.tsx"),
  route("conta-confirmada", "routes/email-confirmed.tsx"),
  route("health", "routes/health.ts"),
  route("proofs/schedule-views", "routes/proofs/schedule-views.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
