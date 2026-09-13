# Acervo de ícones do SeekIn

Este diretório preserva o acervo SVG bruto fornecido para a identidade visual do SeekIn. A fonte
canônica para significado, aliases aprovados, acessibilidade e normalização é a seção 15 do
[SKN-003](../11-Sistema-Visual-UI-Acessibilidade-e-Responsividade-do-SeekIn.md).

## Inventário de origem

- 1.006 arquivos SVG no total;
- 1.000 ícones com `viewBox="0 0 24 24"`;
- seis pranchas ou labels excluídos do runtime: `Business.svg`, `Button Big.svg`, `Content.svg`,
  `Design.svg`, `interface essentials.svg` e `wayfinding.svg`;
- 1.001 arquivos contêm preto hardcoded;
- 1.000 arquivos fixam dimensões em 24 × 24;
- nenhum arquivo usa `currentColor` na origem.

## Regra operacional

O aplicativo não importa arquivos diretamente deste diretório. Ao implementar uma interface:

1. localizar o conceito na tabela de aliases do SKN-003;
2. copiar apenas o desenho aprovado para `apps/web/app/ui/icons/svg`;
3. normalizar cor, dimensões e IDs internos;
4. exportar o alias pelo componente `Icon`;
5. validar leitura em 16, 20 e 24px e o nome acessível do controle.

Um nome de arquivo Streamline descreve a origem, não a API pública. Novos aliases precisam ser
registrados no SKN-003 antes de uso em produção.
