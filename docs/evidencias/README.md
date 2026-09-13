# Evidências de entrega do SeekIn

> Modelo obrigatório para comprovar itens `SKN-*` segundo o [contrato canônico](../06-contrato-canonico-entrega-rastreabilidade.md).

## 1. Organização

Cada item concluído deve possuir:

```text
docs/evidencias/SKN-NNN.md
```

Anexos pequenos e não sensíveis podem ficar em:

```text
docs/evidencias/assets/SKN-NNN/
```

Relatórios grandes gerados pelo pipeline podem permanecer no GitHub Actions, desde que o registro contenha link, resumo persistente e instrução de reprodução.

## 2. Regras

- não registrar segredos, tokens, e-mails reais, notas ou títulos acadêmicos;
- utilizar contas e fixtures sintéticas;
- vincular commit, pull request e deploy ao mesmo item;
- registrar falhas junto dos resultados, sem ocultá-las;
- screenshot é evidência complementar, nunca prova única de regra ou segurança;
- não marcar concluído quando algum critério obrigatório falhar;
- informar ambiente e horário em UTC;
- registrar versão da aplicação, schema e algoritmo quando aplicável.

## 3. Modelo

Copiar o bloco abaixo para `SKN-NNN.md`:

```markdown
# EV-SKN-NNN — Título da entrega

**Item:** SKN-NNN  
**Estado:** Verificado | Concluído | Falhou  
**Verificado em:** AAAA-MM-DDThh:mm:ssZ  
**Responsável:** nome ou usuário GitHub  
**Commit:** SHA  
**Pull request:** URL ou não aplicável  
**Ambiente:** local | preview | beta | produção  
**Deploy:** URL e identificador ou não aplicável  
**Versão do schema:** identificador ou não aplicável  
**Versão do planner:** identificador ou não aplicável

## Requisitos cobertos

- RF-...
- RNF-...
- CA-...

## Resultado

Descrever o comportamento entregue e o que permaneceu fora do escopo.

## Critérios de aceite

| Critério | Resultado | Evidência |
|---|---|---|
| AC-SKN-NNN-01 | Passou/Falhou | teste, comando, trace ou link |

## Verificações executadas

| Classe | Comando ou procedimento | Resultado | Artefato |
|---|---|---|---|
| CODE | arquivos/PR revisados | Passou | link |
| TEST | comando exato | Passou | run/relatório |
| DB | reset, pgTAP, advisors | Passou | run/resumo |
| DEPLOY | health e smoke | Passou | URL/deploy ID |
| UX | viewport, teclado, leitor de tela | Passou | trace/imagem |
| OBS | correlação, métrica ou alerta | Passou | consulta/resumo |

## Dados de teste

Informar fixture ou seed sintético e como reproduzi-lo.

## Segurança e privacidade

- RLS/grants revisados: Sim/Não/Não aplicável
- teste entre usuários: Passou/Não aplicável
- segredos no diff/log: Ausentes
- conteúdo pessoal usado: Não

## Riscos residuais

- risco, impacto e item de acompanhamento; ou “nenhum conhecido”.

## Rollback

Descrever comando ou procedimento e restrições.

## Observações

Decisões, dispensas ou falhas conhecidas.
```

## 4. Evidência dos portões

Os itens `SKN-030` e `SKN-143` agregam evidências anteriores. Seus registros devem incluir:

- lista de itens exigidos;
- SHA única avaliada;
- ambiente e URLs;
- resultado de cada condição do portão;
- bloqueadores e dispensas;
- decisão assinada pelo responsável;
- caminho de rollback.

---

O arquivo de evidência faz parte da entrega. Um link quebrado ou um resultado impossível de reproduzir deve ser tratado como perda de evidência e revalidado.

## 5. Registros atuais

| Item | Estado | Registro |
|---|---|---|
| SKN-001 | Verificado | [Decisões bloqueadoras](SKN-001.md) |
| SKN-010 | Em revisão | [Workspace pnpm](SKN-010.md) |
| SKN-011 | Em revisão | [Toolchain e validação](SKN-011.md) |
| SKN-012 | Em revisão | [Contrato de ambiente](SKN-012.md) |
| SKN-013 | Em desenvolvimento | [Supabase Cloud sem Docker](SKN-013.md) |
| SKN-014 | Em revisão | [Web e health](SKN-014.md) |
| SKN-017 | Em desenvolvimento | [Migration inicial](SKN-017.md) |
| SKN-018 | Em desenvolvimento | [RLS e grants](SKN-018.md) |
| SKN-020 | Em desenvolvimento | [Health backend](SKN-020.md) |
| SKN-023 | Em desenvolvimento | [CI](SKN-023.md) |
| SKN-024 | Em revisão | [Projeto Supabase do beta](SKN-024.md) |
| SKN-040 | Em desenvolvimento | [Domínio transacional de autenticação](SKN-040.md) |
