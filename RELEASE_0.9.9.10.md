# Fazenda Viva 0.9.9.10 — porte e presença

Revisão concentrada no visual equino, após o feedback de que os cavalos ainda não atingiram a aparência desejada.

- Ombros e ancas dão volume à ligação dos membros com o tronco; corpo, pernas e peito foram remodelados.
- Pescoço e cabeça têm porte mais compacto, mantendo a crina e a lista ligadas à superfície.
- Canvas e WebGL usam as mesmas secções, pivôs e poses. Os volumes adicionais são reunidos no desenho do corpo no WebGL.
- Contemplar enquadra animais e trabalhadores conforme as dimensões da tela. Ao sair, restaura posição, zoom e vista anteriores. O zoom manual permite aproximação maior.
- Comparação de perfil, três quartos, frente, repouso, pasto, caminhada e potros gerada pelos construtores reais.

## Verificação

Áudio, simulação até o dia 1.261, renderizador, poses e geometria Three.js passaram localmente. Simulação econômica e circulação mantiveram 119 passagens de porteira, 69 excursões e cuidado mínimo próprio de 52,4/100. Novo teste de geometria cobre cascos e focinho de potros, jovens e adultos durante a transição para o pasto. Prancha geométrica preliminar inspecionada.

A rodada completa de Chromium/WebGL e a inspeção das capturas finais são registradas na PR #7 antes da publicação.

## Limites

Esta revisão continua estilizada e procedural. A qualidade artística dos cavalos permanece aberta à avaliação do usuário; os testes de geometria não aprovam a naturalidade por si só. Android físico e percepção sonora continuam pendentes. Os fazendeiros e as regras econômicas foram preservados.
