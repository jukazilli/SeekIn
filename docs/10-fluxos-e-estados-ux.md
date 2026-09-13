# Fluxos e estados de UX do MVP

- **Item:** SKN-002
- **Status:** Verificado
- **Versão:** 0.1
- **Verificado em:** 13 de setembro de 2026
- **Fontes:** PRD §§7, 8, 12, 15 e 18; requisitos PWA §§3–7 e 9

## 1. Objetivo

Definir como o estudante percorre autenticação, onboarding e rotina acadêmica no MVP, incluindo os
estados de carregamento, vazio, erro e offline aplicáveis. Este documento descreve comportamento e
hierarquia; tokens e aparência visual pertencem ao SKN-003.

## 2. Princípios de interação

- cada tela apresenta uma ação principal clara e, no máximo, uma alternativa de igual destaque;
- o produto usa linguagem direta, acolhedora e não punitiva;
- risco, conflito e progresso nunca dependem apenas de cor;
- alterações relevantes mostram o impacto antes de substituir o plano vigente;
- voltar, atualizar a página ou trocar de viewport preserva rota e contexto sempre que seguro;
- offline é um modo de leitura identificado, nunca uma simulação de salvamento;
- erros explicam o que aconteceu e oferecem uma próxima ação possível;
- títulos, notas e demais conteúdos acadêmicos não aparecem em logs ou analytics.

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

Ignorar uma sessão abre motivos recomendados — imprevisto, conteúdo levou mais tempo, não me senti
bem, outra prioridade e problema técnico — além de **Outro** opcional. A interface não culpa o
estudante e oferece replanejamento depois do registro.

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

- [x] autenticação cobre criação, confirmação, entrada, recuperação e sessão expirada;
- [x] onboarding conduz até o primeiro plano sem tornar disciplina obrigatória;
- [x] Hoje, Lista, Atividades, Calendário e Gantt possuem hierarquia e ações explícitas;
- [x] conflito preserva o plano vigente até confirmação de uma proposta;
- [x] carregamento, vazio, erro e offline estão definidos quando aplicáveis;
- [x] comportamento compacto, intermediário e expandido respeita a matriz responsiva;
- [x] linguagem evita culpa, enumeração de contas e promessas de persistência offline;
- [x] foco, teclado, contraste semântico e alternativas textuais foram incorporados ao fluxo.

## 14. Fora do escopo

- aparência, tokens e componentes finais, definidos em SKN-003;
- escolha técnica de bibliotecas de Calendário e Gantt, validada em SKN-005;
- contratos físicos de dados e HTTP, definidos em SKN-004;
- edição offline e sincronização posterior, que permanecem P1;
- notificações externas, integrações acadêmicas e login social.
