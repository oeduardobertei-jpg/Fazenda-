# Fazenda Viva — versão 0.9.9.2 (para testes)

Simulador brasileiro de cabanhas, propriedades rurais, economia e criação de cavalos, jogável no navegador do celular.

**Testar a 0.9.9.2:** https://oeduardobertei-jpg.github.io/Fazenda-/?v=0992

A versão mantém partidas novas a cada abertura, sem salvamento automático. Para conferir a atualização, o HUD deve mostrar **0.9.9.2**. Os critérios de Android físico da 1.0 continuam pendentes.

## 0.9.9.2 — proporções dos cavalos após avaliação no celular

As capturas da 0.9.9.1 mostraram cavalos com pescoço excessivamente alto/estreito, corpo tubular e pouca definição dos membros. Esta etapa revê esses volumes antes de ampliar as animações; os fazendeiros da 0.9.9.1 são preservados.

- Pescoço mais curto, base larga ligada ao peito e crista arqueada; cabeça com mandíbula, chanfro e focinho mais definidos.
- Garupa mais larga, dorso menos tubular e cernelha sobre o ombro; membros anteriores e posteriores diferenciados.
- Crina mais fina sobre a crista, topete, cauda afilada, narinas e boca discretas.
- Articulações anatômicas compartilhadas entre Canvas e Three.js; pastoreio ajustado à nova cabeça, mantendo focinho e cascos acima do solo.
- Mantidos manejo, circulação, comércio, economia e o visual dos trabalhadores.

**Verificação em andamento:** testes Node passaram; a revisão WebGL e a inspeção das capturas serão registradas em `RELEASE_0.9.9.2.md`. A aprovação visual do usuário permanece necessária.

## 0.9.9.1 — revisão dos personagens

- Cavalos com volumes mais contínuos e iluminação suave, peito/garupa/pescoço redesenhados, pernas afiladas, orelhas pontudas e focinho arredondado. Crina, cauda e marcas de pelagem preservadas.
- NPCs com silhueta humana ereta nos dois modos: ombros, cintura, rosto, chapéu, mangas, antebraços e botas. Paletas de pele e cabelo determinísticas por personagem.
- Cotovelos articulados e postura de trabalho; balde, enxada e prancheta acompanham a mão.
- Anatomia e poses compartilhadas entre Canvas e Three.js. Geometrias reutilizadas e peças estáticas fundidas por material.
- Pastoreio, manejo, economia, transferências e partidas novas continuam como na 0.9.9.

**Verificação:** `npm test` e Chromium/WebGL2 por software passaram em cinco viewports. Capturas comparativas e cenas 2D/3D foram inspecionadas. Chamadas iniciais: 192→165 (−14,1%), com +4,0% de triângulos; esses números não medem FPS no Android.

A sequência **0.9.9.1, 0.9.9.2…** será feita em etapas pequenas e testáveis. O visual continua estilizado e procedural; a 1.0 depende dos critérios do roadmap, incluindo revisão no celular. Ver `RELEASE_0.9.9.1.md`.

## 0.9.9 — cavalos em campo e Centro Rural

- Guia usa **propriedade** no lugar de “gleba”.
- Anatomia equina compartilhada pelo Canvas e Three.js: dorso/peito/garupa, pescoço curvo, mandíbula e focinho afilados, orelhas, crina, cauda e cascos.
- Pastoreio automático dentro de cada fazenda: saída pela porteira, exploração de duas áreas de campo, pausas de pasto/descanso e retorno para manejo. O jogador pode acompanhar a rotina em **Gestão → Cavalos → Acompanhar pastoreio**.
- Navegação considera edificações, açudes, cercados, paisagismo e outros animais. A porteira admite uma passagem por vez; encontros no campo têm espera/desvio. Novas obras preservam pontos de manejo e corredores; o paisagismo mantém os acessos livres. Transferências continuam preservando a identidade dos animais.
- O tratador prioriza quem precisa de cuidado, chama o paciente pela área de manejo e aguarda seu retorno antes de concluir o serviço ou consumir ração. Cavalos com cuidado baixo aguardam atendimento no piquete antes de sair. A construção de outra instalação não recoloca todo o plantel nos pontos iniciais.
- O **Centro Rural é um único espaço regional permanente**. Seu subtítulo muda conforme o evento: mostra equina, contrato agrícola, suprimentos ou mutirão. As quatro bancas ganham produtos e comerciantes, e tocar no terreno do Centro abre **Gestão → Mercado**, inclusive entre eventos.
- Sem novo salvamento automático, necessidades de NPCs, clima ou ciclo dia/noite.

A série 0.9.9 foi ampliada a pedido do usuário após inspeção das capturas da 0.9.8. O congelamento para a 1.0 ocorre após as etapas incrementais de revisão visual e de comportamento; a numeração não declara concluídos os critérios mobile.

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

### 0.8.9 — Performance real, câmera Android e QA automático
- **3D incremental:** o Three.js agora mantém uma malha por estrutura visível e reconstrói somente as construções que realmente mudaram, foram concluídas ou entraram/saíram da câmera. O sistema anterior recriava todas as estruturas próximas após cada alteração.
- **Memória WebGL:** geometrias transitórias de colunas/cilindros são liberadas ao substituir modelos, e os buffers das trilhas e da vegetação são descartados quando essas camadas são geradas novamente. Geometrias e materiais compartilhados permanecem em cache para evitar alocação excessiva.
- **Zoom com âncora no terreno:** a pinça do modo 3D consulta a projeção real sobre o chão antes de alterar o zoom; o modo 2D conserva o cálculo ortográfico. Isso reduz deslocamentos repentinos ao aproximar com dois dedos.
- **Trabalhadores identificáveis no 3D:** ao aproximar, aparecem no máximo dois indicadores próximos com função e estado (trabalhando, caminhando ou aguardando). As etiquetas ficam escondidas na vista regional e evitam o HUD.
- **Modo econômico opcional:** no painel `Construir → Gráficos`, é possível trocar entre **normal** e **econômico**. O modo econômico reduz a resolução interna do WebGL, simplifica a geometria das construções, oculta flores/touceiras decorativas e ajusta o ritmo do renderizador sem alterar a velocidade da simulação nem retirar os trabalhadores.
- **Preparação para a 0.9:** criado `tests/smoke.mjs` para verificar integridade do JS, versão/cache, inicialização sem salvamentos, dia 1, 15 trabalhadores, circulação sem atravessar prédios, distanciamento entre cavalos, obras sequenciais, zoom, qualidade gráfica e reset. O workflow `.github/workflows/qa.yml` executa automaticamente o teste em pushes e pull requests para `main`.
- **Compatibilidade:** a partida continua começando no dia 1 em cada carregamento, conforme solicitado. O botão de reset e a alternativa em Canvas 2D foram preservados.

**Validação 0.8.9:** a simulação automatizada executada na sessão alcançou o **dia 1.866**, com 64 estruturas, 15 NPCs, 1.639 serviços concluídos e 113 segmentos de caminhos. Não foram detectados NPCs atravessando edifícios nos pontos amostrados. A inicialização 3D também passou por simulação, incluindo alternância normal/econômico, construção alterada, atualização de trilhas e visão regional. **Ainda falta conferir visualmente o WebGL no Android real.**

### 0.9.0 — Gestão econômica e progressão da cabanha
- **Painel de gestão mobile:** em `☰ Menu → 📊 Gestão da cabanha`, seis abas: Resumo, Finanças, Cavalos, Equipe, Mercado e Metas. O painel é independente das construções e não ocupa a tela quando fechado.
- **Resumo patrimonial:** saldo, patrimônio estimado, lucro líquido, capacidade e tamanho do plantel, reputação rural, nível da cabanha, obras ativas e classificação regional das cinco propriedades.
- **Finanças:** demonstração econômica simplificada por ciclo de cinco dias, separando receitas, despesas, folha salarial e bônus produtivo da equipe; patrimônio estimado dividido em saldo, instalações e cavalos.
- **Histórico financeiro:** gráfico de evolução do saldo com até 72 snapshots registrados durante os ciclos econômicos (exibição dos últimos 36 pontos). Sem gravação no navegador: começa do zero ao abrir nova partida.
- **Gestão do plantel:** lista de cavalos com nome, raça, idade, pelagem e qualidade; botão para localizar um cavalo no mapa e opção de comprar outro, respeitando saldo e capacidade.
- **Equipe rural:** tarefas, serviços concluídos, salários e produtividade, com botão para seguir individualmente cada trabalhador.
- **Mercado e competição:** índices equestre e agrícola, desempenho e estrutura de cada fazenda vizinha, ranking calculado por patrimônio, instalações, número de cavalos e resultado operacional.
- **Progressão real:** sete metas com recompensas em dinheiro e reputação, concedidas uma única vez por partida; níveis de reconhecimento de criador iniciante a referência nacional. A conquista depende de construções, produtividade, expansão do plantel e patrimônio.
- **HUD simplificado:** mostra construções próprias/regionais e reputação; o botão principal agora se chama `☰ Menu`, facilitando encontrar a gestão.
- **Testes automáticos:** o smoke de regressão cobre abertura e fechamento das seis abas, localização de cavalos e trabalhadores, integridade do saldo, progressão, motor da simulação, colisões, zoom, modo econômico e reset.
- **Reinício:** continua começando no dia 1 e não armazena progresso automaticamente, conforme solicitado.

**Nota sobre valores financeiros:** são preços, índices e patrimônio *simulados para gameplay*, não cotações oficiais, demonstrações contábeis reais ou avaliações de mercado verificadas. O gráfico de saldo e as metas não utilizam servidores externos nem persistência local.

### 0.9.1 — Reconstrução da circulação e das animações 2D/3D
**Motivo:** as capturas da 0.9.0 mostraram caminhos cruzando o mapa de forma absurda no 3D e animais/trabalhadores que pareciam deslizar. A causa principal identificada para os caminhos era um erro de sinal no ângulo de rotação de segmentos diagonais, agravado pelo desenho radial ligando cada estrutura diretamente à sede.

- **Correção geométrica direta:** os segmentos 3D usavam `-atan2(dx,dz)`, espelhando trajetos diagonais. Passam a usar **`+atan2(dx,dz)`**, consistente com o eixo +Z do Three.js. Corrigida também a orientação dos trechos de estrada tradicionais.
- **Rede interna conectada:** deixou de existir um feixe de trilhas diretas partindo da casa. O sistema constrói primeiro o acesso da estrada regional ao portão e à sede e conecta novas instalações ao ponto mais próximo da malha já existente, com desvio de obstáculos via A*.
- **Dois renderizadores, um layout:** o Canvas 2D e o Three.js recebem exatamente o mesmo array de caminhos, sem decisões independentes sobre conexões. O desenho 3D ganhou extremidades arredondadas; trilhas de serviço não são mais cobertas de falsas marcas de rodas.
- **Animais com estados:** `idle / walk / graze`, caminhada discreta dentro da posição reservada, atualização do rumo suavizada e frequência da passada conforme a distância real percorrida. Cavalos podem baixar o pescoço para pastar no modo 3D.
- **Fazendeiros com estados:** `idle / walk / work`, fase de passo por distância e rotação suave. Braços e pernas usam pivôs nas articulações no 3D, em vez de girar caixas inteiras pelo centro; suas ações também são retratadas no 2D.
- **Direção compartilhada:** a pose lógica `motion / gait / heading` da simulação alimenta ambos os modos. Trocar de 2D para 3D não recria estados de animação inconsistentes.
- **Legibilidade mobile:** rótulos de trabalhadores próximos possuem verificação de colisão com outros rótulos e não aparecem sobre o HUD.
- **QA:** `tests/smoke.mjs` agora verifica caminhos que atravessam edifícios, estruturas sem acesso, distância entre cavalos, os três estados de animais e estados de trabalhadores. Criado `tests/render3d.mjs` para simular o ciclo Three.js e testar a orientação da trilha diagonal, câmeras e mudança de qualidade. Ambos configurados no GitHub Actions.

**Limites:** os personagens continuam sendo modelos low-poly simples. A nova animação é procedural e mais coerente, mas não equivale a animações complexas de esqueleto feitas em Blender/GLB. Falta a conferência visual das posições e dos caminhos no **Android/WebGL real**.

### 0.9.2 — NPCs percorrem caminhos reais; detalhes equestres e entradas
A atualização 0.9.1 já tinha alinhado as trilhas 2D e 3D, mas os trabalhadores ainda utilizavam rotas A* independentes do desenho das estradas. Agora a circulação tem correspondência física:

- **Grafo navegável derivado da geometria visual:** a rede compartilhada de trilhas é dividida em segmentos e nós reais. Bifurcações que terminam no meio de um trecho são identificadas e conectadas.
- **Rotas com busca de menor custo:** trabalhadores selecionam pontos de acesso seguros da rede e caminham por ela usando Dijkstra. Trechos de ligação entre o trabalhador e a rede passam por verificação de obstáculos; A* é mantido como contingência se não houver acesso viável.
- **Trânsito sem atravessar construções:** segmentos livres, distâncias entre NPCs, cercas de propriedade e edifícios são considerados durante a caminhada. Rotas são recalculadas quando há uma alteração estrutural.
- **Economia de processamento:** o grafo de cada propriedade é armazenado em cache por versão da malha e só é reconstruído após modificações físicas.
- **Gestão rural:** a aba Equipe indica para cada funcionário se ele está seguindo a rede de trilhas ou usando um desvio seguro pelo terreno.
- **Cavalos mais legíveis:** novos volumes de peito e garupa, focinho, olhos, crina, orelhas e variações discretas de pelagem. A silhueta 2D também foi aprimorada para acompanhar o modelo tridimensional.
- **Portões de fazenda:** pares de mourões físicos marcam cada entrada e foram alinhados às conexões viárias sem bloquear passagem.
- **Regressões:** os testes automáticos verificam agora o uso predominante das trilhas pelos funcionários e a ausência de edifícios cortados pelas rotas. Um teste prolongado simulado alcançou o **dia 2.131**, com **63 instalações**, **1.383 tarefas realizadas**, **111 segmentos internos** e **zero colisões de trilhas com prédios** detectadas nas amostras.

**Limite e próximo passo:** a animação continua procedural e low-poly. Falta conferir o resultado diretamente em um Android com WebGL real. Os testes não provam ausência total de artefatos de renderização; cobrem geometria lógica e renderizador Three.js simulado.

### 0.9.3 — Eventos regionais, negociação e genética inicial
- **Calendário econômico dinâmico:** feiras de criadores, contratos agrícolas, central de suprimentos e mutirões de infraestrutura ocorrem sem eventos climáticos, ciclo dia/noite ou estações. Cada evento tem duração de 135 dias de jogo, impacto temporário e rotação previsível entre os quatro tipos.
- **Participação opcional no Mercado:** o jogador pode pagar para participar uma única vez por evento, desde que atenda às condições. As decisões influenciam caixa, reputação, custos futuros ou progresso de uma construção. Eventos não são apostas: retornos são determinísticos com base nas instalações e na qualidade do plantel.
- **Índices de mercado conectados à contabilidade:** os indicadores de grãos e cavalos e a diferença temporária de custos afetam a economia das cinco propriedades. A aba Finanças discrimina variações de custos e descontos por compras coletivas.
- **Negociação de cavalos:** cada animal possui valor de venda baseado na qualidade, idade e índice equestre. Vendas retiram o animal do mundo, liberam vagas e creditam o caixa; não é possível vender uma égua com gestação ativa.
- **Criação equina inicial:** machos/fêmeas identificados, reprodução de adultos de linhagens compatíveis, custo fixo de R$ 850, reserva de vaga, gestação simplificada de 330 dias de jogo e nascimento de potro com genealogia, raça, pelagem e qualidade parcialmente herdadas. A mãe tem descanso reprodutivo mínimo de um ano de jogo.
- **Potros reconhecíveis em 2D/3D:** modelos menores até atingirem dois anos de jogo, produção econômica proporcional à idade e patrimônio alinhado ao valor de negociação.
- **Mobile e ritmo:** o tempo do mundo congela automaticamente enquanto o painel de gestão estiver aberto; as decisões permanecem disponíveis para leitura e escolha sem perder a janela do evento. Ao fechar, a velocidade escolhida é retomada.
- **Sem gravação automática:** o botão de reiniciar e o início do dia 1 permanecem, por preferência de design. Os dados são simulações de gameplay.
- **QA:** teste automatizado verifica participação sem duplicação de recompensas, gravidez sem cobrança repetida, nascimento após 330 dias, herança e idade inicial, bloqueio de venda de égua gestante, venda de potro e funcionamento continuado da economia. Smoke e renderizador simulado 3D passaram.

**Nota:** esta atualização introduz genética simples, mas ainda não implementa seleção genética profunda, competições equinas completas, contratos diretos entre proprietários ou animação esquelética profissional. São etapas em aberto para as próximas versões. Ainda é necessária inspeção visual real no Android.

### 0.9.4 — Circuito de criadores, identidades rurais e praça de exposições

**Objetivo:** conectar economia, cavalos, instalações e território de forma visível no navegador mobile, aproximando o jogo da leitura orgânica desejada para a versão 1.0.

#### Economia e criação
- **Genética interpretável:** os cavalos possuem velocidade, resistência e temperamento em escala 25–99; a qualidade pondera essas aptidões (35% / 40% / 25%). Raças apresentam tendências discretas; o potro herda cada atributo separadamente, com variação limitada.
- **Comércio entre as cinco cabanhas:** fazendas autônomas oferecem animais reais do seu plantel quando possuem excedente; o jogador pode comprar um animal listado em `Gestão → Mercado`. Dinheiro, posse, espaço na cocheira e posição do animal são transferidos dentro da simulação, sem duplicação de cavalo.
- **Negócios rastreáveis:** compras entre propriedades e vendas para o mercado externo aparecem no histórico de transferências. Proprietários autônomos podem negociar entre si periodicamente quando um possui excedente e outro dispõe de vagas e dinheiro.
- **Preços consistentes:** valor base do animal considera sua qualidade, idade e índice equestre; o vendedor pode solicitar um prêmio. Só se permite uma oferta por cabanha, com retenção mínima de um animal e carência temporária para revendas.
- **Gestão do plantel:** cada animal exibe suas três aptidões genéticas, a idade, a linhagem e o valor de negociação.

#### Identidade do mundo 2D e 3D
- **Centro Rural permanente:** uma praça de exposições situada na região em `(-65, 212)`, fora dos cinco lotes e ligada à estrada pública. A clareira é protegida da geração de árvores. Botão `Visitar Centro Rural` facilita a navegação pelo celular.
- **Eventos físicos no mapa:** o mesmo calendário econômico agora modifica quatro tendas da praça e seus materiais. Feira de criadores, contratos agrícolas, suprimentos e mutirões possuem cores e objetos distintos; a sinalização identifica o evento em curso.
- **Fazendas mais reconhecíveis:** sedes com chaminés, floreiras, detalhes no alpendre e insígnias; cocheiras com ventilação na cumeeira, fardos e detalhes de manejo; galpões com silo dentro do lote e materiais agrícolas.
- **Agricultura volumétrica:** lavouras recebem cultivos instanciados em 3D, sem centenas de chamadas de desenho independentes, com detalhe correspondente no Canvas 2D quando o zoom se aproxima.
- **Açudes melhorados:** plantas aquáticas acima da superfície reduzem a sensação de polígonos planos. Uma lavoura que sobrepunha o açude oriental foi reposicionada, eliminando aquela colisão de footprints.
- **Gráficos econômicos:** a cena respeita a opção de baixa qualidade ao diminuir tendas e detalhes, sem eliminar o Centro Rural nem os controles.

#### Testes
- Smoke de simulação valida todas as estruturas já existentes, as rotas dos NPCs, a reprodução, genética, transação real entre dois proprietários, crédito/débito de caixa, estoque de animais e proteção contra compra duplicada.
- Teste 3D simulado valida a orientação das estradas, o aparecimento das tendas de evento, a regeneração quando o evento muda, o cache de objetos sem alteração e as lavouras instanciadas.
- **Simulação prolongada aprovada:** dia **3.146**, **63 instalações**, **1.940 serviços de trabalhadores** e **zero travessias de trilhas por dentro dos edifícios detectadas nas amostras**.

**Ainda pendente antes da 1.0:** validar a aparência e o desempenho em WebGL no Android real, ampliar a coerência visual das outras estruturas, aprimorar as animações dos cavalos/NPCs, equilibrar o comércio autônomo de longo prazo e consolidar uma experiência estável e intuitiva. Os testes simulados não substituem revisão visual mobile.

### 0.9.5 — Cinco paisagens autorais e trabalho rural visível

**Meta desta etapa:** melhorar a identidade visual das propriedades em vez de simplesmente ampliar a quantidade de botões e números. A versão 0.9.5 implementa uma camada de cenário compartilhada por Canvas 2D e Three.js.

- **Cinco identidades rurais:** Campos do Sul (sede do jogador), Campos Abertos, Terra Vermelha, Vale Produtivo e Rincão Verde. Cada propriedade possui cores de terreno, paredes, telhado, acabamento e vegetação coerentes com sua proposta; modelos 2D e 3D usam o mesmo perfil.
- **180 elementos naturais/funcionais distribuídos com regras espaciais:** 36 pontos por fazenda contendo bosquetes, arbustos, flores, pedras e fardos. A geração é determinística: os detalhes não mudam quando a câmera gira ou aproxima.
- **Paisagismo que respeita o jogo:** a distribuição verifica a área real do lote, footprints construídos, distância das vias internas, açudes e afastamento entre objetos. Ao construir novas instalações, o cenário ao redor é regenerado em locais válidos, sem avançar sobre paredes.
- **Mesma geografia nas duas câmeras:** o array `ranchDecor` fornece posições idênticas para o Canvas e para o Three.js. O modelo 3D renderiza grupos de objetos com `InstancedMesh`; o Canvas omite detalhes pequenos demais na visualização regional.
- **Animais compatíveis com o cenário:** a escolha de pastagens e piquetes evita árvores, fardos e outros adereços. Corrigido o cache de posições: quando um cavalo é comprado de outra cabanha ele passa a ocupar fisicamente uma vaga da propriedade compradora.
- **Sombras leves de contato:** cavalos e trabalhadores ganharam sombras estilizadas que dispensam shadow maps custosos. No 2D, o mesmo efeito aumenta a sensação de presença sobre o terreno.
- **Trabalho visível:** fazendeiros com chapéus distintos por função e microanimações de atividade enquanto executam serviço. No 3D, partículas procedurais localizadas surgem apenas durante o trabalho e desaparecem em descanso; no 2D há indicação equivalente.
- **Exploração direta:** a aba Mercado permite visitar qualquer uma das quatro cabanhas concorrentes com um toque, além do Centro Rural. As fichas dos produtores indicam o estilo regional de sua propriedade.
- **Performance:** vegetação e pedras instanciadas, cache por geometria/layout, modo econômico e limite de detalhes por zoom; os detalhes não são reconstruídos por frame. Também foi corrigido um caso que criava uma lista vazia nova quando a camada de decoração não existia.

**Testes em código:** geometria/afastamento de props (cinco fazendas), integridade dos caminhos, migração espacial dos cavalos negociados, comandos de visita, zoom, tarefas, qualidade gráfica e cena 3D simulada. Verificação real do WebGL em Android ainda pendente.

**Limite atual:** a animação de cavalos e trabalhadores é procedural e estilizada, não tem rig profissional importado de Blender. É necessário conferir visualmente a 0.9.5 no celular antes de avançar com ajustes finos da 0.9.6.

### 0.9.6 — Câmera Android, estabilidade WebGL e performance mensurável

Esta etapa é uma revisão de robustez e performance, para reduzir o risco de uma 1.0 visualmente bonita mas instável em aparelhos móveis.

- **Pinça 3D exata:** a conversão entre pixel e coordenada do chão é calculada a partir da orientação da câmera ortográfica e do zoom atual, sem depender do raycast de um quadro já ultrapassado. O ponto abaixo da pinça se mantém ancorado inclusive na transição entre vista local oblíqua e mapa regional.
- **Arrasto sincronizado:** durante o gesto de toque, a câmera usa imediatamente a posição de controle; a suavização é retomada quando o gesto termina. O mouse no desktop e o gesto de pinça no Android compartilham a mesma regra de coordenadas; o Canvas 2D mantém a sua projeção própria.
- **Segurança de pointer events:** ao perder ou cancelar um dedo da pinça, a distância anterior é descartada, evitando saltos de zoom.
- **DPR adaptativo:** o motor 3D mede os intervalos entre quadros visíveis e, quando o dispositivo demora para renderizar, reduz a resolução interna em passos discretos, respeitando piso de qualidade. Após estabilidade sustentada, recupera a resolução gradualmente. A velocidade de dias simulados **não é alterada**.
- **Diagnóstico opcional:** em `☰ Menu → 📉 Diagnóstico de FPS`, mostra FPS aproximado, densidade de pixels do renderizador e quantidade de chamadas/triângulos 3D. Não envia telemetria para servidores; o indicador é apenas local e pode ser ocultado.
- **Menos trabalho gráfico:** o detalhe arquitetônico de alto custo agora depende da distância de **cada construção** até a câmera, e não da aproximação global; objetos mais distantes continuam presentes em versão simplificada.
- **Ciclo WebGL único:** interromper/reiniciar o modo 3D invalida callbacks antigos de `requestAnimationFrame`, impedindo múltiplos renderizadores simultâneos. Perda de contexto WebGL aciona fallback 2D e há tentativa de retorno ao 3D quando o contexto é restaurado.
- **Memória:** modelos de cavalos/trabalhadores removidos quando o plantel muda têm geometrias transitórias liberadas, sem descartar geometrias reutilizadas.
- **Correção de árvores invasoras:** encontrado erro real de concatenação de comentário na geração da floresta antiga: uma verificação de exclusão de árvores das cinco propriedades havia sido comentada acidentalmente. A proteção foi restaurada, e o smoke agora verifica que nenhuma árvore antiga invade as cinco glebas ou o Centro Rural.
- **QA reforçado:** a simulação automatizada verifica projeção ancorada fora do centro, transição de inclinação, pinça com dois dedos, cancelamento de ponteiro, painel FPS e afastamento da mata antiga; o teste 3D simulado verifica DPR adaptativo, interrupção de render loop duplicado e recuperação após perda do contexto.

**O que não foi verificado:** não foi executado WebGL real em Android nesta sessão; não existe, ainda, medição oficial do FPS do aparelho do usuário. O FPS exposto pelo jogo serve para orientar o ajuste visual. O modo 2D continua disponível.

### 0.9.7 — Manejo animal visível, bem-estar e trabalho sem travas

**Objetivo:** transformar o cuidado da cabanha em uma mecânica observável no próprio mapa, onde animais e trabalhadores compartilham exatamente o mesmo estado no Canvas 2D e no Three.js.

- **Cada cavalo tem bem-estar próprio** (15 a 100), número de serviços de cuidado e registro do último manejo. O bem-estar muda com o calendário e com os atendimentos físicos do tratador. As instalações proporcionam amortecimento limitado, mas não substituem o trabalho.
- **Tratadores cuidam de cavalos reais:** ao escolher uma cocheira/piquete, o NPC prioriza o animal com maior necessidade e procura atender pela lateral da instalação mais próxima do cavalo, sem atravessar paredes ou cercas. As tarefas se alternam entre alimentação e escovação.
- **Os cavalos respondem visualmente ao atendimento.** Durante o serviço, o animal permanece parado e volta a cabeça na direção do tratador. No 2D surge um indicador temporário; no 3D há uma marca de cuidado acima do cavalo, animação de pescoço e cauda, com indicação especial de ração de qualidade.
- **Manejo tem custo e consequência:** o bem-estar influencia a contribuição econômica dos animais e o valor estimado de negociação. A gestão exibe o cuidado médio, o valor por animal, o histórico recente de serviços e novas metas ligadas ao manejo de verdade.
- **Ração reforçada (opcional):** na aba `Gestão → Cavalos`, comprar quatro porções por R$ 200. Elas só são consumidas quando o tratador realmente conclui um atendimento animal, adicionando 10 pontos extras de cuidado. Uma porção não é consumida apenas porque o usuário comprou ou abriu o painel.
- **Câmera de acompanhamento:** `Gestão → Cavalos → 👁️ Acompanhar manejo no mapa` aproxima a visão do animal em atendimento (ou do funcionário responsável, se ele ainda não escolheu paciente).
- **Correção de congestionamento de NPCs:** encontrou-se um defeito de longa duração em que esperar outro trabalhador zerava uma rota repetidamente, criando bloqueios persistentes. Agora a espera não cancela tarefas; os personagens tentam desvios laterais coerentes e replanejam rotas se necessário.
- **Correção de identidade animal 3D:** após vender e comprar outro cavalo mantendo igual quantidade, o modelo deve ser reconstruído quando a identidade mudou; caso contrário seria possível conservar a pelagem do animal antigo.
- **Simulação/QA:** testes verificam atendimento individual de cavalos, inventário de ração e consumo em serviço real, ausência de cruzamentos com estruturas e cercas, câmera de manejo, indicadores de trato e ração em Three.js, encerramento dos efeitos e substituição de cavalo sem alterar quantidade.

**Limites:** as animações ainda são procedurais e estilizadas, não foram validadas visualmente num Android/WebGL real. O indicador representa bem-estar de **gameplay**, não aconselhamento veterinário ou uma simulação clínica detalhada. A 1.0 continua condicionada a inspeção de imagens e medição real de desempenho mobile.

### 0.9.8 — Integração visual, interface e poses compartilhadas

- **Interface responsiva:** HUD compacto, acesso direto à Gestão, construção separada, controles de tempo/visualização agrupados e áreas seguras do celular. Painéis se adaptam a retrato e paisagem. Botões principais têm área mínima de 44 px.
- **Guia inicial opcional em português:** explica exploração, manejo e primeira construção, incluindo a regra de partidas sem salvamento. Pode ser dispensado ou reaberto nas opções. O calendário fica pausado durante o guia.
- **Acompanhamento real:** localizar animais/funcionários ou acompanhar manejo mantém a câmera sobre o personagem em movimento. Arrastar ou tocar em Encerrar libera a câmera. O modo de construção também mostra uma faixa persistente com Cancelar.
- **Uma fonte de poses (`motion.js`):** transições progressivas entre repouso, caminhada, pasto e trabalho; quatro apoios no passo do cavalo; pernas com joelhos e alvo de casco calculado por cinemática; ferramentas acompanham o braço. Canvas e Three.js usam a mesma pose e orientação lógica.
- **Silhueta animal:** tronco, peito e garupa facetados; pescoço e cabeça articulados para levar o focinho ao capim. Os modelos continuam procedurais e estilizados, sem rig profissional importado.
- **Profundidade no Canvas:** o chão do piquete é desenhado antes dos cavalos; a cerca frontal conserva a profundidade. Corrigido o encobrimento de animais na visão 2D. Mensagens liberam a faixa de acompanhamento e nomes regionais evitam os botões de zoom.
- **Contato com o chão:** corrigidas sombras de cavalos/funcionários que ficavam escondidas sob as camadas do terreno. Cascos e botas mantêm orientação de apoio ao longo da passada.
- **Estradas públicas compartilhadas:** Canvas passa a usar os mesmos acessos do Three.js, da estrada até a porteira. O traçado 2D anterior atravessava a sede e a cocheira.
- **Menos chamadas gráficas:** partes estáticas de estruturas, tendas e cenário são fundidas por material. Articulações e vegetação instanciada continuam separadas; geometrias transitórias são liberadas na substituição.
- **Acessibilidade:** foco visível, teclas de navegação entre abas, fechamento por Escape e contenção do foco na gestão. A gestão continua pausando o mundo.
- **QA corrigido e ampliado:** o smoke 0.9.7 imprimia PASS e depois falhava por um timer fora do ambiente simulado. O harness agora isola os timers; há testes de poses e matrizes/buffers com Three.js real, além do teste WebGL/Chromium e capturas em cinco viewports no CI.

**Validação local:** simulação e renderizador simulado passaram; poses/articulações e geometria Three.js real passaram. Na simulação amostrada: dia 1.231, 63 instalações, 15 trabalhadores, 882 serviços, zero interseções de trilhas com edifícios e distância mínima entre cavalos de 6,02 unidades. Em geometria real: 15 malhas para a sede detalhada; casco apoiado em y=0,420 e focinho em pasto em y≈0,539.

**Navegador real e inspeção visual:** Chromium/WebGL2 com SwiftShader aprovou cinco viewports, seis abas de gestão, pausa/guia, câmera, pinça por toque, cancelamento de gesto, normal/econômico, trocas 2D↔3D, pixels do cavalo no Canvas e recuperação real de contexto. Foram inspecionadas capturas da interface, visão local/regional e animais próximos. Comparação 390×844, DPR 1,2: 261→201 chamadas de desenho (−23%); 137.909→144.977 triângulos (+5%). Ver evidências e limites em `RELEASE_0.9.8.md`.

**Transparência:** geometria Three.js em Node, navegador com GPU por software e inspeção visual de capturas são verificações distintas. Nenhuma equivale a Android físico. Naturalidade em movimento, temperatura/consumo e FPS no aparelho continuam pendentes.

## Controles

- **Arrastar:** deslocar câmera.
- **Pinça:** aproximar e afastar, com retorno seguro após levantar um dedo.
- **+ / −:** zoom alternativo pelo botão em mobile.
- **Fazenda:** voltar à cabanha do jogador.
- **Mapa:** visão de toda a região.
- **Visitar outra fazenda:** navegar entre as propriedades pelo painel.
- **🔨 Construir:** abrir instalações, ampliação e opções de exploração/gráficos.
- **📊 Gestão:** acesso direto à cabanha; continua disponível também no painel de construção.
- **❔ Guia da cabanha:** reabrir a introdução nas opções de construção.
- **📉 Diagnóstico de FPS:** no menu, liga/desliga indicadores locais de desempenho e resolução; não afeta a simulação.
- **Construir:** selecionar uma estrutura e tocar em terreno válido.
- **Gestão da cabanha:** consultar balanço econômico simulado, cavalos, trabalhadores, mercado regional e objetivos; toque em `✕` para voltar ao mapa.
- **Comprar cavalo:** precisa de recursos e capacidade nas cocheiras.
- **Modo 2D:** trocar do WebGL para Canvas de compatibilidade.
- **Construir → Ver próximo trabalhador:** aproxima a câmera dos funcionários da sua propriedade.
- **Construir → Gráficos:** alterna normal/econômico no 3D, sem alterar a economia.
- **Construir → Reiniciar do dia 1:** descarta a partida atual e recarrega um novo jogo (com confirmação).

## Estrutura

- `index.html`: economia, mercado, rankings, metas, painel de gestão, expansão das IAs, interação, HUD, Canvas 2D, reinício e qualidade gráfica.
- `motion.js`: poses e transições compartilhadas por Canvas e Three.js, sem dependências.
- `world3d.js`: Three.js, modelos 3D com atualização incremental, paisagem, trabalhadores, câmera oblíqua e qualidade adaptável.
- `tests/smoke.mjs`: teste de regressão da simulação e integridade dos caminhos em Node 22.
- `tests/render3d.mjs`: validação simulada do Three.js, orientação das trilhas diagonais, modelos e câmera.
- `tests/motion.mjs`: fases, apoio e transições procedurais.
- `tests/geometry3d.mjs`: matrizes e buffers oficiais do Three.js em Node (sem WebGL).
- `tests/browser.mjs`: Chromium/WebGL real, cinco viewports, comparação de chamadas e capturas.
- `.github/workflows/qa.yml`: simulação, geometria e navegador em push para main e pull requests.
- `RELEASE_0.9.8.md`: avaliação anterior e critérios de integração.
- `RELEASE_0.9.9.md`: mudanças motivadas pelas capturas, limites e verificação do pastoreio.

## Validação

Execute `npm ci` e `npm test` (simulação, renderizador simulado, poses e geometria real). Para o navegador: `npx playwright install --with-deps chromium` e `npm run test:browser`. Os comandos independentes `node tests/smoke.mjs` e `node tests/render3d.mjs` continuam disponíveis para verificar a simulação, a rede viária, a orientação dos modelos, os controles e a integridade do código. Ambos foram configurados no GitHub Actions para detectar regressões a cada atualização. Também foram feitos testes simulados do renderizador 3D e da conversão dos toques para coordenadas do terreno.

**Atenção:** não houve nova validação visual dessa versão em um aparelho Android real. É necessário conferir o resultado pelo GitHub Pages e enviar capturas para continuar o QA. O Three.js usa CDN externo na primeira abertura; se falhar, o modo 2D permanece disponível.

## Próximas entregas

0.8.9 — concluída em código, pendente de inspeção visual Android;
0.9.0 — gestão e progressão funcional, implementadas e testadas na simulação; falta inspeção visual no Android;
0.9.1 — correção arquitetural das trilhas e locomoção procedural 2D/3D; pendente inspeção visual Android;
0.9.2 — locomoção dos NPCs sobre a rede real, visual equestre, portões e regressões automatizadas; falta QA visual no Android;
0.9.3 — agenda regional, mercado ativo, reprodução com pedigree básico e negociação equina; concluída no código, pendente QA Android;
0.9.4 — genética com três aptidões, compra regional real, Centro Rural e um novo beauty-pass 2D/3D; validada em simulação, QA Android pendente;
0.9.5 — identidades regionais, 180 props sem sobreposição, atividades visíveis e visita às fazendas; implementado em código, faltam QA visual Android e refinamento fino da câmera;
0.9.6 — câmera com projeção matemática estável, DPR adaptativo, telemetria mobile e correção do bosque que invadia as fazendas; inspeção visual Android ainda pendente;
0.9.7 — manejo animal real, histórico de cuidados, bem-estar econômico, metas e correção de bloqueios de trabalhadores; implementado e testado em simulação, pendente inspeção Android;
0.9.8 — candidata para testes públicos: integração/interface, poses e contato implementados; testes Chromium/WebGL e inspeção de capturas executados, Android físico pendente;
0.9.9 — revisão equina e pastoreio autônomo;
0.9.9.1 — remodelagem de cavalos e NPCs em 2D/3D;
0.9.9.2 em diante — animações, integração visual e critérios mobile, por etapas verificáveis;
1.0 — integração, balanceamento, acabamento e critérios de aceitação mobile/desktop.
