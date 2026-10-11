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
Resultados de QA e inspeção de capturas serão registrados antes da integração. O teste Chromium usa WebGL2/SwiftShader por software; não representa um celular Android físico. A aparência ainda precisa da avaliação do usuário e a 1.0 não está declarada pronta.
