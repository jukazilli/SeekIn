# Visão Goal-Driven e Growth Engine do SeekIn

> Direção estratégica para evoluir o SeekIn de um planner inteligente de estudos para uma plataforma de desenvolvimento orientada a objetivos, sem alterar o escopo do MVP atual.

**Status:** direção estratégica aprovada para documentação  
**Versão:** 0.1  
**Data:** 16 de setembro de 2026  
**Issue de origem:** #71  
**Escopo desta versão:** visão, domínio conceitual, limites arquiteturais e roadmap futuro

---

## 1. Objetivo

Este documento registra a visão de longo prazo do SeekIn e estabelece como ela se conecta ao produto que já está sendo construído.

O SeekIn começa como um planner inteligente de estudos porque planejamento é o primeiro problema que a plataforma precisa resolver e validar. Entretanto, o planner não representa o limite do produto.

A direção estratégica é transformar o SeekIn em uma plataforma capaz de:

1. compreender o estado atual da pessoa;
2. registrar onde ela deseja chegar;
3. identificar lacunas relevantes entre esses dois estados;
4. propor caminhos possíveis;
5. encontrar recursos que possam ajudar na evolução;
6. transformar passos escolhidos em atividades executáveis;
7. encaixar essas atividades na vida real por meio do planner;
8. acompanhar progresso e evidências;
9. reavaliar o caminho quando contexto, objetivo ou execução mudarem.

A síntese da visão é:

> **O SeekIn entende onde a pessoa está, onde quer chegar e ajuda a transformar essa distância em um caminho executável e adaptável à vida real.**

---

## 2. Princípio central

O SeekIn não deve se tornar apenas uma coleção de ferramentas de produtividade, um catálogo de cursos ou um assistente conversacional genérico.

A plataforma deve conectar **direção** e **execução**.

```text
Estado atual
    ↓
Objetivo
    ↓
Análise de gap
    ↓
Caminho
    ↓
Recursos
    ↓
Atividades
    ↓
Planner
    ↓
Sessões
    ↓
Execução
    ↓
Progresso e evidências
    ↓
Reavaliação
    ↺
```

O valor está na continuidade entre essas etapas. Um curso recomendado, uma comunidade, um mentor ou um projeto só produz valor estratégico quando existe uma relação compreensível com aquilo que a pessoa deseja alcançar.

---

## 3. O estudo como primeiro domínio, não como limite

O SeekIn continuará sendo validado inicialmente com estudantes e demandas acadêmicas.

Esse recorte é deliberado porque permite provar capacidades estruturais:

- representar rotina e disponibilidade;
- transformar demandas em esforço;
- calcular capacidade;
- priorizar;
- distribuir trabalho no tempo;
- explicar recomendações;
- executar;
- registrar progresso;
- replanejar quando a realidade muda.

Essas capacidades são reutilizáveis em uma visão mais ampla de desenvolvimento pessoal e profissional.

Portanto:

- **o MVP continua sendo o planner de estudos**;
- **o planner continua com seus requisitos e contratos atuais**;
- **Goals, Gap Analysis, Pathways e Resource Discovery não entram no P0 por esta decisão**;
- **a visão futura orienta arquitetura e produto, mas não antecipa implementação**.

---

## 4. Modelo conceitual de evolução

### 4.1 Estado atual

O estado atual representa o que a pessoa já possui ou consegue demonstrar em relação a um objetivo.

Pode incluir futuramente:

- conhecimentos;
- competências;
- experiências;
- projetos realizados;
- cursos concluídos;
- certificações;
- evidências produzidas;
- preferências;
- disponibilidade;
- restrições de rotina;
- contexto acadêmico ou profissional.

O SeekIn não deve presumir que possui uma representação completa da pessoa. O estado atual é sempre parcial, revisável e baseado em dados fornecidos, importados ou confirmados pelo usuário.

### 4.2 Estado desejado / Goal

Um objetivo descreve um resultado pretendido.

Exemplos:

- concluir uma graduação;
- obter uma certificação;
- aprender uma habilidade;
- alcançar determinado nível de proficiência;
- realizar uma transição de carreira;
- preparar-se para uma prova;
- construir um projeto;
- desenvolver uma competência específica.

Um Goal pode possuir horizonte, motivação, prioridade e marcos, mas o produto não deve obrigar o usuário a transformar todos os aspectos da vida em metas formalizadas.

### 4.3 Milestones

Milestones são resultados intermediários que tornam o objetivo observável e administrável.

Eles servem para:

- decompor objetivos amplos;
- mostrar progresso significativo;
- criar checkpoints de reavaliação;
- relacionar recursos e atividades a uma finalidade concreta.

### 4.4 Competências

Competências representam capacidades relevantes para um objetivo.

A plataforma poderá distinguir futuramente:

- competência requerida;
- nível atual estimado ou declarado;
- nível desejado;
- evidências relacionadas;
- confiança da avaliação;
- lacuna identificada.

Competência não deve ser tratada como verdade absoluta inferida por IA. Avaliações automáticas devem ser explicáveis, revisáveis e, quando necessário, confirmadas pelo usuário.

### 4.5 Evidências

Evidência é qualquer sinal verificável de progresso ou capacidade.

Exemplos:

- atividade concluída;
- avaliação realizada;
- projeto entregue;
- certificado;
- repositório;
- portfólio;
- produção textual;
- feedback de mentor;
- resultado acadêmico;
- autoavaliação explicitamente identificada como tal.

O SeekIn deve diferenciar execução de evidência. Completar horas de estudo demonstra esforço, mas não necessariamente domínio.

### 4.6 Gap Analysis

A análise de gap compara o estado atual conhecido com o estado desejado.

Ela deve responder de forma simples:

> **O que parece faltar, ou precisa ser fortalecido, para avançar em direção ao objetivo?**

O resultado pode conter:

- competências faltantes;
- conhecimentos a desenvolver;
- experiências recomendadas;
- pré-requisitos;
- evidências ainda inexistentes;
- incertezas que precisam ser validadas.

Uma análise de gap não deve ser apresentada como diagnóstico definitivo. Quando houver incerteza, o produto deve dizer o que não sabe.

### 4.7 Pathways

Um Pathway é uma hipótese de caminho entre o estado atual e o objetivo.

Pode conter:

- milestones;
- etapas;
- dependências;
- alternativas;
- recursos associados;
- atividades sugeridas;
- critérios de progresso.

Pode existir mais de um caminho válido para o mesmo objetivo. O SeekIn deve apoiar comparação e escolha, não impor uma trajetória única.

### 4.8 Resources

Um recurso é algo que pode ajudar a executar uma etapa de um Pathway.

Exemplos futuros:

- curso;
- livro;
- artigo;
- vídeo;
- documentação;
- exercício;
- projeto prático;
- certificação;
- ferramenta;
- comunidade;
- grupo de estudo;
- mentor;
- especialista;
- oportunidade de prática.

Recursos não devem ser recomendados apenas por popularidade. A recomendação futura deve considerar adequação ao objetivo, pré-requisitos, custo, disponibilidade, idioma, qualidade, formato e contexto do usuário quando esses dados estiverem disponíveis e autorizados.

### 4.9 Activities

Atividade é a ponte entre estratégia e execução.

Um Goal ou Pathway não deve ser enviado diretamente ao planner. O passo precisa ser transformado em uma demanda executável e confirmada.

```text
Goal
  ↓
Pathway
  ↓
Pathway Step
  ↓
Resource ou ação
  ↓
Activity confirmada
  ↓
Planner
```

Atividades originadas de Goals devem convergir para o mesmo contrato canônico usado por atividades manuais ou importadas.

### 4.10 Progresso

O progresso deve conectar execução ao resultado pretendido.

O SeekIn deve evitar a equivalência automática:

```text
mais tempo no app = mais progresso
```

Sinais possíveis incluem:

- atividades concluídas;
- milestones alcançados;
- evidências produzidas;
- competências demonstradas;
- consistência de execução;
- redução de gaps;
- conclusão de recursos relevantes.

Tempo de tela nunca é a North Star.

---

## 5. Dois motores com responsabilidades diferentes

A visão futura separa duas responsabilidades.

### 5.1 Goal/Growth Engine

Responsável conceitualmente por perguntas como:

- onde estou em relação ao objetivo?
- o que parece faltar?
- quais caminhos existem?
- quais passos fazem sentido?
- que recursos podem ajudar?
- que evidência indicaria progresso?
- o caminho precisa ser reavaliado?

Sua saída não é um calendário final. Sua saída é uma estratégia explicável composta de hipóteses, passos, recomendações e demandas candidatas.

### 5.2 Planner Engine

O `planner-core` continua responsável por perguntas como:

- quanto tempo existe disponível?
- qual demanda precisa acontecer primeiro?
- existe capacidade suficiente?
- em quais janelas a atividade pode ser executada?
- como dividir o esforço?
- como preservar sessões fixadas?
- o plano continua viável após uma mudança?

O planner recebe apenas demandas que estejam prontas para execução segundo o contrato vigente.

### 5.3 Boundary obrigatório

```text
┌─────────────────────────────────────┐
│       Goal / Growth Intelligence    │
│                                     │
│ direção · gaps · caminhos · recursos│
└──────────────────┬──────────────────┘
                   │
          demanda confirmada
                   ↓
┌─────────────────────────────────────┐
│            Planner Core             │
│                                     │
│ capacidade · prazo · prioridade     │
│ sessões · risco · replanejamento    │
└──────────────────┬──────────────────┘
                   ↓
                execução
```

Regras arquiteturais futuras:

- `planner-core` não depende de LLMs;
- `planner-core` não conhece catálogo de cursos, livros ou mentores;
- `planner-core` não chama APIs de recomendação;
- motores de recomendação não escrevem diretamente em tabelas centrais de planejamento;
- uma sugestão só vira demanda canônica pelo caso de uso correspondente;
- origem e justificativa devem permanecer rastreáveis.

---

## 6. Papel da inteligência artificial

IA pode produzir valor principalmente em tarefas de interpretação e descoberta.

Usos futuros possíveis:

- estruturar um objetivo escrito em linguagem natural;
- ajudar a identificar competências relacionadas;
- comparar estado atual e estado desejado;
- propor caminhos alternativos;
- explicar trade-offs;
- descobrir e resumir recursos;
- transformar um passo amplo em atividades candidatas;
- revisar o caminho após novas evidências;
- explicar por que uma recomendação foi feita.

IA não deve:

- publicar silenciosamente uma trajetória como verdade;
- inventar competências ou evidências do usuário;
- alterar o objetivo sem consentimento;
- adicionar compromissos ao planner sem um contrato de confirmação aplicável;
- substituir regras determinísticas do planner apenas porque um modelo generativo está disponível;
- esconder incerteza atrás de linguagem confiante;
- exigir que toda interação aconteça em formato de chat.

### 6.1 Human-in-the-loop

Decisões com impacto relevante devem preservar autonomia.

Exemplos:

- escolher entre caminhos;
- aceitar recursos;
- transformar recomendação em atividade;
- alterar prioridade estratégica;
- abandonar um milestone;
- reavaliar um Goal.

O sistema pode sugerir e explicar. O usuário continua sendo a autoridade sobre seus objetivos.

---

## 7. UX e arquitetura de informação

### 7.1 Objetivo é contexto, não um dashboard genérico

A existência de Goals não autoriza uma interface carregada de módulos, cards e métricas.

A UX deve preservar os princípios atuais:

- baixa carga cognitiva;
- uma tarefa mental principal por superfície;
- detalhes progressivos;
- recomendação explicável;
- ação clara;
- ausência de gamificação ou urgência artificial.

Uma atividade poderá, quando útil, mostrar sua relação com um objetivo:

```text
Product Analytics — 50 min

Objetivo
Transição para Product Management

Por que isso importa
Concluir fundamentos de métricas antes do milestone de análise de produto.
```

Essa relação deve aparecer como contexto, sem competir com a ação principal da tela.

### 7.2 Não criar um “ERP pessoal”

A plataforma não deve crescer adicionando uma aba para cada conceito do domínio.

Evitar uma navegação como:

```text
Hoje · Lista · Calendário · Atividades · Metas · Competências · Gaps · IA · Recursos
```

A arquitetura de informação futura precisa agrupar conceitos conforme a tarefa real da pessoa.

---

## 8. Comunidade e mentoria na nova visão

Comunidades e mentorias continuam sendo capacidades relevantes do SeekIn, mas deixam de representar isoladamente o destino imediato do roadmap.

Elas podem assumir dois papéis:

1. **experiência de colaboração e conhecimento**, permitindo aprender, compartilhar e produzir conteúdo útil;
2. **recurso contextual de um Pathway**, quando pessoas ou comunidades puderem ajudar o usuário a avançar em uma etapa específica.

Exemplo:

```text
Goal: aprender ciência de dados
  ↓
Gap: estatística aplicada
  ↓
Pathway Step: fundamentos de probabilidade
  ↓
Resources:
- curso
- livro
- exercícios
- comunidade de estudo
- mentor
```

Isso não elimina requisitos próprios de segurança, moderação, confiança ou pagamentos.

---

## 9. Modelo conceitual futuro

O modelo abaixo é deliberadamente conceitual e não autoriza banco de dados.

```text
User
 ├── Current State
 │    ├── Competencies
 │    └── Evidence
 │
 ├── Goals
 │    ├── Milestones
 │    ├── Target Competencies
 │    └── Pathways
 │          └── Steps
 │                ├── Resources
 │                └── Activities
 │
 └── Progress
      ├── Executions
      ├── Evidence
      └── Reassessments
```

Possíveis domínios futuros:

- `goals`;
- `competencies`;
- `evidence`;
- `gap-analysis`;
- `pathways`;
- `resources`;
- `recommendations`;
- `progress`.

Esses nomes são linguagem arquitetural de planejamento. Não significam packages, schemas ou tabelas aprovados.

---

## 10. Exemplo ponta a ponta

### Objetivo

> “Hoje trabalho com suporte de ERP e quero me preparar para uma transição para Product Management.”

### Estado atual conhecido

- experiência com clientes e processos;
- experiência com software empresarial;
- levantamento e entendimento de problemas;
- conhecimento técnico básico;
- disponibilidade de estudo limitada pela rotina.

### Gap hipotético identificado

- Product Discovery;
- métricas de produto;
- experimentação;
- analytics;
- prática de priorização e estratégia;
- evidências de atuação em produto.

### Pathway escolhido

```text
1. Fundamentos de Product Management
2. Discovery e entrevistas
3. Métricas e analytics
4. Projeto prático
5. Portfólio e evidências
```

### Recurso

Curso de Product Analytics.

### Atividade canônica

> Concluir módulo “North Star e métricas de produto” — estimativa 120 min — prazo 30/09.

### Planner

O planner divide essa atividade conforme capacidade real:

```text
terça 19:00–19:50
quinta 19:00–19:50
sábado 10:00–10:20
```

### Relação explicável

```text
Sessão
Product Analytics — 50 min

Atividade
Concluir módulo de métricas

Milestone
Fundamentos de Analytics

Goal
Transição para Product Management
```

Assim, o usuário consegue entender não apenas **o que fazer agora**, mas **por que aquilo existe no seu plano**.

---

## 11. Roadmap estratégico

A direção futura recomendada é:

| Marco | Resultado esperado |
|---|---|
| M0 — Descoberta e fundação | decisões e fundação reproduzível |
| M1 — Planner básico | rotina e atividades transformadas em sessões executáveis |
| M2 — Planejamento inteligente | capacidade, risco, priorização e replanejamento confiáveis |
| M3 — Beta e aprendizado | validar execução, confiança e retenção |
| M4 — Goals | representar estado desejado, milestones e relações com atividades |
| M5 — Gap Intelligence | comparar estado atual e objetivo com explicabilidade |
| M6 — Pathways | representar e comparar caminhos possíveis |
| M7 — Resource Discovery | conectar passos a recursos adequados |
| M8 — Adaptive Growth | acompanhar evidências, progresso e reavaliar caminhos |
| M9 — Knowledge Network | colaboração e comunidades contextualizadas |
| M10 — Mentorship | especialistas e mentorias integrados aos caminhos quando fizer sentido |

Os marcos M4 em diante exigem descoberta e PRDs próprios antes de implementação.

---

## 12. Métrica norte estratégica

A North Star de longo prazo é:

> **Progresso verificável em direção aos objetivos do usuário com apoio do SeekIn.**

Essa métrica não substitui as métricas operacionais do MVP.

No planner continuam sendo importantes:

- geração do primeiro plano;
- sessões executadas;
- atividades concluídas;
- entregas no prazo;
- replanejamento aceito;
- confiança declarada;
- retenção.

Na visão futura, esses sinais precisam ser relacionados a outcomes maiores.

---

## 13. Privacidade e segurança

A evolução para Goals aumenta a sensibilidade potencial dos dados.

Princípios obrigatórios:

- coletar somente dados necessários para capacidades explicitamente oferecidas;
- explicar por que um dado é utilizado;
- não inferir atributos sensíveis desnecessários;
- separar fato fornecido pelo usuário de inferência automática;
- permitir correção de inferências e recomendações;
- aplicar ownership e autorização desde o desenho do domínio;
- evitar exposição de objetivos, gaps e evidências em analytics técnicos;
- não reutilizar dados pessoais para recomendações fora da finalidade esperada sem base e consentimento adequados;
- tratar integrações e provedores de IA como fronteiras externas sujeitas a minimização de dados.

PRDs futuros devem realizar avaliação específica de privacidade antes da implementação.

---

## 14. Explicabilidade

Recomendações precisam responder, quando aplicável:

- por que isto foi sugerido?
- qual objetivo ou milestone está relacionado?
- quais dados foram considerados?
- o que é fato e o que é inferência?
- qual é o nível de incerteza?
- quais alternativas existem?
- como rejeitar ou alterar a sugestão?

Exemplo adequado:

> “Sugerimos fortalecer métricas de produto porque o caminho selecionado inclui análise de resultados e você ainda não registrou evidências nessa competência.”

Evitar afirmações absolutas como:

> “Você não sabe métricas de produto.”

---

## 15. Não objetivos desta fase documental

Esta decisão não autoriza:

- criar tabela `goals`;
- criar tabela de competências;
- adicionar uma nova aba ao produto;
- implementar LLM;
- alterar `planner-core`;
- criar busca de cursos;
- criar recomendação de livros;
- criar sistema de carreira;
- importar currículo;
- implementar comunidades;
- implementar mentorias;
- mudar o onboarding P0;
- alterar os critérios de aceite do MVP atual.

---

## 16. Critério para iniciar M4 — Goals

A implementação de Goals só deve começar depois de decisão explícita de produto.

Antes disso, no mínimo:

1. planner utilizável ponta a ponta;
2. comportamento do planner validado com usuários reais do beta;
3. evidência de que conectar execução a objetivos resolve um problema relevante;
4. PRD específico de Goals;
5. definição de modelo conceitual e ownership;
6. fluxos e UX aprovados;
7. contrato de privacidade e analytics;
8. modelo físico e contratos revisados;
9. backlog e rastreabilidade atualizados.

---

## 17. Decisões registradas

- SeekIn é uma plataforma de desenvolvimento orientada a objetivos em sua visão de longo prazo;
- estudo é o primeiro domínio de validação, não o limite estratégico;
- o planner é a camada de execução da visão maior;
- Goal/Growth Engine e Planner Engine possuem responsabilidades distintas;
- IA poderá apoiar descoberta e interpretação, mas não substitui automaticamente o motor determinístico de planejamento;
- Goals devem atravessar a experiência de forma contextual, não criar um dashboard genérico;
- recomendações relevantes devem ser explicáveis e revisáveis;
- comunidade e mentoria podem funcionar como recursos de um Pathway, além de suas experiências próprias;
- nenhum domínio futuro é implementado sem PRD e decisão explícita;
- a North Star de longo prazo é progresso verificável em direção aos objetivos do usuário.

---

## 18. Relação com a documentação atual

Este documento complementa, sem substituir:

- `README.md` — visão geral do produto;
- `01-prd-mvp-planner.md` — escopo executável atual;
- `03-arquitetura-tecnica-e-infraestrutura.md` — limites e organização técnica;
- `07-backlog-canonico.md` — ordem autorizada de trabalho;
- `08-matriz-rastreabilidade.md` — cobertura de requisitos formalizados;
- `10-fluxos-e-estados-ux.md` — comportamento de interface;
- `12-modelo-fisico-contratos-http-datas-ids.md` — modelo físico atualmente aprovado.

Em qualquer conflito de escopo do MVP, o PRD e o backlog canônico atuais prevalecem até que uma atualização futura seja explicitamente aprovada.

---

**Regra final:** este documento define direção. Ele não transforma visão futura em escopo atual.