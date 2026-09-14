# SKN-032 — Plano da landing page do SeekIn

- **Status:** pronto para revisão e implementação após aprovação documental
- **Tipo:** direção de produto, conteúdo, UX e plano técnico
- **Dependências:** `SKN-031`, `SKN-014`, `SKN-015` e `SKN-040`
- **Versão:** 1.0
- **Data:** 13 de setembro de 2026
- **Brand guide:** [ajustes-design-system.md](./ajustes-design-system.md)
- **Referência externa:** [Resend](https://resend.com/)

---

## 1. Decisão

A rota pública `/` será a landing page do SeekIn. Ela apresentará o produto como um aplicativo que
devolve tempo e clareza ao estudante — não como uma plataforma SaaS, um painel corporativo ou uma
rede social já disponível.

A direção escolhida é:

> **Minimalismo luminoso + narrativa editorial + prova visual de um plano que cabe na vida real.**

A Resend é referência de hierarquia, escala, respiro, progressão narrativa e confiança visual. Não é
referência para copiar paleta escura, tipografia serifada, objeto 3D, conteúdo ou estrutura comercial.

---

## 2. Estado real do produto

No início deste plano:

- `/` renderiza um `AppShell` de fundação com o título “Início”;
- `/criar-conta`, `/auth/confirmar` e `/conta-confirmada` já existem pelo `SKN-040`;
- a rota de entrada será criada pelo `SKN-041`;
- os tokens em código ainda representam a versão anterior do sistema visual;
- os arquivos de `docs/nova-logo` são referências e ainda não existem como assets isolados de
  produção;
- o planner completo, a rede social, depoimentos e métricas públicas ainda não existem.

A landing não pode simular disponibilidade, resultados, clientes ou recursos que o produto ainda não
possui.

---

## 3. Objetivo e conversão

### Objetivo primário

Fazer uma pessoa com pouco tempo entender, em uma leitura curta, que o SeekIn recebe suas demandas e
sua disponibilidade para construir um plano possível.

### Ação primária

**Criar minha conta** → `/criar-conta`

### Ação secundária

**Ver como funciona** → âncora `#como-funciona`

### Ação de retorno

**Entrar** → só aparece quando a rota do `SKN-041` estiver disponível. Não publicar link morto ou
placeholder.

### Indicador de sucesso da página

A landing deve permitir que uma pessoa responda, sem rolar novamente:

1. o que o SeekIn faz;
2. para quem ele é;
3. por que ele poupa tempo;
4. qual é o próximo passo.

---

## 4. Posicionamento e copy aprovada para implementação

### Hero

**Micro-rótulo**

> Seu tempo importa.

**Título**

> Mais tempo para aprender. Menos tempo tentando organizar tudo.

**Texto de apoio**

> Você diz o que precisa fazer e quanto tempo tem. O SeekIn transforma isso em um plano possível.

**Ações**

- Criar minha conta
- Ver como funciona

### Transição de problema

**Título**

> Planejar não deveria consumir o tempo que você tem para estudar.

**Apoio**

> Prazos, rotina e esforço mudam. O SeekIn organiza essas partes para mostrar o próximo passo com
> clareza.

### Como funciona

1. **Você conta.** Adicione o que precisa fazer e o tempo que realmente tem.
2. **O SeekIn organiza.** O plano distribui o estudo considerando prazo, esforço e capacidade.
3. **Você segue com clareza.** Veja o que merece atenção agora e entenda o motivo.

### Princípio de flexibilidade

**Título**

> Seu plano acompanha a sua rotina — não o contrário.

**Apoio**

> Quando o dia muda, o SeekIn ajuda a reorganizar o que vem pela frente sem apagar o que você já fez.

Essa frase deve ser publicada somente junto da entrega de replanejamento. Antes disso, usar a versão
honesta:

> O SeekIn foi pensado para acompanhar mudanças de rotina sem transformar imprevistos em culpa.

### Fechamento

**Título**

> Deixe o planejamento mais leve. Fique com o que importa.

**Ação**

> Criar minha conta

### Copy proibida

- “A plataforma definitiva para estudantes.”
- “Produtividade com IA.”
- “Tudo em um só lugar.”
- “Nunca mais se atrase.”
- “Junte-se a milhares de estudantes.” sem dado comprovado;
- preços, planos, comparativos, logos de clientes e depoimentos inventados;
- promessa de comunidade, feed ou mentoria na primeira versão.

---

## 5. Arquitetura da página

| Ordem | Bloco | Trabalho mental | Foco dominante | Ação |
|---:|---|---|---|---|
| 1 | Navegação | reconhecer a marca e decidir continuar | lockup horizontal | criar conta |
| 2 | Hero | entender a promessa | título | criar conta |
| 3 | Problema | reconhecer a própria rotina | frase editorial | nenhuma |
| 4 | Como funciona | formar modelo mental | sequência 1–2–3 | nenhuma |
| 5 | Produto em contexto | perceber utilidade concreta | próximo passo planejado | criar conta |
| 6 | Flexibilidade | entender parceria e ausência de culpa | frase + mudança de plano | nenhuma |
| 7 | Fechamento | tomar decisão | título curto | criar conta |
| 8 | Rodapé | acessar informações auxiliares | marca | links institucionais reais |

A página não terá uma seção “recursos” em grade. Capacidades aparecem dentro da narrativa, ligadas ao
problema que resolvem.

---

## 6. Mapa de fixação visual

### Desktop

O primeiro viewport deve conduzir o olhar em um percurso curto:

```text
┌─────────────────────────────────────────────────────────────┐
│ [SeekIn]                         Como funciona   [Criar conta]│
│                                                             │
│  1. micro-rótulo                   5. plano em movimento     │
│  2. título dominante                  ┌───────────────┐      │
│  3. explicação curta                  │ próximo passo │      │
│  4. CTA → apoio                       │ tempo real    │      │
│                                       └───────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

Regras:

- conteúdo principal alinhado à esquerda;
- visual do produto ancorado à direita, subordinado ao título;
- no máximo cinco fixações necessárias antes da dobra;
- sem texto sobreposto a curvas ou ilustrações;
- CTA primário próximo do texto que justifica a ação;
- nenhum carrossel, ticker, popup ou animação concorrente.

### Mobile

```text
┌──────────────────────┐
│ [SeekIn]       [menu]│
│                      │
│ 1. micro-rótulo      │
│ 2. título            │
│ 3. apoio             │
│ 4. [Criar conta]     │
│    Ver como funciona │
│                      │
│ 5. visual do produto │
└──────────────────────┘
```

- a ordem semântica é também a ordem visual;
- o CTA ocupa a largura disponível sem parecer uma barra de sistema;
- o visual vem depois da ação e pode ser parcialmente recortado;
- navegação extensa vira menu; “Criar conta” permanece visível se houver espaço;
- nenhum texto cai abaixo de `16px` quando necessário para leitura.

---

## 7. Direção visual

### 7.1. Aplicação da marca

- canvas `#F7FBFF` com superfícies brancas;
- texto e estrutura em `#13233F`;
- símbolo e detalhes em `#5B9DE6`;
- profundidade construída com `#8EC5F5`, `#CFE6FF`, `#EAF4FF` e transparências oficiais;
- gradiente da marca em área pequena e com bastante respiro;
- Manrope em escala editorial, sem introduzir uma segunda família;
- curvas longas e suaves podem ligar seções como fluxo, sem ondas literais repetidas;
- divisores finos e alinhamentos precisos substituem excesso de cards e sombras.

### 7.2. O visual de produto do hero

O hero mostra uma única situação compreensível, não um dashboard completo:

- uma tarefa realista, como “Revisar cálculo para a prova”;
- a recomendação “Hoje, 19h · 45 min”;
- uma explicação curta, como “Prazo próximo e 2 sessões restantes”;
- capacidade disponível representada de modo discreto;
- uma curva translúcida ligando demanda, tempo e próximo passo.

O conteúdo é sintético e deve ser marcado como demonstração. Não incluir dados pessoais.

### 7.3. Como evitar aparência genérica de SaaS

- não usar bento grid;
- não empilhar cards de benefícios com ícones genéricos;
- não incluir preço no primeiro corte;
- não usar navegação com “Produto / Soluções / Empresa / Recursos”;
- não usar glassmorphism, glow azul ou fundo inteiro em gradiente;
- não criar mockup de dashboard impossível de ler;
- não repetir o “S” ou o golfinho em toda seção;
- não usar estrelas, selos e números sem evidência.

### 7.4. Mascote

O golfinho não precisa disputar o hero com a demonstração do produto. O uso preferido neste corte é
na autenticação. Se entrar na landing, aparece uma única vez, próximo da mensagem de parceria ou do
fechamento, sem balão de fala e sem personificar uma IA.

---

## 8. Navegação e rotas

| Elemento | Destino | Regra de publicação |
|---|---|---|
| Wordmark | `/` | sempre |
| Como funciona | `/#como-funciona` | sempre |
| Por que funciona | `/#por-que-funciona` | somente se a seção existir |
| Entrar | rota definida pelo `SKN-041` | somente após a rota existir |
| Criar minha conta | `/criar-conta` | sempre |

O `AppShell` operacional não envolve a landing. A rota pública terá um layout institucional próprio,
enquanto as rotas de autenticação usarão um `AuthLayout` alinhado ao brand guide.

---

## 9. Responsividade

### Compacto: `360–767px`

- uma coluna;
- hero centralizado apenas no container, com texto alinhado à esquerda;
- heading entre `42–52px`, ajustado por `clamp` e conteúdo;
- CTA primário em largura total;
- seções com `64–88px` de intervalo vertical;
- demonstração de produto simplificada e sem overflow horizontal.

### Intermediário: `768–1023px`

- hero pode permanecer em uma coluna ampla;
- visual abaixo do texto, sem comprimir duas colunas;
- navegação reduzida;
- seções de processo continuam em sequência, não em cards concorrentes.

### Expandido: `>= 1024px`

- hero em duas zonas assimétricas;
- heading entre `64–88px`, no máximo três linhas;
- conteúdo com largura de leitura controlada;
- demonstrações alternam posição somente quando isso mantém uma direção clara;
- largura máxima do canvas entre `1200–1320px`.

---

## 10. Acessibilidade e desempenho

- HTML semântico com um único `h1`;
- âncoras recebem foco visível e compensação para header fixo, se usado;
- botão `#5B9DE6` usa texto `#13233F`; branco sobre azul primário é proibido em texto comum;
- ilustrações decorativas usam `alt=""`; demonstrações relevantes recebem descrição objetiva;
- sequência 1–2–3 permanece compreensível sem animação;
- `prefers-reduced-motion` remove deslocamentos e revela o estado final;
- nenhum vídeo obrigatório no hero;
- SVGs otimizados, imagens responsivas e dimensões reservadas contra layout shift;
- objetivo inicial: Lighthouse ≥ 90 em desempenho, acessibilidade, boas práticas e SEO nos viewports de
  validação;
- alvo de toque mínimo: `44 × 44px`.

---

## 11. Plano de implementação por slices

### Slice 0 — Assets oficiais

**Dentro**

- receber/exportar símbolo, wordmark, lockup horizontal e golfinho isolados;
- validar transparência, proporção e leitura em tamanho real;
- organizar `apps/web/public/brand`.

**Fora**

- redesenhar o logo;
- recortar a prancha para simular assets finais.

**Saída**

- inventário de assets pronto para consumo.

### Slice 1 — Tokens e primitives de marca

**Dentro**

- migrar cores e radius para os valores do brand guide;
- incluir transparências derivadas;
- adaptar estados acessíveis sem criar azuis arbitrários;
- criar componentes de marca para símbolo, lockup e wordmark.

**Saída**

- tokens documentados e código sincronizados;
- testes existentes atualizados sem regressão.

### Slice 2 — Estrutura pública

**Dentro**

- substituir o placeholder de `/` pela landing;
- criar layout institucional independente do `AppShell`;
- implementar header, âncoras, hero e rodapé;
- manter `/health` e rotas de autenticação inalteradas.

**Saída**

- navegação pública funcional, sem links mortos.

### Slice 3 — Narrativa e demonstração

**Dentro**

- implementar problema, sequência 1–2–3, prova visual e fechamento;
- usar dados sintéticos coerentes com o PRD;
- adicionar curvas e transparências com função de fluxo;
- cobrir desktop e mobile.

**Saída**

- proposta de valor compreensível sem depender de texto técnico.

### Slice 4 — Superfícies de autenticação

**Dentro no `SKN-032`**

- aplicar marca e composição de acolhimento à criação e confirmação de conta;
- preparar o `AuthLayout` para receber o mascote.

**Integração posterior no `SKN-041`**

- aplicar o mesmo layout à tela de entrar;
- publicar o link “Entrar” na landing somente quando a rota existir.

**Saída**

- landing e autenticação parecem partes do mesmo produto.

### Slice 5 — Verificação

**Dentro**

- testes de componentes e rotas;
- Playwright em `360`, `390`, `768`, `1024`, `1280` e `1440px`;
- teclado, foco, contraste, reduced motion e ausência de overflow;
- validação de copy contra funcionalidades reais;
- Lighthouse e inspeção visual comparativa com a prancha.

**Saída**

- evidência `EV-SKN-032` com capturas, checks e SHA.

---

## 12. Arquivos previstos

Esta lista é um mapa, não autorização para criar alternativas em paralelo:

```text
apps/web/app/
  routes/home.tsx                    # landing pública
  ui/brand/BrandMark.tsx
  ui/brand/BrandLockup.tsx
  ui/components/PublicLayout.tsx
  ui/components/AuthLayout.tsx       # evolução do existente
  ui/tokens/colors.css
  ui/tokens/radius.css
  styles/landing.css                 # ou colocalização equivalente aprovada

apps/web/public/brand/
  logo/*
  mascot/*

tests/e2e/
  landing.spec.ts
```

Antes de criar arquivos, confirmar os padrões reais do repositório e reutilizar primitives existentes.

---

## 13. Definition of Done do SKN-032

- [ ] assets oficiais isolados foram fornecidos e usados sem reconstrução;
- [ ] paleta corresponde exatamente à prancha;
- [ ] translucidez e gradiente seguem o brand guide;
- [ ] `/` apresenta a landing e não o `AppShell` operacional;
- [ ] CTA principal chega a `/criar-conta`;
- [ ] não há link para rota inexistente;
- [ ] copy não promete rede social, IA, usuários ou resultados não comprovados;
- [ ] cada bloco possui um foco dominante e uma direção de leitura curta;
- [ ] mascote aparece apenas no contexto aprovado;
- [ ] layout funciona nos seis viewports de verificação;
- [ ] teclado, foco, contraste, movimento reduzido e textos alternativos foram validados;
- [ ] não há overflow horizontal nem layout shift relevante;
- [ ] testes, lint, tipos, build e E2E estão verdes;
- [ ] Preview/Beta e evidência apontam para o mesmo SHA;
- [ ] documentação e código permanecem sincronizados;
- [ ] após o fechamento, a sequência retorna ao `SKN-041`.

---

## 14. Decisões que não bloqueiam o início

- a presença do golfinho na landing é opcional; na autenticação é a aplicação preferida;
- a demonstração do hero pode ser construída com HTML/CSS e componentes reais, desde que não finja
  interação ainda inexistente;
- conteúdo de termos, privacidade e contato só entra no rodapé quando os destinos reais existirem;
- animação pode ser removida se comprometer clareza, desempenho ou movimento reduzido.

## 15. Bloqueio real antes do código visual final

Os assets da prancha ainda não estão isolados. A implementação pode preparar estrutura e tokens, mas
o logo, a wordmark e o mascote finais só devem entrar no produto quando forem entregues em arquivos
individuais, transparentes e revisados.
