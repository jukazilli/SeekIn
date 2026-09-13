import type { MetaFunction } from "react-router";

import { AppShell } from "../ui/components/AppShell";
import { Icon } from "../ui/icons/Icon";

export const meta: MetaFunction = () => [
  { title: "Página não encontrada | SeekIn" },
];

export function loader() {
  return new Response(null, { status: 404 });
}

export default function NotFound() {
  return (
    <AppShell>
      <section className="state-page" aria-labelledby="not-found-title">
        <div className="state-page__content">
          <p className="eyebrow">Erro 404</p>
          <h1 id="not-found-title">Página não encontrada</h1>
          <p>Confira o endereço ou volte ao início.</p>
          <a className="primary-link" href="/">
            <Icon name="arrow-left" size={18} />
            Voltar ao início
          </a>
        </div>
      </section>
    </AppShell>
  );
}
