# Regras do conteúdo — Cadê Meu Político?

O app é para quem NÃO entende de política. Tudo em linguagem do povo, curto e direto.

## Notícias (site/conteudo/noticias.json)

**Filtro do bolso e da vida:** só entra notícia que mexe com o bolso ou muda a rotina das pessoas.

- Entra: preços, dólar, combustível, juros, salário mínimo, impostos, conta de luz, saúde, escola, INSS, aposentadoria, benefícios, regras de trabalho/trânsito/documentos.
- Fica de fora: briga entre políticos, fofoca de bastidor, declaração polêmica sem efeito prático, chuva/tempestade/clima.
- Brasil: 2 a 4 notícias por dia, só as que mais pesam.
- Estados (`"estados": {"GO": [...]}`): só quando houver algo que pese naquele estado. Todo dia: só as grandes. Uma vez por semana: varredura estado por estado (prioridade: SP, MG, RJ, BA, PR, RS e GO).

**Formato de cada notícia:**
- `titulo`: curto, direto, nosso.
- `aconteceu`: 2–3 linhas, linguagem simples.
- `porque`: a corrente de causa e efeito até o bolso da pessoa (ex.: dólar sobe → petróleo é cotado em dólar → diesel sobe → frete sobe → preço no mercado sobe).
- `fontes`: nome + link. Preferir 2 fontes.

**Regras fixas:**
- Texto sempre nosso. Nunca copiar trecho nem foto da matéria.
- Neutro: fato, sem opinião. Opinião fica para os vídeos do Bruno.
- Nenhuma notícia publicada sem o Bruno aprovar.

## Projetos votados (site/conteudo/projetos.json)

Chave = nome do projeto como aparece nos dados (ex.: `"PLP 299/2026"`).
- `apelido`: nome popular do projeto.
- `muda`: "O que muda na sua vida" em 2–3 linhas, neutro, sem dizer se é bom ou ruim.
- `detalhe`: (opcional) mais uma linha de contexto.
- `fontes`: de onde veio a explicação.

## Rotina diária (por enquanto manual, pelo plano do Claude)

Bruno pede: "bom dia, atualiza o app". Claude busca as notícias, escreve os resumos dos projetos novos, mostra para aprovação e publica no GitHub pelo navegador do app.
