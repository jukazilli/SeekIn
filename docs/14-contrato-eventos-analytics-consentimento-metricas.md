# Contrato de eventos, analytics, consentimento e métricas do SeekIn

> Especificação canônica do SKN-007 para medir o beta com eventos first-party no Supabase, coleta
> mínima, consentimento explícito e nenhuma captura de conteúdo pessoal ou acadêmico.

**Status:** aprovado para implementação

**Versão:** 1.0

**Data:** 13 de setembro de 2026

**Item:** SKN-007

**Documentos relacionados:** [PRD](01-prd-mvp-planner.md) ·
[PWA e responsividade](02-requisitos-tecnicos-pwa-responsividade.md) ·
[Arquitetura](03-arquitetura-tecnica-e-infraestrutura.md) ·
[Engenharia](04-requisitos-de-engenharia-e-qualidade.md) ·
[Contrato de entrega](06-contrato-canonico-entrega-rastreabilidade.md) ·
[Modelo físico e HTTP](12-modelo-fisico-contratos-http-datas-ids.md) ·
[Plano de testes](13-plano-de-testes-e-fixtures-sinteticas.md)

---

## 1. Objetivo

Este documento define:

- quais classes de telemetria existem e por que não podem ser misturadas;
- como o aluno concede, nega e retira consentimento de analytics;
- o envelope versionado e a allowlist de eventos e propriedades;
- autoridade, deduplicação e momento de emissão de cada evento;
- armazenamento, acesso, retenção, exclusão e agregação;
- fórmulas e populações das métricas do beta;
- testes e evidências exigidos antes de ativar a coleta.

O contrato não instala SDK externo nem implementa a coleta. A materialização ocorre em SKN-130,
depois das jornadas que produzem os eventos existirem.

## 2. Decisões obrigatórias

1. O beta usa eventos próprios no Supabase; PostHog, Google Analytics, Mixpanel, pixels e ferramentas
   equivalentes ficam fora do P0.
2. Analytics de produto é opcional, começa desligado e depende de opt-in explícito.
3. Recusar ou retirar consentimento não bloqueia conta, planner, PWA ou suporte.
4. Nenhum evento contém e-mail, nome, IP persistido, título, nota, link, texto livre acadêmico ou
   snapshot do plano.
5. Eventos de transação são emitidos pelo servidor somente após sucesso confirmado.
6. Eventos do cliente passam por fronteira autenticada, schema fechado e consentimento revalidado no
   servidor.
7. Logs, auditoria, segurança e saúde operacional não são analytics de produto.
8. Métricas do beta são hipóteses; amostra pequena não autoriza generalização.
9. Não existe page view genérica, clickstream, heatmap, session replay ou fingerprinting no P0.
10. Adicionar evento, propriedade, destino ou finalidade exige alterar este contrato antes do código.

## 3. Classes de telemetria

| Classe | Finalidade | Consentimento de analytics | Exemplos | Responsável |
|---|---|---|---|---|
| produto | validar ativação, execução, adoção e utilidade do planner | obrigatório | `plan_generated`, `study_session_completed` | SKN-130 |
| operacional | disponibilidade, duração, falha e custo do serviço | não usa o consentimento de produto; coleta mínima necessária à operação | latência, resultado e versão do motor | SKN-131/142 |
| auditoria e segurança | integridade, autorização, mudança crítica e investigação | não usa o consentimento de produto; acesso estrito | ator técnico, ação, entidade e correlação | SKN-091/131/132 |
| pesquisa com usuário | entrevista, teste moderado e feedback qualitativo | consentimento próprio do estudo | roteiro e nota de confiança | SKN-057/140 |

### 3.1 Separação obrigatória

- retirar analytics não apaga automaticamente auditoria necessária à integridade;
- consentir analytics não autoriza marketing, replay, pesquisa qualitativa ou compartilhamento social;
- evento de produto não substitui log de erro;
- log operacional não pode ganhar propriedades de comportamento para contornar a recusa;
- resposta de pesquisa não é anexada à linha do tempo individual de analytics.

## 4. Contrato de consentimento

### 4.1 Estados

```text
unknown -> granted
unknown -> denied
granted -> withdrawn
denied -> granted
withdrawn -> granted
```

`unknown`, `denied` e `withdrawn` significam coleta de produto desabilitada. Não há consentimento por
silêncio, continuidade de navegação ou caixa previamente marcada.

### 4.2 Momento e experiência

O convite aparece na criação da conta, depois dos campos obrigatórios e antes da confirmação. Deve
ser separado da aceitação de termos e de comunicações de marketing. Conta legada em estado `unknown`
pode receber o convite uma única vez no início do onboarding; `denied` ou `withdrawn` não é
reabordado automaticamente e só muda em Configurações.

Copy aprovada para a interface:

```text
Ajude a melhorar o SeekIn

Compartilhe métricas de uso sem títulos, notas ou conteúdo das suas atividades.
É opcional e você pode mudar isso quando quiser.

[ ] Compartilhar métricas de uso

Ver o que é coletado
```

Em Configurações, usar o label `Compartilhar métricas de uso` com o estado atual e o link
`Ver o que é coletado`. Não repetir o texto longo em outras telas.

### 4.3 Regras de prova

Cada mudança registra no schema privado:

- `user_id` apenas no registro de consentimento;
- estado anterior e novo;
- versão do aviso apresentado;
- instante do servidor;
- superfície `signup | onboarding | settings`;
- versão da aplicação;
- revision para impedir sobrescrita silenciosa.

O texto completo do aviso é versionado no código; não é duplicado em cada linha do banco.

### 4.4 Efeito da decisão

- `granted`: eventos futuros podem ser aceitos após validação server-side;
- `denied`: nada é enviado nem armazenado como evento de produto;
- `withdrawn`: bloqueio imediato de novos eventos e fila local descartada;
- concessão posterior não faz backfill do período sem consentimento;
- retirada ou exclusão de conta agenda remoção dos eventos brutos vinculáveis em até 30 dias;
- agregados sem chave de sujeito e já combinados com outras pessoas não são reidentificados para
  remoção.

A política jurídica e os textos completos de privacidade são validados em SKN-134. Esse item pode
reduzir retenção ou ampliar direitos, mas não pode transformar analytics opcional em condição de uso
sem nova decisão explícita do Product Owner.

## 5. Armazenamento first-party

### 5.1 Estruturas privadas

As estruturas pertencem ao schema `private` e não recebem grants para `anon` ou `authenticated`:

| Estrutura | Conteúdo |
|---|---|
| `analytics_consents` | estado atual, versão do aviso, timestamps e revision por usuário |
| `analytics_consent_events` | histórico append-only das mudanças de consentimento |
| `product_events` | envelope validado e propriedades da allowlist |
| `analytics_daily_aggregates` | contagens agregadas sem chave de usuário, quando necessário |

SKN-130 cria a migration correspondente. O cliente nunca insere diretamente nessas tabelas.

### 5.2 Chave pseudônima

`product_events` não armazena `user_id`. O backend deriva `subject_key` por HMAC de:

```text
environment + user_id + analytics_key_version
```

A chave secreta fica somente no servidor. `subject_key` é pseudônimo, não anônimo: seu acesso continua
restrito e a chave pode ser recalculada para atender retirada/exclusão.

### 5.3 Envelope canônico

| Campo | Tipo/regra |
|---|---|
| `event_id` | UUID gerado no servidor |
| `event_schema_version` | inteiro; começa em `1` |
| `event_name` | enum fechado deste documento |
| `occurred_at` | `timestamptz` atribuído pelo servidor |
| `environment` | `development | preview | beta | production` |
| `subject_key` | HMAC versionado; nunca exposto ao cliente |
| `subject_key_version` | versão inteira da chave HMAC usada |
| `source` | `client | server` |
| `app_version` | SHA ou versão implantada |
| `consent_notice_version` | versão efetiva no momento da coleta |
| `dedupe_key_hash` | hash técnico; único no escopo do evento |
| `properties` | JSON validado pela allowlist do evento |

O cliente pode enviar `client_event_id` para retry, mas o servidor o valida, transforma em chave de
deduplicação e não confia em identidade, ambiente, consentimento ou instante enviados pelo browser.

A chave HMAC permanece estável por pelo menos 90 dias e durante uma janela W4 completa. Rotação
planejada refaz `subject_key` dos eventos ainda retidos em uma única operação privada; rotação por
incidente invalida relatórios afetados até a reconciliação.

### 5.4 Deduplicação

- evento server-side: chave baseada em evento, sujeito, entidade técnica e revision/transição;
- evento client-side: chave baseada em sujeito, nome e `client_event_id`;
- retry com mesmo corpo retorna aceite idempotente sem nova linha;
- mesma chave com corpo diferente retorna conflito e registra falha operacional;
- IDs técnicos usados para deduplicar não entram em `properties` nem em relatórios.

## 6. Tipos e vocabulários comuns

| Tipo | Valores/regra |
|---|---|
| `device_class` | `compact | intermediate | expanded` |
| `display_mode` | `browser | standalone` |
| `activity_type` | `assignment | exam | reading | project | exercise | extension | other` |
| `priority` | inteiro `0..4` |
| `session_source` | `automatic | manual` |
| `risk_level` | `overdue | infeasible | critical | attention | controlled` |
| `feasibility` | `feasible | partial | infeasible` |
| `generation_reason` | `manual_request | onboarding_completed | availability_changed | block_changed | activity_changed | session_completed | session_skipped | session_moved` |
| `deadline_bucket` | `overdue | h0_24 | d1_3 | d4_7 | d8_30 | d31_90 | beyond_horizon` |
| `advance_bucket` | `before_24h_plus | before_1_24h | within_1h | after_1h_plus` |
| `reason_code` | `unexpected_or_no_time | fatigue_or_health | priority_changed | schedule_not_suitable | material_unavailable | completed_outside_seekin | session_no_longer_needed | other` |
| `primary_reason` | `overdue | infeasible_horizon | nearest_deadline | lowest_slack | manual_priority | already_started | oldest_created` |
| minutos | inteiro não negativo, com nome terminado em `_minutes` |
| duração técnica | inteiro não negativo terminado em `_ms` |
| contagem | inteiro não negativo terminado em `_count` |

Valores fora do enum, `NaN`, infinito, números negativos onde não são aceitos e campos desconhecidos
são rejeitados. Contagens e minutos aceitam inteiros até `2.147.483.647`; `processing_duration_ms`
aceita até `3.600.000`; `days_until_deadline` aceita inteiro assinado de 32 bits; `horizon_days` aceita
`1..90`; `rating` aceita `1..5`. O servidor não trunca silenciosamente.

## 7. Catálogo canônico de eventos

Os nomes e propriedades abaixo são a allowlist completa da versão 1.

| Evento | Autoridade e momento | Propriedades permitidas |
|---|---|---|
| `account_created` | servidor, após conta concluída e consentimento efetivo | `method: email_password`; `origin: beta_invite \| direct \| unknown` |
| `onboarding_started` | cliente, ao abrir a primeira etapa pela primeira vez | `device_class`; `display_mode`; `entry_point: account_created \| resumed` |
| `availability_saved` | servidor, após commit válido | `weekly_minutes`; `window_count`; `has_recurring_blocks` |
| `activity_created` | servidor, após commit | `activity_type`; `priority`; `estimated_minutes`; `days_until_deadline`; `deadline_has_time`; `has_discipline` |
| `plan_generation_requested` | servidor, ao aceitar o comando | `active_activity_count`; `horizon_days`; `generation_reason` |
| `plan_generated` | servidor, após publicação confirmada | `session_count`; `planned_load_minutes`; `net_capacity_minutes`; `processing_duration_ms`; `feasibility`; `rules_version` |
| `plan_conflict_detected` | servidor, ao produzir conflito | `deficit_minutes`; `first_deadline_bucket`; `involved_activity_count`; `largest_available_window_minutes`; `feasibility` |
| `plan_change_accepted` | servidor, após publicação atômica | `created_count`; `moved_count`; `removed_count`; `generation_reason` |
| `study_session_started` | servidor, após iniciar execução | `session_source`; `planned_minutes`; `device_class` |
| `study_session_completed` | servidor, após reconciliação atômica | `session_source`; `planned_minutes`; `actual_minutes`; `was_pinned` |
| `study_session_skipped` | servidor, após transição | `advance_bucket`; `reason_provided`; `reason_code` opcional e enumerado |
| `activity_completed` | servidor, após transição | `on_time`; `estimated_minutes`; `actual_minutes`; `planned_support`; `planned_session_count` |
| `priority_explanation_opened` | cliente, na primeira abertura por contexto | `risk_level`; `primary_reason`; `device_class` |
| `plan_confidence_submitted` | cliente, após resposta opcional | `rating: 1..5`; `feasibility`; `moment: first_plan \| replan` |

`plan_confidence_submitted` complementa o catálogo mínimo do PRD porque a métrica de confiança não
pode ser calculada sem uma resposta estruturada. Não aceita comentário ou justificativa textual.

### 7.1 Mapeamento dos nomes do PRD

| Termo do PRD | Campo canônico |
|---|---|
| método | `method` |
| origem | `origin` ou `session_source`, conforme o evento |
| dispositivo | `device_class` |
| minutos semanais | `weekly_minutes` |
| número de janelas | `window_count` |
| tipo | `activity_type` |
| esforço | `estimated_minutes` |
| dias até o prazo | `days_until_deadline` |
| atividades ativas | `active_activity_count` |
| horizonte | `horizon_days` |
| sessões | `session_count` |
| carga | `planned_load_minutes` |
| capacidade | `net_capacity_minutes` |
| duração do processamento | `processing_duration_ms` |
| primeiro prazo | `first_deadline_bucket`, nunca data/hora exata |
| criadas, movidas e removidas | campos terminados em `_count` |
| duração planejada/real | `planned_minutes`/`actual_minutes` |
| motivo opcional | `reason_code`; `reasonOther` nunca entra em analytics |
| nível de risco | `risk_level` |
| motivo principal | `primary_reason` enumerado |

## 8. Regras específicas de emissão

### 8.1 Eventos server-side

- emitir apenas após a transação de domínio confirmar sucesso;
- falha ou rollback não emite evento de sucesso;
- conflito de capacidade pode emitir `plan_conflict_detected`, pois é resultado de domínio;
- timeout desconhecido aguarda reconciliação idempotente antes de emitir;
- um retry não cria evento duplicado;
- o produtor fornece propriedades já normalizadas, nunca linha de banco ou corpo HTTP inteiro.

### 8.2 Eventos client-side

- fila somente em memória durante o P0;
- sem consentimento ou offline, descartar; não fazer backfill posterior;
- falha de analytics não bloqueia a ação principal nem exibe toast de erro ao aluno;
- a fronteira retorna apenas aceite/rejeição técnica e nunca aceita lote sem limite;
- `priority_explanation_opened` dispara uma vez por contexto aberto, não por renderização;
- `plan_confidence_submitted` dispara somente após envio voluntário da nota.

### 8.3 Eventos de teste

`development` e `preview` são excluídos das métricas do beta. Contas sintéticas do beta, se
excepcionalmente necessárias para smoke, são marcadas em registro privado de teste; essa classificação
é definida pelo servidor e não por propriedade enviada pelo cliente.

## 9. Propriedades proibidas

É proibido coletar, direta ou indiretamente:

- nome, e-mail, telefone, matrícula ou identificador institucional;
- `user_id`, `activity_id`, `discipline_id`, `session_id`, `plan_id` ou ID externo em `properties`;
- título de atividade/disciplina, notas, Markdown, links, nome de arquivo ou material;
- `reasonOther`, busca, texto de erro bruto, conteúdo de formulário ou clipboard;
- URL completa, query string, hash, referrer ou rota contendo identificador;
- IP persistido, user-agent bruto, fingerprint, localização precisa ou advertising ID;
- token, cookie, header de autorização, chave de idempotência ou correlation ID;
- payload, snapshot ou hash reversível de conteúdo acadêmico;
- gravação de tela, DOM, áudio, vídeo, heatmap ou sequência completa de cliques;
- atributo livre, objeto aninhado ou nova propriedade fora da allowlist.

Hasher e truncar um valor proibido não o transforma automaticamente em propriedade permitida.

## 10. Métricas do beta

### 10.1 População e janela

- universo analítico: contas do ambiente `beta` com consentimento `granted` no momento do evento;
- excluir contas registradas como sintéticas, equipe ou automação;
- coorte: data UTC da ativação, preservando também a semana civil definida para o relatório;
- métricas de 24 horas usam duração exata desde o evento inicial;
- contagens usam eventos deduplicados e sujeitos distintos quando a fórmula disser “usuários”;
- todo relatório mostra numerador, denominador, período, versão do contrato e cobertura de consentimento.

### 10.2 Fórmulas

| Métrica | Fórmula canônica | Sinal inicial |
|---|---|---|
| cobertura de consentimento | contas com `granted` ÷ contas elegíveis do beta | informativa; não é meta de produto |
| ativação | sujeitos com `availability_saved` + `activity_created` + `plan_generated` até 24 h da criação da conta ÷ contas com consentimento já efetivo na criação e observáveis por 24 h | ≥ 50% |
| primeira execução | ativados com `study_session_started` até 24 h após ativação ÷ ativados observáveis por 24 h | ≥ 40% |
| conclusão de sessões | sessões distintas concluídas ÷ sessões distintas iniciadas no período | ≥ 70% |
| adoção do plano | ativados com ao menos uma sessão concluída nos primeiros 7 dias ÷ ativados observáveis por 7 dias | ≥ 50% |
| retenção W4 | ativados com ação significativa entre dias 22 e 28 ÷ ativados observáveis por 28 dias | ≥ 30% |
| entrega no prazo | atividades com `activity_completed.on_time=true` ÷ atividades concluídas | estabelecer baseline |
| confiança | média e distribuição de `rating` em `plan_confidence_submitted` | média ≥ 4/5 |
| erro de esforço | média/mediana de `abs(actual_minutes - estimated_minutes)` e erro percentual quando estimativa > 0 | medir antes de definir meta |

Ação significativa para W4 é pelo menos um destes eventos:

- `activity_created`;
- `plan_generation_requested`;
- `study_session_started`;
- `study_session_completed`.

Abrir o aplicativo ou uma explicação, isoladamente, não conta como retenção.

### 10.3 Métrica norte

> **Atividades concluídas no prazo com apoio de sessões planejadas pelo SeekIn.**

Contar `activity_completed` distinto quando:

```text
on_time = true
planned_support = true
planned_session_count >= 1
```

O relatório apresenta total e média por sujeito ativado observável no período. Não usa títulos nem
expõe quais atividades compõem o resultado.

### 10.4 Amostra pequena

O beta começa com 1 a 5 pessoas. Portanto:

- nenhum percentual é apresentado sem numerador e denominador;
- coorte incompleta não entra no denominador de 24 h, 7 dias ou 28 dias;
- não segmentar por instituição, curso, disciplina, idade, gênero ou outra característica pessoal;
- com menos de cinco sujeitos, não criar cortes adicionais nem ranking individual;
- registrar intervalo e natureza exploratória; não declarar causalidade ou tendência de mercado;
- feedback qualitativo é analisado separadamente e não usado para identificar linhas de eventos.

## 11. Retenção, acesso e exclusão

### 11.1 Retenção inicial

| Dado | Retenção máxima inicial |
|---|---|
| `product_events` bruto | 90 dias corridos |
| agregados diários sem `subject_key` | 12 meses ou encerramento da análise do beta, o que ocorrer primeiro |
| estado atual de consentimento | enquanto a conta existir |
| histórico de concessão/retirada | conta ativa e até 90 dias após exclusão, sujeito à revisão do SKN-134 |
| fila no cliente | somente memória da sessão; não persiste no P0 |

Uma mudança de retenção exige finalidade, aprovador, impacto e atualização deste contrato. Jobs de
expurgo produzem somente contagens e resultado técnico, sem copiar eventos para logs.

### 11.2 Acesso

- escrita somente pelo backend autenticado e validado;
- leitura bruta restrita à função de agregação e manutenção autorizada;
- Product Owner recebe agregados, nunca uma linha do tempo individual;
- suporte não recebe acesso a analytics por padrão;
- exportação para planilha ou ferramenta externa é proibida no P0;
- acesso excepcional é auditado com motivo, sem conteúdo do evento no log.

### 11.3 Exclusão e retirada

O backend recalcula `subject_key` pelas versões ativas da chave, remove eventos brutos correspondentes
e registra apenas o resultado da operação. Rotação de HMAC mantém mapa de versões enquanto houver
dado dentro da retenção; não mantém tabela de reversão de pseudônimos.

## 12. Contrato de validação e evolução

Cada evento possui schema Zod fechado. A fronteira:

1. autentica o usuário;
2. consulta consentimento atual;
3. atribui ambiente, sujeito, horário e versão;
4. valida nome e propriedades;
5. calcula deduplicação;
6. persiste no schema privado;
7. responde sem ecoar o payload.

Mudança compatível adiciona evento ou propriedade opcional com nova versão do schema. Renomear,
remover, mudar tipo/finalidade ou enviar a terceiro é incompatível e exige migração, nova versão do
aviso e análise sobre renovação do consentimento.

## 13. Plano mínimo de testes do SKN-130

| ID | Prova | Nível |
|---|---|---|
| `ANA-001` | sem consentimento, endpoint não persiste evento | integração + DB |
| `ANA-002` | consentimento concedido aceita apenas evento allowlisted | contrato + integração |
| `ANA-003` | retirada bloqueia imediatamente e descarta fila | componente + integração |
| `ANA-004` | período anterior à concessão não recebe backfill | integração |
| `ANA-005` | evento/propriedade/campo extra inválido é rejeitado | propriedade + contrato |
| `ANA-006` | título, nota, link, e-mail, token e ID de domínio não chegam ao banco/log | segurança + DB |
| `ANA-007` | retry igual não duplica; corpo divergente conflita | integração + DB |
| `ANA-008` | rollback de negócio não emite sucesso | integração |
| `ANA-009` | eventos client-side usam identidade e horário do servidor | integração |
| `ANA-010` | desenvolvimento, preview e contas sintéticas não entram no beta | unidade + integração |
| `ANA-011` | fórmulas reproduzem dataset sintético conhecido | unidade + DB |
| `ANA-012` | expurgo remove bruto vencido sem apagar agregado permitido | DB |
| `ANA-013` | exclusão/retirada remove eventos vinculáveis dentro do processo | integração + DB |
| `ANA-014` | cliente segue funcional quando analytics falha | componente + E2E |

Fixture mínima: cinco sujeitos sintéticos, um sem consentimento, um retirado e três consentidos com
eventos duplicados, fora de ordem e em diferentes ambientes. O oráculo declara os numeradores e
denominadores exatos de cada métrica.

## 14. Monitoramento do próprio pipeline

Sem armazenar payloads, acompanhar:

- eventos aceitos, rejeitados e deduplicados por nome/código;
- latência e falha da fronteira;
- atraso do expurgo;
- versão desconhecida recebida;
- divergência entre consentimento e tentativa de emissão;
- tamanho do banco e custo;
- cobertura de consentimento separada das métricas de produto.

Alerta operacional nunca inclui `subject_key` em canal externo.

## 15. Critérios de aceite do SKN-007

- [x] analytics first-party no Supabase e ausência de ferramenta externa estão explícitos;
- [x] produto, operação, auditoria e pesquisa possuem finalidades separadas;
- [x] opt-in, recusa, retirada, não backfill e não condicionamento de uso estão definidos;
- [x] copy curta de consentimento e gerenciamento em Configurações estão definidos;
- [x] envelope, autoridade, deduplicação e schema fechado estão definidos;
- [x] todos os eventos mínimos do PRD possuem propriedade, tipo e momento de emissão;
- [x] propriedades proibidas incluem conteúdo acadêmico, dados pessoais e identificadores técnicos;
- [x] armazenamento privado, pseudonimização, acesso, retenção e exclusão estão definidos;
- [x] as oito métricas do PRD e a métrica norte possuem fórmula reproduzível;
- [x] amostra pequena, cobertura de consentimento e coortes incompletas não induzem conclusão falsa;
- [x] plano mínimo de testes cobre consentimento, allowlist, duplicidade, falha e privacidade;
- [x] evolução incompatível exige nova versão e revisão de consentimento.

## 16. Fora do escopo

- instalar ou contratar ferramenta externa;
- implementar tabelas, endpoint, SDK ou dashboard antes do SKN-130;
- definir termos jurídicos completos, responsabilidade do SKN-134;
- coletar marketing, publicidade, replay, heatmap ou atribuição multicanal;
- criar perfil comportamental individual ou score de estudante;
- expor analytics ao cliente, comunidade ou instituição;
- tratar métricas exploratórias do beta como prova causal.

---

Este contrato é a única fonte de verdade para analytics do P0. Se uma propriedade não estiver na
allowlist, ela não deve ser coletada.
