# Fazenda Viva 0.9.9.9 — o ritmo do campo

Entrega integrada da sequência solicitada de 0.9.9.4 a 0.9.9.9, publicada como um único pacote após o fechamento da verificação. Os números intermediários descrevem as etapas implementadas; não foram seis publicações separadas.

## Etapas

1. **0.9.9.4 · interface e som:** HUD com textura discreta e ícones vetoriais, meta/obra visível, diário de marcos reais. Áudio original sintetizado: vento, pássaros e confirmações; volume geral/ambiente, silêncio e suspensão em página oculta.
2. **0.9.9.5 · manejo físico:** ponto de encontro fora do corredor da porteira, com posição de alimentação/escovação distinta. Atendimento exige proximidade inferior a 3,8 m. O animal retorna antes de chamar o próximo paciente do mesmo tratador.
3. **0.9.9.6 · vida nas propriedades:** borboletas junto às flores, pássaros sobre as glebas e sacarias que acompanham produção real. Instancing, culling e modo econômico preservados; fauna sem colisão nem efeitos econômicos.
4. **0.9.9.7 · contemplação:** HUD recolhido, cena acompanhada, pausa e troca entre cavalos, equipe e instalações. Arrastar continua encerrando acompanhamento; Voltar e Escape restauram interface.
5. **0.9.9.8 · conforto e balanceamento:** proporções de potros compartilhadas; contraste, alvos de toque e movimento reduzido. Trato efetivo concede 22 pontos (ração continua +10); compra autônoma exige cuidado do plantel acima de 70.
6. **0.9.9.9 · integração:** versão/caches coerentes, regressões e inspeção da entrega final antes de publicar.

## Verificação

- Áudio: bloqueio antes do gesto, nenhum ambiente duplicado, silêncio, aba oculta, limites de volume, até 20 vozes, descarte dos recursos e fallback sem AudioContext.
- Simulação: passou até o dia 1.261, 44 estruturas, 15 trabalhadores, 848 tarefas, 119 passagens de porteira e 69 excursões. Zero cruzamentos de caminhos com edificações, distância mínima entre cavalos 5,74 m e maior passo 1,128 m. Menor cuidado próprio 52,4/100. Diário de manejo exige distância real <3,8 m.
- Geometria/poses: Three.js oficial verifica cascos/botas acima do solo, focinho em pasto e articulações. Renderizador simulado, troca de qualidade e reconstrução de cena passaram.
- Navegador: passou em 390×844, 320×568, 360×640, 844×390 e 1365×900, com áudio desbloqueado por gesto real, sliders/silêncio, HUD, gestão, Contemplar, toque e recuperação de WebGL. Zero erros JavaScript; simulação alcançou o dia 76 após a recuperação. Cena inicial de 390×844: 165→166 chamadas e 152.533→152.563 triângulos frente à 0.9.9.3.
- Capturas inspecionadas: HUD em retrato pequeno e paisagem, Resumo/Ambiente, gestão em 320×568, Contemplar nas duas orientações, cavalos próximos, pastoreio Canvas e prancha de poses. Evidências no [workflow #140](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38162793343) e na [PR #6](https://github.com/oeduardobertei-jpg/Fazenda-/pull/6). Código verificado: `611cac2997525e1586ec289b642ebb488884f960`; alterações posteriores desta entrega são apenas documentação.
- Otimização do harness: durante a simulação longa, o Canvas não redesenha milhares de faces por passo. A verificação de renderização continua separada e em navegador real.

## Limites atuais

A direção visual dos cavalos segue em refinamento. Contato exato da mão/ferramenta com a superfície ainda usa poses procedurais; proximidade/posição do encontro são verificadas, sem IK completo. Os áudios são síntese original, não gravações realistas. Chromium/SwiftShader não mede FPS, calor nem percepção sonora de um Android físico. A 1.0 permanece vinculada aos critérios do roadmap.
