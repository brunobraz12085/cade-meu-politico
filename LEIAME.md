# Cadê Meu Político?

Site que mostra como votaram e quanto gastaram os deputados federais de cada estado, com dados oficiais da Câmara e do Senado.

## Como funciona

- `scripts/atualizar.mjs` busca os dados nos sites oficiais e grava em `site/dados/`.
- `site/` é o app: `index.html` (visual) e `app.js` (telas).
- `.github/workflows/atualizar.yml` faz o GitHub rodar o script todo dia às 6h17 e publicar o site sozinho.

## Já tem

- Escolha do estado (27 estados)
- Deputados federais com foto, partido e voto nas últimas votações nominais do plenário
- Gastos da cota no ano: total, por tipo, maiores gastos com link da nota fiscal
- Ranking de gastos do estado
- Lista de senadores

## Próximas etapas

1. Votações e gastos dos senadores
2. Presença, emendas (Portal da Transparência) e dados de campanha (TSE)
3. Deputados estaduais, começando pela Assembleia de Goiás
4. Login e assinatura no cartão
