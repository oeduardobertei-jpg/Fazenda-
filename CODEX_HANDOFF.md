# Fazenda Viva — retomada no Codex

## Projeto

Repositório: https://github.com/oeduardobertei-jpg/Fazenda-
Jogo: https://oeduardobertei-jpg.github.io/Fazenda-/?v=09914
Versão: 0.9.9.14. Ver evidências em RELEASE_0.9.9.14.md.

Simulador brasileiro de cabanhas e criação de cavalos, Canvas 2D e Three.js 3D, cinco propriedades, trabalhadores autônomos, manejo presencial, economia e expansão. index.html contém a simulação e o Canvas; world3d.js é o renderizador. motion.js, terrain.js, routine.js e audio.js compartilham estados e comportamento visual. Aplicação estática: não requer servidor de banco de dados.

## Direção e decisões

- A 1.0 depende de ROADMAP_1.0.md, aprovação artística e testes em Android físico; não basta incrementar versão.
- Partida nova no dia 1 a cada abertura. Não adicionar salvamento automático, clima, dia/noite ou necessidades pessoais de NPCs sem nova decisão.
- Identidade rural brasileira, fazendas extensas e separadas; cavalos e manejo são o centro. Farm Manager inspira setores legíveis, cores, vegetação agrupada e núcleo rural coerente. Doutrina inspira qualidade do HUD/áudio, sem copiar seus assets.
- Arte dos cavalos ainda não aprovada. NPCs melhoraram; preservar coerência das duas câmeras.
- Eduardo quer avanços concretos, escopo concentrado por entrega e menos demora. Evitar expandir uma mudança visual para uma revisão inteira da simulação. Comunicar problemas que ampliem a etapa cedo. Não repetir testes já aprovados sem mudanças ou preocupações novas.
- Não declarar medição de Android a partir de Chromium/SwiftShader. Fazer inspeção das próprias imagens antes de publicar.

## Estado

0.9.9.13: passo fixo de simulação em 1×/3×/8×, chegada precisa ao manejo, encontros livres de funcionários, alimentação com cabeça baixa e resolução de bloqueios em porteiras/corredores. Simulação das cinco fazendas: 987 tarefas, 122 passagens, 77 excursões. Cenários até dia 866: cuidado próprio mínimo 59/100. Chromium/WebGL completo aprovado em cinco telas; RELEASE_0.9.9.13.md.

0.9.9.14: parcelas visuais de pastagem/palha com faixas de corte, vegetação baixa agrupada, dados compartilhados Canvas/Three.js. Respeitam construções, água e caminhos; obras retiram setores conflitantes. Ainda não são um sistema produtivo de cultivo/feno. Próximas etapas: paisagem com vegetação arbórea agrupada/margens naturais, identidade das propriedades e enquadramento; seguir feedback artístico.

## Rodar no computador

Pré-requisitos: Git e Node.js; Python apenas para o servidor de desenvolvimento existente.

```powershell
git clone https://github.com/oeduardobertei-jpg/Fazenda-.git FazendaViva
cd FazendaViva
npm ci
py -m http.server 4173
```

Abrir http://localhost:4173. No Linux/macOS, npm start usa python3. No Windows sem o comando py, usar python -m http.server 4173 com Python instalado.

## Verificação

```powershell
npm test
npx playwright install chromium
npm run test:terrain-browser
```

O teste de paisagem compara a 0.9.9.13 com a atual em cinco telas, 2D/3D, erros e orçamento gráfico. Requer histórico Git para git show da referência. Integração completa de controles, manejo, áudio, recuperação WebGL e pastoreio: npm run test:browser. QA exporta imagens/métricas em qa-artifacts (ignorado pelo Git).

No jogo: conferir versão no HUD, 2D/3D, zoom e arraste, setores e caminhos; acelerar 8×, Gestão → Cavalos → acompanhar manejo; verificar progresso de cuidado e passagem pelas porteiras. No Android, observar fluidez, áudio, calor e menus em retrato/paisagem.

## Primeira mensagem sugerida ao Codex

Leia CODEX_HANDOFF.md, ROADMAP_1.0.md e RELEASE_0.9.9.14.md. Confirme branch, versão e estado do Git. Abra o jogo localmente e avance a próxima etapa visual da paisagem inspirada no Farm Manager, mantendo identidade brasileira, manejo e equivalência 2D/3D. Faça uma entrega focada, inspecione capturas, execute verificações apropriadas e deixe testável. Evite ampliar escopo ou repetir verificações sem necessidade.

## Erro ao importar apenas o HTML

A prévia de index.html como arquivo isolado não inclui os scripts e a folha de estilos da pasta. O erro Cannot read properties of undefined (reading generate) indica a ausência de FazendaVivaTerrain, definida em terrain.js. O projeto deve ser clonado inteiro e servido por HTTP; o HTML sozinho não é um pacote autônomo. Se world3d.js ou o CDN do Three.js não carregar, o 3D ficará indisponível. Conferir Network/Console no navegador.
