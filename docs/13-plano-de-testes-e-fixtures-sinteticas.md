# Plano de testes e fixtures sintéticas do SeekIn

> Estratégia canônica do SKN-006 para provar o motor de planejamento, o banco, os contratos, os
> componentes, as jornadas ponta a ponta e o comportamento por dispositivo sem usar dados reais.

**Status:** aprovado para implementação

**Versão:** 1.0

**Data:** 13 de setembro de 2026

**Item:** SKN-006

**Documentos relacionados:** [PRD](01-prd-mvp-planner.md) ·
[PWA e responsividade](02-requisitos-tecnicos-pwa-responsividade.md) ·
[Arquitetura](03-arquitetura-tecnica-e-infraestrutura.md) ·
[Engenharia](04-requisitos-de-engenharia-e-qualidade.md) ·
[Contrato de entrega](06-contrato-canonico-entrega-rastreabilidade.md) ·
[Modelo físico e HTTP](12-modelo-fisico-contratos-http-datas-ids.md)

---

## 1. Objetivo

Este documento define:

- qual nível de teste prova cada tipo de comportamento;
- como nomear, localizar e executar as suítes;
- como criar dados sintéticos determinísticos e seguros;
- como cobrir todas as invariantes do motor;
- como cobrir os 16 casos extremos obrigatórios do PRD;
- como verificar banco, contratos, componentes e jornadas completas;
- quais navegadores, larguras e modos de entrada formam a matriz mínima;
- quais evidências bloqueiam promoção entre portões.

O SKN-006 entrega o plano e a matriz. A implementação das suítes ocorre nos itens responsáveis pelo
comportamento, especialmente SKN-016–022, SKN-040–126 e SKN-130–135.

## 2. Fontes e precedência

A especificação foi reconciliada com:

1. PRD §§11, 13, 14, 18 e 20;
2. modelo físico e HTTP §§3–4, 8–13;
3. Engenharia §8 e definição de pronto;
4. requisitos PWA §§3, 6, 9 e 12;
5. backlog canônico e dependências de cada item.

Em conflito, prevalece a regra mais específica e mais recente do modelo físico. Isso resolve, por
exemplo, prazo sem hora como 23:59 no fuso registrado, concorrência por `expectedRevision` e
publicação atômica por `expectedCurrentPlanId`.

## 3. Estado atual e adoção incremental

| Capacidade | Estado em SKN-006 | Adoção responsável |
|---|---|---|
| Vitest | instalado e executado pelo `pnpm validate` | ampliar por item funcional |
| pgTAP | 48 asserções aprovadas no Cloud isolado | ampliar por item funcional |
| `fast-check` | ainda não instalado | SKN-085 e SKN-088 |
| Testing Library | ainda não instalada | primeiro item de componente funcional |
| Playwright | prova técnica executada, suíte de produto ainda ausente | SKN-026 e SKN-126 |
| Seed determinístico | builders e seed SQL idempotente verificados no Cloud isolado | SKN-016 concluído |
| Banco de teste | projeto Cloud isolado `ildvwjylcyhbpopjjasi` provisionado | SKN-013; preservar isolamento |

Adicionar uma ferramenta antes do item que realmente a utiliza é proibido. A versão deve ser exata,
ficar no lockfile e passar pela revisão de licença e manutenção definida em Engenharia §13.

## 4. Princípios obrigatórios

1. **Comportamento antes de porcentagem:** cobertura global não compensa regra crítica sem teste.
2. **Menor nível suficiente:** provar regra pura em unidade ou propriedade antes de repetir detalhes
   em E2E.
3. **Fronteiras reais:** integração prova serialização, autorização, persistência e transação reais.
4. **Relógio controlado:** nenhuma fixture funcional depende da data em que o teste é executado.
5. **Determinismo:** seed, versão de regras, fuso e ordem de entrada fazem parte da reprodução.
6. **Falha explícita:** timeout, rede indisponível e rollback nunca podem aparentar sucesso.
7. **Isolamento:** nenhum teste destrutivo aponta para beta ou produção.
8. **Dados sintéticos:** nomes, e-mails, notas, links e screenshots não vêm de estudantes reais.
9. **Acessibilidade observável:** estado, risco e progresso continuam compreensíveis sem cor e sem
   mouse.
10. **Uma versão do plano:** Hoje, Lista, Calendário e Gantt são projeções do mesmo plano publicado.

## 5. Pirâmide e responsabilidade de cada nível

| Código | Nível | Ferramenta | Prova principal | Executa em |
|---|---|---|---|---|
| `UT` | unidade | Vitest | regra pura, caso de uso e contrato local | todo PR |
| `PT` | propriedade | Vitest + fast-check | invariantes em muitas combinações geradas | todo PR do motor |
| `CT` | componente | Testing Library + Vitest | estado, semântica, teclado e feedback | todo PR de UI |
| `DB` | banco | pgTAP no Supabase Cloud isolado | constraints, grants, RLS, funções e transações | PR de banco e gate remoto |
| `IT` | integração | Vitest contra ambiente isolado | repositórios, Auth e Edge Functions | PR aplicável e preview |
| `E2E` | ponta a ponta | Playwright | jornada integrada e contrato visível | preview, RC e agenda noturna |
| `PERF` | desempenho | benchmark versionado | p95 do motor e budgets web | item de performance e RC |
| `MAN` | manual assistido | teclado, leitor de tela e dispositivo real | aspectos não cobertos com confiança por automação | antes do beta |

### 5.1 Regra de duplicação útil

Um risco pode aparecer em vários níveis quando cada teste prova uma fronteira diferente. Exemplo:

- `UT`: cálculo do déficit;
- `DB`: publicação parcial e conflito persistem atomicamente;
- `IT`: comando retorna código e corpo contratados;
- `E2E`: o aluno vê déficit e não recebe promessa de plano viável.

Não duplicar em E2E todas as combinações já provadas por unidade ou propriedade.

## 6. Organização, nomes e comandos

### 6.1 Estrutura alvo

```text
packages/
  contracts/src/**/*.test.ts
  domain/src/**/*.test.ts
  planner-core/src/**/*.test.ts
  planner-core/src/**/*.property.test.ts
  planner-core/test/fixtures/
apps/web/app/**/*.test.tsx
apps/web/test/fixtures/
supabase/tests/database/*.test.sql
supabase/tests/fixtures/*.sql
tests/integration/**/*.test.ts
tests/e2e/**/*.spec.ts
tests/e2e/fixtures/
tests/performance/
```

### 6.2 Nomenclatura

- suíte: `[nível] [módulo] — comportamento`;
- caso extremo: incluir `CE-XXX` no nome do teste;
- critério do PRD: incluir `CA-XXX` no teste agregador;
- propriedade: descrever a invariante, não a implementação;
- E2E: nomear pela jornada e resultado, não pela sequência de cliques;
- pgTAP: arquivo numérico por domínio e asserts com requisito ou invariante.

Exemplos:

```text
UT planner capacity — CA-003 limita reserva a 240 minutos
PT planner allocation — nenhuma sessão atravessa bloqueio
DB ownership — usuário A não referencia atividade do usuário B
E2E planning — CA-008 cancelar proposta preserva plano vigente
```

### 6.3 Comandos canônicos

Os scripts entram no `package.json` quando as ferramentas correspondentes forem implementadas. A
interface planejada é:

```bash
pnpm test
pnpm test:planner
pnpm test:components
pnpm test:integration
pnpm supabase:test
pnpm test:e2e
pnpm test:e2e:critical
pnpm test:performance
pnpm validate
```

`pnpm validate` continua rápido o suficiente para todo PR. Suítes remotas, cross-browser e de
desempenho podem ficar em jobs separados, mas um gate obrigatório não pode ser omitido para promover
o item responsável.

## 7. Contrato das fixtures sintéticas

### 7.1 Envelope comum

Toda fixture do planner declara explicitamente:

```ts
type PlannerFixture = {
  fixtureId: string;
  contractVersion: 1;
  rulesVersion: string;
  now: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  preferences: {
    preferredSessionMinutes: number;
    minimumSessionMinutes: number;
    reservePercent: number;
    dailyLimitMinutes: number;
  };
  availability: unknown[];
  blocks: unknown[];
  activities: unknown[];
  protectedSessions: unknown[];
  expected: unknown;
};
```

Os tipos concretos vêm do contrato Zod de SKN-080. `unknown[]` neste exemplo apenas evita antecipar
um contrato TypeScript que ainda não foi implementado.

### 7.2 Base temporal

Salvo indicação específica, usar:

| Campo | Valor sintético |
|---|---|
| relógio | `2026-09-14T12:00:00Z` |
| fuso | `America/Sao_Paulo` |
| semana | segunda-feira (`1`) |
| horizonte curto | 14 dias |
| horizonte máximo | 90 dias |
| sessão preferida | 50 minutos |
| sessão mínima | 25 minutos |
| reserva | 20% |
| limite diário | 240 minutos |

Testes de horário de verão usam `America/New_York`, porque `America/Sao_Paulo` não possui transição
no período de referência. Os instantes de transição ficam escritos na fixture; o teste não consulta
“agora”.

### 7.3 Identidade e conteúdo

- IDs são UUIDs válidos, fixos por fixture e nunca reaproveitados entre `user_a` e `user_b`;
- fixtures persistidas usam usuários sintéticos criados para o ambiente descartável;
- títulos seguem rótulos neutros como `Atividade A`, nunca conteúdo acadêmico real;
- e-mails de teste usam domínio reservado, por exemplo `user-a@example.test`;
- `input_hash`, `output_hash`, versões e revisions são explícitos quando relevantes;
- ordem de arrays pode ser permutada nos testes de determinismo;
- cada fixture informa o resultado esperado em minutos, estados e códigos estáveis.

### 7.4 Famílias reutilizáveis

| Fixture | Propósito |
|---|---|
| `FX-BASE-001` | um usuário, uma janela, uma atividade viável e nenhum bloqueio |
| `FX-USERS-002` | `user_a` e `user_b` com árvores de dados separadas |
| `FX-PLAN-003` | plano vigente, proposta e sessões protegidas |
| `FX-OFFLINE-004` | último plano persistido por usuário e timestamp de sincronização |
| `FX-STRESS-005` | 200 atividades em 90 dias, geradas por seed fixo |
| `FX-DST-006` | horários inexistente e duplicado em `America/New_York` |

SKN-016 materializa essas famílias como builders TypeScript e seed SQL idempotente. O seed padrão
continua pequeno; `FX-STRESS-005` é gerada sob demanda e não polui testes comuns.

Implementação canônica:

- builders: `packages/planner-core/test/fixtures/planner-fixtures.ts`;
- seed pequeno: `supabase/seed.sql`;
- comando Cloud isolado: `pnpm supabase:seed:g1-dev`;
- project ref fixo no comando: `ildvwjylcyhbpopjjasi`.

## 8. Matriz de invariantes do motor

| ID | Invariante | Nível mínimo | Estratégia | Item que implementa |
|---|---|---|---|---|
| `INV-001` | mesma entrada + regras produz mesma saída | `UT` + `PT` | repetir e permutar coleções equivalentes | SKN-083/088 |
| `INV-002` | sessão não sobrepõe sessão ou bloqueio rígido | `UT` + `PT` | gerar intervalos e testar interseção vazia | SKN-085/088 |
| `INV-003` | carga automática não supera capacidade líquida | `UT` + `PT` | somar minutos por dia e horizonte | SKN-081/085 |
| `INV-004` | concluída nunca é alterada | `UT` | comparar identidade e horário antes/depois | SKN-087 |
| `INV-005` | fixada é preservada ou causa conflito explícito | `UT` + `PT` | gerar proteção dentro e fora da capacidade | SKN-087/088 |
| `INV-006` | esforço alocado não supera esforço restante | `UT` + `PT` | somar sessões por atividade | SKN-084/085 |
| `INV-007` | dependências, quando presentes, são respeitadas | `UT` + `PT` | gerar grafo acíclico válido | item futuro que ativar dependências |
| `INV-008` | duração zero é impossível e limites são respeitados | `UT` + `PT` | partições de inteiros positivos | SKN-084/088 |
| `INV-009` | inviável retorna primeiro prazo e déficit exatos | `UT` + `IT` | comparar demanda e capacidade acumuladas | SKN-082/086 |
| `INV-010` | fuso e DST não deslocam intenção civil silenciosamente | `UT` + `IT` | tabela de instantes e diagnósticos | SKN-061/072/088 |
| `INV-011` | falha preserva último plano publicado | `IT` + `DB` | injetar falha antes e durante a transação | SKN-091/094 |
| `INV-012` | explicação corresponde aos fatores usados | `UT` + `PT` | recomputar código e parâmetros da decisão | SKN-083/088 |

`INV-007` não autoriza dependências de atividade no P0. A propriedade entra quando essa capacidade
for formalmente ativada; até lá, o contrato deve rejeitar campo desconhecido.

## 9. Matriz obrigatória dos casos extremos do PRD

Cada linha possui pelo menos um nível automatizado e uma fixture sintética reproduzível.

| ID | Caso extremo | Nível obrigatório | Fixture e oráculo | Itens responsáveis |
|---|---|---|---|---|
| `CE-001` | conta sem disponibilidade | `UT` + `IT` + `E2E` | `FX-CE-001`: atividade de 60 min, nenhuma janela; proposta `infeasible`, déficit 60, nenhuma sessão e CTA para revisar disponibilidade | SKN-052/056/086/105 |
| `CE-002` | atividade sem hora de prazo | `UT` + `DB` + `IT` | `FX-CE-002`: prazo civil `2026-09-18`, hora nula, São Paulo; persiste `deadline_has_time=false` e resolve 23:59 local sem mudar a data | SKN-017/072 |
| `CE-003` | atividade com prazo no passado | `UT` + `CT` | `FX-CE-003`: prazo `2026-09-13T18:00:00-03:00`, esforço restante 50; risco `overdue`, prioridade anterior às não vencidas e label textual | SKN-071/082/083/075 |
| `CE-004` | esforço menor que sessão mínima | `UT` + `PT` | `FX-CE-004`: restante 20, mínimo 25; cria uma sessão final de 20, nunca zero e sem completar com minutos artificiais | SKN-084/088 |
| `CE-005` | realizado maior que estimado | `UT` + `DB` + `IT` | `FX-CE-005`: estimado 50, realizado 65; restante 0, progresso concluído/sobre-estimativa sinalizado, nenhum valor negativo | SKN-073/101 |
| `CE-006` | janelas sobrepostas | `UT` + `PT` + `DB` | `FX-CE-006`: segunda 18:00–20:00 e 19:00–21:00; consolida 180 min, não 240, com saída determinística | SKN-060/081/088 |
| `CE-007` | bloqueio ocupa toda a disponibilidade | `UT` + `PT` + `E2E` | `FX-CE-007`: janela 18:00–20:00 e bloqueio igual; capacidade operacional 0, plano parcial/inviável e causa visível | SKN-061/081/086/105 |
| `CE-008` | mudança de fuso horário | `UT` + `IT` | `FX-CE-008`: perfil muda de São Paulo para Lisboa; prazo salvo mantém intenção/instante contratados e recorrência preserva fuso de origem | SKN-061/072/088 |
| `CE-009` | transição de horário de verão | `UT` + `PT` + `IT` | `FX-DST-006`: `2026-03-08 02:30` inexistente e `2026-11-01 01:30` duplicado em Nova York; retorna diagnóstico explícito, sem correção silenciosa | SKN-061/088 |
| `CE-010` | duas atividades com mesmo prazo | `UT` + `PT` | `FX-CE-010`: prazo e folga iguais; desempate por prioridade, iniciada e criação; permutar entrada não muda saída | SKN-083/088 |
| `CE-011` | atividade concluída com sessões futuras | `UT` + `DB` + `IT` | `FX-CE-011`: atividade passa a `completed` com duas sessões futuras; sessões deixam o cronograma futuro sem alterar histórico concluído | SKN-071/077/087/101 |
| `CE-012` | replanejamento com todas as sessões fixadas | `UT` + `PT` + `E2E` | `FX-CE-012`: toda capacidade ocupada por fixadas; nenhuma é movida, conflito identifica proteção e proposta resume zero mudanças automáticas | SKN-087/104/105 |
| `CE-013` | arquivamento de disciplina com atividades | `DB` + `IT` + `CT` | `FX-CE-013`: disciplina com duas atividades; arquiva disciplina, preserva atividades/FKs e permite identificá-las sem disciplina ativa | SKN-017/070/075 |
| `CE-014` | falha durante geração | `UT` + `IT` + `DB` + `E2E` | `FX-PLAN-003` + failpoint após criar proposta; rollback total, plano vigente e versão permanecem, erro correlacionado sem payload | SKN-090/091/094/133 |
| `CE-015` | abertura em dois dispositivos | `IT` + `DB` + `E2E` | `FX-CE-015`: ambos leem revision 3; A grava revision 4, B recebe `REVISION_CONFLICT`/`STALE_PLAN`, sem sobrescrita | SKN-100/104/126 |
| `CE-016` | capacidade exatamente igual à demanda | `UT` + `PT` | `FX-CE-016`: capacidade líquida 240 e demanda 240; saldo 0, plano `feasible`, taxa 1,00 e risco conforme limiar crítico, déficit ausente | SKN-081/082/085/088 |

### 9.1 Condição de cobertura

SKN-088 só pode ser verificado quando os testes automatizados usam os IDs `CE-001` a `CE-016` nos
nomes ou metadados e todos estão verdes. Uma busca por esses IDs deve produzir exatamente a matriz
implementada, sem depender de interpretação manual de nomes genéricos.

### 9.2 Casos-limite adicionais de Engenharia §8.2

| ID | Caso | Nível e fixture | Resultado esperado |
|---|---|---|---|
| `ENG-EDGE-001` | atividade sem esforço estimado | `UT` + `IT`; `FX-ENG-001` omite ou zera `estimatedMinutes` | contrato rejeita antes de persistir ou planejar |
| `ENG-EDGE-002` | janela menor que sessão mínima | `UT` + `PT`; `FX-ENG-002` oferece 20 min para mínimo de 25 | não cria sessão inválida; capacidade/deficit permanecem exatos |
| `ENG-EDGE-003` | rotina sobreposta | `UT` + `DB`; reutiliza `FX-CE-006` com recorrências | minutos de interseção são contados uma vez e a saída é determinística |
| `ENG-EDGE-004` | grande quantidade de atividades | `PERF` + `PT`; `FX-STRESS-005` com seed fixo | invariantes passam e p95 atende ao `RNF-001` no ambiente de referência |

## 10. Plano de testes do banco

| Grupo | Provas obrigatórias | Nível | Itens responsáveis |
|---|---|---|---|
| schema limpo | migrations chegam ao mesmo schema em instância vazia | `DB` | SKN-017/022 |
| tipos e checks | minutos, intervalos, estados, prazo e revisions inválidos são rejeitados | `DB` | SKN-017 |
| ownership | toda FK composta rejeita associação entre `user_a` e `user_b` | `DB` | SKN-017/018 |
| grants | `anon` e `authenticated` só possuem operações declaradas | `DB` | SKN-018/022 |
| RLS | proprietário passa; outro usuário falha em `SELECT/INSERT/UPDATE/DELETE` aplicável | `DB` | SKN-018/045 |
| imutabilidade | plano publicado e itens não aceitam edição direta | `DB` | SKN-017/018/091 |
| plano vigente | no máximo um `published` por usuário | `DB` | SKN-017/091 |
| execução concorrente | no máximo uma execução `in_progress` por usuário | `DB` + `IT` | SKN-017/100 |
| atomicidade | publicar, concluir e reconciliar fazem commit integral ou rollback integral | `DB` + `IT` | SKN-091/101 |
| idempotência | mesma chave/corpo repete resposta; corpo diferente gera conflito | `DB` + `IT` | SKN-090–093/100–102 |
| índices | consultas frequentes possuem plano compatível medido por `EXPLAIN` | `DB` | SKN-022 |
| funções privadas | schemas privados não recebem acesso da Data API | `DB` | SKN-018/022 |

Regras operacionais:

- executar somente no projeto Cloud isolado e descartável de desenvolvimento;
- nunca resetar nem executar suíte destrutiva no projeto do beta;
- cada teste inicia transação ou cria namespace identificável e limpa os próprios dados;
- falha na limpeza invalida o ambiente até saneamento;
- Security Advisor e Performance Advisor complementam, mas não substituem, pgTAP.

## 11. Plano de testes de contratos e integração

### 11.1 Contratos Zod

Cada comando deve cobrir:

- corpo válido mínimo e completo;
- `contractVersion` ausente, desconhecida e incompatível;
- campo desconhecido;
- UUID, data, fuso, duração, enum e revision inválidos;
- serialização estável de sucesso e erro;
- ausência de stack, SQL, token, título ou notas em erro/log.

### 11.2 Comandos HTTP

| Comando | Casos de integração mínimos |
|---|---|
| `planner/generate` | auth ausente, entrada válida, inviável, retry idempotente, lock por usuário, timeout e falha preservando vigente |
| `planner/impact` | gatilho válido, recurso alheio como 404, vigente inalterado e proposta obsoleta |
| `planner/confirm` | confirmação atômica, `STALE_PLAN`, retry e rollback no failpoint |
| `sessions/start` | início válido, retry, revision obsoleta e outra execução ativa |
| `sessions/complete` | duração calculada no servidor, realizado acima do estimado, retry e reconciliação atômica |
| `sessions/skip` | motivo ausente, códigos aceitos, `other` válido/inválido e oferta de replanejamento |

Testes de integração usam Auth e banco reais do ambiente isolado. Mocks ficam restritos a falhas
externas ou relógio; não podem substituir RLS, transação ou serialização da Edge Function.

## 12. Plano de testes de componentes

### 12.1 Matriz comum

Todo primitive ou componente de domínio interativo cobre, quando aplicável:

| Estado/capacidade | Prova mínima |
|---|---|
| default e conteúdo | nome, papel e valor acessíveis |
| hover | apenas aprimoramento; ação existe sem hover |
| foco visível | foco perceptível e ordem coerente |
| teclado | Enter/Espaço/Escape/setas conforme padrão do componente |
| toque | alvo de pelo menos 44 × 44 CSS px quando acionável |
| selected/pressed | estado programático e visual coerentes |
| disabled | não dispara ação e informa indisponibilidade |
| loading | bloqueia repetição indevida e mantém nome compreensível |
| empty | informa ausência e oferece próxima ação válida |
| error | causa e recuperação; sem falso sucesso |
| offline | leitura identificada; mutação indisponível |
| reduced motion | nenhuma informação depende de animação |

### 12.2 Componentes críticos

| Componente/fluxo | Cenários adicionais |
|---|---|
| formulário de atividade | prazo com/sem hora, esforço e erro associados ao campo |
| disponibilidade | intervalo inválido, sobreposição e navegação sem arrastar |
| `TaskRow`/`SessionRow` | risco, progresso e status textuais; ações por teclado e toque |
| `FocusField` | uma ação principal e prioridade explicável |
| Dialog/Drawer/BottomSheet | focus trap, Escape, retorno de foco e título acessível |
| Toast/alerta | anúncio não duplicado e mensagem de recuperação |
| Calendário | distinção textual, abrir e mover por alternativa ao drag |
| Gantt | alternativa tabular, foco não preso e ausência no celular |
| diff de replanejamento | criadas, movidas e removidas; aceitar/cancelar inequívocos |

Testing Library prova comportamento DOM; contraste, reflow, toque real e leitor de tela permanecem
na matriz visual/manual.

## 13. Matriz E2E por jornada e critério do PRD

| ID | Jornada/critério | Resultado observável | Navegador mínimo | Itens responsáveis |
|---|---|---|---|---|
| `J-001` | conta, verificação e entrada | sessão válida; erro não enumera conta | Chromium + WebKit | SKN-040/041 |
| `J-002` | onboarding até primeiro plano (`CA-001`) | viável publica após confirmação; inviável mostra conflito | Chromium | SKN-050–057 |
| `J-003` | rotina com bloqueio (`CA-002/003`) | nenhuma sobreposição; reserva de 20% limita 300 a 240 min | Chromium | SKN-052/053/081 |
| `J-004` | conflito (`CA-004`) | déficit exato e plano parcial/alternativas | Chromium + WebKit | SKN-086/105 |
| `J-005` | recomendação Hoje (`CA-005`) | motivo deriva de prazo, risco, folga ou prioridade | Chromium | SKN-083/110 |
| `J-006` | execução (`CA-006`) | concluir reconcilia esforço, progresso e risco | Chromium + WebKit | SKN-100/101 |
| `J-007` | replanejamento (`CA-007/008`) | protege sessões; cancelar mantém vigente | Chromium | SKN-087/104 |
| `J-008` | equivalência (`CA-009`) | quatro visões mostram mesmo `planId/version` e valores | Chromium | SKN-110–114 |
| `J-009` | responsividade (`CA-010` e `CA-011`) | jornada completa sem hover/drag; Lista padrão compacta | três classes | SKN-115/123 |
| `J-010` | PWA (`CA-012`) | uso web completo e instalação/standalone quando suportados | Chromium + WebKit | SKN-120–122/126 |
| `J-011` | offline e retorno | último plano rotulado; mutação não confirma; sincroniza ao voltar | Chromium | SKN-121/122 |
| `J-012` | logout/dispositivo compartilhado | limpa dados privados e outro usuário não vê plano anterior | Chromium + WebKit | SKN-042/122 |
| `J-013` | isolamento entre contas | usuário B não lê nem altera árvore de A | Chromium + `DB` | SKN-045 |
| `J-014` | Calendário/Gantt | seleção, movimento válido/inválido e alternativa textual | Chromium + Firefox | SKN-112/113 |

Os doze `CA-*` são agregadores de liberação. Um teste E2E não substitui as suítes inferiores que
provam cálculos, ownership, idempotência e atomicidade.

## 14. Matriz de dispositivos, navegadores e entradas

### 14.1 Viewports obrigatórios

| Perfil | Viewport CSS | Orientação | Expectativa principal |
|---|---:|---|---|
| celular pequeno | `360 × 800` | retrato | Lista padrão, navegação inferior, sem overflow |
| celular de referência | `390 × 844` | retrato | jornada principal e alvos de toque |
| tablet retrato | `768 × 1024` | retrato | uma coluna, contexto em drawer, Lista padrão |
| tablet paisagem/notebook estreito | `1024 × 768` | paisagem | contexto ocultável; Gantt só se aprovado |
| desktop | `1280 × 800` | paisagem | navegação lateral e workspace expandido |
| desktop amplo | `1440 × 900` | paisagem | três áreas quando aplicável, sem dispersão |

Além dos pontos fixos, ao menos um teste de reflow executa zoom de 200% ou viewport equivalente sem
perder ação obrigatória.

### 14.2 Navegadores

| Motor Playwright | Cobertura | Observação |
|---|---|---|
| Chromium | toda jornada crítica em todo PR/preview aplicável | representa Chrome/Edge; instalação PWA quando suportada |
| Firefox | smoke das rotas P0 e jornadas com comportamento de layout/entrada | experiência web; instalação não é prometida |
| WebKit | auth, formulários, execução, offline web e jornadas críticas | aproxima Safari; validar dispositivo real antes do beta |

Na release candidate, executar os fluxos críticos nos três motores. As duas versões estáveis mais
recentes dos navegadores principais são verificadas em dispositivo real ou serviço de browsers no
SKN-126; Playwright isoladamente não comprova suporte de instalação em cada sistema.

### 14.3 Modos de entrada e acessibilidade

| Modo | Roteiro mínimo |
|---|---|
| teclado | atravessar shell, formulário, dialog, calendário e alternativa do Gantt sem foco preso |
| toque | criar atividade, abrir sessão, concluir e replanejar sem hover |
| mouse | paridade funcional; drag nunca é caminho único |
| leitor de tela | headings/landmarks, nomes de controles, erros, dialog e mudanças de estado |
| escala de cinza | risco, prazo, progresso e status continuam identificáveis |
| movimento reduzido | overlays e mudanças preservam compreensão sem animação |

## 15. Não funcionais e testes especiais

| Requisito | Estratégia | Gate |
|---|---|---|
| `RNF-001` | `FX-STRESS-005`, 200 atividades/90 dias, warm-up e amostras suficientes para p95 | SKN-089 |
| `RNF-002/016` | medição de resposta local e Web Vitals em build real | SKN-125 |
| `RNF-003` | snapshots estruturais + propriedades de determinismo, nunca snapshot visual opaco | SKN-088 |
| `RNF-004/012` | failpoints e rollback preservando plano vigente | SKN-091/094/133 |
| `RNF-005/006` | matriz negativa A × B em DB, API e E2E | SKN-018/045/132 |
| `RNF-007/011` | auditoria e log correlacionado sem conteúdo privado | SKN-091/131 |
| `RNF-008/014/015` | automação acessível + auditoria manual e viewports | SKN-123/124 |
| `RNF-009` | Chromium, Firefox e WebKit, mais dispositivos reais críticos | SKN-126 |
| `RNF-010` | mensagens fora do domínio e locale pt-BR nas fronteiras de UI | SKN-115/124 |
| `RNF-013` | manifest, service worker, offline e atualização em uso | SKN-120–122/126 |

O benchmark registra CPU, memória, sistema, Node, versão do planner, `rulesVersion`, seed, número de
amostras e p50/p95. Resultado de máquina diferente não é comparado sem declarar o ambiente.

## 16. Ambientes, isolamento e limpeza

| Ambiente | Uso permitido | Dados | Proibições |
|---|---|---|---|
| local | `UT`, `PT`, `CT`, build e mocks de falha | fixtures em memória | segredo real e dependência de relógio externo |
| Cloud dev isolado | `DB` e `IT` destrutivos | seed sintético do SKN-016 | apontar para beta/produção |
| preview | `E2E`, UX e smoke integrado | contas e conteúdo sintéticos | copiar dados reais do beta |
| beta | smoke não destrutivo e validação autorizada | contas do piloto, sem exportar conteúdo para artefatos | reset, seed ou suíte destrutiva |
| produção | health e smoke mínimo após deploy | nenhum dado de fixture persistente | benchmark, teste destrutivo ou conta compartilhada |

Antes de `DB`/`IT`, o runner valida o identificador explícito do projeto. Ausência, ambiguidade ou
identificação do projeto de beta encerra a suíte antes de qualquer escrita.

## 17. Gates e política de falhas

### 17.1 Todo pull request

- instalação congelada;
- formato e lint;
- TypeScript estrito;
- `UT` afetados;
- `PT` quando tocar motor;
- `CT` quando tocar componente;
- build de produção;
- busca por segredos e dados reais aplicável.

### 17.2 Mudança de banco/backend

- migration revisada e não reescrita se já aplicada;
- `DB` no Cloud isolado;
- `IT` do comando alterado;
- proprietário positivo e outro usuário negativo;
- rollback/falha injetada para transações críticas.

### 17.3 Preview e release candidate

- E2E crítico no Chromium no preview;
- três motores na release candidate;
- matriz de viewport quando o comportamento responsivo mudar;
- auditoria manual de teclado/leitor de tela antes do beta;
- benchmark e Web Vitals nos itens próprios;
- todos os `CA-*`, `CAT-*` e riscos de liberação com resultado persistido.

Teste instável é falha. Ele deve ser corrigido ou isolado com item, responsável, impacto e prazo; não
pode receber retry ilimitado nem ser silenciosamente ignorado. Snapshot só é atualizado após revisão
da mudança intencional.

## 18. Evidência mínima por execução

Toda evidência automatizada preserva:

- item e requisitos cobertos;
- commit/SHA;
- ambiente sem expor segredo;
- versões de runtime, schema, contrato e regras;
- fixture/seed e relógio controlado;
- comando exato;
- quantidade de testes e resultado;
- trace, relatório ou resumo persistente quando aplicável;
- falhas conhecidas sem ocultação;
- caminho de reprodução e rollback.

Screenshots, traces e vídeos usam somente dados sintéticos. Relatórios não incluem token, e-mail real,
título, nota, link privado ou snapshot completo do planner de um usuário.

## 19. Critérios de aceite do SKN-006

- [x] níveis do motor, banco, componentes, integração, E2E, desempenho e testes manuais definidos;
- [x] ferramentas, ambientes, nomes, caminhos e comandos alvo definidos;
- [x] contrato de fixture sintética, relógio, fuso, IDs, seed e privacidade definido;
- [x] todas as 12 invariantes mínimas do motor possuem estratégia e item responsável;
- [x] os 16 casos extremos do PRD possuem ID, nível, fixture, oráculo e ownership;
- [x] banco possui matriz de constraints, ownership, RLS, grants, transações e índices;
- [x] componentes possuem estados, interação e acessibilidade mínimos;
- [x] critérios `CA-001` a `CA-012` estão ligados a jornadas E2E;
- [x] dispositivos, viewports, navegadores e modos de entrada possuem matriz mínima;
- [x] gates de PR, banco/backend, preview e release candidate estão explícitos;
- [x] uso de beta/produção por testes destrutivos está proibido;
- [x] evidência e tratamento de testes instáveis estão definidos.

## 20. Fora do escopo

- instalar agora `fast-check`, Testing Library ou Playwright;
- implementar testes de features ainda inexistentes;
- ampliar seed e builders apenas junto dos itens funcionais responsáveis;
- provisionar o projeto Supabase Cloud isolado;
- executar benchmark antes do motor completo;
- declarar WCAG, cross-browser ou critérios do MVP aprovados antes dos respectivos itens;
- usar dados reais para tornar fixtures “mais realistas”.

---

Este plano é entrada obrigatória dos itens de implementação e qualidade. Quando uma regra do PRD,
contrato do planner, schema ou matriz de dispositivos mudar, a fixture e o caso correspondente devem
ser atualizados no mesmo corte.
