# Fazenda Viva — versão 0.8.4

Simulador brasileiro de cabanhas, propriedades rurais, economia e criação de cavalos, jogável no navegador do celular.

**Jogar:** https://oeduardobertei-jpg.github.io/Fazenda-/?v=084

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

## Estrutura

- `index.html`: economia, expansão de IAs, compras, posicionamento, câmera, HUD, Canvas 2D e salvamento.
- `world3d.js`: Three.js, construções e cavalos 3D, paisagem, iluminação, câmera oblíqua e seleção do terreno.

## Validação

Executados testes automatizados com simulação de centenas de dias, conferindo limite das propriedades, separação de construções e salvamento. Também foi realizado teste simulado da inicialização do renderizador, alternância de modos e conversão de toque para coordenadas do terreno.

**Atenção:** não houve nova validação visual dessa versão em um aparelho Android real. É necessário conferir o resultado pelo GitHub Pages e enviar capturas para continuar o QA. O Three.js usa CDN externo na primeira abertura; se falhar, o modo 2D permanece disponível.

## Próximas entregas

0.8.5 — QA da câmera, naturalização de caminhos, melhor integração das construções;
0.9 — HUD, usabilidade, progressão, economia e testes longos;
1.0 — integração e critérios de estabilidade.
