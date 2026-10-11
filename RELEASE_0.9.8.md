# Fazenda Viva — avaliação e entrega 0.9.8

Base: `8f28cad65071b063487ce18934d75817ad990e51` (0.9.7).
Estado: implementação pronta para verificação de navegador e revisão visual.

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
6. Chromium/WebGL2, capturas em cinco viewports e recuperação de contexto —
   configurados no CI; resultado ainda deve ser registrado após execução.
7. Inspeção visual das capturas e ajustes — pendente da geração das imagens.
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

A simulação amostrada alcançou dia 1.221, 64 instalações, 15 trabalhadores,
759 serviços e 103 segmentos internos. Nenhuma interseção de trilhas com prédios
foi detectada nas amostras; distância mínima entre cavalos: 6,06 unidades.
Esses resultados não são prova de ausência de todo defeito visual.

Com matrizes reais: sede detalhada fundida em 15 malhas; cascos apoiados
em y=0,420; focinho durante pasto em y≈0,539, acima do piquete.

O Chromium local não conseguiu iniciar neste ambiente: criação de socket
do processo recusada. A inspeção da página pública confirmou o fallback 2D;
o navegador de inspeção também não conseguiu criar um contexto WebGL. Por isso,
as capturas e medidas WebGL da nova versão são executadas em GitHub Actions,
onde o resultado deve ser conferido antes de declará-las aprovadas.

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

1. Revisar capturas em ângulos locais/regionais e registrar decisões de arte.
2. Validar distâncias do manejo, silhueta de potros, retornos de pasto e
   encontros dos funcionários; ajustar comportamento quando o visual exigir.
3. Fortalecer arquitetura/disposição própria de cada cabanha, além das cores,
   mantendo footprints, caminhos e orçamento de desenho.
4. Testar Android físico em retrato/paisagem: 15 minutos em normal/econômico,
   múltiplas pinças/trocas 2D↔3D, métricas de FPS e quedas, consumo/temperatura.
5. Na 0.9.9, congelar recursos, corrigir bloqueadores e calibrar economia longa.
6. Declarar 1.0 somente depois de cumprir ou revisar explicitamente os portões
   do ROADMAP_1.0.md. Esta entrega não marca os critérios Android como concluídos.
