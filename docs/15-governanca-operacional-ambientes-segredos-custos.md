# Governança operacional de ambientes, segredos e custos

> Controle público e reproduzível do `SKN-028`. Dados pessoais da conta operacional e valores
> secretos permanecem deliberadamente fora do repositório.

**Status:** aprovado

**Versão:** 0.1

**Data de revisão:** 13 de setembro de 2026

**Responsável:** `@jukazilli`

## 1. Decisão operacional

O SeekIn possui um único responsável por promoção neste estágio: `@jukazilli`. A mesma pessoa é
executora, aprovadora, custodiante das contas e responsável pelo rollback. Essa concentração é
aceita apenas durante o beta fechado de 1 a 5 usuários e constitui risco operacional conhecido.

Como não existe uma segunda pessoa habilitada a revisar, a proteção não exige aprovação humana de
outro usuário. A compensação obrigatória é técnica e rastreável: pull request, branch atualizada,
CI canônica verde, conversas resolvidas, merge commit, ausência de bypass, SHA registrado e
checklist de promoção. Push direto, exclusão e force-push da `main` permanecem bloqueados.

Quando existir um segundo mantenedor apto, a regra deve passar a exigir pelo menos uma aprovação de
pessoa diferente da autora e deve ser criado um responsável substituto para recuperação das contas.

## 2. Contas e responsabilidade

| Identificador | Plataforma | Identificação pública | Custodiante | Registro privado obrigatório |
|---|---|---|---|---|
| `ACC-SCM-001` | GitHub | conta `jukazilli`; repositório `jukazilli/SeekIn` | `@jukazilli` | MFA e códigos de recuperação |
| `ACC-INFRA-001` | Cloudflare e Supabase | conta operacional privada | `@jukazilli` | e-mail completo, MFA e códigos de recuperação |

O e-mail de `ACC-INFRA-001` é dado pessoal e não deve aparecer em issues, commits, logs, evidências
ou arquivos públicos. A associação exata deve ficar no gerenciador de senhas privado do
custodiante, junto dos fatores de recuperação. Tokens e códigos de recuperação nunca entram nesta
documentação.

Em 13 de setembro de 2026, o custodiante confirmou MFA ativa em `ACC-SCM-001` e nas duas plataformas
administradas por `ACC-INFRA-001`. A confirmação registra apenas o estado do controle, sem método,
telefone, fator, código ou e-mail.

Não há proprietário substituto no momento. Perda de acesso do custodiante pode interromper deploy,
administração do banco e recuperação do serviço.

## 3. Proteções configuradas

### 3.1 GitHub

- ruleset ativo `23187830`, aplicado a `refs/heads/main` e sem atores de bypass;
- pull request obrigatório, com zero aprovações enquanto houver um único mantenedor;
- status obrigatório `Aplicação`, produzido pelo GitHub Actions, com branch atualizada;
- todas as conversas do PR devem estar resolvidas;
- exclusão e atualização não fast-forward da `main` bloqueadas;
- somente merge commit é aceito; squash e rebase estão desabilitados;
- branches de trabalho são excluídas depois do merge;
- `.github/CODEOWNERS` atribui todo o repositório a `@jukazilli`;
- permissões padrão do workflow são somente leitura e Actions não podem aprovar PRs;
- environment `beta` aceita somente branches protegidas, sem reviewer adicional por inexistência de
  uma segunda pessoa.

O environment do GitHub é o controle de destino e a base do futuro deploy automatizado. O deploy
atual do Worker é manual via Wrangler e, por isso, a disciplina abaixo continua obrigatória.

### 3.2 Cloudflare e Supabase

- Preview e Beta usam Workers distintos: `seekin-web-preview` e `seekin-web-beta`;
- o Beta desabilita Preview URLs e aponta apenas para o projeto Supabase
  `wgxolsfirwqbkeluxaak`, na região `sa-east-1`;
- Preview não recebe acesso automático a dados do Beta;
- migrations chegam ao Supabase pela integração oficial com o GitHub após merge na `main`;
- seed, reset e testes destrutivos são proibidos no Beta;
- promoção para plano pago, add-on ou serviço cobrado exige decisão documental prévia do
  custodiante.

## 4. Fluxo de promoção

### 4.1 Preview

1. abrir pull request a partir de uma branch curta;
2. aguardar `Aplicação` verde e resolver todas as conversas;
3. publicar Preview somente com fixtures sintéticas ou backend isolado;
4. registrar URL, SHA e resultado da revisão sem valores secretos;
5. remover recursos efêmeros que não precisem permanecer como prova.

### 4.2 Beta

1. confirmar que o commit está na `main` por merge commit e que a CI desse SHA passou;
2. confirmar migrations compatíveis, sem reset, seed ou remoção antecipada de estrutura;
3. revisar inventário de bindings e garantir que nenhum valor será impresso;
4. implantar `seekin-web-beta` via Wrangler, informando o SHA em `APP_VERSION`;
5. executar health e smoke proporcionais ao corte;
6. registrar SHA da aplicação, versão Cloudflare, projeto Supabase, horário UTC e rollback;
7. interromper a promoção quando qualquer limite de 80%, alerta ou verificação obrigatória falhar.

Produção ainda não existe. Sua criação exige revisão arquitetural, plano pago aprovado, segundo
responsável operacional, recuperação compatível com o risco e checklist próprio.

## 5. Inventário de configuração e segredos

O inventário registra apenas nomes, locais e responsabilidade. Valores, hashes, digests, tokens,
senhas, e-mails privados e códigos de recuperação são proibidos.

| Ambiente/sistema | Nome ou classe | Tipo | Local autorizado | Estado |
|---|---|---|---|---|
| local | `APP_ENV`, `APP_VERSION` | configuração não secreta | `.env.local`, ignorado pelo Git | quando necessário |
| local | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | configuração pública do cliente | `.env.local`, ignorado pelo Git | somente desenvolvimento |
| local/servidor | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | binding de runtime | `.env.local`, ignorado pelo Git | somente desenvolvimento |
| Cloudflare Beta | `APP_ENV`, `APP_VERSION`, `SUPABASE_URL` | configuração não secreta | vars do Worker | configurado |
| Cloudflare Beta | `SUPABASE_PUBLISHABLE_KEY` | secret de runtime | Cloudflare Workers Secrets | configurado |
| Cloudflare Preview | acesso ao Beta | credencial | proibido | ausente |
| GitHub Actions | secrets do repositório | credencial | GitHub Actions Secrets | nenhum necessário atualmente |
| Supabase | integração GitHub | credencial gerenciada | integração do provedor | configurada, valor não exposto |
| Supabase | `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_URL` | configuração gerenciada | plataforma Supabase | presente |
| Supabase | `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY` | segredo gerenciado | plataforma Supabase/Edge Functions | presente, uso exclusivo de servidor |

Uma chave publishable pode aparecer no cliente, mas continua sendo tratada como configuração
controlada e nunca substitui RLS. `service_role`, secret keys e URL de banco nunca podem chegar ao
bundle, ao navegador, ao log ou ao Git.

### 5.1 Rotação e incidente

O custodiante rotaciona a credencial quando houver suspeita de exposição, saída de colaborador,
troca de conta, alerta do provedor ou mudança relevante de ambiente. A sequência é: criar nova
credencial no provedor, atualizar o consumidor, validar health/smoke, revogar a anterior e registrar
somente data, nome e resultado. Evidência nunca contém o valor antigo ou novo.

## 6. Limites e resposta a custo

O Beta permanece em Cloudflare Workers Free e Supabase Free. O limite operacional interno é 80% da
quota vigente; a quota publicada pelo provedor continua sendo a autoridade e deve ser revisada antes
de cada promoção e semanalmente enquanto houver usuários ativos.

| Recurso | Quota Free revisada | Limite interno | Ação ao atingir o limite |
|---|---:|---:|---|
| Cloudflare — requisições dinâmicas | 100.000/dia | 80.000/dia | suspender promoção, identificar origem e reduzir chamadas |
| Cloudflare — CPU por invocação | 10 ms | erro/limite observado | investigar rota; não migrar de plano automaticamente |
| Supabase — banco | 500 MB/projeto | 400 MB | revisar índices, retenção e crescimento |
| Supabase — egress não armazenado em cache | 5 GB/ciclo da organização | 4 GB | reduzir payloads e tráfego não necessário |
| Supabase — egress em cache | 5 GB/ciclo da organização | 4 GB | revisar arquivos e política de cache |
| Supabase — Storage | 1 GB | 800 MB | impedir novos anexos e revisar retenção |
| Supabase — usuários ativos mensais | 50.000 | 40.000 | reavaliar capacidade e plano antes de expansão |
| Supabase — Edge Function invocations | 500.000/ciclo | 400.000 | reduzir polling/retries e interromper expansão |
| Supabase — mensagens Realtime | 2.000.000/ciclo | 1.600.000 | reduzir subscriptions e fan-out |
| Supabase — conexões Realtime de pico | 200 | 160 | limitar conexões e revisar presença/canais |

No plano Free, exceder quota não autoriza cobrança nem upgrade: o Supabase envia notificação ao
e-mail de billing e pode aplicar período de carência e restrições. A resposta é reduzir uso ou
aprovar formalmente um plano pago antes da mudança.

Budget alerts e notificações de billing por uso da Cloudflare são recursos de contas
Pay-as-you-go/planos elegíveis; não estão disponíveis no Workers Free atual. A barreira de custo é o
próprio plano gratuito, acompanhada por revisão manual de uso. Se a conta mudar para Pay-as-you-go,
um budget alert em dólar e um destinatário de cobrança devem ser configurados antes do primeiro
deploy pago. Alertas são informativos e não funcionam como teto de gasto.

### 6.1 Rotina de acompanhamento

- antes de cada promoção: conferir plano ativo, uso atual e ausência de add-ons cobrados;
- semanalmente no Beta ativo: registrar apenas percentual/faixa e ação, nunca dados da conta;
- ao receber aviso do provedor ou atingir 80%: congelar promoções não corretivas;
- antes de pagar: abrir decisão com motivo, estimativa, teto, responsável e caminho de retorno;
- após mudança de preço, quota ou plano: atualizar este documento e a evidência aplicável.

## 7. Disponibilidade e recuperação

- projetos Supabase Free podem ser pausados após uma semana de baixa atividade;
- o plano Free não oferece SLA, backup para download ou PITR compatível com produção;
- o Beta deve tolerar indisponibilidade e preservar migrations como fonte de verdade;
- o rollback do Worker usa versão imutável anterior;
- rollback e recuperação de migration serão ensaiados no `SKN-029`;
- lançamento público fica bloqueado até existir recuperação proporcional ao risco.

## 8. Checklist auditável

### Antes do merge

- [ ] PR aponta para `main` e não contém segredo ou dado pessoal;
- [ ] `Aplicação` passou no SHA atual;
- [ ] branch está atualizada e conversas estão resolvidas;
- [ ] migration, se houver, é compatível e possui caminho de recuperação;
- [ ] Preview está isolado do Beta.

### Antes do deploy Beta

- [ ] somente `@jukazilli` executa e aprova a promoção;
- [ ] SHA da `main` foi capturado;
- [ ] plano e uso dos provedores foram revisados;
- [ ] nenhum recurso está em 80% ou mais da quota;
- [ ] inventário de nomes confere sem leitura dos valores;
- [ ] rollback anterior está identificado.

### Depois do deploy

- [ ] health e smoke passaram;
- [ ] ambiente, SHA, versão e horário UTC foram registrados;
- [ ] logs e evidências foram sanitizados;
- [ ] migrations aplicadas foram confirmadas;
- [ ] falha ou desvio abriu ação corretiva antes de nova promoção.

## 9. Referências oficiais revisadas

- [GitHub — regras disponíveis para rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Cloudflare Workers — limites](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers — preços](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare — budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
- [Supabase — billing e quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase — pausa de projetos Free](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase — MFA da conta](https://supabase.com/docs/guides/platform/multi-factor-authentication)
