import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Página não encontrada | SeekIn" },
];

export function loader() {
  return new Response(null, { status: 404 });
}

export default function NotFound() {
  return (
    <main className="centered-page" aria-labelledby="not-found-title">
      <section className="foundation-card">
        <p className="eyebrow">Erro 404</p>
        <h1 id="not-found-title">Página não encontrada</h1>
        <p>O endereço informado não existe ou ainda não está disponível.</p>
        <a className="primary-link" href="/">
          Voltar ao início
        </a>
      </section>
    </main>
  );
}
