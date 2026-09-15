# Modelo físico, contratos HTTP, datas e identificadores

- **Item:** SKN-004
- **Status:** Verificado
- **Versão:** 0.1
- **Data:** 12 de setembro de 2026
- **Fontes:** PRD §§9–11; Arquitetura §§7–10; Engenharia §§4–8; SKN-001

## 1. Objetivo

Converter o modelo conceitual do MVP em um contrato implementável para PostgreSQL, Data API,
Edge Functions e domínio TypeScript. O documento fixa ownership, nomes, tipos, estados,
invariantes, datas, IDs, concorrência e respostas HTTP antes das migrations completas do SKN-017.

Não é uma migration nem autoriza editar estruturas já aplicadas. Quando houver diferença com a
migration de fundação, uma migration aditiva posterior deve convergir para este contrato.

## 2. Decisões estruturais

- PostgreSQL no Supabase é a fonte canônica persistente;
- nomes físicos usam `snake_case`; domínio e contratos TypeScript usam `camelCase`;
- IDs internos são UUID e nunca reutilizam identificadores de provedores externos;
- `auth.users.id` é a identidade da conta e não é duplicado como uma entidade `users` pública;
- e-mail permanece exclusivamente no Supabase Auth;
- toda tabela privada do aluno possui `user_id`, mesmo quando a propriedade pode ser inferida;
- relações entre entidades do aluno usam chaves compostas para impedir vínculo entre proprietários;
- conteúdo de plano publicado é imutável; nova organização cria nova versão;
- operações simples usam Data API por adaptadores de repositório; comandos transacionais usam Edge
  Functions;
- o cliente nunca envia um `user_id` autoritativo: o backend deriva a identidade do JWT;
- o horizonte automático é móvel e limitado aos próximos 90 dias, sem limitar a data de uma
  atividade;
- minutos são inteiros em todas as regras de esforço e capacidade.

## 3. Convenções de identificadores

### 3.1 UUID

Todas as entidades usam `uuid` com `gen_random_uuid()`, exceto `profiles.user_id` e
`user_preferences.user_id`, que reutilizam `auth.users.id`.

No contrato HTTP, UUID é uma string canônica em minúsculas:

```ts
type EntityId = string; // validado por z.string().uuid()
```

Cada tabela com `id` e `user_id` declara `unique (id, user_id)`. FKs de entidades pertencentes ao
aluno carregam também `user_id`:

```text
(activity_id, user_id) → activities(id, user_id)
(session_id, user_id)  → study_sessions(id, user_id)
(plan_id, user_id)     → plans(id, user_id)
```

Essa redundância é deliberada: o banco rejeita associação entre contas antes mesmo da avaliação da
RLS.

### 3.2 Identificadores externos

Integrações futuras armazenam `source`, `source_external_id` e metadados mínimos em colunas
separadas. O identificador externo nunca é PK. Quando existir, a unicidade é
`(user_id, source, source_external_id)`.

### 3.3 Versões e revisões

- `revision bigint` inicia em `1` e cresce em cada alteração de entidade mutável;
- `plans.version integer` é sequencial por usuário;
- `contractVersion` e `rulesVersion` versionam formatos e regras, não registros;
- ETags não substituem `revision`; comandos recebem `expectedRevision` quando alteram estado
  existente.

## 4. Datas, horários e fuso

### 4.1 Tipos de domínio

| Conceito | PostgreSQL | HTTP | Regra |
|---|---|---|---|
| instante | `timestamptz` | RFC 3339 em UTC, com `Z` | armazenar e comparar em UTC |
| data civil | `date` | `YYYY-MM-DD` | nunca converter implicitamente em instante |
| hora local | `time without time zone` | `HH:mm` | sempre acompanhada de fuso e data/regra |
| fuso | `text` | nome IANA | exemplo `America/Sao_Paulo` |
| dia da semana | `smallint` | inteiro `0..6` | `0` domingo, `1` segunda; padrão `1` |
| duração | inteiro | campo terminado em `Minutes` | valor não negativo; esforço válido é positivo |

Timestamps retornados pela API são normalizados para UTC. A interface converte para o fuso IANA do
usuário e apresenta a data absoluta acessível quando houver risco de ambiguidade.

### 4.2 Prazo de atividade

O prazo preserva a intenção civil e o instante resolvido:

- `deadline_local_date date not null`;
- `deadline_local_time time null`;
- `deadline_timezone text not null`;
- `deadline_at timestamptz not null`;
- `deadline_has_time boolean not null`.

Quando a hora não for informada, o comando grava `deadline_local_time = null`,
`deadline_has_time = false` e resolve `deadline_at` como 23:59:00 no fuso registrado. Alterar o fuso
do perfil não desloca silenciosamente um prazo já salvo.

### 4.3 Recorrência e horário de verão

Disponibilidade e bloqueio recorrente guardam hora local, dia da semana, período de vigência e fuso
de origem. Ocorrências são expandidas apenas para o horizonte solicitado. Horários inexistentes ou
duplicados por mudança de horário de verão retornam diagnóstico explícito; o backend não corrige o
horário silenciosamente.

No P0, janelas que atravessam a meia-noite são representadas por duas janelas. Essa regra simplifica
validação, capacidade e índices.

## 5. Schemas e exposição

| Schema | Conteúdo | Acesso |
|---|---|---|
| `auth` | conta, e-mail e sessão | gerenciado pelo Supabase Auth |
| `public` | dados do próprio aluno necessários à PWA | Data API com grants explícitos e RLS |
| `private` | idempotência, execução do planner e auditoria | backend; sem grants a `anon` ou `authenticated` |

Nenhuma tabela nova em `public` é considerada segura apenas por possuir RLS habilitada. Cada
operação recebe grant e policy explícitos; `anon` não acessa dados acadêmicos.

## 6. Catálogo físico P0

| Tabela | Finalidade | Ownership | Exclusão da conta |
|---|---|---|---|
| `profiles` | identidade privada e onboarding | `user_id = auth.uid()` | cascade desde Auth |
| `user_preferences` | preferências do planner | `user_id = auth.uid()` | cascade |
| `availability_windows` | capacidade semanal recorrente | `user_id` | cascade |
| `calendar_blocks` | compromissos e indisponibilidades | `user_id` | cascade |
| `disciplines` | agrupamento acadêmico opcional | `user_id` | cascade |
| `activities` | demanda acadêmica canônica | `user_id` | cascade |
| `activity_links` | links seguros de uma atividade | `user_id` | cascade |
| `plans` | versão proposta ou publicada do plano | `user_id` | cascade |
| `study_sessions` | identidade e estado da sessão | `user_id` | cascade |
| `plan_items` | posição versionada da sessão no plano | `user_id` | cascade |
| `session_executions` | execução real de uma sessão | `user_id` | cascade |
| `plan_conflicts` | déficit e causa estruturada | `user_id` | cascade |
| `plan_conflict_activities` | atividades afetadas pelo conflito | `user_id` | cascade |
| `alerts` | aviso interno acionável | `user_id` | cascade |
| `private.idempotency_keys` | deduplicação de comandos | `user_id` | cascade controlado |
| `private.planner_runs` | entrada, saída e resultado de cada cálculo | `user_id` | cascade controlado |
| `private.audit_events` | trilha técnica sem conteúdo acadêmico | `user_id` | política de retenção |

## 7. Contrato das tabelas

Colunas `created_at` e `updated_at` são `timestamptz not null default now()` nas entidades mutáveis.
`updated_at` é atualizado pelo banco junto de `revision`.

Estados finitos são `text` com constraints `CHECK` nomeadas, não enums PostgreSQL. Essa escolha
permite expansão compatível por migration antes de remover valores antigos. `revision` é mantida por
trigger e não aceita valor arbitrário do cliente.

### 7.1 `profiles`

| Coluna | Tipo e regra |
|---|---|
| `user_id` | `uuid` PK e FK para `auth.users(id) on delete cascade` |
| `display_name` | `text null`, trim entre 1 e 80 caracteres quando preenchido |
| `timezone` | `text not null`, fuso IANA, padrão `America/Sao_Paulo` |
| `onboarding_status` | `not_started \| in_progress \| completed` |
| `onboarding_step` | `smallint not null default 0`, entre 0 e 7 |
| `onboarding_completed_at` | `timestamptz null`, obrigatório quando status for `completed` |
| `revision` | `bigint not null default 1`, positivo |

O perfil é privado e não representa o futuro perfil social.

### 7.2 `user_preferences`

| Coluna | Tipo e regra |
|---|---|
| `user_id` | `uuid` PK e FK para `profiles(user_id) on delete cascade` |
| `week_starts_on` | `smallint not null default 1`, entre 0 e 6 |
| `preferred_session_minutes` | `smallint not null default 50`, entre a mínima e 240 |
| `minimum_session_minutes` | `smallint not null default 25`, entre 5 e 240 |
| `capacity_reserve_percent` | `smallint not null default 20`, entre 0 e 50 |
| `revision` | `bigint not null default 1`, positivo |

### 7.3 `availability_windows`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `day_of_week` | `smallint`, entre 0 e 6 |
| `start_local`, `end_local` | `time`, com início menor que fim |
| `timezone` | fuso IANA usado para expandir a recorrência |
| `valid_from`, `valid_until` | `date`; fim nulo ou maior/igual ao início |
| `status` | `active \| archived` |
| `revision` | controle otimista |

O comando consolida janelas sobrepostas. O banco usa exclusion constraint por
`user_id + day_of_week + vigência + intervalo de minutos` para impedir sobreposição ativa.

### 7.4 `calendar_blocks`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `title` | `text`, trim entre 1 e 120 caracteres |
| `kind` | `recurring \| one_off` |
| `source` | `manual \| imported` |
| `day_of_week`, `start_local`, `end_local` | obrigatórios apenas em recorrência |
| `starts_at`, `ends_at` | obrigatórios apenas em ocorrência única; início menor que fim |
| `timezone` | fuso IANA de origem |
| `valid_from`, `valid_until` | vigência da recorrência; nulos em ocorrência única |
| `revision` | controle otimista |

Uma constraint de forma exige exatamente um conjunto temporal: recorrente ou ocorrência única.
Bloqueios podem se sobrepor, pois duas fontes podem descrever o mesmo período; a capacidade os une
antes de subtrair minutos.

### 7.5 `disciplines`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `name` | `text`, trim entre 1 e 120 caracteres |
| `description` | `text null`, até 1.000 caracteres |
| `color_key` | `text null`, alias de uma paleta acessível controlada pela UI |
| `status` | `active \| archived` |
| `revision` | controle otimista |

`(user_id, lower(name))` é único entre disciplinas ativas. O aplicativo arquiva; não oferece
exclusão física. Arquivar não altera atividades existentes.

### 7.6 `activities`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `discipline_id` | UUID nulo; FK composta garante mesma conta |
| `title` | `text`, trim entre 1 e 200 caracteres |
| `activity_type` | `assignment \| exam \| reading \| project \| exercise \| extension \| other` |
| `deadline_local_date` | data civil obrigatória |
| `deadline_local_time` | hora local opcional |
| `deadline_timezone` | fuso IANA preservado |
| `deadline_at` | instante UTC resolvido |
| `deadline_has_time` | distingue hora informada de 23:59 inferido |
| `estimated_minutes` | inteiro positivo |
| `actual_minutes` | inteiro não negativo, pode ultrapassar a estimativa |
| `priority` | `smallint` entre 0 e 4; padrão 2; maior valor tem maior prioridade |
| `status` | `active \| in_progress \| completed \| cancelled \| archived` |
| `notes_markdown` | `text null`, até 20.000 caracteres; renderização sempre sanitizada |
| `source` | `manual \| imported`; P0 cria manual |
| `source_external_id` | `text null`, nunca usado como ID interno |
| `completed_at` | instante obrigatório apenas no estado `completed` |
| `revision` | controle otimista |

Esforço restante é `greatest(0, estimated_minutes - actual_minutes)`. Prazo no passado é válido e
gera risco; não é erro de persistência. Mudanças de prazo, esforço, prioridade ou status disparam
análise de impacto, mas não publicam outro plano automaticamente.

### 7.7 `activity_links`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id`, `activity_id` | UUID; FK composta para atividade da mesma conta |
| `label` | `text null`, até 120 caracteres |
| `url` | `text`, URL HTTPS validada, até 2.048 caracteres |
| `position` | `smallint` não negativo |

Protocolos executáveis, credenciais embutidas e URLs locais são rejeitados no contrato de entrada.

### 7.8 `plans`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `version` | inteiro positivo e sequencial por usuário |
| `status` | `proposal \| published \| superseded \| rejected` |
| `feasibility` | `feasible \| partial \| infeasible` |
| `generation_reason` | código estável da causa da geração |
| `horizon_start_date`, `horizon_end_date` | datas civis; intervalo inclusivo de até 90 dias |
| `timezone` | fuso usado no cálculo |
| `planner_version`, `rules_version` | versões não vazias |
| `input_hash`, `output_hash` | SHA-256 hexadecimal do conteúdo normalizado |
| `requires_confirmation` | booleano |
| `confirmed_at`, `published_at` | instantes nulos até as transições correspondentes |
| `created_at` | instante de geração |

Existe no máximo um plano `published` por usuário. Publicar uma proposta e marcar a anterior como
`superseded` ocorre na mesma transação. Plano rejeitado ou proposta não confirmada nunca substitui o
vigente.

### 7.9 `study_sessions`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id`, `activity_id` | UUID; atividade pertence à mesma conta |
| `source` | `automatic \| manual` |
| `is_pinned` | booleano, padrão falso |
| `status` | `scheduled \| in_progress \| completed \| skipped \| cancelled` |
| `skip_reason_code` | código nulo ou motivo aprovado no PRD |
| `skip_reason_other` | texto curto permitido somente quando código for `other` |
| `created_by_plan_id` | plano que originou a sessão, nulo para criação manual anterior à proposta |
| `revision` | controle otimista |

Horário planejado não fica nesta tabela: ele é versionado em `plan_items`. Sessões concluídas, em
andamento, fixadas e manuais são protegidas conforme a ordem do PRD.

### 7.10 `plan_items`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id`, `plan_id`, `session_id` | UUID; FKs compostas garantem a mesma conta |
| `planned_start_at`, `planned_end_at` | instantes UTC; início menor que fim |
| `planned_minutes` | inteiro positivo, igual à duração dos instantes em minutos |
| `change_kind` | `created \| kept \| moved \| removed` |
| `rationale_code` | código estável de prazo, risco, folga ou prioridade |
| `rationale_params` | JSON validado sem título ou notas acadêmicas |

`(plan_id, session_id)` é único. Itens de planos publicados são imutáveis. `removed` registra a
diferença histórica e não aparece na leitura do cronograma vigente.

### 7.11 `session_executions`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id`, `session_id` | UUID; uma execução por sessão |
| `status` | `in_progress \| completed \| stopped` |
| `started_at`, `ended_at` | instantes reais; fim nulo enquanto em andamento |
| `actual_minutes` | inteiro não negativo, fechado ao concluir/parar |
| `revision` | controle otimista |

Uma constraint parcial impede duas execuções `in_progress` para o mesmo usuário. Concluir atualiza
execução, sessão e esforço realizado da atividade em uma única transação.

### 7.12 `plan_conflicts`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id`, `plan_id` | UUID; plano da mesma conta |
| `code` | código estável do conflito |
| `first_affected_deadline_at` | primeiro prazo afetado |
| `deficit_minutes` | inteiro positivo |
| `largest_available_window_minutes` | inteiro não negativo |
| `details` | JSON estruturado sem notas ou texto livre acadêmico |

Conflito é resultado de domínio, não falha HTTP. Uma proposta parcial pode ser confirmada quando a
interface apresentar o déficit e o usuário aceitar.

`plan_conflict_activities` usa PK `(conflict_id, activity_id)` e FKs compostas com `user_id` para
garantir que conflito, plano e atividades pertençam à mesma conta. A API projeta essa relação como
uma lista de IDs, sem armazenar referências relacionais em array.

### 7.13 `alerts`

| Coluna | Tipo e regra |
|---|---|
| `id`, `user_id` | UUID e propriedade obrigatória |
| `type`, `severity` | códigos estáveis; severidade `info \| attention \| critical` |
| `subject_type`, `subject_id` | referência lógica opcional |
| `cause_code`, `action_code` | causa e próxima ação estruturadas |
| `impact` | JSON validado sem conteúdo acadêmico livre |
| `dedupe_key` | texto não vazio; único enquanto alerta estiver aberto |
| `resolved_at` | instante nulo enquanto aberto |

### 7.14 Tabelas privadas

`private.idempotency_keys` guarda `user_id`, escopo, hash da chave, hash da requisição, estado,
referência da resposta e expiração. A chave original não é registrada em logs.

`private.planner_runs` guarda `user_id`, `plan_id`, chave de idempotência, versão do contrato,
versão das regras, timestamps, resultado, duração e snapshots JSONB de entrada e saída validados.
Os snapshots permitem reproduzir uma versão do plano e ficam inacessíveis à Data API; seu conteúdo
privado não é copiado para logs ou analytics.

`private.audit_events` guarda ator, ação, tipo/ID da entidade, correlação, instante e campos técnicos
alterados. Não guarda e-mail, título, notas, links ou outro conteúdo acadêmico.

`private.analytics_consents`, `private.analytics_consent_events` e `private.product_events` serão
materializadas em SKN-130 conforme o contrato do SKN-007. Permanecem fora da Data API, separam
consentimento de eventos pseudonimizados e não recebem conteúdo pessoal ou acadêmico. Agregados
opcionais também ficam no schema privado.

## 8. Invariantes e índices

### 8.1 Invariantes obrigatórios

- nenhum filho referencia entidade de outro usuário;
- toda janela ou intervalo possui início estritamente anterior ao fim;
- nenhuma sessão planejada tem duração zero;
- sessão automática não atravessa bloqueio, fim de disponibilidade ou prazo;
- esforço e capacidade usam minutos inteiros;
- `actual_minutes` nunca é negativo e pode superar `estimated_minutes`;
- disciplina é opcional para atividade;
- plano publicado possui itens, hashes e versões válidas, salvo plano inviável explicitamente vazio;
- publicação troca o plano vigente atomicamente;
- falha, timeout ou saída inválida preserva o plano publicado;
- transições de estado fora da máquina definida são rejeitadas pelo caso de uso;
- conteúdo de plano publicado e seus itens não pode ser editado.

### 8.2 Índices mínimos

- todas as tabelas: índice iniciando por `user_id` quando a PK não começar por ele;
- `availability_windows (user_id, status, day_of_week)`;
- `calendar_blocks (user_id, starts_at, ends_at)` e recorrência por dia/vigência;
- `disciplines (user_id, status, lower(name))`;
- `activities (user_id, status, deadline_at)` e `(user_id, discipline_id, status)`;
- `plans (user_id, version desc)` e índice único parcial do publicado;
- `plan_items (plan_id, planned_start_at)` e `(user_id, session_id)`;
- `study_sessions (user_id, status, activity_id)`;
- `session_executions (user_id, status, started_at)`;
- `alerts (user_id, resolved_at, severity, created_at desc)`;
- idempotência por `(user_id, scope, key_hash)`.

Índices definitivos devem ser confirmados com consultas reais e `EXPLAIN`, não apenas com esta
previsão.

## 9. Fronteiras de acesso

### 9.1 Data API por repositório

| Recurso | Operações P0 do cliente autenticado |
|---|---|
| perfil | ler e atualizar nome/fuso/onboarding; sem exclusão direta |
| preferências | ler e atualizar; sem exclusão direta |
| disponibilidade | listar, criar, atualizar e arquivar |
| bloqueios | listar, criar, atualizar e remover |
| disciplinas | listar, criar, atualizar e arquivar |
| atividades e links | listar, detalhar, criar, atualizar e transicionar |
| planos | ler vigente, proposta e histórico próprio; sem escrita direta |
| sessões e execuções | ler; mutações somente por comando |
| conflitos | ler por plano próprio |
| alertas | listar e resolver o próprio alerta |

Componentes React dependem de interfaces de repositório. Somente o adaptador de infraestrutura usa
`supabase-js` e converte linhas físicas para tipos de domínio.

`public.read_current_plan()` é a fronteira autenticada de leitura compartilhada. Ela retorna `null`
quando não existe plano publicado e, quando existe, produz um único objeto com `planId`, `version`,
capacidade, atividades e sessões. Horários vêm de `plan_items`; estados e progresso vêm das entidades
canônicas; risco e capacidade vêm do `planner_run` concluído que originou a mesma versão. Itens
`removed`, propostas e dados de outra conta não entram na projeção. O retorno é validado pelo contrato
Zod antes de alcançar a aplicação.

### 9.2 Edge Functions

Base Supabase: `/functions/v1`. Rotas internas são versionadas por `contractVersion`, não pela URL no
P0. Cada função valida corpo, JWT, origem permitida e limites antes de executar o caso de uso.

| Método e rota | Finalidade | Idempotência |
|---|---|---|
| `GET /health?mode=liveness` | processo disponível, sem dependências privadas | não aplicável |
| `GET /health?mode=readiness` | Auth + banco disponíveis para usuário autenticado | não aplicável |
| `POST /planner/generate` | gerar proposta sem substituir plano vigente | obrigatória |
| `POST /planner/impact` | analisar mudanças persistidas sem publicar | obrigatória |
| `POST /planner/confirm` | publicar uma proposta confirmável | obrigatória |
| `POST /sessions/start` | iniciar sessão sem duplicar execução | obrigatória |
| `POST /sessions/complete` | concluir execução e reconciliar esforço | obrigatória |
| `POST /sessions/skip` | marcar não realizada e oferecer replanejamento | obrigatória |

No Supabase, `planner` e `sessions` podem ser duas funções com roteamento interno. A implementação
não precisa criar uma Edge Function por verbo.

Autenticação, confirmação de e-mail, recuperação e renovação de sessão usam o contrato oficial do
Supabase Auth por meio do adaptador da aplicação. O SeekIn não cria endpoints paralelos de senha ou
emite tokens próprios.

## 10. Contrato HTTP comum

### 10.1 Headers

| Header | Regra |
|---|---|
| `Authorization: Bearer <jwt>` | obrigatório, exceto liveness |
| `Content-Type: application/json` | obrigatório em POST |
| `X-Correlation-Id` | UUID opcional; backend cria quando ausente e sempre devolve |
| `Idempotency-Key` | UUID aleatório obrigatório nos comandos mutáveis |

### 10.2 Sucesso

```json
{
  "data": {},
  "meta": {
    "contractVersion": 1,
    "correlationId": "5d927a8c-a9a4-4d5d-893f-4e1ffca97a78"
  }
}
```

### 10.3 Erro

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Os dados foram atualizados em outro lugar. Recarregue e tente novamente.",
    "retryable": false
  },
  "meta": {
    "contractVersion": 1,
    "correlationId": "5d927a8c-a9a4-4d5d-893f-4e1ffca97a78"
  }
}
```

`details` só aparece quando possuir schema fechado e não contiver SQL, stack, e-mail, título, notas
ou dados de outra conta.

### 10.4 Status e códigos estáveis

| HTTP | Códigos iniciais |
|---:|---|
| 400 | `INVALID_JSON`, `UNSUPPORTED_CONTRACT_VERSION` |
| 401 | `AUTH_REQUIRED`, `SESSION_INVALID` |
| 404 | `RESOURCE_NOT_FOUND` também para recurso de outra conta |
| 409 | `REVISION_CONFLICT`, `STALE_PLAN`, `EXECUTION_ALREADY_ACTIVE`, `IDEMPOTENCY_CONFLICT` |
| 422 | `VALIDATION_ERROR`, `INVALID_STATE_TRANSITION`, `INVALID_TIME_WINDOW` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` sem detalhe interno |
| 503 | `DEPENDENCY_UNAVAILABLE`, `PLANNER_TIMEOUT` |

Plano parcial ou inviável é `200` com resultado de domínio estruturado, não `422` ou `500`.

## 11. Contratos dos comandos

Todos os corpos possuem `contractVersion: 1`. Campos não reconhecidos são rejeitados nos comandos
de escrita.

### 11.1 Gerar plano

```json
{
  "contractVersion": 1,
  "reason": "manual_request",
  "horizonDays": 90,
  "expectedCurrentPlanId": null
}
```

O backend carrega perfil, preferências, disponibilidade, bloqueios, atividades e sessões protegidas
do proprietário. A resposta contém `planId`, `version`, `status: "proposal"`, `feasibility`,
`requiresConfirmation`, resumo de capacidade, mudanças e conflitos. Títulos e notas não aparecem em
logs; a resposta autenticada pode retornar referências e conteúdo necessário à interface.

### 11.2 Analisar impacto

```json
{
  "contractVersion": 1,
  "trigger": {
    "type": "activity_changed",
    "entityId": "6f0b3525-b8ca-49a2-b833-ac7518f046b1"
  },
  "expectedCurrentPlanId": "c626cf45-c112-410b-b813-f5f558d20258"
}
```

O gatilho já foi persistido, mas o plano vigente permanece. A resposta tem o mesmo formato de
proposta da geração e nunca publica automaticamente.

### 11.3 Confirmar proposta

```json
{
  "contractVersion": 1,
  "planId": "a9f0574b-08f9-4c23-8d4c-df5df69c91b7",
  "expectedCurrentPlanId": "c626cf45-c112-410b-b813-f5f558d20258"
}
```

O backend confirma apenas proposta da mesma conta, ainda baseada no plano vigente esperado. Uma
proposta obsoleta retorna `STALE_PLAN`. Sucesso devolve o plano como `published` e a versão anterior
como `superseded` na mesma transação.

### 11.4 Iniciar sessão

```json
{
  "contractVersion": 1,
  "sessionId": "596f9953-f535-4614-a4b9-d9b8ef917ce5",
  "expectedRevision": 3,
  "startedAt": "2026-09-13T12:00:00Z"
}
```

O servidor limita desvio aceitável do relógio do cliente e registra seu próprio instante de
recebimento. Retry com a mesma chave devolve a mesma execução; outra sessão concorrente retorna
`EXECUTION_ALREADY_ACTIVE`.

### 11.5 Concluir sessão

```json
{
  "contractVersion": 1,
  "sessionId": "596f9953-f535-4614-a4b9-d9b8ef917ce5",
  "executionId": "07950111-b15c-4031-9326-47cfd4e25bd1",
  "expectedRevision": 4,
  "endedAt": "2026-09-13T12:48:00Z"
}
```

O backend calcula `actualMinutes`; o cliente não envia o total autoritativo. Execução, sessão e
atividade são reconciliadas atomicamente.

### 11.6 Marcar sessão como não realizada

```json
{
  "contractVersion": 1,
  "sessionId": "596f9953-f535-4614-a4b9-d9b8ef917ce5",
  "expectedRevision": 2,
  "reasonCode": "schedule_not_suitable",
  "reasonOther": null
}
```

`reasonCode` é opcional e aceita `unexpected_or_no_time`, `fatigue_or_health`, `priority_changed`,
`schedule_not_suitable`, `material_unavailable`, `completed_outside_seekin`,
`session_no_longer_needed` ou `other`. `reasonOther` só é aceito com `other`, permanece opcional e
tem no máximo 280 caracteres.

## 12. Concorrência e idempotência

- a chave de idempotência vale por usuário, comando e corpo normalizado;
- repetir a mesma chave e o mesmo corpo devolve a resposta original;
- repetir a chave com corpo diferente retorna `IDEMPOTENCY_CONFLICT`;
- chaves expiram após período operacional documentado na implementação, nunca durante comando em
  andamento;
- `expectedRevision` impede sobrescrita silenciosa em duas abas;
- geração usa lock transacional por usuário para ordenar versões;
- confirmação compara `expectedCurrentPlanId` dentro da transação;
- resultados atrasados não substituem plano mais novo;
- falha de qualquer gravação relacionada causa rollback integral.

## 13. Ownership e RLS

Padrão por operação em tabela `public`:

```sql
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

Além da RLS:

- FKs compostas impedem ownership cruzado;
- consultas sempre filtram `user_id` e possuem índice compatível;
- `anon` não recebe grants nas tabelas privadas do aluno;
- tabelas de plano, sessão e execução não recebem escrita direta do cliente;
- `profiles` e `user_preferences` não recebem `DELETE` direto no P0;
- service role existe apenas no backend e não contorna validação de ownership do caso de uso;
- notas e títulos não entram em auditoria, erro, analytics ou log;
- Markdown é armazenado como texto e sanitizado na renderização;
- respostas usam `404` para não confirmar a existência de recurso alheio.

## 14. Consistência com a implementação

A migration `20260912205531_foundation_profiles.sql` já cria `profiles`, `user_preferences`, defaults,
constraints básicas, RLS e `foundation_health()`. Ela é parcial por design e não deve ser reescrita.

Convergências entregues pelas migrations `20260913013000_g1_schema_rls.sql` e
`20260913020000_g1_fk_indexes.sql`:

| Diferença da fundação | Tratamento aplicado | Item responsável |
|---|---|---|
| faltavam `revision`, passo e conclusão do onboarding | colunas, constraints e triggers adicionados | SKN-017 |
| demais tabelas P0 não existiam | catálogo físico criado e validado em banco Cloud limpo | SKN-017 |
| `profiles` e `user_preferences` permitiam DELETE direto | grant revogado e policies removidas | SKN-018 |
| ownership composto não existia | uniques/FKs adicionadas e teste conta A × conta B aprovado | SKN-017/018 |
| tipos TypeScript do banco não existiam | tipos gerados do schema Cloud e exportados pelo contrato | SKN-019 |
| contrato compartilhado não aceitava `AUTH_REQUIRED` | schema e testes alinhados sem mudar a resposta pública | SKN-020 |

Não há conflito de nomes ou defaults entre as duas tabelas existentes e este contrato. A regra de
`week_starts_on` permanece `0..6`, com segunda-feira (`1`) como padrão, compatível com a migration.

## 15. Critérios de aceite do SKN-004

- [x] todas as entidades P0 possuem tabela, ownership e política de exclusão definidos;
- [x] relações entre entidades do aluno impedem associação entre contas;
- [x] estados, constraints, transições críticas e índices mínimos estão explícitos;
- [x] data civil, hora local, instante UTC, recorrência, prazo sem hora e fuso IANA são distintos;
- [x] UUID, versão, revisão e identificador externo possuem convenção única;
- [x] Data API e Edge Functions possuem fronteiras de responsabilidade;
- [x] comandos críticos possuem contrato, erro, concorrência e idempotência definidos;
- [x] segurança foi revisada contra RLS, grants, logs, conteúdo acadêmico e service role;
- [x] divergências da fundação foram resolvidas sem reescrever migration aplicada.

## 16. Fora do escopo

- DDL executável e atualização do banco, entregues por SKN-017 e SKN-018;
- tipos TypeScript gerados, entregues por SKN-019;
- implementação das Edge Functions do planner e sessões;
- schemas Zod executáveis do planner, entregues por SKN-080;
- feed, comunidades, mentorias, pagamentos, Google Calendar e edição offline;
- anexos de atividade ou sessão, que permanecem P1.
