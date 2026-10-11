# Fazenda Viva 0.9.9.3 — movimento e gestos

A anatomia da 0.9.9.2 melhorou segundo o usuário, mas ainda não atingiu a aparência desejada. Esta etapa concentra-se em movimento e manejo, preservando a direção visual.

## Mudanças

- Passada equina calibrada à distância percorrida e ao período de apoio. O casco não desliza em deslocamento reto com marcha estabilizada; curvas/transições ainda dependem de avaliação visual.
- Balanço do casco usa elevação com velocidade vertical nula nas extremidades, quatro fases alternadas e altura compatível com o alcance das articulações.
- Giros dos cavalos/trabalhadores limitados por velocidade angular, com arco curto entre ângulos. Movimento de cabeça, orelhas, cauda e descanso discretos.
- Gestos distintos para alimentação, escovação, limpeza, agricultura e administração. Balde/escova alternam conforme o serviço real do tratador; os dois renderizadores usam as mesmas poses.
- Circulação, rotas, manejo, preços, produtividade e identidade dos animais mantidos.

## Verificação

- **Node:** suíte local passou: cinemática de apoio no mundo, limites de giro em ±π, gestos de alimentação/escovação, cascos/botas acima do solo e focinho em pasto. Simulação até o dia 1.221, 64 estruturas, 15 trabalhadores, 810 tarefas e 91 excursões; zero interseções de caminhos com edifícios nas amostras.
- **Navegador:** uma rodada completa de Chromium/WebGL2 por software é executada no fechamento, com cinco viewports e prancha de fases de passada/descanso/gestos. Conferir resultado do workflow correspondente à versão.
- **Android físico:** a avaliação contínua de aparência e movimento depende do aparelho do usuário. Renderização por software não mede FPS Android e a 1.0 permanece em desenvolvimento.
