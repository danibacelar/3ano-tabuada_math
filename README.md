# Aventura da Tabuada

Jogo educativo de memorização da tabuada (1 a 10 + fase Challenge), feito em
HTML/CSS/JS puro, sem backend. Funciona em qualquer navegador e no GitHub Pages.

## Como publicar no GitHub Pages
1. Crie um repositório e coloque estes arquivos na raiz (mantendo a pasta `assets/`).
2. Nas configurações do repositório, ative o GitHub Pages apontando para a branch principal.
3. Pronto — o link do Pages abre o jogo.

Para testar localmente, basta abrir `index.html` no navegador (duplo clique já funciona,
sem precisar de servidor).

## Estrutura dos arquivos
- `index.html` — estrutura das telas (início, mapa, intro de fase, jogo, resultado).
- `style.css` — todo o visual: cores, tipografia, animações dos mini-games.
- `data.js` — configuração das 11 fases (nomes, posição no mapa, cores, tabuada),
  geração das perguntas e o sistema de repetição adaptativa. **É aqui que você mexe
  para mudar textos, posições das fases no mapa, ou critérios de estrelas.**
- `game.js` — o motor do jogo (troca de telas, spawn dos itens, pontuação, combos,
  salvamento do progresso).
- `assets/map.jpg` — a imagem do mapa que você forneceu.

## Coisas fáceis de ajustar em `data.js`
- `mapPos` de cada fase: posição (%) do marcador sobre a imagem do mapa.
- `palette`, `bg`, `icon`: cores e emoji de cada fase.
- `ROUND_LENGTH`: quantas perguntas tem uma rodada (normal / challenge).
- `starsForResult`: critério para 1, 2 ou 3 estrelas.

## Áudio (ainda não incluso)
O código já dispara os eventos certos nos momentos certos (acerto, erro, combo,
desbloqueio, fim de rodada) — basta adicionar chamadas de `Audio` dentro das
funções `showPraise`, `showRetry`, `maybeShowCombo`, `endRound` em `game.js`
quando você tiver os arquivos de som.

## Progresso salvo
Fica salvo no navegador (localStorage), por fase: estrelas, melhor pontuação,
melhor combo, e quais multiplicações a criança mais erra (usado para decidir
quais perguntas aparecem com mais frequência). Há um link discreto "Reiniciar
progresso" no canto do mapa (e na tela inicial, se já houver progresso), com
dupla confirmação antes de apagar.
