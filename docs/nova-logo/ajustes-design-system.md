# SeekIn — Brand Guide para implementação

- **Status:** direção aprovada e assets raster integrados no `SKN-032`
- **Tipo:** contrato canônico de marca
- **Produto:** SeekIn
- **Versão:** 1.2
- **Data da revisão:** 14 de setembro de 2026
- **Item de origem:** `SKN-031`
- **Referências visuais:** [prancha da marca](./image.png),
  [composição de login](./image%20copy.png) e
  [estudo de pontos de fixação](./image%20copy%202.png)

---

## 1. Objetivo e autoridade

Este documento transforma a identidade aprovada do SeekIn em regras de marca, voz e aplicação. Ele
complementa o `SKN-003`, documentado em
[`../11-Sistema-Visual-UI-Acessibilidade-e-Responsividade-do-SeekIn.md`](../11-Sistema-Visual-UI-Acessibilidade-e-Responsividade-do-SeekIn.md).

A precedência é:

1. este guia governa identidade, significado, logo, wordmark, mascote e paleta de marca;
2. o `SKN-003` governa componentes, acessibilidade e comportamento da interface;
3. o plano da landing governa somente sua composição, conteúdo e execução;
4. o código implementa esses contratos no `SKN-032`, mas não pode substituir as decisões deste guia.

As cores da prancha são decisões aprovadas. Não devem ser substituídas, escurecidas ou “corrigidas”
por interpretação da implementação.

---

## 2. Ideia central da marca

SeekIn combina **buscar** (`seek`) com a ideia de olhar para dentro, descobrir e conectar
inteligência (`in`). A marca existe para tornar o caminho do aprendizado mais claro e possível.

Sua personalidade reúne quatro atributos:

| Atributo | Como a marca se comporta | O que evitar |
|---|---|---|
| Comunicativa | explica com clareza e usa linguagem humana | jargão, excesso de texto e voz robótica |
| Séria | é precisa, honesta e respeita o tempo do estudante | promessas grandiosas e tom infantil |
| Parceira | planeja com a pessoa, sem culpa ou julgamento | ordens, cobrança e paternalismo |
| Extremamente inteligente | antecipa prioridades e explica decisões | parecer mágica, opaca ou exibicionista |

A síntese da marca é:

> **Clareza para encontrar o próximo passo. Flexibilidade para seguir em frente.**

---

## 3. Universo simbólico

### 3.1. O golfinho

O golfinho representa inteligência aplicada. Seu sonar encontra direção mesmo quando o caminho não
está visível; sua presença comunica curiosidade, parceria e confiança.

Ele é o mascote da marca, não o logotipo e não uma personificação da inteligência do produto.

### 3.2. O oceano

O oceano representa a imensidão do conhecimento: sempre existe mais para explorar, compreender e
conectar. Essa ideia aparece em profundidade, respiro e continuidade, não em cenários literais ou
decoração temática excessiva.

### 3.3. A água

A água representa maleabilidade, plasticidade e adaptação. O plano deve acompanhar a vida real do
estudante; a pessoa não deve ser forçada a caber em um plano rígido.

### 3.4. O “S” fluido

O símbolo oficial é o “S” contínuo da prancha. Sua curva representa:

- conhecimento fluindo de uma ponta a outra;
- transmissão dentro de uma rede;
- movimento sem ruptura;
- flexibilidade com direção.

A interface herda ritmo, continuidade e curvas do símbolo, sem repeti-lo como ornamento.

---

## 4. Promessa e mensagem

### 4.1. Promessa pública principal

> **Mais tempo para aprender. Menos tempo tentando organizar tudo.**

### 4.2. Explicação curta

> **Você diz o que precisa fazer e quanto tempo tem. O SeekIn transforma isso em um plano possível.**

### 4.3. Princípio de parceria

> **Seu plano acompanha a sua rotina — não o contrário.**

Essas frases não substituem a promessa funcional do PRD — saber o que estudar, quando estudar e por
quê. Elas a traduzem para uma comunicação pública mais leve.

---

## 5. Voz e tom

A voz do SeekIn é direta, calma e próxima. Ela reduz esforço mental antes de tentar impressionar.

### Preferir

- “Conte o que você precisa fazer.”
- “Organizamos o tempo que você realmente tem.”
- “Veja o que merece sua atenção agora.”
- “A rotina mudou? Seu plano pode mudar também.”
- “Há mais coisas do que cabem nesta semana. Vamos ajustar.”

### Evitar

- “Potencialize sua produtividade.”
- “Uma plataforma completa e revolucionária.”
- “Gerencie tarefas com inteligência de ponta.”
- “Nunca mais perca um prazo.”
- “Nós sabemos o que é melhor para você.”
- frases que anunciem rede social, comunidade ou IA como funcionalidades disponíveis no P0.

### Regras de escrita

- uma ideia por bloco;
- títulos curtos e concretos;
- verbos na voz ativa;
- nenhum superlativo sem prova;
- explicar benefício antes de mecanismo;
- falar em “plano”, “tempo”, “rotina” e “próximo passo”, não em “dashboard”, “workflow” ou
  “plataforma”.

---

## 6. Arquitetura da identidade

O sistema possui quatro ativos distintos:

1. símbolo “S”;
2. wordmark `SeekIn`;
3. lockups oficiais;
4. golfinho mascote.

### 6.1. Wordmark

A grafia obrigatória é `SeekIn`, com `I` maiúsculo. Não usar `seekin`, `SEEKIN`, `Seekin`, `Seek In`
ou `Seek IN`.

Quando houver arquivo vetorial oficial, ele é a fonte primária. Não reconstruir o wordmark com CSS
ou texto tipográfico.

### 6.2. Lockups

- **horizontal:** símbolo e wordmark lado a lado; preferido em navegação e rodapés;
- **vertical:** símbolo acima do wordmark; reservado a aberturas e peças amplas;
- **icon only:** somente o “S”; favicon, app icon e espaços pequenos já contextualizados.

### 6.3. Área de respiro e tamanho mínimo

- preservar ao redor do símbolo uma área livre equivalente à espessura visual de uma extremidade do
  “S”;
- símbolo na UI: mínimo de `20px`;
- símbolo em contexto de marca: mínimo de `24px`;
- lockup horizontal: altura mínima de `24px`;
- nunca esticar, inclinar, recortar, contornar ou aplicar sombra pesada.

---

## 7. Uso do mascote

O golfinho pode aparecer em momentos de acolhimento nos quais sua presença reduz distância sem
competir com uma tarefa complexa.

### Permitido

- painel visual das telas de entrar e criar conta;
- abertura ou conclusão do onboarding;
- landing page, no máximo uma vez e com função narrativa explícita;
- campanhas, eventos, materiais de comunidade, apresentações e brindes.

### Evitar na UI operacional

- sidebar, navbar, botões, campos, tabelas e cards;
- ícones de navegação, status e loading rotineiro;
- alertas, conflitos e situações nas quais um personagem diminuiria a seriedade;
- qualquer uso como “assistente de IA”.

### Composição de autenticação

A referência de login orienta a relação entre formulário e mascote, não sua paleta nem seu personagem:

- formulário compacto em uma zona de leitura estável;
- mascote ocupando o campo visual de acolhimento;
- uma única direção de leitura entre marca, título, campos e ação;
- no mobile, formulário primeiro e mascote reduzido ou parcialmente recortado depois;
- fundo leve sem reduzir contraste de campos e textos.

---

## 8. Paleta oficial e imutável

Os seis valores abaixo vêm da prancha aprovada e constituem a paleta oficial:

| Papel | Token | Valor | Uso principal |
|---|---|---:|---|
| Primária | `--seek-primary` | `#5B9DE6` | símbolo, marca e destaques interativos |
| Azul do céu | `--seek-sky` | `#8EC5F5` | transições, brilho suave e apoio visual |
| Azul claro | `--seek-soft` | `#CFE6FF` | planos contextuais e ilustração |
| Azul suave | `--seek-veil` | `#EAF4FF` | véus, seleção e grandes transições claras |
| Fundo | `--seek-canvas` | `#F7FBFF` | canvas quase branco |
| Texto | `--seek-ink` | `#13233F` | texto, estrutura e contraste principal |

`#FFFFFF` continua permitido como superfície neutra, não como nova cor de marca.

### 8.1. O uso correto da família azul

A leveza da prancha não vem de trocar seus azuis. Ela vem de:

- branco e `#F7FBFF` dominando a composição;
- `#EAF4FF` e `#CFE6FF` criando profundidade sem grandes blocos saturados;
- `#8EC5F5` e `#5B9DE6` concentrados em marca, ação e pequenos pontos de atenção;
- transparências derivadas das cores oficiais;
- `#13233F` sustentando tipografia, estrutura e seriedade.

Não aplicar `#5B9DE6` como fundo amplo e uniforme. Não inventar azuis mais escuros para “dar
seriedade”.

### 8.2. Transparências

Transparências podem derivar apenas das cores oficiais:

```css
--seek-primary-a08: rgb(91 157 230 / 8%);
--seek-primary-a16: rgb(91 157 230 / 16%);
--seek-primary-a28: rgb(91 157 230 / 28%);
--seek-sky-a24: rgb(142 197 245 / 24%);
--seek-soft-a56: rgb(207 230 255 / 56%);
--seek-ink-a08: rgb(19 35 63 / 8%);
```

Esses tokens são camadas, não novas cores estruturais. Devem ser testados sobre o fundo real porque
o contraste final depende da composição.

### 8.3. Gradiente da marca

O gradiente institucional segue a progressão da prancha:

```css
linear-gradient(135deg, #5B9DE6 0%, #8EC5F5 45%, #CFE6FF 100%);
```

Ele pertence ao símbolo, wordmark exportado e a poucos gestos institucionais. A UI operacional
permanece predominantemente flat. Landing e autenticação podem usar o gradiente com baixa ocupação e
opacidade, mantendo grandes áreas claras.

### 8.4. Contraste acessível

Combinações medidas segundo WCAG:

| Combinação | Razão | Regra |
|---|---:|---|
| `#13233F` sobre `#FFFFFF` | `15,67:1` | qualquer texto |
| `#13233F` sobre `#F7FBFF` | `15,07:1` | qualquer texto |
| `#13233F` sobre `#5B9DE6` | `5,53:1` | texto normal e botão |
| `#13233F` sobre `#8EC5F5` | `8,55:1` | texto normal e botão |
| `#5B9DE6` sobre `#FFFFFF` | `2,83:1` | não usar em texto normal |
| `#FFFFFF` sobre `#5B9DE6` | `2,83:1` | não usar em texto normal |

Consequências:

- botão de fundo `#5B9DE6` usa texto `#13233F`, não branco;
- CTA de alto contraste pode usar `#13233F` com texto branco;
- links em texto usam `#13233F`, sublinhado e estado de foco; não dependem só do azul;
- o azul primário permanece livre para marca e elementos gráficos sem ser forçado a um papel que
  viola contraste.

---

## 9. Tipografia

A fonte de interface é **Manrope**:

```css
font-family:
  "Manrope",
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

A mesma família sustenta a landing e o produto. A diferença de caráter vem de escala, peso e espaço:

- display institucional em peso `400–500`;
- títulos de produto em `500–600`;
- corpo em `400`;
- ênfase curta em `600`;
- caixa alta espaçada apenas em micro-rótulos institucionais;
- jamais usar espaçamento exagerado em parágrafos ou controles.

O wordmark oficial continua sendo asset; Manrope não deve recriá-lo.

---

## 10. Linguagem de formas

A interface absorve a fluidez do “S” por consistência:

```css
--radius-xs: 8px;
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-xl: 24px;
--radius-pill: 999px;
```

| Elemento | Radius recomendado |
|---|---:|
| campos pequenos | `8–10px` |
| botões e inputs | `10px` |
| listas e painéis | `14–18px` |
| superfícies institucionais amplas | até `24px` |
| chips | `999px` |

Curva não significa transformar tudo em pills ou cards. Priorizar whitespace, linhas e agrupamento.

---

## 11. Pontos de fixação e direção de leitura

A referência de fixação demonstra que concisão e alinhamento consistente reduzem o percurso ocular.
Para landing, autenticação e diálogos:

- cada viewport começa com um foco dominante;
- texto de apoio fica no mesmo eixo do título sempre que possível;
- uma única ação primária encerra o bloco;
- ações secundárias têm peso visual claramente inferior;
- evitar alternar repetidamente entre alinhamento esquerdo, central e direito;
- evitar textos longos entre título e ação;
- elementos decorativos nunca entram no percurso necessário para concluir a tarefa.

O objetivo não é contar pontos mecanicamente, mas reduzir retornos, diagonais e competição visual.

---

## 12. Direção de movimento

Movimento deve sugerir fluxo de conhecimento, não entretenimento:

- transições de `160–240ms` em componentes;
- entrada institucional suave de até `480ms`;
- curvas e camadas podem deslocar-se poucos pixels ou revelar-se progressivamente;
- nenhum loop necessário para compreender a página;
- respeitar `prefers-reduced-motion`;
- o mascote não deve saltar, falar ou bloquear a ação.

---

## 13. Assets de produção

Em 14 de setembro de 2026, o Product Owner autorizou explicitamente a extração dos elementos da
prancha aprovada para concluir o `SKN-032`. Os arquivos raster abaixo são os assets em uso; a
prancha inteira não deve ser carregada pela interface:

```text
apps/web/public/brand/
  logo/
    seekin-symbol.png
    seekin-wordmark.png
  mascot/
    seekin-dolphin.png
```

O símbolo e o golfinho possuem transparência real. A wordmark raster usa a superfície oficial clara
da prancha; na interface, uma máscara alfa remove somente essa superfície sem alterar os canais RGB
da marca. Um futuro pacote vetorial, quando fornecido e revisado, substitui esses PNGs sem alterar
proporção, gradiente ou cor.

Não redesenhar o símbolo com CSS, não vetorizar automaticamente sem revisão, não recolorir os
arquivos extraídos e não usar a prancha inteira como imagem de interface.

---

## 14. Checklist de implementação

### Marca

- [x] assets raster autorizados estão isolados em `apps/web/public/brand`;
- [x] proporção, gradiente e área de respiro foram preservados na aplicação;
- [x] wordmark usa a grafia `SeekIn`;
- [x] mascote não substitui o símbolo.

### Cores

- [ ] apenas os valores oficiais e suas transparências derivadas foram usados;
- [ ] grandes áreas continuam brancas ou `#F7FBFF`;
- [ ] `#13233F` sustenta contraste e seriedade;
- [ ] nenhum azul arbitrário foi introduzido;
- [ ] contraste foi medido no fundo composto final.

### Composição

- [ ] há um foco dominante por bloco;
- [ ] título, apoio e ação seguem um percurso curto;
- [ ] a página não parece um mosaico de cards;
- [ ] curvas, gradientes e mascote possuem função narrativa;
- [ ] desktop e mobile mantêm a mesma prioridade de leitura.

### Acessibilidade

- [ ] navegação por teclado e `focus-visible` funcionam;
- [ ] alvos de toque têm ao menos `44 × 44px`;
- [ ] risco e estado não dependem apenas de cor;
- [ ] movimento reduzido está coberto;
- [ ] imagens possuem alternativa adequada ou são marcadas como decorativas.

---

## 15. Resultado esperado

Mesmo sem o logo visível, o SeekIn deve ser reconhecível por:

- clareza e baixa carga cognitiva;
- inteligência sem ostentação;
- parceria sem infantilização;
- superfícies luminosas e azuis aplicados com transparência;
- ritmo contínuo, suave e focado.

> **O “S” é o rosto do produto. O golfinho é a presença acolhedora da marca. O planejamento é a
> prova da sua inteligência.**
