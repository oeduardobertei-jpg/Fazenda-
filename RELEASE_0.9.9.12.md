# Fazenda Viva 0.9.9.12 — o trabalho deixa marcas na fazenda

Os serviços concluídos passam a alterar a instalação atendida, compartilhando estado e posições em Canvas/Three.js.

- Alimentação efetivamente realizada junto ao cavalo deixa uma marca de trato no cocho do piquete. Escovação gera seu próprio registro, sem preencher o cocho.
- Limpeza deixa cama fresca na área de serviço do piquete ou cocheira.
- Organização agrícola acrescenta até quatro fardos no piquete ou galpão atendido. Substitui os fardos que antes acompanhavam apenas um bônus geral da fazenda.
- As marcas diminuem com os dias: trato em até 35, limpeza em 45 e organização em 60 dias simulados. Os sinais representam trabalho recente, não um novo inventário econômico.
- Gestão → Equipe mostra último serviço por trabalhador e marcas por instalação. Contemplar identifica o serviço mais recente.
- Geometria 3D atualiza apenas quando a faixa visual muda; usa o estado de calendário já lido pelo renderizador. Peças novas são reunidas com o modelo estático, mantendo a área de circulação livre.
- Atividade dos animais distingue caminhada dentro do piquete e deslocamento para o encontro com o tratador.

## Verificação

Rotina, terreno, áudio, simulação longa, renderizador, poses e geometria real Three.js passaram localmente. Simulação até dia 1.261: 848 tarefas, 31 instalações com marcas reais, 119 usos de porteira, 69 excursões, cuidado próprio mínimo 52,4/100 e zero interseções de caminhos com construções.

Testes de rotina cobrem atendimento de um animal antes de marcar alimentação, diferença entre alimentação/escovação, desgaste com o calendário, limite de quatro fardos e isolamento entre instalações. A geometria verifica aparecimento, cache e remoção das marcas. Navegador confere tarefas naturais; comparação visual de antes/depois utiliza estados controlados, identificados como tais no teste.

Verificação WebGL em etapas:

- A rodada ampla mediu 390×844, 320×568, 360×640, 844×390 e 1365×900 e percorreu seus controles. Parou por timeout de captura Canvas no desktop, sem concluir a rodada inteira. Cena inicial 390×844: 167→166 chamadas e 148.973→148.921 triângulos. Não apresentar essa rodada como aprovação completa: [workflow #149](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38189045550).
- A revisão focada das dimensões reais passou em WebGL: piquete 20×16, cocheira 17×10 e galpão 16×13, antes/depois, sem objetos novos fora do lote nem erros de shader/JavaScript. Captura inspecionada: [job de navegador #150](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38189575737). O smoke dessa rodada expôs dependência do relógio de inicialização do harness, corrigida mantendo o relógio determinístico no teste.
- A integração final passou com smoke e Chromium/WebGL: recuperação de contexto, pastoreio, manejo e tarefas naturais (11 instalações atendidas e 14 trabalhadores com registros), comparação do piquete em 2D/3D, Gestão → Equipe e revisão dos personagens. Zero erros JavaScript/shader: [workflow #151](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38189822609), código verificado `75da580cc2672bdfd5b33c0eb8915a5437f9e792`.

Capturas inspecionadas do piquete antes/depois em 3D, resultado Canvas, prancha de instalações e cenas locais de celular em retrato/paisagem. Imagens comparativas usam serviços controlados; tarefas naturais são verificadas separadamente no navegador e na simulação.

Verificações antigas da mesma PR passam a ser canceladas automaticamente. A rodada completa continua sendo o padrão do workflow; revisão focada é opcional. Densidade desktop de captura reduzida para evitar trabalho raster duplicado no renderer por software. Documentação e configuração do workflow são os únicos arquivos alterados após a revisão final do código.

## Limites

Cocho, fardos e cama fresca indicam o trabalho concluído; não representam inventário comercial, consumo individual de alimento ou cálculo de sujeira física. Porções reforçadas continuam em Cavalos e são consumidas no manejo existente. Sem nova regra financeira ou colisões de decoração.

Qualidade artística dos cavalos, percepção sonora e desempenho em Android físico permanecem pendentes. Chromium/SwiftShader não mede FPS ou temperatura no aparelho.
