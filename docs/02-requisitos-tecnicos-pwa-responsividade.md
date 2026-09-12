# Requisitos técnicos — PWA, responsividade e visões de planejamento

> Decisões técnicas e de experiência para o SeekIn funcionar como aplicativo instalável em desktop, celular e tablet, sem forçar a visão Gantt em telas inadequadas.

**Status:** decisão registrada<br>
**Versão:** 0.1<br>
**Data:** 12 de setembro de 2026<br>
**Documentos relacionados:** [Briefing](../README.md) · [PRD do MVP](01-prd-mvp-planner.md) · [Arquitetura técnica](03-arquitetura-tecnica-e-infraestrutura.md)

---

## 1. Decisões principais

1. O SeekIn será entregue como **Progressive Web App (PWA)**.
2. O produto será responsivo para desktop, tablet e celular.
3. A instalação será um aprimoramento progressivo: o sistema continuará funcionando como site quando o navegador não oferecer instalação.
4. A visão **Lista** será a principal em celulares e tablets em modo retrato.
5. A visão **Gantt** será principal para planejamento em telas grandes.
6. O Gantt não será comprimido para caber em celulares.
7. Em tablets, o Gantt poderá ser oferecido em modo paisagem somente se os testes de usabilidade confirmarem sua qualidade.
8. Lista, calendário e Gantt devem representar a mesma versão do plano.

## 2. Objetivos técnicos

- permitir acesso por URL e instalação no dispositivo;
- oferecer aparência e navegação consistentes em modo navegador e `standalone`;
- manter a jornada principal acessível por toque, mouse e teclado;
- adaptar conteúdo e interação, não apenas reduzir componentes;
- garantir carregamento rápido em redes móveis;
- preservar o último plano válido durante atualizações ou falhas;
- comunicar claramente estados de conexão e atualização;
- impedir que a ausência do Gantt limite a experiência móvel.

## 3. Classes de layout

Os valores abaixo são referências iniciais. A implementação deve usar breakpoints orientados pelo conteúdo e validar os pontos de quebra com os componentes reais.

| Classe | Largura de referência | Uso esperado |
|---|---:|---|
| Compacta | até 767 px | celulares e janelas estreitas |
| Intermediária | 768 a 1199 px | tablets, dobráveis e notebooks estreitos |
| Expandida | 1200 px ou mais | notebooks e desktops |

### 3.1 Regras gerais

- nenhuma função P0 pode depender somente de hover;
- nenhuma função P0 pode depender somente de arrastar e soltar;
- o conteúdo principal não deve gerar rolagem horizontal na classe compacta;
- áreas tocáveis devem possuir no mínimo 44 × 44 CSS pixels;
- painéis laterais no desktop devem virar tela ou painel inferior no celular;
- tabelas devem virar listas ou cartões quando não houver largura suficiente;
- filtros secundários podem ser recolhidos, mas o filtro ativo deve permanecer visível;
- mudanças de orientação não podem apagar estado ou formulário em andamento;
- zoom do navegador e aumento de fonte não podem bloquear ações essenciais.

## 4. Estratégia de visões

| Visão | Compacta | Intermediária | Expandida |
|---|---|---|---|
| Hoje | principal | principal | principal para execução diária |
| Lista | padrão para planejamento | padrão em retrato | disponível |
| Calendário | agenda e semana compacta | semana e mês | semana e mês |
| Gantt | não exibido | opcional em paisagem após validação | principal para planejamento |

### 4.1 Regra de equivalência

O usuário deve conseguir, sem abrir o Gantt:

- identificar o que precisa fazer hoje;
- visualizar os próximos dias;
- encontrar atividades atrasadas ou em risco;
- iniciar e concluir uma sessão;
- alterar horário;
- abrir uma atividade;
- solicitar replanejamento;
- entender prazo, esforço e progresso.

## 5. Visão Lista

### 5.1 Finalidade

A Lista traduz o plano em unidades executáveis e reduz o esforço de leitura em telas pequenas. Ela exibe principalmente **sessões de estudo**, porque a sessão representa o que o aluno pode começar e concluir naquele momento.

Atividades sem sessão válida aparecem separadamente como itens que precisam de planejamento.

### 5.2 Agrupamento padrão

1. **Atrasadas**, quando existirem;
2. **Hoje**;
3. **Amanhã**;
4. **Próximos 7 dias**;
5. **Depois**;
6. **Não planejadas**, quando existirem.

Grupos sem conteúdo não precisam ser exibidos. Em “Próximos 7 dias”, as sessões serão separadas por data.

### 5.3 Conteúdo do item

Cada item deve apresentar somente as informações necessárias para decisão:

- título da atividade;
- disciplina;
- data ou horário planejado;
- duração da sessão;
- prazo da atividade;
- progresso;
- nível de risco;
- indicação de sessão automática, manual ou fixada quando relevante.

### 5.4 Ações

A ação principal depende do estado:

- **Iniciar** para sessão futura ou atual;
- **Continuar** para sessão em andamento;
- **Concluir** quando a execução puder ser encerrada;
- **Planejar** para atividade sem sessão.

Ações secundárias ficam em menu contextual:

- abrir detalhes;
- mudar horário;
- fixar ou desafixar;
- marcar como não realizada;
- replanejar;
- editar atividade.

### 5.5 Ordenação

- atrasadas: prazo mais antigo primeiro;
- hoje: sessão em andamento, recomendada e depois ordem de horário;
- próximos dias: data e horário;
- não planejadas: risco, prazo e prioridade manual.

A sessão recomendada deve ser distinguida por texto e hierarquia, não apenas por cor.

### 5.6 Estados vazios

| Estado | Resposta da interface |
|---|---|
| Nada para hoje | Mostrar próxima entrega e preservar o dia livre |
| Nenhuma atividade | Oferecer criação da primeira atividade |
| Sem disponibilidade | Direcionar para configuração de horários |
| Plano inviável | Mostrar déficit e ação para resolver conflito |
| Sem conexão | Exibir último plano salvo e horário da sincronização |

## 6. Avaliação da visão Gantt

### 6.1 Decisão para celular

O Gantt completo não faz parte da experiência compacta. A combinação de colunas, linha do tempo e rolagem horizontal aumenta densidade e reduz a precisão de toque. A Lista e o calendário em agenda cobrem as ações essenciais.

### 6.2 Decisão para tablet

Em tablets, a Lista permanece padrão. Um Gantt simplificado pode ser liberado em paisagem se atender aos critérios de validação.

### 6.3 Critérios para liberar o Gantt em layout intermediário

- nomes de atividades continuam legíveis sem truncamento excessivo;
- prazo e progresso podem ser compreendidos sem instrução;
- alvos de toque mantêm dimensão mínima;
- a rolagem horizontal não interfere na rolagem da página;
- abrir detalhes e alterar o período possui alternativa ao arrastar;
- o tempo para localizar uma entrega não é materialmente pior que na Lista;
- não há perda de contexto entre coluna de atividade e linha do tempo.

### 6.4 Roteiro de teste

Testar pelo menos nas larguras de 360, 390, 768, 1024 e 1280 CSS pixels, em retrato e paisagem quando aplicável.

Tarefas do teste:

1. encontrar a próxima sessão;
2. identificar a primeira atividade em risco;
3. localizar o prazo de uma atividade;
4. abrir os detalhes;
5. alterar o horário de uma sessão;
6. retornar à visão anterior sem perder contexto.

O Gantt será mantido no tablet somente se trouxer ganho real de compreensão. Ele nunca será requisito para concluir uma ação do MVP.

## 7. Requisitos PWA

### 7.1 Instalação

| ID | Prioridade | Requisito |
|---|---|---|
| RT-PWA-001 | P0 | A aplicação deve ser servida por HTTPS em produção. |
| RT-PWA-002 | P0 | Todas as rotas do aplicativo devem referenciar um Web App Manifest válido. |
| RT-PWA-003 | P0 | O manifest deve definir `name`, `short_name`, `id`, `start_url`, `scope`, `display`, cores e ícones. |
| RT-PWA-004 | P0 | Devem existir ícones de 192 × 192 e 512 × 512 pixels, incluindo opção `maskable`. |
| RT-PWA-005 | P0 | O modo preferencial deve ser `standalone`, com fallback funcional para navegador. |
| RT-PWA-006 | P0 | A instalação não pode ser condição para criar conta ou usar o planner. |
| RT-PWA-007 | P0 | O convite de instalação deve aparecer apenas em contexto compatível e após demonstração de valor. |
| RT-PWA-008 | P0 | Em plataformas sem prompt programático, a interface deve oferecer instruções específicas sem prometer comportamento inexistente. |

### 7.2 Manifest mínimo

```json
{
  "id": "/",
  "name": "SeekIn",
  "short_name": "SeekIn",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

As cores são provisórias até a definição da identidade visual.

### 7.3 Service worker e cache

O SeekIn adotará service worker como requisito do produto para controlar cache, atualização e degradação offline, mesmo que nem todos os navegadores o exijam para instalação.

| Recurso | Estratégia inicial |
|---|---|
| arquivos versionados do app | cache-first com revisão de versão |
| navegação e shell | network-first com fallback offline |
| dados do plano | network-first com último resultado válido em cache privado |
| mutações | somente rede no P0; nunca simular sucesso offline |
| imagens e ícones próprios | stale-while-revalidate |
| conteúdo de terceiros | não armazenar sem necessidade e permissão |

### 7.4 Experiência offline do P0

O P0 não promete edição offline completa. Sem conexão:

- o shell do aplicativo deve abrir quando já tiver sido carregado antes;
- o último plano sincronizado pode ser exibido em modo somente leitura;
- a interface deve mostrar que os dados podem estar desatualizados;
- deve ser exibido o horário da última sincronização;
- ações que exigem servidor devem ser bloqueadas com explicação;
- nenhuma conclusão, alteração ou replanejamento pode parecer salvo sem confirmação do servidor.

Uma outbox para mutações offline será avaliada depois do MVP.

### 7.5 Atualização do aplicativo

- uma versão em uso não deve ser substituída no meio de um formulário ou sessão;
- ao detectar nova versão, o aplicativo deve informar “Atualização disponível”;
- a atualização deve ocorrer após confirmação ou em próxima abertura segura;
- falha de atualização deve preservar a versão funcional em cache;
- mudanças incompatíveis de dados devem possuir estratégia de migração;
- o número da versão deve estar disponível para suporte.

## 8. Desempenho

### 8.1 Metas de experiência em campo

Medidas no percentil 75, separadas entre celular e desktop:

| Indicador | Meta |
|---|---:|
| Largest Contentful Paint — LCP | até 2,5 s |
| Interaction to Next Paint — INP | até 200 ms |
| Cumulative Layout Shift — CLS | até 0,1 |

### 8.2 Orçamento inicial

- carregar primeiro somente o necessário para autenticação ou tela atual;
- carregar Gantt sob demanda, pois não é necessário na rota móvel principal;
- evitar bibliotecas completas quando apenas uma parte é usada;
- otimizar fontes e ícones;
- comprimir recursos estáticos;
- usar paginação ou virtualização em listas extensas;
- evitar atualização de toda a árvore visual durante o cronômetro de sessão;
- manter indicadores de carregamento sem deslocamento de layout.

## 9. Responsividade e interação

### 9.1 Entrada

- toque, teclado e mouse devem ser suportados;
- atalhos de teclado são aprimoramentos, nunca o único caminho;
- gestos devem possuir alternativa visível;
- menus contextuais devem ser acessíveis por toque e teclado;
- o sistema deve respeitar `prefers-reduced-motion`;
- campos de duração devem usar teclado numérico em dispositivos compatíveis;
- seletores de data e hora devem aceitar digitação e controle visual.

### 9.2 Navegação

| Layout | Navegação recomendada |
|---|---|
| Compacto | barra inferior com Hoje, Lista, Calendário e Atividades |
| Intermediário | barra lateral recolhível ou inferior conforme orientação |
| Expandido | barra lateral persistente com Hoje, Plano, Lista, Calendário e Atividades |

Perfil e ajustes ficam no menu da conta. A quantidade de destinos visíveis deve preservar rótulos legíveis.

## 10. Acessibilidade

- buscar conformidade WCAG 2.2 AA;
- manter ordem de foco equivalente à ordem visual;
- usar regiões e títulos semânticos;
- informar mudança de status a tecnologias assistivas;
- oferecer texto para risco, progresso e estado;
- garantir contraste em modo navegador e instalado;
- evitar foco preso em painéis, calendários ou Gantt;
- permitir zoom de pelo menos 200% sem perda da jornada;
- fornecer alternativa textual a gráficos e linha do tempo.

## 11. Segurança e privacidade no dispositivo

- não armazenar token de sessão em cache público;
- separar cache do shell e dados autenticados;
- limpar dados locais no encerramento de sessão quando tecnicamente seguro;
- nunca incluir notas ou títulos em nomes de cache, logs ou analytics;
- invalidar dados privados após revogação de acesso;
- não exibir conteúdo sensível em notificações sem autorização;
- impedir que páginas autenticadas sejam indexadas;
- revisar dados mantidos no dispositivo compartilhado.

## 12. Matriz mínima de testes

### 12.1 Navegadores

- Chrome e Edge nas duas versões estáveis mais recentes;
- Safari nas duas versões estáveis mais recentes;
- Firefox nas duas versões estáveis mais recentes como experiência web;
- navegadores móveis predominantes do grupo de beta.

O suporte de instalação varia entre navegador e sistema. A experiência web não pode ser degradada por essa diferença.

### 12.2 Cenários

- primeira visita sem cache;
- retorno com cache válido;
- instalação quando suportada;
- uso sem instalação;
- abertura em modo `standalone`;
- nova versão disponível;
- perda de conexão durante leitura;
- perda de conexão antes de uma mutação;
- retorno da conexão;
- mudança de retrato para paisagem;
- aumento de fonte e zoom;
- navegação por teclado;
- leitor de tela nos fluxos principais;
- Lista com grande volume de itens;
- Gantt carregado sob demanda em tela expandida.

## 13. Critérios de aceite técnicos

### CAT-001 — Instalação progressiva

**Dado** um navegador compatível e acesso por HTTPS<br>
**Quando** os critérios de instalação forem atendidos<br>
**Então** o SeekIn deve poder ser instalado e aberto em modo `standalone`.

### CAT-002 — Uso sem instalação

**Dado** um navegador sem instalação de PWA<br>
**Quando** o usuário acessar o SeekIn<br>
**Então** toda a jornada P0 deve funcionar como aplicação web.

### CAT-003 — Lista compacta

**Dado** um viewport compacto<br>
**Quando** o usuário abrir seu plano<br>
**Então** a Lista deve ser a visão padrão e não deve haver Gantt horizontal comprimido.

### CAT-004 — Próximos dias

**Dado** um plano com sessões futuras<br>
**Quando** o usuário abrir a Lista<br>
**Então** deve conseguir distinguir atrasadas, hoje, amanhã e próximos sete dias.

### CAT-005 — Equivalência

**Dado** um plano publicado<br>
**Quando** o usuário alternar entre Lista, calendário e Gantt<br>
**Então** todos devem exibir os mesmos horários, estados, prazos e riscos.

### CAT-006 — Estado offline

**Dado** um usuário que já carregou o aplicativo<br>
**Quando** perder a conexão<br>
**Então** o shell deve abrir, o último plano disponível deve ser identificado como possivelmente desatualizado e nenhuma mutação pode indicar sucesso falso.

### CAT-007 — Atualização segura

**Dado** uma nova versão disponível durante uma sessão<br>
**Quando** o service worker concluir o download<br>
**Então** o aplicativo deve aguardar um momento seguro ou confirmação para atualizar.

### CAT-008 — Entradas alternativas

**Dado** o uso por toque, teclado ou mouse<br>
**Quando** o usuário percorrer a jornada principal<br>
**Então** nenhuma ação P0 deve depender de um único método de entrada.

## 14. Fora deste documento

- escolha de framework frontend;
- provedor de hospedagem;
- banco de dados e autenticação;
- sincronização bidirecional com Google Calendar;
- notificações push;
- mutações offline com outbox;
- publicação em lojas de aplicativos;
- aplicativos nativos.

Essas decisões são definidas na [arquitetura técnica](03-arquitetura-tecnica-e-infraestrutura.md) e, para a evolução de infraestrutura, na [estratégia de Cloud Run](05-estrategia-de-evolucao-cloud-run.md).

## 15. Referências técnicas

- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN — Caching em Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [web.dev — Web Vitals](https://web.dev/articles/vitals)

---

Este documento registra requisitos de produto e qualidade. A arquitetura poderá escolher as tecnologias, mas não deve reduzir os comportamentos definidos sem revisão do Product Owner.
