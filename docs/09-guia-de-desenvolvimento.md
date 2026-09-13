# Guia de desenvolvimento

> Procedimento reproduzível para trabalhar na fundação técnica do SeekIn.

**Status:** em execução  
**Versão:** 0.1  
**Data:** 12 de setembro de 2026

## 1. Pré-requisitos

- Node.js 22.23.2, ou outra versão `22.x` igual ou superior a 22.22.0;
- pnpm 12.4.1 por Corepack;
- Git.

As versões de runtime e dependências são fixadas em `.node-version`, `package.json` e `pnpm-lock.yaml`.
O projeto permanece na linha Node 22 para ser compatível com os demais projetos locais. O
mínimo 22.22.0 é exigido pelo React Router 8; não use versões anteriores da linha 22.

## 2. Instalação

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

No Windows com `fnm`, execute `fnm install` e `fnm use` dentro do repositório antes do
Corepack. Se a rede usa uma autoridade certificadora já confiável pelo Windows e o Corepack
reportar `SELF_SIGNED_CERT_IN_CHAIN`, habilite `NODE_USE_SYSTEM_CA=1`; não desative a
verificação TLS.

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

## 4. Banco e backend no Supabase Cloud

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm supabase:push:dry
pnpm supabase:push
pnpm supabase:test
```

O projeto não usa Docker nem executa um banco Supabase local. As migrations versionadas são a
fonte de verdade e chegam ao ambiente cloud pela integração oficial com o GitHub ou, quando
necessário, por um `db push` explícito. Alterações manuais de schema no Dashboard não substituem
migration.

O projeto Supabase `SeekIn` está vinculado ao repositório `jukazilli/SeekIn`, com diretório de
trabalho `.` e deploy de produção a partir da branch `main`. No plano Free, preview branches
automáticas não estão disponíveis; por isso, nenhuma pull request pode executar testes destrutivos
no projeto do beta. O comando `supabase:test` só deve ser usado contra um projeto cloud de
desenvolvimento descartável ou antes da entrada de usuários reais.

A Edge Function `health` possui dois modos:

- `?mode=liveness` — resposta pública mínima, sem consultar dados;
- `?mode=readiness` — exige Bearer token válido e chama `foundation_health()` com RLS e privilégios explícitos.

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

O workflow `.github/workflows/ci.yml` repete a validação da aplicação. Migrations são verificadas
e aplicadas pelo GitHub Integration do Supabase depois de entrarem em `main`. pgTAP, Advisors e
smoke remoto completam a evidência de banco; nenhum item é concluído apenas por revisão estática.

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
- o projeto Supabase cloud do SeekIn foi criado em São Paulo e vinculado ao GitHub;
- Preview e Beta estão publicados em Workers separados; o Beta usa HTTPS, headers de segurança e o
  projeto Supabase correto, sem seed ou reset;
- o smoke completo navegador → web → backend → banco permanece pendente para o SKN-027;
- autenticação, onboarding e planner ainda não foram iniciados, por decisão do portão de fundação.

