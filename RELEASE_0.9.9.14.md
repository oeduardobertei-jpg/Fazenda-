# Fazenda Viva 0.9.9.14 — pastagens em setores

Primeira etapa da direção visual inspirada nas referências Farm Manager fornecidas pelo usuário, adaptada à cabanha brasileira.

## Alterações

- Parcelas visuais com verdes diferentes e tons de palha, faixas discretas de corte e intervalos de terreno entre setores. Mantêm o núcleo de instalações e suas rotas legíveis.
- Vegetação baixa agrupada em manchas próximas às bordas, em vez de uma distribuição inteiramente dispersa.
- Setores determinísticos compartilhados em Canvas e Three.js; não consomem o RNG da economia. Nenhuma parcela toca as margens de caminhos, açudes ou instalações. Novas obras removem parcelas conflitantes.
- Retângulos usam quatro vértices de contorno, com triângulos reunidos em uma única camada. Esta revisão evita subdivisões que não mudavam a forma.
- Ordem de desenho das camadas de terreno corrigida para que a superfície base da fazenda não esconda as manchas/setores no WebGL. Depth test preserva construções, animais e vegetação.

## Verificação

`npm test` passou localmente e no GitHub: rotina, terreno, áudio, simulação, cuidado, renderizador, movimento e geometria. Resultados da simulação/manejo iguais à 0.9.9.13: 987 tarefas, 122 passagens de porteira, 77 excursões e cuidado próprio mínimo 59/100.

Regressões específicas de terreno verificam parcelas dentro da propriedade, margem de instalações, caminhos livres, contraste entre pastagem/palha e remoção de uma parcela quando uma obra ocupa seu espaço.

A primeira rodada de paisagem completou as capturas nas cinco telas, mas reprovou o orçamento de triângulos. A inspeção também mostrou setores escondidos pela ordem de desenho no WebGL. Ambos corrigidos antes da publicação; [workflow #155](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38199261909) não representa aprovação final.

A rodada #156 passou em cinco telas, mas a inspeção das imagens revelou que manchas antigas podiam cobrir os setores por ordenação de objetos do mesmo material. A prioridade agora é explícita por camada: solo externo, manchas, setores, piquete. Nova revisão no [workflow #157](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38274826449), aprovado com smoke e revisão WebGL/Canvas nas cinco telas. Zero erros JavaScript/shader. Capturas finais em 2D/3D inspecionadas; setores visíveis e caminhos/instalações preservados. Código verificado: `990d48c2292cf9f540147d202f9b71148184d2cb`. Apenas documentação foi alterada após a revisão.

Na rodada #156, a cena inicial passou de 166 para 167 chamadas e de 148.921 para 151.948 triângulos (+2,03%). As cinco fazendas tinham 16–17 setores cada. As medições são de Chromium/SwiftShader, não de desempenho no Android.

## Limites

Parcelas de palha/pastagem representam direção visual; não são lavouras novas, estoque de feno ou sistema de corte/colheita. Vegetação arbórea agrupada, margens de rio, reorganização do núcleo de instalações e nova câmera ainda não foram implementadas nesta etapa.

Revisão de navegador focada no que mudou: paisagem 2D/3D, cinco tamanhos de tela, erros e orçamento gráfico. Integração completa de manejo foi aprovada na 0.9.9.13 e permanece disponível em `npm run test:browser`. Android físico, aprovação artística dos cavalos e áudio continuam pendentes.
