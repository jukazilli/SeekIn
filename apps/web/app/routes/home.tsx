export default function Home() {
  return (
    <main className="centered-page" aria-labelledby="foundation-title">
      <section className="foundation-card">
        <p className="eyebrow">SeekIn</p>
        <h1 id="foundation-title">Fundação operacional</h1>
        <p>
          A aplicação web está pronta para receber os módulos do planner depois
          da aprovação do portão de fundação.
        </p>
        <dl className="foundation-status" aria-label="Estado dos componentes">
          <div>
            <dt>Web</dt>
            <dd>online</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>Cloudflare Worker</dd>
          </div>
          <div>
            <dt>Dados</dt>
            <dd>Supabase</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
