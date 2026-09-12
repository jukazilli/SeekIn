# Guia de desenvolvimento

> Procedimento reproduzível para trabalhar na fundação técnica do SeekIn.

**Status:** em execução  
**Versão:** 0.1  
**Data:** 12 de setembro de 2026

## 1. Pré-requisitos

- Node.js 24;
- pnpm 12.4.1 por Corepack;
- Docker compatível com o Supabase CLI;
- Git.

As versões de runtime e dependências são fixadas em `.node-version`, `package.json` e `pnpm-lock.yaml`.

## 2. Instalação

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

O arquivo `.env.local` não deve ser versionado. Variáveis iniciadas por `VITE_` podem entrar no bundle do navegador e, portanto, nunca recebem chaves secretas ou `service_role`.

## 3. Aplicação web

```bash
pnpm dev
```

Rotas de fundação:

- `/` — shell público mínimo;
- `/health` — liveness do Worker, com versão e correlação;
- qualquer rota inexistente — resposta HTTP 404.

O build de produção usa React Router em Framework Mode, Vite e o runtime do Cloudflare Worker:

```bash
pnpm build
```

## 4. Banco e backend local

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:test
```

O primeiro `start` baixa as imagens necessárias. As migrations são a fonte de verdade; alterações manuais no Dashboard não substituem migration.

A Edge Function `health` possui dois modos:

- `?mode=liveness` — resposta pública mínima, sem consultar dados;
- `?mode=readiness` — exige Bearer token válido e chama `foundation_health()` com RLS e privilégios explícitos.

Para encerrar os serviços:

```bash
pnpm supabase:stop
```

## 5. Validação canônica

```bash
pnpm validate
```

Esse comando executa, na ordem:

1. verificação de formatação;
2. lint sem warnings;
3. TypeScript estrito em todos os workspaces;
4. testes Vitest;
5. build de produção.

O workflow `.github/workflows/ci.yml` repete a validação e executa reset e pgTAP em banco limpo. Nenhum item de banco é considerado concluído apenas por revisão estática.

## 6. Estrutura

```text
apps/web                 aplicação React Router e Worker
packages/contracts       contratos Zod das fronteiras
packages/domain          domínio puro e independente de provedor
packages/planner-core    futuro motor determinístico
supabase/migrations      fonte de verdade do schema
supabase/functions       backend em Edge Functions
supabase/tests/database  testes pgTAP
tests/e2e                futuras jornadas Playwright
```

Funcionalidades do planner só entram depois do portão `G2`, conforme o backlog e o contrato canônico.

## 7. Estado atual e bloqueios

- workspace, contratos, web, build e testes unitários estão implementados;
- Supabase CLI, migration inicial, RLS, pgTAP e health backend estão preparados;
- a execução local de banco exige Docker;
- o projeto remoto Supabase e o deploy Cloudflare permanecem pendentes de autorização e configuração explícitas;
- autenticação, onboarding e planner ainda não foram iniciados, por decisão do portão de fundação.

