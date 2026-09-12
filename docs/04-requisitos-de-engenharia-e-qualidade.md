# Requisitos de engenharia, qualidade e manutenção

> Regras para que o SeekIn permaneça legível, seguro, testável e sustentável, inclusive quando parte do código for produzida com auxílio de inteligência artificial.

**Status:** decisão aprovada  
**Versão:** 0.1  
**Data:** 12 de setembro de 2026  
**Documentos relacionados:** [Arquitetura técnica](03-arquitetura-tecnica-e-infraestrutura.md) · [PRD](01-prd-mvp-planner.md) · [PWA e responsividade](02-requisitos-tecnicos-pwa-responsividade.md) · [Evolução para Cloud Run](05-estrategia-de-evolucao-cloud-run.md) · [Contrato canônico](06-contrato-canonico-entrega-rastreabilidade.md) · [Backlog](07-backlog-canonico.md)

---

## 1. Objetivo

Definir requisitos mínimos para desenvolvimento, revisão, testes, implantação e manutenção. O código deve permitir que outro profissional compreenda:

- qual problema está sendo resolvido;
- qual regra de negócio foi aplicada;
- onde alterar o comportamento;
- quais efeitos colaterais existem;
- como verificar que a mudança funciona;
- como reverter uma entrega com segurança.

Velocidade de entrega não justifica código sem intenção clara, testes críticos ou proteção de dados.

## 2. Princípios

1. **Clareza antes de esperteza:** soluções previsíveis são preferíveis a abstrações engenhosas.
2. **Domínio protegido:** regras acadêmicas e do planner não dependem de framework ou provedor.
3. **Mudança pequena e verificável:** commits e pull requests devem possuir propósito coeso.
4. **Fonte única de verdade:** regras não podem ser duplicadas em telas diferentes.
5. **Falha explícita:** erros devem ser observáveis e não podem simular sucesso.
6. **Segurança por padrão:** ausência de permissão deve bloquear, não liberar acesso.
7. **Compatibilidade progressiva:** mudanças de banco e API devem permitir implantação segura.
8. **Documentação próxima da decisão:** comportamento relevante deve estar no código, teste, ADR ou documento canônico.
9. **Automação com revisão humana:** código produzido por IA recebe o mesmo rigor aplicado a código humano.

## 3. Código produzido com inteligência artificial

Código gerado ou modificado por IA não pode ser aceito apenas porque compila.

Toda alteração deve:

- ser compreendida por quem aprova;
- respeitar a arquitetura e os contratos existentes;
- incluir ou atualizar testes relevantes;
- evitar dependências inventadas, obsoletas ou não verificadas;
- conferir documentação oficial de APIs que mudam com frequência;
- registrar suposições quando o requisito estiver incompleto;
- não copiar credenciais, dados reais ou conteúdo sensível para prompts, logs ou fixtures;
- não criar abstrações especulativas para funcionalidades futuras;
- não alterar schema diretamente sem migration;
- não desativar lint, tipos, RLS ou testes para conseguir aprovação do pipeline.

Comentários como “gerado por IA” não substituem documentação de intenção. O repositório deve ser mantido como se qualquer integrante pudesse assumir sua continuidade.

## 4. Padrões de TypeScript

- `strict` deve permanecer habilitado;
- `any`, coerções duplas e `@ts-ignore` exigem justificativa local;
- dados externos entram como `unknown` e são validados;
- Zod protege fronteiras HTTP, formulários, filas e integrações;
- tipos de banco gerados não substituem os tipos do domínio;
- datas não circulam como strings sem tipo ou contrato definido;
- estados finitos devem usar uniões discriminadas;
- erros esperados devem possuir tipo e código estável;
- funções puras são preferidas no domínio;
- efeitos colaterais ficam nas bordas da aplicação.

## 5. Organização e legibilidade

### 5.1 Módulos

Cada módulo deve expor somente sua API pública. Importações diretas de arquivos internos de outro módulo são proibidas.

Estrutura recomendada por módulo:

```text
module/
  domain/
  application/
  infrastructure/
  ui/
  index.ts
```

Nem todo módulo precisa iniciar com todas as pastas. A estrutura cresce quando houver comportamento real.

### 5.2 Nomes

- nomes descrevem intenção e linguagem do produto;
- abreviações desconhecidas são evitadas;
- comandos usam verbos, como `CreateActivity` e `ReplanSchedule`;
- consultas descrevem retorno, como `GetCurrentPlan`;
- booleanos usam forma afirmativa, como `isPinned`;
- unidades aparecem no nome quando necessário, como `durationMinutes`;
- termos diferentes não devem representar o mesmo conceito.

### 5.3 Funções e componentes

- uma função deve possuir uma responsabilidade observável;
- componentes não executam consultas diretamente;
- regras de negócio não ficam em handlers ou componentes;
- hooks coordenam comportamento de interface, não substituem casos de uso;
- duplicação de regra exige extração; semelhança apenas visual não obriga abstração;
- comentários explicam decisões e restrições, não repetem o código.

## 6. Contratos e fronteiras

- toda integração externa possui adaptador;
- modelos externos são convertidos para modelos internos;
- IDs externos não se tornam chave primária do domínio;
- operações reexecutáveis usam chave de idempotência;
- APIs retornam códigos e mensagens previsíveis;
- mudanças incompatíveis precisam de versionamento ou janela de transição;
- respostas não expõem stack trace, SQL ou informações de outra conta;
- o planner recebe e devolve contratos normalizados e versionados.

## 7. Banco de dados

### 7.1 Fonte de verdade

- migrations no Git são a fonte de verdade;
- migration aplicada não é reescrita; uma nova migration corrige o comportamento;
- alterações manuais devem ser reproduzidas em migration antes de serem consideradas concluídas;
- nomes de constraints e índices devem ser legíveis;
- constraints do banco reforçam invariantes que não podem depender apenas da interface.

### 7.2 Segurança Supabase

- RLS em toda tabela exposta;
- privilégios de Data API concedidos explicitamente;
- `anon` e `authenticated` recebem somente as operações necessárias;
- `TO authenticated` nunca é considerado autorização suficiente;
- políticas de propriedade usam `auth.uid()` ou associação contextual;
- políticas de `UPDATE` usam `USING` e `WITH CHECK`;
- `user_metadata` não define permissão;
- views expostas usam invocação de segurança adequada;
- funções privilegiadas ficam fora de schemas expostos e revogam acesso público;
- `service_role` e chaves secretas permanecem exclusivamente no servidor.

### 7.3 Consultas

- toda consulta frequente deve ter índice compatível;
- paginação de feed e histórico usa cursor;
- consultas não buscam colunas sem uso;
- problemas N+1 devem ser detectados em revisão e testes;
- operações com várias gravações relacionadas usam transação ou RPC segura;
- exclusão lógica só será usada quando auditoria ou recuperação exigirem;
- retenção e remoção de dados devem respeitar privacidade e LGPD.

## 8. Testes

### 8.1 Pirâmide

| Nível | Ferramenta | Finalidade |
|---|---|---|
| Unidade | Vitest | regras puras e casos de uso |
| Propriedades | fast-check | invariantes do planejador |
| Componentes | Testing Library | estados e interação acessível |
| Banco | pgTAP/Supabase local | constraints, funções, grants e RLS |
| Integração | Vitest contra ambiente local | repositórios e funções |
| Ponta a ponta | Playwright | jornadas completas em navegadores e dispositivos |

Cobertura é um indicador, não o objetivo. Código crítico sem teste é bloqueador mesmo quando a porcentagem global estiver alta.

### 8.2 Invariantes do motor

O conjunto mínimo do `planner-core` deve provar que:

- o mesmo input e versão de regra geram o mesmo resultado;
- nenhuma sessão se sobrepõe a outra sessão ou bloqueio rígido;
- a carga não excede a capacidade permitida;
- sessões concluídas nunca são alteradas;
- sessões fixadas são preservadas ou geram conflito explícito;
- esforço alocado não ultrapassa o esforço restante;
- dependências são respeitadas;
- duração mínima e máxima são respeitadas;
- planos inviáveis retornam déficit e não um falso sucesso;
- mudança de fuso e horário de verão não desloca indevidamente a rotina;
- falha no cálculo preserva o último plano publicado;
- justificativas correspondem aos fatores realmente utilizados.

Casos-limite devem incluir ausência de disponibilidade, prazo vencido, atividade sem esforço, janelas menores que a sessão mínima, rotina sobreposta e grande quantidade de atividades.

### 8.3 Jornadas ponta a ponta

Antes do beta, Playwright deve cobrir ao menos:

1. criar conta e entrar;
2. concluir onboarding;
3. cadastrar rotina;
4. cadastrar atividade manual;
5. confirmar atividade importada;
6. gerar e confirmar plano;
7. visualizar Hoje e Lista no celular;
8. visualizar Gantt no desktop;
9. iniciar, concluir e replanejar sessão;
10. perder conexão e visualizar o último plano em leitura;
11. encerrar sessão sem deixar dados privados visíveis;
12. impedir acesso de um usuário aos dados de outro.

Os testes devem usar Chromium, Firefox e WebKit nos fluxos críticos e emular celular e tablet onde o comportamento muda.

## 9. Acessibilidade

- objetivo WCAG 2.2 AA;
- componentes usam HTML semântico antes de ARIA;
- toda ação por arrastar possui alternativa por teclado, toque e botão;
- foco, erro e mudança de estado são perceptíveis;
- risco e progresso não dependem somente de cor;
- alvos de toque seguem a dimensão definida no documento de PWA;
- testes automatizados ajudam, mas não substituem navegação real por teclado e leitor de tela;
- Gantt e gráficos possuem alternativa textual.

## 10. Desempenho

- metas de LCP, INP e CLS seguem o documento de PWA;
- Gantt, calendário e módulos sociais são carregados sob demanda;
- listas extensas usam paginação ou virtualização;
- imagens têm dimensões conhecidas e formatos adequados;
- consultas e payloads são medidos antes de otimizações complexas;
- o cronômetro de estudo não deve renderizar toda a página a cada segundo;
- budgets de JavaScript e CSS serão definidos após o primeiro build real;
- regressões significativas de bundle ou Web Vitals exigem justificativa.

## 11. Segurança e privacidade

### 11.1 Aplicação

- HTTPS em todos os ambientes remotos;
- CSP e cabeçalhos de segurança definidos no host;
- segredos somente em gerenciadores de ambiente;
- proteção contra CSRF em operações autenticadas por cookie;
- validação de origem e assinatura em webhooks;
- limitação de taxa em autenticação, importação, conteúdo e mentorias;
- Turnstile ou CAPTCHA nos fluxos sujeitos a abuso;
- dependências e imagens de container verificadas regularmente;
- sessões e permissões são revalidadas em operações sensíveis.

### 11.2 Dados

- coleta mínima para a finalidade declarada;
- conteúdo acadêmico privado por padrão;
- publicação social exige ação explícita;
- exportação e exclusão de conta são previstas no domínio;
- logs não registram notas, títulos de atividades, tokens ou conteúdo privado;
- fixtures e screenshots de teste usam dados sintéticos;
- backups e artefatos com dados recebem proteção e prazo de retenção.

### 11.3 Integrações

- tokens do Google Calendar não ficam no perfil nem em schema exposto;
- escopos OAuth são mínimos e solicitados no momento de conexão;
- login Google e autorização de Calendar são consentimentos distintos;
- dados financeiros são processados pelo provedor de pagamento;
- webhooks são idempotentes e auditáveis.

## 12. Observabilidade e suporte

Todo erro relevante deve informar:

- ambiente;
- versão da aplicação;
- módulo;
- código estável;
- identificador de correlação;
- horário;
- operação, sem payload sensível;
- resultado de recuperação ou fallback.

O motor registra versão da regra, duração, quantidade de atividades e estado final. Não registra os títulos ou notas do aluno.

Logs devem permitir responder “o que aconteceu?” sem exigir acesso direto ao banco do usuário.

## 13. Dependências e cadeia de suprimentos

- lockfile obrigatório;
- versões exatas para SDKs e dependências críticas;
- pacote novo exige justificativa, licença e avaliação de manutenção;
- bibliotecas sem manutenção ou com licença incompatível são rejeitadas;
- atualizações automáticas abrem PR, mas não fazem merge sem testes;
- dependências transitivas críticas são monitoradas;
- nenhum script de instalação desconhecido é executado sem revisão;
- pacotes Supabase e de autenticação seguem as versões e guias oficiais atuais.

## 14. Git e pull requests

### 14.1 Commits

- mensagem curta e orientada à mudança;
- um propósito principal por commit;
- não misturar formatação ampla com alteração funcional;
- não versionar segredos, dumps reais ou arquivos gerados desnecessários;
- migrations e código compatível devem seguir juntos quando fizerem parte da mesma entrega.

### 14.2 Pull request

Todo PR funcional deve explicar:

- problema e resultado;
- escopo incluído e excluído;
- decisão técnica relevante;
- forma de validação;
- impacto em banco, segurança, PWA e responsividade;
- risco e plano de reversão;
- evidências visuais quando houver interface.

PRs grandes devem ser divididos por capacidade entregável, sem deixar a branch principal quebrada.

## 15. Pipeline de qualidade

Uma alteração só pode ser promovida quando passar por:

1. instalação reprodutível;
2. formatação;
3. lint;
4. verificação de tipos;
5. testes unitários;
6. testes de banco quando aplicável;
7. build de produção;
8. testes ponta a ponta críticos;
9. revisão de migrations e segurança;
10. preview e inspeção visual quando houver UI.

O pipeline não deve usar credenciais de produção em testes de pull request.

## 16. Estratégia de implantação

- branch principal deve permanecer implantável;
- deploys recebem número ou hash de versão;
- migrations são compatíveis com a versão anterior durante a transição;
- mudanças destrutivas usam expansão e contração;
- feature flags são reservadas a mudanças de risco real, não a código abandonado;
- rollback de aplicação não pode depender de rollback destrutivo do banco;
- a PWA não ativa nova versão durante formulário ou sessão em andamento;
- erros pós-deploy acionam retorno à versão funcional conhecida.

## 17. ADRs e documentação

Um Architecture Decision Record será criado quando a mudança:

- substituir framework, banco ou provedor;
- adicionar serviço pago ou nova infraestrutura;
- criar novo limite de domínio;
- alterar formato persistido ou contrato do planner;
- mudar autenticação ou modelo de autorização;
- introduzir edição offline, fila ou processamento assíncrono;
- escolher biblioteca estrutural de Gantt ou calendário;
- iniciar a migração para Cloud Run.

ADRs registram contexto, decisão, alternativas, consequências e estado. Documentação obsoleta deve ser atualizada no mesmo PR da mudança.

## 18. Gestão de dívida técnica

- dívida conhecida vira item rastreável com impacto e condição de resolução;
- `TODO` deve referenciar tarefa ou explicar bloqueio concreto;
- não criar camada provisória sem estratégia de remoção;
- refatoração deve preservar comportamento com testes;
- módulos com alta mudança, defeitos repetidos ou baixa compreensão recebem prioridade de melhoria;
- complexidade será medida por efeito na manutenção, não por quantidade de arquivos.

## 19. Definição de pronto

Uma entrega está pronta quando:

- critérios de aceite passam;
- comportamento foi testado no dispositivo ou navegador relevante;
- estados de erro, vazio, carregamento e offline foram tratados;
- acessibilidade foi verificada;
- segurança e autorização foram revisadas;
- migrations são reproduzíveis;
- logs e métricas necessários existem;
- documentação afetada foi atualizada;
- não existem segredos ou dados reais no diff;
- o pipeline está verde;
- o caminho de reversão é conhecido.

## 20. Checklist de revisão

### Produto e domínio

- [ ] A mudança resolve o requisito correto?
- [ ] A regra existe em um único lugar?
- [ ] O comportamento é explicável ao aluno?
- [ ] O último plano válido está protegido?

### Código

- [ ] Nomes e fronteiras estão claros?
- [ ] Não existe dependência invertida?
- [ ] Dados externos são validados?
- [ ] Erros são tratados sem ocultar falha?

### Dados e segurança

- [ ] RLS e grants foram testados?
- [ ] Um usuário está impedido de acessar outro?
- [ ] Segredos permanecem no servidor?
- [ ] Logs evitam conteúdo sensível?

### Experiência

- [ ] Funciona em celular, tablet e desktop aplicáveis?
- [ ] Funciona por teclado e toque?
- [ ] Estados offline e atualização da PWA são seguros?
- [ ] Gantt e calendário continuam equivalentes à Lista?

### Operação

- [ ] Pipeline e build passam?
- [ ] Há observabilidade suficiente?
- [ ] A implantação é compatível com a versão anterior?
- [ ] O rollback é possível?

## 21. Referências

- [TypeScript — TSConfig `strict`](https://www.typescriptlang.org/tsconfig/strict.html)
- [Playwright — boas práticas](https://playwright.dev/docs/best-practices)
- [Supabase — segurança do produto](https://supabase.com/docs/guides/security/product-security)
- [Supabase — segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — npm e cadeia de suprimentos](https://supabase.com/docs/guides/security/npm-security)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Web Vitals](https://web.dev/articles/vitals)

---

Este documento é obrigatório para implementação e revisão. Exceções devem ser explícitas, temporárias e rastreáveis.
