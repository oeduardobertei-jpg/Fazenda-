# Fazenda Viva — critérios para o marco 1.0

**Visão:** simulação rural brasileira tridimensional, estilizada, viva e legível em celulares, com cinco propriedades claramente distintas, economia de criação de cavalos e produtores autônomos. Uma versão 1.0 é uma experiência completa, não apenas um aumento do número da versão.

## Critérios de aceitação para 1.0

### A. Identidade e encantamento visual
- [ ] Cada cabanha possui estilo arquitetônico, vegetação, disposição e atividades próprias, distinguíveis mesmo com aproximação similar.
- [ ] Casa, cocheira, piquete, galpão, lavoura, açude, praça rural e estradas apresentam materiais/volumes coerentes, sem sobreposição de telhados, "fundações" ou props.
- [ ] A transição 2D ↔ 3D conserva posição, escala relativa e sentido das entidades; os dois renderizadores exibem eventos de forma coerente.
- [ ] Plantas, solo e detalhes físicos do manejo rural ficam visíveis no zoom próximo e são simplificados no zoom distante.

### B. Vida rural em movimento
- [ ] Cavalos possuem poses procedurais convincentes em repouso, caminhada e pasto (também para potros).
- [ ] Nenhum cavalo fica empilhado sobre outro; piquetes e edificações impedem atravessamento visível.
- [ ] Trabalhadores usam a rede real de caminhos, executam tarefas coerentes com cada instalação e deixam claras as suas ações no ambiente, com etiquetas não sobrepostas.
- [ ] Pelo menos três tarefas de manejo animal/econômico alteram estado visual da instalação ou dos personagens, não apenas números de HUD.

### C. Simulação econômica com consequência
- [ ] Obras têm custo real, prazo, evolução visual e no máximo uma obra ativa por fazenda.
- [ ] Quatro IAs administram caixa, cavalos e propriedades sem ocupar espaços proibidos.
- [ ] Transações entre propriedades preservam animais e dinheiro (soma antes/depois), sem clones ou vendas duplicadas.
- [ ] Reprodução possui pedigree básico, vagas, gestação e impacto na produção — com transparência das regras.
- [ ] Eventos rurais com efeitos moderados, decisões legíveis e consequência no mundo.
- [ ] O ranking e as metas incentivam escolhas significativas, não um crescimento infinito sem estratégia.

### D. Android e acessibilidade
- [ ] Movimentação da câmera e gesto de pinça responsivos, sem travamentos ao alternar um/dois dedos, com botões de zoom acessíveis.
- [ ] Elementos de HUD não cobrem personagens, janelas importantes ou ações; menus permanecem usáveis no modo paisagem e retrato.
- [ ] Cena 3D continua funcional após muitos minutos; modo 2D disponível como fallback.
- [ ] Testes manuais de usabilidade e desempenho no Android real com captura de tela e inspeção de erros JavaScript/WebGL.
- [ ] Monitorar FPS e tempo de frame em dispositivo real; ajustar densidade/LOD se houver quedas notáveis.

## Registro de progresso

**0.9.5 — atualização de autoria visual**
- Cinco paletas de solo, parede, telhado, vegetação e identidade de fazenda sincronizadas no Canvas e no Three.js.
- 36 props por propriedade (180 no total), com proteção de footprints, trilhas e açudes.
- LOD e instancing para manter o custo no Android sob controle.
- Cavalos vendidos migram para piquetes/pastagens da nova cabanha (corrigido cache do proprietário).
- NPCs com chapéus, sombras e animações procedurais de trabalho coerentes no 2D/3D.
- Mercado permite visitar cada propriedade diretamente.
- Os critérios de segurança visual dependem ainda de inspeção manual no celular: não estão declarados como concluídos.

**0.9.6 — revisão técnica mobile**
- Zoom e pan projetados com geometria da câmera atual, sem depender do frame anterior de Three.js.
- Rotação do ângulo local/regional testada mantendo um ponto do terreno sob o cursor.
- DPR responsivo a intervalos de quadros demorados e monitor opt-in de FPS/draw calls.
- Zero loops RAF paralelos quando o usuário alterna 2D/3D; fallback e tentativa de restauração WebGL.
- A floresta antiga não invade mais a clareira nem as glebas das cinco fazendas.
- A revisão da 0.9.6 foi validada por simulações, **não** por testes visuais/medição de FPS do Android real.

**0.9.7 — vida no manejo**
- Cuidado por indivíduo influenciando receita e valor de venda.
- Atendimento com progresso na posição física do tratador e resposta do cavalo.
- Diário de cuidados, dois objetivos novos e ração reforçada consumida por tarefa.
- Câmera de acompanhamento; resposta visual do trabalho em Canvas e Three.js.
- Desbloqueio de trânsito: desvios laterais, espera que preserva rota e replanejamento.
- Regressões do 3D cobrem sinalização de trato, fim do efeito e identidade dos animais transferidos.
- **Falta QA visual em Android real e validação do FPS sem usar a simulação de Three.js.**

## Portões de versão

**0.9.4 — circuito de criadores e marco regional**  
Genética detalhada, trocas reais de cavalos, Centro Rural visível e primeiro beauty-pass de lavouras e edificações. **Implementado; aguarda inspeção visual Android.**

**0.9.5 — autoria visual e vida em campo**  
**Implementação principal entregue em código, pendente inspeção visual no Android.** Cinco estilos regionais distintos, 180 pontos de paisagismo sem sobreposição, microprops nas duas câmeras, trabalhadores com animação de tarefa e sombras de contato, cavalos com slots que acompanham o proprietário e visitas diretas às fazendas.  
**Ainda pendentes:** verificar realismo das animações no aparelho e ajustar microcolisões ou artefatos que dependam do ângulo da câmera.

**0.9.6 — câmera, desempenho e QA Android**  
**Entregue em código e testes automatizados; QA Android real pendente.** Projeção matemática ancorada da câmera oblíqua durante pinça, controle por múltiplos dedos, LOD por edifício, DPR WebGL adaptativo, indicador FPS opt-in, proteção contra render loops duplicados e recuperação de contexto. Corrigida geração de árvores externas que antes invadia as cinco fazendas devido a um comentário malformado.  
**Ainda aberto:** medir FPS e calor/consumo no telefone, conferir visual dos controles, inspecionar espaçamento de overlays nos formatos retrato/paisagem e validar estabilidade após múltiplas trocas WebGL reais.

**0.9.7 — equilíbrio e tarefas de alto valor**  
**Implementada no código e testes automatizados; revisão visual Android pendente.** Manejo animal integrado ao calendário, bem-estar e economia; tratadores com pacientes reais e acesso apropriado ao piquete/cocheira; alimentação e escovação visíveis nas duas câmeras; ração paga consumida em serviço, diário de manejo, câmera de acompanhamento e metas. Corrigidos bloqueios persistentes entre trabalhadores e o cache de identidade dos cavalos 3D.  
**Pendente:** validar naturalidade das interações à distância, da animação da cabeça e dos indicadores de bem-estar em dispositivo real; avaliar necessidade de simplificar ainda mais o HUD.

**0.9.8 — integração e interface final**  
**Implementação preparada para testes públicos da 0.9.8.** HUD compacto, acesso direto à gestão, guia opcional, acompanhamento contínuo, cancelamento explícito de construção, rotas públicas compartilhadas e poses procedurais com transições/joelhos. Correções de contato com o terreno e redução de chamadas pela fusão das peças estáticas.

**Verificação:** smoke, renderizador simulado, poses e geometria oficial Three.js passaram localmente. Chromium/WebGL por software passou em cinco viewports, incluindo toque e recuperação de contexto. Capturas foram inspecionadas; corrigidos o encobrimento no Canvas e mensagens sobre a cena. Chamadas iniciais: 261→201 (−23%), com +5% de triângulos. Ainda é obrigatório inspecionar a naturalidade visual e medir desempenho no Android físico. Ver `RELEASE_0.9.8.md`.

**0.9.9 — revisão equina e autonomia de pastoreio**
Escopo ampliado por solicitação do usuário após as capturas Android da 0.9.8: anatomia compartilhada 2D/3D, circulação pelos campos da própria fazenda, porteiras físicas, retorno para manejo e Centro Rural com acesso direto ao mercado. Os testes devem cobrir trajetórias contínuas, respeito às cercas, retorno dos animais e conservação das transações, além das regressões anteriores.

**Congelamento para a 1.0 após esta revisão:** correção de defeitos críticos, teste em celulares reais, orçamento de performance e aprovação visual do usuário. As capturas da 0.9.8 comprovam execução no aparelho, mas não medem FPS/temperatura nem validam a nova 0.9.9.

**1.0 — lançamento**  
Somente quando os critérios acima forem cumpridos/explicitamente revisados.

## Regras de transparência
- Não apresentar como "verificado no Android" um teste de Three.js simulado.
- Não afirmar que o GitHub Pages publicou uma versão antes de abrir e conferir o link.
- O usuário prefere partidas sem salvamento automático; reiniciar deve começar no dia 1.
- Não introduzir ciclo dia/noite, clima ou sistemas de necessidades pessoais de NPCs sem nova decisão do projeto.
- Tratar a própria cabanha e as concorrentes como espaços rurais extensos, nunca como edifícios colados uns aos outros.
