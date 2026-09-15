# Matriz de rastreabilidade do SeekIn

> Mapa reverso entre requisitos, itens do backlog e evidências. Esta matriz impede que um requisito fique sem implementação ou que uma entrega seja criada sem origem documental.

**Status:** cobertura inicial completa do escopo documentado  
**Versão:** 0.1  
**Data:** 12 de setembro de 2026  
**Contrato:** [Contrato canônico](06-contrato-canonico-entrega-rastreabilidade.md)  
**Backlog:** [Backlog canônico](07-backlog-canonico.md)

---

## 1. Como ler e manter

- intervalos são inclusivos: `RF-010–012` representa `RF-010`, `RF-011` e `RF-012`;
- itens separados por `/` cooperam para atender o mesmo requisito;
- `Pendente` significa que o item ainda não possui evidência aprovada;
- ao concluir um item, adicionar o link `EV-SKN-*` sem apagar os itens associados;
- requisito dispensado permanece na matriz com decisão, aprovador e impacto;
- uma alteração de requisito atualiza PRD, backlog e matriz no mesmo pull request.

## 2. Cobertura dos requisitos funcionais P0

| Requisito | Item responsável | Portão | Verificação principal | Evidência |
|---|---|---|---|---|
| RF-001 | SKN-040–043 | G3 | E2E criar, entrar, recuperar e sair | Verificado: [EV-SKN-040](evidencias/SKN-040.md), [EV-SKN-041](evidencias/SKN-041.md), [EV-SKN-042](evidencias/SKN-042.md) e [EV-SKN-043](evidencias/SKN-043.md) |
| RF-002 | SKN-044 | G3 | integração de perfil por conta | Verificado: [EV-SKN-044](evidencias/SKN-044.md) |
| RF-003 | SKN-051 | G3 | componente + persistência | Verificado: [EV-SKN-051](evidencias/SKN-051.md) |
| RF-004 | SKN-044 / SKN-051 / SKN-072 | G3 | testes de fuso e persistência | Parcial: [EV-SKN-044](evidencias/SKN-044.md) e [EV-SKN-051](evidencias/SKN-051.md); SKN-072 pendente |
| RF-010–012 | SKN-052 / SKN-060 | G3 | unidade, integração e UI | Parcial: [EV-SKN-052](evidencias/SKN-052.md); CRUD completo do SKN-060 pendente |
| RF-013–014 | SKN-053 / SKN-061 | G3 | recorrência e exceção | Parcial: [EV-SKN-053](evidencias/SKN-053.md); exceções e CRUD completo do SKN-061 pendentes |
| RF-015 | SKN-062 / SKN-093 | G3 | impacto sem publicação | Pendente |
| RF-020–023 | SKN-054 / SKN-070 | G3 | CRUD, integridade e contraste | Parcial: [EV-SKN-054](evidencias/SKN-054.md); cor, descrição, arquivamento e CRUD completo do SKN-070 pendentes |
| RF-030–031 | SKN-055 / SKN-071 | G3 | comando canônico e E2E | Parcial: [EV-SKN-055](evidencias/SKN-055.md); CRUD e estados completos do SKN-071 pendentes |
| RF-032 | SKN-055 / SKN-073 | G3 | unidade e persistência em minutos | Parcial: [EV-SKN-055](evidencias/SKN-055.md); progresso e limites do SKN-073 pendentes |
| RF-033–034 | SKN-055 / SKN-072 | G3 | prazo com/sem hora | Parcial: [EV-SKN-055](evidencias/SKN-055.md); edição e casos temporais do SKN-072 pendentes |
| RF-035 | SKN-071 | G3 | transições de estado | Pendente |
| RF-036–037 | SKN-073 | G3 | limites e propriedades | Pendente |
| RF-038 | SKN-077 / SKN-093 | G3 | análise de impacto | Pendente |
| RF-040–045 | SKN-063 / SKN-081 | G3 | cálculos reconciliados | Parcial: [cálculo puro diário, semanal e total](evidencias/SKN-081.md); consulta e apresentação do SKN-063 pendentes |
| RF-050–051 | SKN-085 / SKN-090 | G3 | invariantes e integração | Parcial: [invariantes de alocação do planner-core](evidencias/SKN-085.md); integração autenticada do SKN-090 pendente |
| RF-052–053 | SKN-084 | G3 | tabela de partições | [Partições e sobras verificadas](evidencias/SKN-084.md) |
| RF-054–055 | SKN-085 | G3 | distribuição e folga | [Distribuição e folga verificadas](evidencias/SKN-085.md) |
| RF-056 | SKN-091 | G3 | transação e imutabilidade | Pendente |
| RF-057 | SKN-083 / SKN-088 | G3 | determinismo | Parcial: [ranking invariável a permutações](evidencias/SKN-083.md); propriedades amplas do SKN-088 pendentes |
| RF-058 | SKN-082 / SKN-086 | G3 | déficit e plano parcial | Verificado: [primeiro déficit e horizonte](evidencias/SKN-082.md) e [plano parcial diagnosticado](evidencias/SKN-086.md) |
| RF-059 | SKN-056 / SKN-096 | G3 | confirmação e cancelamento | Pendente |
| RF-060–061 | SKN-083 | G3 | ordenação e desempate | [Ordem v1 e desempates verificados](evidencias/SKN-083.md) |
| RF-062 | SKN-083 / SKN-110 | G4 | fator usado e texto exibido | Parcial: [fator decisivo produzido pelo motor](evidencias/SKN-083.md); texto na tela Hoje do SKN-110 pendente |
| RF-063–064 | SKN-082 / SKN-106 | G4 | recálculo de risco | Parcial: [cálculo puro de carga, folga e risco](evidencias/SKN-082.md); alertas e integração do SKN-106 pendentes |
| RF-070–076 | SKN-110 | G4 | componente e E2E Hoje | Pendente |
| RF-077–079 | SKN-111 | G4 | grupos e ações da Lista | Pendente |
| RF-080–084 | SKN-005 / SKN-113 | G4 | prova técnica, componente e E2E | Pendente |
| RF-087 | SKN-113 / SKN-123 | G4 | ausência de Gantt compacto | Pendente |
| RF-090–095 | SKN-005 / SKN-112 | G4 | calendário, movimentos e agenda móvel | Pendente |
| RF-100 | SKN-100 | G4 | integração e concorrência | Pendente |
| RF-101–102 | SKN-101 | G4 | transação e reconciliação | Pendente |
| RF-103 | SKN-102 | G4 | componente + integração | Pendente |
| RF-104 | SKN-103 / SKN-087 | G4 | preservação da sessão | Parcial: [proteção no motor](evidencias/SKN-087.md); comandos de fixar e mover do SKN-103 pendentes |
| RF-105–108 | SKN-087 / SKN-104 | G4 | proposta, aceite e cancelamento | Parcial: [proposta preserva sessões protegidas](evidencias/SKN-087.md); diff, aceite e cancelamento do SKN-104 pendentes |
| RF-110–111 | SKN-074 | G3 | sanitização e URL segura | Pendente |
| RF-120–122 | SKN-106 | G4 | causa, ação e deduplicação | Pendente |
| RF-130–132 | SKN-120 | G4 | instalação e uso web | Pendente |
| RF-133 | SKN-121 | G4 | service worker | Pendente |
| RF-134–135 | SKN-122 | G4 | offline e ausência de falso sucesso | Pendente |
| RF-136 | SKN-121 | G4 | atualização durante sessão/formulário | Pendente |
| RF-137–139 | SKN-123 / SKN-126 | G4 | entrada e matriz de dispositivos | Pendente |

## 3. Cobertura dos requisitos não funcionais

| Requisito | Item responsável | Portão | Verificação principal | Evidência |
|---|---|---|---|---|
| RNF-001 | SKN-089 | G3 | benchmark 200 atividades/90 dias p95 | Verificado: [benchmark reproduzível do planner-core](evidencias/SKN-089.md) |
| RNF-002 | SKN-125 | G4 | resposta visual e profiling | Pendente |
| RNF-003 | SKN-088 / SKN-092 | G3 | determinismo e idempotência | Parcial: [determinismo e propriedades do motor](evidencias/SKN-088.md); retry e concorrência do SKN-092 pendentes |
| RNF-004 | SKN-091 / SKN-092 | G3 | atomicidade e concorrência | Pendente |
| RNF-005 | SKN-018 / SKN-045 / SKN-132 | G5 | RLS, E2E e revisão de segurança | Parcial: [RLS/grants](evidencias/SKN-018.md) e [matriz negativa](evidencias/SKN-045.md) verificados; SKN-132 pendente |
| RNF-006 | SKN-018 / SKN-045 | G3 | isolamento multiusuário | Verificado: [RLS/grants](evidencias/SKN-018.md) e [matriz negativa](evidencias/SKN-045.md) |
| RNF-007 | SKN-091 / SKN-131 | G5 | auditoria e correlação | Pendente |
| RNF-008 | SKN-003 / SKN-124 | G4 | auditoria WCAG 2.2 AA | Pendente |
| RNF-009 | SKN-126 | G4 | Chromium, Firefox e WebKit | Pendente |
| RNF-010 | SKN-003 / SKN-115 | G4 | textos fora do domínio e pt-BR | Pendente |
| RNF-011 | SKN-027 / SKN-094 / SKN-131 | G5 | falha correlacionada sem conteúdo privado | Pendente |
| RNF-012 | SKN-094 / SKN-133 | G5 | falha injetada e recuperação | Pendente |
| RNF-013 | SKN-120–122 / SKN-126 | G4 | instalação, cache e atualização | Pendente |
| RNF-014 | SKN-123 | G4 | viewports compactos sem overflow | Pendente |
| RNF-015 | SKN-003 / SKN-123 | G4 | alvos mínimos 44 × 44 | Pendente |
| RNF-016 | SKN-125 | G4 | Web Vitals p75 | Pendente |

## 4. Cobertura dos critérios de aceite do PRD

| Critério | Item responsável | Portão | Evidência |
|---|---|---|---|
| CA-001 — Primeira geração | SKN-056 / SKN-085 / SKN-090 | G3 | Parcial: [alocação pura verificada](evidencias/SKN-085.md); integração e confirmação pendentes |
| CA-002 — Respeito à rotina | SKN-061 / SKN-081 / SKN-085 | G3 | Parcial: [capacidade](evidencias/SKN-081.md) e [alocação sem sobreposição](evidencias/SKN-085.md) verificadas; CRUD completo do SKN-061 pendente |
| CA-003 — Reserva de capacidade | SKN-081 | G3 | Pendente |
| CA-004 — Conflito de capacidade | SKN-086 / SKN-105 | G4 | Parcial: [diagnóstico puro e plano parcial](evidencias/SKN-086.md); resolução de conflito na interface do SKN-105 pendente |
| CA-005 — Prioridade explicável | SKN-083 / SKN-110 | G4 | Parcial: [fatores objetivos do motor](evidencias/SKN-083.md); apresentação ao usuário no SKN-110 pendente |
| CA-006 — Conclusão de sessão | SKN-101 | G4 | Pendente |
| CA-007 — Replanejamento seguro | SKN-087 / SKN-104 | G4 | Parcial: [preservação canônica verificada](evidencias/SKN-087.md); resumo e aplicação do SKN-104 pendentes |
| CA-008 — Cancelamento do replanejamento | SKN-096 / SKN-104 | G4 | Pendente |
| CA-009 — Consistência entre visões | SKN-095 / SKN-114 | G4 | Pendente |
| CA-010 — Responsividade | SKN-115 / SKN-123 | G4 | Pendente |
| CA-011 — Lista compacta | SKN-111 / SKN-123 | G4 | Pendente |
| CA-012 — PWA progressiva | SKN-120–122 | G4 | Pendente |

## 5. Cobertura PWA e técnica

| Requisito/critério | Item responsável | Verificação principal | Evidência |
|---|---|---|---|
| RT-PWA-001 | SKN-026 / SKN-120 | HTTPS no ambiente beta | Pendente |
| RT-PWA-002–005 | SKN-120 | manifest e modo `standalone` | Pendente |
| RT-PWA-006 | SKN-120 / SKN-126 | jornada completa sem instalação | Pendente |
| RT-PWA-007–008 | SKN-120 | convite contextual e instruções por plataforma | Pendente |
| CAT-001 — Instalação progressiva | SKN-120 | teste em navegador compatível | Pendente |
| CAT-002 — Uso sem instalação | SKN-120 / SKN-126 | E2E web normal | Pendente |
| CAT-003 — Lista compacta | SKN-111 / SKN-123 | viewport compacto | Pendente |
| CAT-004 — Próximos dias | SKN-111 | fixtures por grupo | Pendente |
| CAT-005 — Equivalência | SKN-114 | uma versão em quatro visões | Pendente |
| CAT-006 — Estado offline | SKN-122 | perda/retorno de rede | Pendente |
| CAT-007 — Atualização segura | SKN-121 | update durante trabalho | Pendente |
| CAT-008 — Entradas alternativas | SKN-123 / SKN-124 | teclado, toque e mouse | Pendente |

## 6. Cobertura de arquitetura e engenharia

| Fonte | Decisão/requisito | Itens responsáveis | Evidência |
|---|---|---|---|
| Arquitetura §§4–6 | monólito modular, fronteiras e workspace | SKN-010/011/019/080 | [Contrato do planner verificado](evidencias/SKN-080.md) |
| Arquitetura §7 | Supabase, migrations, grants e RLS | SKN-013/017/018/022/024 | Pendente |
| Arquitetura §8 | entrada canônica manual/importada | SKN-076/210 | Pendente |
| Arquitetura §9 | planner isolado e Edge Function | SKN-080–097 | Parcial: regras puras e [suíte consolidada](evidencias/SKN-088.md) verificadas no planner-core; benchmark, Edge Function e persistência pendentes |
| Arquitetura §§10–11 | fuso e cache PWA | SKN-061/072/121/122 | Pendente |
| Arquitetura §13 | ambientes e pipeline | SKN-023–030 | [G2 verificado](evidencias/SKN-030.md) |
| Arquitetura §§14–15 | observabilidade e custo | SKN-028/131/142 | Pendente |
| Brand Guide + SKN-003 | identidade, paleta, voz, landing e autenticação visual | SKN-031/032 | [SKN-032 verificado](evidencias/SKN-032.md) |
| PRD §§16–17 | eventos, consentimento e métricas do beta | SKN-007/130 | [Contrato verificado](evidencias/SKN-007.md); implementação pendente |
| Engenharia §§3–6 | código IA, TypeScript e contratos | SKN-011/019/023 | Pendente |
| Engenharia §§7–8 | banco e pirâmide de testes | SKN-006/017/018/022/088/126 | Pendente |
| Engenharia §§9–10 | acessibilidade e desempenho | SKN-124/125 | Pendente |
| Engenharia §§11–13 | segurança, logs e dependências | SKN-011/012/131/132 | Pendente |
| Engenharia §§14–16 | Git, CI e implantação | SKN-023/025/026/029 | [G2 verificado](evidencias/SKN-030.md) |
| Engenharia §§17–20 | ADR, dívida e definição de pronto | todos via contrato; SKN-005/400 | Pendente |
| Cloud Run §§4–18 | migração incremental do motor | SKN-400–404 | Futuro |
| Cloud Run §19 | migração opcional do servidor web | SKN-405 | Futuro |

## 7. Requisitos P1 e destino

| Requisito | Item futuro | Condição |
|---|---|---|
| RF-005 | SKN-200 | política de retenção e UX aprovadas |
| RF-016 | SKN-201 | necessidade validada no beta |
| RF-039 / RF-065 | SKN-202 | dados de uso e refinamento |
| RF-085 / RF-086 / RF-088 | SKN-204 | prova técnica e usabilidade |
| RF-112 / RF-113 | SKN-205 | Storage e política de arquivos |
| RF-123 | SKN-206 | consentimento e canal definidos |

## 8. Visão de plataforma futura

| Fonte | Destino no backlog | Estado |
|---|---|---|
| Briefing §16 — perfil social | SKN-300 | aguarda validação do planner e PRD |
| Briefing §17 — feed | SKN-310 | aguarda PRD social |
| Briefing §§18–20 — comunidades | SKN-320 | aguarda PRD de governança |
| Briefing §§21–23 — mentorias | SKN-330 | aguarda validação da comunidade |
| Arquitetura §17 — Google Calendar | SKN-211 | revisão arquitetural obrigatória |
| Arquitetura §17 — offline editável | SKN-212 | especificação de conflito obrigatória |
| Estratégia Cloud Run | SKN-400–405 | ativação por métricas e ADR |

## 9. Auditoria de cobertura

Antes de atualizar esta versão, verificar:

- [ ] todos os `RF-*` P0 do PRD aparecem na seção 2;
- [ ] todos os `RNF-*` aparecem na seção 3;
- [ ] todos os `CA-*` aparecem na seção 4;
- [ ] todos os `RT-PWA-*` e `CAT-*` aparecem na seção 5;
- [ ] todo item referenciado existe no backlog;
- [ ] todo requisito P1 possui destino explícito;
- [ ] itens concluídos possuem evidência clicável;
- [ ] dispensas e cancelamentos preservam histórico.

---

A matriz é revisada em todo pull request que altera requisito, aceite, item, dependência ou evidência.
