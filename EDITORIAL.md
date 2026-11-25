# Regras do conteúdo — Cadê Meu Político?

O app é para quem NÃO entende de política. Tudo em linguagem do povo, curto e direto.

## Notícias (site/conteudo/noticias.json)

**Filtro do bolso e da vida:** só entra notícia que mexe com o bolso ou muda a rotina das pessoas.

- Entra: preços, dólar, combustível, juros, salário mínimo, impostos, conta de luz, saúde, escola, INSS, aposentadoria, benefícios, regras de trabalho/trânsito/documentos.
- Fica de fora: briga entre políticos, fofoca de bastidor, declaração polêmica sem efeito prático, chuva/tempestade/clima.
- Brasil: 2 a 4 notícias por dia, só as que mais pesam.
- Estados (`"estados": {"GO": [...]}`): só quando houver algo que pese naquele estado. Todo dia: só as grandes. Uma vez por semana: varredura estado por estado (prioridade: SP, MG, RJ, BA, PR, RS e GO).

**Formato de cada notícia:**
- `impacto`: UMA frase curta, o que muda na vida da pessoa. É a primeira coisa que aparece, em destaque.
- `tema`: Bolso, Preços, Trabalho, Saúde, Aposentadoria, Transporte, Impostos, Educação, Segurança ou Moradia (define a cor e o ícone).
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
- `muda`: "O que muda na sua vida": 1–2 frases curtas sobre o efeito na vida da pessoa (bolso, direitos, rotina), não sobre o que o projeto é. Começar por quem é afetado ("Se você é MEI: …"). Direto, na língua do povo, sem termo técnico.
- `oque`: o que o projeto é, em linguagem simples (aparece em "O que é esse projeto").
- `veredito`: "bom", "ruim" ou "misto" (pro povo). Critério: o efeito direto no bolso, nos direitos e nos serviços da pessoa comum. Ex.: aumenta imposto pra população = ruim; tem efeito bom e ruim relevante = misto. Sempre dizer o porquê.
- `melhora` / `piora`: listas curtas, na língua do povo, do que melhora e do que piora na vida da pessoa.
- Termômetro do político: % das votações em que ele votou igual à orientação do governo (com/contra o governo). Não julga bom ou ruim. O selo bom/ruim fica só nos projetos.
- `detalhe`: (opcional) mais uma linha de contexto.
- `fontes`: de onde veio a explicação.

## Rotina diária (por enquanto manual, pelo plano do Claude)

Bruno pede: "bom dia, atualiza o app". Claude busca as notícias, escreve os resumos dos projetos novos, mostra para aprovação e publica no GitHub pelo navegador do app.
