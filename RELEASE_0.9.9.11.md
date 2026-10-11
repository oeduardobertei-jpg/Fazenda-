# Fazenda Viva 0.9.9.11 — chão de fazenda e margens naturais

Revisão do conjunto visual do terreno, conforme a sequência proposta depois da 0.9.9.10.

- Grão procedural de baixo contraste, em coordenadas do mundo. Mesmo tile de 128×128 no Canvas e no WebGL; mipmaps no 3D.
- Pastagem irregular, margens de terra nos caminhos internos, solo gasto junto à passagem/cocho/água dos piquetes e faixas junto às instalações.
- Lâminas de capim substituem touceiras cônicas. Vegetação baixa se concentra também nas margens e junto às edificações, preservando o centro dos caminhos e a água.
- Manchas externas compartilhadas substituem os retângulos antigos do Canvas e a distribuição separada do 3D.
- Distribuição determinística e em cache. Atualiza com construções/caminhos, sem criar obstáculos, alterar regras econômicas ou consumir o RNG da simulação.
- Textura preservada na fusão de peças: posição/normal/UV completos. Solo sobreposto desenhado com ordem estável e teste de profundidade, sem disputar profundidade entre manchas.

## Verificação local

Terreno, áudio, simulação até o dia 1.261, renderizador, poses e geometria Three.js passaram. Mantidos 119 usos de porteira, 69 excursões, cuidado próprio mínimo 52,4/100 e zero interseções de caminhos com edificações.

Testes novos cobrem estabilidade da distribuição, margens livres, água, solo dentro do piquete, contraste baixo do grão e preservação dos UVs nas malhas texturizadas.

Chromium/WebGL2 passou em 390×844, 320×568, 360×640, 844×390 e 1365×900: zero erros JavaScript/shader, gestos, troca de qualidade e recuperação de contexto. Simulação alcançou o dia 81 após a recuperação. Capturas inspecionadas de cena local em retrato/paisagem, Contemplar próximo, piquete Canvas e pastoreio 3D; terreno, plantas e circulação permanecem legíveis.

Cena inicial de 390×844: 166→167 chamadas (+0,6%) e 153.491→148.973 triângulos (−2,94%). Esses números não medem desempenho no Android. Evidências no [workflow #145](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38180925417) e na [PR #8](https://github.com/oeduardobertei-jpg/Fazenda-/pull/8). Código verificado: `67cad462b7c7aed04314c90bbbbcc1a8df9020c6`; commits posteriores desta entrega alteram somente documentação.

## Limites

O desgaste do piquete é composição visual estática; não mede pisoteio ou consumo de pasto por indivíduo. Vegetação nova é decoração baixa, sem colisão. Qualidade artística, percepção sonora e desempenho no Android físico permanecem abertos à avaliação; Chromium/SwiftShader não substitui o aparelho.
