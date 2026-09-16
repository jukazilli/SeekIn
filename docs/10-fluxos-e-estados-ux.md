# Fluxos e estados de UX do MVP

- **Item:** SKN-002
- **Status:** Verificado
- **Versão:** 0.3
- **Verificado em:** 16 de setembro de 2026
- **Fontes:** PRD §§7, 8, 12, 15 e 18; requisitos PWA §§3–7 e 9; [Visão Goal-Driven e Growth Engine](17-visao-goal-driven-e-growth-engine.md)

## 1. Objetivo

Definir como o estudante percorre autenticação, onboarding e rotina acadêmica no MVP, incluindo os
estados de carregamento, vazio, erro e offline aplicáveis. Este documento descreve comportamento e
hierarquia; tokens e aparência visual pertencem ao SKN-003.

A visão Goal-Driven registrada para o futuro não altera os fluxos P0 descritos aqui. Ela adiciona princípios de continuidade para impedir que futuras capacidades de objetivos, caminhos, recursos e IA descaracterizem a baixa carga cognitiva do produto.

## 2. Princípios de interação

- cada tela apresenta uma ação principal clara e, no máximo, uma alternativa de igual destaque;
- o produto usa linguagem direta, acolhedora e não punitiva;
- risco, conflito e progresso nunca dependem apenas de cor;
- alterações relevantes mostram o impacto antes de substituir o plano vigente;
- voltar, atualizar a página ou trocar de viewport preserva rota e contexto sempre que seguro;
- offline é um modo de leitura identificado, nunca uma simulação de salvamento;
- erros explicam o que aconteceu e oferecem uma próxima ação possível;
- títulos, notas e demais conteúdos acadêmicos não aparecem em logs ou analytics.

### 2.1. Decisões de composição antes do código

Uma descrição funcional não autoriza escolher automaticamente o padrão visual mais rápido de
implementar. Antes de iniciar uma família de telas, a entrega responsável deve registrar e revisar:

1. tarefa principal e informação que recebe a maior ênfase;
2. padrão de interação escolhido e alternativas descartadas;
3. hierarquia, agrupamento e posição das ações;
4. comportamento compacto, intermediário e expandido;
5. estados carregando, vazio, erro, offline e sucesso aplicáveis;
6. referência visual da tela principal e dos estados que alteram sua estrutura.

A referência pode ser wireframe, prancha ou protótipo, mas precisa mostrar dados plausíveis e ser
aprovada antes de a composição se espalhar em componentes. Screenshot gerado, tendência de mercado
ou conveniência do framework não substituem essa decisão.

### 2.2. Padrões já decididos

| Superfície | Padrão obrigatório | Evitar |
|---|---|---|
| onboarding | fluxo multi-step, um contexto decisório por etapa, progresso textual, voltar sem perder dados e retomada persistente | formulário longo, wizard decorativo ou todas as perguntas na mesma página |
| navegação compacta | barra inferior com destinos primários e Conta em menu próprio | menu hambúrguer como único acesso à jornada principal |
| navegação expandida | lateral fina e discreta, com texto e estado ativo; conteúdo continua sendo o foco | sidebar administrativa larga, árvore profunda ou painel ocupado por explicações |
| Hoje | uma recomendação dominante, motivo curto, ação imediata e sequência temporal | dashboard de métricas, mosaico de cards ou feed genérico |
| Lista | linhas agrupadas por horizonte, ação principal visível e secundárias em menu contextual | cards independentes para cada item sem necessidade estrutural |
| atividade | painel contextual no expandido e tela dedicada no compacto | modal estreito para formulário longo |
| Calendário | mês/semana no expandido e agenda no compacto, sempre com alternativa ao arraste | comprimir grade desktop no celular |
| Gantt | visão simplificada apenas onde houver largura e precisão; tabela textual equivalente | miniaturizar a linha do tempo ou ocultar ações essenciais em hover |
| conflito | diagnóstico primeiro, impacto verificável e alternativas concretas antes da confirmação | alerta abstrato, linguagem alarmista ou decisão automática pelo sistema |

### 2.3. Regra contra UX genérica de IA

O SeekIn não deve parecer uma interface montada a partir do repertório padrão de geradores de UI. É
vedado adotar um padrão apenas porque ele é comum, rápido de gerar ou já existe pronto em uma
biblioteca. Em particular:

- não transformar toda informação em card arredondado;
- não usar dashboard administrativo como estrutura padrão;
- não preencher espaços com métricas, gráficos, badges, ilustrações ou texto sem função na tarefa;
- não usar gradientes, halos, glassmorphism, estrelas ou copy vaga para sugerir “inteligência”;
- não criar um chat ou assistente personificado quando a tarefa pede planejamento direto;
- não esconder uma hierarquia fraca atrás de parágrafos explicativos;
- não copiar uma referência sem justificar sua adequação à jornada do estudante.

A interface deve ser reconhecível pelo fluxo, pela hierarquia e pelo comportamento do SeekIn, não por
clichês visuais associados a produtos de IA.

### 2.4. Estado das superfícies atuais

Landing e autenticação materializam a direção aprovada para essas superfícies. O shell autenticado e
o conteúdo atual de `/app` são incrementais: comprovam sessão, responsividade e perfil, mas não
representam a composição final de Hoje, da navegação completa ou do onboarding. Uma tela provisória
não se torna referência visual apenas por já estar publicada.

### 2.5. Princípios futuros para a experiência Goal-Driven

A evolução para objetivos, gaps, pathways, recursos e progresso deve ser integrada ao fluxo existente e não apresentada como um segundo produto dentro do SeekIn.

Regras de UX futuras:

- **objetivo é contexto, não dashboard obrigatório:** o usuário não deve precisar navegar por uma central complexa de “metas” para entender por que está executando uma atividade;
- **explicar o vínculo quando ele for útil:** atividades e sessões poderão mostrar de forma discreta a relação `objetivo → milestone/pathway → atividade`, sem competir com a ação principal;
- **próxima ação continua dominante:** mesmo quando houver vários objetivos, recomendações e recursos, Hoje continua respondendo prioritariamente “o que faz sentido executar agora?”;
- **recomendações são propostas:** o usuário pode aceitar, editar, adiar, ignorar ou substituir caminhos e recursos sugeridos;
- **IA não obriga chat:** análise de gaps, descoberta de recursos e explicações podem aparecer de forma contextual, estruturada e direta;
- **não criar um ERP pessoal:** mais dados sobre objetivos não autorizam sidebars maiores, árvores profundas, matrizes permanentes, painéis de KPI ou telas densas;
- **progresso deve ter significado:** quando exibido, deve responder “em direção a quê estou avançando?” em vez de premiar somente volume de cliques, sessões ou tempo de tela;
- **separar evidência de inferência:** quando uma recomendação futura depender de uma inferência da IA, isso deve ser distinguível de fatos, preferências ou evidências fornecidas pelo próprio usuário;
- **contexto progressivo:** detalhes de competência, gap, recurso ou milestone aparecem sob demanda e não precisam ocupar permanentemente a tela de execução;
- **comunidade e mentoria são recursos possíveis:** encontrar uma pessoa, comunidade ou mentor pode ser uma ação dentro de um caminho, sem transformar o fluxo principal em feed social.

Exemplo futuro compatível com a hierarquia do SeekIn:

```text
Product Analytics — 50 min
Hoje, 19:00

Objetivo: transição para Product Management
Motivo: avançar no milestone “Fundamentos de métricas”

[Iniciar sessão]
```

O exemplo é conceitual e não autoriza alterar a tela Hoje do P0.

## 3. Estrutura de navegação

### 3.1 Destinos principais

| Destino | Propósito | Compacto | Intermediário | Expandido |
|---|---|---|---|---|
| Hoje | executar a próxima sessão | barra inferior | navegação principal | navegação lateral |
| Lista | acompanhar sessões por horizonte | barra inferior | navegação principal | navegação lateral |
| Calendário | entender ocupação e prazos | barra inferior | navegação principal | navegação lateral |
| Atividades | registrar e manter demandas | barra inferior | navegação principal | navegação lateral |
| Plano/Gantt | inspecionar o plano no tempo | substituído por Lista | opcional em paisagem após prova | navegação lateral |
| Conta | perfil, preferências e saída | menu de conta | menu de conta | menu de conta |

O destino ativo é reconhecível por texto e estado visual. A navegação não depende apenas de ícones.
Ao abrir um detalhe a partir de Lista, Calendário ou Gantt, o retorno leva à origem com filtros,
período e posição preservados.

A visão Goal-Driven não adiciona por antecipação destinos como `Metas`, `IA`, `Competências` ou `Growth` à navegação principal. Qualquer novo destino dependerá de PRD e teste de arquitetura de informação próprios.

### 3.2 Contrato global de estados

| Estado | Comportamento obrigatório |
|---|---|
| Carregando | manter o esqueleto da tela, anunciar carregamento e evitar mudanças bruscas de layout |
| Vazio | dizer o que falta no contexto atual e oferecer somente a ação que resolve esse vazio |
| Erro recuperável | preservar dados já exibidos, explicar a falha e oferecer **Tentar novamente** |
| Erro de sessão | interromper mutações, explicar que a sessão terminou e levar a **Entrar novamente** |
| Offline com cache | mostrar **Você está offline**, horário da última atualização e conteúdo somente para leitura |
| Offline sem cache | explicar que o primeiro carregamento exige conexão e oferecer nova tentativa |
| Retorno da conexão | atualizar em segundo plano; pedir confirmação antes de substituir conteúdo alterado |

O foco vai para o título do novo contexto após navegação. Ao fechar painel, diálogo ou tela
secundária, o foco retorna ao controle que a abriu.

## 4. Autenticação

### 4.1 Criar conta e verificar e-mail

```text
Criar conta → preencher e-mail e senha → enviar → conferir e-mail
→ abrir link válido → conta confirmada → entrar → onboarding
```

- a confirmação de envio não revela se um endereço já está cadastrado;
- o estado **Confira seu e-mail** exibe o endereço mascarado, opção de corrigir e-mail e reenvio com
  espera informada;
- link expirado ou inválido leva a uma tela própria com **Enviar novo link**;
- abrir o link em outro dispositivo continua no login e informa que a conta foi confirmada;
- após confirmação bem-sucedida, a ação principal é **Começar**.

### 4.2 Entrar e recuperar acesso

```text
Entrar → credenciais válidas → destino protegido solicitado ou Hoje
Entrar → acesso não concluído → mensagem neutra → tentar novamente ou recuperar senha
Esqueci minha senha → informar e-mail → resposta neutra → link → nova senha → entrar
```

Mensagens não distinguem conta inexistente, senha incorreta ou conta ainda não confirmada. Campos
mantêm os valores seguros após erro; senha pode ser exibida por controle acessível. Durante envio,
o botão indica progresso e não permite submissão duplicada.

### 4.3 Estados de autenticação

| Situação | Resposta da interface |
|---|---|
| serviço indisponível | **Não foi possível continuar agora. Tente novamente.** |
| sem conexão antes do envio | **Conecte-se à internet para entrar ou criar uma conta.** |
| sessão expirada em área protegida | salvar apenas rascunho local não sensível e solicitar novo login |
| muitas tentativas | informar espera sem confirmar existência da conta |
| conta já autenticada em rota pública | encaminhar para onboarding incompleto ou Hoje |

## 5. Onboarding

### 5.1 Sequência

```text
Boas-vindas
→ fuso e preferências
→ disponibilidade semanal
→ compromissos recorrentes (opcional)
→ primeira disciplina (opcional)
→ primeira atividade
→ prévia do plano
→ confirmar plano
→ Hoje
```

O cabeçalho mostra o nome da etapa e o progresso textual, por exemplo **Etapa 3 de 7**. **Voltar**
preserva os valores. Etapas opcionais usam **Pular por agora**. Saída voluntária salva no servidor o
último passo confirmado; o retorno continua desse ponto.

A visão Goal-Driven não adiciona perguntas de objetivo, carreira, competências ou estado desejado ao onboarding do MVP. Essa expansão depende de PRD posterior e deve provar que o valor obtido justifica a carga adicional de configuração.

### 5.2 Regras por etapa

| Etapa | Conclusão | Erro ou vazio relevante |
|---|---|---|
| fuso e preferências | fuso IANA, reserva e sessão padrão válidos | explicar unidade e intervalo do campo inválido |
| disponibilidade | pelo menos uma janela útil ou decisão explícita de configurar depois | sem tempo disponível, o plano não é prometido |
| compromissos | recorrências válidas, sem exigir preenchimento | conflito entre horários é identificado no próprio item |
| disciplina | disciplina criada ou etapa pulada | atividade continuará permitida sem disciplina |
| atividade | título, prazo e esforço válidos | prazo sem hora assume 23:59 local e deixa isso visível |
| prévia | plano completo ou parcial explicado | capacidade insuficiente encaminha ao fluxo de conflito |
| confirmação | publicar somente após aceite | falha mantém a prévia e permite tentar novamente |

Sem conexão, dados já confirmados podem ser consultados, mas avançar, voltar com alteração ou
publicar plano fica bloqueado com explicação. Um fechamento inesperado não pode marcar etapa como
concluída sem confirmação do servidor.

## 6. Hoje

### 6.1 Hierarquia

1. próxima sessão recomendada, com horário, duração, atividade e motivo da recomendação;
2. ação principal **Iniciar sessão** ou **Continuar sessão**;
3. demais sessões de hoje;
4. entregas próximas e alertas acionáveis;
5. capacidade e saldo do dia.

### 6.2 Estados

| Situação | Conteúdo e ação |
|---|---|
| dia com sessões | destacar somente a próxima ação temporalmente relevante |
| sem sessão hoje, com plano | **Nada planejado para hoje** e acesso a **Ver próximos dias** |
| sem plano | **Crie uma atividade para montar seu primeiro plano** e **Criar atividade** |
| sessão em andamento | tempo decorrido, contexto e ações **Concluir** e **Parar por agora** |
| plano desatualizado | informar causa resumida e oferecer **Revisar mudanças** |
| carregamento/erro | aplicar o contrato global sem esconder o último plano válido |
| offline | exibir última versão sincronizada; iniciar, concluir ou ignorar fica indisponível |

Ignorar uma sessão oferece **Imprevisto ou falta de tempo**, **Cansaço ou saúde**,
**Prioridade mudou**, **Horário inadequado**, **Material indisponível**,
**Atividade já realizada fora do SeekIn**, **Sessão não é mais necessária** e **Outro**. O motivo é
opcional; **Outro** aceita uma descrição curta também opcional. A interface não culpa o estudante e
oferece replanejamento depois do registro.

## 7. Lista

As sessões aparecem em **Atrasadas**, **Hoje**, **Amanhã**, **Próximos 7 dias**, **Depois** e **Não
planejadas**. Grupos vazios são omitidos; filtros ativos sem resultado exibem **Nenhum resultado com
estes filtros** e **Limpar filtros**.

Cada item mostra atividade, disciplina quando existir, data absoluta acessível, horário, duração,
estado e risco textual. As ações disponíveis dependem do estado: iniciar, concluir, não realizada,
fixar/desafixar, editar sessão manual ou abrir atividade. A ação principal fica visível; ações
secundárias ficam no menu acessível.

No compacto, Lista substitui o Gantt. Carregamento, erro e offline seguem o contrato global e
preservam grupo, filtros e posição ao abrir e fechar um detalhe.

## 8. Atividades

### 8.1 Lista e detalhe

- busca por título e filtros por estado, risco, prazo e disciplina;
- atividade sem disciplina usa **Sem disciplina**, sem criar categoria fictícia;
- criar abre painel no expandido e tela dedicada no compacto;
- editar, concluir, cancelar ou arquivar exige confirmação apenas quando houver impacto relevante;
- arquivar não apaga histórico nem sessões concluídas.

### 8.2 Formulário

```text
Nova atividade → dados mínimos → revisar valores inferidos → salvar
→ analisar impacto → manter plano ou revisar proposta de replanejamento
```

Campos mínimos: título, prazo e esforço. Disciplina, prioridade, notas e links são opcionais. A
sessão padrão e a reserva podem ser ajustadas nas preferências; uma sessão manual pode ser criada
separadamente. Erros aparecem junto ao campo e em resumo focável quando o envio falha.

| Situação | Resposta |
|---|---|
| nenhuma atividade | **Adicione sua primeira atividade** e **Criar atividade** |
| salvamento bem-sucedido | fechar somente após confirmação; anunciar sucesso sem interromper fluxo |
| impacto relevante | apresentar o que muda antes de publicar novo plano |
| erro de salvamento | manter todos os valores editados e oferecer nova tentativa |
| offline | permitir consulta; formulário fica somente para leitura e não promete sincronização |

## 9. Calendário

O expandido oferece mês e semana; o compacto prioriza agenda e permite semana quando houver espaço.
Sessão, prazo e bloqueio têm forma, rótulo e legenda distintos. Selecionar um item abre resumo e
detalhe; movimento por toque, mouse ou teclado só é oferecido quando a regra permitir.

- período sem itens: mensagem contextual, sem tratar o produto inteiro como vazio;
- período carregando: preservar grade e cabeçalhos para evitar deslocamento;
- falha parcial: manter itens carregados e identificar o período que não atualizou;
- offline: navegar apenas entre períodos presentes no cache, com data da última sincronização;
- movimento inválido: restaurar posição, explicar o motivo e sugerir revisar conflito ou atividade.

## 10. Plano/Gantt

O Gantt é uma visão simplificada para desktop com atividade, linha do tempo, hoje, prazo, progresso,
risco e filtros. Uma tabela textual equivalente acompanha a visualização e mantém as mesmas ações.
No celular, o destino não aparece: Lista e Calendário oferecem o conteúdo necessário.

| Estado | Resposta |
|---|---|
| sem plano | orientar a criar atividade ou gerar plano |
| sem itens no período | oferecer ajustar período ou limpar filtros |
| plano parcial | mostrar faixa planejada, déficit e primeiro prazo afetado |
| erro | manter a última versão íntegra e permitir tentar novamente |
| offline | tabela e gráfico somente para leitura, com versão e horário de sincronização |

Zoom, filtro e abertura de detalhes funcionam por teclado. Arrastar não é obrigatório para nenhuma
ação. Virtualização não pode remover rótulos ou conteúdo necessário da árvore de acessibilidade.

## 11. Conflito e replanejamento

```text
Detectar mudança ou déficit → diagnosticar causa e impacto
→ escolher ajuste → recalcular proposta
→ comparar plano vigente e proposta
→ confirmar ou cancelar
```

O diagnóstico informa capacidade faltante, primeiro prazo afetado e atividades envolvidas. As ações
possíveis são ajustar disponibilidade, esforço, prazo ou prioridade, ou aceitar um plano parcial.
Nenhuma opção é apresentada como garantia quando a capacidade continua insuficiente.

A comparação agrupa sessões criadas, mantidas, movidas e removidas. **Aplicar novo plano** publica a
proposta de forma atômica; **Manter plano atual** descarta a proposta sem alterar o vigente. Falha,
timeout, atualização em outra aba ou perda de conexão preserva o plano publicado e pede uma nova
análise antes de confirmar.

## 12. Matriz de cobertura

| Superfície | Carregando | Vazio | Erro | Offline | Recuperação principal |
|---|---:|---:|---:|---:|---|
| autenticação | sim | não aplicável | sim | bloqueado | tentar novamente |
| onboarding | sim | por etapa | sim | leitura do confirmado | continuar etapa |
| Hoje | sim | sim | sim | leitura | atualizar plano |
| Lista | sim | sim | sim | leitura | tentar novamente/limpar filtros |
| Atividades | sim | sim | sim | leitura | tentar novamente |
| Calendário | sim | sim | total ou parcial | leitura limitada | recarregar período |
| Gantt | sim | sim | sim | leitura | tentar novamente |
| conflito | sim | proposta parcial | sim | bloqueado | recalcular proposta |

## 13. Critérios de revisão do SKN-002

- [x] padrões de interação estão decididos por superfície e incluem alternativas proibidas;
- [x] cada família de telas exige decisão de composição e referência visual antes do código;
- [x] superfícies provisórias estão identificadas e não se tornam referência por já estarem publicadas;
- [x] autenticação cobre criação, confirmação, entrada, recuperação e sessão expirada;
- [x] onboarding conduz até o primeiro plano sem tornar disciplina obrigatória;
- [x] Hoje, Lista, Atividades, Calendário e Gantt possuem hierarquia e ações explícitas;
- [x] conflito preserva o plano vigente até confirmação de uma proposta;
- [x] carregamento, vazio, erro e offline estão definidos quando aplicáveis;
- [x] comportamento compacto, intermediário e expandido respeita a matriz responsiva;
- [x] linguagem evita culpa, enumeração de contas e promessas de persistência offline;
- [x] foco, teclado, contraste semântico e alternativas textuais foram incorporados ao fluxo;
- [x] princípios futuros Goal-Driven preservam autonomia, próxima ação e baixa carga cognitiva sem alterar o MVP.

## 14. Fora do escopo

- aparência, tokens e componentes finais, definidos em SKN-003;
- escolha técnica de bibliotecas de Calendário e Gantt, validada em SKN-005;
- contratos físicos de dados e HTTP, definidos em SKN-004;
- edição offline e sincronização posterior, que permanecem P1;
- notificações externas, integrações acadêmicas e login social;
- telas, navegação, onboarding ou componentes de Goals, competências, gaps, pathways, recursos e Adaptive Growth, que exigem PRD futuro próprio.
