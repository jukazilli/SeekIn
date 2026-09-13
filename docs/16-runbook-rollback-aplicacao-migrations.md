# Runbook de rollback da aplicação e recuperação de migrations

> Procedimento operacional testado no `SKN-029` para retornar o Worker a uma versão funcional e
> comprovar a atomicidade de uma migration com falha sem alterar o banco do Beta.

**Status:** aprovado

**Versão:** 0.1

**Data de revisão:** 13 de setembro de 2026

**Responsável:** `@jukazilli`

## 1. Objetivo e limites

Este runbook atende ao rollback da fundação operacional. Ele cobre:

- retorno do Worker Beta a uma versão imutável conhecida;
- health e smoke em navegador depois da troca;
- restauração da versão corrente depois de um ensaio;
- falha transacional controlada de migration no Supabase Dev isolado;
- prova de preservação do schema, histórico de migrations e fixtures sintéticas.

Não cobre restauração física, PITR, backup de produção, rollback destrutivo de schema ou perda real de
dados. Esses controles dependem do plano e pertencem ao `SKN-133` antes da produção pública.

## 2. Ambientes autorizados

| Operação | Ambiente | Identificador |
|---|---|---|
| rollback do Worker | Cloudflare Beta | `seekin-web-beta` |
| teste de falha de migration | Supabase Dev isolado | `ildvwjylcyhbpopjjasi` |
| leitura de integridade | Supabase Beta | `wgxolsfirwqbkeluxaak` |

É proibido executar a migration de falha, pgTAP destrutivo, seed ou reset no Supabase Beta. O teste
de banco usa apenas UUIDs e conteúdo sintéticos já previstos no plano de fixtures.

## 3. Princípios de recuperação

1. A versão Cloudflare e o deployment são conceitos diferentes: a versão é imutável; o deployment
   decide qual versão recebe tráfego.
2. Rollback do Worker não reverte recursos vinculados. Código antigo só pode voltar quando continua
   compatível com o estado atual dos dados e bindings.
3. Migrations seguem expansão e contração. A versão anterior da aplicação permanece funcional
   durante toda a transição.
4. Uma migration deve executar em transação sempre que as operações usadas forem transacionais.
5. Falha não autoriza reset, edição manual do schema ou `migration repair` automático.
6. `migration repair` corrige apenas o histórico; ele não aplica nem desfaz SQL e exige diagnóstico
   explícito antes do uso.
7. Toda saída persistida é sanitizada. E-mail, token, senha, chave e valor de secret são removidos.

## 4. Checklist antes do rollback do Worker

- [ ] confirmar incidente ou ensaio autorizado e responsável `@jukazilli`;
- [ ] registrar horário UTC e URL afetada;
- [ ] obter deployment ativo e as versões recentes;
- [ ] selecionar uma versão previamente publicada e comprovadamente funcional;
- [ ] comparar somente nomes e tipos de bindings entre as versões;
- [ ] confirmar que nenhum recurso vinculado foi removido ou alterado de forma incompatível;
- [ ] identificar a versão corrente para restauração posterior do ensaio;
- [ ] preparar health e smoke em navegador.

Inventário a partir da raiz do repositório:

```powershell
pnpm --dir apps/web exec wrangler deployments status --name seekin-web-beta --json
pnpm --dir apps/web exec wrangler versions list --name seekin-web-beta --json
pnpm --dir apps/web exec wrangler versions view <version-id> --name seekin-web-beta --json
```

Não copie a saída bruta para evidências: os metadados podem conter identificação da conta.

## 5. Executar e validar o rollback

Use sempre o nome explícito do Worker. A configuração gerada pelo build pode redirecionar o Wrangler
para o nome base e o parâmetro explícito evita atingir o alvo errado.

```powershell
pnpm --dir apps/web exec wrangler rollback <version-id-estavel> `
  --name seekin-web-beta `
  --yes `
  --message "<incidente-ou-ensaio>"
```

Depois:

1. ler novamente `deployments status` e confirmar 100% na versão escolhida;
2. abrir `/health` em navegador real e confirmar HTTP 200, `HEALTH_OK`, `beta` e SHA esperado;
3. abrir `/` e confirmar shell utilizável, sem erro de console ou overflow horizontal;
4. se o rollback for resposta a incidente, manter a versão estável e iniciar diagnóstico;
5. se for ensaio, restaurar a versão corrente verificada.

Restauração após ensaio:

```powershell
pnpm --dir apps/web exec wrangler versions deploy <version-id-corrente> `
  --name seekin-web-beta `
  --yes `
  --message "<restauracao-do-ensaio>"
```

Repetir `deployments status`, `/health` e o smoke do shell. O corte só fecha quando o destino final
está explícito e recebe 100% do tráfego.

## 6. Testar recuperação de falha de migration

### 6.1 Linha de base

No Supabase Dev isolado, capturar por consulta somente leitura:

- versões em `supabase_migrations.schema_migrations`;
- ausência do objeto de probe;
- fingerprint das colunas do schema `public`;
- fingerprint das fixtures sintéticas canônicas.

### 6.2 Falha controlada

O ensaio aprovado cria uma tabela de probe e uma linha dentro da mesma transação. Em seguida, tenta
adicionar uma constraint incompatível com essa linha. O erro `23514` é esperado e aborta a
transação:

```sql
begin;

create table public.skn_029_migration_probe (
  id integer primary key,
  marker text not null
);

insert into public.skn_029_migration_probe (id, marker)
values (1, 'synthetic-rollback-probe');

alter table public.skn_029_migration_probe
  add constraint skn_029_forced_failure check (id < 0);

commit;
```

O comando deve retornar falha. Um resultado de sucesso invalida o ensaio e exige investigação antes
de qualquer limpeza.

### 6.3 Prova posterior

Após a conexão encerrar:

1. confirmar `to_regclass('public.skn_029_migration_probe') is null`;
2. comparar histórico e fingerprints com a linha de base;
3. executar os dois arquivos pgTAP via Management API cloud;
4. exigir `11/11 + 37/37 = 48/48`;
5. consultar o Beta apenas para confirmar ausência do probe e histórico esperado.

Neste projeto sem Docker, os arquivos pgTAP remotos são executados assim:

```powershell
pnpm exec supabase db query --linked `
  --project-ref ildvwjylcyhbpopjjasi `
  --file supabase/tests/database/0001_foundation.test.sql

pnpm exec supabase db query --linked `
  --project-ref ildvwjylcyhbpopjjasi `
  --file supabase/tests/database/0002_g1_schema_rls.test.sql
```

## 7. Critérios de interrupção

Interromper e não realizar novas promoções quando:

- a versão alvo não possuir os mesmos bindings necessários;
- o health não retornar o ambiente e SHA esperados;
- mais de uma versão permanecer recebendo tráfego sem rollout gradual aprovado;
- a migration deixar objeto parcial, alterar o histórico ou mudar qualquer fingerprint;
- pgTAP falhar;
- houver dúvida sobre o project ref;
- algum comando solicitar secret, reset, reparo de histórico ou mudança destrutiva não prevista.

## 8. Evidência mínima

- versão e deployment antes do rollback;
- versão e deployment do rollback;
- versão e deployment final;
- SHA observado no navegador em cada estado;
- erro esperado da migration;
- histórico e fingerprints antes/depois;
- resultado pgTAP;
- confirmação de que o Beta não recebeu escrita;
- falhas de ferramenta encontradas e recuperação adotada;
- horário UTC e responsável.

## 9. Referências

- [Cloudflare — versões e deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Cloudflare — rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Supabase — migrations de banco](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase — gerenciamento de conexões e transações abortadas](https://supabase.com/docs/guides/database/connection-management)
