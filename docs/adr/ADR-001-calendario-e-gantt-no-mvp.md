# ADR-001 — Calendário e Gantt no MVP

- **Estado:** aceito
- **Data:** 2026-09-13
- **Item:** SKN-005
- **Decisores:** Product Owner e engenharia do SeekIn
- **Escopo:** calendário, agenda compacta e Gantt simplificado do P0

## 1. Contexto

O P0 precisa apresentar a mesma versão do plano em calendário mensal/semanal, agenda compacta e
Gantt desktop. Sessões, prazos e bloqueios precisam ser reconhecíveis sem depender apenas de cor. A
interação deve funcionar por mouse, toque e teclado, preservar uma alternativa textual e não penalizar
o carregamento das demais rotas.

A prova técnica usa apenas dados sintéticos e está disponível em `/proofs/schedule-views`. Ela não
antecipa integrações com Supabase, regras de movimento nem a sincronização do plano, que pertencem a
SKN-112–114.

## 2. Decisão

### 2.1 Calendário

Adotar **FullCalendar Standard 7.1.0**, pelo pacote `@fullcalendar/react`, com
`temporal-polyfill 1.0.5` e somente os plugins Standard `daygrid`, `timegrid`, `list` e `interaction`.
Não adotar plugins Premium.

O contrato do P0 é:

- mês e semana em telas a partir de 768 px;
- agenda em telas compactas, inclusive quando a tela muda de tamanho fora do calendário e depois
  retorna a ele;
- sessão, prazo e bloqueio identificados por texto, cor e tratamento visual;
- evento interativo por teclado e ponteiro;
- movimento direto nunca será a única opção: o detalhe oferece uma ação explícita com alvo mínimo de
  44 × 44 px e anúncio do resultado;
- regras de destino válido continuam sob domínio do SeekIn e não são delegadas à biblioteca.

O FullCalendar Standard possui licença MIT, integração oficial com React 17–19 e documentação própria
de acessibilidade, teclado, leitor de tela e toque. A versão 7 declara melhorias e verificação com Axe
para as visualizações do calendário. Fontes: [React](https://fullcalendar.io/docs/react),
[licença](https://fullcalendar.io/license), [acessibilidade](https://fullcalendar.io/docs/accessibility)
e [migração para v7](https://fullcalendar.io/docs/upgrading-from-v6).

### 2.2 Gantt

Implementar no P0 uma **linha do tempo semântica própria**, com React e CSS Grid, sem dependência de
Gantt. Ela deve conter somente atividade, disciplina, janela, progresso, prazo e bloqueio.

O contrato do P0 é:

- grade visual somente em desktop;
- coluna de atividade e cabeçalho temporal fixos durante a rolagem;
- barras decorativas fora da árvore acessível;
- dados equivalentes em tabela HTML, disponível no desktop e usada como apresentação compacta;
- sem dependências, relações, caminho crítico, autoagendamento ou edição de barras no P0;
- expansão e movimento pelo Gantt permanecem no P1, em SKN-204.

A implementação própria foi escolhida porque o escopo não é um gerenciador de projetos. Ela preserva
a linguagem visual e uma tabela semanticamente correta sem incorporar uma camada paralela de estado ou
recursos comerciais desnecessários.

## 3. Virtualização e volume

O limite de prova é **200 atividades simultâneas** na quinzena. Em Chromium, servidor de
desenvolvimento, viewport 1440 × 1000, a troca de 8 para 200 atividades produziu 200 linhas, 2.451 nós
na superfície e concluiu em 169,5 ms. Esse é um teste de estresse, não um orçamento de produção.

Decisão para o P0:

- consultar e renderizar no máximo 200 atividades por janela;
- não virtualizar até esse limite, preservando busca do navegador, leitura linear e tabela completa;
- paginar a tabela se o produto passar de 200 itens;
- reabrir a decisão se um perfil de produção superar 100 ms de scripting/renderização na atualização,
  3.000 nós na superfície, ou se o limite funcional subir acima de 200;
- se necessária, virtualizar somente a grade visual; a tabela textual continuará paginada e acessível.

## 4. Bundle e carregamento

O build de produção gerou para a rota de prova:

| Artefato | Tamanho | Gzip |
|---|---:|---:|
| JavaScript da rota, incluindo calendário e prova | 305,64 kB | 84,89 kB |
| CSS da rota, incluindo temas e prova | 25,01 kB | 5,73 kB |
| Manrope variável, subconjunto latino auto-hospedado | 24,83 kB | já distribuído em WOFF2 |

A rota é dividida automaticamente pelo React Router. Home, health e not-found permaneceram em chunks
próprios; portanto, calendário e fonte só são transferidos quando a visualização é aberta. Para SKN-112,
120 kB transferidos no primeiro acesso constituem o teto inicial dessa rota e deverão ser medidos
novamente sem os controles de prova. A fonte, licenciada sob OFL-1.1, é um ativo reutilizável do sistema
visual e foi limitada ao subconjunto latino necessário ao produto em português.

## 5. Alternativas avaliadas

### 5.1 Calendário

| Alternativa | Licença | Resultado |
|---|---|---|
| FullCalendar Standard 7.1.0 | MIT | escolhida: React 19, mês/semana/lista, toque e contrato de acessibilidade documentado |
| React Big Calendar 1.20.0 | MIT | rejeitada: exige localizador externo e não apresentou vantagem para o contrato de acessibilidade da prova |
| Schedule-X React 4.1.0 | MIT | rejeitada: boa opção responsiva, mas com ecossistema mais fragmentado e menor benefício frente à prova validada |

Referências: [React Big Calendar](https://github.com/jquense/react-big-calendar) e
[Schedule-X](https://github.com/schedule-x/schedule-x).

### 5.2 Gantt

| Alternativa | Licença | Resultado |
|---|---|---|
| React + CSS Grid sem dependência | código do SeekIn | escolhida: menor superfície e equivalência textual controlada |
| Frappe Gantt 1.2.2 | MIT | rejeitada: foco em SVG/arraste e ausência de contrato React/acessibilidade suficiente para esta decisão |
| SVAR React Gantt 2.7.3 | MIT no core; PRO comercial | rejeitada: recursos além do P0 e fronteira adicional entre core e PRO |
| DHTMLX Gantt 10.0.3 | MIT Community | rejeitada: acessibilidade e smart rendering existem, mas integração genérica, 6,61 MB desempacotados e escopo excessivo para o P0 |

Referências: [Frappe Gantt](https://github.com/frappe/gantt),
[SVAR React Gantt](https://docs.svar.dev/react/gantt/overview/),
[DHTMLX Gantt](https://docs.dhtmlx.com/gantt/),
[acessibilidade DHTMLX](https://docs.dhtmlx.com/gantt/desktop__accessibility.html) e
[teclado DHTMLX](https://docs.dhtmlx.com/gantt/guides/keyboard-navigation/).

Os tamanhos desempacotados foram consultados no registro npm com `pnpm view`; eles servem para comparar
a superfície distribuída e não equivalem ao bundle final após tree-shaking.

## 6. Consequências

### Positivas

- calendário com manutenção, internacionalização e acessibilidade documentadas;
- nenhuma licença comercial necessária para o P0;
- Gantt alinhado ao domínio e ao sistema visual do SeekIn;
- comportamento compacto e alternativa textual explícitos;
- custo do calendário isolado na rota que o utiliza.

### Negativas e riscos

- o FullCalendar ainda representa aproximadamente 84,84 kB gzip de JavaScript na rota;
- a grade própria exige testes do SeekIn para rolagem, cabeçalhos, cálculo temporal e equivalência;
- a API visual do FullCalendar 7 usa classes internas não estáveis; customizações devem usar tokens,
  atributos semânticos e classes adicionadas pelo SeekIn, nunca nomes internos gerados;
- o modo local padrão do plugin Cloudflare/Miniflare falhou no Windows desta prova; a verificação visual
  usou `SEEKIN_BROWSER_PROOF=true`, que remove o plugin somente do servidor local e não altera o build
  nem o deploy Cloudflare.

## 7. Critérios para reconsiderar

Reavaliar esta ADR se o P0 passar a exigir recursos, dependências, caminho crítico, edição complexa de
barras, mais de 200 atividades por janela ou se o calendário ultrapassar o teto medido após remover os
controles da prova.

## 8. Reprodução

```powershell
$env:SEEKIN_BROWSER_PROOF='true'
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use 22.23.2
pnpm --filter @seekin/web dev --host 127.0.0.1
```

Abrir `http://127.0.0.1:5173/proofs/schedule-views`. O checkbox “Testar 200 atividades” existe apenas
para a prova e não deve entrar na interface final.
