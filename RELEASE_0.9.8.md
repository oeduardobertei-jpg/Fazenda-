# Fazenda Viva — avaliação e entrega 0.9.8

Base: `8f28cad65071b063487ce18934d75817ad990e51` (0.9.7).
Estado: candidata 0.9.8 em revisão no PR #1; a publicação principal permanece na 0.9.7.

## Avaliação do projeto

Foram lidos integralmente README.md, ROADMAP_1.0.md, index.html, world3d.js,
os dois testes existentes e o workflow de QA. Não há AGENTS.md no repositório.

O projeto já possui cinco propriedades, expansão autônoma, obras sequenciais,
economia, comércio com conservação de dinheiro/animais, reprodução, genética,
manejo, metas e dois renderizadores ligados à mesma simulação. A 1.0 não exige
substituir esses sistemas; exige integrá-los e provar sua qualidade em uso real.

Problemas encontrados e tratados nesta etapa:

| Área | Evidência na 0.9.7 | Mudança na 0.9.8 |
| --- | --- | --- |
| Qualidade | Smoke imprime PASS e falha depois com `window is not defined` | Timers da interface isolados no harness; término limpo |
| Terreno | Sombras 3D em y≈0,145/0,165, sob parcelas/piquetes em y≈0,24–0,40 | Base dos personagens em y=0,42 e sombra acima do chão |
| Animais | Pernas rígidas, passada diagonal e salto imediato para pasto; focinho alto | Quatro apoios, joelhos, alvo do casco e transições contínuas; cabeça articulada |
| Direção | Canvas gira antes da projeção anisotrópica | Rotação no espaço do mundo, antes da projeção visual |
| Profundidade Canvas | Fundo do piquete desenhado após os cavalos, escondendo-os | Solo antes dos personagens e cerca frontal ordenada pela profundidade |
| Estradas | Canvas desenha acesso até a sede, cortando instalações | Estradas públicas compartilhadas até a porteira |
| Funcionários | Ferramenta se movimenta separada do braço; trabalho conserva rumo da caminhada | Equipamento ligado ao braço e orientação para a tarefa/paciente |
| Câmera | Comando “acompanhar” só centraliza uma vez | Acompanhamento contínuo cancelável por arrasto/botão |
| Interface | HUD, mensagens e controles espalhados; menus com alturas fixas | HUD compacto, quatro ações principais, painéis adaptáveis, áreas seguras e guia |
| GPU | Cada tábua, janela e parte estática gera uma chamada | Fusão por material, preservando partes animadas e instancing |
| Validação | Three.js inteiramente simulado | Matemática/buffers oficiais em Node e teste Chromium/WebGL com capturas no CI |

## Escopo e conservação das funcionalidades

Mantidos preços, calendário, salários, limites produtivos, genética, comércio,
capacidade, progresso das obras, eventos, metas, 15 funcionários iniciais,
cinco glebas, fallback Canvas, reset e ausência de salvamento automático.
O guia pausa a partida; pode ser dispensado e reaberto. A gestão mantém a pausa
já existente. Não foram introduzidos clima, dia/noite ou necessidades pessoais.

As animações continuam procedurais e estilizadas. Esta é uma revisão de pose e
silhueta, não a importação de um rig profissional. Os cavalos ainda percorrem
pequenas áreas reservadas; a aproximação física durante manejo permanece
simplificada e precisa de revisão visual. Paletas distintas não bastam, por si
só, para declarar as cinco fazendas visualmente concluídas para a 1.0.

## Etapas verificáveis

1. Leitura integral e regressão da base — concluídas.
2. Isolamento das poses e correção de contatos/projeção — implementados.
3. Interface, guia, acompanhamento e cancelamento — implementados.
4. Fusão de peças estáticas sem alterar a distribuição — implementada.
5. Regressões, poses e geometria Three.js oficial — aprovadas localmente.
6. Chromium/WebGL2, cinco viewports, toque e recuperação de contexto — aprovados no CI.
7. Inspeção visual das capturas — realizada; corrigidos o encobrimento no Canvas
   e a mensagem central em paisagem. A faixa de acompanhamento foi liberada de
   mensagens duplicadas e os nomes regionais foram afastados dos botões de zoom. Capturas próximas dos personagens acrescentadas.
8. Android físico: naturalidade, toque, aquecimento e estabilidade prolongada —
   pendente; não substituível por emulação.

## Validação local executada

`npm test` inclui quatro verificações independentes:

| Verificação | Natureza | Resultado |
| --- | --- | --- |
| smoke.mjs | Simulação com DOM/Canvas simulados | PASS, código de saída 0 |
| render3d.mjs | Ciclo Three.js simulado, sem GPU | PASS |
| motion.mjs | Poses puras, apoio e transições | PASS |
| geometry3d.mjs | Geometria/matrizes/buffers oficiais Three.js, renderizador substituído | PASS |

A simulação amostrada alcançou dia 1.231, 63 instalações, 15 trabalhadores,
882 serviços e 107 segmentos internos. Nenhuma interseção de trilhas com prédios
foi detectada nas amostras; distância mínima entre cavalos: 6,02 unidades.
Esses resultados não são prova de ausência de todo defeito visual.

Com matrizes reais: sede detalhada fundida em 15 malhas; cascos apoiados
em y=0,420; focinho durante pasto em y≈0,539, acima do piquete.

O Chromium local não conseguiu iniciar neste ambiente: criação de socket
do processo recusada. A inspeção da página pública confirmou o fallback 2D;
o navegador de inspeção também não conseguiu criar um contexto WebGL. Por isso,
as capturas e medidas WebGL da nova versão foram executadas em GitHub Actions.
A primeira execução completa aprovada está em:
https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38108137191.
A rodada após os ajustes visuais também passou (incluindo pixels Canvas e aproximação dos animais):
https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38108431659.

A execução final do código também passou, com mensagens/rótulos corrigidos,
27 capturas, cinco nomes regionais livres dos controles e funcionários próximos:
https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38108826947.
Código testado: `52295cbabdf7c60d881f241640651d41a3d446ce`.
A documentação posterior não altera esse código. Recuperação de contexto
confirmada, simulação até o dia 81 após recuperação, zero erros JavaScript.

## Evidência de navegador e inspeção visual

Chromium real com WebGL2/SwiftShader, viewports 320×568, 360×640, 390×844,
844×390 e 1365×900. Passaram guia/pausa no dia 1, limites dos controles,
as seis abas de gestão sem transbordo horizontal, cancelamento de construção,
acompanhamento/arrasto, pinça por toque via CDP, cancelamento de gesto,
normal/econômico, alternância 2D↔3D e perda/restauração de contexto.
Nenhum erro JavaScript foi registrado na execução completa.

Na primeira comparação, com câmera e DPR iguais (390×844, DPR 1,2):

| Versão | Chamadas de desenho | Triângulos |
| --- | ---: | ---: |
| 0.9.7 | 261 | 137.909 |
| 0.9.8 | 201 | 144.977 |

Redução de chamadas: aproximadamente 23%. Os personagens articulados aumentam
os triângulos em aproximadamente 5%. Não há conclusão de ganho de FPS baseada
nisso; a primeira coleta era curta. O teste final descarta a leitura inicial e
aguarda pelo menos três amostras subsequentes. A rodada seguinte confirmou as
mesmas 261→201 chamadas. Seus FPS de software variaram de aproximadamente 3 a
16,9 nas viewports da 0.9.8: diagnóstico curto do runner, sem equivalência com
um telefone ou prova de FPS sustentado.

A inspeção visual das capturas pelo assistente conferiu legibilidade, cortes dos painéis,
composição, estradas e silhuetas. Ela encontrou problemas que as simulações
não detectaram: solo do piquete encobrindo os cavalos no Canvas e orientação
sobre a cena em paisagem. Ambos foram corrigidos; um teste lê os pixels do
cavalo no Canvas para prevenir o retorno desse encobrimento. As imagens são
quadros estáticos: naturalidade sustentada das animações e manejo ainda exigem
observação em movimento no aparelho.

## Como reproduzir

```sh
npm ci
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

O jogo continua sendo estático, sem etapa de build. `npm start` serve em 4173.
As dependências npm são usadas somente no desenvolvimento e nos testes.
O navegador de QA recebe a biblioteca oficial Three.js 0.165.0 localmente,
com os mesmos bytes da versão do CDN, isolando falhas de conexão. Não há mock
de shaders/WebGL nessa verificação. Chromium usa SwiftShader, portanto o FPS
medido é do runner e de uma GPU por software, não do celular do jogador.

Capturas/métricas são armazenadas como artifact `fazenda-viva-qa-0.9.8` do CI.
Orçamento inicial: menos de 300 draw calls na vista local padrão e redução
de pelo menos 20% frente à base 0.9.7, com a mesma câmera. Isso não garante
30 FPS em qualquer aparelho. Testes não dependem de serviços externos do jogo.

## Próximas etapas até 1.0

1. Refinar enquadramento inicial e terreno: a clareira ainda domina a composição;
   aumentar detalhes rurais dirigidos sem comprometer caminhos ou desempenho.
2. Validar distâncias do manejo, silhueta de potros, retornos de pasto e
   encontros dos funcionários; ajustar comportamento quando o visual exigir.
3. Fortalecer arquitetura/disposição própria de cada cabanha, além das cores,
   mantendo footprints, caminhos e orçamento de desenho.
4. Testar Android físico em retrato/paisagem: 15 minutos em normal/econômico,
   múltiplas pinças/trocas 2D↔3D, métricas de FPS e quedas, consumo/temperatura.
5. Na 0.9.9, congelar recursos, corrigir bloqueadores e calibrar economia longa.
6. Declarar 1.0 somente depois de cumprir ou revisar explicitamente os portões
   do ROADMAP_1.0.md. Esta entrega não marca os critérios Android como concluídos.

## Protocolo pendente de Android físico

Registrar modelo, versão do Android/Chrome, resolução, modo gráfico e duração.
Não marcar este protocolo como aprovado com o teste desktop emulado.

| Sessão | Ações | Evidência esperada |
| --- | --- | --- |
| Retrato e paisagem | Abrir guia, seis abas de gestão, construir/cancelar e navegar | Capturas sem cortes de ações, textos legíveis e toque preciso |
| Câmera | Alternar um/dois dedos, cancelar gesto, acompanhar animal/NPC, trocar 2D↔3D | Sem câmera presa, seleção acidental ou perda de controle |
| Mundo vivo | Observar pasto, caminhada, trabalho e manejo próximos | Vídeo curto com apoios, distância de interação e ferramenta legíveis |
| Sessão de 15 minutos por qualidade | Normal/econômico, expansão e visita às cinco propriedades, diagnóstico de FPS | FPS/tempo de frame e quedas anotados, sem erro JS/WebGL; registrar calor e consumo |

Só depois desses registros decidir se o orçamento de geometria, resolução e
LOD atende o aparelho de referência e fechar os portões mobile da 1.0.
