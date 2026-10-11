# Fazenda Viva 0.9.9.1 — personagens

O usuário considera os cavalos e os NPCs ainda visualmente insatisfatórios na 0.9.9 e pediu avanços pequenos na série 0.9.9.1, 0.9.9.2… até a 1.0. Esta etapa concentra-se na modelagem dos personagens.

## Implementação
- Volumes equinos redesenhados: garupa, dorso, peito, pescoço, cabeça, focinho, orelhas, pernas e cascos. Geometria indexada com normais suaves, compartilhada entre animais.
- Funcionários com volumes humanos e roupa rural, variações de pele/cabelo, chapéu, rosto, mangas, botas e cinto. Cotovelos articulados e inclinação de trabalho; instrumentos menores, presos à mão.
- Canvas projeta os mesmos perfis e articulações usados no WebGL, inclusive os NPCs em pé. Cache de perfis e fusão de malhas estáticas preservados. Cores por vértice reúnem roupa/rosto/acabamentos por articulação; Canvas simplifica as silhuetas subpixel na visão regional.
- Repouso com pernas quase estendidas e transição de altura do quadril para caminhada, mantendo cascos/botas apoiados. HUD preserva a versão inteira em telas estreitas.
- Mantidos a simulação, os limites de circulação, pastoreio/manejo, genética, comércio, economia e início de partida no dia 1 sem salvamento.
- Versão pública 0.9.9.1; metadados npm 0.9.9-1 para respeitar SemVer.

## Verificação

- **Automatizada em Node:** `npm test` passou após os ajustes finais. Simulação até o dia 1.221, 64 estruturas, 15 NPCs, 810 tarefas, 91 excursões; distância mínima entre cavalos de 5,77 unidades e zero interseções de caminhos com edifícios nas amostras. Contato dos cascos em y=0,420 e focinho em pasto em y≈0,680. Inclui cotovelos, postura de trabalho e ausência de agachamento em repouso.
- **Chromium/WebGL2 por software:** a primeira revisão corrigida passou em cinco viewports (390×844, 320×568, 360×640, 844×390 e 1365×900), com alternância 2D/3D, pinça por toque, painéis, manejo/pastoreio e restauração de contexto. Referência 0.9.9: 192 chamadas e 145.805 triângulos; revisão: 165 chamadas e 151.681 triângulos (−14,1% chamadas; +4,0% triângulos). A execução usa SwiftShader; FPS do servidor não mede o desempenho Android.
- **Inspeção visual:** prancha comparativa de perfil/frente/pasto e três funções de NPC, além de capturas dentro do jogo em 2D/3D. A inspeção detectou pernas flexionadas demais em repouso e versão cortada no HUD; ambas receberam correção e regressão específica.
- **Verificação final:** o commit de execução `2b95a0d9c163d1744ab731c03d5f4f256a642a77` passou no [workflow final](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38154173459) com smoke e browser aprovados. As capturas finais de personagens, repouso, pastoreio 2D/3D e HUD de 320 px foram inspecionadas; o orçamento permaneceu em 165 chamadas/151.681 triângulos na viewport 390×844.
- **Android físico:** pendente. Capturas estáticas não validam naturalidade contínua em movimento, calor/consumo ou FPS no aparelho. A aparência precisa da avaliação do usuário; a 1.0 não está declarada pronta.
