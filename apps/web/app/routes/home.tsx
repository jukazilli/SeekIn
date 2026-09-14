import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "SeekIn — Mais tempo para aprender" },
  {
    name: "description",
    content:
      "Você diz o que precisa fazer e quanto tempo tem. O SeekIn transforma isso em um plano possível.",
  },
];

const planningSteps = [
  {
    number: "01",
    title: "Você conta.",
    description: "Adicione o que precisa fazer e o tempo que realmente tem.",
  },
  {
    number: "02",
    title: "O SeekIn organiza.",
    description:
      "O plano distribui o estudo considerando prazo, esforço e capacidade.",
  },
  {
    number: "03",
    title: "Você segue com clareza.",
    description: "Veja o que merece atenção agora e entenda o motivo.",
  },
];

export default function Home() {
  return (
    <div className="landing-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>

      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <a className="landing-wordmark" href="/" aria-label="SeekIn — Início">
            <img
              src="/brand/logo/seekin-wordmark.png"
              alt="SeekIn"
              width={2172}
              height={724}
            />
          </a>

          <nav className="landing-nav" aria-label="Navegação da página">
            <a href="#como-funciona">Como funciona</a>
            <a className="landing-nav__cta" href="/criar-conta">
              Criar minha conta
            </a>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing-kicker">Seu tempo importa.</p>
              <h1 id="landing-title">
                Mais tempo para aprender.
                <span> Menos tempo tentando organizar tudo.</span>
              </h1>
              <p className="landing-hero__intro">
                Você diz o que precisa fazer e quanto tempo tem. O SeekIn
                transforma isso em um plano possível.
              </p>
              <div className="landing-actions">
                <a
                  className="landing-button landing-button--primary"
                  href="/criar-conta"
                >
                  Criar minha conta
                </a>
                <a
                  className="landing-button landing-button--quiet"
                  href="#como-funciona"
                >
                  Ver como funciona
                  <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>

            <PlanningPreview />
          </div>
          <div className="landing-flow landing-flow--hero" aria-hidden="true" />
        </section>

        <section
          className="landing-statement"
          aria-labelledby="planning-time-title"
        >
          <div className="landing-container landing-statement__inner">
            <p className="landing-section-index" aria-hidden="true">
              01
            </p>
            <div>
              <h2 id="planning-time-title">
                Planejar não deveria consumir o tempo que você tem para estudar.
              </h2>
              <p>
                Prazos, rotina e esforço mudam. O SeekIn organiza essas partes
                para mostrar o próximo passo com clareza.
              </p>
            </div>
          </div>
        </section>

        <section
          className="landing-process"
          id="como-funciona"
          aria-labelledby="process-title"
        >
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-kicker">Como funciona</p>
              <h2 id="process-title">
                Do que precisa ser feito ao que fazer agora.
              </h2>
            </div>

            <ol className="landing-steps">
              {planningSteps.map((step) => (
                <li key={step.number}>
                  <span className="landing-step__number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-proof" aria-labelledby="proof-title">
          <div className="landing-container landing-proof__grid">
            <div className="landing-proof__copy">
              <p className="landing-kicker">Clareza para começar</p>
              <h2 id="proof-title">
                Um próximo passo. E o motivo por trás dele.
              </h2>
              <p>
                Em vez de entregar mais uma lista para você organizar, o SeekIn
                considera prazo, esforço e o tempo disponível para destacar o
                que merece atenção.
              </p>
            </div>

            <div
              className="next-step-card"
              aria-label="Exemplo de recomendação do SeekIn"
            >
              <div className="next-step-card__topline">
                <span>Próximo passo</span>
                <span>Hoje, 19h</span>
              </div>
              <h3>Revisar cálculo para a prova</h3>
              <p className="next-step-card__reason">
                Prazo próximo e duas sessões restantes.
              </p>
              <div className="next-step-card__time">
                <strong>45</strong>
                <span>minutos</span>
              </div>
              <div className="capacity-line">
                <span>Tempo disponível hoje</span>
                <span>1h 30</span>
              </div>
              <div className="capacity-track" aria-hidden="true">
                <span />
              </div>
              <p className="preview-note">
                Exemplo ilustrativo com dados sintéticos.
              </p>
            </div>
          </div>
        </section>

        <section
          className="landing-flexibility"
          aria-labelledby="flexibility-title"
        >
          <div
            className="landing-flow landing-flow--middle"
            aria-hidden="true"
          />
          <div className="landing-container landing-flexibility__inner">
            <p className="landing-section-index" aria-hidden="true">
              02
            </p>
            <div>
              <h2 id="flexibility-title">
                Um plano pensado para acompanhar mudanças — sem transformar
                imprevistos em culpa.
              </h2>
              <p>
                Porque uma rotina real se move. O planejamento também precisa
                ser flexível.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-closing" aria-labelledby="closing-title">
          <div className="landing-container landing-closing__inner">
            <p className="landing-kicker">Comece pelo que importa.</p>
            <h2 id="closing-title">
              Deixe o planejamento mais leve. Fique com o aprendizado.
            </h2>
            <a
              className="landing-button landing-button--primary"
              href="/criar-conta"
            >
              Criar minha conta
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <a className="landing-wordmark" href="/" aria-label="SeekIn — Início">
            <img
              src="/brand/logo/seekin-wordmark.png"
              alt="SeekIn"
              width={2172}
              height={724}
            />
          </a>
          <p>Clareza para encontrar o próximo passo.</p>
        </div>
      </footer>
    </div>
  );
}

function PlanningPreview() {
  return (
    <div
      className="planning-preview"
      aria-label="Exemplo de planejamento do SeekIn"
    >
      <div className="planning-preview__glow" aria-hidden="true" />
      <div className="planning-preview__window">
        <div className="planning-preview__header">
          <span>Hoje</span>
          <span>14 de setembro</span>
        </div>
        <div className="planning-preview__focus">
          <span className="planning-preview__label">Agora</span>
          <h2>Revisar cálculo</h2>
          <p>Prazo próximo · 45 min</p>
          <span className="planning-preview__action">Começar</span>
        </div>
        <div className="planning-preview__timeline" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="planning-preview__footer">
          <span>Seu plano, no seu tempo.</span>
          <span>1h 30 livre</span>
        </div>
      </div>
      <p className="preview-note">Demonstração com dados sintéticos.</p>
    </div>
  );
}
