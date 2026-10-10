# Fazenda Viva — versão 0.8.8

Simulador brasileiro de cabanhas, propriedades rurais, economia e criação de cavalos, jogável no navegador do celular.

**Jogar:** https://oeduardobertei-jpg.github.io/Fazenda-/?v=088

## Novidades da série 0.8

### 0.8.0 — reconstrução territorial e retorno ao 3D
- Mundo expandido para aproximadamente 1.300 × 1.200 unidades, cinco propriedades distantes e glebas próprias.
- Validação espacial: sem novas construções que ocupem espaço já reservado ou ultrapassem o lote.
- Renderizador tridimensional Three.js (WebGL), mantendo o Canvas 2D como alternativa.
- Migração dos dados salvos desde a série 0.4–0.7, mantendo a cópia anterior.
- Mapa regional, visita às propriedades, cavalos e construções em 3D.

### 0.8.1 — correções identificadas nas capturas reais do Android
- Terreno estendido até o horizonte para eliminar grandes áreas azuis vazias fora da região.
- Estradas de acesso reposicionadas para não atravessarem instalações.
- Cavalos agrupados em piquetes e próximos às cocheiras, em vez de ficarem soltos nas estradas.
- Nomes das propriedades ocultados em zoom próximo para não cobrirem telhados.
- Câmera oblíqua e suavização de movimentação.
- Indicador `Three.js ativo` ocultado automaticamente, liberando espaço na tela.

### 0.8.2 — arquitetura rural e interação
- Casas com molduras, janelas, varandas e pilares.
- Cocheiras com portões, baias e ventilação.
- Galpões agrícolas com portas duplas e estruturas metálicas.
- Piquetes com cochos, bebedouros e detalhes internos.
- Ampliações visuais dentro dos limites reservados das construções.
- Seleção e construção em 3D usando raycasting no solo. Corrige o desvio entre o lugar tocado e o lugar construído.
- Enquadramento inicial da cabanha mais próximo e mensagens transitórias.

### 0.8.3 — desempenho mobile e planejamento de expansão
- Limite aproximado de 30 quadros por segundo no renderizador 3D de celulares.
- Densidade de pixels ajustada para economizar processamento.
- Renderização seletiva dos edifícios próximos à câmera; modelos simplificados na visão regional.
- Geometrias reutilizadas nas ampliações para reduzir alocações de memória.
- Zonas funcionais nas decisões das IAs: áreas residenciais, equestres, agrícolas e de piquetes.
- Limite inicial de expansão automática de até 24 estruturas por propriedade vizinha; instalações antigas de salvamentos anteriores não são removidas.

### 0.8.4 — correções a partir das capturas do Android
- Gestos de câmera reescritos para um e dois dedos, com estado separado de pinça e arrasto; cancelamento e retirada de dedos não deixam o zoom preso.
- Botões **+** e **−** no canto superior direito, para aproximação e afastamento mesmo quando um gesto falha.
- O movimento com toque no 3D agora usa a projeção real do terreno para deslocar a câmera.
- Nova passagem de câmera entre vista regional (quase vertical) e vista da cabanha (oblíqua); saltos grandes de posição não ficam demorando a acompanhar.
- Níveis diferentes para camadas do cenário (pastagem, estradas, terrenos, açudes e água) para eliminar artefatos triangulares de z-fighting.
- Vegetação mais variada, combinando árvores de copas arredondadas e coníferas, mantendo instancing para desempenho mobile.
- A área total do terreno continua ampliada; o progresso da versão anterior permanece salvo.

### 0.8.5 — obras sequenciais e redução dos "lotes vazios"
- **Diagnóstico visual:** muitos retângulos das capturas eram piquetes completos, mas simples demais, não canteiros inacabados. O modelo agora inclui abrigo, cocho, bebedouro, capim e fardos.
- **Construção por etapas:** obras começam com canteiro/fundação e avançam de 25% em 25% a cada ciclo de 5 dias simulados, concluindo em cerca de 20 dias simulados.
- **Uma obra de cada vez, por propriedade:** uma IA não pode abrir outra construção ou ampliação enquanto a anterior estiver em progresso. O jogador segue a mesma regra.
- **Ampliação em etapas:** cocheiras, casas, galpões e piquetes recebem estado `upgrading`, com estrutura existente preservada e obra temporária visível.
- **Novo planejamento das IAs:** limites totais e por tipo de construção; piquetes novos são limitados conforme o plantel. Há preferência por melhorar estruturas existentes antes de acrescentar novos cercados.
- **Economia coerente:** novas obras só passam a gerar receitas e capacidade depois da conclusão. Edifícios em ampliação continuam funcionando no nível anterior até o término.
- **Salvamento compatível:** preserva o arquivo local de versões anteriores, incluindo construções completas, e agora salva estado e andamento das obras. Estruturas antigas não são apagadas nem convertidas.
- **Renderização de zoom:** corrigida a orientação dos oitões dos telhados, que antes cruzavam o plano das águas; LOD com histerese para reduzir cintilação e reconstruções repetidas perto do limite de zoom.
- **Estradas:** encontros têm alturas ligeiramente distintas e áreas de junção para evitar conflitos de profundidade (z-fighting). Árvores não nascem dentro dos acessos às fazendas nem das lavouras.
- **Compatibilidade:** modo 2D também diferencia obra em andamento de piquete concluído.

**Limite conhecido:** salvamentos antigos com dezenas de piquetes continuam com eles, pois são construções já adquiridas; a atualização melhora sua representação e evita novas construções excessivas. Nenhum progresso do usuário é descartado silenciosamente.

### 0.8.6 — criadores, cavalos separados e novas partidas
- Os cavalos usam **posições espaciais individuais**. Cada piquete concluído recebe até dois animais; excedentes vão para áreas livres da propriedade, evitando que vários corpos 3D ocupem o mesmo lugar.
- A regra vale tanto no modo **3D** quanto no **2D**, pois as posições são calculadas pela simulação, não independentemente por cada renderizador.
- **15 NPCs rurais** (três por propriedade): tratador, agricultor e administrador. Movimentam-se autonomamente entre as instalações, com roupa de trabalho, chapéu e passos animados em 3D; também são visíveis em 2D.
- A presença dos NPCs é uma primeira implementação visual/de movimentação. Ainda não há tarefas produtivas com efeitos econômicos específicos nem desvio completo de obstáculos; esses comportamentos serão evoluídos nas próximas versões.
- **Reiniciar do dia 1:** botão no menu **Construir** com confirmação, para voltar ao início do jogo.
- **Partida nova em cada abertura:** desativados `load()` e `save()`, assim o jogo não carrega nem grava progresso automaticamente. O armazenamento antigo só será excluído caso o usuário confirme o reset.
- O HUD agora usa `🏡 estruturas · 👷 obras · 👨‍🌾 NPCs`, com texto mais curto para o Android.

### 0.8.7 — circulação de trabalhadores, produtividade e caminhos rurais
- **Navegação A\*** local em cada fazenda: trabalhadores usam uma grade de 4 unidades, evitam instalações, respeitam os limites das glebas e não cruzam as quinas de edifícios.
- **Planejamento sob demanda:** grades de circulação são reutilizadas; mudanças na localização das construções atualizam as áreas bloqueadas. Caso um caminho fique ocupado por uma obra, o funcionário procura uma nova rota.
- **Três tarefas com conclusão:** tratadores atendem cocheiras e piquetes, agricultores visitam galpões e piquetes, administradores percorrem casas e instalações. Cada funcionário executa tarefas em pontos acessíveis e registra os serviços concluídos.
- **Impacto na economia:** serviços criam bônus temporários e limitados na produção equestre, agrícola e na administração. Três trabalhadores por cabanha também geram folha salarial em cada ciclo. O painel de construção detalha as tarefas, bônus e custos.
- **Trilhas orgânicas internas:** são geradas entre entrada, sede e instalações prontas usando os mesmos corredores acessíveis. As trilhas aparecem tanto em Canvas 2D quanto no Three.js 3D; no 3D são instanciadas para reduzir chamadas de desenho.
- **Localizar funcionários:** o botão `Construir → Ver próximo trabalhador` percorre os três NPCs da sua cabanha e mostra função, estado e serviços executados.
- **Hotfixes de estabilidade:** remoção de três chamadas remanescentes a `save()` que podiam interromper a simulação, construção ou compra após a desativação dos salvamentos na 0.8.6.
- **Sem persistência:** continua sendo uma partida nova ao reabrir o jogo, conforme solicitado.

**Limites atuais:** a navegação é local a cada propriedade e as tarefas têm impactos simplificados na economia. Funcionários não operam máquinas reais nem atravessam a região para negociar; isso pertence a fases posteriores. Rotas e construções ainda devem ser conferidas visualmente em Android/WebGL.

### 0.8.8 — Paisagem rural, atividades visíveis e cavalos vivos
- **Trilhas de terra remodeladas:** faixa externa de solo compactado, superfície de areia e duas marcas longitudinais de passagem. Utilizam apenas três malhas instanciadas no WebGL; no Canvas 2D recebem a mesma leitura em camadas.
- **Paisagismo nas glebas:** até cerca de 145 pontos candidatos de capim, touceiras e pequenas flores por propriedade. A geração determinística respeita construções, caminhos e açudes, atualizando quando surgem novas obras ou caminhos.
- **Arquitetura variada:** cinco variações de paleta para fachadas e coberturas das cocheiras e galpões; cumeeiras, rufos, ventilação e identificação visual de propriedade nas fachadas.
- **NPCs com instrumentos:** tratadores levam balde de ração/água, agricultores usam enxada e administradores carregam prancheta. Os equipamentos movimentam-se durante o trabalho; o modo 2D indica tarefas em execução no zoom próximo.
- **Cavalos em movimento:** pequenas caminhadas individuais dentro dos espaços reservados, com orientação da cabeça, oscilação de pernas e cauda em 3D. As amplitudes são limitadas para preservar distância entre os animais e das cercas.
- **Convivência de funcionários:** trabalhadores cedem passagem em encontros próximos para não ocuparem o mesmo ponto da propriedade.
- **Compatibilidade:** o botão de reset e o início de partida no dia 1 permanecem; salvamento automático continua desligado conforme solicitação anterior.

**QA automatizado:** a simulação de teste alcançou o dia 1.731 com 64 construções, 15 NPCs e 90 cavalos distribuídos pelas cinco fazendas. Nos intervalos amostrados, nenhum NPC atravessou o interior de prédios, não houve funcionários fora de suas propriedades, e a distância mínima medida entre cavalos foi de cerca de 6,46 unidades. Os testes de inicialização simulada do módulo 3D também passaram (modelos, trilhas, vegetação e mudanças de câmera). **Esses testes não substituem conferência visual WebGL no Android real.**

## Controles

- **Arrastar:** deslocar câmera.
- **Pinça:** aproximar e afastar, com retorno seguro após levantar um dedo.
- **+ / −:** zoom alternativo pelo botão em mobile.
- **Fazenda:** voltar à cabanha do jogador.
- **Mapa:** visão de toda a região.
- **Visitar outra fazenda:** navegar entre as propriedades pelo painel.
- **Construir:** selecionar uma estrutura e tocar em terreno válido.
- **Comprar cavalo:** precisa de recursos e capacidade nas cocheiras.
- **Modo 2D:** trocar do WebGL para Canvas de compatibilidade.
- **Construir → Ver próximo trabalhador:** aproxima a câmera dos funcionários da sua propriedade.
- **Construir → Reiniciar do dia 1:** descarta a partida atual e recarrega um novo jogo (com confirmação).

## Estrutura

- `index.html`: economia, expansão de IAs, compras, posicionamento, câmera, HUD, Canvas 2D e salvamento.
- `world3d.js`: Three.js, construções e cavalos 3D, paisagem, iluminação, câmera oblíqua e seleção do terreno.

## Validação

Executados testes automatizados com simulação de centenas de dias, conferindo limite das propriedades, separação de construções e salvamento. Também foi realizado teste simulado da inicialização do renderizador, alternância de modos e conversão de toque para coordenadas do terreno.

**Atenção:** não houve nova validação visual dessa versão em um aparelho Android real. É necessário conferir o resultado pelo GitHub Pages e enviar capturas para continuar o QA. O Three.js usa CDN externo na primeira abertura; se falhar, o modo 2D permanece disponível.

## Próximas entregas

0.8.9 — inspeção visual Android, polimento da interação, desempenho e integração dos sistemas;
0.9 — HUD, usabilidade, progressão, economia e testes longos;
1.0 — integração e critérios de estabilidade.
